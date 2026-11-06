import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {IconComponent} from '@edas/ng/wrapper/components/icon/icon.component';
import {Venue} from '../../shared/models/venue';
import {venueTeams} from './venue-card.component';

/** Celda de nombre de la tabla de estadios: nombre y los equipos que juegan en él. */
@Component({
  selector: 'app-venue-name-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    @if (data(); as venue) {
      <Icon icon="map-pin" size="sm"/>
      <span class="text">
        <span class="name">{{ venue.name }}</span>
        @if (teams(venue); as teams) {
          <span class="teams">{{ teams }}</span>
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

    .teams {
      font-size: 0.8125rem;
      color: var(--edas-muted-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `],
})
export class VenueNameCellComponent {
  public readonly data = input<Venue>();

  protected teams(venue: Venue): string | null {
    return venueTeams(venue);
  }
}
