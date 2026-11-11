import {ChangeDetectionStrategy, Component, OnInit, computed, inject, signal} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {ListFilter, ListFilterValues, storeListFilterValues} from '@edas/ng/components/layout/list/list-filters';
import {EdasListColumn} from '@edas/ng/components/layout/list/list-view';
import {EdasListParams, ListComponent} from '@edas/ng/components/layout/list/list.component';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {LoaderComponent} from '@edas/ng/wrapper/components/loader/loader.component';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {MatchCardComponent} from '../../../components/match/match-card.component';
import {MatchKickoffCellComponent, MatchScoreCellComponent, MatchStatusCellComponent, MatchTeamCellComponent} from '../../../components/match/match-cells.component';
import {MatchTvChannelsCellComponent} from '../../../components/tv-channel/tv-channel-cells.component';
import {contextFits, roundLabelKey} from '../../../shared/matches/matches';
import {Competition, isDefaultCompetition} from '../../../shared/models/competition';
import {MatchRow, Round, SeasonOption} from '../../../shared/models/match';
import {CompetitionApiService} from '../../../shared/services/api/competition-api.service';
import {MatchApiService} from '../../../shared/services/api/match-api.service';

/** Clave con la que `<edas-list>` guarda los filtros de esta pantalla (la usan también los enlaces desde fuera). */
const FILTERS_KEY = 'matches';

/** Filtros que se pueden traer en la URL al abrir la pantalla (ver `matchesQueryParams`). */
const LINKED_FILTERS = ['competition_id', 'season_id', 'round_id'] as const;

/** Columnas de la vista de tabla. El orden lo fija la API (por horario): ninguna ordena. */
const MATCH_COLUMNS: readonly EdasListColumn<MatchRow>[] = [
  {key: 'kickoff_at', label: 'match.kickoff', sticky: true, cell: MatchKickoffCellComponent},
  {key: 'round', label: 'match.round', value: (match) => match.round?.number ?? '—', hideOn: 'mobile'},
  {key: 'home_team', label: 'match.home', cell: MatchTeamCellComponent, inputs: {side: 'home'}},
  {key: 'score', label: 'match.result', cell: MatchScoreCellComponent},
  {key: 'away_team', label: 'match.away', cell: MatchTeamCellComponent, inputs: {side: 'away'}},
  {key: 'status', label: 'match.status', cell: MatchStatusCellComponent},
  {key: 'tv_channels', label: 'match.tv-channels', cell: MatchTvChannelsCellComponent, hideOn: 'mobile'},
];

/** Partidos por página. */
const MATCHES_PER_PAGE = 10;

/**
 * Listado de partidos del panel, siempre de una competición y de una jornada, en tarjetas o en
 * tabla. Los filtros van de fuera adentro: competición → temporada → jornada. Las temporadas y
 * las jornadas que se ofrecen son las que trae la primera página; sus valores por defecto
 * («Temporada actual», «Jornada en curso») no mandan nada y los resuelve el servidor, así que
 * siempre son los vigentes aunque los filtros se guarden en el dispositivo.
 *
 * Se puede abrir ya filtrada (`?competition_id=1&season_id=3&round_id=9`, desde las jornadas).
 * Cada partido abre su ficha. No tiene alta: los partidos los crea la sincronización.
 */
