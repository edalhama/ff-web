import {RefereeDesignation} from './referee';

/** Lo justo para nombrar un canal dentro de un partido (`tv_channels` de cada partido). */
export interface TvChannelSummary {
  id: number;
  name: string;
  /** Número del canal en su operador; se pone a mano. */
  dial: string | null;
  /** Operador o plataforma (Movistar Plus+, DAZN…); se pone a mano. */
  platform: string | null;
  /** URL pública del logo (subido a mano), o null. */
  image: string | null;
}

/** Con qué id conoce un proveedor al canal. En BeSoccer puede tener varios: `external_ids`. */
export interface TvChannelProviderLink {
  code: string;
  name: string;
  external_id: string;
  external_ids: string[];
}

/** Partido emitido por el canal, como lo da su ficha. */
export type TvChannelMatch = RefereeDesignation['match'];

/** Canal de TV tal como lo devuelve el panel (`/admin/tv-channels`). */
export interface TvChannel extends TvChannelSummary {
  /** Campos que la sincronización ya no toca (de Jornada Perfecta solo llega el nombre). */
  locked_fields: string[];
  /** Partidos que emite. */
  matches_count?: number;
  /** Solo en la ficha. */
  providers?: TvChannelProviderLink[];
  /** Solo en la ficha: los últimos partidos, del más reciente al más antiguo. */
  matches?: TvChannelMatch[];
  created_at: string | null;
  updated_at: string | null;
}

/** Cuerpo de un alta (todo) o de una edición (solo lo que cambia). */
export type TvChannelPayload = Partial<Pick<TvChannel, 'name' | 'dial' | 'platform'>> & {
  unlock_fields?: string[];
};
