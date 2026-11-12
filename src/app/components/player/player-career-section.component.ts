import {ChangeDetectionStrategy, Component, computed, inject, input, signal} from '@angular/core';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {BadgeComponent} from '@edas/ng/wrapper/components/badge/badge.component';
import {LocalizedDatePipe} from '@edas/ng/wrapper/pipes/localized-date.pipe';
import {ClubRef, PlayerCard, PlayerValuePoint} from '../../shared/models/player';
import {formatMoney} from '../../shared/players/money';

/** Lienzo de la gráfica, en unidades del `viewBox`: se estira al ancho de la sección. */
const WIDTH = 600;
const HEIGHT = 180;
const PAD = 6;

interface ChartPoint {
  x: number;
  y: number;
  point: PlayerValuePoint;
}

/**
 * Trayectoria del jugador según Transfermarkt (sección `career` del modal `player`): cómo ha
 * cambiado su valor de mercado y su historial de traspasos, cesiones y vueltas de cesión. Es de
 * solo lectura: llega con la sincronización de historiales (`history`), unos pocos jugadores
 * cada vez, así que puede tardar unos días en aparecer.
 */
@Component({
  selector: 'app-player-career-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, BadgeComponent, LocalizedDatePipe, TranslatePipe],
  template: `
    @if (data(); as player) {
      @if (player.value_history.length === 0 && player.transfers.length === 0) {
        <edas-app-card icon="trending-up" [iconSize]="48" [title]="'player.no-career-title' | translate" [description]="'player.no-career' | translate"/>
      }

      @if (chart(); as view) {
        <h3 class="block-title">{{ 'player.value-history' | translate }}</h3>
        <div class="ff-panel chart-panel">
          <div class="headline">
            <span class="headline-value">{{ money(view.last.point.value) }}</span>
            <span class="headline-note">
              {{ view.last.point.date | localizedDate: 'd MMM y' }}
              @if (view.peak.point.value > view.last.point.value) {
                · {{ 'player.value-peak' | translate: {value: money(view.peak.point.value)} }} ({{ view.peak.point.date | localizedDate: 'MMM y' }})
              }
            </span>
          </div>

          <div class="plot" data-no-section-swipe (pointermove)="hover($event)" (pointerleave)="active.set(null)">
            <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" preserveAspectRatio="none" role="img" [attr.aria-label]="'player.value-history' | translate">
              @for (line of view.grid; track line.y) {
                <line class="grid" [attr.x1]="0" [attr.x2]="width" [attr.y1]="line.y" [attr.y2]="line.y"/>
              }
              <path class="area" [attr.d]="view.area"/>
              <path class="line" [attr.d]="view.line"/>
              @if (active(); as current) {
                <line class="crosshair" [attr.x1]="current.x" [attr.x2]="current.x" [attr.y1]="0" [attr.y2]="height"/>
              }
            </svg>
            @for (line of view.grid; track line.y) {
              <!-- El cero no se rotula: la serie pasa por encima y la base ya es el eje -->
              @if (line.y < height) {
                <span class="tick" [style.top.%]="(line.y / height) * 100">{{ line.label }}</span>
              }
            }
            @if (active(); as current) {
              <span class="dot" [style.left.%]="(current.x / width) * 100" [style.top.%]="(current.y / height) * 100"></span>
              <div class="tooltip" [class.flip]="current.x > width / 2" [style.left.%]="(current.x / width) * 100">
                <strong>{{ money(current.point.value) }}</strong>
                <span>{{ current.point.date | localizedDate: 'd MMM y' }}</span>
                @if (clubName(current.point.team); as club) {
                  <span>{{ club }}</span>
                }
                @if (current.point.age != null) {
                  <span>{{ 'player.age' | translate: {age: current.point.age} }}</span>
                }
              </div>
            }
          </div>
          <div class="x-axis">
            <span>{{ view.first.point.date | localizedDate: 'MMM y' }}</span>
            <span>{{ view.last.point.date | localizedDate: 'MMM y' }}</span>
          </div>

          <details class="table-view">
            <summary>{{ 'player.value-table' | translate }}</summary>
            <div class="ff-panel--scroll">
              <table class="ff-table">
                <thead>
                  <tr>
                    <th scope="col">{{ 'player.transfer-date' | translate }}</th>
                    <th scope="col">{{ 'player.team' | translate }}</th>
                    <th scope="col" class="number">{{ 'team.squad-age' | translate }}</th>
                    <th scope="col" class="number">{{ 'player.market-value' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (point of reversedValues(); track point.date) {
                    <tr>
                      <td>{{ point.date | localizedDate: 'd MMM y' }}</td>
                      <td>{{ clubName(point.team) ?? '—' }}</td>
                      <td class="number">{{ point.age ?? '—' }}</td>
                      <td class="number">{{ money(point.value) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </details>
        </div>
      }

      @if (player.transfers.length > 0) {
        <h3 class="block-title">{{ 'player.transfers' | translate }}</h3>
        <div class="ff-panel ff-panel--scroll" data-no-section-swipe>
          <table class="ff-table">
            <thead>
              <tr>
                <th scope="col">{{ 'player.transfer-date' | translate }}</th>
                <th scope="col">{{ 'player.transfer-move' | translate }}</th>
                <th scope="col">{{ 'player.transfer-type' | translate }}</th>
                <th scope="col" class="number">{{ 'player.transfer-fee' | translate }}</th>
                <th scope="col" class="number">{{ 'player.market-value' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              @for (transfer of player.transfers; track transfer.id) {
                <tr [class.pending]="transfer.pending">
                  <td class="nowrap">{{ transfer.date | localizedDate: 'd MMM y' }}</td>
                  <td>
                    <span class="move">{{ clubName(transfer.from) ?? '—' }} → {{ clubName(transfer.to) ?? '—' }}</span>
                    @if (transfer.contract_until; as until) {
                      <span class="sub">{{ 'player.contract-until' | translate }} {{ until | localizedDate: 'MMM y' }}</span>
                    }
                  </td>
                  <td>
                    {{ 'enum.transfer-type.' + transfer.type | translate }}
                    @if (transfer.pending) {
                      <edas-badge appearance="neutral" label="player.transfer-pending" size="s"/>
                    }
                  </td>
                  <td class="number">{{ money(transfer.fee, transfer.fee_currency) }}</td>
                  <td class="number">{{ money(transfer.market_value) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (player.value_history.length > 0 || player.transfers.length > 0) {
        <p class="source">
          {{ 'player.career-source' | translate }}
          @if (player.transfermarkt?.profile_url; as url) {
            · <a [href]="url" target="_blank" rel="noopener noreferrer">{{ 'player.open-transfermarkt' | translate }}</a>
          }
        </p>
      }
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-4);
      width: 100%;
    }

    .block-title {
      margin: var(--edas-space-2) 0 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .chart-panel {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-3);
      padding: 16px;
    }

    .headline {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: var(--edas-space-2);
    }

    .headline-value {
      font-size: 1.5rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }

    .headline-note,
    .x-axis,
    .tick,
    .sub,
    .source {
      font-size: 0.75rem;
      color: var(--edas-muted-text-color);
    }

    .plot {
      position: relative;
      height: 180px;
      touch-action: pan-y;
    }

    svg {
      display: block;
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    .grid,
    .crosshair {
      stroke: var(--edas-surface-border-color);
      stroke-width: 1;
      vector-effect: non-scaling-stroke;
    }

    .crosshair {
      stroke: var(--edas-muted-text-color);
    }

    .line {
      fill: none;
      stroke: rgb(var(--edas-tone-primary-rgb));
      stroke-width: 2;
      stroke-linejoin: round;
      stroke-linecap: round;
      vector-effect: non-scaling-stroke;
    }

    .area {
      fill: rgba(var(--edas-tone-primary-rgb), 0.1);
    }

    /* Marcas del eje: sobre su línea, a la izquierda, sin tapar la serie */
    .tick {
      position: absolute;
      left: 0;
      transform: translateY(-100%);
      padding: 0 2px;
      pointer-events: none;
    }

    .dot {
      position: absolute;
      width: 10px;
      height: 10px;
      margin: -5px 0 0 -5px;
      border-radius: 50%;
      background: rgb(var(--edas-tone-primary-rgb));
      box-shadow: 0 0 0 2px var(--edas-surface-elevated-color);
      pointer-events: none;
    }

    .tooltip {
      position: absolute;
      top: 0;
      z-index: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-left: 10px;
      padding: 6px 8px;
      border: 1px solid var(--edas-surface-border-color);
      border-radius: var(--edas-radius-md);
      background: var(--edas-surface-elevated-color);
      font-size: 0.75rem;
      color: var(--edas-muted-text-color);
      white-space: nowrap;
      pointer-events: none;
    }

    .tooltip.flip {
      margin-left: -10px;
      transform: translateX(-100%);
    }

    .tooltip strong {
      font-size: 0.875rem;
      color: var(--edas-text-color);
      font-variant-numeric: tabular-nums;
    }

    .x-axis {
      display: flex;
      justify-content: space-between;
    }

    .table-view summary {
      cursor: pointer;
      font-size: 0.8125rem;
      color: var(--edas-muted-text-color);
    }

    .table-view[open] summary {
      margin-bottom: var(--edas-space-2);
    }

    .number {
      text-align: end;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .nowrap {
      white-space: nowrap;
    }

    .move {
      display: block;
      font-weight: 600;
    }

    .sub {
      display: block;
    }

    tr.pending td {
      color: var(--edas-muted-text-color);
    }

    .source {
      margin: 0;
    }
  `],
})
export class PlayerCareerSectionComponent {
  /** Jugador abierto; lo carga el modal. */
  public readonly data = input<PlayerCard>();

