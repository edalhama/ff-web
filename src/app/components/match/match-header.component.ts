import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {LocaleService} from '@edas/ng/shared/services/locale.service';
import {BadgeComponent} from '@edas/ng/wrapper/components/badge/badge.component';
import {formatZoned, LONG_DAY_FORMAT, TIME_FORMAT} from '../../shared/dates/zoned-dates';
import {MATCH_STATUS_TONE, matchStatusLabel, roundLabelKey} from '../../shared/matches/matches';
import {MatchDetail} from '../../shared/models/match';
import {TeamCrestComponent} from '../team/team-crest.component';

/**
 * Cabecera de la ficha de un partido: los dos equipos con su escudo, el resultado (con el del
 * descanso y la tanda de penaltis, si los hay), el estado, la fecha con la hora de quien mira
 * y la jornada.
 */
@Component({
  selector: 'app-match-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent, TeamCrestComponent, TranslatePipe],
  template: `
    @if (match(); as current) {
      <div class="ff-panel header">
        <p class="context">{{ context() }}</p>

        <div class="scoreboard">
          <span class="team team--home">
            <app-team-crest [src]="current.home_team?.crest" [size]="40"/>
            <span class="team-name">{{ current.home_team?.name ?? '—' }}</span>
          </span>

          <span class="score" [class.score--pending]="current.home_score === null">
            @if (current.home_score !== null) {
              {{ current.home_score }}<span class="separator">-</span>{{ current.away_score }}
            } @else {
              {{ 'match.versus' | translate }}
            }
          </span>

          <span class="team team--away">
            <app-team-crest [src]="current.away_team?.crest" [size]="40"/>
            <span class="team-name">{{ current.away_team?.name ?? '—' }}</span>
          </span>
        </div>

        @if (extraScores(); as extra) {
          <p class="extra">{{ extra }}</p>
        }

        <div class="meta">
          <edas-badge [appearance]="tone()" [label]="statusLabel()" [labelTranslate]="false" size="s"/>
          <span>{{ kickoff() }}</span>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--edas-space-2);
      padding: var(--edas-space-4);
      text-align: center;
    }

    .context,
    .extra {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--edas-muted-text-color);
    }

    /* Local · resultado · visitante; el resultado queda centrado porque los equipos miden lo mismo */
    .scoreboard {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
      align-items: center;
      gap: var(--edas-space-4);
      width: 100%;
    }

    .team {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--edas-space-2);
      min-width: 0;
      font-weight: 600;
    }

    .team-name {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .score {
      font-size: 1.75rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .score--pending {
      font-size: 1rem;
      font-weight: 500;
      color: var(--edas-muted-text-color);
    }

    .separator {
      margin-inline: 0.35em;
      color: var(--edas-muted-text-color);
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: var(--edas-space-2);
      font-size: 0.875rem;
      color: var(--edas-muted-text-color);
    }
  `],
})
export class MatchHeaderComponent {
  public readonly match = input.required<MatchDetail['match']>();

  private readonly translate = inject(TranslateService);
  private readonly locale = inject(LocaleService);

  /** «LaLiga · 2026/27 · Jornada 9». */
  protected readonly context = computed(() => {
    const match = this.match();
    // Lee el idioma activo (signal) para que los textos cambien con él
    this.translate.currentLang();
    const round = match.round ? roundLabelKey(match.round) : null;

    return [match.competition.name, match.season.label, round ? this.translate.instant(round.key, round.params) : null].filter(Boolean).join(' · ');
  });

  /** «Descanso: 1-0 · Penaltis: 4-3», lo que haya. */
  protected readonly extraScores = computed(() => {
    const match = this.match();
    this.translate.currentLang();
    const parts = [
      match.home_score_half !== null ? this.translate.instant('match.half-time-score', {home: match.home_score_half, away: match.away_score_half}) : null,
      match.home_penalties !== null ? this.translate.instant('match.penalties-score', {home: match.home_penalties, away: match.away_penalties}) : null,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(' · ') : null;
  });

  protected readonly tone = computed(() => MATCH_STATUS_TONE[this.match().status] ?? 'neutral');

  protected readonly statusLabel = computed(() => {
    this.translate.currentLang();

    return matchStatusLabel(this.match(), (key) => this.translate.instant(key));
  });

  /** Fecha y hora de quien mira; sin hora fijada, «Por confirmar». */
  protected readonly kickoff = computed(() => {
    const match = this.match();
    const lang = this.locale.language();
    this.translate.currentLang();

    if (!match.kickoff_at) {
      return this.translate.instant('match.undated');
    }

    const day = formatZoned(match.kickoff_at, lang, undefined, LONG_DAY_FORMAT);

    return match.kickoff_confirmed
      ? `${day}, ${formatZoned(match.kickoff_at, lang, undefined, TIME_FORMAT)}`
      : `${day} · ${this.translate.instant('match.time-tbc')}`;
  });
}
