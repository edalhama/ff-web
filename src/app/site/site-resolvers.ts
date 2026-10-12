import {inject} from '@angular/core';
import {ActivatedRouteSnapshot, RedirectCommand, ResolveFn, Router} from '@angular/router';
import {LocaleService} from '@edas/ng/shared/services/locale.service';
import {forkJoin, map, Observable, of, tap} from 'rxjs';
import {
  SiteCompetitionContext,
  SiteHomeCompetition,
  SiteRoundMatches,
  SiteSeasonTeam,
  SiteStandings,
  SiteTeamPage,
} from '../shared/models/site';
import {SiteApiService} from './site-api.service';
import {SITE_TAG, SITE_TTL, ttlForMatches} from './site-cache';
import {loadSiteData, SITE_NOT_FOUND, SiteData} from './site-data';
import {roundFromSegment, SiteLanguage, withCompetitionSlug, withTeamSlug} from './site-links';
import {SiteResponseService} from './site-response.service';

/**
 * Datos de cada página pública. Se cargan antes de pintarla (son `resolve` de su ruta), así el
 * servidor genera la página ya completa. De paso declaran cuánto vale en caché y de qué
 * depende (`SiteResponseService.cache`).
 */

/** Idioma de la URL: lo ha fijado el guard `useSiteLanguage` antes de llegar aquí. */
function language(): SiteLanguage {
  return inject(LocaleService).language() as SiteLanguage;
}

/** Slug de la competición y de la temporada: están en la ruta de la competición, no en sus hijas. */
function competitionParams(route: ActivatedRouteSnapshot): {slug: string; season: string | null} {
  const owner = route.paramMap.has('competition') ? route : route.parent!;

  return {slug: owner.paramMap.get('competition') ?? '', season: owner.paramMap.get('season')};
}

export const homeResolver: ResolveFn<SiteData<SiteHomeCompetition[]>> = () => {
  const response = inject(SiteResponseService);

  return loadSiteData(inject(SiteApiService).home(language())).pipe(
    tap((result: SiteData<SiteHomeCompetition[]>) => {
      if (result.state === 'ok') {
        response.cache(SITE_TTL.current, [SITE_TAG.home, ...result.data.map((competition) => SITE_TAG.competition(competition.id))]);
      }
    }),
  );
};

export const competitionResolver: ResolveFn<SiteData<SiteCompetitionContext> | RedirectCommand> = (route, state) => {
  const response = inject(SiteResponseService);
  const router = inject(Router);
  const lang = language();
  const {slug, season} = competitionParams(route);

  return loadSiteData(inject(SiteApiService).competition(lang, slug, season)).pipe(
    map((result) => {
      if (result.state !== 'ok') {
        return result;
      }

      // Un slug antiguo o de otro idioma: redirección permanente a la misma URL con el vigente
      const current = result.data.competition.slug;
      if (current && current !== slug) {
        response.status(301);

        return new RedirectCommand(router.parseUrl(withCompetitionSlug(lang, state.url, current)), {replaceUrl: true});
      }

      // Una temporada cerrada ya no cambia; la que está en curso, con cada sincronización
      const closed = result.data.season?.status === 'finished' && !result.data.season.is_current;
      response.cache(closed ? SITE_TTL.archive : SITE_TTL.current, [SITE_TAG.competition(result.data.competition.id)]);

      return result;
    }),
  );
};

export const standingsResolver: ResolveFn<SiteData<SiteStandings>> = (route) => {
  const {slug, season} = competitionParams(route);

  return loadSiteData(inject(SiteApiService).standings(language(), slug, season));
};

export const fixturesResolver: ResolveFn<SiteData<SiteRoundMatches>> = (route) => {
  const response = inject(SiteResponseService);
  const lang = language();
  const {slug, season} = competitionParams(route);

  let round: number | null = null;

  if (route.paramMap.has('round')) {
    round = roundFromSegment(lang, route.paramMap.get('round'));

    // Algo detrás de «calendario» que no es una jornada: no existe
    if (round === null) {
      response.status(404);
      response.cache(SITE_TTL.notFound);

      return of(SITE_NOT_FOUND);
    }
  }

  return loadSiteData(inject(SiteApiService).matches(lang, slug, season, round)).pipe(
    tap((result: SiteData<SiteRoundMatches>) => result.state === 'ok' && response.cache(ttlForMatches(result.data.matches, SITE_TTL.archive))),
  );
};

export const competitionTeamsResolver: ResolveFn<SiteData<SiteSeasonTeam[]>> = (route) => {
  const {slug, season} = competitionParams(route);

  return loadSiteData(inject(SiteApiService).teams(language(), slug, season));
};

/** Resumen de la competición: la clasificación general y la jornada en juego. */
export interface CompetitionOverview {
  standings: SiteStandings;
  fixtures: SiteRoundMatches;
}

export const overviewResolver: ResolveFn<SiteData<CompetitionOverview>> = (route) => {
  const response = inject(SiteResponseService);
  const api = inject(SiteApiService);
  const lang = language();
  const {slug, season} = competitionParams(route);

  const overview: Observable<CompetitionOverview> = forkJoin({
    standings: api.standings(lang, slug, season),
    fixtures: api.matches(lang, slug, season, null),
  });

  return loadSiteData(overview).pipe(
    tap((result: SiteData<CompetitionOverview>) => result.state === 'ok' && response.cache(ttlForMatches(result.data.fixtures.matches, SITE_TTL.archive))),
  );
};

export const teamResolver: ResolveFn<SiteData<SiteTeamPage> | RedirectCommand> = (route, state) => {
  const response = inject(SiteResponseService);
  const router = inject(Router);
  const lang = language();
  const slug = route.paramMap.get('team') ?? '';

  return loadSiteData(inject(SiteApiService).team(lang, slug)).pipe(
    map((result) => {
      if (result.state !== 'ok') {
        return result;
      }

      const current = result.data.team.slug;
      if (current && current !== slug) {
        response.status(301);

        return new RedirectCommand(router.parseUrl(withTeamSlug(lang, state.url, current)), {replaceUrl: true});
      }

      response.cache(ttlForMatches(result.data.matches.upcoming, SITE_TTL.current), [
        SITE_TAG.team(result.data.team.id),
        ...result.data.competitions.map((each) => SITE_TAG.competition(each.competition.id)),
      ]);

      return result;
    }),
  );
};
