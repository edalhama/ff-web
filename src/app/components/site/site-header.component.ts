import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {PublicHeaderComponent} from '@edas/ng/brand/public-header.component';
import {LocaleService} from '@edas/ng/shared/services/locale.service';
import {ButtonComponent} from '@edas/ng/wrapper/components/button/button.component';
import {ADMIN_HOME_PATH, SessionService} from '../../shared/services/session.service';
import {homePath, SITE_LANGUAGES, SiteLanguage} from '../../site/site-links';
import {SiteSeoService} from '../../site/site-seo.service';

/**
 * Cabecera de la parte pública: logo (a la portada del idioma activo), aspecto e idioma.
 *
 * El idioma no es un selector sino enlaces: cada uno lleva a esta misma página en el otro
 * idioma, que tiene su propia URL (si la página no existe en ese idioma, a su portada). Con
 * sesión de administración abierta, da acceso al panel.
 */
@Component({
  selector: 'app-site-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, PublicHeaderComponent, RouterLink, TranslatePipe],
  template: `
    <edas-public-header [logoLink]="home()" [showLanguage]="false">
      <nav class="site-languages" [attr.aria-label]="'site.language' | translate">
        @for (each of languages(); track each.lang) {
          <a
            class="site-language"
            [class.site-language--active]="each.active"
            [attr.aria-current]="each.active ? 'true' : null"
            [attr.hreflang]="each.lang"
            [attr.lang]="each.lang"
            [attr.title]="'lang.' + each.lang | translate"
            [routerLink]="each.path"
          >{{ each.lang }}</a>
        }
      </nav>

      @if (session.isLoggedIn()) {
        <edas-button appearance="flat" size="sm" icon="layout-dashboard" label="site.admin-panel" [routerLink]="adminPath"/>
      }
    </edas-public-header>
  `,
})
export class SiteHeaderComponent {
  private readonly locale = inject(LocaleService);
  private readonly seo = inject(SiteSeoService);
  protected readonly session = inject(SessionService);

  protected readonly adminPath = ADMIN_HOME_PATH;

  protected readonly home = computed(() => homePath(this.locale.language() as SiteLanguage));

  protected readonly languages = computed(() => {
    const active = this.locale.language();
    const alternates = this.seo.alternates();

    return SITE_LANGUAGES.map((lang) => ({lang, active: lang === active, path: alternates?.[lang] ?? homePath(lang)}));
  });
}
