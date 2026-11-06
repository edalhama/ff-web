import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {ListFilter} from '@edas/ng/components/layout/list/list-filters';
import {EdasListColumn} from '@edas/ng/components/layout/list/list-view';
import {EdasListParams, ListComponent} from '@edas/ng/components/layout/list/list.component';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {VenueCardComponent} from '../../../components/venue/venue-card.component';
import {VenueNameCellComponent} from '../../../components/venue/venue-cells.component';
import {Venue, VENUE_SURFACES} from '../../../shared/models/venue';
import {VenueApiService} from '../../../shared/services/api/venue-api.service';

/** Filtros del listado. Viajan a la API con el nombre de su `key`; «todas» (`null`) no manda el parámetro. */
const VENUE_FILTERS: readonly ListFilter[] = [
  {
    key: 'surface',
    label: 'venue.surface',
    defaultValue: null,
    options: [
      {value: null, label: 'venue.filter-all-surfaces'},
      ...VENUE_SURFACES.map((surface) => ({value: surface, label: `enum.surface.${surface}`})),
    ],
  },
];

/** Columnas de la vista de tabla. Las ordenables están en la lista blanca de la API. */
const VENUE_COLUMNS: readonly EdasListColumn<Venue>[] = [
  {key: 'name', label: 'texts.name', sortable: true, sticky: true, cell: VenueNameCellComponent},
  {key: 'city', label: 'venue.city', sortable: true, value: (venue) => venue.city ?? '—'},
  {key: 'country', label: 'venue.country', value: (venue) => venue.country?.name ?? '—', hideOn: 'mobile'},
  {key: 'capacity', label: 'venue.capacity', sortable: true, align: 'end', format: 'number', value: (venue) => venue.capacity ?? '—'},
  {key: 'opened_year', label: 'venue.opened', sortable: true, align: 'end', value: (venue) => venue.opened_year ?? '—', hideOn: 'mobile'},
  {key: 'matches_count', label: 'venue.matches', align: 'end', value: (venue) => venue.matches_count ?? 0, hideOn: 'mobile'},
  {key: 'updated_at', label: 'team.modified', format: 'date', hideOn: 'mobile'},
];

/**
 * Listado de estadios del panel, en tarjetas o en tabla. No tiene alta: los estadios los crea
 * la sincronización con el calendario de cada competición.
 */
@Component({
  selector: 'app-venues-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ListComponent],
  template: `
    <edas-list
      [component]="card"
      [fetchData]="fetchVenues"
      [filters]="filters"
      [columns]="columns"
      [reload]="venueApi.refreshList$"
      orderBy="name"
      filtersStorageKey="venues"
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
export class VenuesScreenComponent {
  protected readonly venueApi = inject(VenueApiService);
  private readonly stack = inject(ModalStackService);

  protected readonly card = VenueCardComponent;
  protected readonly filters = VENUE_FILTERS;
  protected readonly columns = VENUE_COLUMNS;

  protected readonly fetchVenues = (params: EdasListParams) => this.venueApi.list(params);

  /** Fila de la tabla: lo mismo que la tarjeta, la ficha del estadio. */
  protected open(venue: Venue): void {
    this.stack.push({modalKey: 'venue', section: 'edit', id: String(venue.id)});
  }
}
