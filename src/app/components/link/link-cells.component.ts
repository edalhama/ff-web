import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {BadgeComponent} from '@edas/ng/wrapper/components/badge/badge.component';
import {LinkRow} from '../../shared/models/link';

/** Celda de nombre del listado de enlaces: el nombre y lo que lo distingue. */
@Component({
  selector: 'app-link-name-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (data(); as row) {
      <span class="name">{{ row.name }}</span>
      @if (row.detail) {
        <span class="detail">{{ row.detail }}</span>
      }
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      max-width: 22rem;
    }

    .name {
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .detail {
      font-size: 0.8125rem;
      color: var(--edas-muted-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `],
})
export class LinkNameCellComponent {
  public readonly data = input<LinkRow>();
}

/** Celda del id en el proveedor: el id, o «Sin enlazar». */
@Component({
  selector: 'app-link-status-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent],
  template: `
    @if (data(); as row) {
      @if (row.external_id) {
        <edas-badge appearance="success" icon="link" size="s" [label]="row.external_id" [labelTranslate]="false"/>
      } @else {
        <edas-badge appearance="warning" icon="unlink" size="s" label="link.not-linked"/>
      }
    }
  `,
})
export class LinkStatusCellComponent {
  public readonly data = input<LinkRow>();
}
