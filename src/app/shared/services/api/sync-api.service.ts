import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {map, Observable} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {ApiResponse} from '../../models/api';
import {ProviderCompetition, SyncDataType, SyncState} from '../../models/sync';

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
   * Sincroniza ahora. Calendario y clasificación se esperan: `state` trae cómo ha ido. Si
   * entran las plantillas (minutos), la API responde 202 en el acto y lo hace en segundo
   * plano (`background`): hay que consultar `state()` hasta que no quede nada en marcha.
   *
   * Si no se puede completar, la API responde 422 (o 409 si ya hay otra en marcha) con el
   * motivo (el interceptor lo enseña) y el estado actualizado en `data`.
   */
  run(competitionId: number, options: {seasonYear?: number | null; types?: SyncDataType[]} = {}): Observable<{state: SyncState; background: boolean}> {
    const body: Record<string, unknown> = {};

    if (options.seasonYear != null) {
      body['season_year'] = options.seasonYear;
    }
    if (options.types?.length) {
      body['types'] = options.types;
    }

    return this.http
      .post<ApiResponse<SyncState>>(this.url(competitionId), body, {observe: 'response'})
      .pipe(map((response) => ({state: this.normalize(response.body?.data), background: response.status === 202})));
  }

  /** Competiciones del proveedor que casan con el texto (un número busca por id). Gasta una petición al proveedor. */
  searchCompetitions(provider: string, search: string): Observable<ProviderCompetition[]> {
    return this.http
      .get<ApiResponse<{results: ProviderCompetition[]}>>(`${environment.api.url}admin/providers/${provider}/competitions`, {params: {search}})
      .pipe(map((response) => response.data?.results ?? []));
  }

  /** Enlaza la competición con una del proveedor y activa todo lo que este sabe traer. */
  link(competitionId: number, result: ProviderCompetition, provider: string): Observable<SyncState> {
    return this.http
      .put<ApiResponse<SyncState>>(`${environment.api.url}admin/competitions/${competitionId}/link`, {
        provider,
        external_id: result.external_id,
        name: result.name,
        country: result.country,
        logo: result.logo,
      })
      .pipe(map((response) => this.normalize(response.data)));
  }

  /** Quita el enlace y sus fuentes. Lo importado se queda. */
  unlink(competitionId: number, provider: string): Observable<SyncState> {
    return this.http
      .delete<ApiResponse<SyncState>>(`${environment.api.url}admin/competitions/${competitionId}/link/${provider}`)
      .pipe(map((response) => this.normalize(response.data)));
  }

  /** Activa o desactiva un tipo de dato de un proveedor ya enlazado. */
  setSource(competitionId: number, provider: string, dataType: SyncDataType, active: boolean): Observable<SyncState> {
    return this.http
      .put<ApiResponse<SyncState>>(`${environment.api.url}admin/competitions/${competitionId}/sync/sources`, {provider, data_type: dataType, active})
      .pipe(map((response) => this.normalize(response.data)));
  }

  /** Estado que viaja en el cuerpo de un error de `run()`, o null si el error no lo trae. */
  stateOf(errorBody: {data?: Partial<SyncState>} | null): SyncState | null {
    return errorBody?.data?.runs ? this.normalize(errorBody.data) : null;
  }

  private normalize(data: Partial<SyncState> | null | undefined): SyncState {
    return {providers: data?.providers ?? [], links: data?.links ?? [], sources: data?.sources ?? [], runs: data?.runs ?? []};
  }
}
