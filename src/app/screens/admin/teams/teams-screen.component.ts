import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {ListFilter} from '@edas/ng/components/layout/list/list-filters';
import {EdasListColumn} from '@edas/ng/components/layout/list/list-view';
import {EdasListParams, ListComponent} from '@edas/ng/components/layout/list/list.component';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {TeamCardComponent} from '../../../components/team/team-card.component';
import {TeamActiveCellComponent, TeamNameCellComponent} from '../../../components/team/team-cells.component';
import {TEAM_TYPES} from '../../../shared/models/competition';
import {Team} from '../../../shared/models/team';
import {TeamApiService} from '../../../shared/services/api/team-api.service';

/** Filtros del listado. Viajan a la API con el nombre de su `key`; «todos» (`null`) no manda el parámetro. */
const TEAM_FILTERS: readonly ListFilter[] = [
  {
    key: 'active',
    label: 'common.status',
    defaultValue: null,
    options: [
      {value: null, label: 'team.filter-all'},
      {value: 1, label: 'team.filter-active'},
      {value: 0, label: 'team.filter-inactive'},
    ],
  },
  {
    key: 'type',
    label: 'team.type',
    defaultValue: null,
    options: [
      {value: null, label: 'team.filter-all-types'},
      ...TEAM_TYPES.map((type) => ({value: type, label: `enum.team-type.${type}`})),
    ],
  },
];

/** Columnas de la vista de tabla. Las ordenables están en la lista blanca de la API. */
const TEAM_COLUMNS: readonly EdasListColumn<Team>[] = [
  {key: 'name', label: 'texts.name', sortable: true, sticky: true, cell: TeamNameCellComponent},
  {key: 'country', label: 'team.country', value: (team) => team.country?.name ?? '—'},
  {key: 'venue', label: 'team.venue', value: (team) => team.venue?.name ?? '—', hideOn: 'mobile'},
  {key: 'founded_year', label: 'team.founded', sortable: true, align: 'end', value: (team) => team.founded_year ?? '—', hideOn: 'mobile'},
  {key: 'active', label: 'common.status', cell: TeamActiveCellComponent},
  {key: 'updated_at', label: 'team.modified', format: 'date', hideOn: 'mobile'},
];

/**
 * Listado de equipos del panel, en tarjetas o en tabla. No tiene alta: los equipos los crea
 * la sincronización al traer una competición.
 */
@Component({
  selector: 'app-teams-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ListComponent],
  template: `
    <edas-list
      [component]="card"
      [fetchData]="fetchTeams"
      [filters]="filters"
      [columns]="columns"
      [reload]="teamApi.refreshList$"
      orderBy="name"
      filtersStorageKey="teams"
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
export class TeamsScreenComponent {
  protected readonly teamApi = inject(TeamApiService);
  private readonly stack = inject(ModalStackService);

  protected readonly card = TeamCardComponent;
  protected readonly filters = TEAM_FILTERS;
  protected readonly columns = TEAM_COLUMNS;

  protected readonly fetchTeams = (params: EdasListParams) => this.teamApi.list(params);

  /** Fila de la tabla: lo mismo que la tarjeta, la ficha del equipo. */
  protected open(team: Team): void {
    this.stack.push({modalKey: 'team', section: 'edit', id: String(team.id)});
  }
}
