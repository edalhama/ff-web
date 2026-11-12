import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {EdasListMemoryOptions} from '@edas/ng/components/layout/list/list-memory';
import {EdasListColumn} from '@edas/ng/components/layout/list/list-view';
import {ListComponent} from '@edas/ng/components/layout/list/list.component';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {LoaderComponent} from '@edas/ng/wrapper/components/loader/loader.component';
import {EdasTabItem, TabsComponent} from '@edas/ng/wrapper/components/tabs/tabs.component';
import {PlayerRating, playerModalId, SquadMember, TeamSquad} from '../../shared/models/player';
import {Team} from '../../shared/models/team';
import {formatMoney} from '../../shared/players/money';
import {ageOn, POSITION_ORDER} from '../../shared/players/squad';
import {TeamApiService} from '../../shared/services/api/team-api.service';
import {PlayerNameCellComponent, PlayerStatusCellComponent, PlayerValueCellComponent} from '../player/player-cells.component';
import {TeamSquadCardComponent} from './team-squad-card.component';
import {SquadContractCellComponent, SquadPositionCellComponent, SquadRatingCellComponent} from './team-squad-cells.component';

const memberAge = (member: SquadMember): number | null => ageOn(member.player.birth_date, new Date());

/** Columnas de la vista de tabla; se ordenan en memoria con `SQUAD_LIST_OPTIONS.sort`. */
const SQUAD_COLUMNS: readonly EdasListColumn<SquadMember>[] = [
  {key: 'shirt_number', label: 'team.squad-number', sortable: true, align: 'end'},
  {key: 'name', label: 'team.squad-player', sortable: true, sticky: true, cell: PlayerNameCellComponent},
  {key: 'position', label: 'team.squad-position', sortable: true, cell: SquadPositionCellComponent},
  {key: 'rating', label: 'team.squad-rating', sortable: true, cell: SquadRatingCellComponent},
  {key: 'country', label: 'team.squad-country', sortable: true, value: (member) => member.player.country?.name},
  {key: 'age', label: 'team.squad-age', sortable: true, align: 'end', value: memberAge},
  {key: 'market_value', label: 'player.market-value', sortable: true, align: 'end', cell: PlayerValueCellComponent},
  {key: 'contract', label: 'player.contract', sortable: true, cell: SquadContractCellComponent},
  {key: 'status', label: 'team.squad-status', cell: PlayerStatusCellComponent},
];

const SQUAD_LIST_OPTIONS: EdasListMemoryOptions<SquadMember> = {
  perPage: 15,
  search: (member) => `${member.player.name} ${member.player.full_name ?? ''}`,
  sort: {
    shirt_number: (member) => member.shirt_number,
    name: (member) => member.player.name,
    position: (member) => (member.position ? POSITION_ORDER.indexOf(member.position) : null),
    rating: (member) => member.player.rating?.overall,
    country: (member) => member.player.country?.name,
    age: memberAge,
    market_value: (member) => member.player.market_value,
    contract: (member) => member.contract_until,
  },
};

/**
 * Plantilla de un equipo (sección `squad` del modal `team`): una pestaña por temporada en la
 * que está inscrito y, en cada una, la lista de jugadores en tarjetas o en tabla, con dorsal,
 * posición, valoración en el videojuego, país, edad, valor de mercado, contrato y estado. Es de solo lectura: llega por la
 * sincronización de plantillas y de valoraciones. Los que han dejado el equipo salen al final,
 * atenuados. Cada elemento abre la ficha del jugador en esa competición.
 */
