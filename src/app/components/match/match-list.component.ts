import {NgTemplateOutlet} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {RouterLink} from '@angular/router';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {LocaleService} from '@edas/ng/shared/services/locale.service';
import {formatZoned, LONG_DAY_FORMAT, SHORT_DAY_FORMAT, TIME_FORMAT, zonedDayKey} from '../../shared/dates/zoned-dates';
import {MatchPeriod, MatchStatus} from '../../shared/models/match';
import {TeamSummary} from '../../shared/models/team';

/** Lo que la lista necesita de un partido: lo cumplen el del panel y el de la parte pública. */
export interface MatchListItem {
  id: number;
  kickoff_at: string | null;
  kickoff_confirmed: boolean;
  status: MatchStatus;
  period: MatchPeriod | null;
  minute: number | null;
  home_team: TeamSummary | null;
  away_team: TeamSummary | null;
  home_score: number | null;
  away_score: number | null;
  /** Competición y jornada, para las listas que mezclan varias. */
  competition?: {name: string | null; short_name: string | null};
  round?: number | null;
}

/** Partidos de un mismo día. */
interface MatchDay {
  key: string;
  label: string;
  matches: MatchListItem[];
}

/** Estados que se avisan con un distintivo. Los programados y los terminados no: se ven por la hora o el resultado. */
const STATUS_TONE: Partial<Record<MatchStatus, 'success' | 'warning' | 'danger'>> = {
  playing: 'success',
  postponed: 'warning',
  suspended: 'warning',
  cancelled: 'danger',
};

/**
 * Lista de partidos: hora, local, resultado, visitante y estado.
 *
 * - `layout="days"` (por defecto): agrupados por día, para una jornada.
 * - `layout="dates"`: una sola lista con la fecha en cada fila, para partidos sueltos de
 *   varias jornadas (los últimos de un equipo).
 *
 * Las horas se pintan en `timeZone`; sin ella, en la del dispositivo. Con `teamLink`, el
 * nombre de cada equipo enlaza a donde diga.
 */
@Component({
  selector: 'app-match-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, RouterLink, TranslatePipe],
  template: `
    @for (day of days(); track day.key) {
      <div class="day">
        @if (day.label) {
          <h3 class="day-title">{{ day.label }}</h3>
        }

        <div class="ff-panel">
          @for (match of day.matches; track match.id) {
            <div class="match" [class.match--dated]="layout() === 'dates'">
              <span class="time" [class.time--unconfirmed]="!match.kickoff_confirmed">
                @if (layout() === 'dates') {
                  <span class="date">{{ date(match) }}</span>
                }
                {{ time(match) }}
              </span>

              <span class="team team--home" [title]="match.home_team?.name ?? ''">
                <ng-container *ngTemplateOutlet="teamName; context: {$implicit: match.home_team}"/>
              </span>

              <span class="score" [class.score--pending]="match.home_score === null">
                @if (match.home_score !== null) {
                  {{ match.home_score }}<span class="score-separator">-</span>{{ match.away_score }}
                } @else {
                  {{ 'match.versus' | translate }}
                }
              </span>

              <span class="team" [title]="match.away_team?.name ?? ''">
                <ng-container *ngTemplateOutlet="teamName; context: {$implicit: match.away_team}"/>
              </span>

              <span class="status">
                @if (tone(match); as statusTone) {
                  <span class="chip chip--{{ statusTone }}">{{ statusLabel(match) }}</span>
                } @else if (showCompetition() && match.competition) {
                  <span class="context">{{ context(match) }}</span>
                }
              </span>
            </div>
          }
        </div>
      </div>
    }

    <ng-template #teamName let-team>
      @if (linkOf(team); as link) {
        <a class="team-link" [routerLink]="link">
          <span class="team-full">{{ team?.name ?? '—' }}</span>
          <span class="team-short">{{ team?.short_name ?? team?.code ?? team?.name ?? '—' }}</span>
        </a>
      } @else {
        <span class="team-full">{{ team?.name ?? '—' }}</span>
        <span class="team-short">{{ team?.short_name ?? team?.code ?? team?.name ?? '—' }}</span>
      }
    </ng-template>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-4);
      width: 100%;
    }

    .day {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-2);
    }

    .day-title {
      margin: 0;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--edas-muted-text-color);
    }

    .day-title::first-letter {
      text-transform: uppercase;
    }

    /* Hora · local · resultado · visitante · estado. El resultado queda siempre centrado
       porque las dos columnas de equipo miden lo mismo. */
    .match {
      display: grid;
      grid-template-columns: 4.5rem minmax(0, 1fr) 4rem minmax(0, 1fr) 7rem;
      align-items: center;
      gap: var(--edas-space-3);
      padding: 12px 16px;
      border-bottom: 1px solid var(--edas-surface-border-color);
      font-variant-numeric: tabular-nums;
    }

    .match:last-child {
      border-bottom: 0;
    }

    .time {
      display: flex;
      flex-direction: column;
      font-size: 0.875rem;
      color: var(--edas-muted-text-color);
    }

    .time--unconfirmed {
      font-size: 0.75rem;
    }

    .date {
      font-size: 0.75rem;
    }

    .team {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 600;
    }

    .team--home {
      text-align: end;
    }

    .team-link {
      color: inherit;
      text-decoration: none;
    }

    .team-link:hover {
      text-decoration: underline;
    }

    .team-short {
      display: none;
    }

    .score {
      text-align: center;
      font-weight: 700;
      white-space: nowrap;
    }

    .score-separator {
      margin-inline: 0.35em;
      color: var(--edas-muted-text-color);
    }

    .score--pending {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--edas-muted-text-color);
    }

    .status {
      display: flex;
      justify-content: flex-end;
      min-width: 0;
    }

    .context {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.75rem;
      color: var(--edas-muted-text-color);
    }

    .chip {
      padding: 2px 8px;
      border-radius: var(--edas-radius-pill);
      font-size: 0.75rem;
      font-weight: 600;
      white-space: nowrap;
      color: rgb(var(--chip-rgb));
      background: rgba(var(--chip-rgb), 0.16);
    }

    .chip--success {
      --chip-rgb: var(--edas-tone-success-rgb);
    }

    .chip--warning {
      --chip-rgb: var(--edas-tone-warning-rgb);
    }

    .chip--danger {
      --chip-rgb: var(--edas-tone-danger-rgb);
    }

    /* En estrecho no caben los nombres completos: nombre corto y el estado bajo el partido */
    @media (max-width: 640px) {
      .match {
        grid-template-columns: 3rem minmax(0, 1fr) 3rem minmax(0, 1fr);
        gap: var(--edas-space-2);
        padding: 12px;
      }

      .team-full {
        display: none;
      }

      .team-short {
        display: inline;
      }

      .status {
        grid-column: 1 / -1;
        justify-content: center;
      }

      .status:empty {
        display: none;
      }
    }
  `],
})
export class MatchListComponent {
  public readonly matches = input.required<readonly MatchListItem[]>();
  public readonly layout = input<'days' | 'dates'>('days');
  /** Zona horaria IANA (`Europe/Madrid`); sin indicar, la del dispositivo. */
  public readonly timeZone = input<string>();
  /** Adónde enlaza el nombre de un equipo; sin indicar (o si devuelve null), no enlaza. */
  public readonly teamLink = input<((team: TeamSummary) => string | null) | null>(null);
  /** En las filas sin distintivo de estado, muestra la competición y la jornada. */
  public readonly showCompetition = input(false);

