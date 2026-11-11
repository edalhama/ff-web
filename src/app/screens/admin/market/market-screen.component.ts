import {ChangeDetectionStrategy, Component, OnInit, computed, inject, signal} from '@angular/core';
import {ListFilter, ListFilterValues} from '@edas/ng/components/layout/list/list-filters';
import {EdasListColumn} from '@edas/ng/components/layout/list/list-view';
import {EdasListParams, ListComponent} from '@edas/ng/components/layout/list/list.component';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {LocaleService} from '@edas/ng/shared/services/locale.service';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {LoaderComponent} from '@edas/ng/wrapper/components/loader/loader.component';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {MarketCardComponent} from '../../../components/market/market-card.component';
import {MarketChangeCellComponent, MarketCountCellComponent, MarketMoneyCellComponent} from '../../../components/market/market-cells.component';
import {PlayerNameCellComponent, PlayerPositionCellComponent} from '../../../components/player/player-cells.component';
import {formatDay} from '../../../shared/market/market';
import {Competition, isDefaultCompetition} from '../../../shared/models/competition';
import {MARKET_PROVIDERS, MarketListContext, MarketProvider, MarketRow} from '../../../shared/models/market';
import {PLAYER_POSITIONS, playerModalId} from '../../../shared/models/player';
import {CompetitionApiService} from '../../../shared/services/api/competition-api.service';
import {MarketApiService} from '../../../shared/services/api/market-api.service';

/** Juego por defecto: el que elige el servidor si no se pide ninguno. */
const DEFAULT_PROVIDER: MarketProvider = 'biwenger';

/** Nombre de cada juego: son marcas, no se traducen. */
const PROVIDER_NAMES: Record<MarketProvider, string> = {biwenger: 'Biwenger', 'laliga-fantasy': 'LaLiga Fantasy'};

/**
 * `orderBy` que no es ninguna columna: el servidor aplica el suyo por defecto, de más caro a más
 * barato (la tabla de `<edas-list>` siempre arranca en ascendente).
 */
const DEFAULT_ORDER = 'default';

const money = (key: 'price' | 'fantasy_price' | 'prediction_conservative' | 'prediction_aggressive', label: string, hideOn?: 'mobile'): EdasListColumn<MarketRow> => ({
  key,
  label,
  sortable: true,
  align: 'end',
  cell: MarketMoneyCellComponent,
  inputs: {field: key},
  ...(hideOn ? {hideOn} : {}),
});

const count = (key: 'purchases' | 'sales' | 'owners', label: string): EdasListColumn<MarketRow> => ({
  key,
  label,
  sortable: true,
  align: 'end',
  cell: MarketCountCellComponent,
  inputs: {field: key},
  hideOn: 'mobile',
});

/** Columnas de los dos juegos. */
const COMMON_COLUMNS: readonly EdasListColumn<MarketRow>[] = [
  {key: 'name', label: 'team.squad-player', sortable: true, sticky: true, cell: PlayerNameCellComponent},
  {key: 'team', label: 'player.team', sortable: true, value: (row) => row.team.name ?? '—', hideOn: 'mobile'},
  {key: 'position', label: 'team.squad-position', sortable: true, cell: PlayerPositionCellComponent, hideOn: 'mobile'},
  money('price', 'market.price'),
  {key: 'change', label: 'market.change', sortable: true, align: 'end', cell: MarketChangeCellComponent},
];

const PREDICTION_COLUMNS: readonly EdasListColumn<MarketRow>[] = [
  money('prediction_conservative', 'market.prediction-conservative', 'mobile'),
  money('prediction_aggressive', 'market.prediction-aggressive', 'mobile'),
];

/** Biwenger tiene además compras, ventas, propietarios y precio fantasy. */
const BIWENGER_COLUMNS: readonly EdasListColumn<MarketRow>[] = [
  ...COMMON_COLUMNS,
  count('purchases', 'market.purchases'),
  count('sales', 'market.sales'),
  count('owners', 'market.owners'),
  money('fantasy_price', 'market.fantasy-price', 'mobile'),
  ...PREDICTION_COLUMNS,
];

const LFM_COLUMNS: readonly EdasListColumn<MarketRow>[] = [...COMMON_COLUMNS, ...PREDICTION_COLUMNS];

/**
 * Mercado del panel: el precio de cada jugador de una competición en Biwenger o en LaLiga
 * Fantasy un día, con su variación y la predicción del automanager. Siempre de una competición
 * (LaLiga la primera vez); el juego arranca en Biwenger y el día en «el último», que no manda
 * nada y resuelve el servidor, así que lo guardado en el dispositivo no se queda en un día
 * pasado. Los días que se ofrecen son los del juego elegido, y llegan con la primera página.
 *
 * Cada fila abre la ficha del jugador. Es de solo lectura: llega de Jornada Perfecta.
 */
