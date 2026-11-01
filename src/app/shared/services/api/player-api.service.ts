import {HttpClient} from '@angular/common/http';
import {inject, Injectable, signal} from '@angular/core';
import {Pagination} from '@edas/ng/components/layout/list/pagination.model';
import {firstValueFrom, map, Observable, Subject, tap} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {ApiResponse} from '../../models/api';
import {PlayerDetail, PlayerListContext, PlayerPayload} from '../../models/player';
import {TeamSummary} from '../../models/team';

type PlayerListResponse = Pagination & {season: {id: number; label: string} | null; teams: TeamSummary[]};

/** Jugadores del panel (`/admin/players`), siempre dentro de una competición. Los crea la sincronización. */
@Injectable({providedIn: 'root'})
export class PlayerApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.api.url}admin/players`;

  /** Emite cuando cambia un jugador: las listas montadas que lo muestran se recargan. */
  readonly refreshList$ = new Subject<void>();

  /** Temporada y equipos de la última competición listada, para el filtro de equipo. */
  readonly listContext = signal<PlayerListContext | null>(null);

  /** Página del listado, con los parámetros de `<edas-list>` tal cual. Pide `competition_id`. */
  list(params: Record<string, string | number | boolean | null>): Promise<Pagination> {
    // Un filtro en «todos» llega como null: ese parámetro no se manda
    const query = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== null && value !== undefined && value !== ''),
    ) as Record<string, string | number | boolean>;

    return firstValueFrom(
      this.http.get<ApiResponse<PlayerListResponse>>(this.endpoint, {params: query}).pipe(
        map((response) => {
          const page = response.data as PlayerListResponse;
          this.listContext.set({competitionId: Number(query['competition_id']), season: page.season, teams: page.teams});

          return page as Pagination;
        }),
      ),
    );
  }

  /** `competitionId` dice desde qué competición se mira: decide con qué fuente preferida sale su cara. */
  get(id: number, competitionId: number | null = null): Observable<PlayerDetail> {
    const params = competitionId ? {competition: competitionId} : {};

    return this.http.get<ApiResponse<{player: PlayerDetail}>>(`${this.endpoint}/${id}`, {params}).pipe(map((response) => response.data!.player));
  }

  /** Edición parcial: solo cambia lo que va en `payload`. */
  update(id: number, payload: PlayerPayload, competitionId: number | null = null): Observable<PlayerDetail> {
    const params = competitionId ? {competition: competitionId} : {};

    return this.http.put<ApiResponse<{player: PlayerDetail}>>(`${this.endpoint}/${id}`, payload, {params}).pipe(
      map((response) => response.data!.player),
      tap(() => this.refreshList$.next()),
    );
  }
}
