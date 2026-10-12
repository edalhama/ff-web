/** Caché de las páginas públicas, tal como la enseña ff-api (`/admin/page-cache`). */

/** Contadores del servidor de render desde que arrancó (cada despliegue lo reinicia). */
export interface PageCacheStats {
  entries: number;
  bytes: number;
  max_entries: number;
  max_bytes: number;
  /** Páginas servidas desde la caché, vigentes. */
  hits: number;
  /** Servidas caducadas mientras se rehacían. */
  stale: number;
  /** No estaban: hubo que generarlas. */
  misses: number;
  evictions: number;
  enabled: boolean;
  started_at: string;
  renders: number;
  render_errors: number;
  memory_bytes: number;
}

/** Una página guardada. */
export interface PageCacheEntry {
  /** `/laliga`. */
  path: string;
  /** Código HTTP con el que se sirve (un 404 o una redirección también se guardan). */
  status: number;
  bytes: number;
  /** De qué datos depende: `competition-1`, `team-7`, `home`… */
  tags: string[];
  created_at: string;
  expires_at: string;
  /** `stale`: caducada; se sirve mientras se genera la nueva. */
  state: 'fresh' | 'stale';
  hits: number;
}

/** Resultado de una purga en una capa; null si esa capa no está configurada. */
export type PurgeLayerResult = {ok: boolean; purged?: number; error?: string} | null;

/** Una purga, manual o automática. */
export interface PageCachePurge {
  at: string;
  /** `sync` (tras sincronizar), `edit` (tras editar en el panel) o `manual`. */
  reason: 'sync' | 'edit' | 'manual' | string;
  user: string | null;
  all: boolean;
  tags: string[];
  paths: string[];
  render: PurgeLayerResult;
  cloudflare: PurgeLayerResult;
}

export interface PageCacheState {
  /** URL pública del sitio, para enlazar las páginas. */
  site_url: string;
  render: {
    configured: boolean;
    reachable: boolean;
    error: string | null;
    stats: PageCacheStats | null;
    entries: PageCacheEntry[];
  };
  cloudflare: {configured: boolean};
  log: PageCachePurge[];
}

/** Qué purgar. */
export type PageCachePurgeRequest =
  | {scope: 'all'}
  | {scope: 'path'; path: string}
  | {scope: 'competition'; id: number}
  | {scope: 'team'; id: number};
