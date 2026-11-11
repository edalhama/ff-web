import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {IconComponent} from '@edas/ng/wrapper/components/icon/icon.component';
import {MatchRow} from '../../shared/models/match';
import {TvChannel} from '../../shared/models/tv-channel';
import {TeamCrestComponent} from '../team/team-crest.component';
import {TvChannelListComponent} from './tv-channel-list.component';

/** Celda de nombre de la tabla de canales: el logo (o un icono) y el nombre. */
@Component({
  selector: 'app-tv-channel-name-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, TeamCrestComponent],
  template: `
    @if (data(); as channel) {
      @if (channel.image) {
        <app-team-crest [src]="channel.image" [size]="24"/>
      } @else {
        <Icon icon="tv" size="sm"/>
      }
      <span class="name">{{ channel.name }}</span>
    }
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      gap: var(--edas-space-2);
      max-width: 20rem;
    }

    .name {
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `],
})
export class TvChannelNameCellComponent {
  public readonly data = input<TvChannel>();
}

/** Celda de la tabla de partidos: los canales que lo emiten, o «—». */
@Component({
  selector: 'app-match-tv-channels-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TvChannelListComponent],
  template: `
    @if (data()?.tv_channels?.length) {
      <app-tv-channel-list [channels]="data()!.tv_channels" [size]="16"/>
    } @else {
      <span class="none">—</span>
    }
  `,
  styles: [`
    :host {
      display: block;
      max-width: 16rem;
      font-size: 0.8125rem;
    }

    .none {
      color: var(--edas-muted-text-color);
    }
  `],
})
export class MatchTvChannelsCellComponent {
  public readonly data = input<MatchRow>();
}
