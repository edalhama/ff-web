import {HttpClient} from '@angular/common/http';
import {inject, Injectable, signal} from '@angular/core';
import {Pagination} from '@edas/ng/components/layout/list/pagination.model';
import {firstValueFrom, map} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {ApiResponse} from '../../models/api';
import {MarketListContext, MarketProvider} from '../../models/market';
import {TeamSummary} from '../../models/team';

type MarketListResponse = Pagination & {
  season: {id: number; label: string} | null;
  teams: TeamSummary[];
  providers: Array<{code: MarketProvider; name: string}>;
  dates: string[];
  provider: MarketProvider | null;
  date: string | null;
};

/**
 * Mercado de Biwenger y LaLiga Fantasy en el panel (`/admin/market`), siempre dentro de una
 * competición. De solo lectura: llega de Jornada Perfecta con la sincronización del mercado.
 */
@Injectable({providedIn: 'root'})
export class MarketApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.api.url}admin/market`;

  /** Equipos, juegos, días y lo aplicado en la última página listada, para los filtros. */
  readonly listContext = signal<MarketListContext | null>(null);

  /**
   * Página del listado, con los parámetros de `<edas-list>` tal cual. Pide `competition_id`; sin
   * `provider` ni `date`, el servidor elige Biwenger y su último día con precios.
   */
  list(params: Record<string, string | number | boolean | null>): Promise<Pagination> {
    // Un filtro en «todos» (o en «el último día») llega como null: ese parámetro no se manda
    const query = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== null && value !== undefined && value !== ''),
    ) as Record<string, string | number | boolean>;

    return firstValueFrom(
      this.http.get<ApiResponse<MarketListResponse>>(this.endpoint, {params: query}).pipe(
        map((response) => {
          const page = response.data as MarketListResponse;
          this.listContext.set({
            competitionId: Number(query['competition_id']),
            season: page.season,
            teams: page.teams,
            providers: page.providers,
            dates: page.dates,
            provider: page.provider,
            date: page.date,
            requestedProvider: (query['provider'] as MarketProvider | undefined) ?? null,
          });

          return page as Pagination;
        }),
      ),
    );
  }
}
