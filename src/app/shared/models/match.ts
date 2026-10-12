import {SeasonStatus} from './season';
import {TeamSummary, VenueSummary} from './team';

export type MatchStatus = 'scheduled' | 'playing' | 'finished' | 'postponed' | 'suspended' | 'cancelled';
export type MatchPeriod = 'first_half' | 'half_time' | 'second_half' | 'extra_time' | 'penalties';

/** Jornada de una temporada. */
export interface Round {
  id: number;
  stage_id: number;
  /** Orden dentro de la fase. */
  sequence: number;
  /** Número visible (`Jornada 5`); null en rondas con nombre propio. */
  number: number | null;
  type: string;
  leg: string;
  /** Primer y último partido, en UTC. */
  starts_at: string | null;
  ends_at: string | null;
  status: SeasonStatus;
  matches_count?: number;
}

/** Partido tal como lo devuelve el panel. */
export interface FootballMatch {
  id: number;
  season_id: number;
  round_id: number;
  /** Inicio en UTC (ISO 8601). */
  kickoff_at: string | null;
  /** `false` = la fecha es orientativa, el horario no está fijado. */
  kickoff_confirmed: boolean;
  status: MatchStatus;
  period: MatchPeriod | null;
  minute: number | null;
  home_team: TeamSummary | null;
  away_team: TeamSummary | null;
  home_score: number | null;
  away_score: number | null;
  home_score_half: number | null;
  away_score_half: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
  decided_by: string | null;
  referee: string | null;
  locked_fields: string[];
  venue?: VenueSummary | null;
}
