import {ChangeDetectionStrategy, Component, DestroyRef, inject} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {NotFoundComponent} from '@edas/ng/brand/not-found.component';
import {LocaleService} from '@edas/ng/shared/services/locale.service';
import {SITE_TTL} from '../../../site/site-cache';
import {homePath, SiteLanguage} from '../../../site/site-links';
import {SiteResponseService} from '../../../site/site-response.service';
import {SiteSeoService} from '../../../site/site-seo.service';

/**
 * Página que no existe. Además de decirlo, responde con un 404 de verdad cuando se genera en
 * el servidor (un buscador no debe indexarla) y pide que no se indexe.
 *
 * Es la pantalla de la ruta `**` y la que pintan las páginas públicas cuando la API no
 * encuentra lo que piden.
 */
@Component({
  selector: 'app-site-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NotFoundComponent],
  template: `<edas-not-found [backLink]="home"/>`,
})
export class SiteNotFoundScreenComponent {
  protected readonly home = homePath(inject(LocaleService).language() as SiteLanguage);

  constructor() {
    const response = inject(SiteResponseService);
    response.status(404);
    response.cache(SITE_TTL.notFound);

    const seo = inject(SiteSeoService);
    seo.apply({
      title: 'title.not-found',
      description: inject(TranslateService).instant('site.not-found-description'),
      alternates: {es: null, en: null},
      index: false,
    });
    inject(DestroyRef).onDestroy(() => seo.clear());
  }
}
