import {signal} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {validationErrors} from '../services/api/api-errors';

/** Namespace i18n (declarado en `edas.config.ts`) donde se dejan los mensajes del servidor. */
const NAMESPACE = 'server';

/**
 * Errores de validación de ff-api, por campo, para pintarlos bajo cada control.
 *
 * Los campos de edas-ng (`errorText`) esperan una CLAVE i18n: un texto libre lo tratan como
 * etiqueta heredada y lo pasan a kebab-case. El mensaje del servidor ya viene traducido, así que
 * se registra en ngx-translate bajo `server.<campo>` y lo que recibe el control es esa clave.
 *
 * ```ts
 * protected readonly errors = new ServerErrors(inject(TranslateService));
 * // plantilla: [invalid]="errors.has('label')" [errorText]="errors.key('label')"
 * // al fallar el guardado: this.errors.capture(error)
 * ```
 */
export class ServerErrors {
  private readonly messages = signal<Record<string, string>>({});

  constructor(private readonly translate: TranslateService) {}

  /** Recoge los errores de una respuesta 400 y devuelve los campos afectados. */
  capture(error: unknown): string[] {
    const messages = validationErrors(error);

    for (const [field, message] of Object.entries(messages)) {
      this.translate.set(this.key(field), message);
    }

    this.messages.set(messages);
    return Object.keys(messages);
  }

  /** Olvida el error de un campo (al corregirlo) o todos. */
  clear(field?: string): void {
    if (field === undefined) {
      this.messages.set({});
      return;
    }

    if (field in this.messages()) {
      this.messages.update(({[field]: _, ...rest}) => rest);
    }
  }

  has(field: string): boolean {
    return field in this.messages();
  }

  /** Clave i18n del mensaje de `field`, o vacío si no tiene error. */
  errorText(field: string): string {
    return this.has(field) ? this.key(field) : '';
  }

  /** `translations.es.slug` → `server.translations-es-slug` (el punto separa niveles en i18n). */
  private key(field: string): string {
    return `${NAMESPACE}.${field.replace(/[^a-zA-Z0-9]+/g, '-')}`;
  }
}
