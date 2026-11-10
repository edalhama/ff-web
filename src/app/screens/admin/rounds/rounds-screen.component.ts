import {ChangeDetectionStrategy, Component, OnInit, computed, inject, signal} from '@angular/core';
import {Router} from '@angular/router';
import {ListFilter, ListFilterValues} from '@edas/ng/components/layout/list/list-filters';
import {EdasListColumn} from '@edas/ng/components/layout/list/list-view';
import {EdasListParams, ListComponent} from '@edas/ng/components/layout/list/list.component';
import {LocaleService} from '@edas/ng/shared/services/locale.service';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {LoaderComponent} from '@edas/ng/wrapper/components/loader/loader.component';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {RoundCardComponent} from '../../../components/round/round-card.component';
import {RoundNameCellComponent, RoundStatusCellComponent} from '../../../components/round/round-cells.component';
import {contextFits, MATCHES_PATH, matchesQueryParams, roundDateRange} from '../../../shared/matches/matches';
import {Competition, isDefaultCompetition} from '../../../shared/models/competition';
import {RoundRow} from '../../../shared/models/match';
import {CompetitionApiService} from '../../../shared/services/api/competition-api.service';
import {RoundApiService} from '../../../shared/services/api/round-api.service';

/**
 * Listado de jornadas del panel, siempre de una competición y de una temporada, en tarjetas o
 * en tabla: fechas, estado, partidos y partidos jugados, con la jornada en disputa marcada. La
 * temporada por defecto («Temporada actual») no manda nada y la resuelve el servidor, así que
 * siempre es la vigente. Cada jornada abre el listado de partidos filtrado por ella.
 *
 * Es de solo lectura: las jornadas llegan por la sincronización del calendario.
 */
@Component({
  selector: 'app-rounds-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, ListComponent, LoaderComponent, TranslatePipe],
  template: `
    @if (competitions(); as list) {
      @if (list.length > 0) {
        <edas-list
          [component]="card"
          [fetchData]="fetchRounds"
          [filters]="filters()"
          [columns]="columns()"
          [extraInputs]="cardInputs()"
          [showSearch]="false"
          orderBy="sequence"
          filtersStorageKey="rounds"
          (rowClick)="open($event)"
        />
      } @else {
        <edas-app-card icon="trophy" [iconSize]="48" [title]="'player.no-competitions-title' | translate" [description]="'match.no-competitions' | translate"/>
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
export class RoundsScreenComponent implements OnInit {
  protected readonly roundApi = inject(RoundApiService);
  private readonly competitionApi = inject(CompetitionApiService);
  private readonly translate = inject(TranslateService);
  private readonly locale = inject(LocaleService);
  private readonly router = inject(Router);

  protected readonly card = RoundCardComponent;

  /** `null` mientras cargan. Sin competiciones no se puede listar nada. */
  protected readonly competitions = signal<Competition[] | null>(null);

  /** Jornada en disputa de la última página: la marcan la tarjeta y la celda de nombre. */
  private readonly currentRoundId = computed(() => this.roundApi.listContext()?.currentRoundId ?? null);

  /** Columnas de la vista de tabla. El orden lo fija la API (el del calendario): ninguna ordena. */
  protected readonly columns = computed<readonly EdasListColumn<RoundRow>[]>(() => [
    {key: 'name', label: 'match.round', sticky: true, cell: RoundNameCellComponent, inputs: {currentRoundId: this.currentRoundId()}},
    {key: 'dates', label: 'match.dates', value: (round) => roundDateRange(round, this.locale.language()) || '—'},
    {key: 'status', label: 'match.status', cell: RoundStatusCellComponent},
    {key: 'matches_count', label: 'match.matches', align: 'end'},
    {key: 'played_matches_count', label: 'match.played', align: 'end'},
  ]);

  /** Lo que necesita la tarjeta: la jornada en disputa y con qué filtros abrir sus partidos. */
  protected readonly cardInputs = computed(() => {
    const context = this.roundApi.listContext();

    return {currentRoundId: this.currentRoundId(), competitionId: context?.competitionId ?? null, seasonId: context?.requestedSeasonId ?? null};
  });

  /**
   * Filtros. La competición no tiene «todas»: siempre hay una elegida. Las temporadas se
   * ofrecen solo si la última página es de esa competición, así que al cambiar de competición
   * la temporada vuelve sola a «la vigente».
   */
  protected readonly filters = computed(() => {
    const competitions = this.competitions() ?? [];
    const context = this.roundApi.listContext();
    const fallback = competitions.find(isDefaultCompetition) ?? competitions[0];
    // Las etiquetas se traducen aquí: tienen que cambiar con el idioma
    this.translate.currentLang();

    return (values: ListFilterValues): readonly ListFilter[] => {
      const seasons = context && contextFits(context, values['competition_id']) ? context.seasons : [];
      // El servidor elige la actual o, si ninguna lo es, la más reciente
      const current = seasons.find((season) => season.is_current) ?? seasons[0];

      return [
        {
          key: 'competition_id',
          label: 'player.competition',
          defaultValue: fallback?.id ?? null,
          labelTranslate: false,
          options: competitions.map((competition) => ({value: competition.id, label: competition.name ?? `#${competition.id}`})),
        },
        {
          key: 'season_id',
          label: 'match.season',
          defaultValue: null,
          labelTranslate: false,
          options: [
            {
              value: null,
              label: current
                ? this.translate.instant('match.filter-current-season-named', {name: current.label})
                : this.translate.instant('match.filter-current-season'),
            },
            ...seasons.map((season) => ({value: season.id, label: season.label})),
          ],
        },
      ];
    };
  });

  protected readonly fetchRounds = (params: EdasListParams) => this.roundApi.list(params);

  public ngOnInit(): void {
    // Las competiciones caben en una página: son unas pocas
    this.competitionApi
      .list({perPage: 100, orderBy: 'position', order: 'ASC'})
      .then((page) => this.competitions.set(page.data as Competition[]))
      // El aviso lo da el interceptor
      .catch(() => this.competitions.set([]));
  }

  /** Fila de la tabla: lo mismo que la tarjeta, los partidos de esa jornada. */
  protected open(round: RoundRow): void {
    const context = this.roundApi.listContext();

    if (context) {
      void this.router.navigate([MATCHES_PATH], {queryParams: matchesQueryParams(context.competitionId, context.requestedSeasonId, round.id)});
    }
  }
}
