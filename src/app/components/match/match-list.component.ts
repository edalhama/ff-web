import {NgTemplateOutlet} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, inject, input, output} from '@angular/core';
import {RouterLink} from '@angular/router';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {LocaleService} from '@edas/ng/shared/services/locale.service';
import {IconComponent} from '@edas/ng/wrapper/components/icon/icon.component';
import {formatZoned, LONG_DAY_FORMAT, SHORT_DAY_FORMAT, TIME_FORMAT, zonedDayKey} from '../../shared/dates/zoned-dates';
import {MATCH_STATUS_TONE, matchStatusLabel} from '../../shared/matches/matches';
import {MatchPeriod, MatchStatus} from '../../shared/models/match';
import {TeamSummary} from '../../shared/models/team';
import {TeamCrestComponent} from '../team/team-crest.component';

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
  /** Estadio y designación, para la línea de detalles del panel (`showDetails`); la parte pública no da el id. */
  venue?: {id?: number; name: string} | null;
  neutral_venue?: boolean;
  referees?: Array<{role: string; id: number; name: string | null; short_name: string | null}>;
}

/** Partidos de un mismo día. */
interface MatchDay {
  key: string;
  label: string;
  matches: MatchListItem[];
}

/**
 * Lista de partidos: hora, local, resultado, visitante y estado.
 *
 * - `layout="days"` (por defecto): agrupados por día, para una jornada.
 * - `layout="dates"`: una sola lista con la fecha en cada fila, para partidos sueltos de
 *   varias jornadas (los últimos de un equipo).
 *
 * Las horas se pintan en `timeZone`; sin ella, en la del dispositivo. Con `teamLink`, el
 * nombre de cada equipo enlaza a donde diga. Con `showDetails`, cada partido lleva debajo su
 * estadio (y si es campo neutral) y su árbitro principal, que abren sus fichas del panel.
 *
 * Con `interactive`, cada fila se elige con ratón y teclado y avisa por `matchClick` (en el
 * panel, para abrir la ficha del partido). Sin él, las filas no responden: así las usa la parte
 * pública. Los enlaces y botones de dentro de la fila (equipo, estadio, árbitro) hacen lo suyo
 * y no eligen la fila.
 */
