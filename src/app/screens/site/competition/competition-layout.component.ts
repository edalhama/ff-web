import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {filter, map, startWith} from 'rxjs';
import {SiteErrorComponent} from '../../../components/site/site-error.component';
import {SiteCompetitionContext, SiteSeasonSummary} from '../../../shared/models/site';
import {SiteData} from '../../../site/site-data';
import {competitionPath, CompetitionPage, homePath} from '../../../site/site-links';
import {SiteNotFoundScreenComponent} from '../not-found/site-not-found-screen.component';
import {injectCompetitionPage} from './competition-page';

const PAGES: readonly CompetitionPage[] = ['overview', 'standings', 'fixtures', 'teams'];

/**
 * Marco de las páginas de una competición: cabecera con el nombre y la temporada, selector de
 * temporada y pestañas (que son enlaces: cada una es una página con su URL). La página en sí
 * es la ruta hija.
 *
 * Si la competición o la temporada de la URL no existen, pinta el 404 y no carga la hija.
 */
@Component({
  selector: 'app-competition-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, SiteErrorComponent, SiteNotFoundScreenComponent, TranslatePipe],
  template: `
    @if (page.context(); as context) {
      <div class="site-page">
        <div class="site-header">
          <nav class="site-crumbs" [attr.aria-label]="'site.breadcrumbs' | translate">
            <a [routerLink]="home">{{ 'site.home.competitions' | translate }}</a>
            <span aria-hidden="true">/</span>
            <a [routerLink]="page.path('overview')">{{ context.competition.name }}</a>
          </nav>

          <h1 class="site-title">{{ heading() }}</h1>

          <p class="site-meta">{{ meta(context) }}</p>

          @if (context.seasons.length > 1) {
            <nav class="site-pills" [attr.aria-label]="'site.competition.seasons' | translate">
              @for (season of context.seasons; track season.slug) {
                <a
                  class="site-pill"
                  [class.site-pill--active]="season.slug === context.season?.slug"
                  [attr.aria-current]="season.slug === context.season?.slug ? 'page' : null"
                  [routerLink]="seasonLink(context, season)"
                >{{ season.label }}</a>
              }
            </nav>
          }

          <nav class="site-tabs" [attr.aria-label]="'site.competition.sections' | translate">
            @for (tab of pages; track tab) {
              <a
                class="site-tab"
                [routerLink]="page.path(tab)"
                routerLinkActive="site-tab--active"
                ariaCurrentWhenActive="page"
                [routerLinkActiveOptions]="{exact: tab === 'overview'}"
              >{{ 'site.competition.tab-' + tab | translate }}</a>
            }
          </nav>
        </div>

        <router-outlet/>
      </div>
    } @else if (failed()) {
      <div class="site-page"><app-site-error/></div>
    } @else {
      <app-site-not-found/>
    }
  `,
})
export class CompetitionLayoutComponent {
  private readonly translate = inject(TranslateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly page = injectCompetitionPage(this.route);
  protected readonly pages = PAGES;
  protected readonly home = homePath(this.page.lang);

  private readonly result = toSignal(this.route.data.pipe(map((data) => data['context'] as SiteData<SiteCompetitionContext>)));
  /** La API no ha respondido (distinto de «no existe»). */
  protected readonly failed = computed(() => this.result()?.state === 'error');

  /** Página hija activa (`data.page` de su ruta). */
  private readonly active = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      map(() => (this.route.snapshot.firstChild?.data['page'] ?? 'overview') as CompetitionPage),
    ),
    {initialValue: 'overview' as CompetitionPage},
  );

  /** Título de la página: «Clasificación de LaLiga 2026/27». */
  protected readonly heading = computed(() =>
    this.translate.instant(`site.competition.heading-${this.active()}`, {competition: this.page.label()}),
  );

  /** «España · Liga · Del 15 ago 2026 al 23 may 2027» (sin lo que falte). */
  protected meta(context: SiteCompetitionContext): string {
    return [
      context.competition.country?.name,
      this.translate.instant(`enum.competition-type.${context.competition.type}`),
      context.season ? this.translate.instant(`enum.season-status.${context.season.status}`) : null,
    ]
      .filter(Boolean)
      .join(' · ');
  }

  /** Misma página, en otra temporada. La actual va sin temporada en la URL. */
  protected seasonLink(context: SiteCompetitionContext, season: SiteSeasonSummary): string {
    return competitionPath(this.page.lang, context.competition.slug ?? '', {
      page: this.active() === 'fixtures' ? 'fixtures' : this.active(),
      season: season.is_current ? null : season.slug,
    });
  }
}
