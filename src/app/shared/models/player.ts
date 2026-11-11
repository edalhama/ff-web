import {Country} from './country';
import {PlayerAutomanager} from './market';
import {TeamSummary} from './team';

export type PlayerPosition = 'goalkeeper' | 'defender' | 'midfielder' | 'forward' | 'coach';
export type PlayerStatus = 'ok' | 'injured' | 'suspended' | 'doubt' | 'not_called' | 'warned' | 'unknown';
export type PlayerFoot = 'left' | 'right' | 'both';

/** Valoración más reciente de un jugador en el videojuego (EA Sports FC). */
export interface PlayerRating {
  provider: {code: string; name: string};
  /** Edición del juego: `27` es EA Sports FC 27. */
  edition: number;
  /** Media, de 1 a 99. */
  overall: number;
  /** Posición en el juego, tal cual: `ST`, `CDM`… */
  position: string | null;
  alt_positions: string[];
  /** Las seis medias de la carta. En los porteros: estirada, paradas, saque, reflejos, velocidad y colocación. */
  pace: number | null;
  shooting: number | null;
  passing: number | null;
  dribbling: number | null;
  defending: number | null;
  physical: number | null;
  skill_moves: number | null;
  weak_foot: number | null;
  /** Su ficha en la web del juego. */
  profile_url: string | null;
  fetched_at: string | null;
}

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
  foot: PlayerFoot | null;
  /** Posición habitual. */
  position: PlayerPosition | null;
  country: Country | null;
  rating: PlayerRating | null;
  /** Cara según las fuentes preferidas de la competición de la plantilla. */
  photo: string | null;
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

export const PLAYER_POSITIONS: readonly PlayerPosition[] = ['goalkeeper', 'defender', 'midfielder', 'forward', 'coach'];
export const PLAYER_FEET: readonly PlayerFoot[] = ['right', 'left', 'both'];

/** Filtro de estado del listado de jugadores: en la plantilla, ya no está, o lesionado o sancionado. */
export type PlayerListStatus = 'active' | 'gone' | 'unavailable';
export const PLAYER_LIST_STATUSES: readonly PlayerListStatus[] = ['active', 'gone', 'unavailable'];

/** Jugador como persona en el panel de jugadores (`/admin/players`). */
export interface PlayerProfile {
  id: number;
  name: string;
  full_name: string | null;
  slug: string;
  birth_date: string | null;
  country_id: number | null;
  second_country_id: number | null;
  height_cm: number | null;
  foot: PlayerFoot | null;
  position: PlayerPosition | null;
  retired: boolean;
  /** Campos que la sincronización ya no toca. */
  locked_fields: string[];
  country?: Country | null;
  second_country?: Country | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Lo que dice una ficha de su temporada. */
export interface PlayerMembershipState {
  shirt_number: number | null;
  /** La de la temporada; si la ficha no tiene una propia, la habitual del jugador. */
  position: PlayerPosition | null;
  status: PlayerStatus;
  status_note: string | null;
  status_until: string | null;
  active: boolean;
}

/** Fila del listado: una ficha de la temporada (un jugador con dos equipos sale dos veces). */
export interface PlayerRow extends PlayerMembershipState {
  /** Id de la ficha. */
  id: number;
  /** Con su cara según las fuentes preferidas de la competición del listado. */
  player: PlayerProfile & {photo: string | null};
  team: TeamSummary;
}

/** Contexto del listado de una competición: su temporada y sus equipos (para el filtro). */
export interface PlayerListContext {
  competitionId: number;
  season: {id: number; label: string} | null;
  teams: TeamSummary[];
}

/** Una ficha del jugador en cualquier competición. */
export interface PlayerMembership extends PlayerMembershipState {
  id: number;
  competition: {id: number; name: string | null};
  season: {id: number; label: string; start_year: number; is_current: boolean};
  team: TeamSummary;
}

/** Valoración con sus atributos detallados (`finishing`, `gkReflexes`…). */
export interface PlayerRatingDetail extends PlayerRating {
  stats: Record<string, number>;
}

/** Ficha completa (`/admin/players/{id}`). */
export interface PlayerDetail extends PlayerProfile {
  /** Cara según las fuentes preferidas de la competición desde la que se abre. */
  photo: string | null;
  /** Cómo lo llama cada proveedor, para elegir. */
  names: Array<{provider: {code: string; name: string}; value: string}>;
  /** Todas sus fichas, la temporada actual primero. */
  memberships: PlayerMembership[];
  /** De la edición más reciente a la más antigua. */
  ratings: PlayerRatingDetail[];
  /** Valoración del automanager de Jornada Perfecta: la actual y la de sus últimos partidos. */
  automanager: PlayerAutomanager;
}

/** Lo que carga el modal `player`: la ficha y la competición desde la que se abre. */
export interface PlayerCard extends PlayerDetail {
  /** Competición con la que se ha abierto (`?id=12-1` → 1); null si no viene. */
  context_competition_id: number | null;
}

/** Cuerpo de una edición: solo lo que cambia. */
export type PlayerPayload = Partial<
  Pick<PlayerProfile, 'name' | 'full_name' | 'birth_date' | 'country_id' | 'second_country_id' | 'height_cm' | 'foot' | 'position' | 'retired'>
> & {
  unlock_fields?: string[];
};

/** Id del modal `player`: el del jugador y el de la competición, `12-1`. */
export function playerModalId(playerId: number, competitionId: number | null): string {
  return competitionId ? `${playerId}-${competitionId}` : String(playerId);
}
