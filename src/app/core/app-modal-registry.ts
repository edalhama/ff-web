import {inject, Injectable} from '@angular/core';
import {ModalDefinition, ModalStackRegistry} from '@edas/ng';
import {CompetitionFormSectionComponent} from '../components/competition/competition-form-section.component';
import {SeasonFormSectionComponent} from '../components/season/season-form-section.component';
import {SeasonCalendarSectionComponent} from '../components/season/season-calendar-section.component';
import {SeasonListSectionComponent} from '../components/season/season-list-section.component';
import {SeasonStandingsSectionComponent} from '../components/season/season-standings-section.component';
import {SeasonTeamsSectionComponent} from '../components/season/season-teams-section.component';
import {CompetitionSyncSectionComponent} from '../components/sync/competition-sync-section.component';
import {TeamFormSectionComponent} from '../components/team/team-form-section.component';
import {Competition} from '../shared/models/competition';
import {Season} from '../shared/models/season';
import {Team} from '../shared/models/team';
import {CompetitionApiService} from '../shared/services/api/competition-api.service';
import {SeasonApiService} from '../shared/services/api/season-api.service';
import {TeamApiService} from '../shared/services/api/team-api.service';
import {SessionService} from '../shared/services/session.service';

/**
 * Catálogo de modales de la app: fichas apiladas sobre la ruta activa, que viajan en la URL
 * (`?modal=competition&section=edit&id=7`). Todos usan el contenedor genérico de edas-ng, que
 * carga `entity` por el id de la capa y se la pasa a la sección activa.
 *
 * | Modal        | `id`        | Secciones                                    |
 * |--------------|-------------|----------------------------------------------|
 * | `competition`| competición | `new` · `edit` · `seasons` · `sync`          |
 * | `season-new` | competición | `new`                                        |
 * | `season`     | temporada   | `calendar` · `standings` · `teams` · `edit`  |
 * | `team`       | equipo      | `edit`                                       |
 *
 * El alta de temporada es un modal propio porque su `id` es el de la competición a la que se
 * añade, no el de una temporada.
 */
@Injectable({providedIn: 'root'})
export class AppModalRegistry extends ModalStackRegistry {
  private readonly session = inject(SessionService);
  private readonly competitionApi = inject(CompetitionApiService);
  private readonly seasonApi = inject(SeasonApiService);
  private readonly teamApi = inject(TeamApiService);

  /** Con la sesión aún sin resolver no se descarta un modal que venga en la URL. */
  override isSessionPending(): boolean {
    return this.session.sessionStatus() === 'pending';
  }

  override definitions(): Record<string, ModalDefinition> {
    const isAdmin = () => this.session.isLoggedIn();

    return {
      competition: {
        modalKey: 'competition',
        titleI18nKey: 'title.competition',
        icon: 'trophy',
        entityCrumb: {label: 'competition'},
        canAccess: isAdmin,
        entity: {
          load: (id: string) => this.competitionApi.get(Number(id)),
          label: (competition: Competition) => competition.name,
        },
        sections: [
          {
            key: 'new',
            labelI18nKey: 'competition.add',
            icon: 'plus',
            component: CompetitionFormSectionComponent,
            canAccess: (entry) => entry.id == null,
          },
          {
            key: 'edit',
            labelI18nKey: 'common.edit',
            icon: 'pencil',
            component: CompetitionFormSectionComponent,
            canAccess: (entry) => entry.id != null,
            requiresId: true,
          },
          {
            key: 'seasons',
            labelI18nKey: 'competition.seasons',
            icon: 'calendar',
            component: SeasonListSectionComponent,
            canAccess: (entry) => entry.id != null,
            requiresId: true,
          },
          {
            key: 'sync',
            labelI18nKey: 'sync.title',
            icon: 'refresh-cw',
            component: CompetitionSyncSectionComponent,
            canAccess: (entry) => entry.id != null,
            requiresId: true,
          },
        ],
      },
      'season-new': {
        modalKey: 'season-new',
        titleI18nKey: 'season.add',
        icon: 'calendar-plus',
        canAccess: (entry) => isAdmin() && entry.id != null,
        entity: {
          load: (id: string) => this.competitionApi.get(Number(id)),
          input: 'competition',
        },
        sections: [
          {key: 'new', labelI18nKey: 'season.add', icon: 'calendar-plus', component: SeasonFormSectionComponent, requiresId: true},
        ],
      },
      season: {
        modalKey: 'season',
        titleI18nKey: 'title.season',
        icon: 'calendar',
        entityCrumb: {label: 'season'},
        canAccess: (entry) => isAdmin() && entry.id != null,
        entity: {
          load: (id: string) => this.seasonApi.get(Number(id)),
          label: (season: Season) => season.label,
        },
        sections: [
          {key: 'calendar', labelI18nKey: 'match.calendar', icon: 'calendar-days', component: SeasonCalendarSectionComponent, requiresId: true},
          {key: 'standings', labelI18nKey: 'standing.title', icon: 'list-ordered', component: SeasonStandingsSectionComponent, requiresId: true},
          {key: 'teams', labelI18nKey: 'title.teams', icon: 'shield', component: SeasonTeamsSectionComponent, requiresId: true},
          {key: 'edit', labelI18nKey: 'common.edit', icon: 'pencil', component: SeasonFormSectionComponent, requiresId: true},
        ],
      },
      team: {
        modalKey: 'team',
        titleI18nKey: 'title.team',
        icon: 'shield',
        entityCrumb: {label: 'team'},
        canAccess: (entry) => isAdmin() && entry.id != null,
        entity: {
          load: (id: string) => this.teamApi.get(Number(id)),
          label: (team: Team) => team.name,
        },
        sections: [
          {key: 'edit', labelI18nKey: 'common.edit', icon: 'pencil', component: TeamFormSectionComponent, requiresId: true},
        ],
      },
    };
  }
}
