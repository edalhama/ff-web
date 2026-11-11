import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {TvChannel} from '../../shared/models/tv-channel';
import {MatchListComponent, MatchListItem} from '../match/match-list.component';

/**
 * Últimos partidos que ha emitido un canal (sección `matches` del modal `tv-channel`): del más
 * reciente al más antiguo, cada uno con su competición. Cada partido abre su ficha.
 */
@Component({
  selector: 'app-tv-channel-matches-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, MatchListComponent, TranslatePipe],
  template: `
    @if (matches(); as list) {
      @if (list.length > 0) {
        <p class="help">{{ 'tv-channel.matches-help' | translate: {count: data()?.matches_count ?? list.length} }}</p>
        <app-match-list [matches]="list" layout="dates" [showCompetition]="true" [interactive]="true" (matchClick)="openMatch($event)"/>
      } @else {
        <edas-app-card icon="calendar-off" [iconSize]="48" [title]="'tv-channel.no-matches-title' | translate" [description]="'tv-channel.no-matches' | translate"/>
      }
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-3);
      width: 100%;
    }

    .help {
      margin: 0;
      font-size: 0.875rem;
      color: var(--edas-muted-text-color);
    }
  `],
})
export class TvChannelMatchesSectionComponent {
  /** Canal abierto, con sus últimos partidos; lo carga el modal. */
  public readonly data = input<TvChannel>();

  private readonly stack = inject(ModalStackService);

  protected readonly matches = computed<MatchListItem[]>(() =>
    (this.data()?.matches ?? []).map((match) => ({
      ...match,
      competition: {name: match.competition.name, short_name: match.competition.short_name},
    })),
  );

  /** Ficha del partido, con su cronología. */
  protected openMatch(match: MatchListItem): void {
    this.stack.push({modalKey: 'match', section: 'events', id: String(match.id)});
  }
}
