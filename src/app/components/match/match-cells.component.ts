import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {LocaleService} from '@edas/ng/shared/services/locale.service';
import {BadgeComponent} from '@edas/ng/wrapper/components/badge/badge.component';
import {formatZoned, SHORT_DAY_YEAR_FORMAT, TIME_FORMAT} from '../../shared/dates/zoned-dates';
import {MATCH_STATUS_TONE, matchStatusLabel} from '../../shared/matches/matches';
import {MatchRow} from '../../shared/models/match';
import {TeamCrestComponent} from '../team/team-crest.component';

/** Fecha y hora de un partido, con la hora de quien mira; sin hora fijada, «Por confirmar». */
@Component({
  selector: 'app-match-kickoff-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    @if (data(); as match) {
      @if (match.kickoff_at) {
        <span class="date">{{ date() }}</span>
        <span class="time">{{ match.kickoff_confirmed ? time() : ('match.time-tbc' | translate) }}</span>
      } @else {
        <span class="time">{{ 'match.undated' | translate }}</span>
      }
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      font-variant-numeric: tabular-nums;
    }

    .time {
      font-size: 0.8125rem;
      color: var(--edas-muted-text-color);
    }
  `],
})
export class MatchKickoffCellComponent {
  public readonly data = input<MatchRow>();

  private readonly locale = inject(LocaleService);

  protected readonly date = computed(() => {
    const kickoff = this.data()?.kickoff_at;

    return kickoff ? formatZoned(kickoff, this.locale.language(), undefined, SHORT_DAY_YEAR_FORMAT) : '';
  });

  protected readonly time = computed(() => {
    const kickoff = this.data()?.kickoff_at;

    return kickoff ? formatZoned(kickoff, this.locale.language(), undefined, TIME_FORMAT) : '';
  });
}

/** Un equipo del partido (`side`: local o visitante), con su escudo. */
@Component({
  selector: 'app-match-team-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TeamCrestComponent],
  template: `
    @if (team(); as current) {
      <app-team-crest [src]="current.crest" [size]="22" [reserve]="true"/>
      <span class="name">{{ current.name ?? '—' }}</span>
    } @else {
      <span class="muted">—</span>
    }
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      gap: var(--edas-space-2);
      max-width: 14rem;
      font-weight: 600;
    }

    .name {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .muted {
      color: var(--edas-muted-text-color);
    }
  `],
})
export class MatchTeamCellComponent {
  public readonly data = input<MatchRow>();
  public readonly side = input<'home' | 'away'>('home');

  protected readonly team = computed(() => {
    const match = this.data();

    return (this.side() === 'home' ? match?.home_team : match?.away_team) ?? null;
  });
}

/** Resultado (con la tanda de penaltis, si la hubo) o «vs» si aún no hay. */
@Component({
  selector: 'app-match-score-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    @if (data(); as match) {
      @if (match.home_score !== null) {
        <span class="score">{{ match.home_score }} - {{ match.away_score }}</span>
        @if (match.home_penalties !== null) {
          <span class="penalties">({{ match.home_penalties }} - {{ match.away_penalties }})</span>
        }
      } @else {
        <span class="pending">{{ 'match.versus' | translate }}</span>
      }
    }
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: baseline;
      gap: 4px;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .score {
      font-weight: 700;
    }

    .penalties,
    .pending {
      font-size: 0.8125rem;
      color: var(--edas-muted-text-color);
    }
  `],
})
export class MatchScoreCellComponent {
  public readonly data = input<MatchRow>();
}

/** Estado del partido: «Finalizado», «En juego · 30'», «Aplazado»… */
@Component({
  selector: 'app-match-status-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent],
  template: `
    @if (data(); as match) {
      <edas-badge [appearance]="tone()" [label]="label()" [labelTranslate]="false" size="s"/>
    }
  `,
})
export class MatchStatusCellComponent {
  public readonly data = input<MatchRow>();

  private readonly translate = inject(TranslateService);

  protected readonly tone = computed(() => {
    const match = this.data();

    return (match ? MATCH_STATUS_TONE[match.status] : undefined) ?? 'neutral';
  });

  protected readonly label = computed(() => {
    const match = this.data();
    // Lee el idioma activo (signal) para que el texto cambie con él
    this.translate.currentLang();

    return match ? matchStatusLabel(match, (key) => this.translate.instant(key)) : '';
  });
}
