import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {LocalizedDatePipe} from '@edas/ng/wrapper/pipes/localized-date.pipe';
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

/**
 * Celda de contrato de la plantilla (Transfermarkt): hasta cuándo y, si está cedido, por quién
 * y hasta cuándo dura la cesión. El contrato de un cedido es con su club propietario.
 */
@Component({
  selector: 'app-squad-contract-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LocalizedDatePipe, TranslatePipe],
  template: `
    @if (data(); as member) {
      @if (member.contract_until; as until) {
        {{ until | localizedDate: 'MMM y' }}
      } @else {
        <span class="muted">—</span>
      }
      @if (member.on_loan) {
        <span class="sub">
          {{ 'player.loan-from' | translate }} {{ member.loan_from?.team?.name ?? member.loan_from?.name ?? '—' }}
          @if (member.loan_until; as loanUntil) {
            · {{ loanUntil | localizedDate: 'MMM y' }}
          }
        </span>
      }
    }
  `,
  styles: [`
    :host {
      white-space: nowrap;
    }

    .sub {
      display: block;
      font-size: 0.8125rem;
      color: var(--edas-muted-text-color);
    }

    .muted {
      color: var(--edas-muted-text-color);
    }
  `],
})
export class SquadContractCellComponent {
  public readonly data = input<SquadMember>();
}
