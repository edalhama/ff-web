import {afterNextRender, computed, inject, Injectable, signal} from '@angular/core';
import {LocaleService} from '@edas/ng/shared/services/locale.service';
import {formatZoned} from '../shared/dates/zoned-dates';

/** Zona horaria con la que el servidor genera las páginas. */
export const SITE_TIME_ZONE = 'Europe/Madrid';

/**
 * Zona horaria en la que se pintan las horas de la parte pública.
 *
 * La página sale del servidor en hora peninsular española. Ya en el navegador, y solo después
 * de que Angular haya enganchado el HTML recibido (antes tiene que pintar exactamente lo mismo
 * que el servidor), pasa a la zona de quien mira.
 */
@Injectable({providedIn: 'root'})
export class SiteClockService {
  private readonly locale = inject(LocaleService);

  private readonly _timeZone = signal(SITE_TIME_ZONE);
  public readonly timeZone = this._timeZone.asReadonly();

  /** ¿Se está pintando ya en la zona de quien mira (y no es la del sitio)? */
  public readonly isLocal = computed(() => this._timeZone() !== SITE_TIME_ZONE);

  constructor() {
    afterNextRender(() => {
      const local = Intl.DateTimeFormat().resolvedOptions().timeZone;

      if (local && local !== SITE_TIME_ZONE) {
        this._timeZone.set(local);
      }
    });
  }

  /** Fecha u hora en el idioma y la zona activos. */
  format(value: string | null | undefined, options: Intl.DateTimeFormatOptions): string {
    return value ? formatZoned(value, this.locale.language(), this._timeZone(), options) : '';
  }

  /** Nombre corto de la zona activa en una fecha: «CEST», «GMT+2». */
  zoneName(at: string | Date | null = null): string {
    const parts = new Intl.DateTimeFormat(this.locale.language(), {timeZone: this._timeZone(), timeZoneName: 'short'}).formatToParts(
      at ? new Date(at) : new Date(),
    );

    return parts.find((part) => part.type === 'timeZoneName')?.value ?? this._timeZone();
  }
}
