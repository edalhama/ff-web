import {NgTemplateOutlet} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {IconComponent} from '@edas/ng/wrapper/components/icon/icon.component';
import {eventMinute, MATCH_EVENT_ICON} from '../../shared/matches/matches';
import {MatchDetail, MatchEvent, MatchPeriod} from '../../shared/models/match';
import {MatchHeaderComponent} from './match-header.component';

/** Un evento listo para pintar en su lado de la cronología. */
interface TimelineEvent {
  event: MatchEvent;
  side: 'home' | 'away';
  minute: string;
  icon: string;
  tone: string;
  /** Línea principal: el protagonista («Sale: …» en un cambio). */
  main: string;
  /** Segunda línea: el asistente o el que entra; null si no hay. */
  related: string | null;
  /** Primer evento de su tramo: lleva encima el nombre del tramo. */
  periodStart: MatchPeriod | null;
}

/** Eventos cuyo jugador relacionado es el asistente; en el cambio es el que entra. */
const ASSISTED: ReadonlySet<string> = new Set(['goal', 'penalty_goal']);

/**
 * Cronología de un partido (sección `events` del modal `match`): la cabecera con el resultado
 * y, debajo, todos los eventos en orden, con el minuto en el centro, los del local a la
 * izquierda y los del visitante a la derecha. Es de solo lectura: llegan por la sincronización.
 */
@Component({
  selector: 'app-match-events-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, IconComponent, MatchHeaderComponent, NgTemplateOutlet, TranslatePipe],
  template: `
    @if (data(); as detail) {
      <app-match-header [match]="detail.match"/>

      @if (timeline().length > 0) {
        <ol class="ff-panel timeline">
          @for (item of timeline(); track item.event.id) {
            @if (item.periodStart; as period) {
              <li class="period">{{ 'enum.match-period.' + period | translate }}</li>
            }
            <li class="event event--{{ item.side }}">
              <span class="side side--home">
                @if (item.side === 'home') {
                  <ng-container [ngTemplateOutlet]="body" [ngTemplateOutletContext]="{$implicit: item}"/>
                }
              </span>
              <span class="minute">{{ item.minute }}</span>
              <span class="side side--away">
                @if (item.side === 'away') {
                  <ng-container [ngTemplateOutlet]="body" [ngTemplateOutletContext]="{$implicit: item}"/>
                }
              </span>
            </li>
          }
        </ol>
      } @else {
        <edas-app-card icon="list" [iconSize]="48" [title]="'match.no-events-title' | translate" [description]="'match.no-events' | translate"/>
      }
    }

    <ng-template #body let-item>
      <span class="icon tone--{{ item.tone }}" [title]="'enum.match-event-type.' + item.event.type | translate">
        <Icon [icon]="item.icon" size="sm" [ariaLabel]="'enum.match-event-type.' + item.event.type | translate"/>
      </span>
      <span class="text">
        <span class="main">{{ item.main }}</span>
        <span class="sub">
          {{ 'enum.match-event-type.' + item.event.type | translate }}
          @if (item.related) {
            · {{ item.related }}
          }
        </span>
      </span>
    </ng-template>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-4);
      width: 100%;
    }

    .timeline {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .period {
      padding: 6px 16px;
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      text-align: center;
      color: var(--edas-muted-text-color);
      background: rgba(var(--edas-tone-neutral-rgb), var(--edas-soft-alpha));
    }

    /* Local · minuto · visitante: el minuto queda en el centro porque los lados miden lo mismo */
    .event {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 3.5rem minmax(0, 1fr);
      align-items: center;
      gap: var(--edas-space-3);
      padding: 10px 16px;
      border-bottom: 1px solid var(--edas-surface-border-color);
    }

    .event:last-child {
      border-bottom: 0;
    }

    .side {
      display: flex;
      align-items: center;
      gap: var(--edas-space-2);
      min-width: 0;
    }

    /* El icono, pegado al minuto: a la derecha en el local */
    .side--home {
      flex-direction: row-reverse;
      text-align: end;
    }

    .minute {
      text-align: center;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }

    .icon {
      display: inline-flex;
      flex: none;
      color: rgb(var(--icon-rgb));
    }

    .tone--success {
      --icon-rgb: var(--edas-tone-success-rgb);
    }

    .tone--warning {
      --icon-rgb: var(--edas-tone-warning-rgb);
    }

    .tone--danger {
      --icon-rgb: var(--edas-tone-danger-rgb);
    }

    .tone--neutral {
      --icon-rgb: var(--edas-tone-neutral-rgb);
    }

    .text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .main {
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .sub {
      font-size: 0.8125rem;
      color: var(--edas-muted-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `],
})
export class MatchEventsSectionComponent {
  /** Ficha del partido; la carga el modal. */
  public readonly data = input<MatchDetail>();

  private readonly translate = inject(TranslateService);

  protected readonly timeline = computed<TimelineEvent[]>(() => {
    const detail = this.data();
    // Lee el idioma activo (signal) para que los textos cambien con él
    this.translate.currentLang();

    if (!detail) {
      return [];
    }

    // Lo que no es del local (incluido un equipo que no se conoce) va a la derecha
    const homeId = detail.match.home_team?.id ?? null;
    let period: MatchPeriod | null = null;

    return detail.events.map((event) => {
      const look = MATCH_EVENT_ICON[event.type] ?? {icon: 'circle', tone: 'neutral'};
      const player = event.player?.name ?? '—';
      const related = event.related_player?.name ?? null;
      const periodStart = event.period !== period ? event.period : null;
      period = event.period;

      return {
        event,
        side: event.team_id === homeId ? 'home' : 'away',
        minute: eventMinute(event),
        icon: look.icon,
        tone: look.tone,
        main: event.type === 'substitution' ? this.translate.instant('match.substitution-out', {name: player}) : player,
        related: related === null
          ? null
          : event.type === 'substitution'
            ? this.translate.instant('match.substitution-in', {name: related})
            : ASSISTED.has(event.type)
              ? this.translate.instant('match.assist', {name: related})
              : related,
        periodStart,
      };
    });
  });
}
