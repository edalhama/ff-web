import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {ButtonComponent} from '@edas/ng/wrapper/components/button/button.component';
import {LoaderComponent} from '@edas/ng/wrapper/components/loader/loader.component';
import {PickerComponent} from '@edas/ng/wrapper/components/picker/picker.component';
import {EdasPickerOption} from '@edas/ng/wrapper/components/picker/picker.types';
import {LocalizedDatePipe} from '@edas/ng/wrapper/pipes/localized-date.pipe';
import {FootballMatch, Round} from '../../shared/models/match';
import {Season} from '../../shared/models/season';
import {SeasonContentApiService} from '../../shared/services/api/season-content-api.service';
import {MatchListComponent} from '../match/match-list.component';

/**
 * Calendario de una temporada (sección `calendar` del modal `season`): se elige una jornada y
 * se ven sus partidos, agrupados por día y con la hora de quien mira. Se abre por la jornada
 * en curso.
 *
 * Es de solo lectura: horarios y resultados llegan por la sincronización.
 */
@Component({
  selector: 'app-season-calendar-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, ButtonComponent, LoaderComponent, MatchListComponent, PickerComponent, TranslatePipe],
  template: `
    @if (rounds(); as list) {
      @if (list.length > 0) {
        <div class="round-bar">
          <edas-button
            icon="chevron-left"
            [iconOnly]="true"
            [ariaLabel]="'match.previous-round' | translate"
            [disabled]="roundIndex() <= 0"
            (clicked)="step(-1)"
          />

          <edas-picker
            class="round-picker"
            label="match.round"
            [items]="roundOptions()"
            [value]="roundId()"
            [labelTranslate]="false"
            [searchable]="false"
            (valueChange)="select($event)"
          />

          <edas-button
            icon="chevron-right"
            [iconOnly]="true"
            [ariaLabel]="'match.next-round' | translate"
            [disabled]="roundIndex() >= list.length - 1"
            (clicked)="step(1)"
          />
        </div>

        @if (matches(); as roundMatches) {
          @if (roundMatches.length > 0) {
            <app-match-list [matches]="roundMatches"/>
          } @else {
            <p class="empty">{{ 'match.empty-round' | translate }}</p>
          }
        } @else {
          <edas-loader/>
        }
      } @else {
        <edas-app-card
          icon="calendar-off"
          [iconSize]="48"
          [title]="'match.empty-title' | translate"
          [description]="'season.not-synced' | translate"
        />
      }
    } @else {
      <edas-loader/>
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-4);
      width: 100%;
    }

    .round-bar {
      display: flex;
      align-items: center;
      gap: var(--edas-space-2);
    }

    .round-picker {
      flex: 1;
      min-width: 0;
      max-width: 24rem;
    }

    .empty {
      margin: 0;
      color: var(--edas-muted-text-color);
    }
  `],
})
export class SeasonCalendarSectionComponent implements OnInit {
  /** Temporada abierta; la carga el modal. */
  public readonly data = input<Season>();

  private readonly content = inject(SeasonContentApiService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly datePipe = new LocalizedDatePipe();

  /** `null` mientras llegan. */
  protected readonly rounds = signal<Round[] | null>(null);
  protected readonly roundId = signal<number | null>(null);
  /** Partidos de la jornada elegida; `null` mientras cargan. */
  protected readonly matches = signal<FootballMatch[] | null>(null);

  protected readonly roundIndex = computed(() => (this.rounds() ?? []).findIndex((round) => round.id === this.roundId()));

  protected readonly roundOptions = computed<EdasPickerOption<number>[]>(() => {
    // El nombre de la jornada y su estado cambian con el idioma
    this.translate.currentLang();

    return (this.rounds() ?? []).map((round) => ({
      value: round.id,
      label: this.roundName(round),
      description: [this.translate.instant(`enum.season-status.${round.status}`), this.dateRange(round)].filter(Boolean).join(' · '),
    }));
  });

  public ngOnInit(): void {
    const season = this.data();
    if (!season) {
      return;
    }

    this.content
      .rounds(season.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({rounds, currentRoundId}) => {
          this.rounds.set(rounds);

          // La jornada en curso; si no hay, la primera sin terminar; si no, la última
          const initial =
            rounds.find((round) => round.id === currentRoundId) ??
            rounds.find((round) => round.status !== 'finished') ??
            rounds.at(-1);

          if (initial) {
            this.select(initial.id);
          }
        },
        error: () => this.rounds.set([]),
      });
  }

  protected select(roundId: number): void {
    const season = this.data();
    if (!season || roundId === this.roundId()) {
      return;
    }

    this.roundId.set(roundId);
    this.matches.set(null);

    this.content
      .matches(season.id, roundId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        // Una respuesta que llega tarde no pisa la de la jornada que ya se está viendo
        next: (matches) => this.roundId() === roundId && this.matches.set(matches),
        error: () => this.roundId() === roundId && this.matches.set([]),
      });
  }

  /** Jornada anterior o siguiente. */
  protected step(offset: number): void {
    const round = (this.rounds() ?? [])[this.roundIndex() + offset];

    if (round) {
      this.select(round.id);
    }
  }

  private roundName(round: Round): string {
    return round.number !== null
      ? this.translate.instant('match.round-number', {number: round.number})
      : this.translate.instant(`enum.round-type.${round.type}`);
  }

  /** «15 ago – 17 ago», o un solo día si empieza y acaba el mismo. */
  private dateRange(round: Round): string {
    const start = round.starts_at ? this.datePipe.transform(round.starts_at, 'd MMM') : null;
    const end = round.ends_at ? this.datePipe.transform(round.ends_at, 'd MMM') : null;

    return [...new Set([start, end].filter(Boolean))].join(' – ');
  }
}
