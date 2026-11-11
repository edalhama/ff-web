import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {TvChannelSummary} from '../../shared/models/tv-channel';
import {tvChannelLabel} from '../../shared/tv-channels/tv-channels';
import {TeamCrestComponent} from '../team/team-crest.component';

/**
 * Canales que emiten un partido, en el orden del proveedor: el logo (si lo tiene) y el nombre
 * con el dial. Sin canales no pinta nada. `align` los centra (cabecera del partido) o los deja
 * al principio (celda de la tabla).
 */
@Component({
  selector: 'app-tv-channel-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TeamCrestComponent],
  host: {'[class.centered]': "align() === 'center'"},
  template: `
    @for (channel of channels(); track channel.id) {
      <span class="channel" [title]="channel.platform ?? ''">
        <app-team-crest [src]="channel.image" [size]="size()"/>
        <span class="name">{{ label(channel) }}</span>
      </span>
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--edas-space-1) var(--edas-space-3);
      min-width: 0;
    }

    :host(.centered) {
      justify-content: center;
    }

    .channel {
      display: inline-flex;
      align-items: center;
      gap: var(--edas-space-1);
      min-width: 0;
      white-space: nowrap;
    }

    .name {
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `],
})
export class TvChannelListComponent {
  public readonly channels = input<readonly TvChannelSummary[] | null | undefined>([]);
  /** Lado del logo, en píxeles. */
  public readonly size = input(18);
  public readonly align = input<'start' | 'center'>('start');

  protected readonly label = tvChannelLabel;
}
