import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {EdasListColumn} from '@edas/ng/components/layout/list/list-view';
import {EdasListParams, ListComponent} from '@edas/ng/components/layout/list/list.component';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {RefereeCardComponent} from '../../../components/referee/referee-card.component';
import {RefereeNameCellComponent} from '../../../components/referee/referee-cells.component';
import {Referee} from '../../../shared/models/referee';
import {RefereeApiService} from '../../../shared/services/api/referee-api.service';

/** Columnas de la vista de tabla. Las ordenables están en la lista blanca de la API. */
const REFEREE_COLUMNS: readonly EdasListColumn<Referee>[] = [
  {key: 'name', label: 'texts.name', sortable: true, sticky: true, cell: RefereeNameCellComponent},
  {key: 'country', label: 'referee.country', value: (referee) => referee.country?.name ?? '—'},
  {key: 'birth_date', label: 'referee.birth-date', sortable: true, format: 'date', hideOn: 'mobile'},
  {key: 'birth_place', label: 'referee.birth-place', value: (referee) => referee.birth_place ?? '—', hideOn: 'mobile'},
  {key: 'designations_count', label: 'referee.matches', sortable: true, align: 'end', value: (referee) => referee.designations_count ?? 0},
  {key: 'updated_at', label: 'team.modified', format: 'date', hideOn: 'mobile'},
];

/**
 * Listado de árbitros del panel, en tarjetas o en tabla. No tiene alta: los árbitros los crea
 * la sincronización con la designación de cada partido.
 */
@Component({
  selector: 'app-referees-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ListComponent],
  template: `
    <edas-list
      [component]="card"
      [fetchData]="fetchReferees"
      [columns]="columns"
      [reload]="refereeApi.refreshList$"
      orderBy="name"
      filtersStorageKey="referees"
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
export class RefereesScreenComponent {
  protected readonly refereeApi = inject(RefereeApiService);
  private readonly stack = inject(ModalStackService);

  protected readonly card = RefereeCardComponent;
  protected readonly columns = REFEREE_COLUMNS;

  protected readonly fetchReferees = (params: EdasListParams) => this.refereeApi.list(params);

  /** Fila de la tabla: lo mismo que la tarjeta, la ficha del árbitro. */
  protected open(referee: Referee): void {
    this.stack.push({modalKey: 'referee', section: 'edit', id: String(referee.id)});
  }
}