@Component({
  selector: 'app-matches-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, ListComponent, LoaderComponent, TranslatePipe],
  template: `
    @if (competitions(); as list) {
      @if (list.length > 0) {
        <edas-list
          [component]="card"
          [fetchData]="fetchMatches"
          [filters]="filters()"
          [columns]="columns"
          [showSearch]="false"
          orderBy="kickoff_at"
          [filtersStorageKey]="filtersKey"
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
export class MatchesScreenComponent implements OnInit {
  protected readonly matchApi = inject(MatchApiService);
  private readonly competitionApi = inject(CompetitionApiService);
  private readonly stack = inject(ModalStackService);
  private readonly translate = inject(TranslateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly card = MatchCardComponent;
  protected readonly columns = MATCH_COLUMNS;
  protected readonly filtersKey = FILTERS_KEY;

  /** `null` mientras cargan. Sin competiciones no se puede listar nada. */
  protected readonly competitions = signal<Competition[] | null>(null);

  /**
   * Filtros. La competición no tiene «todas»: siempre hay una elegida. La temporada y la
   * jornada dependen de lo de fuera: sus opciones solo se ofrecen si la última página es de
   * esa competición (y, la jornada, de esa temporada), así que al cambiar de competición o de
   * temporada vuelven solas a «la vigente» en vez de quedarse con una de otra.
   */
  protected readonly filters = computed(() => {
    const competitions = this.competitions() ?? [];
    const context = this.matchApi.listContext();
    const fallback = competitions.find(isDefaultCompetition) ?? competitions[0];
    // Las etiquetas se traducen aquí: tienen que cambiar con el idioma
    this.translate.currentLang();

    return (values: ListFilterValues): readonly ListFilter[] => {
      const seasons = context && contextFits(context, values['competition_id']) ? context.seasons : [];
      const rounds = context && contextFits(context, values['competition_id'], values['season_id']) ? context.rounds : [];
      // Qué es «la vigente» ahora mismo, si se sabe: el servidor elige la actual o la más reciente
      const currentSeason = seasons.find((season) => season.is_current) ?? seasons[0];
      const roundInPlay = context && rounds.length > 0 && context.requestedRoundId === null ? rounds.find((round) => round.id === context.roundId) : undefined;

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
            {value: null, label: this.currentLabel('match.filter-current-season', 'match.filter-current-season-named', currentSeason?.label)},
            ...seasons.map((season: SeasonOption) => ({value: season.id, label: season.label})),
          ],
        },
        {
          key: 'round_id',
          label: 'match.round',
          defaultValue: null,
          labelTranslate: false,
          options: [
            {value: null, label: this.currentLabel('match.filter-round-in-play', 'match.filter-round-in-play-named', roundInPlay ? this.roundName(roundInPlay) : undefined)},
            ...rounds.map((round) => ({value: round.id, label: this.roundName(round)})),
          ],
        },
      ];
    };
  });

  /** De 10 en 10 (no los 9 por defecto del servidor): una jornada suele tener 10 partidos. */
  protected readonly fetchMatches = (params: EdasListParams) => this.matchApi.list({...params, perPage: MATCHES_PER_PAGE});

  public ngOnInit(): void {
    this.applyLinkedFilters();

    // Las competiciones caben en una página: son unas pocas
    this.competitionApi
      .list({perPage: 100, orderBy: 'position', order: 'ASC'})
      .then((page) => this.competitions.set(page.data as Competition[]))
      // El aviso lo da el interceptor
      .catch(() => this.competitions.set([]));
  }

  /** Fila de la tabla: lo mismo que la tarjeta, la ficha del partido. */
  protected open(match: MatchRow): void {
    this.stack.push({modalKey: 'match', section: 'events', id: String(match.id)});
  }

  /**
   * Filtros que llegan en la URL (desde el listado de jornadas): se guardan como si los hubiera
   * elegido quien mira, antes de montar la lista, y se quitan de la URL. La lista los recupera
   * de lo guardado en cuanto sus opciones llegan con la primera página.
   */
  private applyLinkedFilters(): void {
    const query = this.route.snapshot.queryParamMap;
    const competitionId = Number(query.get('competition_id'));

    if (!Number.isInteger(competitionId) || competitionId <= 0) {
      return;
    }

    const idOf = (key: string): number | null => {
      const value = Number(query.get(key));

      return Number.isInteger(value) && value > 0 ? value : null;
    };
    const values = {competition_id: competitionId, season_id: idOf('season_id'), round_id: idOf('round_id')};

    storeListFilterValues(this.filters()(values), FILTERS_KEY, values);

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: Object.fromEntries(LINKED_FILTERS.map((key) => [key, null])),
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** «Temporada actual (2026/27)», o sin el paréntesis mientras no se sabe cuál es. */
  private currentLabel(key: string, namedKey: string, name: string | undefined): string {
    return name ? this.translate.instant(namedKey, {name}) : this.translate.instant(key);
  }

  private roundName(round: Round): string {
    const {key, params} = roundLabelKey(round);

    return this.translate.instant(key, params);
  }
}
