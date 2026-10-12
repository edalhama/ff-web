import {HttpClient, HttpContext} from '@angular/common/http';
import {computed, inject, Injectable, signal} from '@angular/core';
import {Router} from '@angular/router';
import {edasStorage, EdasSession, EdasSessionStatus, SKIP_GLOBAL_ERROR_ALERT} from '@edas/ng';
import {catchError, map, Observable, of, shareReplay, switchMap, tap, throwError} from 'rxjs';
import {environment} from '../../../environments/environment';
import {StorageKeys} from '../../core/storage-keys';
import {Account} from '../models/account';
import {ApiResponse} from '../models/api';

/** Ruta de acceso al panel y ruta de inicio tras entrar (ver `provideEdasSession`). */
export const LOGIN_PATH = '/admin/login';
/** Prefijo de todas las rutas del panel. */
export const ADMIN_PREFIX = '/admin';
export const ADMIN_HOME_PATH = '/admin/home';

/**
 * Sesión del panel: token en `localStorage` y cuenta desde `GET /account`. Implementa
 * `EdasSession` (guards e interceptor de edas-ng).
 *
 * Por ahora solo hay sesión de administrador: una cuenta sin rol `admin` se trata como
 * anónima. Cuando los visitantes puedan registrarse habrá que separar ambos casos.
 */
@Injectable({providedIn: 'root'})
export class SessionService implements EdasSession {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  /** Pendiente hasta resolver token + GET /account. */
  readonly sessionStatus = signal<EdasSessionStatus>('pending');
  readonly user = signal<Account | null>(null);
  readonly isLoggedIn = computed(() => this.sessionStatus() === 'authenticated');

  private sessionOnce$: Observable<boolean> | null = null;

  /** Resuelve la sesión una sola vez. Sin token → anónimo, sin tocar la red. */
  ensureSession(): Observable<boolean> {
    if (!this.sessionOnce$) {
      this.sessionOnce$ = this.resolveSession().pipe(shareReplay(1));
    }
    return this.sessionOnce$;
  }

  private resolveSession(): Observable<boolean> {
    // En el prerender (Node) no hay almacenamiento: anónimo, que es lo que debe verse en el
    // HTML estático de las páginas públicas.
    if (!edasStorage()?.getItem(StorageKeys.token)) {
      this.setAnonymous();
      return of(false);
    }

    // Sin aviso global: un token caducado al arrancar no es un error que enseñar al visitante.
    return this.http.get<ApiResponse<{user: Account}>>(`${environment.api.url}account`, {
      context: new HttpContext().set(SKIP_GLOBAL_ERROR_ALERT, true),
    }).pipe(
      map((response) => response.data?.user ?? null),
      tap((user) => {
        if (user?.role === 'admin') {
          this.user.set(user);
          this.sessionStatus.set('authenticated');
        } else {
          this.clearSession();
        }
      }),
      map((user) => user?.role === 'admin'),
      catchError(() => {
        this.clearSession();
        return of(false);
      }),
    );
  }

  /**
   * Inicia sesión y lleva al panel. Sin aviso global de error: la pantalla de acceso lo pinta
   * junto al formulario (el llamante trata el error con `apiErrorStatus`).
   */
  logIn(email: string, password: string): Observable<void> {
    return this.http.post<ApiResponse<{token: string}>>(`${environment.api.url}login`, {email, password}, {
      context: new HttpContext().set(SKIP_GLOBAL_ERROR_ALERT, true),
    }).pipe(
      switchMap((response) => {
        const token = response.data?.token;
        if (!token) {
          return throwError(() => new Error('auth.login-error'));
        }
        edasStorage()?.setItem(StorageKeys.token, token);
        this.invalidateSessionCache();
        return this.ensureSession();
      }),
      switchMap((authenticated) => {
        if (!authenticated) {
          // Credenciales correctas, pero la cuenta no es de administrador
          return throwError(() => new Error('auth.login-not-admin'));
        }
        return this.router.navigateByUrl(ADMIN_HOME_PATH);
      }),
      map(() => undefined),
    );
  }

  /** Cierra la sesión también en el servidor (el token pasa a su lista negra). */
  logout(): void {
    this.http.post(`${environment.api.url}invalidate-token`, {}, {
      context: new HttpContext().set(SKIP_GLOBAL_ERROR_ALERT, true),
    }).subscribe({
      next: () => this.clearSession(),
      // Si el servidor no responde, la sesión local se cierra igualmente
      error: () => this.clearSession(),
    });
  }

  /**
   * Limpia token y estado. Solo lleva a la pantalla de acceso si se estaba dentro del panel:
   * un visitante con un token caducado guardado no debe salir de la página pública que mira.
   */
  clearSession(): void {
    edasStorage()?.removeItem(StorageKeys.token);
    this.sessionOnce$ = null;
    this.setAnonymous();

    const path = this.router.url.split('?')[0];
    if (path.startsWith(ADMIN_PREFIX) && !path.startsWith(LOGIN_PATH)) {
      void this.router.navigateByUrl(LOGIN_PATH);
    }
  }

  private setAnonymous(): void {
    this.user.set(null);
    this.sessionStatus.set('anonymous');
  }

  private invalidateSessionCache(): void {
    this.sessionOnce$ = null;
    this.sessionStatus.set('pending');
  }
}
