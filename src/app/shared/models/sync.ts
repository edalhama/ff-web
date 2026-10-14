export type SyncDataType = 'calendar' | 'standings' | 'squads' | 'statuses' | 'lineups' | 'events' | 'stats' | 'scores';
export type SyncStatus = 'running' | 'success' | 'partial' | 'failed';

/** Qué proveedor alimenta un tipo de dato de la competición. */
export interface SyncSource {
  id: number;
  data_type: SyncDataType;
  provider: {code: string; name: string};
  /** Id de la competición en ese proveedor. */
  external_id: string | null;
  active: boolean;
  last_run_at: string | null;
}

/** Una ejecución de la sincronización de un tipo de dato. */
export interface SyncRun {
  id: number;
  data_type: SyncDataType;
  provider: {code: string; name: string};
  status: SyncStatus;
  triggered_by: 'schedule' | 'manual';
  started_at: string | null;
  finished_at: string | null;
  items_created: number;
  items_updated: number;
  items_skipped: number;
  errors_count: number;
  /** Resumen, o el motivo del fallo. */
  message: string | null;
  notes: string[];
  errors: string[];
  /** Peticiones hechas al proveedor y las que le quedan hoy. */
  requests: number | null;
  quota_remaining: number | null;
  user?: {id: number; name: string} | null;
}

/** Proveedor con sincronización automática y lo que sabe traer. */
export interface SyncProvider {
  code: string;
  name: string;
  active: boolean;
  types: SyncDataType[];
  /** Se pueden buscar sus competiciones para enlazarlas. */
  searchable: boolean;
}

/** Con qué competición de un proveedor está enlazada la nuestra. */
export interface CompetitionLink {
  provider: {code: string; name: string};
  external_id: string;
  /** Lo que se vio en la búsqueda al enlazarla; null si se enlazó por consola. */
  name: string | null;
  country: string | null;
  logo: string | null;
  linked_at: string | null;
  last_synced_at: string | null;
}

/** Estado de la sincronización de una competición. */
export interface SyncState {
  providers: SyncProvider[];
  links: CompetitionLink[];
  sources: SyncSource[];
  runs: SyncRun[];
}

/** Competición encontrada en un proveedor. */
export interface ProviderCompetition {
  external_id: string;
  name: string;
  type: string | null;
  country: string | null;
  logo: string | null;
  /** De la más reciente a la más antigua. */
  seasons: Array<{year: number; start: string | null; end: string | null; current: boolean}>;
  /** Qué datos da de su temporada más reciente. */
  coverage: Record<string, boolean>;
  /** Competición nuestra que ya está enlazada con esta. */
  linked_to: {id: number; name: string} | null;
}
