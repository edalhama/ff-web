import {ChangeDetectionStrategy, Component, OnInit, computed, inject, signal} from '@angular/core';
import {ListFilter, ListFilterValues} from '@edas/ng/components/layout/list/list-filters';
import {EdasListColumn} from '@edas/ng/components/layout/list/list-view';
import {EdasListParams, ListComponent} from '@edas/ng/components/layout/list/list.component';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {LoaderComponent} from '@edas/ng/wrapper/components/loader/loader.component';
import {TranslatePipe} from '@ngx-translate/core';
import {PlayerCardComponent} from '../../../components/player/player-card.component';
import {PlayerNameCellComponent, PlayerPositionCellComponent, PlayerStatusCellComponent, PlayerValueCellComponent} from '../../../components/player/player-cells.component';
import {Competition, isDefaultCompetition} from '../../../shared/models/competition';
import {PLAYER_LIST_STATUSES, PLAYER_POSITIONS, playerModalId, PlayerRow} from '../../../shared/models/player';
import {CompetitionApiService} from '../../../shared/services/api/competition-api.service';
import {PlayerApiService} from '../../../shared/services/api/player-api.service';

/** Columnas de la vista de tabla. Las ordenables están en la lista blanca de la API. */
const PLAYER_COLUMNS: readonly EdasListColumn<PlayerRow>[] = [
  {key: 'name', label: 'team.squad-player', sortable: true, sticky: true, cell: PlayerNameCellComponent},
  {key: 'team', label: 'player.team', sortable: true, value: (row) => row.team.name ?? '—'},
  {key: 'position', label: 'team.squad-position', sortable: true, cell: PlayerPositionCellComponent},
  {key: 'country', label: 'team.squad-country', sortable: true, value: (row) => row.player.country?.name ?? '—', hideOn: 'mobile'},
  {key: 'birth_date', label: 'player.birth-date', sortable: true, format: 'date', value: (row) => row.player.birth_date, hideOn: 'mobile'},
  {key: 'market_value', label: 'player.market-value', sortable: true, align: 'end', cell: PlayerValueCellComponent, hideOn: 'mobile'},
  {key: 'status', label: 'team.squad-status', sortable: true, cell: PlayerStatusCellComponent},
];

/**
 * Listado de jugadores del panel, siempre de una competición: los de la plantilla de su
 * temporada actual (o la más reciente), una fila por ficha. Se filtra además por equipo,
 * posición y estado. No tiene alta: los jugadores los crea la sincronización.
 */
@Component({
  selector: 'app-players-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, ListComponent, LoaderComponent, TranslatePipe],
  template: `
    @if (competitions(); as list) {
      @if (list.length > 0) {
        <edas-list
          [component]="card"
          [fetchData]="fetchPlayers"
          [filters]="filters()"
          [columns]="columns"
          [reload]="playerApi.refreshList$"
          orderBy="name"
          filtersStorageKey="players"
          (rowClick)="open($event)"
        />
      } @else {
        <edas-app-card icon="trophy" [iconSize]="48" [title]="'player.no-competitions-title' | translate" [description]="'player.no-competitions' | translate"/>
      }
    } @else {
      <edas-loader/>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `],
})
export class PlayersScreenComponent implements OnInit {
  protected readonly playerApi = inject(PlayerApiService);
  private readonly competitionApi = inject(CompetitionApiService);
  private readonly stack = inject(ModalStackService);

  protected readonly card = PlayerCardComponent;
  protected readonly columns = PLAYER_COLUMNS;

  /** `null` mientras cargan. Sin competiciones no se puede listar nada. */
  protected readonly competitions = signal<Competition[] | null>(null);

  /**
   * Filtros. La competición no tiene «todas»: siempre hay una elegida. El de equipo depende de
   * ella: sus opciones son los equipos de su temporada, que llegan con la primera página.
   */
  protected readonly filters = computed(() => {
    const competitions = this.competitions() ?? [];
    const context = this.playerApi.listContext();
    const fallback = competitions.find(isDefaultCompetition) ?? competitions[0];

    return (values: ListFilterValues): readonly ListFilter[] => {
      const teams = context && context.competitionId === values['competition_id'] ? context.teams : [];

      return [
        {
          key: 'competition_id',
          label: 'player.competition',
          defaultValue: fallback?.id ?? null,
          labelTranslate: false,
          options: competitions.map((competition) => ({value: competition.id, label: competition.name ?? `#${competition.id}`})),
        },
        ...(teams.length > 0
          ? [
              {
                key: 'team_id',
                label: 'player.team',
                defaultValue: null,
                options: [{value: null, label: 'player.filter-all-teams'}, ...teams.map((team) => ({value: team.id, label: team.name ?? `#${team.id}`}))],
              },
            ]
          : []),
        {
          key: 'position',
          label: 'team.squad-position',
          defaultValue: null,
          options: [{value: null, label: 'player.filter-all-positions'}, ...PLAYER_POSITIONS.map((position) => ({value: position, label: `enum.player-position.${position}`}))],
        },
        {
          key: 'status',
          label: 'team.squad-status',
          defaultValue: null,
          options: [{value: null, label: 'player.filter-all-statuses'}, ...PLAYER_LIST_STATUSES.map((status) => ({value: status, label: `player.filter-status.${status}`}))],
        },
      ];
    };
  });

  protected readonly fetchPlayers = (params: EdasListParams) => this.playerApi.list(params);

  public ngOnInit(): void {
    // Las competiciones caben en una página: son unas pocas
    this.competitionApi
      .list({perPage: 100, orderBy: 'position', order: 'ASC'})
      .then((page) => this.competitions.set(page.data as Competition[]))
      // El aviso lo da el interceptor
      .catch(() => this.competitions.set([]));
  }

  /** Fila de la tabla: lo mismo que la tarjeta, la ficha del jugador en la competición del listado. */
  protected open(row: PlayerRow): void {
    const competitionId = this.playerApi.listContext()?.competitionId ?? null;

    this.stack.push({modalKey: 'player', section: 'info', id: playerModalId(row.player.id, competitionId)});
  }
}
