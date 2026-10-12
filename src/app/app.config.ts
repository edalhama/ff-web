import { ApplicationConfig, EnvironmentProviders, Provider, isDevMode, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideClientHydration, withNoHttpTransferCache } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import {
  edasHttpInterceptor,
  provideEdas,
  provideEdasNavigation,
  provideEdasSession,
  provideEdasTranslations,
  provideModalStack,
  withEdasViewTransitions,
} from '@edas/ng';
import { provideEdasSeo } from '@edas/ng/seo/seo.service';

import { environment } from '../environments/environment';
import { AppModalRegistry } from './core/app-modal-registry';
import { AppNavigation } from './core/app-navigation';
import { authTokenInterceptor } from './core/auth-token.interceptor';
import { edasConfig } from './core/edas.config';
import { routes } from './routes';
import { ADMIN_HOME_PATH, LOGIN_PATH, SessionService } from './shared/services/session.service';
import { siteServerApiInterceptor } from './site/site-api.service';

/**
 * Providers válidos en **cualquier plataforma** (navegador y render en servidor).
 *
 * Lo que depende de APIs del navegador NO va aquí, sino en `appConfig` (navegador) o en su
 * equivalente de servidor (`app.config.server.ts`): animaciones del DOM y service worker.
 */
export const commonProviders: Array<Provider | EnvironmentProviders> = [
  provideZonelessChangeDetection(),
  provideRouter(routes, withEdasViewTransitions()),
  provideEdasNavigation(AppNavigation),
  provideModalStack({ registry: AppModalRegistry, fallbackUrl: ADMIN_HOME_PATH }),
  // Guards de sesión e interceptor HTTP (401/403 → SessionService.clearSession()).
  provideEdasSession(SessionService, { loginPath: LOGIN_PATH, homePath: ADMIN_HOME_PATH }),
  // Diccionarios empaquetados en el build, no descargados en runtime.
  ...provideEdasTranslations(edasConfig, {
    es: () => import('../assets/i18n/es.json'),
    en: () => import('../assets/i18n/en.json'),
  }),
  provideEdas(edasConfig),
  provideEdasSeo({ siteUrl: environment.siteUrl, image: 'assets/images/brand/share.png' }),
  // El orden importa: primero el token, después el interceptor de edas-ng (idioma, progreso,
  // avisos de error y cierre de sesión con 401/403) y, al final, el que en el servidor cambia
  // la URL de la API por la interna (los anteriores comparan con la pública).
  provideHttpClient(withInterceptors([authTokenInterceptor, edasHttpInterceptor, siteServerApiInterceptor])),
  // La página que llega generada del servidor se aprovecha: Angular engancha ese HTML en vez
  // de volver a pintarlo. Los datos no se copian aquí (`withNoHttpTransferCache`): los pasa
  // SiteApiService, que sabe cuáles son y los gasta una sola vez.
  provideClientHydration(withNoHttpTransferCache()),
];

/** Configuración de la app en el navegador (`src/main.ts`). */
export const appConfig: ApplicationConfig = {
  providers: [
    // Animaciones reales del DOM: en el servidor se sustituyen por las noop.
    provideAnimations(),
    ...commonProviders,
    // Obligatorio aunque esté desactivado: el shell comprueba si hay versión nueva (SwUpdate).
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
