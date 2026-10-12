import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {map, Observable} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {ApiResponse} from '../../models/api';
import {SyncDataType, SyncState} from '../../models/sync';

/** Sincronización de una competición con sus proveedores de datos. */
@Injectable({providedIn: 'root'})
export class SyncApiService {
  private readonly http = inject(HttpClient);

  private url(competitionId: number): string {
    return `${environment.api.url}admin/competitions/${competitionId}/sync`;
  }

  /** De dónde vienen los datos y qué pasó en las últimas ejecuciones. */
  state(competitionId: number): Observable<SyncState> {
    return this.http.get<ApiResponse<SyncState>>(this.url(competitionId)).pipe(map((response) => this.normalize(response.data)));
  }

  /**
   * Sincroniza ahora y espera al resultado. Si no se puede completar, la API responde 422
   * con el motivo (el interceptor lo enseña) y el estado actualizado en `data`.
   */
  run(competitionId: number, options: {seasonYear?: number | null; types?: SyncDataType[]} = {}): Observable<SyncState> {
    const body: Record<string, unknown> = {};

    if (options.seasonYear != null) {
      body['season_year'] = options.seasonYear;
    }
    if (options.types?.length) {
      body['types'] = options.types;
    }

    return this.http.post<ApiResponse<SyncState>>(this.url(competitionId), body).pipe(map((response) => this.normalize(response.data)));
  }

  /** Estado que viaja en el cuerpo de un error de `run()`, o null si el error no lo trae. */
  stateOf(errorBody: {data?: Partial<SyncState>} | null): SyncState | null {
    return errorBody?.data?.runs ? this.normalize(errorBody.data) : null;
  }

  private normalize(data: Partial<SyncState> | null | undefined): SyncState {
    return {sources: data?.sources ?? [], runs: data?.runs ?? []};
  }
}
