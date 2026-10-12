import {CachedPage, PageCache} from './page-cache';

describe('PageCache', () => {
  const now = 1_000_000;

  function page(path: string, options: Partial<CachedPage> & {size?: number} = {}): Omit<CachedPage, 'hits'> {
    return {
      path,
      status: 200,
      headers: [],
      body: new Uint8Array(options.size ?? 100),
      tags: [],
      createdAt: now,
      expiresAt: now + 60_000,
      staleUntil: now + 600_000,
      ...options,
    };
  }

  function cache(maxEntries = 10, maxBytes = 10_000): PageCache {
    return new PageCache({maxEntries, maxBytes});
  }

  it('sirve una página vigente y cuenta el acierto', () => {
    const pages = cache();
    pages.set(page('/a'));

    expect(pages.get('/a', now + 1_000)?.state).toBe('fresh');
    expect(pages.stats().hits).toBe(1);
    expect(pages.entries(now)[0].hits).toBe(1);
  });

  it('cuenta como fallo lo que no está', () => {
    const pages = cache();

    expect(pages.get('/nada', now)).toBeNull();
    expect(pages.stats().misses).toBe(1);
  });

  it('sirve caducada una página dentro de su margen, y la olvida pasado', () => {
    const pages = cache();
    pages.set(page('/a'));

    expect(pages.get('/a', now + 120_000)?.state).toBe('stale');
    expect(pages.stats().stale).toBe(1);

    expect(pages.get('/a', now + 700_000)).toBeNull();
    expect(pages.stats().entries).toBe(0);
    expect(pages.stats().bytes).toBe(0);
  });

  it('al llenarse saca la que lleva más sin pedirse', () => {
    const pages = cache(2);
    pages.set(page('/a'));
    pages.set(page('/b'));
    pages.get('/a', now);
    pages.set(page('/c'));

    expect(pages.entries(now).map((entry) => entry.path)).toEqual(['/c', '/a']);
    expect(pages.stats().evictions).toBe(1);
  });

  it('respeta el tope de memoria', () => {
    const pages = cache(10, 250);
    pages.set(page('/a'));
    pages.set(page('/b'));
    pages.set(page('/c'));

    expect(pages.stats().entries).toBe(2);
    expect(pages.stats().bytes).toBe(200);
  });

  it('no guarda una página que no cabe ni sola', () => {
    const pages = cache(10, 50);
    pages.set(page('/a'));

    expect(pages.stats().entries).toBe(0);
  });

  it('sustituir una página no duplica su tamaño', () => {
    const pages = cache();
    pages.set(page('/a', {size: 100}));
    pages.set(page('/a', {size: 300}));

    expect(pages.stats().entries).toBe(1);
    expect(pages.stats().bytes).toBe(300);
  });

  it('purga por etiqueta solo las páginas que la llevan', () => {
    const pages = cache();
    pages.set(page('/liga', {tags: ['competition-1']}));
    pages.set(page('/equipo', {tags: ['team-7', 'competition-1']}));
    pages.set(page('/copa', {tags: ['competition-2']}));

    expect(pages.purgeTags(['competition-1'])).toBe(2);
    expect(pages.entries(now).map((entry) => entry.path)).toEqual(['/copa']);
  });

  it('purga por ruta y entera', () => {
    const pages = cache();
    pages.set(page('/a'));
    pages.set(page('/b'));
    pages.set(page('/c'));

    expect(pages.purgePaths(['/a', '/no-esta'])).toBe(1);
    expect(pages.purgeAll()).toBe(2);
    expect(pages.stats().entries).toBe(0);
    expect(pages.stats().bytes).toBe(0);
  });
});
