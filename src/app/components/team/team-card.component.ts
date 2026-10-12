import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {AppCardComponent, EdasAppCardStat} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {dateStat} from '@edas/ng/wrapper/components/app-card/app-card-stats';
import {BadgeComponent} from '@edas/ng/wrapper/components/badge/badge.component';
import {LocalizedDatePipe} from '@edas/ng/wrapper/pipes/localized-date.pipe';
import {Team} from '../../shared/models/team';

/**
 * Tarjeta de equipo del listado del panel: nombre, estadio, abreviatura, país y año de
 * fundación. Toda la tarjeta abre la ficha del equipo.
 */
@Component({
  selector: 'app-team-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, BadgeComponent],
  template: `
    @if (data(); as team) {
      <edas-app-card
        icon="shield"
        [iconSize]="48"
        [color]="team.primary_color"
        [labelTranslate]="false"
        [title]="team.name ?? '—'"
        [description]="team.venue?.name ?? null"
        [tag]="team.code"
        [interactive]="true"
        [stats]="stats()"
        (cardClick)="open()"
      >
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
      {
        label: this.translate.instant('team.founded'),
        value: team?.founded_year ? String(team.founded_year) : '—',
        muted: !team?.founded_year,
      },
      dateStat(this.datePipe, this.translate.instant('team.modified'), team?.updated_at),
    ];
  });

  protected open(): void {
    this.stack.push({modalKey: 'team', section: 'edit', id: String(this.data()!.id)});
  }
}
