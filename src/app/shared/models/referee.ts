import {Country} from './country';
import {MatchPeriod, MatchStatus} from './match';
import {ProviderLink, TeamSummary} from './team';

/** Roles de una designación arbitral, en el orden en que se enseñan. */
export const REFEREE_ROLES = ['referee', 'var', 'avar', 'avar2', 'fourth_official'] as const;
export type RefereeRole = (typeof REFEREE_ROLES)[number];

/** Lo justo para nombrar a un árbitro dentro de un partido. */
export interface RefereeSummary {
  id: number;
  name: string;
  short_name: string | null;
}

/** Árbitro tal como lo devuelve el panel (`/admin/referees`). */
export interface Referee extends RefereeSummary {
  /** `YYYY-MM-DD`. */
  birth_date: string | null;
  birth_place: string | null;
  country_id: number | null;
  /** Campos que la sincronización ya no toca. */
  locked_fields: string[];
  country?: Country | null;
  /** Partidos arbitrados, en cualquier rol. */
  designations_count?: number;
  /** Solo en la ficha. */
  providers?: ProviderLink[];
  /** Solo en la ficha: las últimas designaciones, de la más reciente a la más antigua. */
  designations?: RefereeDesignation[];
  created_at: string | null;
  updated_at: string | null;
}

/** Un partido arbitrado y con qué rol. */
export interface RefereeDesignation {
  role: RefereeRole;
  match: {
    id: number;
    season_id: number;
    kickoff_at: string | null;
    kickoff_confirmed: boolean;
    status: MatchStatus;
    period: MatchPeriod | null;
    minute: number | null;
    home_team: TeamSummary | null;
    away_team: TeamSummary | null;
    home_score: number | null;
    away_score: number | null;
    competition: {id: number; name: string | null; short_name: string | null};
    season: {id: number; label: string};
  };
}

/** Cuerpo de una edición: solo lo que cambia. */
export type RefereePayload = Partial<Pick<Referee, 'name' | 'short_name' | 'birth_date' | 'birth_place' | 'country_id'>> & {
  unlock_fields?: string[];
};
