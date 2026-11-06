import { Routes } from '@angular/router';
import { requireAnonymous, requireSession, scrollToTopBeforeEnter } from '@edas/ng';

import { ROUTE_TITLE } from './core/route-titles';
import { usePreferredLanguage } from './site/site-language.guard';
import { PROFILE_SEGMENT } from './site/site-links';
import { siteNotFoundRoute, siteRoutes } from './site/site-routes';

/**
 * Rutas de la app: el panel (`/admin`) y, después, la parte pública (`site/site-routes.ts`).
 *
 * Las del panel declaran su título i18n y el icono de su miga, y se cargan aparte
 * (`loadComponent`): quien solo visita la parte pública no descarga su código. Van primero
 * porque el idioma principal de la parte pública no tiene prefijo y ocupa la raíz.
 * `/profile` va antes por lo mismo: si no, la competición (`/:competition`) se lo queda.
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
        path: 'tasks',
        loadComponent: () => import('./screens/admin/tasks/tasks-screen.component').then((m) => m.TasksScreenComponent),
        data: { titleKey: ROUTE_TITLE.tasks, icon: 'list-checks' },
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
      {
        path: 'players',
        loadComponent: () => import('./screens/admin/players/players-screen.component').then((m) => m.PlayersScreenComponent),
        data: { titleKey: ROUTE_TITLE.players, icon: 'users' },
      },
      {
        path: 'venues',
        loadComponent: () => import('./screens/admin/venues/venues-screen.component').then((m) => m.VenuesScreenComponent),
        data: { titleKey: ROUTE_TITLE.venues, icon: 'map-pin' },
      },
      {
        path: 'referees',
        loadComponent: () => import('./screens/admin/referees/referees-screen.component').then((m) => m.RefereesScreenComponent),
        data: { titleKey: ROUTE_TITLE.referees, icon: 'flag' },
      },
    ],
  },
  {
    path: PROFILE_SEGMENT,
    loadComponent: () => import('./screens/site/profile/site-profile-screen.component').then((m) => m.SiteProfileScreenComponent),
    data: { titleKey: ROUTE_TITLE.profile, icon: 'settings' },
    canActivate: [usePreferredLanguage, scrollToTopBeforeEnter()],
  },
  ...siteRoutes,
  siteNotFoundRoute,
];
