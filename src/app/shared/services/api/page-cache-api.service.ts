import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {map, Observable} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {ApiResponse} from '../../models/api';
import {PageCachePurge, PageCachePurgeRequest, PageCacheState} from '../../models/page-cache';

/** Caché de las páginas públicas: qué hay guardado en cada capa y purgarlo. */
@Injectable({providedIn: 'root'})
export class PageCacheApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.api.url}admin/page-cache`;

  state(): Observable<PageCacheState> {
    return this.http.get<ApiResponse<PageCacheState>>(this.endpoint).pipe(map((response) => response.data as PageCacheState));
  }

  /** Purga y devuelve qué ha pasado en cada capa, junto con el estado ya actualizado. */
  purge(request: PageCachePurgeRequest): Observable<{result: PageCachePurge; state: PageCacheState; message: string}> {
    return this.http.post<ApiResponse<PageCacheState & {result: PageCachePurge}>>(`${this.endpoint}/purge`, request).pipe(
      map((response) => {
        const {result, ...state} = response.data as PageCacheState & {result: PageCachePurge};

        return {result, state, message: response.message ?? ''};
      }),
    );
  }
}
