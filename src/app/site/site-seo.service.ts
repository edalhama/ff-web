import {DOCUMENT} from '@angular/common';
import {inject, Injectable, signal} from '@angular/core';
import {Meta} from '@angular/platform-browser';
import {TranslateService} from '@ngx-translate/core';
import {injectEdasConfig} from '@edas/ng';
import {PageTitleService} from '@edas/ng/navigation/page-title/page-title.service';
import {LocaleService} from '@edas/ng/shared/services/locale.service';
import {environment} from '../../environments/environment';
import {absoluteUrl, homePath, SITE_DEFAULT_LANGUAGE, SITE_LANGUAGES, SiteLanguage} from './site-links';

/** Ruta de una misma página en cada idioma; null donde no existe. */
export type SiteAlternates = Record<SiteLanguage, string | null>;

/** Metadatos de una página pública. Los textos llegan ya en el idioma de la página. */
export interface SitePageMeta {
  /** Clave i18n del título y sus parámetros (`site.title.standings`, `{competition, season}`). */
  title: string;
  titleParams?: Record<string, unknown>;
  description: string;
  /** Esta página en cada idioma: de aquí salen `hreflang` y el selector de idioma. */
  alternates: SiteAlternates;
  /**
   * Ruta canónica en cada idioma, si no es la propia. La temporada actual tiene dos URLs
   * (con y sin temporada): la buena es la que no la lleva.
   */
  canonical?: SiteAlternates;
  /** `false` para páginas que no deben indexarse (errores, páginas sin contenido). */
  index?: boolean;
  /** Camino hasta la página, sin la portada (se añade sola). */
  breadcrumbs?: Array<{name: string; path: string}>;
  /** Nodos de schema.org propios de la página (`SportsTeam`, `SportsEvent`…). */
  schema?: Array<Record<string, unknown>>;
}

const IMAGE = 'assets/images/brand/share.png';
const OG_LOCALES: Record<SiteLanguage, string> = {es: 'es_ES', en: 'en_US'};
const STRUCTURED_DATA_ID = 'site-structured-data';

const META_SELECTORS = [
  'name="description"', 'name="robots"',
  'property="og:type"', 'property="og:site_name"', 'property="og:title"', 'property="og:description"',
  'property="og:url"', 'property="og:image"', 'property="og:locale"', 'property="og:locale:alternate"',
  'name="twitter:card"', 'name="twitter:title"', 'name="twitter:description"', 'name="twitter:image"',
];

/**
 * Metadatos de las páginas públicas, las que tienen datos: título, descripción, URL canónica,
 * la misma página en otros idiomas (`hreflang`), tarjetas sociales y datos estructurados de
 * schema.org (solo hechos que están en la página).
 *
 * Se aplica desde cada pantalla, también al generarla en el servidor: el HTML sale ya con
 * todo, que es lo que leen los buscadores. Al salir de la pantalla hay que llamar a `clear()`:
 * son etiquetas globales del `<head>`.
 *
 * (La versión de edas-ng, `EdasSeoService`, es para páginas de texto fijo: una clave i18n por
 * dato y una sola URL.)
 */
@Injectable({providedIn: 'root'})
export class SiteSeoService {
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly translate = inject(TranslateService);
  private readonly locale = inject(LocaleService);
  private readonly pageTitle = inject(PageTitleService);
  private readonly appName = injectEdasConfig().appName;

  private readonly _alternates = signal<SiteAlternates | null>(null);
  /** La página actual en cada idioma, para el selector de idioma; null fuera de una página con datos. */
  public readonly alternates = this._alternates.asReadonly();

