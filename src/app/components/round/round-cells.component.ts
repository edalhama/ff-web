import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {BadgeComponent} from '@edas/ng/wrapper/components/badge/badge.component';
import {roundLabelKey} from '../../shared/matches/matches';
import {RoundRow} from '../../shared/models/match';
import {SeasonStatus} from '../../shared/models/season';

/** Color del estado de una jornada. */
export const ROUND_STATUS_TONE: Record<SeasonStatus, 'neutral' | 'success' | 'info'> = {
  upcoming: 'neutral',
  in_progress: 'success',
  finished: 'info',
};

/** Celda de nombre de la tabla de jornadas: «Jornada 9» o «Final», y si es la que está en disputa. */
@Component({
  selector: 'app-round-name-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent],
  template: `
    @if (data(); as round) {
      <span class="name">{{ name() }}</span>
      @if (round.id === currentRoundId()) {
        <edas-badge appearance="success" icon="circle-dot" label="match.in-play" size="s"/>
      }
    }
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--edas-space-2);
    }

    .name {
      font-weight: 600;
    }
  `],
})
export class RoundNameCellComponent {
  public readonly data = input<RoundRow>();
  /** Jornada en disputa de la temporada listada. */
  public readonly currentRoundId = input<number | null>(null);

  private readonly translate = inject(TranslateService);

  protected readonly name = computed(() => {
    const round = this.data();
    // Lee el idioma activo (signal) para que el texto cambie con él
    this.translate.currentLang();

    if (!round) {
      return '';
    }

    const {key, params} = roundLabelKey(round);

    return this.translate.instant(key, params);
  });
}

/** Estado de la jornada: por empezar, en curso, finalizada. */
@Component({
  selector: 'app-round-status-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent],
  template: `
    @if (data(); as round) {
      <edas-badge [appearance]="tone()" [label]="'enum.season-status.' + round.status" size="s"/>
    }
  `,
})
export class RoundStatusCellComponent {
  public readonly data = input<RoundRow>();

  protected readonly tone = computed(() => ROUND_STATUS_TONE[this.data()?.status ?? 'upcoming']);
}
