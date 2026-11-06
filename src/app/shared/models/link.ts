import {SyncDataType} from './sync';

/** Entidades de la pantalla de enlaces. */
export type LinkableType = 'competition' | 'team' | 'player' | 'venue' | 'referee';

/** Las que se enlazan a mano en esa pantalla; la competición, desde su ficha. */
export const MANUAL_LINK_TYPES: readonly LinkableType[] = ['team', 'player', 'venue', 'referee'];

/** Resumen de la pantalla de enlaces (`/admin/links`). */
export interface LinkSummary {
  providers: Array<{code: string; name: string}>;
  /** Por tipo: cuántas hay y cuántas están enlazadas con cada proveedor (por su código). */
  entities: Array<{type: LinkableType; total: number; linked: Record<string, number>; manual: boolean}>;
  competitions: Array<{
    id: number;
    name: string;
    active: boolean;
    links: Array<{provider: {code: string; name: string}; external_id: string; name: string | null}>;
    sources: Array<{data_type: SyncDataType; provider: string; active: boolean; last_run_at: string | null}>;
    last_run_at: string | null;
  }>;
}

/** Fila del listado de entidades, con su enlace con el proveedor del listado. */
export interface LinkRow {
  id: number;
  type: LinkableType;
  name: string;
  /** Lo que lo distingue de otro con el mismo nombre: «Pedro González López · España · 2002». */
  detail: string | null;
  external_id: string | null;
  /** Cómo lo llama el proveedor. */
  external_name: string | null;
  last_synced_at: string | null;
}

export type AssetKind = 'crest' | 'photo' | 'logo' | 'venue_photo' | 'kit_home' | 'kit_away' | 'kit_third';

/** Nuestra copia de una imagen del proveedor (ver ff-api/docs/ASSETS.md). */
export interface ProviderAsset {
  kind: AssetKind;
  /** `available`: hay fichero y `url` es la pública; `pending`: aún no se ha intentado; `failed`: `error` dice por qué. */
  status: 'available' | 'pending' | 'failed';
  url: string | null;
  source_url: string | null;
  mime: string | null;
  bytes: number | null;
  width: number | null;
  height: number | null;
  fetched_at: string | null;
  checked_at: string | null;
  failed_at: string | null;
  failures: number;
  error: string | null;
}

/** Enlace de una entidad con un proveedor (sin enlace: `external_id` null). */
export interface ProviderLink {
  provider: {code: string; name: string};
  /** Admite enlace a mano: los proveedores con sincronización. Biwenger, BeSoccer y LaLiga Fantasy solo se ven. */
  editable: boolean;
  external_id: string | null;
  external_name: string | null;
  /** Escudo o cara que ese proveedor tiene de la entidad, tal como él la sirve. */
  image: string | null;
  /** Nuestras copias de sus imágenes, con su estado. */
  assets: ProviderAsset[];
  /** Quién nos dio el enlace cuando no lo escribió el propio proveedor (los de Biwenger, BeSoccer y LFM vienen de JP). */
  via: {code: string; name: string} | null;
  last_synced_at: string | null;
}

/** Una entidad con su enlace con cada proveedor. */
export interface LinkEntity {
  id: number;
  type: LinkableType;
  name: string;
  detail: string | null;
  /** Se puede enlazar a mano desde la pantalla de enlaces. */
  manual: boolean;
  links: ProviderLink[];
}
