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

/** Estado de la sincronización de una competición. */
export interface SyncState {
  sources: SyncSource[];
  runs: SyncRun[];
}
