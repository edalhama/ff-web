import { Routes } from '@angular/router';
import { requireAnonymous, requireSession, scrollToTopBeforeEnter } from '@edas/ng';

import { ROUTE_TITLE } from './core/route-titles';
import { usePreferredLanguage } from './site/site-language.guard';
import { siteNotFoundRoute, siteRoutes } from './site/site-routes';

/**
 * Rutas de la app: el panel (`/admin`) y, después, la parte pública (`site/site-routes.ts`).
 *
 * Las del panel declaran su título i18n y el icono de su miga, y se cargan aparte
 * (`loadComponent`): quien solo visita la parte pública no descarga su código. Van primero
 * porque el idioma principal de la parte pública no tiene prefijo y ocupa la raíz.
 */
export const routes: Routes = [
  {
    path: 'admin/login',
    loadComponent: () => import('./screens/admin/login/login-screen.component').then((m) => m.LoginScreenComponent),
    data: { titleKey: ROUTE_TITLE.login, icon: 'log-in' },
    // Con sesión, redirige al panel. Los guards corren en orden: si redirige, no hay scroll.
    canActivate: [usePreferredLanguage, requireAnonymous(), scrollToTopBeforeEnter()],
  },
  {
    path: 'admin',
    // El idioma, antes que nada: en el panel es el que tenga elegido quien entra
    canActivate: [usePreferredLanguage, requireSession()],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      {
        path: 'home',
        loadComponent: () => import('./screens/admin/home/admin-home-screen.component').then((m) => m.AdminHomeScreenComponent),
        data: { titleKey: ROUTE_TITLE.adminHome, icon: 'house' },
      },
      {
        path: 'competitions',
        loadComponent: () => import('./screens/admin/competitions/competitions-screen.component').then((m) => m.CompetitionsScreenComponent),
        data: { titleKey: ROUTE_TITLE.competitions, icon: 'trophy' },
      },
      {
        path: 'cache',
        loadComponent: () => import('./screens/admin/cache/cache-screen.component').then((m) => m.CacheScreenComponent),
        data: { titleKey: ROUTE_TITLE.cache, icon: 'database-zap' },
      },
      {
        path: 'links',
        loadComponent: () => import('./screens/admin/links/links-screen.component').then((m) => m.LinksScreenComponent),
        data: { titleKey: ROUTE_TITLE.links, icon: 'link' },
      },
      {
        path: 'teams',
        loadComponent: () => import('./screens/admin/teams/teams-screen.component').then((m) => m.TeamsScreenComponent),
        data: { titleKey: ROUTE_TITLE.teams, icon: 'shield' },
      },
    ],
  },
  ...siteRoutes,
  siteNotFoundRoute,
];
