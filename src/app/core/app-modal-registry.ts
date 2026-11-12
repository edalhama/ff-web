import {inject, Injectable} from '@angular/core';
import {ModalDefinition, ModalStackRegistry} from '@edas/ng';
import {map} from 'rxjs';
import {CompetitionFormSectionComponent} from '../components/competition/competition-form-section.component';
import {SeasonFormSectionComponent} from '../components/season/season-form-section.component';
import {SeasonCalendarSectionComponent} from '../components/season/season-calendar-section.component';
import {SeasonListSectionComponent} from '../components/season/season-list-section.component';
import {SeasonStandingsSectionComponent} from '../components/season/season-standings-section.component';
import {SeasonTeamsSectionComponent} from '../components/season/season-teams-section.component';
import {CompetitionSyncSectionComponent} from '../components/sync/competition-sync-section.component';
import {LinkFormSectionComponent} from '../components/link/link-form-section.component';
import {MatchEventsSectionComponent} from '../components/match/match-events-section.component';
import {MatchScoresSectionComponent} from '../components/match/match-scores-section.component';
import {PlayerCompetitionsSectionComponent} from '../components/player/player-competitions-section.component';
import {PlayerFormSectionComponent} from '../components/player/player-form-section.component';
import {PlayerInfoSectionComponent} from '../components/player/player-info-section.component';
import {PlayerCareerSectionComponent} from '../components/player/player-career-section.component';
import {PlayerLinksSectionComponent} from '../components/player/player-links-section.component';
import {PlayerRatingSectionComponent} from '../components/player/player-rating-section.component';
import {RefereeFormSectionComponent} from '../components/referee/referee-form-section.component';
import {RefereeLinksSectionComponent} from '../components/referee/referee-links-section.component';
import {RefereeMatchesSectionComponent} from '../components/referee/referee-matches-section.component';
import {TeamFormSectionComponent} from '../components/team/team-form-section.component';
import {TvChannelFormSectionComponent} from '../components/tv-channel/tv-channel-form-section.component';
import {TvChannelLinksSectionComponent} from '../components/tv-channel/tv-channel-links-section.component';
import {TvChannelMatchesSectionComponent} from '../components/tv-channel/tv-channel-matches-section.component';
import {TeamLinksSectionComponent} from '../components/team/team-links-section.component';
import {TeamSquadSectionComponent} from '../components/team/team-squad-section.component';
import {VenueFormSectionComponent} from '../components/venue/venue-form-section.component';
import {VenueLinksSectionComponent} from '../components/venue/venue-links-section.component';
import {Competition} from '../shared/models/competition';
import {Season} from '../shared/models/season';
import {Team} from '../shared/models/team';
import {TvChannel} from '../shared/models/tv-channel';
import {LinkableType, LinkEntity} from '../shared/models/link';
import {MatchDetail} from '../shared/models/match';
import {PlayerCard} from '../shared/models/player';
import {Referee} from '../shared/models/referee';
import {Venue} from '../shared/models/venue';
import {CompetitionApiService} from '../shared/services/api/competition-api.service';
import {LinkApiService} from '../shared/services/api/link-api.service';
import {MatchApiService} from '../shared/services/api/match-api.service';
import {PlayerApiService} from '../shared/services/api/player-api.service';
import {RefereeApiService} from '../shared/services/api/referee-api.service';
import {SeasonApiService} from '../shared/services/api/season-api.service';
import {TeamApiService} from '../shared/services/api/team-api.service';
import {TvChannelApiService} from '../shared/services/api/tv-channel-api.service';
import {VenueApiService} from '../shared/services/api/venue-api.service';
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
 * | `team`       | equipo      | `edit` · `squad` · `links`                   |
 * | `player`     | `jugador-competición` | `info` · `rating` · `links` · `competitions` · `edit` |
 * | `venue`      | estadio     | `edit` · `links`                             |
 * | `referee`    | árbitro     | `edit` · `matches` · `links`                 |
 * | `tv-channel` | canal de TV | `new` · `edit` · `matches` · `links`         |
 * | `match`      | partido     | `events` · `scores`                          |
 * | `link`       | `tipo-id`   | `edit` (enlace con los proveedores)          |
 *
 * El alta de temporada es un modal propio porque su `id` es el de la competición a la que se
 * añade, no el de una temporada. El jugador se abre dentro de una competición (`12-1`: el
 * jugador 12 en la competición 1), que es la que enseña su información general.
 */
