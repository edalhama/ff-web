import {AngularNodeAppEngine, createNodeRequestHandler, isMainModule} from '@angular/ssr/node';
import {timingSafeEqual} from 'node:crypto';
import {watchFile} from 'node:fs';
import {readFile, stat} from 'node:fs/promises';
import {createServer, IncomingMessage, ServerResponse} from 'node:http';
import {basename, dirname, extname, join, normalize, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

import {SiteSitemap} from './app/shared/models/site';
import {SITE_TAG} from './app/site/site-cache';
import {CACHE_TAGS_HEADER, CACHE_TTL_HEADER} from './app/site/site-response.service';
import {environment} from './environments/environment';
import {CachedPage, PageCache} from './server/page-cache';
import {sitemapXml} from './server/sitemap';

/**
 * Servidor de render de ff-web: genera en Node las páginas públicas y las guarda en caché.
 *
 * En producción es un proceso aparte (`node server/server.mjs`) que escucha solo en local;
 * Apache le pasa lo que no es ni un fichero ni el panel (ver `src/.htaccess` y `DEPLOY.md`).
 * En desarrollo (`ng serve`) lo usa el propio servidor de Angular, sin caché.
 *
 * Variables de entorno (todas opcionales):
 *  - `PORT` (4000) y `HOST` (127.0.0.1): dónde escucha.
 *  - `FF_API_URL`: URL de la API vista desde este servidor; por defecto, la pública.
 *  - `FF_CACHE_TOKEN`: secreto compartido con ff-api (su `PAGE_CACHE_TOKEN`). Sin él no se
 *    puede consultar ni purgar la caché desde fuera, y la API le aplica el límite de peticiones.
 *  - `FF_CACHE=off`: desactiva la caché de páginas.
 *  - `FF_CACHE_MAX_PAGES` (2000) y `FF_CACHE_MAX_MB` (64): topes de la caché.
 *  - `FF_RESTART_FILE`: fichero que, al tocarlo, hace salir al proceso para que quien lo
 *    supervisa lo arranque de nuevo; por defecto `restart.txt` junto a la carpeta `server`.
 */

const serverDir = dirname(fileURLToPath(import.meta.url));
const browserDir = resolve(serverDir, '../browser');

const standalone = isMainModule(import.meta.url);

// La URL pública del sitio es la del build: es la misma que la app escribe en las canónicas
const siteUrl = environment.siteUrl.replace(/\/*$/, '/');
const apiUrl = (process.env['FF_API_URL'] || environment.api.url).replace(/\/*$/, '/');
const cacheToken = process.env['FF_CACHE_TOKEN'] || '';
// En desarrollo, sin caché: cada recarga tiene que enseñar el código que se acaba de guardar
const cacheEnabled = standalone && process.env['FF_CACHE'] !== 'off';

/** Tras caducar, una página se sigue sirviendo este tiempo mientras se rehace (o si rehacerla falla). */
const STALE_WINDOW = 24 * 3600;
/** Vigencia de una redirección, que no declara la suya. */
const REDIRECT_TTL = 3600;
const SITEMAP_TTL = 3600;
const RENDER_TIMEOUT = 20_000;

const engine = new AngularNodeAppEngine({allowedHosts: [new URL(siteUrl).hostname]});

const cache = new PageCache({
  maxEntries: Number(process.env['FF_CACHE_MAX_PAGES']) || 2000,
  maxBytes: (Number(process.env['FF_CACHE_MAX_MB']) || 64) * 1024 * 1024,
});

const startedAt = new Date();
let renders = 0;
let renderErrors = 0;

/** Renders en curso, por ruta: quien pide una página que ya se está generando espera a esa. */
const rendering = new Map<string, Promise<CachedPage | null>>();

// ── Generación ──────────────────────────────────────────────────────────────────────────────

/** Página lista para enviar: la de la caché, o una recién hecha que no se guarda. */
interface Rendered {
  page: CachedPage;
  /** Segundos que le quedan de vigencia; 0 = no debe guardarla nadie. */
  ttl: number;
}

function timeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  return new Promise<T>((resolvePromise, reject) => {
    const timer = setTimeout(() => reject(new Error(`El render ha superado los ${milliseconds} ms`)), milliseconds);

    promise.then(resolvePromise, reject).finally(() => clearTimeout(timer));
  });
}

/**
 * Genera una página con Angular. Siempre se pide con la URL pública y sin parámetros: lo que
 * llegue en el `Host` o en la query no cambia la página ni multiplica las entradas de la caché.
 *
 * @returns null si Angular no tiene ruta para esa URL (no debería: hay una ruta `**`)
 */
async function render(path: string): Promise<Rendered | null> {
  renders++;

  const response = await timeout(engine.handle(new Request(new URL(path, siteUrl))), RENDER_TIMEOUT);

  if (!response) {
    return null;
  }

  const body = new Uint8Array(await timeout(response.arrayBuffer(), RENDER_TIMEOUT));
  const declared = Number(response.headers.get(CACHE_TTL_HEADER));
  const redirect = response.status >= 300 && response.status < 400;

  // Sin vigencia declarada no se guarda; los errores del servidor, nunca
  const ttl = response.status >= 500 ? 0 : Number.isFinite(declared) && declared > 0 ? declared : redirect ? REDIRECT_TTL : 0;
  const now = Date.now();

  const headers: Array<[string, string]> = [];
  for (const name of ['content-type', 'content-language', 'location']) {
    const value = response.headers.get(name);

    if (value) {
      headers.push([name, value]);
    }
  }

  return {
    ttl,
    page: {
      path,
      status: response.status,
      headers,
      body,
      tags: (response.headers.get(CACHE_TAGS_HEADER) ?? '').split(',').filter(Boolean),
      createdAt: now,
      expiresAt: now + ttl * 1000,
      // Un 404 caducado no se estira: si la página ha pasado a existir, que se vea cuanto antes
      staleUntil: now + (ttl + (response.status === 200 ? STALE_WINDOW : 0)) * 1000,
      hits: 0,
    },
  };
}

/** Genera la página y, si procede, la guarda. Un solo render por ruta a la vez. */
function renderAndStore(path: string): Promise<CachedPage | null> {
  let pending = rendering.get(path);

  if (!pending) {
    pending = render(path)
      .then((rendered) => {
        if (!rendered) {
          return null;
        }

        if (cacheEnabled && rendered.ttl > 0) {
          cache.set(rendered.page);
        }

        return rendered.page;
      })
      .finally(() => rendering.delete(path));

    rendering.set(path, pending);
  }

  return pending;
}

// ── Respuestas ──────────────────────────────────────────────────────────────────────────────

function send(res: ServerResponse, method: string | undefined, status: number, headers: Record<string, string>, body: Uint8Array | string): void {
  const payload = typeof body === 'string' ? Buffer.from(body) : body;

  res.writeHead(status, {...headers, 'Content-Length': String(payload.byteLength)});
  res.end(method === 'HEAD' ? undefined : payload);
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  send(res, 'GET', status, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'}, JSON.stringify(data));
}

function sendError(res: ServerResponse, method: string | undefined, status: number, message: string): void {
  send(
    res,
    method,
    status,
    {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...(status === 503 ? {'Retry-After': '30'} : {})},
    `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="robots" content="noindex"><title>${status}</title><p>${message}</p></html>`,
  );
}

/**
 * Envía una página. `state` es lo que ha pasado con la caché (cabecera `X-FF-Cache`, para
 * depurar): HIT, STALE (caducada, rehaciéndose), MISS (recién generada) o BYPASS (no se guarda).
 */
function sendPage(res: ServerResponse, method: string | undefined, page: CachedPage, state: 'HIT' | 'STALE' | 'MISS' | 'BYPASS'): void {
  const remaining = Math.floor((page.expiresAt - Date.now()) / 1000);

  // Navegadores: preguntan siempre (la respuesta sale de esta caché, es rápida). CDN: puede
  // guardarla lo que le quede de vigencia; una caducada, casi nada, que ya viene otra.
  const cacheControl =
    state === 'BYPASS' || page.expiresAt <= page.createdAt
      ? 'no-store'
      : `public, max-age=0, s-maxage=${remaining > 0 ? remaining : 10}`;

  send(
    res,
    method,
    page.status,
    {
      ...Object.fromEntries(page.headers),
      'Cache-Control': cacheControl,
      // Las mismas etiquetas, para purgar también la CDN (Cloudflare lee `Cache-Tag`)
      ...(page.tags.length > 0 && cacheControl !== 'no-store' ? {'Cache-Tag': page.tags.join(',')} : {}),
      'X-FF-Cache': state,
    },
    page.body,
  );
}

async function handlePage(path: string, method: string | undefined, res: ServerResponse): Promise<void> {
  const cached = cacheEnabled ? cache.get(path) : null;

  if (cached?.state === 'fresh') {
    return sendPage(res, method, cached.page, 'HIT');
  }

  if (cached) {
    // Caducada: se sirve ya y se rehace por detrás. Si rehacerla falla, se queda la que hay
    renderAndStore(path).catch((error) => {
      renderErrors++;
      console.error(`[render] ${path}:`, error);
    });

    return sendPage(res, method, cached.page, 'STALE');
  }

  try {
    const page = await renderAndStore(path);

    if (!page) {
      return sendError(res, method, 404, 'Página no encontrada.');
    }

    sendPage(res, method, page, cacheEnabled && page.expiresAt > page.createdAt ? 'MISS' : 'BYPASS');
  } catch (error) {
    renderErrors++;
    console.error(`[render] ${path}:`, error);
    sendError(res, method, 503, 'El servicio no está disponible en este momento.');
  }
}

// ── Sitemap ─────────────────────────────────────────────────────────────────────────────────

async function handleSitemap(method: string | undefined, res: ServerResponse): Promise<void> {
  const path = '/sitemap.xml';
  const cached = cacheEnabled ? cache.get(path) : null;

  if (cached?.state === 'fresh') {
    return sendPage(res, method, cached.page, 'HIT');
  }

  try {
    const response = await fetch(`${apiUrl}site/sitemap`, {
      headers: {Accept: 'application/json', ...(cacheToken ? {'X-FF-Token': cacheToken} : {})},
      signal: AbortSignal.timeout(RENDER_TIMEOUT),
    });

    if (!response.ok) {
      throw new Error(`La API ha respondido ${response.status}`);
    }

    const data = ((await response.json()) as {data?: SiteSitemap}).data ?? {competitions: [], teams: []};
    const now = Date.now();

    const page: CachedPage = {
      path,
      status: 200,
      headers: [['content-type', 'application/xml; charset=utf-8']],
      body: Buffer.from(sitemapXml(data, siteUrl)),
      tags: [SITE_TAG.sitemap],
      createdAt: now,
      expiresAt: now + SITEMAP_TTL * 1000,
      staleUntil: now + (SITEMAP_TTL + STALE_WINDOW) * 1000,
      hits: 0,
    };

    if (cacheEnabled) {
      cache.set(page);
    }

    sendPage(res, method, page, cacheEnabled ? 'MISS' : 'BYPASS');
  } catch (error) {
    console.error('[sitemap]', error);

    // Mejor el de hace un rato que ninguno
    if (cached) {
      return sendPage(res, method, cached.page, 'STALE');
    }

    sendError(res, method, 503, 'El sitemap no está disponible en este momento.');
  }
}

// ── Caché: consulta y purga (solo para ff-api, en local y con el token) ─────────────────────

function authorized(req: IncomingMessage): boolean {
  const given = Buffer.from(String(req.headers['x-ff-token'] ?? ''));
  const expected = Buffer.from(cacheToken);

  return cacheToken !== '' && given.length === expected.length && timingSafeEqual(given, expected);
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of req) {
    size += (chunk as Buffer).length;

    if (size > 1_000_000) {
      throw new Error('Cuerpo demasiado grande');
    }

    chunks.push(chunk as Buffer);
  }

  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');

  return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

async function handleInternal(path: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (path === '/__ff/health' && req.method === 'GET') {
    return sendJson(res, 200, {ok: true, started_at: startedAt.toISOString()});
  }

  // Sin token configurado esto no existe; con él, hay que traerlo
  if (!authorized(req)) {
    return sendJson(res, 404, {error: 'not found'});
  }

  if (path === '/__ff/cache' && req.method === 'GET') {
    return sendJson(res, 200, {
      stats: {
        ...cache.stats(),
        enabled: cacheEnabled,
        started_at: startedAt.toISOString(),
        renders,
        render_errors: renderErrors,
        memory_bytes: process.memoryUsage().rss,
      },
      // El panel no necesita miles de filas; el total está en `stats.entries`
      entries: cache.entries().slice(0, 500),
    });
  }

  if (path === '/__ff/cache/purge' && req.method === 'POST') {
    let body: Record<string, unknown>;

    try {
      body = await readJson(req);
    } catch {
      return sendJson(res, 400, {error: 'invalid body'});
    }

    const purged = body['all'] === true ? cache.purgeAll() : cache.purgeTags(strings(body['tags'])) + cache.purgePaths(strings(body['paths']));

    return sendJson(res, 200, {purged});
  }

  sendJson(res, 404, {error: 'not found'});
}

// ── Ficheros estáticos (solo sin Apache delante: pruebas en local) ──────────────────────────

const MIME: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
};

/** @returns false si no hay tal fichero */
async function serveStatic(path: string, method: string | undefined, res: ServerResponse): Promise<boolean> {
  let relative: string;

  try {
    relative = normalize(decodeURIComponent(path));
  } catch {
    return false;
  }

  const file = join(browserDir, relative);

  // Nada fuera de la carpeta pública, ni el esqueleto de la app pedido por su nombre
  if (!file.startsWith(browserDir + sep) || relative === `${sep}index.csr.html`) {
    return false;
  }

  try {
    if (!(await stat(file)).isFile()) {
      return false;
    }

    // El JS y el CSS de la app llevan un hash en el nombre y no cambian nunca; el resto, que
    // se compruebe (la misma regla que en `.htaccess`)
    const hashed = /^(?:chunk|main|polyfills|styles|scripts)-[A-Za-z0-9_-]{8}\.(?:js|css)$/.test(basename(file));

    send(
      res,
      method,
      200,
      {
        'Content-Type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
        'Cache-Control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache',
      },
      await readFile(file),
    );

    return true;
  } catch {
    return false;
  }
}

// ── Entrada ─────────────────────────────────────────────────────────────────────────────────

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let path: string;

  try {
    path = new URL(req.url ?? '/', 'http://localhost').pathname;
  } catch {
    return sendError(res, req.method, 400, 'Petición incorrecta.');
  }

  if (path.startsWith('/__ff/')) {
    return handleInternal(path, req, res);
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');

    return sendError(res, req.method, 405, 'Método no permitido.');
  }

  if (path === '/sitemap.xml') {
    return handleSitemap(req.method, res);
  }

  if (standalone && extname(path) !== '' && (await serveStatic(path, req.method, res))) {
    return;
  }

  // Una sola URL por página: sin barra final (salvo la portada) ni barras repetidas
  const clean = path.replace(/\/{2,}/g, '/').replace(/(.)\/$/, '$1');
  if (clean !== path) {
    res.writeHead(301, {Location: clean, 'Cache-Control': 'public, max-age=3600'});

    return void res.end();
  }

  // Rutas absurdas no llegan a Angular ni ocupan sitio en la caché
  if (path.length > 300 || !/^[\w\-./~%]*$/.test(path)) {
    return sendError(res, req.method, 404, 'Página no encontrada.');
  }

  return handlePage(path, req.method, res);
}

