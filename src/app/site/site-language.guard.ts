import {DOCUMENT} from '@angular/common';
import {inject} from '@angular/core';
import {CanActivateFn} from '@angular/router';
import {edasStorage, injectEdasConfig} from '@edas/ng';
import {LocaleService, resolveLanguage} from '@edas/ng/shared/services/locale.service';
import {SiteLanguage} from './site-links';

/**
 * En la parte pública el idioma lo manda la URL (`/en/...` es inglés; sin prefijo, español),
 * no la preferencia guardada: quien llega por un enlace o desde un buscador tiene que ver la
 * página en el idioma de ese enlace, y el servidor tiene que generarla en él.
 *
 * No toca la preferencia guardada (la que usa el panel): visitar una página en inglés no
 * cambia el idioma en el que alguien quiere trabajar.
 *
 * Espera a que el diccionario esté cargado, así la página se pinta ya traducida.
 */
export function useSiteLanguage(lang: SiteLanguage): CanActivateFn {
  return async () => {
    const locale = inject(LocaleService);
    const document = inject(DOCUMENT);

    if (locale.language() !== lang) {
      const storage = edasStorage();
      const key = injectEdasConfig().storageKeys.language;
      const preferred = storage?.getItem(key) ?? null;

      // `setLanguage` guarda siempre lo que aplica: se deja como estaba
      await locale.setLanguage(lang);

      if (preferred === null) {
        storage?.removeItem(key);
      } else {
        storage?.setItem(key, preferred);
      }
    }

    document.documentElement.lang = lang;

    return true;
  };
}

/**
 * En el panel el idioma es una preferencia de quien lo usa (la guardada; si no hay, la de su
 * navegador). Al entrar desde una página pública en otro idioma, se vuelve a ella.
 */
export const usePreferredLanguage: CanActivateFn = async () => {
  const locale = inject(LocaleService);
  const document = inject(DOCUMENT);
  const preferred = resolveLanguage(injectEdasConfig());

  if (locale.language() !== preferred) {
    await locale.setLanguage(preferred);
  }

  document.documentElement.lang = preferred;

  return true;
};
