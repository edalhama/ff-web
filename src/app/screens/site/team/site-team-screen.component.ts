import {ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {LocaleService} from '@edas/ng/shared/services/locale.service';
import {map} from 'rxjs';
import {MatchListComponent} from '../../../components/match/match-list.component';
import {SiteErrorComponent} from '../../../components/site/site-error.component';
import {SiteTimeZoneNoteComponent} from '../../../components/site/site-time-zone-note.component';
import {SiteTeam, SiteTeamPage} from '../../../shared/models/site';
import {TeamSummary} from '../../../shared/models/team';
import {SiteClockService} from '../../../site/site-clock.service';
import {SiteData} from '../../../site/site-data';
import {competitionPath, homePath, SITE_LANGUAGES, SiteLanguage, teamPath} from '../../../site/site-links';
import {teamSchema} from '../../../site/site-schema';
import {SiteAlternates, SiteSeoService} from '../../../site/site-seo.service';
import {SiteNotFoundScreenComponent} from '../not-found/site-not-found-screen.component';

/**
 * Ficha de un equipo: sus datos, las competiciones que juega con su puesto en cada una, y sus
 * próximos partidos y últimos resultados.
 */
@Component({
  selector: 'app-site-team-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatchListComponent, RouterLink, SiteErrorComponent, SiteTimeZoneNoteComponent, SiteNotFoundScreenComponent, TranslatePipe],
  template: `
    @if (page(); as current) {
      <div class="site-page">
        <div class="site-header">
          <nav class="site-crumbs" [attr.aria-label]="'site.breadcrumbs' | translate">
            <a [routerLink]="home">{{ 'site.home.competitions' | translate }}</a>
            @if (current.competitions[0]; as main) {
              <span aria-hidden="true">/</span>
              <a [routerLink]="competitionLink(main.competition.slug, 'overview')">{{ main.competition.name }}</a>
              <span aria-hidden="true">/</span>
              <a [routerLink]="competitionLink(main.competition.slug, 'teams')">{{ 'site.competition.tab-teams' | translate }}</a>
            }
          </nav>

          <h1 class="site-title">{{ current.team.name }}</h1>

          <dl class="site-facts">
            @if (current.team.country; as country) {
              <div><dt>{{ 'site.team.country' | translate }}</dt><dd>{{ country.name }}</dd></div>
            }
            @if (current.team.founded_year; as year) {
              <div><dt>{{ 'site.team.founded' | translate }}</dt><dd>{{ year }}</dd></div>
            }
            @if (current.team.venue; as venue) {
              <div><dt>{{ 'site.team.venue' | translate }}</dt><dd>{{ venueText(current.team) }}</dd></div>
            }
          </dl>
        </div>

        @if (current.competitions.length > 0) {
          <div class="site-block">
            <h2 class="site-heading">{{ 'site.team.competitions' | translate }}</h2>

            <ul class="site-cards site-cards--compact">
              @for (each of current.competitions; track each.competition.id) {
                <li>
                  <a class="site-card" [routerLink]="competitionLink(each.competition.slug, 'standings', each.season.is_current ? null : each.season.slug)">
                    <span class="site-card__title">{{ each.competition.name }}</span>
                    <span class="site-card__meta">{{ 'site.season' | translate: {season: each.season.label} }}</span>
                    @if (each.standing; as standing) {
                      <span class="site-chip">{{ 'site.team.standing' | translate: {position: standing.position, points: standing.points} }}</span>
                    }
                  </a>
                </li>
              }
            </ul>
          </div>
        }

        <div class="site-columns">
          @if (current.matches.upcoming.length > 0) {
            <div class="site-block">
              <h2 class="site-heading">{{ 'site.team.upcoming' | translate }}</h2>
              <app-match-list [matches]="current.matches.upcoming" layout="dates" [showCompetition]="true" [timeZone]="clock.timeZone()" [teamLink]="teamLink"/>
            </div>
          }

          @if (current.matches.recent.length > 0) {
            <div class="site-block">
              <h2 class="site-heading">{{ 'site.team.recent' | translate }}</h2>
              <app-match-list [matches]="current.matches.recent" layout="dates" [showCompetition]="true" [timeZone]="clock.timeZone()" [teamLink]="teamLink"/>
            </div>
          }
        </div>

        @if (current.matches.upcoming.length + current.matches.recent.length > 0) {
          <app-site-time-zone-note/>
        }

        @if (current.team.content; as content) {
          <div class="site-block">
            <h2 class="site-heading">{{ 'site.team.about' | translate: {team: current.team.name} }}</h2>
            <p class="site-text">{{ content }}</p>
          </div>
        }
      </div>
    } @else if (failed()) {
      <div class="site-page"><app-site-error/></div>
    } @else {
      <app-site-not-found/>
    }
  `,
})
export class SiteTeamScreenComponent {
  private readonly translate = inject(TranslateService);
  private readonly lang = inject(LocaleService).language() as SiteLanguage;
  protected readonly clock = inject(SiteClockService);

  protected readonly home = homePath(this.lang);

  private readonly result = toSignal(inject(ActivatedRoute).data.pipe(map((data) => data['team'] as SiteData<SiteTeamPage>)));

  protected readonly page = computed(() => {
    const result = this.result();

    return result?.state === 'ok' ? result.data : null;
  });

  protected readonly failed = computed(() => this.result()?.state === 'error');

  /** El propio equipo no se enlaza a sí mismo. */
  protected readonly teamLink = (team: TeamSummary & {slug?: string | null}): string | null =>
    team.slug && team.id !== this.page()?.team.id ? teamPath(this.lang, team.slug) : null;

  constructor() {
    const seo = inject(SiteSeoService);

    effect(() => {
      const current = this.page();
      if (!current) {
        // El 404 y el error ponen (o no) sus propios metadatos
        return;
      }

      const {team} = current;
      const main = current.competitions[0];
      const alternates = {} as SiteAlternates;

      for (const each of SITE_LANGUAGES) {
        alternates[each] = team.slugs[each] ? teamPath(each, team.slugs[each]!) : null;
      }

      seo.apply({
        title: team.seo_title ? 'site.title-raw' : 'site.team.title',
        titleParams: {team: team.name, text: team.seo_title},
        description:
          team.seo_description ??
          this.translate.instant(main ? 'site.team.description-competition' : 'site.team.description', {
            team: team.name,
            competition: [main?.competition.name, main?.season.label].filter(Boolean).join(' '),
          }),
        alternates,
        breadcrumbs: [
          ...(main ? [{name: main.competition.name ?? '', path: this.competitionLink(main.competition.slug, 'overview')}] : []),
          {name: team.name ?? '', path: teamPath(this.lang, team.slug ?? '')},
        ],
        schema: [teamSchema(this.lang, team, current.competitions.map((each) => each.competition))],
      });
    });

    inject(DestroyRef).onDestroy(() => seo.clear());
  }

  protected competitionLink(slug: string | null, page: 'overview' | 'standings' | 'teams', season: string | null = null): string {
    return competitionPath(this.lang, slug ?? '', {page, season});
  }

  /** «Ramón Sánchez-Pizjuán, Sevilla · 43.883 espectadores». */
  protected venueText(team: SiteTeam): string {
    const place = [team.venue?.name, team.venue?.city].filter(Boolean).join(', ');
    const capacity = team.venue?.capacity
      ? this.translate.instant('site.team.capacity', {capacity: new Intl.NumberFormat(this.lang).format(team.venue.capacity)})
      : null;

    return [place, capacity].filter(Boolean).join(' · ');
  }
}
