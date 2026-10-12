import {MatchPeriod, MatchStatus} from './match';
import {SeasonStatus} from './season';
import {StandingRow, StandingScope} from './standing';
import {TeamSummary} from './team';

/**
 * Lo que devuelve la API pública (`/api/site`): textos en el idioma pedido y, de cada entidad
 * con página, su slug. Ver ff-api/docs/API.md.
 */

/** Slug de una entidad en cada idioma del sitio. */
export type SiteSlugs = Record<string, string | null>;

export interface SiteCountry {
  code: string;
  name: string;
}

export interface SiteVenue {
  name: string;
  city: string | null;
  capacity: number | null;
}

/** Equipo dentro de un partido o de una clasificación, con el slug de su página. */
export interface SiteTeamSummary extends TeamSummary {
  slug: string | null;
}

export interface SiteSeasonSummary {
  label: string;
  slug: string;
  is_current: boolean;
}

export interface SiteSeason extends SiteSeasonSummary {
  id: number;
  status: SeasonStatus;
  starts_on: string | null;
  ends_on: string | null;
  /** Número de la jornada en juego. */
  current_round: number | null;
}

export interface SiteCompetitionSummary {
  id: number;
  name: string | null;
  short_name: string | null;
  slug: string | null;
  slugs: SiteSlugs;
  type: string;
  gender: string;
  country: SiteCountry | null;
}

export interface SiteCompetition extends SiteCompetitionSummary {
  seo_title: string | null;
  seo_description: string | null;
  content: string | null;
  updated_at: string | null;
}

/** Competición de la portada, con su temporada actual. */
export interface SiteHomeCompetition extends SiteCompetitionSummary {
  season: SiteSeasonSummary | null;
}

export interface SiteRound {
  number: number;
  status: SeasonStatus;
  starts_at: string | null;
  ends_at: string | null;
}

/** Lo que comparten todas las páginas de una competición. */
export interface SiteCompetitionContext {
  competition: SiteCompetition;
  /** Temporada que se está viendo; null si la competición aún no tiene ninguna. */
  season: SiteSeason | null;
  seasons: SiteSeasonSummary[];
  rounds: SiteRound[];
}

export interface SiteMatch {
  id: number;
  /** Inicio en UTC (ISO 8601). */
  kickoff_at: string | null;
  kickoff_confirmed: boolean;
  status: MatchStatus;
  period: MatchPeriod | null;
  minute: number | null;
  home_team: SiteTeamSummary | null;
  away_team: SiteTeamSummary | null;
  home_score: number | null;
  away_score: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
  decided_by: string | null;
  venue?: SiteVenue | null;
  /** Número de su jornada. */
  round?: number | null;
  /** Solo en la ficha de un equipo: a qué competición y temporada pertenece. */
  competition?: {name: string | null; short_name: string | null; slug: string | null};
  season?: SiteSeasonSummary;
}

export interface SiteRoundMatches {
  round: SiteRound | null;
  matches: SiteMatch[];
}

export interface SiteStandingRow extends StandingRow {
  team: SiteTeamSummary;
}

export interface SiteStandingsTable {
  stage_type: string;
  /** Cuándo se comprobó por última vez con el proveedor. */
  updated_at: string | null;
  rows: SiteStandingRow[];
}

export interface SiteStandings {
  scope: StandingScope;
  tables: SiteStandingsTable[];
}

/** Equipo de la lista de una temporada. */
export interface SiteSeasonTeam extends SiteTeamSummary {
  venue: SiteVenue | null;
}

export interface SiteTeam extends SiteTeamSummary {
  slugs: SiteSlugs;
  seo_title: string | null;
  seo_description: string | null;
  content: string | null;
  type: string;
  gender: string;
  founded_year: number | null;
  primary_color: string | null;
  country: SiteCountry | null;
  venue: SiteVenue | null;
  updated_at: string | null;
}

/** Ficha de un equipo. */
export interface SiteTeamPage {
  team: SiteTeam;
  competitions: Array<{
    competition: SiteCompetitionSummary;
    season: SiteSeasonSummary;
    standing: {position: number; played: number; points: number; zone: string | null} | null;
  }>;
  matches: {recent: SiteMatch[]; upcoming: SiteMatch[]};
}

/** Todo lo que tiene página, para el sitemap. */
export interface SiteSitemap {
  competitions: Array<{
    slugs: SiteSlugs;
    updated_at: string | null;
    seasons: Array<{slug: string; is_current: boolean; updated_at: string | null; rounds: number[]}>;
  }>;
  teams: Array<{slugs: SiteSlugs; updated_at: string | null}>;
}
