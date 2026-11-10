import {HttpClient} from '@angular/common/http';
import {inject, Injectable, signal} from '@angular/core';
import {Pagination} from '@edas/ng/components/layout/list/pagination.model';
import {firstValueFrom, map} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {ApiResponse} from '../../models/api';
import {RoundListContext, SeasonOption} from '../../models/match';

type RoundListResponse = Pagination & {seasons: SeasonOption[]; season_id: number | null; current_round_id: number | null};

/** Jornadas del panel (`/admin/rounds`), siempre dentro de una competición. De solo lectura. */
@Injectable({providedIn: 'root'})
export class RoundApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.api.url}admin/rounds`;

  /** Temporadas, la aplicada y la jornada en disputa de la última página listada. */
  readonly listContext = signal<RoundListContext | null>(null);

  /** Página del listado, con los parámetros de `<edas-list>` tal cual. Pide `competition_id`. */
  list(params: Record<string, string | number | boolean | null>): Promise<Pagination> {
    // Un filtro en «la vigente» llega como null: ese parámetro no se manda
    const query = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== null && value !== undefined && value !== ''),
    ) as Record<string, string | number | boolean>;

    return firstValueFrom(
      this.http.get<ApiResponse<RoundListResponse>>(this.endpoint, {params: query}).pipe(
        map((response) => {
          const page = response.data as RoundListResponse;
          this.listContext.set({
            competitionId: Number(query['competition_id']),
            requestedSeasonId: query['season_id'] != null ? Number(query['season_id']) : null,
            seasons: page.seasons,
            seasonId: page.season_id,
            currentRoundId: page.current_round_id,
          });

          return page as Pagination;
        }),
      ),
    );
  }
}
