import {ChangeDetectionStrategy, Component, inject, input} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {SiteClockService} from '../../site/site-clock.service';

/**
 * Nota al pie de una lista de partidos: en qué zona horaria están sus horas. La del sitio
 * (peninsular española) mientras la página es la que generó el servidor; la de quien mira
 * en cuanto la app arranca en su navegador.
 */
@Component({
  selector: 'app-site-time-zone-note',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    <p class="site-note">
      {{ (clock.isLocal() ? 'site.time-zone-local' : 'site.time-zone') | translate: {zone: clock.zoneName(at())} }}
    </p>
  `,
})
export class SiteTimeZoneNoteComponent {
  /** Fecha de referencia para el nombre de la zona (cambia con el horario de verano). */
  public readonly at = input<string | null>(null);

  protected readonly clock = inject(SiteClockService);
}
