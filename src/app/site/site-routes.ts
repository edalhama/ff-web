import {Route, Routes} from '@angular/router';
import {ROUTE_TITLE} from '../core/route-titles';
import {usePreferredLanguage, useSiteLanguage} from './site-language.guard';
import {SITE_DEFAULT_LANGUAGE, SITE_LANGUAGES, SITE_SEGMENTS, SiteLanguage} from './site-links';
import {
  competitionResolver,
  competitionTeamsResolver,
  fixturesResolver,
  homeResolver,
  overviewResolver,
  standingsResolver,
  teamResolver,
} from './site-resolvers';
import {SiteHomeScreenComponent} from '../screens/site/home/site-home-screen.component';

const notFound = () => import('../screens/site/not-found/site-not-found-screen.component').then((m) => m.SiteNotFoundScreenComponent);

/**
 * Rutas de la parte pública en un idioma. Las palabras de la URL salen de `SITE_SEGMENTS`
 * (ver `site-links.ts`): las rutas de aquí y los enlaces de allí no pueden desajustarse.
 *
 * La competición no lleva palabra delante (`/laliga`), así que sus rutas empiezan por un
 * parámetro y casan con cualquier cosa: **van las últimas**, detrás de las secciones con
 * nombre. Lo que no sea ni una sección ni una competición llega hasta la API, que responde
 * que no existe, y se pinta el 404.
 *
 * `data.page` identifica la página de la competición: su cabecera elige el título por él.
 */
function languageRoutes(lang: SiteLanguage): Route {
  const segments = SITE_SEGMENTS[lang];

  // Páginas de una competición; valen igual con o sin temporada en la URL
  const competitionPages = (): Routes => [
    {
      path: '',
      pathMatch: 'full',
      loadComponent: () => import('../screens/site/competition/competition-overview.component').then((m) => m.CompetitionOverviewComponent),
      resolve: {overview: overviewResolver},
      data: {page: 'overview'},
    },
    {
      path: segments.standings,
      loadComponent: () => import('../screens/site/competition/competition-standings.component').then((m) => m.CompetitionStandingsComponent),
      resolve: {standings: standingsResolver},
      data: {page: 'standings', titleKey: 'site.competition.tab-standings', icon: 'list'},
    },
    {
      path: segments.fixtures,
      loadComponent: () => import('../screens/site/competition/competition-fixtures.component').then((m) => m.CompetitionFixturesComponent),
      resolve: {fixtures: fixturesResolver},
      data: {page: 'fixtures', titleKey: 'site.competition.tab-fixtures', icon: 'calendar'},
    },
    {
      // `:round` es `jornada-12`; lo valida el resolver
      path: `${segments.fixtures}/:round`,
      loadComponent: () => import('../screens/site/competition/competition-fixtures.component').then((m) => m.CompetitionFixturesComponent),
      resolve: {fixtures: fixturesResolver},
      data: {page: 'fixtures', titleKey: 'site.competition.tab-fixtures', icon: 'calendar'},
    },
    {
      path: segments.teams,
      loadComponent: () => import('../screens/site/competition/competition-teams.component').then((m) => m.CompetitionTeamsComponent),
      resolve: {teams: competitionTeamsResolver},
      data: {page: 'teams', titleKey: 'site.competition.tab-teams', icon: 'shield'},
    },
  ];

  const competition = () => import('../screens/site/competition/competition-layout.component').then((m) => m.CompetitionLayoutComponent);

  const competitionData = {titleKey: ROUTE_TITLE.competition, icon: 'trophy'};

  return {
    path: segments.prefix,
    canActivate: [useSiteLanguage(lang)],
    // Primera miga de toda la parte pública, y el JSON-LD de ese rastro. Un 404 hijo lo apaga.
    data: {titleKey: 'site.home.competitions', icon: 'trophy', seoBreadcrumbs: true},
    children: [
      {path: '', pathMatch: 'full', component: SiteHomeScreenComponent, resolve: {home: homeResolver}},
      // Secciones con nombre: antes que la competición, que casaría con ellas
      {
        path: `${segments.teams}/:team`,
        loadComponent: () => import('../screens/site/team/site-team-screen.component').then((m) => m.SiteTeamScreenComponent),
        resolve: {team: teamResolver},
        data: {titleKey: ROUTE_TITLE.team, icon: 'shield'},
      },
      // Competición sin temporada: la actual. Va antes que la que la lleva: `clasificacion`
      // no es una temporada
      {
        path: ':competition',
        loadComponent: competition,
        resolve: {context: competitionResolver},
        data: competitionData,
        children: competitionPages(),
      },
      {
        path: ':competition/:season',
        loadComponent: competition,
        resolve: {context: competitionResolver},
        data: competitionData,
        children: competitionPages(),
      },
      // Bajo el prefijo de un idioma, lo que no exista es un 404 en ese idioma. El principal
      // no tiene prefijo: su 404 es el general de la app (ver routes.ts)
      ...(segments.prefix ? [{path: '**', loadComponent: notFound, data: {titleKey: ROUTE_TITLE.notFound, icon: 'search', seoBreadcrumbs: false}}] : []),
    ],
  };
}

/**
 * Rutas públicas de todos los idiomas. Los que llevan prefijo van primero: el principal ocupa
 * la raíz y, con la competición como primer tramo, `/en` le parecería una competición.
 */
export const siteRoutes: Routes = [...SITE_LANGUAGES].sort((a, b) => Number(!SITE_SEGMENTS[a].prefix) - Number(!SITE_SEGMENTS[b].prefix)).map(languageRoutes);

/**
 * 404 general: cualquier URL que no sea de nadie. Sale en el idioma principal, salvo dentro
 * del panel, donde se respeta el idioma que tenga elegido quien lo usa.
 */
export const siteNotFoundRoute: Route = {
  path: '**',
  loadComponent: notFound,
  data: {titleKey: ROUTE_TITLE.notFound, icon: 'search', seoBreadcrumbs: false},
  canActivate: [(route, state) => (state.url.startsWith('/admin') ? usePreferredLanguage : useSiteLanguage(SITE_DEFAULT_LANGUAGE))(route, state)],
};
