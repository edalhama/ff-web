import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {LocaleService} from '@edas/ng';
import {map, Observable, shareReplay} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {ApiResponse} from '../../models/api';
import {Country} from '../../models/country';

/** Países para los selectores del panel. */
@Injectable({providedIn: 'root'})
export class CountryApiService {
  private readonly http = inject(HttpClient);
  private readonly locale = inject(LocaleService);

  /** Una petición por idioma: los nombres llegan traducidos y ordenados por el servidor. */
  private readonly cache = new Map<string, Observable<Country[]>>();

  list(): Observable<Country[]> {
    const language = this.locale.language();
    let countries$ = this.cache.get(language);

    if (!countries$) {
      countries$ = this.http.get<ApiResponse<{countries: Country[]}>>(`${environment.api.url}admin/countries`).pipe(
        map((response) => response.data?.countries ?? []),
        shareReplay({bufferSize: 1, refCount: false}),
      );
      this.cache.set(language, countries$);
    }

    return countries$;
  }
}