/** Para `ng serve`, que usa esta función como su manejador de render. */
export const reqHandler = createNodeRequestHandler((req, res) => {
  handle(req, res).catch((error) => {
    console.error('[server]', error);

    if (!res.headersSent) {
      sendError(res, req.method, 500, 'Error interno.');
    }
  });
});

if (standalone) {
  const port = Number(process.env['PORT']) || 4000;
  const host = process.env['HOST'] || '127.0.0.1';

  const server = createServer(reqHandler);

  server.listen(port, host, () => {
    console.log(`[server] ff-web en http://${host}:${port} · sitio ${siteUrl} · API ${apiUrl} · caché ${cacheEnabled ? 'activa' : 'desactivada'}`);

    if (!cacheToken) {
      console.warn('[server] Sin FF_CACHE_TOKEN: la caché no se puede consultar ni purgar desde ff-api.');
    }
  });

  // Reinicio tras un despliegue: quien despliega toca este fichero y el proceso sale; el
  // supervisor lo vuelve a arrancar con el código nuevo y la caché vacía. Código de salida
  // distinto de cero para que lo reinicie también un supervisor que solo lo hace «si falla».
  const restartFile = process.env['FF_RESTART_FILE'] || resolve(serverDir, '../restart.txt');

  watchFile(restartFile, {interval: 2000}, (current, previous) => {
    if (current.mtimeMs > 0 && current.mtimeMs !== previous.mtimeMs) {
      console.log('[server] Despliegue detectado: saliendo para que el supervisor arranque la versión nueva.');

      server.close(() => process.exit(75));
      // Las conexiones que no terminen no retienen el reinicio
      setTimeout(() => process.exit(75), 5000).unref();
    }
  });

  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 5000).unref();
    });
  }
}
