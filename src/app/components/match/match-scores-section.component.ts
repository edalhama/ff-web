import {ChangeDetectionStrategy, Component, computed, inject, input, signal} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {EdasListMemoryOptions} from '@edas/ng/components/layout/list/list-memory';
import {EdasListColumn} from '@edas/ng/components/layout/list/list-view';
import {ListComponent} from '@edas/ng/components/layout/list/list.component';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {PickerComponent} from '@edas/ng/wrapper/components/picker/picker.component';
import {EdasPickerOption} from '@edas/ng/wrapper/components/picker/picker.types';
import {MatchDetail, MatchScoreRow} from '../../shared/models/match';
import {playerModalId} from '../../shared/models/player';
import {TeamSummary} from '../../shared/models/team';
import {PlayerNameCellComponent, PlayerPositionCellComponent} from '../player/player-cells.component';
import {TeamCrestComponent} from '../team/team-crest.component';
import {MatchScoreCardComponent} from './match-score-card.component';
import {MatchPlayerRoleCellComponent, MatchScoreBadgesCellComponent} from './match-score-cells.component';

/** Columnas de la vista de tabla; se ordenan en memoria con `SCORE_LIST_OPTIONS.sort`. */
const SCORE_COLUMNS: readonly EdasListColumn<MatchScoreRow>[] = [
  {key: 'name', label: 'team.squad-player', sortable: true, sticky: true, cell: PlayerNameCellComponent},
  {key: 'position', label: 'team.squad-position', cell: PlayerPositionCellComponent, hideOn: 'mobile'},
  {key: 'role', label: 'match.role', cell: MatchPlayerRoleCellComponent},
  {key: 'minutes', label: 'match.minutes', sortable: true, align: 'end', value: (row) => row.minutes_played ?? '—'},
  {key: 'score', label: 'match.score', sortable: true, align: 'end', value: (row) => row.score?.raw_value ?? '—'},
  {key: 'points', label: 'match.points', sortable: true, align: 'end', value: (row) => row.score?.points ?? '—'},
  {key: 'badges', label: 'match.badges', cell: MatchScoreBadgesCellComponent},
];

const SCORE_LIST_OPTIONS: EdasListMemoryOptions<MatchScoreRow> = {
  sort: {
    name: (row) => row.player.name,
    minutes: (row) => row.minutes_played,
    // Por la nota numérica: las que no lo son («SC») van con las que no hay, al final
    score: (row) => row.score?.value,
    points: (row) => row.score?.points,
  },
};

/** Los jugadores de un equipo con la nota del sistema elegido. */
interface TeamScores {
  key: 'home' | 'away';
  team: TeamSummary | null;
  rows: MatchScoreRow[];
}

/**
 * Notas de un partido (sección `scores` del modal `match`): se elige un sistema de puntuación
 * de la competición (de entrada, el suyo por defecto) y se ve, equipo a equipo, cada jugador
 * con su papel, sus minutos, su nota, sus puntos y sus distinciones en ese sistema. Quien no
 * tiene nota en él sale con «—». Cada jugador abre su ficha en la competición del partido.
 *
 * Es de solo lectura: las notas llegan por la sincronización.
 */
@Component({
  selector: 'app-match-scores-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, ListComponent, PickerComponent, TeamCrestComponent, TranslatePipe],
  template: `
    @if (data(); as detail) {
      @if (detail.scoring_systems.length > 0) {
        <edas-picker
          class="system-picker"
          label="match.scoring-system"
          [items]="systemOptions()"
          [value]="systemId()"
          [labelTranslate]="false"
          [searchable]="false"
          (valueChange)="chosenSystemId.set($event)"
        />
      } @else {
        <p class="note">{{ 'match.no-scoring-systems' | translate }}</p>
      }

      @if (detail.players.length > 0) {
        <!-- orderBy vacío: sin columna elegida se respeta el orden de la API (titulares, suplentes, no convocados) -->
        @for (side of teams(); track side.key) {
          <section class="team">
            <h3 class="team-title">
              <app-team-crest [src]="side.team?.crest" [size]="24"/>
              {{ side.team?.name ?? '—' }}
            </h3>

            @if (side.rows.length > 0) {
              <edas-list
                [component]="card"
                [items]="side.rows"
                [itemsOptions]="listOptions"
                [columns]="columns"
                [showSearch]="false"
                orderBy=""
                filtersStorageKey="match-scores"
                (rowClick)="openPlayer($event)"
              />
            } @else {
              <p class="note">{{ 'match.no-team-players' | translate }}</p>
            }
          </section>
        }
      } @else {
        <edas-app-card icon="users" [iconSize]="48" [title]="'match.no-players-title' | translate" [description]="'match.no-players' | translate"/>
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

    .system-picker {
      max-width: 24rem;
    }

    .team {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-2);
    }

    .team-title {
      display: flex;
      align-items: center;
      gap: var(--edas-space-2);
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .note {
      margin: 0;
      font-size: 0.875rem;
      color: var(--edas-muted-text-color);
    }
  `],
})
export class MatchScoresSectionComponent {
  /** Ficha del partido; la carga el modal. */
  public readonly data = input<MatchDetail>();

  private readonly stack = inject(ModalStackService);

  protected readonly card = MatchScoreCardComponent;
  protected readonly columns = SCORE_COLUMNS;
  protected readonly listOptions = SCORE_LIST_OPTIONS;

  /** Sistema elegido en el selector; null hasta que se elige uno. */
  protected readonly chosenSystemId = signal<number | null>(null);

  /** El elegido o, si no, el de la competición por defecto (o el primero). */
  protected readonly systemId = computed<number | null>(() => {
    const systems = this.data()?.scoring_systems ?? [];
    const chosen = this.chosenSystemId();

    if (chosen !== null && systems.some((system) => system.id === chosen)) {
      return chosen;
    }

    return (systems.find((system) => system.is_default) ?? systems[0])?.id ?? null;
  });

  protected readonly systemOptions = computed<EdasPickerOption<number>[]>(() =>
    (this.data()?.scoring_systems ?? []).map((system) => ({value: system.id, label: system.name ?? system.code})),
  );

  protected readonly teams = computed<TeamScores[]>(() => {
    const detail = this.data();
    if (!detail) {
      return [];
    }

    const systemId = this.systemId();
    const rowsOf = (teamId: number | undefined): MatchScoreRow[] =>
      detail.players
        .filter((player) => player.team_id === teamId)
        .map((player) => ({
          ...player,
          score: player.scores.find((score) => score.scoring_system_id === systemId) ?? null,
          competitionId: detail.match.competition.id,
        }));

    return [
      {key: 'home', team: detail.match.home_team, rows: rowsOf(detail.match.home_team?.id)},
      {key: 'away', team: detail.match.away_team, rows: rowsOf(detail.match.away_team?.id)},
    ];
  });

  /** Fila de la tabla: lo mismo que la tarjeta, la ficha del jugador en la competición del partido. */
  protected openPlayer(row: MatchScoreRow): void {
    this.stack.push({modalKey: 'player', section: 'info', id: playerModalId(row.player.id, row.competitionId)});
  }
}
