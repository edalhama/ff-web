import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {BadgeComponent} from '@edas/ng/wrapper/components/badge/badge.component';

/** Celda de estado para la vista de tabla de `<edas-list>`: activa / inactiva según `data.active`. */
@Component({
  selector: 'app-active-badge-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent],
  template: `
    @if (data(); as entity) {
      <edas-badge
        [appearance]="entity.active ? 'success' : 'neutral'"
        [icon]="entity.active ? 'check-circle' : 'x-circle'"
        [label]="entity.active ? 'common.active' : 'common.inactive'"
        size="s"
      />
    }
  `,
})
export class ActiveBadgeCellComponent {
  public readonly data = input<{active: boolean}>();
}
