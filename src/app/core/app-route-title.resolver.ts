import {inject, Injectable, Injector} from '@angular/core';
import {ActivatedRouteSnapshot, Router} from '@angular/router';
import {RouteBreadcrumb, RouteTitleResolver} from '@edas/ng';
import {LocaleService} from '@edas/ng/shared/services/locale.service';
import {SiteCompetitionContext, SiteTeamPage} from '../shared/models/site';
import {dataOf, SiteData} from '../site/site-data';
import {competitionPath, SiteLanguage} from '../site/site-links';
import {ROUTE_TITLE} from './route-titles';

/**
 * Títulos de miga que no son una clave i18n fija: el nombre de la competición o del equipo,
 * leído de los datos que ya resolvió la ruta. `parents()` añade, en la ficha de un equipo, la
 * competición y su lista de equipos: no son rutas padre de esa URL.
 */
@Injectable({providedIn: 'root'})
export class AppRouteTitleResolver extends RouteTitleResolver {
  private readonly injector = inject(Injector);

  public override resolve(titleKey: string): {labelKey?: string; label?: string} {
    if (titleKey === ROUTE_TITLE.competition) {
      const label = this.competitionLabel();
      if (label) {
        return {label};
      }
    }
    if (titleKey === ROUTE_TITLE.team) {
      const name = this.teamName();
      if (name) {
        return {label: name};
      }
    }
    return {labelKey: titleKey};
  }

  public override parents(route: ActivatedRouteSnapshot): readonly RouteBreadcrumb[] {
    if (route.routeConfig?.data?.['titleKey'] !== ROUTE_TITLE.team) {
      return [];
    }
    const page = dataOf(route.data['team'] as SiteData<SiteTeamPage> | undefined);
    const main = page?.competitions[0];
    const slug = main?.competition.slug;
    if (!page || !main || !slug) {
      return [];
    }
    const lang = this.language();
    const season = main.season.is_current ? null : main.season.slug;
    return [
      {
        label: [main.competition.name, main.season.label].filter(Boolean).join(' '),
        icon: 'trophy',
        link: [competitionPath(lang, slug, {season})],
      },
      {
        labelKey: 'site.competition.tab-teams',
        icon: 'shield',
        link: [competitionPath(lang, slug, {page: 'teams', season})],
      },
    ];
  }

  private competitionLabel(): string | null {
    const route = this.find(ROUTE_TITLE.competition);
    const context = dataOf(route?.data['context'] as SiteData<SiteCompetitionContext> | undefined);
    if (!context) {
      return null;
    }
    return [context.competition.name, context.season?.label].filter(Boolean).join(' ');
  }

  private teamName(): string | null {
    const route = this.find(ROUTE_TITLE.team);
    return dataOf(route?.data['team'] as SiteData<SiteTeamPage> | undefined)?.team.name ?? null;
  }

  private find(titleKey: string): ActivatedRouteSnapshot | null {
    let route: ActivatedRouteSnapshot | null = this.routerSnapshot();
    while (route) {
      if (route.routeConfig?.data?.['titleKey'] === titleKey) {
        return route;
      }
      route = route.firstChild;
    }
    return null;
  }

  /** Perezoso: el resolver lo pide el título de página, que el router construye al arrancar. */
  private routerSnapshot(): ActivatedRouteSnapshot {
    return this.injector.get(Router).routerState.snapshot.root;
  }

  private language(): SiteLanguage {
    return this.injector.get(LocaleService).language() as SiteLanguage;
  }
}
