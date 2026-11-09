import {ChangeDetectionStrategy, Component, OnInit, computed, inject, signal} from '@angular/core';
import {ListFilter, ListFilterValues} from '@edas/ng/components/layout/list/list-filters';
import {EdasListColumn} from '@edas/ng/components/layout/list/list-view';
import {EdasListParams, ListComponent} from '@edas/ng/components/layout/list/list.component';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {LoaderComponent} from '@edas/ng/wrapper/components/loader/loader.component';
import {TranslateService} from '@ngx-translate/core';
import {TeamCardComponent, teamCompetitions} from '../../../components/team/team-card.component';
import {TeamActiveCellComponent, TeamNameCellComponent} from '../../../components/team/team-cells.component';
import {Competition, TEAM_TYPES, isDefaultCompetition} from '../../../shared/models/competition';
import {Team} from '../../../shared/models/team';
import {CompetitionApiService} from '../../../shared/services/api/competition-api.service';
import {TeamApiService} from '../../../shared/services/api/team-api.service';

/** Filtros fijos del listado. Viajan a la API con el nombre de su `key`; «todos» (`null`) no manda el parámetro. */
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
  {key: 'competition', label: 'player.competition', value: (team) => teamCompetitions(team) ?? '—'},
  {key: 'country', label: 'team.country', value: (team) => team.country?.name ?? '—'},
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
  imports: [ListComponent, LoaderComponent],
  template: `
    @if (competitions()) {
      <edas-list
        [component]="card"
        [fetchData]="fetchTeams"
        [filters]="filters()"
        [columns]="columns"
        [reload]="teamApi.refreshList$"
        orderBy="name"
        filtersStorageKey="teams"
        (rowClick)="open($event)"
      />
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
export class TeamsScreenComponent implements OnInit {
  protected readonly teamApi = inject(TeamApiService);
  private readonly competitionApi = inject(CompetitionApiService);
  private readonly translate = inject(TranslateService);
  private readonly stack = inject(ModalStackService);

  protected readonly card = TeamCardComponent;
  protected readonly columns = TEAM_COLUMNS;

  /** `null` mientras cargan las competiciones para armar los filtros iniciales. */
  protected readonly competitions = signal<Competition[] | null>(null);

  /**
   * Filtros del listado. Arranca por defecto en «LaLiga» y en su temporada actual (o la más
   * reciente disponible); la temporada depende de la competición elegida.
   */
  protected readonly filters = computed(() => {
    const competitions = this.competitions() ?? [];
    const fallback = competitions.find(isDefaultCompetition) ?? competitions[0];
    this.translate.currentLang();

    return (values: ListFilterValues): readonly ListFilter[] => {
      const selectedCompetition = competitions.find((competition) => competition.id === values['competition_id']);
      const seasons = selectedCompetition?.seasons ?? [];
      const defaultSeason = selectedCompetition?.current_season ?? seasons[0];

      return [
        ...(competitions.length > 0
          ? [
              {
                key: 'competition_id',
                label: 'player.competition',
                defaultValue: fallback?.id ?? null,
                labelTranslate: false,
                options: [
                  {value: null, label: this.translate.instant('team.filter-all-competitions')},
                  ...competitions.map((competition) => ({
                    value: competition.id,
                    label: competition.name ?? `#${competition.id}`,
                  })),
                ],
              },
            ]
          : []),
        ...(seasons.length > 0
          ? [
              {
                key: 'season_id',
                label: 'team.squad-season',
                defaultValue: defaultSeason?.id ?? null,
                labelTranslate: false,
                options: seasons.map((season) => ({
                  value: season.id,
                  label: season.label,
                })),
              },
            ]
          : []),
        ...TEAM_FILTERS,
      ];
    };
  });

  protected readonly fetchTeams = (params: EdasListParams) => this.teamApi.list(params);

  public ngOnInit(): void {
    this.competitionApi
      .list({perPage: 100, orderBy: 'position', order: 'ASC'})
      .then((page) => this.competitions.set(page.data as Competition[]))
      .catch(() => this.competitions.set([]));
  }

  /** Fila de la tabla: lo mismo que la tarjeta, la ficha del equipo. */
  protected open(team: Team): void {
    this.stack.push({modalKey: 'team', section: 'edit', id: String(team.id)});
  }
}
