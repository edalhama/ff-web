import localeEs from '@angular/common/locales/es';
import {EdasConfig} from '@edas/ng';

/**
 * Configuración de edas-ng para fantasyfutbol (`provideEdas(edasConfig)` en `app.config.ts`).
 *
 * `npm run i18n:sync` lee de aquí idiomas y namespaces: un namespace que falte hace que sus
 * claves se pinten como texto libre.
 */
export const edasConfig: EdasConfig = {
  appName: 'fantasyfutbol',
  // Los mismos que `locales` en ff-api/config/app.php; el primero es el principal.
  languages: ['es', 'en'],
  defaultLanguage: 'es',
  // Fechas y números en castellano (LocalizedDatePipe, DatePipe); el inglés viene de serie.
  localeData: {es: localeEs},
  // Combinaciones de edas-layout/taiga-theme.less; cada una existe en claro y en oscuro.
  themeVariants: ['default', 'teal', 'purple', 'ocean', 'emerald', 'amber', 'sunset', 'coral', 'rose', 'graphite'],
  defaultThemeMode: 'dark',
  defaultThemeVariant: 'emerald',
  i18nNamespaces: ['auth', 'nav', 'title', 'common', 'alert', 'landing', 'admin', 'competition', 'season', 'team', 'texts', 'match', 'standing', 'sync', 'cache', 'site', 'enum', 'lang', 'server'],
  brand: {
    // Marca provisional (monocroma, por eso se invierte en oscuro). Sustituir los ficheros.
    logo: 'assets/images/brand/logo.webp',
    icon: 'assets/images/brand/icon.png',
    alt: 'fantasyfutbol',
    homePath: '/',
    invertOnDark: true,
  },
};
