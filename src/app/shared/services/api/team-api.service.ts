import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Pagination} from '@edas/ng/components/layout/list/pagination.model';
import {firstValueFrom, map, Observable, Subject, tap} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {ApiResponse} from '../../models/api';
import {Team, TeamPayload} from '../../models/team';

/** Equipos del panel (`/admin/teams`). Se consultan y se corrigen; los crea la sincronización. */
@Injectable({providedIn: 'root'})
export class TeamApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.api.url}admin/teams`;

  /** Emite cuando cambia un equipo: las listas montadas que los muestran se recargan. */
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

  get(id: number): Observable<Team> {
    return this.http.get<ApiResponse<{team: Team}>>(`${this.endpoint}/${id}`).pipe(map((response) => response.data!.team));
  }

  /** Edición parcial: solo cambia lo que va en `payload`. */
  update(id: number, payload: TeamPayload): Observable<Team> {
    return this.http.put<ApiResponse<{team: Team}>>(`${this.endpoint}/${id}`, payload).pipe(
      map((response) => response.data!.team),
      tap(() => this.refreshList$.next()),
    );
  }
}
