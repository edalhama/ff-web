import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AppShellComponent, EdasShellSlotDirective, EdasSplashService } from '@edas/ng';
import { TranslatePipe } from '@ngx-translate/core';
import { AppVersionComponent } from '@edas/ng/brand/app-version.component';
import { PublicFooterComponent } from '@edas/ng/brand/public-footer.component';
import { AvatarComponent } from '@edas/ng/wrapper/components/avatar/avatar.component';
import { IconComponent } from '@edas/ng/wrapper/components/icon/icon.component';
import { filter, finalize, map, startWith } from 'rxjs';

import { ADMIN_HOME_PATH, ADMIN_PREFIX, SessionService } from './shared/services/session.service';
import { PROFILE_PATH } from './site/site-links';

/**
 * Raíz de la app. El marco (drawer, migas, statusbar) es el mismo en la parte pública y en el
 * panel: `edas-app-shell`. Aquí solo va lo propio de fantasyfutbol en sus huecos.
 *
 * En la parte pública el hueco derecho abre los ajustes (`/profile`). En el panel, el aspecto
 * y el idioma están en el inicio, no en la barra.
 */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterLinkActive,
    AppShellComponent,
    EdasShellSlotDirective,
    PublicFooterComponent,
    AppVersionComponent,
    AvatarComponent,
    IconComponent,
    TranslatePipe,
  ],
  template: `
    <edas-app-shell [authenticated]="inPanel()">
      <ng-template edasShellSlot="user">
        <div class="shell-user">
          @if (!inAdmin()) {
            <a
              class="shell-profile"
              [routerLink]="profilePath"
              routerLinkActive="shell-profile--active"
              [routerLinkActiveOptions]="{exact: true}"
              [attr.aria-label]="'title.profile' | translate"
            >
              <Icon icon="settings" size="lg"/>
            </a>
          }
          @if (session.user(); as user) {
            <a class="user-link" [routerLink]="homePath" [attr.aria-label]="user.name">
              <edas-avatar [dim]="32" icon="user" [alt]="user.name"/>
            </a>
          }
        </div>
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
    .shell-user {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .shell-profile {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: var(--edas-radius-pill);
      color: var(--edas-text-color);
      text-decoration: none;
    }

    .shell-profile:hover,
    .shell-profile--active {
      background: rgba(var(--edas-tone-neutral-rgb), var(--edas-soft-alpha));
    }

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
  protected readonly profilePath = PROFILE_PATH;

  private readonly path = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      map(() => this.router.url.split(/[?#]/)[0]),
    ),
    { initialValue: '' },
  );

  protected readonly inAdmin = computed(() => this.path().startsWith(ADMIN_PREFIX));
  /** Dentro del panel y con sesión: el pie público no va, y sí el aviso de versión nueva. */
  protected readonly inPanel = computed(() => this.inAdmin() && this.session.isLoggedIn());

  constructor() {
    // Splash de arranque (index.html): se oculta cuando la sesión queda resuelta. finalize()
    // garantiza que un error nunca lo deje colgado.
    const splash = inject(EdasSplashService);
    this.session.ensureSession().pipe(finalize(() => splash.markReady())).subscribe();
  }
}
