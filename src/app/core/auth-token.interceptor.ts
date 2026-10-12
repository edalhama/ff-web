import {HttpInterceptorFn} from '@angular/common/http';
import {edasStorage} from '@edas/ng';
import {environment} from '../../environments/environment';
import {StorageKeys} from './storage-keys';

/**
 * Añade `Authorization: Bearer <token>` a las peticiones a ff-api cuando hay sesión guardada.
 *
 * Lee el token directamente del almacenamiento, sin inyectar SessionService: la sesión depende
 * de HttpClient y resolverla aquí crearía un ciclo de dependencias.
 */
export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(environment.api.url)) {
    return next(request);
  }

  const token = edasStorage()?.getItem(StorageKeys.token);

  return next(token ? request.clone({setHeaders: {Authorization: `Bearer ${token}`}}) : request);
};
