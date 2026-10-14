import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {TranslatePipe} from '@ngx-translate/core';
import {ListFilter} from '@edas/ng/components/layout/list/list-filters';
import {EdasListColumn} from '@edas/ng/components/layout/list/list-view';
import {EdasListParams, ListComponent} from '@edas/ng/components/layout/list/list.component';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {BadgeComponent} from '@edas/ng/wrapper/components/badge/badge.component';
import {LoaderComponent} from '@edas/ng/wrapper/components/loader/loader.component';
import {LocalizedDatePipe} from '@edas/ng/wrapper/pipes/localized-date.pipe';
import {merge} from 'rxjs';
import {LinkCardComponent, linkModalId} from '../../../components/link/link-card.component';
import {LinkNameCellComponent, LinkStatusCellComponent} from '../../../components/link/link-cells.component';
import {LinkableType, LinkRow, LinkSummary} from '../../../shared/models/link';
import {LinkApiService} from '../../../shared/services/api/link-api.service';
import {SeasonApiService} from '../../../shared/services/api/season-api.service';

/** Tipos del listado, en el orden de su filtro. */
const LIST_TYPES: readonly LinkableType[] = ['team', 'player', 'venue', 'competition'];

/** Filtros del listado: qué tipo de entidad y si está enlazada. */
const LINK_FILTERS: readonly ListFilter[] = [
  {
    key: 'type',
    label: 'link.filter-type',
    defaultValue: 'team',
    options: LIST_TYPES.map((type) => ({value: type, label: `link.types.${type}`})),
  },
  {
    key: 'status',
    label: 'link.filter-status',
    defaultValue: null,
    options: [
      {value: null, label: 'link.filter-all'},
      {value: 'unlinked', label: 'link.filter-unlinked'},
      {value: 'linked', label: 'link.filter-linked'},
    ],
  },
];

const LINK_COLUMNS: readonly EdasListColumn<LinkRow>[] = [
  {key: 'name', label: 'texts.name', sortable: true, sticky: true, cell: LinkNameCellComponent},
  {key: 'external_id', label: 'link.external-id-column', cell: LinkStatusCellComponent},
  {key: 'external_name', label: 'link.external-name', value: (row) => row.external_name ?? '—', hideOn: 'mobile'},
  {key: 'last_synced_at', label: 'link.synced', format: 'date', hideOn: 'mobile'},
];

/**
 * Enlaces con los proveedores: cuánto de lo nuestro está enlazado con cada uno, cómo está
 * cada competición (con qué id y qué datos se traen) y el listado de equipos, jugadores,
 * estadios y competiciones, enlazados o no, para enlazarlos a mano.
 *
 * La sincronización enlaza sola lo que importa. Lo que sale aquí sin enlazar es lo creado a
 * mano o lo que el proveedor dejó de traer: si existe en el proveedor, conviene enlazarlo
 * para que la próxima sincronización lo actualice en vez de crear otro.
 */
