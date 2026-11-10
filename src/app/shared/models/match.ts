import {PlayerPosition} from './player';
import {RefereeRole} from './referee';
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
  /** Nombre del árbitro principal. */
  referee: string | null;
  /** Se juega fuera del estadio habitual del local. */
  neutral_venue: boolean;
  /** Designación completa, un árbitro por rol; solo cuando se carga. */
  referees?: Array<{role: RefereeRole; id: number; name: string | null; short_name: string | null}>;
  locked_fields: string[];
  venue?: VenueSummary | null;
}

export type MatchEventType =
  | 'goal'
  | 'penalty_goal'
  | 'own_goal'
  | 'penalty_missed'
  | 'penalty_saved'
  | 'yellow_card'
  | 'second_yellow_card'
  | 'red_card'
  | 'substitution';
/** Titular, suplente (en el banquillo, juegue o no) o fuera de la convocatoria. */
export type LineupRole = 'starter' | 'bench' | 'absent';
/** Peor tarjeta recibida en el partido. */
export type MatchCard = 'none' | 'yellow' | 'second_yellow' | 'red';

/** Lo justo para nombrar la jornada de un partido: «Jornada 5» o «Final». */
export interface RoundSummary {
  id: number;
  number: number | null;
  type: string;
  leg: string;
}

/** Jornada del listado del panel (`/admin/rounds`). */
export interface RoundRow extends Round {
  matches_count: number;
  /** Partidos ya terminados. */
  played_matches_count: number;
}

/** Fila del listado de partidos (`/admin/matches`): los equipos traen su escudo. */
export interface MatchRow extends FootballMatch {
  round: RoundSummary | null;
}

/** Temporada para los filtros de los listados de una competición. */
export interface SeasonOption {
  id: number;
  label: string;
  start_year: number;
  is_current: boolean;
}

/**
 * Contexto de la última página del listado de partidos, para sus filtros: las temporadas de la
 * competición, las jornadas de la temporada y lo que el servidor aplicó de verdad. `requested*`
 * es lo que se pidió (null = la vigente), para saber si el contexto vale para los filtros activos.
 */
export interface MatchListContext {
  competitionId: number;
  requestedSeasonId: number | null;
  requestedRoundId: number | null;
  seasons: SeasonOption[];
  rounds: Round[];
  seasonId: number | null;
  roundId: number | null;
}

/** Lo mismo para el listado de jornadas: sus temporadas, la aplicada y la jornada en disputa. */
export interface RoundListContext {
  competitionId: number;
  requestedSeasonId: number | null;
  seasons: SeasonOption[];
  seasonId: number | null;
  currentRoundId: number | null;
}

/** Suceso de un partido. */
export interface MatchEvent {
  id: number;
  team_id: number;
  type: MatchEventType;
  period: MatchPeriod;
  minute: number;
  /** Añadido: 45+2 → `minute` 45, `added_minute` 2. */
  added_minute: number | null;
  sequence: number;
  /** Protagonista: goleador, amonestado, el que sale en un cambio. */
  player: {id: number; name: string} | null;
  /** Asistente de un gol; el que entra en un cambio. */
  related_player: {id: number; name: string} | null;
}

/** Nota de un jugador en un partido para un sistema de puntuación. */
export interface MatchPlayerScore {
  scoring_system_id: number;
  /** Tal como la da el proveedor: `3`, `7.4`, `SC`. Null en los sistemas derivados. */
  raw_value: string | null;
  /** Nota numérica; null si `raw_value` no es un número. */
  value: number | null;
  base_points: number | null;
  /** Puntos finales; null mientras no se puedan calcular. */
  points: number | null;
  /** Desglose: lista de [concepto, puntos]. */
  breakdown: Array<[string, number]> | null;
  /** Mejor del partido según el sistema (Súper Pica). */
  is_featured: boolean;
  /** En el once ideal de la jornada para el sistema. */
  is_ideal: boolean;
  /** La nota aún puede cambiar. */
  is_provisional: boolean;
}

/** Un jugador de la plantilla en un partido, con todas sus notas. */
export interface MatchPlayer {
  id: number;
  team_id: number;
  /** Con su cara según las fuentes preferidas de la competición. */
  player: {id: number; name: string; full_name: string | null; photo: string | null};
  role: LineupRole;
  position: PlayerPosition | null;
  shirt_number: number | null;
  is_captain: boolean;
  minute_in: number | null;
  minute_out: number | null;
  minutes_played: number | null;
  /** Sin contar los de propia puerta. */
  goals: number;
  own_goals: number;
  assists: number;
  card: MatchCard;
  stats: Record<string, unknown> | null;
  scores: MatchPlayerScore[];
}

/** Fila de la tabla de notas: el jugador con la nota del sistema elegido (null si no tiene). */
export interface MatchScoreRow extends MatchPlayer {
  score: MatchPlayerScore | null;
  /** Competición del partido: con ella se abre la ficha del jugador. */
  competitionId: number;
}

/** Sistema de puntuación tal como lo usa una competición. */
export interface CompetitionScoringSystem {
  id: number;
  code: string;
  name: string | null;
  /** La nota cambia durante el partido. */
  realtime: boolean;
  /** El que se enseña primero en la competición. */
  is_default: boolean;
}

/** Ficha de un partido (`/admin/matches/{id}`), lo que carga el modal `match`. */
export interface MatchDetail {
  match: FootballMatch & {
    competition: {id: number; name: string | null; short_name: string | null};
    season: {id: number; label: string};
    round: Round | null;
  };
  /** En el orden del partido. */
  events: MatchEvent[];
  /** Los dos equipos: primero el local; titulares, suplentes y no convocados. */
  players: MatchPlayer[];
  /** Los de la competición, en su orden. */
  scoring_systems: CompetitionScoringSystem[];
}
