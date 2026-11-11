export type SyncDataType = 'calendar' | 'standings' | 'squads' | 'statuses' | 'lineups' | 'events' | 'stats' | 'scores' | 'ratings' | 'market' | 'automanager' | 'profiles' | 'history';
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
  last_attempt_at: string | null;
  /** Cadencia propia en minutos; null = la de su tipo de dato (`default_interval`). */
  interval_minutes: number | null;
  default_interval: number | null;
  /** Cadencia corta mientras la competición está en directo; null = no cambia. */
  live_interval: number | null;
  next_run_at: string | null;
}

/** Aspecto para el que se puede preferir un proveedor. */
export type SourceAspect = 'player_photo' | 'team_crest' | 'player_name';

/** Qué proveedor se muestra (o escribe) para un aspecto en la competición. */
export interface SourcePreference {
  aspect: SourceAspect;
  /** Se resuelve al leer (imagen); si no, decide qué sincronización escribe la columna. */
  read_time: boolean;
  /** Elegido; null = el orden por defecto. */
  provider: string | null;
  /** Códigos de proveedor en el orden por defecto. */
  default: string[];
  options: Array<{code: string; name: string}>;
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
  /** Hay un partido en juego, a punto de empezar o recién acabado. */
  live: boolean;
  preferences: SourcePreference[];
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
