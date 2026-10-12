import {TeamSummary} from './team';

export type StandingScope = 'total' | 'home' | 'away';

export const STANDING_SCOPES: readonly StandingScope[] = ['total', 'home', 'away'];

/** Fila de una clasificación. */
export interface StandingRow {
  position: number;
  /** Puesto antes de su último partido. */
  previous_position: number | null;
  team: TeamSummary;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  /** Últimos resultados, del más antiguo al más reciente: `WWDLW`. */
  form: string | null;
  /** Clave de la zona que ocupa: `champions`, `relegation`… */
  zone: string | null;
}

/** Clasificación de una fase de la temporada. */
export interface StandingsTable {
  stage_id: number;
  stage_type: string;
  /** Cuándo se comprobó por última vez con el proveedor. */
  synced_at: string | null;
  rows: StandingRow[];
}
