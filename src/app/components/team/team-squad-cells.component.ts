import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {SquadMember} from '../../shared/models/player';
import {PlayerRatingBadgeComponent} from '../player/player-rating-badge.component';

/** Celda de posición de la plantilla: la de la temporada y, debajo, el pie. */
@Component({
  selector: 'app-squad-position-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    @if (data(); as member) {
      {{ member.position ? ('enum.player-position.' + member.position | translate) : '—' }}
      @if (member.player.foot) {
        <span class="sub">{{ 'enum.foot.' + member.player.foot | translate }}</span>
      }
    }
  `,
  styles: [`
    .sub {
      display: block;
      font-size: 0.8125rem;
      color: var(--edas-muted-text-color);
    }
  `],
})
export class SquadPositionCellComponent {
  public readonly data = input<SquadMember>();
}

/** Celda de valoración: la media en el videojuego y sus posiciones en él. */
@Component({
  selector: 'app-squad-rating-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlayerRatingBadgeComponent],
  template: `
    @if (data()?.player?.rating; as rating) {
      <app-player-rating-badge [rating]="rating"/>
      <span class="game-position">
        {{ rating.position ?? '' }}
        @if (rating.alt_positions.length > 0) {
          <span class="sub">{{ rating.alt_positions.join(', ') }}</span>
        }
      </span>
    } @else {
      <span class="muted">—</span>
    }
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--edas-space-2);
    }

    .game-position {
      font-weight: 600;
    }

    .sub {
      display: block;
      font-size: 0.8125rem;
      font-weight: 400;
      color: var(--edas-muted-text-color);
    }

    .muted {
      color: var(--edas-muted-text-color);
    }
  `],
})
export class SquadRatingCellComponent {
  public readonly data = input<SquadMember>();
}
