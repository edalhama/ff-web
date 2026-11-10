import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {BadgeComponent} from '@edas/ng/wrapper/components/badge/badge.component';
import {MatchScoreRow} from '../../shared/models/match';

/** Papel en el partido (titular, suplente, no convocado) y, si lo fue, el brazalete. */
@Component({
  selector: 'app-match-player-role-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent, TranslatePipe],
  template: `
    @if (data(); as row) {
      <span [class.muted]="row.role === 'absent'">{{ 'enum.lineup-role.' + row.role | translate }}</span>
      @if (row.is_captain) {
        <edas-badge appearance="info" label="match.captain-short" size="s" [attr.title]="'match.captain' | translate"/>
      }
    }
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--edas-space-2);
    }

    .muted {
      color: var(--edas-muted-text-color);
    }
  `],
})
export class MatchPlayerRoleCellComponent {
  public readonly data = input<MatchScoreRow>();
}

/** Distinciones de la nota elegida: destacado del partido, once ideal y provisional. */
@Component({
  selector: 'app-match-score-badges-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent],
  template: `
    @if (data()?.score; as score) {
      @if (score.is_featured) {
        <edas-badge appearance="success" icon="star" label="match.featured" size="s"/>
      }
      @if (score.is_ideal) {
        <edas-badge appearance="info" icon="shield-check" label="match.ideal" size="s"/>
      }
      @if (score.is_provisional) {
        <edas-badge appearance="warning" icon="hourglass" label="match.provisional" size="s"/>
      }
    }
  `,
  styles: [`
    :host {
      display: inline-flex;
      flex-wrap: wrap;
      gap: var(--edas-space-1);
    }
  `],
})
export class MatchScoreBadgesCellComponent {
  public readonly data = input<MatchScoreRow>();
}
