import {isPlatformServer} from '@angular/common';
import {HttpClient, HttpContext, HttpErrorResponse, HttpInterceptorFn} from '@angular/common/http';
import {inject, Injectable, InjectionToken, makeStateKey, PLATFORM_ID, TransferState} from '@angular/core';
import {SKIP_GLOBAL_ERROR_ALERT, SKIP_GLOBAL_HTTP_PROGRESS} from '@edas/ng/http/http-context';
import {map, Observable, of, tap, throwError} from 'rxjs';
import {environment} from '../../environments/environment';
import {ApiResponse} from '../shared/models/api';
import {
  SiteCompetitionContext,
  SiteHomeCompetition,
  SiteRoundMatches,
  SiteSeasonTeam,
  SiteStandings,
  SiteTeamPage,
} from '../shared/models/site';
import {StandingScope} from '../shared/models/standing';
import {SiteLanguage} from './site-links';

/**
 * Cómo llega a la API el servidor de render (solo existe en el servidor: `app.config.server.ts`).
 * `url` sustituye a la del navegador, que puede ser relativa o dar un rodeo por la CDN;
 * `token` lo identifica ante la API para que no le aplique el límite de peticiones.
 */
export interface SiteServerApi {
  url: string | null;
  token: string | null;
}

export const SITE_SERVER_API = new InjectionToken<SiteServerApi>('SITE_SERVER_API');

/** En el servidor, redirige las peticiones a la API a su URL interna y las identifica. */
export const siteServerApiInterceptor: HttpInterceptorFn = (request, next) => {
  const server = inject(SITE_SERVER_API, {optional: true});

  if (!server || !request.url.startsWith(environment.api.url)) {
    return next(request);
  }

  return next(
    request.clone({
      url: server.url ? server.url + request.url.slice(environment.api.url.length) : request.url,
      setHeaders: server.token ? {'X-FF-Token': server.token} : {},
    }),
  );
};

/** Marca, en lo que viaja del servidor al navegador, de que la API respondió «no existe». */
const NOT_FOUND = '__not-found__';

/**
 * API pública de ff-api (`/api/site`): lo que pintan las páginas del sitio.
 *
 * Lo que se pide al generar la página en el servidor viaja incrustado en el HTML
 * (`TransferState`) y el navegador lo reutiliza al arrancar: la página no vuelve a pedir lo
 * que ya trae pintado. También viaja el «no existe», para que un 404 no se pregunte dos veces.
 */
@Injectable({providedIn: 'root'})
export class SiteApiService {
  private readonly http = inject(HttpClient);
  private readonly transfer = inject(TransferState);
  private readonly onServer = isPlatformServer(inject(PLATFORM_ID));
  private readonly base = `${environment.api.url}site/`;

  home(lang: SiteLanguage): Observable<SiteHomeCompetition[]> {
    return this.get<{competitions: SiteHomeCompetition[]}>('competitions', {lang}).pipe(map((data) => data.competitions));
  }

  /** `season`: slug de la temporada; sin él, la actual. */
  competition(lang: SiteLanguage, slug: string, season: string | null): Observable<SiteCompetitionContext> {
    return this.get(`competitions/${encodeURIComponent(slug)}`, {lang, season});
  }

  standings(lang: SiteLanguage, slug: string, season: string | null, scope: StandingScope = 'total'): Observable<SiteStandings> {
    return this.get(`competitions/${encodeURIComponent(slug)}/standings`, {lang, season, scope});
  }

  /** `round`: número de la jornada; sin él, la que está en juego. */
  matches(lang: SiteLanguage, slug: string, season: string | null, round: number | null): Observable<SiteRoundMatches> {
    return this.get(`competitions/${encodeURIComponent(slug)}/matches`, {lang, season, round});
  }

  teams(lang: SiteLanguage, slug: string, season: string | null): Observable<SiteSeasonTeam[]> {
    return this.get<{teams: SiteSeasonTeam[]}>(`competitions/${encodeURIComponent(slug)}/teams`, {lang, season}).pipe(map((data) => data.teams));
  }

  team(lang: SiteLanguage, slug: string): Observable<SiteTeamPage> {
    return this.get(`teams/${encodeURIComponent(slug)}`, {lang});
  }

  private get<T>(path: string, query: Record<string, string | number | null>): Observable<T> {
    const params: Record<string, string> = {};
    for (const [name, value] of Object.entries(query)) {
      if (value !== null && value !== '') {
        params[name] = String(value);
      }
    }

    const key = makeStateKey<T | typeof NOT_FOUND>(`site:${path}?${new URLSearchParams(params).toString()}`);

    if (!this.onServer && this.transfer.hasKey(key)) {
      const data = this.transfer.get(key, null as T);
      // Solo vale para el arranque: al volver a esta página más tarde se pide de nuevo
      this.transfer.remove(key);

      // El servidor ya preguntó y no existe: no hace falta volver a preguntarlo
      return data === NOT_FOUND ? throwError(() => new HttpErrorResponse({status: 404, url: this.base + path})) : of(data as T);
    }

    return this.http
      .get<ApiResponse<T>>(this.base + path, {
        params,
        // Cada página pinta su propio error; en el servidor no hay ni avisos ni barra
        context: new HttpContext().set(SKIP_GLOBAL_ERROR_ALERT, true).set(SKIP_GLOBAL_HTTP_PROGRESS, this.onServer),
      })
      .pipe(
        map((response) => response.data as T),
        tap({
          next: (data) => this.onServer && this.transfer.set(key, data),
          error: (error: unknown) => this.onServer && error instanceof HttpErrorResponse && error.status === 404 && this.transfer.set(key, NOT_FOUND),
        }),
      );
  }
}
