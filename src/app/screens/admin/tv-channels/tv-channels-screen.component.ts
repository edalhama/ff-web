import {ChangeDetectionStrategy, Component, DestroyRef, inject} from '@angular/core';
import {GlobalActionBarService} from '@edas/ng/components/layout/action-bar/global-action-bar.service';
import {EdasListColumn} from '@edas/ng/components/layout/list/list-view';
import {EdasListParams, ListComponent} from '@edas/ng/components/layout/list/list.component';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {TvChannelCardComponent} from '../../../components/tv-channel/tv-channel-card.component';
import {TvChannelNameCellComponent} from '../../../components/tv-channel/tv-channel-cells.component';
import {TvChannel} from '../../../shared/models/tv-channel';
import {TvChannelApiService} from '../../../shared/services/api/tv-channel-api.service';

/** Columnas de la vista de tabla. Las ordenables están en la lista blanca de la API. */
const TV_CHANNEL_COLUMNS: readonly EdasListColumn<TvChannel>[] = [
  {key: 'name', label: 'tv-channel.name', sortable: true, sticky: true, cell: TvChannelNameCellComponent},
  {key: 'platform', label: 'tv-channel.platform', sortable: true, value: (channel) => channel.platform ?? '—'},
  {key: 'dial', label: 'tv-channel.dial', sortable: true, value: (channel) => channel.dial ?? '—'},
  {key: 'matches_count', label: 'tv-channel.matches', sortable: true, align: 'end', value: (channel) => channel.matches_count ?? 0},
  {key: 'updated_at', label: 'common.modified', format: 'date', hideOn: 'mobile'},
];

/**
 * Listado de canales de TV del panel, en tarjetas o en tabla, con búsqueda por nombre y
 * plataforma. Los crea la sincronización con el calendario; el alta a mano es para los que aún
 * no han llegado.
 */
@Component({
  selector: 'app-tv-channels-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ListComponent],
  template: `
    <edas-list
      [component]="card"
      [fetchData]="fetchChannels"
      [columns]="columns"
      [reload]="tvChannelApi.refreshList$"
      orderBy="name"
      filtersStorageKey="tv-channels"
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
export class TvChannelsScreenComponent {
  protected readonly tvChannelApi = inject(TvChannelApiService);
  private readonly stack = inject(ModalStackService);

  protected readonly card = TvChannelCardComponent;
  protected readonly columns = TV_CHANNEL_COLUMNS;

  constructor() {
    const actionBar = inject(GlobalActionBarService);

    actionBar.setActions([
      {
        id: 'add-tv-channel',
        labelKey: 'tv-channel.add',
        icon: 'plus',
        onClick: () => this.stack.push({modalKey: 'tv-channel', section: 'new'}),
      },
    ]);
    inject(DestroyRef).onDestroy(() => actionBar.clear());
  }

  protected readonly fetchChannels = (params: EdasListParams) => this.tvChannelApi.list(params);

  /** Fila de la tabla: lo mismo que la tarjeta, la ficha del canal. */
  protected open(channel: TvChannel): void {
    this.stack.push({modalKey: 'tv-channel', section: 'edit', id: String(channel.id)});
  }
}
