import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {Router} from '@angular/router';
import {TranslateService} from '@ngx-translate/core';
import {LocaleService} from '@edas/ng/shared/services/locale.service';
import {AppCardComponent, EdasAppCardStat} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {BadgeComponent} from '@edas/ng/wrapper/components/badge/badge.component';
import {MATCHES_PATH, matchesQueryParams, roundDateRange, roundLabelKey} from '../../shared/matches/matches';
import {RoundRow} from '../../shared/models/match';
import {RoundStatusCellComponent} from './round-cells.component';

/**
 * Tarjeta de jornada del listado del panel: nombre, fechas, estado, partidos y partidos
 * jugados; la que está en disputa lleva un distintivo. Toda la tarjeta abre el listado de
 * partidos filtrado por esa jornada.
 */
@Component({
  selector: 'app-round-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, BadgeComponent, RoundStatusCellComponent],
  template: `
    @if (data(); as round) {
      <edas-app-card
        icon="calendar-range"
        [iconSize]="48"
        [labelTranslate]="false"
        [title]="name()"
        [description]="dates()"
        [interactive]="true"
        [stats]="stats()"
        (cardClick)="open()"
      >
        <div class="state">
          <app-round-status-cell [data]="round"/>
          @if (round.id === currentRoundId()) {
            <edas-badge appearance="success" icon="circle-dot" label="match.in-play" size="s"/>
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

    .state {
      display: flex;
      align-items: center;
      gap: var(--edas-space-2);
    }
  `],
})
export class RoundCardComponent {
  public readonly data = input<RoundRow>();
  /** Jornada en disputa de la temporada listada. */
  public readonly currentRoundId = input<number | null>(null);
  /** Competición del listado y temporada pedida (null = la vigente): con ellas se abren sus partidos. */
  public readonly competitionId = input<number | null>(null);
  public readonly seasonId = input<number | null>(null);

  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly locale = inject(LocaleService);

  protected readonly name = computed(() => {
    const round = this.data();
    // Lee el idioma activo (signal) para que los textos cambien con él
    this.translate.currentLang();

    if (!round) {
      return '';
    }

    const {key, params} = roundLabelKey(round);

    return this.translate.instant(key, params);
  });

  protected readonly dates = computed(() => {
    const round = this.data();

    return round ? roundDateRange(round, this.locale.language()) || null : null;
  });

  protected readonly stats = computed<EdasAppCardStat[]>(() => {
    const round = this.data();
    this.translate.currentLang();

    return [
      {label: this.translate.instant('match.matches'), value: round?.matches_count ?? 0, muted: !round?.matches_count},
      {label: this.translate.instant('match.played'), value: round?.played_matches_count ?? 0, muted: !round?.played_matches_count},
    ];
  });

  protected open(): void {
    const competitionId = this.competitionId();

    if (competitionId !== null) {
      void this.router.navigate([MATCHES_PATH], {queryParams: matchesQueryParams(competitionId, this.seasonId(), this.data()!.id)});
    }
  }
}
