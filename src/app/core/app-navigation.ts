import {Injectable} from '@angular/core';
import {EdasNavigation, EdasNavItem, EdasNavSection} from '@edas/ng';
import {ROUTE_TITLE} from './route-titles';

/** Destinos de navegación del panel (drawer en escritorio, tab-bar en móvil). */
@Injectable({providedIn: 'root'})
export class AppNavigation extends EdasNavigation {
  private readonly items: EdasNavItem[] = [
    {path: '/admin/home', labelKey: ROUTE_TITLE.adminHome, icon: 'house'},
    {path: '/admin/competitions', labelKey: ROUTE_TITLE.competitions, icon: 'trophy'},
    {path: '/admin/teams', labelKey: ROUTE_TITLE.teams, icon: 'shield'},
    {path: '/admin/links', labelKey: ROUTE_TITLE.links, icon: 'link'},
    {path: '/admin/cache', labelKey: ROUTE_TITLE.cache, icon: 'database-zap'},
  ];

  override drawerSections(): EdasNavSection[] {
    return [{id: 'main', ariaLabel: 'Navegación principal', items: this.items}];
  }

  override tabBarItems(): EdasNavItem[] {
    return this.items;
  }
}
