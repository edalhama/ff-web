import {ChangeDetectionStrategy, Component, inject, input} from '@angular/core';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {BadgeComponent} from '@edas/ng/wrapper/components/badge/badge.component';
import {LinkableType, LinkRow} from '../../shared/models/link';

const ICONS: Record<LinkableType, string> = {competition: 'trophy', team: 'shield', player: 'user', venue: 'map-pin'};

/** Ficha de una entidad para enlazar: abre `link`, con la entidad codificada en el id del modal. */
export function linkModalId(row: {type: LinkableType; id: number}): string {
  return `${row.type}-${row.id}`;
}

/** Tarjeta del listado de enlaces: nombre, detalle y su id en el proveedor (o «Sin enlazar»). */
@Component({
  selector: 'app-link-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, BadgeComponent],
  template: `
    @if (data(); as row) {
      <edas-app-card
        [icon]="icon(row)"
        [iconSize]="48"
        [labelTranslate]="false"
        [title]="row.name"
        [description]="row.detail"
        [interactive]="true"
        (cardClick)="open(row)"
      >
        @if (row.external_id) {
          <edas-badge appearance="success" icon="link" size="s" [label]="row.external_id" [labelTranslate]="false"/>
        } @else {
          <edas-badge appearance="warning" icon="unlink" size="s" label="link.not-linked"/>
        }
      </edas-app-card>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `],
})
export class LinkCardComponent {
  public readonly data = input<LinkRow>();

  private readonly stack = inject(ModalStackService);

  protected icon(row: LinkRow): string {
    return ICONS[row.type];
  }

  protected open(row: LinkRow): void {
    this.stack.push({modalKey: 'link', section: 'edit', id: linkModalId(row)});
  }
}
