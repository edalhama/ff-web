import {environment} from '../../environments/environment';
import {SiteCompetitionSummary, SiteMatch, SiteTeam, SiteVenue} from '../shared/models/site';
import {absoluteUrl, competitionPath, SiteLanguage, teamPath} from './site-links';

/**
 * Datos estructurados de schema.org de las páginas públicas (van en el JSON-LD que escribe
 * `SiteSeoService`). Solo hechos que están en la página: nada de valoraciones ni de datos
 * que no se muestran.
 */

type SchemaNode = Record<string, unknown>;

const SPORT = 'https://www.wikidata.org/wiki/Q2736'; // Fútbol

/** Estado del partido según schema.org; los que se juegan con normalidad, `EventScheduled`. */
const EVENT_STATUS: Partial<Record<SiteMatch['status'], string>> = {
  postponed: 'https://schema.org/EventPostponed',
  cancelled: 'https://schema.org/EventCancelled',
  suspended: 'https://schema.org/EventPostponed',
};

function url(path: string): string {
  return absoluteUrl(environment.siteUrl, path);
}

function place(venue: SiteVenue): SchemaNode {
  return {
    '@type': 'StadiumOrArena',
    name: venue.name,
    ...(venue.city ? {address: {'@type': 'PostalAddress', addressLocality: venue.city}} : {}),
    ...(venue.capacity ? {maximumAttendeeCapacity: venue.capacity} : {}),
  };
}

function teamReference(lang: SiteLanguage, team: {name: string | null; slug?: string | null}): SchemaNode {
  return {
    '@type': 'SportsTeam',
    name: team.name,
    sport: SPORT,
    ...(team.slug ? {url: url(teamPath(lang, team.slug))} : {}),
  };
}

/** La competición, como organización deportiva. */
export function competitionSchema(lang: SiteLanguage, competition: SiteCompetitionSummary): SchemaNode {
  const page = url(competitionPath(lang, competition.slug ?? ''));

  return {
    '@type': 'SportsOrganization',
    '@id': `${page}#competition`,
    name: competition.name,
    sport: SPORT,
    url: page,
    ...(competition.country ? {areaServed: {'@type': 'Country', name: competition.country.name, identifier: competition.country.code}} : {}),
  };
}

/** Un partido. Sin fecha o sin alguno de los dos equipos no es un evento que describir. */
export function matchSchema(lang: SiteLanguage, match: SiteMatch, competition: SiteCompetitionSummary): SchemaNode | null {
  if (!match.kickoff_at || !match.home_team?.name || !match.away_team?.name) {
    return null;
  }

  return {
    '@type': 'SportsEvent',
    name: `${match.home_team.name} - ${match.away_team.name}`,
    sport: SPORT,
    startDate: match.kickoff_at,
    eventStatus: EVENT_STATUS[match.status] ?? 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    homeTeam: teamReference(lang, match.home_team),
    awayTeam: teamReference(lang, match.away_team),
    ...(match.venue ? {location: place(match.venue)} : {}),
    superEvent: {'@type': 'SportsEvent', name: competition.name, url: url(competitionPath(lang, competition.slug ?? ''))},
  };
}

/** Los partidos de una lista que se pueden describir. */
export function matchesSchema(lang: SiteLanguage, matches: readonly SiteMatch[], competition: SiteCompetitionSummary): SchemaNode[] {
  return matches.map((match) => matchSchema(lang, match, competition)).filter((node): node is SchemaNode => node !== null);
}

/** El equipo de una ficha, con las competiciones que juega. */
export function teamSchema(lang: SiteLanguage, team: SiteTeam, competitions: readonly SiteCompetitionSummary[]): SchemaNode {
  const page = url(teamPath(lang, team.slug ?? ''));

  return {
    '@type': 'SportsTeam',
    '@id': `${page}#team`,
    name: team.name,
    ...(team.short_name && team.short_name !== team.name ? {alternateName: team.short_name} : {}),
    sport: SPORT,
    url: page,
    ...(team.founded_year ? {foundingDate: String(team.founded_year)} : {}),
    ...(team.venue ? {location: place(team.venue)} : {}),
    ...(team.country ? {areaServed: {'@type': 'Country', name: team.country.name, identifier: team.country.code}} : {}),
    ...(competitions.length > 0
      ? {memberOf: competitions.map((competition) => ({'@type': 'SportsOrganization', name: competition.name, url: url(competitionPath(lang, competition.slug ?? ''))}))}
      : {}),
  };
}

/** Lista de enlaces de una página índice (competiciones de la portada, equipos de una temporada). */
export function itemListSchema(name: string, items: ReadonlyArray<{name: string | null; path: string}>): SchemaNode {
  return {
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({'@type': 'ListItem', position: index + 1, name: item.name, url: url(item.path)})),
  };
}
