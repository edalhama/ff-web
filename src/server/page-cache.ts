/**
 * Caché de páginas del servidor de render: HTML ya generado, en la memoria del proceso.
 *
 * - Cada página se guarda con su **vigencia** y sus **etiquetas** (de qué datos depende); las
 *   declara la propia página al generarse.
 * - Pasada la vigencia, la página sigue sirviéndose («caducada») mientras se genera otra en
 *   segundo plano: nadie espera a un render salvo el primer visitante de cada página.
 * - Se vacía sola al reiniciar el proceso, que es justo lo que hace falta en un despliegue (el
 *   HTML guardado apuntaría a ficheros JS y CSS que ya no existen).
 * - Tiene tope de páginas y de memoria; al llegar a él salen las que llevan más sin pedirse.
 *
 * Sin dependencias de Angular ni de Node: solo lógica, para poder probarla.
 */

export interface CachedPage {
  /** Ruta de la página: `/laliga`. Es la clave. */
  path: string;
  status: number;
  /** Cabeceras de la respuesta que hay que repetir (tipo de contenido, `Location`…). */
  headers: Array<[string, string]>;
  body: Uint8Array;
  tags: string[];
  /** Milisegundos (epoch). */
  createdAt: number;
  /** Hasta cuándo es vigente. */
  expiresAt: number;
  /** Hasta cuándo se puede servir caducada mientras se rehace. */
  staleUntil: number;
  hits: number;
}

export type CacheLookup = {page: CachedPage; state: 'fresh' | 'stale'} | null;

export interface PageCacheOptions {
  maxEntries: number;
  maxBytes: number;
}

export interface PageCacheStats {
  entries: number;
  bytes: number;
  max_entries: number;
  max_bytes: number;
  /** Servidas desde la caché, vigentes. */
  hits: number;
  /** Servidas caducadas mientras se rehacían. */
  stale: number;
  /** No estaban: hubo que generarlas. */
  misses: number;
  /** Sacadas por falta de sitio. */
  evictions: number;
}

/** Lo que el panel enseña de cada página guardada. */
export interface PageCacheEntry {
  path: string;
  status: number;
  bytes: number;
  tags: string[];
  created_at: string;
  expires_at: string;
  state: 'fresh' | 'stale';
  hits: number;
}

export class PageCache {
  // Un Map recuerda el orden de inserción: reinsertando cada página al usarla, la primera es
  // siempre la que lleva más tiempo sin pedirse.
  private readonly pages = new Map<string, CachedPage>();
  private bytes = 0;
  private readonly counters = {hits: 0, stale: 0, misses: 0, evictions: 0};

  constructor(private readonly options: PageCacheOptions) {}

  /** Busca una página y cuenta el resultado. Una caducada sin margen ya no existe. */
  get(path: string, now: number = Date.now()): CacheLookup {
    const page = this.pages.get(path);

    if (!page || now > page.staleUntil) {
      if (page) {
        this.remove(path);
      }
      this.counters.misses++;

      return null;
    }

    // La recién usada pasa al final de la cola de salida
    this.pages.delete(path);
    this.pages.set(path, page);
    page.hits++;

    const state = now <= page.expiresAt ? 'fresh' : 'stale';
    this.counters[state === 'fresh' ? 'hits' : 'stale']++;

    return {page, state};
  }

  /** Guarda (o sustituye) una página. Una que por sí sola no cabe no se guarda. */
  set(page: Omit<CachedPage, 'hits'>): void {
    this.remove(page.path);

    if (page.body.byteLength > this.options.maxBytes) {
      return;
    }

    this.pages.set(page.path, {...page, hits: 0});
    this.bytes += page.body.byteLength;

    while (this.pages.size > this.options.maxEntries || this.bytes > this.options.maxBytes) {
      const oldest = this.pages.keys().next().value as string;
      this.remove(oldest);
      this.counters.evictions++;
    }
  }

  /** @returns Páginas eliminadas */
  purgeAll(): number {
    const purged = this.pages.size;

    this.pages.clear();
    this.bytes = 0;

    return purged;
  }

  /** Elimina las páginas que lleven alguna de estas etiquetas. */
  purgeTags(tags: readonly string[]): number {
    const wanted = new Set(tags);
    let purged = 0;

    for (const page of [...this.pages.values()]) {
      if (page.tags.some((tag) => wanted.has(tag))) {
        this.remove(page.path);
        purged++;
      }
    }

    return purged;
  }

  purgePaths(paths: readonly string[]): number {
    let purged = 0;

    for (const path of paths) {
      purged += this.remove(path) ? 1 : 0;
    }

    return purged;
  }

  stats(): PageCacheStats {
    return {
      entries: this.pages.size,
      bytes: this.bytes,
      max_entries: this.options.maxEntries,
      max_bytes: this.options.maxBytes,
      ...this.counters,
    };
  }

  /** Páginas guardadas, de la más usada recientemente a la menos. */
  entries(now: number = Date.now()): PageCacheEntry[] {
    return [...this.pages.values()].reverse().map((page) => ({
      path: page.path,
      status: page.status,
      bytes: page.body.byteLength,
      tags: page.tags,
      created_at: new Date(page.createdAt).toISOString(),
      expires_at: new Date(page.expiresAt).toISOString(),
      state: now <= page.expiresAt ? 'fresh' : 'stale',
      hits: page.hits,
    }));
  }

  private remove(path: string): boolean {
    const page = this.pages.get(path);

    if (!page) {
      return false;
    }

    this.pages.delete(path);
    this.bytes -= page.body.byteLength;

    return true;
  }
}
