import {ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {map} from 'rxjs';
import {MatchListComponent} from '../../../components/match/match-list.component';
import {SiteErrorComponent} from '../../../components/site/site-error.component';
import {SiteTimeZoneNoteComponent} from '../../../components/site/site-time-zone-note.component';
import {SHORT_DAY_FORMAT} from '../../../shared/dates/zoned-dates';
import {SiteRound, SiteRoundMatches} from '../../../shared/models/site';
import {SiteClockService} from '../../../site/site-clock.service';
import {SiteData} from '../../../site/site-data';
import {matchesSchema} from '../../../site/site-schema';
import {SiteSeoService} from '../../../site/site-seo.service';
import {SiteNotFoundScreenComponent} from '../not-found/site-not-found-screen.component';
import {injectCompetitionPage} from './competition-page';

/**
 * Calendario de una competición: los partidos de una jornada y el acceso a las demás. Sin
 * jornada en la URL se ve la que está en juego; cada jornada tiene además su propia URL.
 */
@Component({
  selector: 'app-competition-fixtures',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {class: 'site-stack'},
  imports: [MatchListComponent, RouterLink, SiteErrorComponent, SiteTimeZoneNoteComponent, SiteNotFoundScreenComponent, TranslatePipe],
  template: `
    @if (fixtures(); as current) {
      @if (current.round; as round) {
        <div class="site-round">
          @if (neighbour(-1); as previous) {
            <a class="site-round__step" [routerLink]="page.path('fixtures', previous.number)" [attr.aria-label]="'match.previous-round' | translate">‹</a>
          } @else {
            <span class="site-round__step site-round__step--disabled" aria-hidden="true">‹</span>
          }

          <div class="site-round__title">
            <h2 class="site-heading">{{ 'match.round-number' | translate: {number: round.number} }}</h2>
            <p class="site-meta">{{ dates(round) }}</p>
          </div>

          @if (neighbour(1); as next) {
            <a class="site-round__step" [routerLink]="page.path('fixtures', next.number)" [attr.aria-label]="'match.next-round' | translate">›</a>
          } @else {
            <span class="site-round__step site-round__step--disabled" aria-hidden="true">›</span>
          }
        </div>

        @if (current.matches.length > 0) {
          <app-match-list [matches]="current.matches" [timeZone]="clock.timeZone()" [teamLink]="page.teamLink"/>
          <app-site-time-zone-note [at]="round.starts_at"/>
        } @else {
          <p class="site-empty">{{ 'match.empty-round' | translate }}</p>
        }

        <nav class="site-rounds" [attr.aria-label]="'site.competition.all-rounds' | translate">
          <h2 class="site-subheading">{{ 'site.competition.all-rounds' | translate }}</h2>
          <ol class="site-rounds__list">
            @for (each of rounds(); track each.number) {
              <li>
                <a
                  class="site-rounds__item"
                  [class.site-rounds__item--active]="each.number === round.number"
                  [class.site-rounds__item--pending]="each.status !== 'finished'"
                  [attr.aria-current]="each.number === round.number ? 'page' : null"
                  [attr.title]="'match.round-number' | translate: {number: each.number}"
                  [routerLink]="page.path('fixtures', each.number)"
                >{{ each.number }}</a>
              </li>
            }
          </ol>
        </nav>
      } @else {
        <p class="site-empty">{{ 'site.competition.no-fixtures' | translate }}</p>
      }
    } @else if (missing()) {
      <app-site-not-found/>
    } @else {
      <app-site-error/>
    }
  `,
})
export class CompetitionFixturesComponent {
  private readonly translate = inject(TranslateService);
  protected readonly clock = inject(SiteClockService);

  protected readonly page = injectCompetitionPage();

  private readonly route = inject(ActivatedRoute);
  private readonly result = toSignal(this.route.data.pipe(map((data) => data['fixtures'] as SiteData<SiteRoundMatches>)));
  /** ¿La URL nombra una jornada concreta? Si no, se está viendo «la actual». */
  private readonly roundInUrl = toSignal(this.route.paramMap.pipe(map((params) => params.has('round'))), {initialValue: false});

  protected readonly fixtures = computed(() => {
    const result = this.result();

    return result?.state === 'ok' ? result.data : null;
  });

  /** La jornada de la URL no existe. */
  protected readonly missing = computed(() => this.result()?.state === 'not-found');

  protected readonly rounds = computed(() => this.page.context()?.rounds ?? []);

  constructor() {
    const seo = inject(SiteSeoService);

    effect(() => {
      const current = this.fixtures();
      const context = this.page.context();
      const round = current?.round ?? null;

      if (this.missing()) {
        // El 404 pone sus propios metadatos
        return;
      }

      // Sin jornada en la URL la página es «el calendario» y su contenido cambia cada semana;
      // con ella, es esa jornada para siempre
      const number = this.roundInUrl() ? (round?.number ?? null) : null;

      seo.apply({
        title: number ? 'site.competition.title-round' : 'site.competition.title-fixtures',
        description: this.translate.instant(number ? 'site.competition.description-round' : 'site.competition.description-fixtures', {
          competition: this.page.label(),
          round: round?.number,
          dates: round ? this.dates(round) : '',
        }),
        ...this.page.meta('fixtures', number),
        index: (current?.matches.length ?? 0) > 0,
        schema: [
          ...(this.page.meta('fixtures').schema ?? []),
          ...(current && context ? matchesSchema(this.page.lang, current.matches, context.competition) : []),
        ],
      });
    });

    inject(DestroyRef).onDestroy(() => seo.clear());
  }

  /** Jornada anterior (-1) o siguiente (1) a la que se está viendo. */
  protected neighbour(offset: number): SiteRound | null {
    const rounds = this.rounds();
    const index = rounds.findIndex((round) => round.number === this.fixtures()?.round?.number);

    return index === -1 ? null : (rounds[index + offset] ?? null);
  }

  /** «15 ago – 17 ago», o un solo día si empieza y acaba el mismo. */
  protected dates(round: SiteRound): string {
    const days = [round.starts_at, round.ends_at].map((value) => this.clock.format(value, SHORT_DAY_FORMAT)).filter(Boolean);

    return [...new Set(days)].join(' – ');
  }
}