@Component({
  selector: 'app-team-squad-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, ListComponent, LoaderComponent, TabsComponent, TranslatePipe],
  template: `
    @if (squads(); as list) {
      @if (list.length > 1) {
        <edas-tabs [tabs]="tabs()" [activeKey]="String(selected()?.season?.id ?? '')" (activeKeyChange)="select($event)"/>
      }

      @if (selected(); as squad) {
        @if (squad.members.length > 0) {
          <p class="note">
            {{ squad.competition.name }} · {{ squad.season.label }} ·
            {{ 'team.squad-count' | translate: {count: activeCount()} }}
            @if (squadValue(); as total) {
              · {{ 'team.squad-value' | translate: {value: total} }}
            }
            @if (ratingSource(); as source) {
              · {{ 'team.squad-rating-source' | translate: {provider: source.provider.name, edition: source.edition} }}
            }
          </p>

          <!-- orderBy vacío: sin columna elegida se respeta el orden de la API (los que se fueron, al final).
               El @for de un solo elemento recrea la lista al cambiar de temporada, para volver a su primera página. -->
          @for (current of [squad]; track current.season.id) {
            <edas-list
              [component]="card"
              [items]="current.members"
              [itemsOptions]="listOptions"
              [columns]="columns"
              [extraInputs]="{competitionId: current.competition.id}"
              orderBy=""
              filtersStorageKey="team-squad"
              (rowClick)="openPlayer($event, current)"
            />
          }
        } @else {
          <edas-app-card icon="users" [iconSize]="48" [title]="'team.squad-empty-title' | translate" [description]="'team.squad-empty' | translate"/>
        }
      } @else {
        <edas-app-card icon="users" [iconSize]="48" [title]="'team.squad-empty-title' | translate" [description]="'team.squad-empty' | translate"/>
      }
    } @else {
      <edas-loader/>
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-4);
      width: 100%;
    }

    .note {
      margin: 0;
      font-size: 0.875rem;
      color: var(--edas-muted-text-color);
    }

    /* Filas de los que ya no están. La tabla es de la librería y no marca filas: se reconocen
       por su celda de estado. La columna fija atenúa su contenido, no su fondo, para seguir
       tapando lo que pasa por debajo al desplazar. */
    :host ::ng-deep tr:has(app-player-status-cell.gone) td:not(.sticky),
    :host ::ng-deep tr:has(app-player-status-cell.gone) td.sticky > * {
      opacity: 0.55;
    }
  `],
})
export class TeamSquadSectionComponent implements OnInit {
  /** Equipo abierto; lo carga el modal. */
  public readonly data = input<Team>();

  private readonly teamApi = inject(TeamApiService);
  private readonly translate = inject(TranslateService);
  private readonly stack = inject(ModalStackService);
  private readonly destroyRef = inject(DestroyRef);

  /** `null` mientras cargan. */
  protected readonly squads = signal<TeamSquad[] | null>(null);
  private readonly seasonId = signal<number | null>(null);

  protected readonly selected = computed(() => {
    const list = this.squads() ?? [];

    return list.find((squad) => squad.season.id === this.seasonId()) ?? list[0] ?? null;
  });

  protected readonly tabs = computed<EdasTabItem[]>(() =>
    (this.squads() ?? []).map((squad) => ({
      key: String(squad.season.id),
      labelKey: `${squad.competition.name ?? ''} ${squad.season.label}`.trim(),
      labelTranslate: false,
    })),
  );

  /** Suma del valor de mercado de los que siguen en la plantilla; null si ninguno lo tiene. */
  protected readonly squadValue = computed(() => {
    const values = (this.selected()?.members ?? [])
      .filter((member) => member.active && member.player.market_value != null)
      .map((member) => member.player.market_value as number);

    return values.length > 0 ? formatMoney(values.reduce((sum, value) => sum + value, 0), this.translate.currentLang()) : null;
  });

  protected readonly activeCount = computed(() => this.selected()?.members.filter((member) => member.active).length ?? 0);

  /** De dónde y de qué edición son las valoraciones de la plantilla: la más reciente que haya. */
  protected readonly ratingSource = computed(() =>
    (this.selected()?.members ?? [])
      .map((member) => member.player.rating)
      .filter((rating): rating is PlayerRating => rating !== null)
      .reduce<PlayerRating | null>((latest, rating) => (latest === null || rating.edition > latest.edition ? rating : latest), null),
  );

  protected readonly String = String;

  protected readonly card = TeamSquadCardComponent;
  protected readonly columns = SQUAD_COLUMNS;
  protected readonly listOptions = SQUAD_LIST_OPTIONS;

  public ngOnInit(): void {
    const team = this.data();
    if (!team) {
      return;
    }

    this.teamApi
      .squads(team.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (squads) => this.squads.set(squads),
        // El aviso lo da el interceptor
        error: () => this.squads.set([]),
      });
  }

  protected select(key: string): void {
    this.seasonId.set(Number(key));
  }

  /** Fila de la tabla: lo mismo que la tarjeta, la ficha del jugador en esta competición. */
  protected openPlayer(member: SquadMember, squad: TeamSquad): void {
    this.stack.push({modalKey: 'player', section: 'info', id: playerModalId(member.player.id, squad.competition.id)});
  }
}
