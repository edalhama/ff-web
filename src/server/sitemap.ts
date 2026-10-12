import {SiteSitemap, SiteSlugs} from '../app/shared/models/site';
import {absoluteUrl, competitionPath, CompetitionPage, homePath, SITE_DEFAULT_LANGUAGE, SITE_LANGUAGES, SiteLanguage, teamPath} from '../app/site/site-links';

/**
 * `sitemap.xml`: todas las páginas públicas, cada una con sus equivalentes en los demás
 * idiomas (`xhtml:link hreflang`), a partir de lo que devuelve `/api/site/sitemap`.
 *
 * Solo salen las URLs canónicas: la temporada actual, sin temporada en la URL; las demás, con
 * ella. Las mismas reglas que aplica cada página en su `<link rel="canonical">`.
 */

/** Una página en todos sus idiomas. */
interface SitemapPage {
  paths: Partial<Record<SiteLanguage, string>>;
  lastModified: string | null;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/** Una página por cada idioma en el que la entidad tiene slug. */
function localized(slugs: SiteSlugs, build: (lang: SiteLanguage, slug: string) => string): Partial<Record<SiteLanguage, string>> {
  const paths: Partial<Record<SiteLanguage, string>> = {};

  for (const lang of SITE_LANGUAGES) {
    const slug = slugs[lang];

    if (slug) {
      paths[lang] = build(lang, slug);
    }
  }

  return paths;
}

export function sitemapPages(data: SiteSitemap): SitemapPage[] {
  const pages: SitemapPage[] = [{paths: localized({es: '-', en: '-'}, (lang) => homePath(lang)), lastModified: null}];
  const competitionPages: readonly CompetitionPage[] = ['overview', 'standings', 'fixtures', 'teams'];

  for (const competition of data.competitions) {
    for (const season of competition.seasons) {
      const slug = season.is_current ? null : season.slug;

      for (const page of competitionPages) {
        pages.push({
          paths: localized(competition.slugs, (lang, competitionSlug) => competitionPath(lang, competitionSlug, {page, season: slug})),
          lastModified: season.updated_at ?? competition.updated_at,
        });
      }

      for (const round of season.rounds) {
        pages.push({
          paths: localized(competition.slugs, (lang, competitionSlug) => competitionPath(lang, competitionSlug, {page: 'fixtures', season: slug, round})),
          lastModified: season.updated_at,
        });
      }
    }

    // Sin temporadas, al menos la página de la competición
    if (competition.seasons.length === 0) {
      pages.push({paths: localized(competition.slugs, (lang, competitionSlug) => competitionPath(lang, competitionSlug)), lastModified: competition.updated_at});
    }
  }

  for (const team of data.teams) {
    pages.push({paths: localized(team.slugs, (lang, slug) => teamPath(lang, slug)), lastModified: team.updated_at});
  }

  return pages;
}

export function sitemapXml(data: SiteSitemap, siteUrl: string): string {
  const urls: string[] = [];

  for (const page of sitemapPages(data)) {
    const languages = SITE_LANGUAGES.filter((lang) => page.paths[lang]);

    const alternates =
      languages.length > 1
        ? [
            ...languages.map((lang) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${escapeXml(absoluteUrl(siteUrl, page.paths[lang]!))}"/>`),
            `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(absoluteUrl(siteUrl, page.paths[SITE_DEFAULT_LANGUAGE] ?? page.paths[languages[0]]!))}"/>`,
          ]
        : [];

    for (const lang of languages) {
      urls.push(
        [
          '  <url>',
          `    <loc>${escapeXml(absoluteUrl(siteUrl, page.paths[lang]!))}</loc>`,
          ...(page.lastModified ? [`    <lastmod>${escapeXml(page.lastModified.slice(0, 10))}</lastmod>`] : []),
          ...alternates,
          '  </url>',
        ].join('\n'),
      );
    }
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}