  apply(page: SitePageMeta): void {
    const lang = this.locale.language() as SiteLanguage;
    const title = `${this.translate.instant(page.title, page.titleParams)} | ${this.appName}`;
    const canonical = this.url((page.canonical ?? page.alternates)[lang] ?? homePath(lang));
    const image = this.url('/' + IMAGE);
    const index = page.index ?? true;

    this.pageTitle.apply(page.title, page.titleParams);
    this.document.documentElement.lang = lang;
    this._alternates.set(page.alternates);

    this.clearMeta();

    this.meta.updateTag({name: 'description', content: page.description});
    this.meta.updateTag({name: 'robots', content: index ? 'index, follow' : 'noindex, follow'});

    // Open Graph (Facebook, LinkedIn, WhatsApp…)
    this.meta.updateTag({property: 'og:type', content: 'website'});
    this.meta.updateTag({property: 'og:site_name', content: this.appName});
    this.meta.updateTag({property: 'og:title', content: title});
    this.meta.updateTag({property: 'og:description', content: page.description});
    this.meta.updateTag({property: 'og:url', content: canonical});
    this.meta.updateTag({property: 'og:image', content: image});
    this.meta.updateTag({property: 'og:locale', content: OG_LOCALES[lang]});

    // Twitter/X: usa sus propias etiquetas, no lee las de Open Graph
    this.meta.updateTag({name: 'twitter:card', content: 'summary_large_image'});
    this.meta.updateTag({name: 'twitter:title', content: title});
    this.meta.updateTag({name: 'twitter:description', content: page.description});
    this.meta.updateTag({name: 'twitter:image', content: image});

    if (index) {
      this.link('canonical', canonical);
      this.hreflang(page.canonical ?? page.alternates, lang);
      this.structuredData(page, lang, canonical, image);
    }
  }

  clear(): void {
    this._alternates.set(null);
    this.clearMeta();
  }

  private clearMeta(): void {
    for (const selector of META_SELECTORS) {
      // `og:locale:alternate` se repite: hay que quitarlas todas
      while (this.meta.getTag(selector)) {
        this.meta.removeTag(selector);
      }
    }

    this.document.head.querySelectorAll('link[rel="canonical"], link[rel="alternate"][hreflang]').forEach((link) => link.remove());
    this.document.getElementById(STRUCTURED_DATA_ID)?.remove();
  }

  private url(path: string): string {
    return absoluteUrl(environment.siteUrl, path);
  }

  private link(rel: string, href: string, hreflang?: string): void {
    const link = this.document.createElement('link');
    link.setAttribute('rel', rel);
    if (hreflang) {
      link.setAttribute('hreflang', hreflang);
    }
    link.setAttribute('href', href);
    this.document.head.appendChild(link);
  }

  /** La misma página en cada idioma; `x-default` es la del idioma principal. */
  private hreflang(alternates: SiteAlternates, lang: SiteLanguage): void {
    const available = SITE_LANGUAGES.filter((each) => alternates[each]);

    // Con un solo idioma no hay alternativas que anunciar
    if (available.length < 2) {
      return;
    }

    for (const each of available) {
      this.link('alternate', this.url(alternates[each]!), each);

      if (each !== lang) {
        this.meta.addTag({property: 'og:locale:alternate', content: OG_LOCALES[each]});
      }
    }

    const fallback = alternates[SITE_DEFAULT_LANGUAGE] ?? alternates[available[0]]!;
    this.link('alternate', this.url(fallback), 'x-default');
  }

  private structuredData(page: SitePageMeta, lang: SiteLanguage, url: string, image: string): void {
    const home = this.url('/');
    const organization = {'@id': `${home}#organization`};

    const graph: Array<Record<string, unknown>> = [
      {'@type': 'Organization', ...organization, name: this.appName, url: home, logo: image},
      {'@type': 'WebSite', '@id': `${home}#website`, name: this.appName, url: home, inLanguage: [...SITE_LANGUAGES], publisher: organization},
      {
        '@type': 'WebPage', '@id': `${url}#webpage`, url, name: this.translate.instant(page.title, page.titleParams),
        description: page.description, inLanguage: lang, isPartOf: {'@id': `${home}#website`},
        ...(page.breadcrumbs?.length ? {breadcrumb: {'@id': `${url}#breadcrumb`}} : {}),
      },
    ];

    if (page.breadcrumbs?.length) {
      const trail = [{name: this.appName, path: homePath(lang)}, ...page.breadcrumbs];

      graph.push({
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: trail.map((crumb, index) => ({
          '@type': 'ListItem', position: index + 1, name: crumb.name, item: this.url(crumb.path),
        })),
      });
    }

    graph.push(...(page.schema ?? []));

    // Los <script> de las plantillas de Angular no se serializan: el nodo se crea a mano para
    // que salga en el HTML que genera el servidor
    const script = this.document.createElement('script');
    script.id = STRUCTURED_DATA_ID;
    script.type = 'application/ld+json';
    // `<` escapado: un nombre con «</script>» no puede cerrar la etiqueta
    script.textContent = JSON.stringify({'@context': 'https://schema.org', '@graph': graph}).replace(/</g, '\\u003c');
    this.document.head.appendChild(script);
  }
}