@Component({
  selector: 'app-match-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, NgTemplateOutlet, RouterLink, TeamCrestComponent, TranslatePipe],
  template: `
    @for (day of days(); track day.key) {
      <div class="day">
        @if (day.label) {
          <h3 class="day-title">{{ day.label }}</h3>
        }

        <div class="ff-panel">
          @for (match of day.matches; track match.id) {
            <div
              class="match"
              [class.match--dated]="layout() === 'dates'"
              [class.match--interactive]="interactive()"
              [attr.role]="interactive() ? 'button' : null"
              [attr.tabindex]="interactive() ? 0 : null"
              [attr.aria-label]="interactive() ? rowLabel(match) : null"
              (click)="select($event, match)"
              (keydown.enter)="selectByKey($event, match)"
              (keydown.space)="selectByKey($event, match)"
            >
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

              @if (showDetails() && (match.venue || mainReferee(match))) {
                <span class="details">
                  @if (match.venue; as venue) {
                    @if (venue.id; as venueId) {
                      <button type="button" class="detail detail--link" (click)="openVenue(venueId)">
                        <Icon icon="map-pin" size="xs"/>
                        {{ venue.name }}
                      </button>
                    } @else {
                      <span class="detail">
                        <Icon icon="map-pin" size="xs"/>
                        {{ venue.name }}
                      </span>
                    }
                    @if (match.neutral_venue) {
                      <span class="chip chip--warning">{{ 'match.neutral-venue' | translate }}</span>
                    }
                  }
                  @if (mainReferee(match); as referee) {
                    <button type="button" class="detail detail--link" (click)="openReferee(referee.id)">
                      <Icon icon="flag" size="xs"/>
                      {{ referee.name }}
                    </button>
                    @if (otherReferees(match); as others) {
                      <span class="detail detail--muted">{{ others }}</span>
                    }
                  }
                </span>
              }
            </div>
          }
        </div>
      </div>
    }

    <ng-template #teamName let-team>
      @if (linkOf(team); as link) {
        <a class="team-link" [routerLink]="link">
          <app-team-crest class="crest" [src]="team?.crest" [size]="22" [reserve]="hasCrests()"/>
          <span class="team-full">{{ team?.name ?? '—' }}</span>
          <span class="team-short">{{ team?.short_name ?? team?.code ?? team?.name ?? '—' }}</span>
        </a>
      } @else {
        <app-team-crest class="crest" [src]="team?.crest" [size]="22" [reserve]="hasCrests()"/>
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

    /* Filas que abren la ficha del partido (con interactive) */
    .match--interactive {
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }

    .match--interactive:hover,
    .match--interactive:focus-visible {
      background: rgba(var(--edas-tone-neutral-rgb), var(--edas-soft-alpha));
    }

    .match--interactive:focus-visible {
      outline: 2px solid rgb(var(--edas-tone-primary-rgb));
      outline-offset: -2px;
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

    /* El escudo va pegado al nombre, por el lado del marcador: a la derecha en el local */
    .crest {
      margin-inline-start: 0.5em;
    }

    .team:not(.team--home) .crest {
      order: -1;
      margin-inline: 0 0.5em;
    }

    .team-link {
      display: inline-flex;
      align-items: center;
      max-width: 100%;
      color: inherit;
      text-decoration: none;
    }

    .team-link .team-full,
    .team-link .team-short {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .team:not(.team--home) .team-link .crest {
      order: 0;
    }

    .team--home .team-link .crest {
      order: 1;
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

    /* Estadio y árbitro, bajo el partido */
    .details {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--edas-space-2) var(--edas-space-3);
      grid-column: 1 / -1;
      font-size: 0.75rem;
      color: var(--edas-muted-text-color);
    }

    .detail {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      min-width: 0;
    }

    .detail--link {
      padding: 0;
      border: 0;
      background: none;
      font: inherit;
      color: inherit;
      cursor: pointer;
    }

    .detail--link:hover {
      color: var(--edas-text-color);
      text-decoration: underline;
    }

    .detail--muted {
      opacity: 0.8;
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
  /** Bajo cada partido, su estadio y su árbitro principal (solo en el panel). */
  public readonly showDetails = input(false);
  /** Texto extra junto a la competición de cada fila («VAR», en los partidos de un árbitro); null, nada. */
  public readonly roleOf = input<((match: MatchListItem) => string | null) | null>(null);
  /** Filas elegibles con ratón y teclado: avisan por `matchClick`. Solo en el panel. */
  public readonly interactive = input(false);

  /** Fila elegida (solo con `interactive`). */
  public readonly matchClick = output<MatchListItem>();

  /** Si algún equipo trae escudo, todos reservan su hueco para que las columnas sigan alineadas. */
  protected readonly hasCrests = computed(() => this.matches().some((match) => match.home_team?.crest || match.away_team?.crest));

  private readonly translate = inject(TranslateService);
  private readonly locale = inject(LocaleService);
  private readonly stack = inject(ModalStackService);

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
    return MATCH_STATUS_TONE[match.status] ?? null;
  }

  /** «En juego · 30'», «Descanso», «Aplazado»… */
  protected statusLabel(match: MatchListItem): string {
    return matchStatusLabel(match, (key) => this.translate.instant(key));
  }

  /** «LaLiga · J12», y el texto extra de `roleOf` si lo hay («LaLiga · VAR»). */
  protected context(match: MatchListItem): string {
    const name = match.competition?.short_name ?? match.competition?.name ?? '';
    const round = match.round != null ? this.translate.instant('match.round-short', {number: match.round}) : '';

    return [name, round, this.roleOf()?.(match)].filter(Boolean).join(' · ');
  }

  /** El árbitro principal, si la designación lo trae. */
  protected mainReferee(match: MatchListItem): {id: number; name: string} | null {
    const referee = match.referees?.find((each) => each.role === 'referee');

    return referee?.name ? {id: referee.id, name: referee.name} : null;
  }

  /** «VAR: Hernández Hernández · 4.º: González Fuertes». */
  protected otherReferees(match: MatchListItem): string | null {
    const others = (match.referees ?? [])
      .filter((each) => each.role !== 'referee' && (each.short_name || each.name))
      .map((each) => `${this.translate.instant(`enum.referee-role-short.${each.role}`)}: ${each.short_name ?? each.name}`);

    return others.length > 0 ? others.join(' · ') : null;
  }

  /** Clic en la fila. Los de un enlace o un botón de dentro (equipo, estadio, árbitro) no la eligen. */
  protected select(event: Event, match: MatchListItem): void {
    const control = (event.target as HTMLElement | null)?.closest('a, button');
    const fromInside = !!control && (event.currentTarget as HTMLElement).contains(control);

    if (this.interactive() && !fromInside) {
      this.matchClick.emit(match);
    }
  }

  /** Intro o espacio sobre la fila; los que llegan desde un botón de dentro son de ese botón. */
  protected selectByKey(event: Event, match: MatchListItem): void {
    if (this.interactive() && event.target === event.currentTarget) {
      // Que el espacio no desplace la página
      event.preventDefault();
      this.matchClick.emit(match);
    }
  }

  /** «Barcelona - Sevilla», para los lectores de pantalla de una fila elegible. */
  protected rowLabel(match: MatchListItem): string {
    return this.translate.instant('match.open', {home: match.home_team?.name ?? '—', away: match.away_team?.name ?? '—'});
  }

  protected openVenue(id: number): void {
    this.stack.push({modalKey: 'venue', section: 'edit', id: String(id)});
  }

  protected openReferee(id: number): void {
    this.stack.push({modalKey: 'referee', section: 'edit', id: String(id)});
  }
}
