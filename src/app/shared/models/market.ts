import {PlayerPosition, PlayerProfile} from './player';
import {TeamSummary} from './team';

/** Juego fantasy del mercado: el código de su proveedor en ff-api. */
export type MarketProvider = 'biwenger' | 'laliga-fantasy';

export const MARKET_PROVIDERS: readonly MarketProvider[] = ['biwenger', 'laliga-fantasy'];

/**
 * Fila del mercado (`/admin/market`): la ficha del jugador en la temporada y su precio en un juego
 * un día, con la predicción del automanager de ese día. Compras, ventas, propietarios y precio
 * fantasy solo los tiene Biwenger (en LaLiga Fantasy llegan a null).
 */
export interface MarketRow {
  /** Id de la ficha. */
  id: number;
  /** Con su cara según las fuentes preferidas de la competición. */
  player: PlayerProfile & {photo: string | null};
  team: TeamSummary;
  /** La de la temporada; si la ficha no tiene una propia, la habitual del jugador. */
  position: PlayerPosition | null;
  /** Euros. */
  price: number;
  /** Respecto al día anterior disponible; null el primer día. */
  change: number | null;
  purchases: number | null;
  sales: number | null;
  owners: number | null;
  /** Precio fantasy de Biwenger: solo lo hay del día en que se sincronizó. */
  fantasy_price: number | null;
  /** Lo que se espera que suba: lo que hay que pujar. */
  prediction_conservative: number | null;
  /** Lo que habría que pujar de más para llevárselo. */
  prediction_aggressive: number | null;
}

/** Lo que trae la página del mercado para pintar sus filtros, y lo que se pidió. */
export interface MarketListContext {
  competitionId: number;
  season: {id: number; label: string} | null;
  teams: TeamSummary[];
  providers: Array<{code: MarketProvider; name: string}>;
  /** Días con precios del juego aplicado, del más reciente al más antiguo (`AAAA-MM-DD`). */
  dates: string[];
  /** Juego y día aplicados de verdad (sin filtro, Biwenger y su último día). */
  provider: MarketProvider | null;
  date: string | null;
  /** Juego pedido (null = el de por defecto), para saber si los días valen para el filtro. */
  requestedProvider: MarketProvider | null;
}

/** Valoración actual del automanager en un sistema de puntuación. */
export interface AutomanagerRating {
  scoring_system: {id: number; code: string; name: string | null};
  rating: number;
  /** Día de la valoración (`AAAA-MM-DD`, hora de Madrid). */
  date: string;
  /** Cuándo la calculó el automanager. */
  updated_at: string | null;
}

/** Valoración del automanager con la que llegó a un partido. */
export interface AutomanagerMatch {
  match_id: number;
  kickoff_at: string | null;
  status: string;
  round: {id: number; number: number | null; type: string} | null;
  /** Jugaba en casa. */
  home: boolean;
  team: TeamSummary;
  opponent: TeamSummary;
  home_score: number | null;
  away_score: number | null;
  ratings: Array<{scoring_system: {id: number; code: string; name: string | null}; rating: number}>;
}

/** Automanager de la ficha del jugador: la valoración actual y la de sus últimos partidos. */
export interface PlayerAutomanager {
  current: AutomanagerRating[];
  matches: AutomanagerMatch[];
}
