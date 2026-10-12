import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {map, Observable} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {ApiResponse} from '../../models/api';
import {FootballMatch, Round} from '../../models/match';
import {StandingScope, StandingsTable} from '../../models/standing';
import {Team} from '../../models/team';

/**
 * Lo que cuelga de una temporada: equipos, jornadas, partidos y clasificación. De solo
 * lectura: todo llega por la sincronización.
 */
@Injectable({providedIn: 'root'})
export class SeasonContentApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.api.url}admin/seasons`;

  teams(seasonId: number): Observable<Team[]> {
    return this.http.get<ApiResponse<{teams: Team[]}>>(`${this.base}/${seasonId}/teams`).pipe(
      map((response) => response.data?.teams ?? []),
    );
  }

  /** Jornadas en el orden en que se juegan y cuál es la actual. */
  rounds(seasonId: number): Observable<{rounds: Round[]; currentRoundId: number | null}> {
    return this.http.get<ApiResponse<{rounds: Round[]; current_round_id: number | null}>>(`${this.base}/${seasonId}/rounds`).pipe(
      map((response) => ({rounds: response.data?.rounds ?? [], currentRoundId: response.data?.current_round_id ?? null})),
    );
  }

  /** Partidos de una jornada, por orden de horario. */
  matches(seasonId: number, roundId: number): Observable<FootballMatch[]> {
    return this.http
      .get<ApiResponse<{matches: FootballMatch[]}>>(`${this.base}/${seasonId}/matches`, {params: {round_id: roundId}})
      .pipe(map((response) => response.data?.matches ?? []));
  }

  /** Una tabla por fase con clasificación (hoy, la de liga). */
  standings(seasonId: number, scope: StandingScope): Observable<StandingsTable[]> {
    return this.http
      .get<ApiResponse<{tables: StandingsTable[]}>>(`${this.base}/${seasonId}/standings`, {params: {scope}})
      .pipe(map((response) => response.data?.tables ?? []));
  }
}
