import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';
import {RouterLink} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {IconComponent} from '@edas/ng/wrapper/components/icon/icon.component';
import {StandingRow} from '../../shared/models/standing';
import {TeamSummary} from '../../shared/models/team';

/**
 * Tabla de una clasificación. La franja de color de cada fila es la zona que ocupa (Champions,
 * descenso…), con su leyenda al pie.
 *
 * El equipo de cada fila puede enlazar a su página (`teamLink`) o, sin enlace, avisar cuando
 * se elige la fila (`interactive` + `teamSelected`): lo primero para la parte pública, lo
 * segundo para el panel.
 */
@Component({
  selector: 'app-standings-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, RouterLink, TranslatePipe],
  template: `
    <div class="ff-panel ff-panel--scroll" [class.compact]="compact()" data-no-section-swipe>
      <table class="ff-table">
        @if (caption(); as text) {
          <caption class="visually-hidden">{{ text }}</caption>
        }
        <thead>
          <tr>
            <th class="position" scope="col"><abbr [title]="'standing.position' | translate">#</abbr></th>
            <th class="sticky" scope="col">{{ 'standing.team' | translate }}</th>
            @for (column of columns; track column) {
              <th class="end" [class.wide-only]="isWideOnly(column)" scope="col"><abbr [title]="'standing.' + column | translate">{{ 'standing.' + column + '-short' | translate }}</abbr></th>
            }
            @if (showForm()) {
              <th class="wide-only" scope="col">{{ 'standing.form' | translate }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.team.id) {
            <tr
              [class.highlight]="row.team.id === highlightTeamId()"
              [attr.tabindex]="interactive() ? 0 : null"
              (click)="select(row)"
              (keydown.enter)="select(row)"
            >
              <td class="position" [attr.data-zone]="row.zone">
                {{ row.position }}
                @if (trend(row); as direction) {
                  <Icon class="trend trend--{{ direction }}" [icon]="direction === 'up' ? 'chevron-up' : 'chevron-down'" size="xs"/>
                }
              </td>
              <td class="sticky team">
                @if (linkOf(row.team); as link) {
                  <a class="team-link" [routerLink]="link">{{ row.team.name ?? '—' }}</a>
                } @else {
                  {{ row.team.name ?? '—' }}
                }
              </td>
              <td class="end">{{ row.played }}</td>
              <td class="end">{{ row.won }}</td>
              <td class="end">{{ row.drawn }}</td>
              <td class="end">{{ row.lost }}</td>
              <td class="end wide-only">{{ row.goals_for }}</td>
              <td class="end wide-only">{{ row.goals_against }}</td>
              <td class="end">{{ row.goal_difference > 0 ? '+' : '' }}{{ row.goal_difference }}</td>
              <td class="end points">{{ row.points }}</td>
              @if (showForm()) {
                <td class="wide-only">
                  <span class="form">
                    @for (result of results(row); track $index) {
                      <span class="result result--{{ result }}" [title]="'standing.result-' + result | translate">{{ 'standing.result-' + result + '-short' | translate }}</span>
                    }
                  </span>
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>

    @if (zones(); as legend) {
      <ul class="legend">
        @for (zone of legend; track zone) {
          <li><span class="legend-mark" [attr.data-zone]="zone"></span>{{ 'standing.zone-' + zone | translate }}</li>
        }
      </ul>
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-4);
      width: 100%;
    }

    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }

    .position {
      position: relative;
      width: 3.5rem;
      padding-inline-start: 18px;
      white-space: nowrap;
    }

    /* Franja de la zona, pegada al borde de la tabla */
    td.position[data-zone]::before {
      content: "";
      position: absolute;
      inset-block: 6px;
      inset-inline-start: 6px;
      width: 4px;
      border-radius: 2px;
      background: var(--zone-color);
    }

    .team {
      font-weight: 600;
      max-width: 14rem;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .team-link {
      color: inherit;
      text-decoration: none;
    }

    .team-link:hover {
      text-decoration: underline;
    }

    .highlight {
      --row-tint: rgba(var(--edas-tone-primary-rgb), var(--edas-soft-alpha));
      background: var(--row-tint);
    }

    .points {
      font-weight: 700;
    }

    .trend {
      margin-inline-start: 2px;
      vertical-align: middle;
    }

    .trend--up {
      color: var(--edas-success-color);
    }

    .trend--down {
      color: var(--edas-danger-color);
    }

    .form {
      display: inline-flex;
      gap: 3px;
    }

    .result {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.25rem;
      height: 1.25rem;
      border-radius: 4px;
      font-size: 0.6875rem;
      font-weight: 700;
      color: rgb(var(--result-rgb));
      background: rgba(var(--result-rgb), 0.16);
    }

    .result--W {
      --result-rgb: var(--edas-tone-success-rgb);
    }

    .result--D {
      --result-rgb: var(--edas-tone-neutral-rgb);
    }

    .result--L {
      --result-rgb: var(--edas-tone-danger-rgb);
    }

    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: var(--edas-space-2) var(--edas-space-4);
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: 0.8125rem;
      color: var(--edas-muted-text-color);
    }

    .legend li {
      display: inline-flex;
      align-items: center;
      gap: var(--edas-space-2);
    }

    .legend-mark {
      width: 4px;
      height: 14px;
      border-radius: 2px;
      background: var(--zone-color);
    }

    /* Versión resumida: sin goles a favor ni en contra, en cualquier ancho */
    .compact .wide-only {
      display: none;
    }

    .compact .ff-table th,
    .compact .ff-table td {
      padding-inline: 8px;
    }

    .compact .ff-table td:last-child,
    .compact .ff-table th:last-child {
      padding-inline-end: 14px;
    }

    /* Con más peso que la regla de arriba: el número no puede pisar la franja de la zona */
    .compact .ff-table th.position,
    .compact .ff-table td.position {
      width: 2.75rem;
      padding-inline-start: 18px;
    }

    /* En estrecho la tabla tiene que caber sin desplazarla: se quedan el balance, la
       diferencia de goles y los puntos; goles a favor, en contra y racha se ven en ancho. */
    @media (max-width: 640px) {
      .wide-only {
        display: none;
      }

      .ff-table th,
      .ff-table td {
        padding-inline: 5px;
      }

      /* Con más peso que la regla de arriba: el número no puede pisar la franja de la zona */
      .ff-table th.position,
      .ff-table td.position {
        width: 2.5rem;
        padding-inline-start: 16px;
      }

      .ff-table td:last-child,
      .ff-table th:last-child {
        padding-inline-end: 12px;
      }

      .team {
        max-width: 8.5rem;
      }
    }

    /* Color de cada zona. Las previas y los playoffs usan el de su zona, atenuado. */
    [data-zone^="champions"] {
      --zone-color: rgb(var(--edas-tone-info-rgb));
    }

    [data-zone^="europa"] {
      --zone-color: rgb(var(--edas-tone-warning-rgb));
    }

    [data-zone^="conference"],
    [data-zone^="promotion"] {
      --zone-color: rgb(var(--edas-tone-success-rgb));
    }

    [data-zone^="relegation"] {
      --zone-color: rgb(var(--edas-tone-danger-rgb));
    }

    [data-zone="champions_qualifying"] {
      --zone-color: rgba(var(--edas-tone-info-rgb), 0.5);
    }

    [data-zone="europa_qualifying"] {
      --zone-color: rgba(var(--edas-tone-warning-rgb), 0.5);
    }

    [data-zone="conference_qualifying"],
    [data-zone="promotion_playoff"] {
      --zone-color: rgba(var(--edas-tone-success-rgb), 0.5);
    }

    [data-zone="relegation_playoff"] {
      --zone-color: rgba(var(--edas-tone-danger-rgb), 0.5);
    }
  `],
})
export class StandingsTableComponent {
  public readonly rows = input.required<readonly StandingRow[]>();
  /** Columna con los últimos resultados: solo tiene sentido en la tabla general. */
  public readonly showForm = input(true);
  /** Resumida: solo el balance, la diferencia de goles y los puntos, para un hueco estrecho. */
  public readonly compact = input(false);
  /** Título de la tabla para lectores de pantalla y buscadores (no se ve). */
  public readonly caption = input<string>();
  /** Adónde enlaza el nombre de un equipo; sin indicar (o si devuelve null), no enlaza. */
  public readonly teamLink = input<((team: TeamSummary) => string | null) | null>(null);
  /** Filas elegibles con ratón y teclado: avisan por `teamSelected`. */
  public readonly interactive = input(false);
  /** Fila que se destaca (la del equipo cuya ficha se está viendo). */
  public readonly highlightTeamId = input<number | null>(null);