@Injectable({providedIn: 'root'})
export class AppModalRegistry extends ModalStackRegistry {
  private readonly session = inject(SessionService);
  private readonly competitionApi = inject(CompetitionApiService);
  private readonly seasonApi = inject(SeasonApiService);
  private readonly teamApi = inject(TeamApiService);
  private readonly linkApi = inject(LinkApiService);
  private readonly playerApi = inject(PlayerApiService);
  private readonly venueApi = inject(VenueApiService);
  private readonly refereeApi = inject(RefereeApiService);
  private readonly tvChannelApi = inject(TvChannelApiService);
  private readonly matchApi = inject(MatchApiService);

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
          {key: 'squad', labelI18nKey: 'team.squad', icon: 'users', component: TeamSquadSectionComponent, requiresId: true},
          {key: 'links', labelI18nKey: 'title.links', icon: 'link', component: TeamLinksSectionComponent, requiresId: true},
        ],
      },
      player: {
        modalKey: 'player',
        titleI18nKey: 'title.player',
        icon: 'user',
        entityCrumb: {label: 'player'},
        canAccess: (entry) => isAdmin() && entry.id != null,
        entity: {
          // `12-1`: el jugador y la competición en la que se enseña
          load: (id: string) => {
            const [playerId, competitionId] = id.split('-').map(Number);

            return this.playerApi.get(playerId, Number.isFinite(competitionId) ? competitionId : null).pipe(
              map((player): PlayerCard => ({...player, context_competition_id: Number.isFinite(competitionId) ? competitionId : null})),
            );
          },
          label: (player: PlayerCard) => player.name,
        },
        sections: [
          {key: 'info', labelI18nKey: 'player.info', icon: 'user', component: PlayerInfoSectionComponent, requiresId: true},
          {key: 'rating', labelI18nKey: 'team.squad-rating', icon: 'gamepad-2', component: PlayerRatingSectionComponent, requiresId: true},
          {key: 'career', labelI18nKey: 'player.career', icon: 'trending-up', component: PlayerCareerSectionComponent, requiresId: true},
          {key: 'links', labelI18nKey: 'title.links', icon: 'link', component: PlayerLinksSectionComponent, requiresId: true},
          {key: 'competitions', labelI18nKey: 'player.other-competitions', icon: 'trophy', component: PlayerCompetitionsSectionComponent, requiresId: true},
          {key: 'edit', labelI18nKey: 'common.edit', icon: 'pencil', component: PlayerFormSectionComponent, requiresId: true},
        ],
      },
      venue: {
        modalKey: 'venue',
        titleI18nKey: 'title.venue',
        icon: 'map-pin',
        entityCrumb: {label: 'venue'},
        canAccess: (entry) => isAdmin() && entry.id != null,
        entity: {
          load: (id: string) => this.venueApi.get(Number(id)),
          label: (venue: Venue) => venue.name,
        },
        sections: [
          {key: 'edit', labelI18nKey: 'common.edit', icon: 'pencil', component: VenueFormSectionComponent, requiresId: true},
          {key: 'links', labelI18nKey: 'title.links', icon: 'link', component: VenueLinksSectionComponent, requiresId: true},
        ],
      },
      referee: {
        modalKey: 'referee',
        titleI18nKey: 'title.referee',
        icon: 'flag',
        entityCrumb: {label: 'referee'},
        canAccess: (entry) => isAdmin() && entry.id != null,
        entity: {
          load: (id: string) => this.refereeApi.get(Number(id)),
          label: (referee: Referee) => referee.name,
        },
        sections: [
          {key: 'edit', labelI18nKey: 'common.edit', icon: 'pencil', component: RefereeFormSectionComponent, requiresId: true},
          {key: 'matches', labelI18nKey: 'referee.matches', icon: 'calendar-days', component: RefereeMatchesSectionComponent, requiresId: true},
          {key: 'links', labelI18nKey: 'title.links', icon: 'link', component: RefereeLinksSectionComponent, requiresId: true},
        ],
      },
      'tv-channel': {
        modalKey: 'tv-channel',
        titleI18nKey: 'title.tv-channel',
        icon: 'tv',
        entityCrumb: {label: 'tv-channel'},
        canAccess: isAdmin,
        entity: {
          load: (id: string) => this.tvChannelApi.get(Number(id)),
          label: (channel: TvChannel) => channel.name,
        },
        sections: [
          {
            key: 'new',
            labelI18nKey: 'tv-channel.add',
            icon: 'plus',
            component: TvChannelFormSectionComponent,
            canAccess: (entry) => entry.id == null,
          },
          {
            key: 'edit',
            labelI18nKey: 'common.edit',
            icon: 'pencil',
            component: TvChannelFormSectionComponent,
            canAccess: (entry) => entry.id != null,
            requiresId: true,
          },
          {key: 'matches', labelI18nKey: 'tv-channel.matches', icon: 'calendar-days', component: TvChannelMatchesSectionComponent, requiresId: true},
          {key: 'links', labelI18nKey: 'title.links', icon: 'link', component: TvChannelLinksSectionComponent, requiresId: true},
        ],
      },
      match: {
        modalKey: 'match',
        titleI18nKey: 'title.match',
        icon: 'goal',
        entityCrumb: {label: 'match'},
        canAccess: (entry) => isAdmin() && entry.id != null,
        entity: {
          // Una sola petición con todo: el partido, sus eventos, sus jugadores y sus notas
          load: (id: string) => this.matchApi.get(Number(id)),
          label: (detail: MatchDetail) => `${detail.match.home_team?.name ?? '—'} - ${detail.match.away_team?.name ?? '—'}`,
        },
        sections: [
          {key: 'events', labelI18nKey: 'match.events', icon: 'list', component: MatchEventsSectionComponent, requiresId: true},
          {key: 'scores', labelI18nKey: 'match.scores', icon: 'star', component: MatchScoresSectionComponent, requiresId: true},
        ],
      },
      link: {
        modalKey: 'link',
        titleI18nKey: 'title.link',
        icon: 'link',
        entityCrumb: {label: 'link'},
        canAccess: (entry) => isAdmin() && entry.id != null,
        entity: {
          // `team-12`: el tipo y el id de la entidad
          load: (id: string) => {
            const [type, entityId] = id.split('-');

            return this.linkApi.get(type as LinkableType, Number(entityId));
          },
          label: (entity: LinkEntity) => entity.name,
        },
        sections: [
          {key: 'edit', labelI18nKey: 'title.link', icon: 'link', component: LinkFormSectionComponent, requiresId: true},
        ],
      },
    };
  }
}
