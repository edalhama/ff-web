import {HttpClient} from '@angular/common/http';
import {inject, Injectable, signal} from '@angular/core';
import {Pagination} from '@edas/ng/components/layout/list/pagination.model';
import {firstValueFrom, map, Observable} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {ApiResponse} from '../../models/api';
import {MatchDetail, MatchListContext, Round, SeasonOption} from '../../models/match';

type MatchListResponse = Pagination & {seasons: SeasonOption[]; rounds: Round[]; season_id: number | null; round_id: number | null};

/**
 * Partidos del panel (`/admin/matches`), siempre dentro de una competición: los de una jornada
 * y la ficha de cada uno. De solo lectura: todo llega por la sincronización.
 */
@Injectable({providedIn: 'root'})
export class MatchApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.api.url}admin/matches`;

  /** Temporadas, jornadas y lo aplicado en la última página listada, para los filtros. */
  readonly listContext = signal<MatchListContext | null>(null);

  /**
   * Página del listado, con los parámetros de `<edas-list>` tal cual. Pide `competition_id`;
   * sin `season_id` ni `round_id`, el servidor elige la temporada vigente y la jornada en disputa.
   */
  list(params: Record<string, string | number | boolean | null>): Promise<Pagination> {
    // Un filtro en «todos» (o en «la vigente») llega como null: ese parámetro no se manda
    const query = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== null && value !== undefined && value !== ''),
    ) as Record<string, string | number | boolean>;

    return firstValueFrom(
      this.http.get<ApiResponse<MatchListResponse>>(this.endpoint, {params: query}).pipe(
        map((response) => {
          const page = response.data as MatchListResponse;
          this.listContext.set({
            competitionId: Number(query['competition_id']),
            requestedSeasonId: query['season_id'] != null ? Number(query['season_id']) : null,
            requestedRoundId: query['round_id'] != null ? Number(query['round_id']) : null,
            seasons: page.seasons,
            rounds: page.rounds,
            seasonId: page.season_id,
            roundId: page.round_id,
          });

          return page as Pagination;
        }),
      ),
    );
  }

  /** Ficha: el partido, sus eventos, sus jugadores con sus notas y los sistemas de su competición. */
  get(id: number): Observable<MatchDetail> {
    return this.http.get<ApiResponse<MatchDetail>>(`${this.endpoint}/${id}`).pipe(map((response) => response.data!));
  }
}