  private readonly translate = inject(TranslateService);
  private readonly locale = inject(LocaleService);

  /** Partidos agrupados por día (o en un único grupo sin título con `layout="dates"`). */
  protected readonly days = computed<MatchDay[]>(() => {
    const matches = this.matches();
    const lang = this.locale.language();
    const timeZone = this.timeZone();

    if (this.layout() === 'dates') {
      return matches.length > 0 ? [{key: 'all', label: '', matches: [...matches]}] : [];
    }

    const days = new Map<string, MatchDay>();

    for (const match of matches) {
      const key = match.kickoff_at ? zonedDayKey(match.kickoff_at, timeZone) : 'undated';

      if (!days.has(key)) {
        days.set(key, {
          key,
          label: match.kickoff_at ? formatZoned(match.kickoff_at, lang, timeZone, LONG_DAY_FORMAT) : this.translate.instant('match.undated'),
          matches: [],
        });
      }

      days.get(key)!.matches.push(match);
    }

    return [...days.values()];
  });

  protected linkOf(team: TeamSummary | null): string | null {
    return team ? (this.teamLink()?.(team) ?? null) : null;
  }

  /** Hora del partido; «Por confirmar» si la fecha es solo orientativa. */
  protected time(match: MatchListItem): string {
    if (!match.kickoff_at) {
      return '—';
    }

    return match.kickoff_confirmed
      ? formatZoned(match.kickoff_at, this.locale.language(), this.timeZone(), TIME_FORMAT)
      : this.translate.instant('match.time-tbc');
  }

  protected date(match: MatchListItem): string {
    return match.kickoff_at ? formatZoned(match.kickoff_at, this.locale.language(), this.timeZone(), SHORT_DAY_FORMAT) : '';
  }

  protected tone(match: MatchListItem): 'success' | 'warning' | 'danger' | null {
    return STATUS_TONE[match.status] ?? null;
  }

  /** «En juego · 30'», «Descanso», «Aplazado»… */
  protected statusLabel(match: MatchListItem): string {
    if (match.status !== 'playing') {
      return this.translate.instant(`enum.match-status.${match.status}`);
    }

    const label = this.translate.instant(match.period ? `enum.match-period.${match.period}` : 'enum.match-status.playing');
    const showMinute = match.minute !== null && match.period !== 'half_time' && match.period !== 'penalties';

    return showMinute ? `${label} · ${match.minute}'` : label;
  }

  /** «LaLiga · J12». */
  protected context(match: MatchListItem): string {
    const name = match.competition?.short_name ?? match.competition?.name ?? '';
    const round = match.round != null ? this.translate.instant('match.round-short', {number: match.round}) : '';

    return [name, round].filter(Boolean).join(' · ');
  }
}
