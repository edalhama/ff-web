import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {playerModalId, PlayerCard, PlayerMembership} from '../../shared/models/player';
import {contextCompetitionId} from '../../shared/players/player-card';
import {PlayerStatusCellComponent} from './player-cells.component';

/**
 * El jugador en otras competiciones (sección `competitions` del modal `player`): sus fichas
 * en las demás, de la temporada más reciente a la más antigua. Cada fila abre su ficha en esa
 * competición.
 */
@Component({
  selector: 'app-player-competitions-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, PlayerStatusCellComponent, TranslatePipe],
  template: `
    @if (others().length > 0) {
      <div class="ff-panel ff-panel--scroll" data-no-section-swipe>
        <table class="ff-table">
          <thead>
            <tr>
              <th class="sticky" scope="col">{{ 'player.competition' | translate }}</th>
              <th scope="col">{{ 'team.squad-season' | translate }}</th>
              <th scope="col">{{ 'player.team' | translate }}</th>
              <th class="end" scope="col">{{ 'team.squad-number' | translate }}</th>
              <th scope="col">{{ 'team.squad-position' | translate }}</th>
              <th scope="col">{{ 'team.squad-status' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            @for (membership of others(); track membership.id) {
              <tr tabindex="0" [class.gone]="!membership.active" (click)="open(membership)" (keydown.enter)="open(membership)">
                <td class="sticky name">{{ membership.competition.name ?? '—' }}</td>
                <td>{{ membership.season.label }}</td>
                <td>{{ membership.team.name ?? '—' }}</td>
                <td class="end">{{ membership.shirt_number ?? '–' }}</td>
                <td>{{ membership.position ? ('enum.player-position.' + membership.position | translate) : '—' }}</td>
                <td><app-player-status-cell [data]="membership"/></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <edas-app-card icon="trophy" [iconSize]="48" [title]="'player.no-other-competitions-title' | translate" [description]="'player.no-other-competitions' | translate"/>
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-4);
      width: 100%;
    }

    .name {
      font-weight: 600;
    }

    .gone td {
      opacity: 0.55;
    }
  `],
})
export class PlayerCompetitionsSectionComponent {
  /** Jugador abierto; lo carga el modal. */
  public readonly data = input<PlayerCard>();

  private readonly stack = inject(ModalStackService);

  protected readonly others = computed<PlayerMembership[]>(() => {
    const player = this.data();
    if (!player) {
      return [];
    }

    const competitionId = contextCompetitionId(player);

    return player.memberships.filter((membership) => membership.competition.id !== competitionId);
  });

  protected open(membership: PlayerMembership): void {
    this.stack.push({modalKey: 'player', section: 'info', id: playerModalId(this.data()!.id, membership.competition.id)});
  }
}
