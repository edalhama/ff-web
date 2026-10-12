import {ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {map} from 'rxjs';
import {SiteErrorComponent} from '../../../components/site/site-error.component';
import {SiteSeasonTeam} from '../../../shared/models/site';
import {SiteData} from '../../../site/site-data';
import {itemListSchema} from '../../../site/site-schema';
import {SiteSeoService} from '../../../site/site-seo.service';
import {injectCompetitionPage} from './competition-page';

/** Equipos que juegan la temporada, cada uno con enlace a su ficha. */
@Component({
  selector: 'app-competition-teams',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {class: 'site-stack'},
  imports: [RouterLink, SiteErrorComponent, TranslatePipe],
  template: `
    @if (teams(); as list) {
      @if (list.length > 0) {
        <ul class="site-cards site-cards--compact">
          @for (team of list; track team.id) {
            <li>
              @if (page.teamLink(team); as link) {
                <a class="site-card" [routerLink]="link">
                  <span class="site-card__title">{{ team.name }}</span>
                  <span class="site-card__meta">{{ venue(team) }}</span>
                </a>
              } @else {
                <span class="site-card">
                  <span class="site-card__title">{{ team.name }}</span>
                  <span class="site-card__meta">{{ venue(team) }}</span>
                </span>
              }
            </li>
          }
        </ul>
      } @else {
        <p class="site-empty">{{ 'site.competition.no-teams' | translate }}</p>
      }
    } @else {
      <app-site-error/>
    }
  `,
})
export class CompetitionTeamsComponent {
  private readonly translate = inject(TranslateService);

  protected readonly page = injectCompetitionPage();

  private readonly result = toSignal(inject(ActivatedRoute).data.pipe(map((data) => data['teams'] as SiteData<SiteSeasonTeam[]>)));

  protected readonly teams = computed(() => {
    const result = this.result();

    return result?.state === 'ok' ? result.data : null;
  });

  constructor() {
    const seo = inject(SiteSeoService);

    effect(() => {
      const teams = this.teams() ?? [];
      const meta = this.page.meta('teams');

      seo.apply({
        title: 'site.competition.title-teams',
        description: this.translate.instant('site.competition.description-teams', {competition: this.page.label(), count: teams.length}),
        ...meta,
        index: teams.length > 0,
        schema: [
          ...(meta.schema ?? []),
          itemListSchema(
            this.translate.instant('site.competition.heading-teams', {competition: this.page.label()}),
            teams.filter((team) => team.slug).map((team) => ({name: team.name, path: this.page.teamLink(team)!})),
          ),
        ],
      });
    });

    inject(DestroyRef).onDestroy(() => seo.clear());
  }

  /** «Ramón Sánchez-Pizjuán · Sevilla». */
  protected venue(team: SiteSeasonTeam): string {
    return [team.venue?.name, team.venue?.city].filter(Boolean).join(' · ');
  }
}
