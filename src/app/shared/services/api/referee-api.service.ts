import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Pagination} from '@edas/ng/components/layout/list/pagination.model';
import {firstValueFrom, map, Observable, Subject, tap} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {ApiResponse} from '../../models/api';
import {Referee, RefereePayload} from '../../models/referee';

/** Árbitros del panel (`/admin/referees`). Se consultan y se corrigen; los crea la sincronización. */
@Injectable({providedIn: 'root'})
export class RefereeApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.api.url}admin/referees`;

  /** Emite cuando cambia un árbitro: las listas montadas que los muestran se recargan. */
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

  /** Ficha, con sus últimas designaciones. */
  get(id: number): Observable<Referee> {
    return this.http.get<ApiResponse<{referee: Referee}>>(`${this.endpoint}/${id}`).pipe(map((response) => response.data!.referee));
  }

  /** Edición parcial: solo cambia lo que va en `payload`. */
  update(id: number, payload: RefereePayload): Observable<Referee> {
    return this.http.put<ApiResponse<{referee: Referee}>>(`${this.endpoint}/${id}`, payload).pipe(
      map((response) => response.data!.referee),
      tap(() => this.refreshList$.next()),
    );
  }
}
