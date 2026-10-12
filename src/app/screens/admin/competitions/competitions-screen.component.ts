import {ChangeDetectionStrategy, Component, DestroyRef, inject} from '@angular/core';
import {GlobalActionBarService} from '@edas/ng/components/layout/action-bar/global-action-bar.service';
import {ListFilter} from '@edas/ng/components/layout/list/list-filters';
import {EdasListColumn} from '@edas/ng/components/layout/list/list-view';
import {EdasListParams, ListComponent} from '@edas/ng/components/layout/list/list.component';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {CompetitionCardComponent} from '../../../components/competition/competition-card.component';
import {CompetitionNameCellComponent, CompetitionTypeCellComponent} from '../../../components/competition/competition-cells.component';
import {ActiveBadgeCellComponent} from '../../../components/shared/active-badge-cell.component';
import {Competition, COMPETITION_TYPES} from '../../../shared/models/competition';
import {CompetitionApiService} from '../../../shared/services/api/competition-api.service';

/**
 * Filtros del listado. Viajan a la API con el nombre de su `key`; «todas» (`null`) no manda el
 * parámetro. Arranca en activas: las retiradas no se borran, se desactivan, y casi nunca hacen
 * falta.
 */
const COMPETITION_FILTERS: readonly ListFilter[] = [
  {
    key: 'active',
    label: 'common.status',
    defaultValue: 1,
    options: [
      {value: 1, label: 'competition.filter-active'},
      {value: 0, label: 'competition.filter-inactive'},
      {value: null, label: 'competition.filter-all'},
    ],
  },
  {
    key: 'type',
    label: 'competition.type',
    defaultValue: null,
    options: [
      {value: null, label: 'competition.filter-all-types'},
      ...COMPETITION_TYPES.map((type) => ({value: type, label: `enum.competition-type.${type}`})),
    ],
  },
];

/** Columnas de la vista de tabla. Las ordenables están en la lista blanca de la API. */
const COMPETITION_COLUMNS: readonly EdasListColumn<Competition>[] = [
  {key: 'name', label: 'competition.name', sortable: true, sticky: true, cell: CompetitionNameCellComponent},
  {key: 'type', label: 'competition.type', sortable: true, cell: CompetitionTypeCellComponent},
  {key: 'tier', label: 'competition.tier', sortable: true, align: 'end', hideOn: 'mobile'},
  {key: 'current_season', label: 'competition.current-season', value: (competition) => competition.current_season?.label ?? '—'},
  {key: 'seasons_count', label: 'competition.seasons', align: 'end', hideOn: 'mobile'},
  {key: 'position', label: 'competition.position', sortable: true, align: 'end', hideOn: 'mobile'},
  {key: 'active', label: 'common.status', cell: ActiveBadgeCellComponent},
  {key: 'updated_at', label: 'common.modified', format: 'date', hideOn: 'mobile'},
];

/** Listado de competiciones del panel, en tarjetas o en tabla. */
@Component({
  selector: 'app-competitions-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ListComponent],
  template: `
    <edas-list
      [component]="card"
      [fetchData]="fetchCompetitions"
      [filters]="filters"
      [columns]="columns"
      [reload]="competitionApi.refreshList$"
      orderBy="position"
      filtersStorageKey="competitions"
      (rowClick)="open($event)"
    />
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `],
})
export class CompetitionsScreenComponent {
  protected readonly competitionApi = inject(CompetitionApiService);
  private readonly stack = inject(ModalStackService);

  protected readonly card = CompetitionCardComponent;
  protected readonly filters = COMPETITION_FILTERS;
  protected readonly columns = COMPETITION_COLUMNS;

  constructor() {
    const actionBar = inject(GlobalActionBarService);

    actionBar.setActions([
      {
        id: 'add-competition',
        labelKey: 'competition.add',
        icon: 'plus',
        onClick: () => this.stack.push({modalKey: 'competition', section: 'new'}),
      },
    ]);
    inject(DestroyRef).onDestroy(() => actionBar.clear());
  }

  protected readonly fetchCompetitions = (params: EdasListParams) =>
    this.competitionApi.list(params);

  /** Fila de la tabla: lo mismo que la tarjeta, la ficha de la competición. */
  protected open(competition: Competition): void {
    this.stack.push({modalKey: 'competition', section: 'edit', id: String(competition.id)});
  }
}
