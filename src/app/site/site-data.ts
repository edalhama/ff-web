import {HttpErrorResponse} from '@angular/common/http';
import {inject} from '@angular/core';
import {catchError, map, Observable, of} from 'rxjs';
import {SITE_TTL} from './site-cache';
import {SiteResponseService} from './site-response.service';

/**
 * Resultado de cargar los datos de una página pública. Nunca falla hacia fuera: la pantalla
 * recibe siempre uno de los tres casos y pinta el suyo.
 */
export type SiteData<T> =
  | {state: 'ok'; data: T}
  /** La API dice que no existe: la página es un 404. */
  | {state: 'not-found'}
  /** La API no ha respondido: error temporal, no un «no existe». */
  | {state: 'error'};

export const SITE_NOT_FOUND = {state: 'not-found'} as const;

/**
 * Convierte la petición en un `SiteData` y deja en la respuesta del servidor el código que
 * corresponde: 404 si no existe (y se guarda poco), 503 si la API ha fallado (y no se guarda:
 * un buscador que vea un 503 vuelve más tarde; un 404 lo daría por desaparecido).
 *
 * Hay que llamarlo dentro de un contexto de inyección (un resolver).
 */
export function loadSiteData<T>(request: Observable<T>): Observable<SiteData<T>> {
  const response = inject(SiteResponseService);

  return request.pipe(
    map((data): SiteData<T> => ({state: 'ok', data})),
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        response.status(404);
        response.cache(SITE_TTL.notFound);

        return of<SiteData<T>>(SITE_NOT_FOUND);
      }

      response.status(503);
      response.noCache();

      return of<SiteData<T>>({state: 'error'});
    }),
  );
}

/** Los datos si han llegado bien; null en los otros dos casos. */
export function dataOf<T>(result: SiteData<T> | null | undefined): T | null {
  return result?.state === 'ok' ? result.data : null;
}
