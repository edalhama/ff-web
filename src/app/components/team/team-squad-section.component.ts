import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {TranslatePipe} from '@ngx-translate/core';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {BadgeComponent} from '@edas/ng/wrapper/components/badge/badge.component';
import {LoaderComponent} from '@edas/ng/wrapper/components/loader/loader.component';
import {EdasTabItem, TabsComponent} from '@edas/ng/wrapper/components/tabs/tabs.component';
import {PlayerRating, playerModalId, SquadMember, TeamSquad} from '../../shared/models/player';
import {Team} from '../../shared/models/team';
import {ageOn, playerStatusTone} from '../../shared/players/squad';
import {TeamApiService} from '../../shared/services/api/team-api.service';
import {PlayerRatingBadgeComponent} from '../player/player-rating-badge.component';

/**
 * Plantilla de un equipo (sección `squad` del modal `team`): una pestaña por temporada en la
 * que está inscrito, con dorsal, posición, valoración en el videojuego, país, edad y estado de
 * cada jugador. Es de solo lectura: llega por la sincronización de plantillas y de
 * valoraciones. Los que han dejado el equipo salen al final, atenuados. Cada fila abre la ficha
 * del jugador en esa competición.
 */
@Component({
  selector: 'app-team-squad-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, BadgeComponent, LoaderComponent, PlayerRatingBadgeComponent, TabsComponent, TranslatePipe],
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
            @if (ratingSource(); as source) {
              · {{ 'team.squad-rating-source' | translate: {provider: source.provider.name, edition: source.edition} }}
            }
          </p>

          <div class="ff-panel ff-panel--scroll" data-no-section-swipe>
            <table class="ff-table">
              <thead>
                <tr>
                  <th class="end" scope="col">{{ 'team.squad-number' | translate }}</th>
                  <th class="sticky" scope="col">{{ 'team.squad-player' | translate }}</th>
                  <th scope="col">{{ 'team.squad-position' | translate }}</th>
                  <th scope="col">{{ 'team.squad-rating' | translate }}</th>
                  <th scope="col">{{ 'team.squad-country' | translate }}</th>
                  <th class="end" scope="col">{{ 'team.squad-age' | translate }}</th>
                  <th scope="col">{{ 'team.squad-status' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (member of squad.members; track member.id) {
                  <tr
                    [class.gone]="!member.active"
                    tabindex="0"
                    (click)="openPlayer(member, squad)"
                    (keydown.enter)="openPlayer(member, squad)"
                  >
                    <td class="end number">{{ member.shirt_number ?? '–' }}</td>
                    <td class="sticky">
                      <span class="who">
                        @if (member.player.photo) {
                          <img class="photo" [src]="member.player.photo" alt="" width="32" height="32" loading="lazy" (error)="hideImage($event)"/>
                        }
                        <span>
                      <span class="name">{{ member.player.name }}</span>
                      @if (member.player.full_name && member.player.full_name !== member.player.name) {
                        <span class="full-name">{{ member.player.full_name }}</span>
                      }
                        </span>
                      </span>
                    </td>
                    <td>
                      {{ member.position ? ('enum.player-position.' + member.position | translate) : '—' }}
                      @if (member.player.foot) {
                        <span class="sub">{{ 'enum.foot.' + member.player.foot | translate }}</span>
                      }
                    </td>
                    <td>
                      @if (member.player.rating; as rating) {
                        <span class="rating">
                          <app-player-rating-badge [rating]="rating"/>
                          <span class="game-position">
                            {{ rating.position ?? '' }}
                            @if (rating.alt_positions.length > 0) {
                              <span class="sub">{{ rating.alt_positions.join(', ') }}</span>
                            }
                          </span>
                        </span>
                      } @else {
                        <span class="muted">—</span>
                      }
                    </td>
                    <td>{{ member.player.country?.name ?? '—' }}</td>
                    <td class="end">{{ age(member) ?? '—' }}</td>
                    <td>
                      @if (!member.active) {
                        <edas-badge appearance="neutral" label="team.squad-inactive" size="s"/>
                      } @else if (member.status !== 'unknown') {
                        <edas-badge [appearance]="tone(member)" [label]="'enum.player-status.' + member.status" size="s"/>
                      } @else {
                        <span class="muted">—</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
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

    .number {
      font-weight: 700;
    }

    .who {
      display: flex;
      align-items: center;
      gap: var(--edas-space-2);
    }

    .photo {
      width: 32px;
      height: 32px;
      flex: none;
      object-fit: cover;
      border-radius: 50%;
      background: rgba(var(--edas-tone-neutral-rgb), 0.14);
    }

    .name {
      display: block;
      font-weight: 600;
    }

    .full-name,
    .muted {
      font-size: 0.8125rem;
      color: var(--edas-muted-text-color);
    }

    .sub {
      display: block;
      font-size: 0.8125rem;
      color: var(--edas-muted-text-color);
    }

    .rating {
      display: inline-flex;
      align-items: center;
      gap: var(--edas-space-2);
    }

    .game-position {
      font-weight: 600;
    }

    .gone td {
      opacity: 0.55;
    }
  `],
})
export class TeamSquadSectionComponent implements OnInit {
  /** Equipo abierto; lo carga el modal. */
  public readonly data = input<Team>();

  private readonly teamApi = inject(TeamApiService);
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

  protected readonly activeCount = computed(() => this.selected()?.members.filter((member) => member.active).length ?? 0);

  /** De dónde y de qué edición son las valoraciones de la plantilla: la más reciente que haya. */
  protected readonly ratingSource = computed(() =>
    (this.selected()?.members ?? [])
      .map((member) => member.player.rating)
      .filter((rating): rating is PlayerRating => rating !== null)
      .reduce<PlayerRating | null>((latest, rating) => (latest === null || rating.edition > latest.edition ? rating : latest), null),
  );

  protected readonly String = String;

  private readonly today = new Date();

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

  protected age(member: SquadMember): number | null {
    return ageOn(member.player.birth_date, this.today);
  }

  /** Una foto que no carga deja su hueco vacío, sin el icono de imagen rota. */
  protected hideImage(event: Event): void {
    (event.target as HTMLImageElement).style.visibility = 'hidden';
  }

  /** Ficha del jugador, en la competición de esta plantilla. */
  protected openPlayer(member: SquadMember, squad: TeamSquad): void {
    this.stack.push({modalKey: 'player', section: 'info', id: playerModalId(member.player.id, squad.competition.id)});
  }

  protected tone(member: SquadMember): 'success' | 'warning' | 'danger' | 'neutral' {
    return playerStatusTone(member.status);
  }
}
