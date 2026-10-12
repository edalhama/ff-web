import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { AppShellComponent, EdasShellSlotDirective, EdasSplashService } from '@edas/ng';
import { AppVersionComponent } from '@edas/ng/brand/app-version.component';
import { PublicFooterComponent } from '@edas/ng/brand/public-footer.component';
import { PublicHeaderComponent } from '@edas/ng/brand/public-header.component';
import { AvatarComponent } from '@edas/ng/wrapper/components/avatar/avatar.component';
import { filter, finalize, map, startWith } from 'rxjs';

import { SiteHeaderComponent } from './components/site/site-header.component';
import { ADMIN_HOME_PATH, ADMIN_PREFIX, SessionService } from './shared/services/session.service';

/**
 * Raíz de la app: el marco (drawer, navegación, migas, modal stack…) es `edas-app-shell`; aquí
 * solo va lo propio de fantasyfutbol en sus huecos.
 *
 * El marco del panel (drawer, migas) solo se pinta dentro de `/admin` y con sesión. La parte
 * pública se ve igual con sesión que sin ella: es lo que genera el servidor, que no sabe quién
 * mira, y lo que el navegador tiene que encontrarse al arrancar.
 */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    AppShellComponent,
    EdasShellSlotDirective,
    PublicHeaderComponent,
    PublicFooterComponent,
    AppVersionComponent,
    AvatarComponent,
    SiteHeaderComponent,
  ],
  template: `
    <edas-app-shell [authenticated]="inPanel()">
      <ng-template edasShellSlot="public-header">
        @if (inAdmin()) {
          <!-- Pantalla de acceso: el idioma es una preferencia, no una URL -->
          <edas-public-header/>
        } @else {
          <app-site-header/>
        }
      </ng-template>

      <ng-template edasShellSlot="user">
        @if (session.user(); as user) {
          <a class="user-link" [routerLink]="homePath" [attr.aria-label]="user.name">
            <edas-avatar [dim]="32" icon="user" [alt]="user.name"/>
          </a>
        }
      </ng-template>

      <ng-template edasShellSlot="drawer-footer" let-collapsed="collapsed">
        <edas-app-version class="text-muted" [compact]="collapsed"/>
      </ng-template>

      <ng-template edasShellSlot="footer">
        @if (!inPanel()) {
          <edas-public-footer/>
        }
      </ng-template>
    </edas-app-shell>
  `,
  styles: [`
    .user-link {
      display: flex;
      border-radius: var(--edas-radius-pill);
    }
  `],
})
export class AppComponent {
  protected readonly session = inject(SessionService);
  private readonly router = inject(Router);

  protected readonly homePath = ADMIN_HOME_PATH;

  private readonly path = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      map(() => this.router.url.split(/[?#]/)[0]),
    ),
    { initialValue: '' },
  );

  protected readonly inAdmin = computed(() => this.path().startsWith(ADMIN_PREFIX));
  /** Dentro del panel y con sesión: lo único que lleva su marco. */
  protected readonly inPanel = computed(() => this.inAdmin() && this.session.isLoggedIn());

  constructor() {
    // Splash de arranque (index.html): se oculta cuando la sesión queda resuelta. finalize()
    // garantiza que un error nunca lo deje colgado.
    const splash = inject(EdasSplashService);
    this.session.ensureSession().pipe(finalize(() => splash.markReady())).subscribe();
  }
}
