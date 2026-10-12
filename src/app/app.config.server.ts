import { ApplicationConfig, provideAppInitializer } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideServiceWorker } from '@angular/service-worker';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { provideEdasServer } from '@edas/ng';

import { commonProviders } from './app.config';
import { serverRoutes } from './app.routes.server';
import { SITE_SERVER_API } from './site/site-api.service';
import { prepareServerDocument } from './site/site-server-document';

/**
 * Configuración de la app cuando se genera en el **servidor** (Node). Diferencias con
 * `appConfig`:
 *  - sin DOM real: animaciones noop y service worker desactivado;
 *  - el documento sale sin splash (ver `prepareServerDocument`);
 *  - la API se alcanza por su URL interna y con el token que identifica al servidor de render
 *    (variables de entorno del proceso; ver `src/server.ts`).
 */
export const serverConfig: ApplicationConfig = {
  providers: [
    provideNoopAnimations(),
    // Antes que commonProviders: Taiga resuelve WA_WINDOW al construirse.
    ...provideEdasServer(),
    ...commonProviders,
    // Deshabilitado, pero registrado: el shell inyecta NewVersionCheckerService, que depende
    // de SwUpdate. Sin proveedor, el render falla con NG0201.
    provideServiceWorker('ngsw-worker.js', { enabled: false }),
    provideServerRendering(withRoutes(serverRoutes)),
    provideAppInitializer(prepareServerDocument),
    {
      provide: SITE_SERVER_API,
      useFactory: () => {
        // Una variable definida pero vacía cuenta como no definida
        const url = process.env['FF_API_URL'] || null;

        return { url: url ? url.replace(/\/*$/, '/') : null, token: process.env['FF_CACHE_TOKEN'] || null };
      },
    },
  ],
};
