import {ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {map} from 'rxjs';
import {MatchListComponent} from '../../../components/match/match-list.component';
import {SiteErrorComponent} from '../../../components/site/site-error.component';
import {SiteTimeZoneNoteComponent} from '../../../components/site/site-time-zone-note.component';
import {StandingsTableComponent} from '../../../components/standing/standings-table.component';
import {SiteClockService} from '../../../site/site-clock.service';
import {SiteData} from '../../../site/site-data';
import {CompetitionOverview} from '../../../site/site-resolvers';
import {matchesSchema} from '../../../site/site-schema';
import {SiteSeoService} from '../../../site/site-seo.service';
import {injectCompetitionPage} from './competition-page';

/**
 * Resumen de una competición: la jornada en juego y la clasificación, con acceso a sus
 * páginas completas, y el texto de presentación si lo tiene.
 */
@Component({
  selector: 'app-competition-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {class: 'site-stack'},
  imports: [MatchListComponent, RouterLink, SiteErrorComponent, SiteTimeZoneNoteComponent, StandingsTableComponent, TranslatePipe],
  template: `
    @if (overview(); as current) {
      @if (isEmpty()) {
        <p class="site-empty">{{ 'site.competition.no-data' | translate }}</p>
      } @else {
        <div class="site-columns">
          @if (current.fixtures.round; as round) {
            <div class="site-block">
              <div class="site-block__header">
                <h2 class="site-heading">{{ 'match.round-number' | translate: {number: round.number} }}</h2>
                <a class="site-more" [routerLink]="page.path('fixtures')">{{ 'site.competition.all-fixtures' | translate }}</a>
              </div>

              <app-match-list [matches]="current.fixtures.matches" [timeZone]="clock.timeZone()" [teamLink]="page.teamLink"/>
              <app-site-time-zone-note [at]="round.starts_at"/>
            </div>
          }

          @if (table(); as rows) {
            <div class="site-block">
              <div class="site-block__header">
                <h2 class="site-heading">{{ 'standing.title' | translate }}</h2>
                <a class="site-more" [routerLink]="page.path('standings')">{{ 'site.competition.full-standings' | translate }}</a>
              </div>

              <app-standings-table [rows]="rows" [showForm]="false" [compact]="true" [caption]="caption()" [teamLink]="page.teamLink"/>
            </div>
          }
        </div>
      }

      @if (page.context()?.competition?.content; as content) {
        <div class="site-block">
          <h2 class="site-heading">{{ 'site.competition.about' | translate: {competition: page.context()?.competition?.name} }}</h2>
          <p class="site-text">{{ content }}</p>
        </div>
      }
    } @else {
      <app-site-error/>
    }
  `,
})
export class CompetitionOverviewComponent {
  private readonly translate = inject(TranslateService);
  protected readonly clock = inject(SiteClockService);

  protected readonly page = injectCompetitionPage();

  private readonly result = toSignal(inject(ActivatedRoute).data.pipe(map((data) => data['overview'] as SiteData<CompetitionOverview>)));

  protected readonly overview = computed(() => {
    const result = this.result();

    return result?.state === 'ok' ? result.data : null;
  });

  /** Filas de la primera clasificación; null si no hay ninguna. */
  protected readonly table = computed(() => {
    const rows = this.overview()?.standings.tables[0]?.rows ?? [];

    return rows.length > 0 ? rows : null;
  });

  /** Ni jornadas ni clasificación: la temporada aún no tiene datos. */
  protected readonly isEmpty = computed(() => !this.overview()?.fixtures.round && !this.table());

  protected readonly caption = computed(() => this.translate.instant('site.competition.heading-standings', {competition: this.page.label()}));

  constructor() {
    const seo = inject(SiteSeoService);

    effect(() => {
      const context = this.page.context();
      const current = this.overview();
      const meta = this.page.meta('overview');
      const competition = context?.competition;

      seo.apply({
        // El título y la descripción que se hayan escrito en el panel mandan, pero solo en la
        // temporada actual: son textos de la competición, no de una temporada pasada
        title: competition?.seo_title && context?.season?.is_current !== false ? 'site.title-raw' : 'site.competition.title-overview',
        description:
          (context?.season?.is_current !== false ? competition?.seo_description : null) ??
          this.translate.instant('site.competition.description-overview', {competition: this.page.label()}),
        ...meta,
        titleParams: {...meta.titleParams, text: competition?.seo_title},
        schema: [
          ...(meta.schema ?? []),
          ...(current && competition ? matchesSchema(this.page.lang, current.fixtures.matches, competition) : []),
        ],
      });
    });

    inject(DestroyRef).onDestroy(() => seo.clear());
  }
}
