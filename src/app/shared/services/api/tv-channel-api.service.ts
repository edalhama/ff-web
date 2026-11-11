import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Pagination} from '@edas/ng/components/layout/list/pagination.model';
import {firstValueFrom, map, Observable, Subject, tap} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {ApiResponse} from '../../models/api';
import {TvChannel, TvChannelPayload} from '../../models/tv-channel';

/**
 * Canales de TV del panel (`/admin/tv-channels`). Los crea la sincronización con el calendario;
 * aquí se consultan, se corrigen, se dan de alta y de baja, y se les sube el logo.
 */
@Injectable({providedIn: 'root'})
export class TvChannelApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.api.url}admin/tv-channels`;

  /** Emite cuando cambia un canal: las listas montadas que los muestran se recargan. */
  readonly refreshList$ = new Subject<void>();

  /** Página del listado, con los parámetros de `<edas-list>` tal cual. */
  list(params: Record<string, string | number | boolean | null>): Promise<Pagination> {
    // Un filtro en «todos» llega como null: ese parámetro no se manda
    const query = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== null && value !== undefined && value !== ''),
    ) as Record<string, string | number | boolean>;

    return firstValueFrom(
      this.http.get<ApiResponse<Pagination>>(this.endpoint, {params: query}).pipe(map((response) => response.data as Pagination)),
    );
  }

  /** Ficha, con sus enlaces y sus últimos partidos. */
  get(id: number): Observable<TvChannel> {
    return this.http.get<ApiResponse<{tv_channel: TvChannel}>>(`${this.endpoint}/${id}`).pipe(map((response) => response.data!.tv_channel));
  }

  create(payload: TvChannelPayload): Observable<TvChannel> {
    return this.http.post<ApiResponse<{tv_channel: TvChannel}>>(this.endpoint, payload).pipe(
      map((response) => response.data!.tv_channel),
      tap(() => this.refreshList$.next()),
    );
  }

  /** Edición parcial: solo cambia lo que va en `payload`. */
  update(id: number, payload: TvChannelPayload): Observable<TvChannel> {
    return this.http.put<ApiResponse<{tv_channel: TvChannel}>>(`${this.endpoint}/${id}`, payload).pipe(
      map((response) => response.data!.tv_channel),
      tap(() => this.refreshList$.next()),
    );
  }

  /** Solo si no emite ningún partido (si no, la API responde 409 y el interceptor lo explica). */
  remove(id: number): Observable<void> {
    return this.http.delete<ApiResponse>(`${this.endpoint}/${id}`).pipe(
      map(() => undefined),
      tap(() => this.refreshList$.next()),
    );
  }

  /** Sube o cambia el logo (multipart, campo `image`). */
  uploadImage(id: number, file: File): Observable<TvChannel> {
    const body = new FormData();
    body.append('image', file, file.name);

    return this.http.post<ApiResponse<{tv_channel: TvChannel}>>(`${this.endpoint}/${id}/image`, body).pipe(
      map((response) => response.data!.tv_channel),
      tap(() => this.refreshList$.next()),
    );
  }

  removeImage(id: number): Observable<TvChannel> {
    return this.http.delete<ApiResponse<{tv_channel: TvChannel}>>(`${this.endpoint}/${id}/image`).pipe(
      map((response) => response.data!.tv_channel),
      tap(() => this.refreshList$.next()),
    );
  }
}
