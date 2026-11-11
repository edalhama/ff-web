import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {ButtonComponent} from '@edas/ng/wrapper/components/button/button.component';
import {EdasProperty, PropertyListComponent} from '@edas/ng/wrapper/components/property-list/property-list.component';
import {LocalizedDatePipe} from '@edas/ng/wrapper/pipes/localized-date.pipe';
import {PlayerCard} from '../../shared/models/player';
import {CARD_STATS, cardStatKey, groupStats, ratingTier, stars} from '../../shared/players/rating';
import {PlayerAutomanagerComponent} from './player-automanager.component';
import {PlayerRatingBadgeComponent} from './player-rating-badge.component';

/**
 * Valoración del jugador (sección `rating` del modal `player`). Arriba, la del automanager de
 * Jornada Perfecta (la actual por sistema y la que traía a sus últimos partidos), si la tiene.
 * Debajo, la del videojuego: la carta de la edición más reciente (media, posiciones, las seis
 * medias, filigranas y pierna mala), sus atributos detallados por grupo y, si hay más de una,
 * las de ediciones anteriores. Sin ninguna de las dos, un aviso.
 */
@Component({
  selector: 'app-player-rating-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, ButtonComponent, LocalizedDatePipe, PlayerAutomanagerComponent, PlayerRatingBadgeComponent, PropertyListComponent, TranslatePipe],
  template: `
    @if (data(); as player) {
      @if (hasAutomanager()) {
        <app-player-automanager [automanager]="player.automanager"/>
      }

      @if (player.ratings[0]; as rating) {
        <edas-app-card
          icon="gamepad-2"
          [iconSize]="48"
          [labelTranslate]="false"
          [title]="rating.provider.name + ' ' + rating.edition"
          [description]="positions()"
        >
          <app-player-rating-badge appCardTrailing size="l" [rating]="rating" [linked]="false"/>
          @if (rating.profile_url) {
            <edas-button appCardActions appearance="primary" emphasis="flat" icon="external-link" label="player.open-profile" (clicked)="openProfile(rating.profile_url)"/>
          }

          <div class="card-stats">
            @for (stat of cardStats; track stat) {
              @if (rating[stat] != null) {
                <div class="card-stat">
                  <span class="card-stat-value">{{ rating[stat] }}</span>
                  <span class="card-stat-label">{{ statKey(stat) | translate }}</span>
                </div>
              }
            }
          </div>

          <edas-property-list [items]="extras()"/>
        </edas-app-card>

        @if (groups().length > 0) {
          <h3 class="block-title">{{ 'player.attributes' | translate }}</h3>
          <div class="groups">
            @for (group of groups(); track group.key) {
              <div class="ff-panel group">
                <h4 class="group-title">{{ 'player.stat-group.' + group.key | translate }}</h4>
                @for (stat of group.stats; track stat.key) {
                  <div class="stat">
                    <span class="stat-label">{{ stat.known ? ('player.stat.' + stat.key | translate) : stat.key }}</span>
                    <span class="stat-bar" aria-hidden="true"><span [class]="'stat-fill ' + tier(stat.value)" [style.width.%]="stat.value"></span></span>
                    <span class="stat-value">{{ stat.value }}</span>
                  </div>
                }
              </div>
            }
          </div>
        }

        @if (player.ratings.length > 1) {
          <h3 class="block-title">{{ 'player.rating-history' | translate }}</h3>
          <div class="ff-panel ff-panel--scroll" data-no-section-swipe>
            <table class="ff-table">
              <thead>
                <tr>
                  <th scope="col">{{ 'player.edition' | translate }}</th>
                  <th scope="col">{{ 'team.squad-rating' | translate }}</th>
                  <th scope="col">{{ 'team.squad-position' | translate }}</th>
                  <th scope="col">{{ 'player.fetched-at' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (past of player.ratings; track past.provider.code + past.edition) {
                  <tr>
                    <td>{{ past.provider.name }} {{ past.edition }}</td>
                    <td><app-player-rating-badge [rating]="past" [linked]="false"/></td>
                    <td>{{ past.position ?? '—' }}</td>
                    <td>{{ past.fetched_at ? (past.fetched_at | localizedDate: 'd MMM y') : '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      } @else if (!hasAutomanager()) {
        <edas-app-card icon="gamepad-2" [iconSize]="48" [title]="'player.no-rating-title' | translate" [description]="'player.no-rating' | translate"/>
      }
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-4);
      width: 100%;
    }

    .block-title {
      margin: var(--edas-space-2) 0 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .card-stats {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: var(--edas-space-2);
    }

    @media (max-width: 480px) {
      .card-stats {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    .card-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }

    .card-stat-value {
      font-size: 1.375rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }

    .card-stat-label {
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      color: var(--edas-muted-text-color);
    }

    .groups {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
      gap: var(--edas-space-3);
    }

    .group {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-2);
      padding: 14px 16px;
    }

    .group-title {
      margin: 0 0 2px;
      font-size: 0.875rem;
      font-weight: 700;
    }

    .stat {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 4rem 2rem;
      align-items: center;
      gap: var(--edas-space-2);
      font-size: 0.875rem;
    }

    .stat-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .stat-bar {
      height: 6px;
      border-radius: 3px;
      background: var(--edas-surface-border-color);
      overflow: hidden;
    }

    .stat-fill {
      display: block;
      height: 100%;
      border-radius: 3px;
    }

    .stat-value {
      text-align: end;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }

    /* Los colores de las cartas: oro, plata y bronce */
    .stat-fill.gold { background: #d4ad3f; }
    .stat-fill.silver { background: #a3abb6; }
    .stat-fill.bronze { background: #b77a4c; }
  `],
})
export class PlayerRatingSectionComponent {
  /** Jugador abierto; lo carga el modal. */
  public readonly data = input<PlayerCard>();

  protected readonly cardStats = CARD_STATS;

  private readonly latest = computed(() => this.data()?.ratings[0] ?? null);

  /** Tiene valoración del automanager, actual o de algún partido. */
  protected readonly hasAutomanager = computed(() => {
    const automanager = this.data()?.automanager;

    return !!automanager && (automanager.current.length > 0 || automanager.matches.length > 0);
  });

  /** «CM · CDM, CAM». */
  protected readonly positions = computed(() => {
    const rating = this.latest();

    return rating ? [rating.position, rating.alt_positions.join(', ')].filter(Boolean).join(' · ') || null : null;
  });

  protected readonly extras = computed<EdasProperty[]>(() => {
    const rating = this.latest();

    return [
      {label: 'player.skill-moves', value: stars(rating?.skill_moves ?? null)},
      {label: 'player.weak-foot', value: stars(rating?.weak_foot ?? null)},
    ];
  });

  protected readonly groups = computed(() => groupStats(this.latest()?.stats ?? {}));

  protected statKey(stat: (typeof CARD_STATS)[number]): string {
    const rating = this.latest();

    return rating ? cardStatKey(stat, rating) : '';
  }

  protected tier(value: number): string {
    return ratingTier(value);
  }

  protected openProfile(url: string): void {
    window.open(url, '_blank', 'noopener');
  }
}
