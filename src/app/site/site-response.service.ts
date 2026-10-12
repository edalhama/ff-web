import {inject, Injectable, RESPONSE_INIT} from '@angular/core';

/** Cabeceras internas con las que la app le habla al servidor de render (`src/server.ts`). */
export const CACHE_TTL_HEADER = 'x-ff-cache-ttl';
export const CACHE_TAGS_HEADER = 'x-ff-cache-tags';

/**
 * La respuesta HTTP de la página que se está generando en el servidor: su código de estado y
 * cuánto y con qué etiquetas se guarda en caché.
 *
 * En el navegador no hay respuesta que tocar: todos los métodos son inocuos, así que las
 * pantallas lo llaman sin preguntar dónde están.
 */
@Injectable({providedIn: 'root'})
export class SiteResponseService {
  private readonly init = inject(RESPONSE_INIT, {optional: true});

  /** 404, 503… Lo que vea un buscador. */
  status(code: number): void {
    if (this.init) {
      this.init.status = code;
    }
  }

  /**
   * Vigencia en segundos y etiquetas de dependencia. Varias piezas de una misma página pueden
   * llamarlo: se queda la vigencia más corta y se suman las etiquetas.
   */
  cache(ttl: number, tags: readonly string[] = []): void {
    const headers = this.headers();
    if (!headers) {
      return;
    }

    const current = Number(headers.get(CACHE_TTL_HEADER));
    headers.set(CACHE_TTL_HEADER, String(Number.isFinite(current) && current > 0 ? Math.min(current, ttl) : ttl));

    const merged = new Set([...(headers.get(CACHE_TAGS_HEADER) ?? '').split(',').filter(Boolean), ...tags]);
    if (merged.size > 0) {
      headers.set(CACHE_TAGS_HEADER, [...merged].join(','));
    }
  }

  /** La página no debe guardarse (un error temporal). */
  noCache(): void {
    this.headers()?.set(CACHE_TTL_HEADER, '0');
  }

  private headers(): Headers | null {
    if (!this.init) {
      return null;
    }

    if (!(this.init.headers instanceof Headers)) {
      this.init.headers = new Headers(this.init.headers);
    }

    return this.init.headers;
  }
}
