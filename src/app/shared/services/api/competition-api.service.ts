import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Pagination} from '@edas/ng/components/layout/list/pagination.model';
import {firstValueFrom, map, Observable, Subject, tap} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {ApiResponse} from '../../models/api';
import {Competition, CompetitionPayload} from '../../models/competition';

/** Competiciones del panel (`/admin/competitions`). */
@Injectable({providedIn: 'root'})
export class CompetitionApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.api.url}admin/competitions`;

  /** Emite cuando cambia algo que el listado muestra: las listas montadas se recargan. */
  readonly refreshList$ = new Subject<void>();

  /**
   * Página del listado. `params` son los de `<edas-list>` (search, orderBy, order, page y un
   * valor por filtro), que la API admite tal cual.
   */
  list(params: Record<string, string | number | boolean | null>): Promise<Pagination> {
    // Un filtro en «todas» llega como null: ese parámetro no se manda
    const query = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== null && value !== undefined && value !== ''),
    ) as Record<string, string | number | boolean>;

    return firstValueFrom(
      this.http.get<ApiResponse<Pagination>>(this.endpoint, {params: query}).pipe(map((response) => response.data as Pagination)),
    );
  }

  get(id: number): Observable<Competition> {
    return this.http.get<ApiResponse<{competition: Competition}>>(`${this.endpoint}/${id}`).pipe(
      map((response) => response.data!.competition),
    );
  }

  create(payload: CompetitionPayload): Observable<Competition> {
    return this.http.post<ApiResponse<{competition: Competition}>>(this.endpoint, payload).pipe(
      map((response) => response.data!.competition),
      tap(() => this.refreshList$.next()),
    );
  }

  /** Edición parcial: solo cambia lo que va en `payload`. */
  update(id: number, payload: CompetitionPayload): Observable<Competition> {
    return this.http.put<ApiResponse<{competition: Competition}>>(`${this.endpoint}/${id}`, payload).pipe(
      map((response) => response.data!.competition),
      tap(() => this.refreshList$.next()),
    );
  }

  remove(id: number): Observable<void> {
    return this.http.delete<ApiResponse>(`${this.endpoint}/${id}`).pipe(
      map(() => undefined),
      tap(() => this.refreshList$.next()),
    );
  }
}
