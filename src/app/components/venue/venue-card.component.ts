import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {AppCardComponent, EdasAppCardStat} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {BadgeComponent} from '@edas/ng/wrapper/components/badge/badge.component';
import {Venue} from '../../shared/models/venue';

/** Equipos que juegan en el estadio, para una línea: «Barcelona», «Sevilla · Betis». */
export function venueTeams(venue: Venue): string | null {
  const names = (venue.teams ?? []).map((team) => team.name).filter(Boolean);

  return names.length > 0 ? names.join(' · ') : null;
}

/**
 * Tarjeta de estadio del listado del panel: nombre, equipos que juegan en él, ciudad, aforo y
 * partidos. Toda la tarjeta abre la ficha del estadio.
 */
@Component({
  selector: 'app-venue-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, BadgeComponent],
  template: `
    @if (data(); as venue) {
      <edas-app-card
        icon="map-pin"
        [iconSize]="48"
        [labelTranslate]="false"
        [title]="venue.name"
        [description]="teams()"
        [tag]="venue.city"
        [interactive]="true"
        [stats]="stats()"
        (cardClick)="open()"
      >
        @if (venue.surface) {
          <edas-badge appearance="info" [label]="'enum.surface.' + venue.surface" size="s"/>
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
export class VenueCardComponent {
  public readonly data = input<Venue>();

  private readonly stack = inject(ModalStackService);
  private readonly translate = inject(TranslateService);

  protected readonly teams = computed(() => {
    const venue = this.data();

    return venue ? venueTeams(venue) : null;
  });

  protected readonly stats = computed<EdasAppCardStat[]>(() => {
    const venue = this.data();
    // Lee el idioma activo (signal) para que las etiquetas cambien con él
    this.translate.currentLang();

    return [
      {
        label: this.translate.instant('venue.capacity'),
        value: venue?.capacity != null ? venue.capacity.toLocaleString(this.translate.currentLang()) : '—',
        muted: venue?.capacity == null,
      },
      {
        label: this.translate.instant('venue.opened'),
        value: venue?.opened_year ? String(venue.opened_year) : '—',
        muted: !venue?.opened_year,
      },
      {
        label: this.translate.instant('venue.matches'),
        value: venue?.matches_count ?? 0,
        muted: !venue?.matches_count,
      },
    ];
  });

  protected open(): void {
    this.stack.push({modalKey: 'venue', section: 'edit', id: String(this.data()!.id)});
  }
}
