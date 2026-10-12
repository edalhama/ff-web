import {computed, inject, Signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute} from '@angular/router';
import {TranslateService} from '@ngx-translate/core';
import {LocaleService} from '@edas/ng/shared/services/locale.service';
import {map} from 'rxjs';
import {SiteCompetitionContext} from '../../../shared/models/site';
import {TeamSummary} from '../../../shared/models/team';
import {dataOf, SiteData} from '../../../site/site-data';
import {competitionPath, CompetitionPage, SITE_LANGUAGES, SiteLanguage, teamPath} from '../../../site/site-links';
import {competitionSchema} from '../../../site/site-schema';
import {SiteAlternates, SitePageMeta} from '../../../site/site-seo.service';

/**
 * Lo que comparten las páginas de una competición (resumen, clasificación, calendario y
 * equipos): la competición y la temporada que se están viendo, y cómo se enlaza y se describe
 * cada página.
 *
 * `injectCompetitionPage()` lo monta dentro de una de esas páginas, que son hijas de la ruta
 * de la competición: los datos comunes los ha cargado la ruta padre.
 */
export interface CompetitionPageContext {
  lang: SiteLanguage;
  /** Competición y temporada; null si no existen o la API no ha respondido. */
  context: Signal<SiteCompetitionContext | null>;
  /** Slug de la temporada si la URL la lleva; null cuando se ve «la actual». */
  seasonInUrl: Signal<string | null>;
  /** «LaLiga 2026/27». */
  label: Signal<string>;
  /** Ruta de una página de esta competición, conservando la temporada de la URL. */
  path(page: CompetitionPage, round?: number | null): string;
  /** Ruta de la ficha de un equipo; null si no tiene página. */
  teamLink: (team: TeamSummary & {slug?: string | null}) => string | null;
  /**
   * Metadatos comunes de una página: sus URLs por idioma, la canónica, las migas y la
   * competición como dato estructurado. `round` solo para el calendario.
   */
  meta(page: CompetitionPage, round?: number | null): Pick<SitePageMeta, 'alternates' | 'canonical' | 'breadcrumbs' | 'schema' | 'titleParams'>;
}

export function injectCompetitionPage(route: ActivatedRoute = inject(ActivatedRoute)): CompetitionPageContext {
  const translate = inject(TranslateService);
  const lang = inject(LocaleService).language() as SiteLanguage;

  // La ruta de la competición es esta misma (cabecera) o la padre (sus páginas)
  const owner = route.snapshot.paramMap.has('competition') ? route : route.parent!;

  const context = toSignal(owner.data.pipe(map((data) => dataOf(data['context'] as SiteData<SiteCompetitionContext>))), {initialValue: null});
  const seasonInUrl = toSignal(owner.paramMap.pipe(map((params) => params.get('season'))), {initialValue: null});

  const label = computed(() => {
    const current = context();

    return [current?.competition.name, current?.season?.label].filter(Boolean).join(' ');
  });

  /** La página en cada idioma. `season`: null para la URL sin temporada. */
  const alternates = (page: CompetitionPage, season: string | null, round: number | null): SiteAlternates => {
    const slugs = context()?.competition.slugs ?? {};
    const paths = {} as SiteAlternates;

    for (const each of SITE_LANGUAGES) {
      paths[each] = slugs[each] ? competitionPath(each, slugs[each]!, {page, season, round}) : null;
    }

    return paths;
  };

  const path = (page: CompetitionPage, round: number | null = null): string =>
    competitionPath(lang, context()?.competition.slug ?? '', {page, season: seasonInUrl(), round});

  return {
    lang,
    context,
    seasonInUrl,
    label,
    path,
    teamLink: (team) => (team.slug ? teamPath(lang, team.slug) : null),
    meta: (page, round = null) => {
      const current = context();
      const season = current?.season ?? null;

      // La temporada actual se ve con y sin temporada en la URL: la canónica es la que no la
      // lleva. Las demás solo existen con ella.
      const canonicalSeason = season && !season.is_current ? season.slug : null;
      const overview = competitionPath(lang, current?.competition.slug ?? '', {season: canonicalSeason});

      return {
        titleParams: {competition: current?.competition.name ?? '', season: season?.label ?? '', round},
        alternates: alternates(page, seasonInUrl(), round),
        canonical: alternates(page, canonicalSeason, round),
        breadcrumbs: [
          {name: label(), path: overview},
          ...(page === 'overview'
            ? []
            : [{name: translate.instant(`site.competition.tab-${page}`), path: competitionPath(lang, current?.competition.slug ?? '', {page, season: canonicalSeason})}]),
        ],
        schema: current ? [competitionSchema(lang, current.competition)] : [],
      };
    },
  };
}