@Component({
  selector: 'app-links-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent, ListComponent, LoaderComponent, LocalizedDatePipe, TranslatePipe],
  template: `
    <p class="intro">{{ 'link.intro' | translate }}</p>

    @if (summary(); as data) {
      <div class="tiles">
        @for (entity of data.entities; track entity.type) {
          @for (provider of data.providers; track provider.code) {
            <div class="ff-panel tile" [class.tile--complete]="entity.total > 0 && entity.linked[provider.code] === entity.total">
              <span class="tile-label">{{ 'link.types.' + entity.type | translate }}</span>
              <span class="tile-value">
                {{ entity.linked[provider.code] ?? 0 }}<span class="tile-total"> / {{ entity.total }}</span>
              </span>
              <span class="tile-meta">
                @if (entity.total - (entity.linked[provider.code] ?? 0); as missing) {
                  {{ 'link.missing' | translate: {count: missing, provider: provider.name} }}
                } @else {
                  {{ 'link.all-linked' | translate: {provider: provider.name} }}
                }
              </span>
            </div>
          }
        }
      </div>

      <div class="block">
        <h2 class="block-title">{{ 'link.competitions-title' | translate }}</h2>

        <div class="ff-panel ff-panel--scroll" data-no-section-swipe>
          <table class="ff-table">
            <thead>
              <tr>
                <th class="sticky" scope="col">{{ 'link.types.competition' | translate }}</th>
                <th scope="col">{{ 'link.provider' | translate }}</th>
                <th scope="col">{{ 'link.data' | translate }}</th>
                <th scope="col">{{ 'link.last-sync' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              @for (competition of data.competitions; track competition.id) {
                <tr tabindex="0" (click)="openCompetition(competition.id)" (keydown.enter)="openCompetition(competition.id)">
                  <td class="sticky name">{{ competition.name }}</td>
                  <td>
                    @for (link of competition.links; track link.provider.code) {
                      <span class="cell-line">{{ link.provider.name }} · {{ 'link.id' | translate: {id: link.external_id} }}@if (link.name) { · {{ link.name }}}</span>
                    } @empty {
                      <edas-badge appearance="warning" icon="unlink" size="s" label="link.not-linked"/>
                    }
                  </td>
                  <td>
                    <span class="chips">
                      @for (source of competition.sources; track source.data_type + source.provider) {
                        <edas-badge [appearance]="source.active ? 'success' : 'neutral'" size="s" [label]="'enum.sync-type.' + source.data_type"/>
                      } @empty {
                        —
                      }
                    </span>
                  </td>
                  <td>{{ competition.last_run_at ? (competition.last_run_at | localizedDate: 'd MMM y, HH:mm') : ('sync.never' | translate) }}</td>
                </tr>
              } @empty {
                <tr><td colspan="4" class="empty">{{ 'link.no-competitions' | translate }}</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    } @else {
      <edas-loader/>
    }

    <div class="block">
      <h2 class="block-title">{{ 'link.entities-title' | translate }}</h2>
      <p class="block-help">{{ 'link.entities-help' | translate }}</p>

      <edas-list
        [component]="card"
        [fetchData]="fetchRows"
        [filters]="filters"
        [columns]="columns"
        [reload]="linkApi.changed$"
        orderBy="name"
        filtersStorageKey="links"
        (rowClick)="open($event)"
      />
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-6);
      width: 100%;
    }

    .intro,
    .block-help {
      margin: 0;
      max-width: 70ch;
      font-size: 0.9375rem;
      line-height: 1.5;
      color: var(--edas-muted-text-color);
    }

    .tiles {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: var(--edas-space-3);
    }

    .tile {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 14px 16px;
    }

    .tile-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--edas-muted-text-color);
    }

    .tile-value {
      font-size: 1.5rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }

    .tile-total {
      font-size: 1rem;
      font-weight: 600;
      color: var(--edas-muted-text-color);
    }

    .tile-meta {
      font-size: 0.8125rem;
      color: rgb(var(--edas-tone-warning-rgb));
    }

    .tile--complete .tile-meta {
      color: rgb(var(--edas-tone-success-rgb));
    }

    .block {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-3);
    }

    .block-title {
      margin: 0;
      font-size: 1.0625rem;
      font-weight: 700;
    }

    .name {
      font-weight: 600;
    }

    .cell-line {
      display: block;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .empty {
      color: var(--edas-muted-text-color);
    }
  `],
})
export class LinksScreenComponent implements OnInit {
  protected readonly linkApi = inject(LinkApiService);
  private readonly stack = inject(ModalStackService);
  private readonly seasonApi = inject(SeasonApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly card = LinkCardComponent;
  protected readonly filters = LINK_FILTERS;
  protected readonly columns = LINK_COLUMNS;

  /** `null` mientras carga. */
  protected readonly summary = signal<LinkSummary | null>(null);

  /** El tipo viaja como un filtro más; la API lo recibe en la ruta. */
  protected readonly fetchRows = (params: EdasListParams) => {
    const {type, ...rest} = params as EdasListParams & {type?: LinkableType};

    return this.linkApi.list(type && LIST_TYPES.includes(type) ? type : 'team', rest as Record<string, string | number | boolean | null>);
  };

  public ngOnInit(): void {
    this.load();

    // Un enlace cambiado aquí o una sincronización lanzada desde la ficha de una competición
    merge(this.linkApi.changed$, this.seasonApi.changed$)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());
  }

  protected open(row: LinkRow): void {
    this.stack.push({modalKey: 'link', section: 'edit', id: linkModalId(row)});
  }

  protected openCompetition(id: number): void {
    this.stack.push({modalKey: 'competition', section: 'sync', id: String(id)});
  }

  private load(): void {
    this.linkApi
      .summary()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (summary) => this.summary.set(summary),
        // El aviso lo da el interceptor
        error: () => this.summary.update((current) => current ?? {providers: [], entities: [], competitions: []}),
      });
  }
}
