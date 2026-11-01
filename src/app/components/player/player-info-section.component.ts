import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {BadgeComponent} from '@edas/ng/wrapper/components/badge/badge.component';
import {EdasProperty, PropertyListComponent} from '@edas/ng/wrapper/components/property-list/property-list.component';
import {LocalizedDatePipe} from '@edas/ng/wrapper/pipes/localized-date.pipe';
import {PlayerCard, PlayerMembership} from '../../shared/models/player';
import {contextMemberships} from '../../shared/players/player-card';
import {ageOn, playerStatusTone} from '../../shared/players/squad';
import {PlayerRatingBadgeComponent} from './player-rating-badge.component';

/**
 * Información general de un jugador (sección `info` del modal `player`): quién es y cómo está
 * en la competición desde la que se ha abierto (equipo, dorsal, posición y estado en su
 * temporada), con su valoración más reciente en el videojuego.
 */
@Component({
  selector: 'app-player-info-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, BadgeComponent, LocalizedDatePipe, PlayerRatingBadgeComponent, PropertyListComponent, TranslatePipe],
  template: `
    @if (data(); as player) {
      <edas-app-card [icon]="player.photo ? null : 'user'" [iconSize]="48" [labelTranslate]="false" [title]="player.name" [description]="player.full_name">
        @if (player.photo) {
          <img appCardLeading class="photo" [src]="player.photo" alt="" width="48" height="48" loading="lazy" (error)="hideImage($event)"/>
        }
        @if (player.ratings[0]; as rating) {
          <app-player-rating-badge appCardTrailing size="l" [rating]="rating"/>
        }
        @if (player.retired) {
          <edas-badge appearance="neutral" label="player.retired" size="s"/>
        }
        <edas-property-list [items]="personal()"/>
      </edas-app-card>

      @if (memberships(); as list) {
        @if (list.length > 0) {
          <h3 class="block-title">{{ list[0].competition.name }} · {{ list[0].season.label }}</h3>

          @for (membership of list; track membership.id) {
            <div class="ff-panel membership" [class.gone]="!membership.active">
              <div class="membership-head">
                <span class="team">{{ membership.team.name ?? '—' }}</span>
                @if (!membership.active) {
                  <edas-badge appearance="neutral" label="team.squad-inactive" size="s"/>
                } @else if (membership.status !== 'unknown') {
                  <edas-badge [appearance]="tone(membership)" [label]="'enum.player-status.' + membership.status" size="s"/>
                }
              </div>
              <edas-property-list [items]="membershipProperties(membership)"/>
              @if (membership.status_note || membership.status_until) {
                <p class="status-note">
                  {{ membership.status_note ?? '' }}
                  @if (membership.status_until; as until) {
                    · {{ 'player.status-until' | translate }} {{ until | localizedDate: 'd MMM y' }}
                  }
                </p>
              }
            </div>
          }
        } @else {
          <edas-app-card icon="users" [iconSize]="48" [title]="'player.no-squad-title' | translate" [description]="'player.no-squad' | translate"/>
        }
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

    .photo {
      width: 48px;
      height: 48px;
      flex: none;
      object-fit: cover;
      border-radius: var(--edas-radius-md);
      background: rgba(var(--edas-tone-neutral-rgb), 0.14);
    }

    .block-title {
      margin: var(--edas-space-2) 0 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .membership {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-3);
      padding: 16px;
    }

    .membership.gone {
      opacity: 0.6;
    }

    .membership-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--edas-space-2);
    }

    .team {
      font-weight: 700;
    }

    .status-note {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--edas-muted-text-color);
    }
  `],
})
export class PlayerInfoSectionComponent {
  /** Jugador abierto; lo carga el modal. */
  public readonly data = input<PlayerCard>();

  private readonly translate = inject(TranslateService);
  private readonly datePipe = new LocalizedDatePipe();
  private readonly today = new Date();

  protected readonly memberships = computed(() => {
    const player = this.data();

    return player ? contextMemberships(player) : null;
  });

  protected readonly personal = computed<EdasProperty[]>(() => {
    const player = this.data();
    // Lee el idioma activo (signal) para que las etiquetas cambien con él
    this.translate.currentLang();

    if (!player) {
      return [];
    }

    const age = ageOn(player.birth_date, this.today);
    const birth = player.birth_date ? this.datePipe.transform(player.birth_date, 'd MMM y') : null;

    return [
      {label: 'player.birth-date', value: birth ? (age != null ? `${birth} (${this.translate.instant('player.age', {age})})` : birth) : null},
      {label: 'team.squad-country', value: [player.country?.name, player.second_country?.name].filter(Boolean).join(' · ') || null},
      {label: 'player.usual-position', value: player.position ? `enum.player-position.${player.position}` : null, translateValue: !!player.position},
      {label: 'player.foot', value: player.foot ? `enum.foot.${player.foot}` : null, translateValue: !!player.foot},
      {label: 'player.height', value: player.height_cm ? `${player.height_cm} cm` : null},
    ];
  });

  /** Una foto que no carga deja su hueco vacío, sin el icono de imagen rota. */
  protected hideImage(event: Event): void {
    (event.target as HTMLImageElement).style.visibility = 'hidden';
  }

  protected membershipProperties(membership: PlayerMembership): EdasProperty[] {
    return [
      {label: 'team.squad-number', value: membership.shirt_number},
      {
        label: 'team.squad-position',
        value: membership.position ? `enum.player-position.${membership.position}` : null,
        translateValue: !!membership.position,
      },
    ];
  }

  protected tone(membership: PlayerMembership): 'success' | 'warning' | 'danger' | 'neutral' {
    return playerStatusTone(membership.status);
  }
}
