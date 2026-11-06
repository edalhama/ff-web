import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {IconComponent} from '@edas/ng/wrapper/components/icon/icon.component';
import {Referee} from '../../shared/models/referee';

/** Celda de nombre de la tabla de árbitros: nombre y nombre corto. */
@Component({
  selector: 'app-referee-name-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    @if (data(); as referee) {
      <Icon icon="flag" size="sm"/>
      <span class="text">
        <span class="name">{{ referee.name }}</span>
        @if (referee.short_name) {
          <span class="short">{{ referee.short_name }}</span>
        }
      </span>
    }
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      gap: var(--edas-space-2);
      max-width: 20rem;
    }

    .text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .name {
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .short {
      font-size: 0.8125rem;
      color: var(--edas-muted-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `],
})
export class RefereeNameCellComponent {
  public readonly data = input<Referee>();
}
