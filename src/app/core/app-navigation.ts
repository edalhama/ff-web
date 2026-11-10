import {inject, Injectable} from '@angular/core';
import {EdasNavigation, EdasNavItem, EdasNavSection} from '@edas/ng';
import {LocaleService} from '@edas/ng/shared/services/locale.service';
import {SessionService} from '../shared/services/session.service';
import {homePath, PROFILE_PATH, SiteLanguage} from '../site/site-links';
import {ROUTE_TITLE} from './route-titles';

/**
 * Drawer único de la app. Arriba, la navegación pública (rutas padre del sitio). Debajo, y solo
 * con sesión, las del panel: el drawer las separa con una línea. No hay barra inferior.
 */
@Injectable({providedIn: 'root'})
export class AppNavigation extends EdasNavigation {
  private readonly session = inject(SessionService);
  private readonly locale = inject(LocaleService);

  public override brandHomePath(): string {
    return homePath(this.locale.language() as SiteLanguage);
  }

  public override drawerSections(): EdasNavSection[] {
    const lang = this.locale.language() as SiteLanguage;
    const navigation: EdasNavItem[] = [
      {path: homePath(lang), exact: true, labelKey: 'site.home.competitions', icon: 'trophy'},
      {path: PROFILE_PATH, exact: true, labelKey: ROUTE_TITLE.profile, icon: 'settings'},
    ];
    const admin: EdasNavItem[] = this.session.isLoggedIn()
      ? [
          {path: '/admin/home', labelKey: ROUTE_TITLE.adminHome, icon: 'house'},
          {path: '/admin/competitions', labelKey: ROUTE_TITLE.competitions, icon: 'trophy'},
          {path: '/admin/teams', labelKey: ROUTE_TITLE.teams, icon: 'shield'},
          {path: '/admin/players', labelKey: ROUTE_TITLE.players, icon: 'users'},
          {path: '/admin/rounds', labelKey: ROUTE_TITLE.rounds, icon: 'calendar-range'},
          {path: '/admin/matches', labelKey: ROUTE_TITLE.matches, icon: 'goal'},
          {path: '/admin/venues', labelKey: ROUTE_TITLE.venues, icon: 'map-pin'},
          {path: '/admin/referees', labelKey: ROUTE_TITLE.referees, icon: 'flag'},
          {path: '/admin/links', labelKey: ROUTE_TITLE.links, icon: 'link'},
          {path: '/admin/tasks', labelKey: ROUTE_TITLE.tasks, icon: 'list-checks'},
          {path: '/admin/cache', labelKey: ROUTE_TITLE.cache, icon: 'database-zap'},
        ]
      : [];

    return [
      {id: 'nav', ariaLabel: 'Navegación', items: navigation},
      {id: 'admin', ariaLabel: 'Administración', items: admin},
    ];
  }

  public override tabBarItems(): EdasNavItem[] {
    return [];
  }
}
