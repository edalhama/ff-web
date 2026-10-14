import {SyncDataType} from './sync';

/** Entidades de la pantalla de enlaces. */
export type LinkableType = 'competition' | 'team' | 'player' | 'venue';

/** Las que se enlazan a mano en esa pantalla; la competición, desde su ficha. */
export const MANUAL_LINK_TYPES: readonly LinkableType[] = ['team', 'player', 'venue'];

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

/** Una entidad con su enlace con cada proveedor (sin enlace: `external_id` null). */
export interface LinkEntity {
  id: number;
  type: LinkableType;
  name: string;
  detail: string | null;
  /** Se puede enlazar a mano desde la pantalla de enlaces. */
  manual: boolean;
  links: Array<{provider: {code: string; name: string}; external_id: string | null; external_name: string | null; last_synced_at: string | null}>;
}
