import {SiteMatch} from '../shared/models/site';

/**
 * Cuánto vale en caché cada página pública y de qué datos depende.
 *
 * Cada página lo declara al generarse en el servidor (`SiteResponseService.cache()`); el
 * servidor de render lo usa para guardarla y se lo traslada a la CDN (`Cache-Control`,
 * `Cache-Tag`). Ver `src/server.ts`.
 */

/** Segundos que una página se sirve sin volver a generarla. */
export const SITE_TTL = {
  /** Hay un partido en juego o a punto de empezar. */
  live: 60,
  /** Datos de la temporada en curso: cambian con cada sincronización, que además los purga. */
  current: 600,
  /** Temporadas cerradas y fichas: no cambian solas. */
  archive: 86_400,
  /** Páginas que no existen: poco, por si pasan a existir. */
  notFound: 60,
} as const;

/**
 * Etiquetas de dependencia. Purgar una etiqueta tira todas las páginas que la llevan.
 * Son un contrato con ff-api: las mismas cadenas están en `App\PageCache\PageTag`.
 */
export const SITE_TAG = {
  home: 'home',
  sitemap: 'sitemap',
  competition: (id: number) => `competition-${id}`,
  team: (id: number) => `team-${id}`,
} as const;

/**
 * Vigencia de una página que pinta estos partidos: corta si hay alguno en juego, y nunca más
 * allá del siguiente saque inicial (a partir de ahí la página ya está anticuada).
 */
export function ttlForMatches(matches: readonly SiteMatch[], fallback: number, now: number = Date.now()): number {
  let ttl = fallback;

  for (const match of matches) {
    if (match.status === 'playing') {
      return SITE_TTL.live;
    }

    if (match.status === 'scheduled' && match.kickoff_at) {
      const untilKickoff = Math.floor((new Date(match.kickoff_at).getTime() - now) / 1000);

      // Empezó hace poco y aún no ha llegado el cambio de estado: se trata como en juego
      if (untilKickoff <= 0 && untilKickoff > -3 * 3600) {
        return SITE_TTL.live;
      }

      if (untilKickoff > 0) {
        ttl = Math.min(ttl, Math.max(untilKickoff, SITE_TTL.live));
      }
    }
  }

  return ttl;
}
