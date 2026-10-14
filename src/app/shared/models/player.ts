import {Country} from './country';

export type PlayerPosition = 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
export type PlayerStatus = 'ok' | 'injured' | 'suspended' | 'doubt' | 'not_called' | 'warned' | 'unknown';

/** Jugador como persona, tal como lo devuelve el panel dentro de una plantilla. */
export interface Player {
  id: number;
  /** Nombre deportivo: `Pedri`. */
  name: string;
  full_name: string | null;
  slug: string;
  /** `AAAA-MM-DD`. */
  birth_date: string | null;
  height_cm: number | null;
  /** Posición habitual. */
  position: PlayerPosition | null;
  country: Country | null;
}

/** Ficha de un jugador en la plantilla de un equipo para una temporada. */
export interface SquadMember {
  id: number;
  player: Player;
  shirt_number: number | null;
  /** La de esta temporada; si la ficha no tiene una propia, la habitual del jugador. */
  position: PlayerPosition | null;
  status: PlayerStatus;
  status_note: string | null;
  status_until: string | null;
  /** Pertenece ahora mismo a la plantilla. */
  active: boolean;
  locked_fields: string[];
}

/** Plantilla de un equipo en una temporada (`/admin/teams/{id}/squads`). */
export interface TeamSquad {
  season: {id: number; label: string; start_year: number; is_current: boolean};
  competition: {id: number; name: string | null};
  members: SquadMember[];
}