@Component({
  selector: 'app-market-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, ListComponent, LoaderComponent, TranslatePipe],
  template: `
    @if (competitions(); as list) {
      @if (list.length > 0) {
        <edas-list
          [component]="card"
          [fetchData]="fetchMarket"
          [filters]="filters()"
          [columns]="columns()"
          [orderBy]="defaultOrder"
          filtersStorageKey="market"
          (rowClick)="open($event)"
        />
      } @else {
        <edas-app-card icon="trophy" [iconSize]="48" [title]="'player.no-competitions-title' | translate" [description]="'market.no-competitions' | translate"/>
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
export class MarketScreenComponent implements OnInit {
  protected readonly marketApi = inject(MarketApiService);
  private readonly competitionApi = inject(CompetitionApiService);
  private readonly stack = inject(ModalStackService);
  private readonly translate = inject(TranslateService);
  private readonly locale = inject(LocaleService);

  protected readonly card = MarketCardComponent;
  protected readonly defaultOrder = DEFAULT_ORDER;

  /** Las de Biwenger o las de LaLiga Fantasy, según el juego de la última página. */
  protected readonly columns = computed(() => (this.marketApi.listContext()?.provider === 'laliga-fantasy' ? LFM_COLUMNS : BIWENGER_COLUMNS));

  /** `null` mientras cargan. Sin competiciones no se puede listar nada. */
  protected readonly competitions = signal<Competition[] | null>(null);

  /**
   * Filtros. La competición no tiene «todas» y el juego tampoco. El equipo depende de la
   * competición y el día, además, del juego: sus opciones solo se ofrecen si la última página es
   * de esa competición (y de ese juego), así que al cambiar vuelven solos a «todos» y a «el último».
   */
  protected readonly filters = computed(() => {
    const competitions = this.competitions() ?? [];
    const context = this.marketApi.listContext();
    const fallback = competitions.find(isDefaultCompetition) ?? competitions[0];
    const lang = this.locale.language();
    // Las etiquetas se traducen aquí: tienen que cambiar con el idioma
    this.translate.currentLang();

    return (values: ListFilterValues): readonly ListFilter[] => {
      const sameCompetition = context !== null && context.competitionId === values['competition_id'];
      const teams = sameCompetition ? context.teams : [];
      const dates = sameCompetition && this.sameProvider(context, values['provider']) ? context.dates : [];
      const latest = dates[0];

      return [
        {
          key: 'competition_id',
          label: 'player.competition',
          defaultValue: fallback?.id ?? null,
          labelTranslate: false,
          options: competitions.map((competition) => ({value: competition.id, label: competition.name ?? `#${competition.id}`})),
        },
        {
          key: 'provider',
          label: 'market.provider',
          defaultValue: DEFAULT_PROVIDER,
          labelTranslate: false,
          options: MARKET_PROVIDERS.map((provider) => ({value: provider, label: PROVIDER_NAMES[provider]})),
        },
        {
          key: 'date',
          label: 'market.date',
          defaultValue: null,
          labelTranslate: false,
          options: [
            {value: null, label: latest ? this.translate.instant('market.filter-latest-named', {date: formatDay(latest, lang)}) : this.translate.instant('market.filter-latest')},
            ...dates.map((date) => ({value: date, label: formatDay(date, lang)})),
          ],
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
      ];
    };
  });

  /** De 20 en 20: una plantilla entera se ve en una o dos páginas. */
  protected readonly fetchMarket = (params: EdasListParams) => this.marketApi.list({...params, perPage: 20});

  public ngOnInit(): void {
    // Las competiciones caben en una página: son unas pocas
    this.competitionApi
      .list({perPage: 100, orderBy: 'position', order: 'ASC'})
      .then((page) => this.competitions.set(page.data as Competition[]))
      // El aviso lo da el interceptor
      .catch(() => this.competitions.set([]));
  }

  /** Fila de la tabla: lo mismo que la tarjeta, la ficha del jugador en la competición del listado. */
  protected open(row: MarketRow): void {
    const competitionId = this.marketApi.listContext()?.competitionId ?? null;

    this.stack.push({modalKey: 'player', section: 'info', id: playerModalId(row.player.id, competitionId)});
  }

  /** ¿Es la última página del juego que se tiene elegido (sin elegir, el de por defecto)? */
  private sameProvider(context: MarketListContext, provider: unknown): boolean {
    return (context.requestedProvider ?? DEFAULT_PROVIDER) === ((provider as MarketProvider | null) ?? DEFAULT_PROVIDER);
  }
}