  public readonly teamSelected = output<TeamSummary>();

  /** Columnas numéricas, en el orden de la tabla: su clave i18n es `standing.<columna>`. */
  protected readonly columns = ['played', 'won', 'drawn', 'lost', 'goals-for', 'goals-against', 'goal-difference', 'points'] as const;

  /** Zonas presentes en la tabla, en el orden en que aparecen; null si no hay ninguna. */
  protected readonly zones = computed<string[] | null>(() => {
    const zones = [...new Set(this.rows().map((row) => row.zone).filter((zone): zone is string => !!zone))];

    return zones.length > 0 ? zones : null;
  });

  /** Columnas que solo se muestran con sitio (ver el @media de los estilos). */
  protected isWideOnly(column: string): boolean {
    return column === 'goals-for' || column === 'goals-against';
  }

  protected linkOf(team: TeamSummary): string | null {
    return this.teamLink()?.(team) ?? null;
  }

  protected select(row: StandingRow): void {
    if (this.interactive()) {
      this.teamSelected.emit(row.team);
    }
  }

  /** ¿Ha subido o bajado respecto a su puesto anterior? */
  protected trend(row: StandingRow): 'up' | 'down' | null {
    if (row.previous_position === null || row.previous_position === row.position) {
      return null;
    }

    return row.position < row.previous_position ? 'up' : 'down';
  }

  /** Últimos resultados (`WWDLW`), uno por casilla. */
  protected results(row: StandingRow): string[] {
    return (row.form ?? '').split('').filter((result) => 'WDL'.includes(result));
  }
}
