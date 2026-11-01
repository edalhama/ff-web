import {SyncDataType, SyncRun, SyncStatus} from './sync';

/** Gestión de tareas e incidencias, tal como lo enseña ff-api (`/admin/tasks`). */

/** Estado de una tarea: el de su última ejecución, o si no está activa o nunca ha corrido. */
export type TaskStatus = SyncStatus | 'inactive' | 'pending';

/** Una fuente de datos de una competición, vista como tarea programada. */
export interface Task {
  id: number;
  competition: {id: number; name: string; active: boolean};
  provider: {code: string; name: string; active: boolean};
  data_type: SyncDataType;
  /** Fuente y proveedor activos. */
  active: boolean;
  /** La competición está en directo: la cadencia es la corta. */
  live: boolean;
  status: TaskStatus;
  interval_minutes: number | null;
  default_interval: number | null;
  live_interval: number | null;
  /** Cadencia que aplica ahora, en minutos; null si no está activa. */
  interval: number | null;
  last_run_at: string | null;
  last_attempt_at: string | null;
  next_run_at: string | null;
  last_run: {id: number; status: SyncStatus; message: string | null; finished_at: string | null; triggered_by: 'schedule' | 'manual'} | null;
  /** Incidencia abierta de esta tarea, si la hay. */
  incident_id: number | null;
}

export type IncidentKind = 'sync_failed' | 'sync_errors' | 'scheduler_stalled' | 'page_cache';
export type IncidentSeverity = 'warning' | 'error';
export type IncidentStatus = 'open' | 'resolved';

/** Algo que ha fallado y alguien debe mirar. */
export interface Incident {
  id: number;
  kind: IncidentKind;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  message: string | null;
  /** Primeros errores de la ejecución, si viene de una sincronización. */
  errors: string[];
  competition: {id: number; name: string} | null;
  sync_run_id: number | null;
  /** Veces que se ha repetido mientras estaba abierta. */
  occurrences: number;
  first_seen_at: string;
  last_seen_at: string;
  /** Cuándo se avisó por email; null si no se pudo. */
  notified_at: string | null;
  resolved_at: string | null;
  /** Quien la cerró a mano; null si se resolvió sola. */
  resolved_by: {id: number; name: string} | null;
}

export interface TasksState {
  scheduler: {
    /** Último latido de `sync:tick`; null si nunca ha corrido. */
    last_tick_at: string | null;
    /** Lleva más de `gap_minutes` sin latir. */
    stalled: boolean;
    gap_minutes: number;
    /** A quién se avisa por email de las incidencias. */
    recipients: string[];
  };
  summary: {
    tasks: number;
    active: number;
    failing: number;
    open_incidents: number;
    runs_24h: {success: number; partial: number; failed: number};
  };
  tasks: Task[];
  /** Abiertas, la más reciente primero. */
  incidents: Incident[];
  /** Últimas resueltas. */
  resolved: Incident[];
  /** Últimas ejecuciones de todo el sistema. */
  runs: Array<SyncRun & {competition: {id: number; name: string} | null}>;
}
