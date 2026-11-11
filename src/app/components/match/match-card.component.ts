import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {LocaleService} from '@edas/ng/shared/services/locale.service';
import {AppCardComponent, EdasAppCardStat} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {formatZoned, SHORT_DAY_FORMAT, TIME_FORMAT} from '../../shared/dates/zoned-dates';
import {roundLabelKey} from '../../shared/matches/matches';
import {tvChannelsLabel} from '../../shared/tv-channels/tv-channels';
import {MatchRow} from '../../shared/models/match';
import {TeamCrestComponent} from '../team/team-crest.component';
import {MatchStatusCellComponent} from './match-cells.component';

/**
 * Tarjeta de partido del listado del panel: los dos equipos con su escudo, la fecha con la
 * hora de quien mira, el resultado, la jornada, el estadio, los canales de TV y el estado. Toda la tarjeta abre
 * la ficha del partido.
 */
@Component({
  selector: 'app-match-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, MatchStatusCellComponent, TeamCrestComponent],
  template: `
    @if (data(); as match) {
      <edas-app-card
        [icon]="hasCrests() ? null : 'goal'"
        [iconSize]="48"
        [labelTranslate]="false"
        [title]="title()"
        [description]="kickoff()"
        [tag]="round()"
        [interactive]="true"
        [stats]="stats()"
        (cardClick)="open()"
      >
        @if (hasCrests()) {
          <span appCardLeading class="crests">
            <app-team-crest [src]="match.home_team?.crest" [size]="28" [reserve]="true"/>
            <app-team-crest [src]="match.away_team?.crest" [size]="28" [reserve]="true"/>
          </span>
        }
        <app-match-status-cell [data]="match"/>
      </edas-app-card>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .crests {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
  `],
})
export class MatchCardComponent {
  public readonly data = input<MatchRow>();

  private readonly stack = inject(ModalStackService);
  private readonly translate = inject(TranslateService);
  private readonly locale = inject(LocaleService);

  protected readonly hasCrests = computed(() => !!(this.data()?.home_team?.crest || this.data()?.away_team?.crest));

  /** «Barcelona - Sevilla». */
  protected readonly title = computed(() => {
    const match = this.data();

    return `${match?.home_team?.name ?? '—'} - ${match?.away_team?.name ?? '—'}`;
  });

  /** «15 ago, 21:00»; sin hora fijada, «15 ago · Por confirmar». */
  protected readonly kickoff = computed(() => {
    const match = this.data();
    const lang = this.locale.language();
    // Lee el idioma activo (signal) para que los textos cambien con él
    this.translate.currentLang();

    if (!match?.kickoff_at) {
      return this.translate.instant('match.undated');
    }

    const day = formatZoned(match.kickoff_at, lang, undefined, SHORT_DAY_FORMAT);

    return match.kickoff_confirmed
      ? `${day}, ${formatZoned(match.kickoff_at, lang, undefined, TIME_FORMAT)}`
      : `${day} · ${this.translate.instant('match.time-tbc')}`;
  });

  /** «J9», o el nombre de la ronda si no tiene número. */
  protected readonly round = computed(() => {
    const round = this.data()?.round;
    this.translate.currentLang();

    if (!round) {
      return null;
    }

    return round.number !== null
      ? this.translate.instant('match.round-short', {number: round.number})
      : this.translate.instant(roundLabelKey(round).key);
  });

  protected readonly stats = computed<EdasAppCardStat[]>(() => {
    const match = this.data();
    this.translate.currentLang();
    const played = match?.home_score != null;
    const tvChannels = tvChannelsLabel(match?.tv_channels);

    return [
      {
        label: this.translate.instant('match.result'),
        value: played ? `${match!.home_score} - ${match!.away_score}` : '—',
        muted: !played,
      },
      {label: this.translate.instant('match.venue'), value: match?.venue?.name ?? '—', muted: !match?.venue},
      {label: this.translate.instant('match.tv-channels'), value: tvChannels ?? '—', muted: !tvChannels},
    ];
  });

  protected open(): void {
    this.stack.push({modalKey: 'match', section: 'events', id: String(this.data()!.id)});
  }
}
