import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {Referee, RefereeDesignation, RefereeRole} from '../../shared/models/referee';
import {MatchListComponent, MatchListItem} from '../match/match-list.component';

/** Partido con el rol con el que lo arbitró, para la lista. */
interface DesignatedMatch extends MatchListItem {
  role: RefereeRole;
}

/**
 * Últimos partidos de un árbitro (sección `matches` del modal `referee`): de la más reciente
 * a la más antigua, cada uno con la competición y el rol que tuvo en él. Cada partido abre
 * su ficha.
 */
@Component({
  selector: 'app-referee-matches-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, MatchListComponent, TranslatePipe],
  template: `
    @if (matches(); as list) {
      @if (list.length > 0) {
        <p class="help">{{ 'referee.matches-help' | translate: {count: data()?.designations_count ?? list.length} }}</p>
        <app-match-list [matches]="list" layout="dates" [showCompetition]="true" [roleOf]="roleOf" [interactive]="true" (matchClick)="openMatch($event)"/>
      } @else {
        <edas-app-card icon="calendar-off" [iconSize]="48" [title]="'referee.no-matches-title' | translate" [description]="'referee.no-matches' | translate"/>
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
export class RefereeMatchesSectionComponent {
  /** Árbitro abierto, con sus designaciones; lo carga el modal. */
  public readonly data = input<Referee>();

  private readonly translate = inject(TranslateService);
  private readonly stack = inject(ModalStackService);

  protected readonly matches = computed<DesignatedMatch[]>(() =>
    (this.data()?.designations ?? []).map((designation: RefereeDesignation) => ({
      ...designation.match,
      competition: {name: designation.match.competition.name, short_name: designation.match.competition.short_name},
      role: designation.role,
    })),
  );

  /** «VAR», «Cuarto árbitro»… junto al partido; nada cuando fue el principal. */
  protected readonly roleOf = (match: MatchListItem): string | null => {
    const role = (match as DesignatedMatch).role;

    return role === 'referee' ? null : this.translate.instant(`enum.referee-role.${role}`);
  };

  /** Ficha del partido, con su cronología. */
  protected openMatch(match: MatchListItem): void {
    this.stack.push({modalKey: 'match', section: 'events', id: String(match.id)});
  }
}
