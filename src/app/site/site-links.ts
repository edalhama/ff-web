/**
 * URLs de la parte pública. **Único sitio donde se definen**: de aquí salen las rutas de
 * Angular (`site-routes.ts`), todos los enlaces, las etiquetas `hreflang` y el sitemap.
 *
 * Cada idioma tiene sus propias palabras en la URL. El idioma principal (español) va en la
 * raíz; los demás, bajo su código:
 *
 *   /laliga/clasificacion            ·  /en/laliga/standings
 *   /laliga/calendario/jornada-12
 *   /laliga/2024-25/equipos          (una temporada concreta)
 *   /equipos/sevilla                 ·  /en/teams/sevilla
 *
 * La competición no lleva ninguna palabra delante: su slug es el primer tramo de la URL. Por
 * eso comparte sitio con las demás secciones (`equipos`…): ff-api no deja que una competición
 * use como slug una de esas palabras (`Competition::RESERVED_SLUGS`). **Al añadir una sección
 * de primer nivel aquí, hay que reservar allí su palabra en todos los idiomas.**
 *
 * Sin temporada en la URL se ve la actual. Cambiar una palabra de aquí cambia URLs ya
 * publicadas: una vez indexadas por los buscadores, hay que dejar redirecciones.
 *
 * Fichero sin dependencias de Angular: lo usa también el servidor de render (`server.ts`).
 */

/** Idiomas del sitio; el primero es el principal. Los mismos que `languages` en `edas.config.ts`. */
export const SITE_LANGUAGES = ['es', 'en'] as const;

export type SiteLanguage = (typeof SITE_LANGUAGES)[number];

export const SITE_DEFAULT_LANGUAGE: SiteLanguage = SITE_LANGUAGES[0];

/** Palabras de las URLs en un idioma. */
export interface SiteSegments {
  /** Prefijo del idioma; vacío en el principal. */
  prefix: string;
  standings: string;
  fixtures: string;
  /** `jornada` → `jornada-12`. */
  matchday: string;
  teams: string;
}

export const SITE_SEGMENTS: Record<SiteLanguage, SiteSegments> = {
  es: {
    prefix: '',
    standings: 'clasificacion',
    fixtures: 'calendario',
    matchday: 'jornada',
    teams: 'equipos',
  },
  en: {
    prefix: 'en',
    standings: 'standings',
    fixtures: 'fixtures',
    matchday: 'matchday',
    teams: 'teams',
  },
};

/** Páginas de una competición. */
export type CompetitionPage = 'overview' | 'standings' | 'fixtures' | 'teams';

export function isSiteLanguage(value: unknown): value is SiteLanguage {
  return SITE_LANGUAGES.includes(value as SiteLanguage);
}

/** Une segmentos en una ruta absoluta; los vacíos se saltan (`['', 'equipos']` → `/equipos`). */
function path(...segments: Array<string | null | undefined>): string {
  return '/' + segments.filter((segment) => !!segment).join('/');
}

export function homePath(lang: SiteLanguage): string {
  return path(SITE_SEGMENTS[lang].prefix);
}

/**
 * Página de una competición. `season` es el slug de la temporada (`2024-25`); sin él, la
 * actual. `round` solo cuenta en el calendario.
 */
export function competitionPath(
  lang: SiteLanguage,
  slug: string,
  options: {page?: CompetitionPage; season?: string | null; round?: number | null} = {},
): string {
  const segments = SITE_SEGMENTS[lang];
  const page = options.page ?? 'overview';

  return path(
    segments.prefix,
    slug,
    options.season,
    page === 'overview' ? null : segments[page],
    page === 'fixtures' && options.round != null ? `${segments.matchday}-${options.round}` : null,
  );
}

export function teamPath(lang: SiteLanguage, slug: string): string {
  const segments = SITE_SEGMENTS[lang];

  return path(segments.prefix, segments.teams, slug);
}

/**
 * La misma URL con otro slug de competición (`/laliga-vieja/clasificacion?x=1` →
 * `/laliga/clasificacion?x=1`). Se cambia el tramo que ocupa el slug, no el texto: un slug
 * puede estar contenido en otro tramo.
 */
export function withCompetitionSlug(lang: SiteLanguage, url: string, slug: string): string {
  return withSegment(url, SITE_SEGMENTS[lang].prefix ? 1 : 0, slug);
}

/** Lo mismo para la ficha de un equipo (`/equipos/{slug}`). */
export function withTeamSlug(lang: SiteLanguage, url: string, slug: string): string {
  return withSegment(url, SITE_SEGMENTS[lang].prefix ? 2 : 1, slug);
}

function withSegment(url: string, index: number, value: string): string {
  const cut = url.search(/[?#]/);
  const pathname = cut === -1 ? url : url.slice(0, cut);
  const segments = pathname.split('/').filter(Boolean);

  segments[index] = value;

  return '/' + segments.join('/') + (cut === -1 ? '' : url.slice(cut));
}

/** `jornada-12` → 12; null si el segmento no es una jornada en ese idioma. */
export function roundFromSegment(lang: SiteLanguage, segment: string | null | undefined): number | null {
  const match = new RegExp(`^${SITE_SEGMENTS[lang].matchday}-(\\d{1,3})$`).exec(segment ?? '');

  return match ? Number(match[1]) : null;
}

/** Idioma de una ruta del sitio, por su prefijo: `/en/teams/x` → `en`; `/equipos/x` → `es`. */
export function languageOfPath(pathname: string): SiteLanguage {
  const first = pathname.split('/').filter(Boolean)[0];

  return SITE_LANGUAGES.find((lang) => SITE_SEGMENTS[lang].prefix !== '' && SITE_SEGMENTS[lang].prefix === first) ?? SITE_DEFAULT_LANGUAGE;
}

/** Ruta del sitio → URL absoluta (`siteUrl` con o sin barra final). */
export function absoluteUrl(siteUrl: string, pathname: string): string {
  const base = siteUrl.replace(/\/+$/, '');

  return pathname === '/' ? `${base}/` : `${base}${pathname}`;
}
