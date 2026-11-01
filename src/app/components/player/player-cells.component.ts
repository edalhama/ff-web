import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {BadgeComponent} from '@edas/ng/wrapper/components/badge/badge.component';
import {PlayerMembershipState, PlayerRow} from '../../shared/models/player';
import {playerStatusTone} from '../../shared/players/squad';

/** Celda de nombre de la tabla de jugadores: el deportivo y, debajo, el completo. */
@Component({
  selector: 'app-player-name-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (data(); as row) {
      <span class="name">{{ row.player.name }}</span>
      @if (row.player.full_name && row.player.full_name !== row.player.name) {
        <span class="full-name">{{ row.player.full_name }}</span>
      }
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      max-width: 18rem;
    }

    .name {
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .full-name {
      font-size: 0.8125rem;
      color: var(--edas-muted-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `],
})
export class PlayerNameCellComponent {
  public readonly data = input<PlayerRow>();
}

/** Celda de posición: la de la temporada. */
@Component({
  selector: 'app-player-position-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `{{ data()?.position ? ('enum.player-position.' + data()!.position | translate) : '—' }}`,
})
export class PlayerPositionCellComponent {
  public readonly data = input<PlayerRow>();
}

/** Estado de una ficha: «ya no está» si ha dejado el equipo; si no, su estado, si se sabe. */
@Component({
  selector: 'app-player-status-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent],
  template: `
    @if (data(); as member) {
      @if (!member.active) {
        <edas-badge appearance="neutral" label="team.squad-inactive" size="s"/>
      } @else if (member.status !== 'unknown') {
        <edas-badge [appearance]="tone(member)" [label]="'enum.player-status.' + member.status" size="s"/>
      } @else {
        <span class="muted">—</span>
      }
    }
  `,
  styles: [`
    .muted {
      color: var(--edas-muted-text-color);
    }
  `],
})
export class PlayerStatusCellComponent {
  public readonly data = input<PlayerMembershipState>();

  protected tone(member: PlayerMembershipState): 'success' | 'warning' | 'danger' | 'neutral' {
    return playerStatusTone(member.status);
  }
}
