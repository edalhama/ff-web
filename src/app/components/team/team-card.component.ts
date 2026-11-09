import {ChangeDetectionStrategy, Component, computed, inject, input, signal} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {AppCardComponent, EdasAppCardStat} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {dateStat} from '@edas/ng/wrapper/components/app-card/app-card-stats';
import {BadgeComponent} from '@edas/ng/wrapper/components/badge/badge.component';
import {LocalizedDatePipe} from '@edas/ng/wrapper/pipes/localized-date.pipe';
import {Team} from '../../shared/models/team';

/** Competiciones de la temporada actual del equipo, para una línea: «LaLiga», «LaLiga · Copa del Rey». */
export function teamCompetitions(team: Team): string | null {
  const names = (team.competitions ?? []).map((competition) => competition.name).filter(Boolean);

  return names.length > 0 ? names.join(' · ') : null;
}

/**
 * Tarjeta de equipo del listado del panel: escudo (o icono genérico con su color), nombre,
 * competición actual, abreviatura y país. Toda la tarjeta abre la ficha del equipo.
 */
@Component({
  selector: 'app-team-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, BadgeComponent],
  template: `
    @if (data(); as team) {
      <edas-app-card
        [icon]="crest() ? null : 'shield'"
        [iconSize]="48"
        [color]="team.primary_color"
        [labelTranslate]="false"
        [title]="team.name ?? '—'"
        [description]="competitions()"
        [tag]="team.code"
        [interactive]="true"
        [stats]="stats()"
        (cardClick)="open()"
      >
        @if (crest(); as url) {
          <img appCardLeading class="crest" [src]="url" alt="" width="48" height="48" loading="lazy" (error)="failedCrest.set(url)"/>
        }
        <div class="team-badges">
          <edas-badge
            [appearance]="team.active ? 'success' : 'neutral'"
            [icon]="team.active ? 'check-circle' : 'x-circle'"
            [label]="team.active ? 'team.active' : 'team.inactive'"
            size="s"
          />
          @if (team.type === 'national') {
            <edas-badge appearance="info" label="team.national" size="s"/>
          }
          @if (team.gender === 'female') {
            <edas-badge appearance="info" label="enum.gender.female" size="s"/>
          }
        </div>
      </edas-app-card>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .crest {
      width: 48px;
      height: 48px;
      flex: none;
      object-fit: contain;
    }

    .team-badges {
      display: flex;
      flex-wrap: wrap;
      gap: var(--edas-space-1);
    }
  `],
})
export class TeamCardComponent {
  public readonly data = input<Team>();

  private readonly stack = inject(ModalStackService);
  private readonly translate = inject(TranslateService);
  private readonly datePipe = new LocalizedDatePipe();

  protected readonly failedCrest = signal<string | null>(null);

  protected readonly crest = computed(() => {
    const url = this.data()?.crest ?? null;

    return url && url !== this.failedCrest() ? url : null;
  });

  protected readonly competitions = computed(() => {
    const team = this.data();

    return team ? teamCompetitions(team) : null;
  });

  protected readonly stats = computed<EdasAppCardStat[]>(() => {
    const team = this.data();
    // Lee el idioma activo (signal) para que las etiquetas cambien con él
    this.translate.currentLang();

    return [
      {
        label: this.translate.instant('team.country'),
        value: team?.country?.name ?? '—',
        muted: !team?.country,
      },
      dateStat(this.datePipe, this.translate.instant('team.modified'), team?.updated_at),
    ];
  });

  protected open(): void {
    this.stack.push({modalKey: 'team', section: 'edit', id: String(this.data()!.id)});
  }
}
