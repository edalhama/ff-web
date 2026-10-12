import {SiteSitemap} from '../app/shared/models/site';
import {sitemapPages, sitemapXml} from './sitemap';

describe('sitemap', () => {
  const data: SiteSitemap = {
    competitions: [
      {
        slugs: {es: 'laliga', en: 'spanish-league'},
        updated_at: '2026-10-01T10:00:00.000000Z',
        seasons: [
          {slug: '2026-27', is_current: true, updated_at: '2026-10-09T12:00:00.000000Z', rounds: [1, 2]},
          {slug: '2025-26', is_current: false, updated_at: null, rounds: []},
        ],
      },
    ],
    teams: [{slugs: {es: 'sevilla', en: null}, updated_at: '2026-09-01T08:00:00.000000Z'}],
  };

  it('la temporada actual va sin temporada en la URL; las demás, con ella', () => {
    const paths = sitemapPages(data).map((page) => page.paths.es);

    expect(paths).toContain('/laliga/clasificacion');
    expect(paths).toContain('/laliga/calendario/jornada-2');
    expect(paths).toContain('/laliga/2025-26/clasificacion');
    expect(paths).not.toContain('/laliga/2026-27/clasificacion');
  });

  it('cada página lleva sus equivalentes en los otros idiomas', () => {
    const xml = sitemapXml(data, 'https://fantasyfutbol.es/');

    expect(xml).toContain('<loc>https://fantasyfutbol.es/en/spanish-league/standings</loc>');
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="es" href="https://fantasyfutbol.es/laliga/clasificacion"/>');
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="x-default" href="https://fantasyfutbol.es/"/>');
    expect(xml).toContain('<lastmod>2026-10-09</lastmod>');
  });

  it('una entidad sin slug en un idioma no tiene página en él ni alternativas', () => {
    const xml = sitemapXml(data, 'https://fantasyfutbol.es');

    expect(xml).toContain('<loc>https://fantasyfutbol.es/equipos/sevilla</loc>');
    expect(xml).not.toContain('/en/teams/');
    expect(xml).not.toContain('hreflang="es" href="https://fantasyfutbol.es/equipos/sevilla"');
  });

  it('escapa los caracteres especiales', () => {
    const xml = sitemapXml({competitions: [], teams: [{slugs: {es: 'a&b', en: null}, updated_at: null}]}, 'https://fantasyfutbol.es');

    expect(xml).toContain('/equipos/a&amp;b</loc>');
  });
});
