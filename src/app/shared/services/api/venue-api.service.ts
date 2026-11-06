import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Pagination} from '@edas/ng/components/layout/list/pagination.model';
import {firstValueFrom, map, Observable, Subject, tap} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {ApiResponse} from '../../models/api';
import {Venue, VenuePayload} from '../../models/venue';

/** Estadios del panel (`/admin/venues`). Se consultan y se corrigen; los crea la sincronización. */
@Injectable({providedIn: 'root'})
export class VenueApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.api.url}admin/venues`;

  /** Emite cuando cambia un estadio: las listas montadas que los muestran se recargan. */
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

  get(id: number): Observable<Venue> {
    return this.http.get<ApiResponse<{venue: Venue}>>(`${this.endpoint}/${id}`).pipe(map((response) => response.data!.venue));
  }

  /** Edición parcial: solo cambia lo que va en `payload`. */
  update(id: number, payload: VenuePayload): Observable<Venue> {
    return this.http.put<ApiResponse<{venue: Venue}>>(`${this.endpoint}/${id}`, payload).pipe(
      map((response) => response.data!.venue),
      tap(() => this.refreshList$.next()),
    );
  }
}
