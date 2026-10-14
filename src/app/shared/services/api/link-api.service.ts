import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Pagination} from '@edas/ng/components/layout/list/pagination.model';
import {firstValueFrom, map, Observable, Subject, tap} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {ApiResponse} from '../../models/api';
import {LinkableType, LinkEntity, LinkSummary} from '../../models/link';

/** Enlaces con los proveedores (`/admin/links`): resumen, listados y enlace a mano. */
@Injectable({providedIn: 'root'})
export class LinkApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.api.url}admin/links`;

  /** Emite cuando cambia un enlace: el resumen y el listado se recargan. */
  readonly changed$ = new Subject<void>();

  summary(): Observable<LinkSummary> {
    return this.http.get<ApiResponse<LinkSummary>>(this.endpoint).pipe(map((response) => response.data!));
  }

  /** Página del listado de un tipo, con los parámetros de `<edas-list>` tal cual (`status`, `provider`, `search`…). */
  list(type: LinkableType, params: Record<string, string | number | boolean | null>): Promise<Pagination> {
    const query = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== null && value !== undefined && value !== ''),
    ) as Record<string, string | number | boolean>;

    return firstValueFrom(
      this.http.get<ApiResponse<Pagination>>(`${this.endpoint}/${type}`, {params: query}).pipe(map((response) => response.data as Pagination)),
    );
  }

  get(type: LinkableType, id: number): Observable<LinkEntity> {
    return this.http.get<ApiResponse<{entity: LinkEntity}>>(`${this.endpoint}/${type}/${id}`).pipe(map((response) => response.data!.entity));
  }

  /** Enlaza (o cambia el id de) un equipo, un jugador o un estadio. */
  link(type: LinkableType, id: number, provider: string, externalId: string): Observable<LinkEntity> {
    return this.http
      .put<ApiResponse<{entity: LinkEntity}>>(`${this.endpoint}/${type}/${id}`, {provider, external_id: externalId})
      .pipe(
        map((response) => response.data!.entity),
        tap(() => this.changed$.next()),
      );
  }

  unlink(type: LinkableType, id: number, provider: string): Observable<LinkEntity> {
    return this.http.delete<ApiResponse<{entity: LinkEntity}>>(`${this.endpoint}/${type}/${id}/${provider}`).pipe(
      map((response) => response.data!.entity),
      tap(() => this.changed$.next()),
    );
  }
}
