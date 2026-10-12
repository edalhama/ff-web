import {ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, signal} from '@angular/core';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute} from '@angular/router';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {map} from 'rxjs';
import {SiteErrorComponent} from '../../../components/site/site-error.component';
import {StandingsTableComponent} from '../../../components/standing/standings-table.component';
import {SHORT_DAY_YEAR_FORMAT, TIME_FORMAT} from '../../../shared/dates/zoned-dates';
import {SiteStandings} from '../../../shared/models/site';
import {STANDING_SCOPES, StandingScope} from '../../../shared/models/standing';
import {SiteApiService} from '../../../site/site-api.service';
import {SiteClockService} from '../../../site/site-clock.service';
import {SiteData} from '../../../site/site-data';
import {SiteSeoService} from '../../../site/site-seo.service';
import {injectCompetitionPage} from './competition-page';

/**
 * Clasificación de una competición. La página llega con la general; la de local y la de
 * visitante se piden al elegirlas (no tienen URL propia: son la misma página).
 */
@Component({
  selector: 'app-competition-standings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {class: 'site-stack'},
  imports: [SiteErrorComponent, StandingsTableComponent, TranslatePipe],
  template: `
    @if (standings(); as current) {
      <div class="site-segments" role="group" [attr.aria-label]="'standing.title' | translate">
        @for (each of scopes; track each) {
          <button
            type="button"
            class="site-segment"
            [class.site-segment--active]="each === current.scope"
            [attr.aria-pressed]="each === current.scope"
            (click)="setScope(each)"
          >{{ 'standing.scope-' + each | translate }}</button>
        }
      </div>

      @for (table of current.tables; track $index) {
        @if (table.rows.length > 0) {
          <app-standings-table
            [rows]="table.rows"
            [showForm]="current.scope === 'total'"
            [caption]="caption()"
            [teamLink]="page.teamLink"
          />

          @if (table.updated_at) {
            <p class="site-note">{{ 'site.updated-at' | translate: {date: updatedAt(table.updated_at)} }}</p>
          }
        }
      }

      @if (isEmpty()) {
        <p class="site-empty">{{ 'site.competition.no-standings' | translate }}</p>
      }
    } @else {
      <app-site-error/>
    }
  `,
})
export class CompetitionStandingsComponent {
  private readonly api = inject(SiteApiService);
  private readonly translate = inject(TranslateService);
  private readonly clock = inject(SiteClockService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly page = injectCompetitionPage();
  protected readonly scopes = STANDING_SCOPES;

  private readonly result = toSignal(inject(ActivatedRoute).data.pipe(map((data) => data['standings'] as SiteData<SiteStandings>)));
  /** Tabla elegida a mano (local o visitante); null = la que trae la página. */
  private readonly chosen = signal<SiteStandings | null>(null);

  protected readonly standings = computed(() => {
    const result = this.result();

    return this.chosen() ?? (result?.state === 'ok' ? result.data : null);
  });

  protected readonly isEmpty = computed(() => (this.standings()?.tables ?? []).every((table) => table.rows.length === 0));

  protected readonly caption = computed(() => this.translate.instant('site.competition.heading-standings', {competition: this.page.label()}));

  constructor() {
    const seo = inject(SiteSeoService);

    effect(() => {
      const leader = this.result()?.state === 'ok' ? (this.result() as {data: SiteStandings}).data.tables[0]?.rows[0] : null;

      seo.apply({
        title: 'site.competition.title-standings',
        description: this.translate.instant(leader ? 'site.competition.description-standings-leader' : 'site.competition.description-standings', {
          competition: this.page.label(),
          team: leader?.team.name,
          points: leader?.points,
        }),
        ...this.page.meta('standings'),
        index: !this.isEmpty(),
      });
    });

    this.destroyRef.onDestroy(() => seo.clear());
  }

  protected setScope(scope: StandingScope): void {
    const context = this.page.context();
    if (!context || scope === this.standings()?.scope) {
      return;
    }

    this.api
      .standings(this.page.lang, context.competition.slug ?? '', this.page.seasonInUrl(), scope)
      .pipe(takeUntilDestroyed(this.destroyRef))
      // Si falla se queda la tabla que había: el aviso de error lo da la propia petición
      .subscribe({next: (standings) => this.chosen.set(standings), error: () => undefined});
  }

  protected updatedAt(value: string): string {
    return `${this.clock.format(value, SHORT_DAY_YEAR_FORMAT)}, ${this.clock.format(value, TIME_FORMAT)}`;
  }
}
