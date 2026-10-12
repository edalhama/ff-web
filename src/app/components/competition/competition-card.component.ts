import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {AppCardComponent, EdasAppCardStat} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {dateStat} from '@edas/ng/wrapper/components/app-card/app-card-stats';
import {BadgeComponent} from '@edas/ng/wrapper/components/badge/badge.component';
import {LocalizedDatePipe} from '@edas/ng/wrapper/pipes/localized-date.pipe';
import {Competition, competitionIcon} from '../../shared/models/competition';

/**
 * Tarjeta de competición del listado del panel: nombre, país (o «Internacional»), tipo, estado
 * y temporada actual. Toda la tarjeta abre la ficha de la competición.
 */
@Component({
  selector: 'app-competition-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, BadgeComponent, TranslatePipe],
  template: `
    @if (data(); as competition) {
      <edas-app-card
        [icon]="icon()"
        [iconSize]="48"
        [labelTranslate]="false"
        [title]="competition.name ?? '—'"
        [description]="competition.country?.name ?? ('competition.international' | translate)"
        [tag]="'enum.competition-type.' + competition.type | translate"
        [interactive]="true"
        [stats]="stats()"
        (cardClick)="open()"
      >
        <div class="competition-badges">
          <edas-badge
            [appearance]="competition.active ? 'success' : 'neutral'"
            [icon]="competition.active ? 'check-circle' : 'x-circle'"
            [label]="competition.active ? 'common.active' : 'common.inactive'"
            size="s"
          />
          @if (competition.gender === 'female') {
            <edas-badge appearance="info" label="enum.gender.female" size="s"/>
          }
          @if (competition.team_type === 'national') {
            <edas-badge appearance="info" label="enum.team-type.national" size="s"/>
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

    .competition-badges {
      display: flex;
      flex-wrap: wrap;
      gap: var(--edas-space-1);
    }
  `],
})
export class CompetitionCardComponent {
  public readonly data = input<Competition>();

  private readonly stack = inject(ModalStackService);
  private readonly translate = inject(TranslateService);
  private readonly datePipe = new LocalizedDatePipe();

  protected readonly icon = computed(() => competitionIcon(this.data()?.type));

  protected readonly stats = computed<EdasAppCardStat[]>(() => {
    const competition = this.data();
    // Lee el idioma activo (signal) para que las etiquetas cambien con él
    this.translate.currentLang();

    return [
      {
        label: this.translate.instant('competition.seasons'),
        value: String(competition?.seasons_count ?? 0),
      },
      {
        label: this.translate.instant('competition.current'),
        value: competition?.current_season?.label ?? '—',
        muted: !competition?.current_season,
      },
      dateStat(this.datePipe, this.translate.instant('common.modified'), competition?.updated_at),
    ];
  });

  protected open(): void {
    this.stack.push({modalKey: 'competition', section: 'edit', id: String(this.data()!.id)});
  }
}