  private readonly translate = inject(TranslateService);

  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;

  /** Punto bajo el puntero (el más cercano en el eje del tiempo). */
  protected readonly active = signal<ChartPoint | null>(null);

  /** Del más reciente al más antiguo, para la tabla. */
  protected readonly reversedValues = computed(() => [...(this.data()?.value_history ?? [])].reverse());

  /**
   * Geometría de la gráfica: el tiempo en horizontal y el valor en vertical, desde cero. Con un
   * solo punto no hay línea que pintar: solo el titular y la tabla.
   */
  protected readonly chart = computed(() => {
    const values = this.data()?.value_history ?? [];
    // Lee el idioma activo (signal) para que las marcas del eje cambien con él
    const lang = this.translate.currentLang();

    if (values.length === 0) {
      return null;
    }

    const times = values.map((point) => Date.parse(point.date));
    const start = times[0];
    const span = Math.max(times[times.length - 1] - start, 1);
    const max = Math.max(...values.map((point) => point.value), 1);

    const points: ChartPoint[] = values.map((point, index) => ({
      x: values.length === 1 ? WIDTH / 2 : ((times[index] - start) / span) * WIDTH,
      y: PAD + (1 - point.value / max) * (HEIGHT - PAD),
      point,
    }));

    const line = points.map((each, index) => `${index === 0 ? 'M' : 'L'}${each.x.toFixed(1)},${each.y.toFixed(1)}`).join(' ');
    const last = points[points.length - 1];

    return {
      points,
      line,
      area: `${line} L${last.x.toFixed(1)},${HEIGHT} L${points[0].x.toFixed(1)},${HEIGHT} Z`,
      first: points[0],
      last,
      peak: points.reduce((best, each) => (each.point.value > best.point.value ? each : best), points[0]),
      // Tres marcas: el máximo, la mitad y cero
      grid: [1, 0.5, 0].map((share) => ({y: PAD + (1 - share) * (HEIGHT - PAD), label: formatMoney(max * share, lang)})),
    };
  });

  protected money(value: number | null, currency: string | null = 'EUR'): string {
    return formatMoney(value, this.translate.currentLang(), currency ?? 'EUR');
  }

  /** Nuestro equipo si existe aquí; si no, el nombre que da Transfermarkt. */
  protected clubName(club: ClubRef | null): string | null {
    return club?.team?.name ?? club?.name ?? null;
  }

  /** El punto más cercano al puntero en horizontal. */
  protected hover(event: PointerEvent): void {
    const view = this.chart();

    if (!view) {
      return;
    }

    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((event.clientX - box.left) / Math.max(box.width, 1)) * WIDTH;

    this.active.set(view.points.reduce((best, each) => (Math.abs(each.x - x) < Math.abs(best.x - x) ? each : best), view.points[0]));
  }
}
