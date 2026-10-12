import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {map, Observable, Subject, tap} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {ApiResponse} from '../../models/api';
import {Season, SeasonPayload} from '../../models/season';
import {CompetitionApiService} from './competition-api.service';

/** Temporadas del panel: se listan y se crean dentro de su competición; el resto, por su id. */
@Injectable({providedIn: 'root'})
export class SeasonApiService {
  private readonly http = inject(HttpClient);
  private readonly competitions = inject(CompetitionApiService);
  private readonly base = `${environment.api.url}admin`;

  /** Emite el id de la competición cuyas temporadas han cambiado. */
  readonly changed$ = new Subject<number>();

  listByCompetition(competitionId: number): Observable<Season[]> {
    return this.http.get<ApiResponse<{seasons: Season[]}>>(`${this.base}/competitions/${competitionId}/seasons`).pipe(
      map((response) => response.data?.seasons ?? []),
    );
  }

  get(id: number): Observable<Season> {
    return this.http.get<ApiResponse<{season: Season}>>(`${this.base}/seasons/${id}`).pipe(
      map((response) => response.data!.season),
    );
  }

  create(competitionId: number, payload: SeasonPayload): Observable<Season> {
    return this.http.post<ApiResponse<{season: Season}>>(`${this.base}/competitions/${competitionId}/seasons`, payload).pipe(
      map((response) => response.data!.season),
      tap((season) => this.notifyChange(season.competition_id)),
    );
  }

  /** Edición parcial: solo cambia lo que va en `payload`. */
  update(id: number, payload: SeasonPayload): Observable<Season> {
    return this.http.put<ApiResponse<{season: Season}>>(`${this.base}/seasons/${id}`, payload).pipe(
      map((response) => response.data!.season),
      tap((season) => this.notifyChange(season.competition_id)),
    );
  }

  remove(season: Pick<Season, 'id' | 'competition_id'>): Observable<void> {
    return this.http.delete<ApiResponse>(`${this.base}/seasons/${season.id}`).pipe(
      map(() => undefined),
      tap(() => this.notifyChange(season.competition_id)),
    );
  }

  /** La tarjeta de la competición muestra su temporada actual y cuántas tiene. */
  private notifyChange(competitionId: number): void {
    this.changed$.next(competitionId);
    this.competitions.refreshList$.next();
  }
}
