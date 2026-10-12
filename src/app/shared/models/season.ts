export type SeasonStatus = 'upcoming' | 'in_progress' | 'finished';

export const SEASON_STATUSES: readonly SeasonStatus[] = ['upcoming', 'in_progress', 'finished'];

/** Temporada tal como la devuelve el panel. */
export interface Season {
  id: number;
  competition_id: number;
  /** Texto visible: `2026/27`. */
  label: string;
  /** Para la URL: `2026-27`. */
  slug: string;
  start_year: number;
  /** Fechas `AAAA-MM-DD`. */
  starts_on: string | null;
  ends_on: string | null;
  status: SeasonStatus;
  is_current: boolean;
  current_round_id: number | null;
  locked_fields: string[];
  competition?: {id: number; name: string | null};
  created_at: string | null;
  updated_at: string | null;
}

export type SeasonPayload = Partial<Pick<Season, 'label' | 'slug' | 'start_year' | 'starts_on' | 'ends_on' | 'status' | 'is_current'>> & {
  unlock_fields?: string[];
};
