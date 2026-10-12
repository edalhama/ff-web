import {ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {LocaleService} from '@edas/ng/shared/services/locale.service';
import {map} from 'rxjs';
import {SiteErrorComponent} from '../../../components/site/site-error.component';
import {SiteHomeCompetition} from '../../../shared/models/site';
import {dataOf, SiteData} from '../../../site/site-data';
import {competitionPath, homePath, SiteLanguage} from '../../../site/site-links';
import {itemListSchema} from '../../../site/site-schema';
import {SiteSeoService} from '../../../site/site-seo.service';

/** Portada: presenta el sitio y lista las competiciones que se siguen. */
@Component({
  selector: 'app-site-home-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, SiteErrorComponent, TranslatePipe],
  template: `
    <div class="site-page">
      <div class="site-hero">
        <h1 class="site-hero__title">{{ 'site.home.title' | translate }}</h1>
        <p class="site-hero__subtitle">{{ 'site.home.subtitle' | translate }}</p>
      </div>

      <div class="site-block">
        <h2 class="site-heading">{{ 'site.home.competitions' | translate }}</h2>

        @if (competitions(); as list) {
          @if (list.length > 0) {
            <ul class="site-cards">
              @for (competition of list; track competition.id) {
                <li>
                  <a class="site-card" [routerLink]="link(competition)">
                    <span class="site-card__title">{{ competition.name }}</span>
                    <span class="site-card__meta">
                      {{ meta(competition) }}
                    </span>
                    @if (competition.season; as season) {
                      <span class="site-chip">{{ 'site.season' | translate: {season: season.label} }}</span>
                    }
                  </a>
                </li>
              }
            </ul>
          } @else {
            <p class="site-empty">{{ 'site.home.empty' | translate }}</p>
          }
        } @else {
          <app-site-error/>
        }
      </div>
    </div>
  `,
})
export class SiteHomeScreenComponent {
  private readonly translate = inject(TranslateService);
  private readonly lang = inject(LocaleService).language() as SiteLanguage;

  private readonly result = toSignal(
    inject(ActivatedRoute).data.pipe(map((data) => data['home'] as SiteData<SiteHomeCompetition[]>)),
  );

  /** null si la API no ha respondido. */
  protected readonly competitions = computed(() => dataOf(this.result()));

  constructor() {
    const seo = inject(SiteSeoService);

    effect(() => {
      const competitions = this.competitions() ?? [];

      seo.apply({
        title: 'site.home.meta-title',
        description: this.translate.instant('site.home.meta-description'),
        alternates: {es: homePath('es'), en: homePath('en')},
        schema: competitions.length > 0
          ? [itemListSchema(this.translate.instant('site.home.competitions'), competitions.map((each) => ({name: each.name, path: this.link(each)})))]
          : [],
      });
    });

    inject(DestroyRef).onDestroy(() => seo.clear());
  }

  protected link(competition: SiteHomeCompetition): string {
    return competitionPath(this.lang, competition.slug ?? '');
  }

  /** «España · Liga». */
  protected meta(competition: SiteHomeCompetition): string {
    return [competition.country?.name, this.translate.instant(`enum.competition-type.${competition.type}`)].filter(Boolean).join(' · ');
  }
}
