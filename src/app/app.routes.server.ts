import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Dónde se genera cada ruta.
 *
 *  - El panel (`/admin/**`) se pinta en el navegador: depende del token guardado en
 *    `localStorage` y de llamadas autenticadas, y a los buscadores no les interesa.
 *  - Todo lo demás (la parte pública) se genera en el servidor en cada petición, con los datos
 *    del momento, para que buscadores y redes reciban la página completa. Quien evita
 *    repetir ese trabajo es la caché de páginas (`src/server.ts`).
 *
 * En producción Apache ni siquiera le pasa `/admin` al servidor de render: sirve directamente
 * `index.csr.html`, el esqueleto vacío de la app (ver `src/.htaccess`).
 */
export const serverRoutes: ServerRoute[] = [
  { path: 'admin/**', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Server },
];
