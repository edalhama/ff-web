import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {AppCardComponent, EdasAppCardStat} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {MatchScoreRow} from '../../shared/models/match';
import {playerModalId} from '../../shared/models/player';
import {MatchScoreBadgesCellComponent} from './match-score-cells.component';

/**
 * Tarjeta de un jugador en las notas de un partido: foto, nombre, dorsal, posición y papel,
 * minutos, nota y puntos en el sistema elegido, y sus distinciones. Toda la tarjeta abre la
 * ficha del jugador en la competición del partido.
 */
@Component({
  selector: 'app-match-score-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, MatchScoreBadgesCellComponent],
  template: `
    @if (data(); as row) {
      <edas-app-card
        [icon]="row.player.photo ? null : 'user'"
        [iconSize]="48"
        [labelTranslate]="false"
        [title]="row.player.name"
        [description]="description()"
        [tag]="row.shirt_number != null ? '#' + row.shirt_number : null"
        [interactive]="true"
        [stats]="stats()"
        (cardClick)="open()"
      >
        @if (row.player.photo; as photo) {
          <img appCardLeading class="photo" [src]="photo" alt="" width="48" height="48" loading="lazy" (error)="hideImage($event)"/>
        }
        <app-match-score-badges-cell [data]="row"/>
      </edas-app-card>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .photo {
      display: block;
      width: 48px;
      height: 48px;
      object-fit: cover;
      border-radius: 50%;
      background: rgba(var(--edas-tone-neutral-rgb), 0.14);
    }
  `],
})
export class MatchScoreCardComponent {
  public readonly data = input<MatchScoreRow>();

  private readonly stack = inject(ModalStackService);
  private readonly translate = inject(TranslateService);

  /** «Delantero · Titular». */
  protected readonly description = computed(() => {
    const row = this.data();
    // Lee el idioma activo (signal) para que los textos cambien con él
    this.translate.currentLang();

    return row
      ? [row.position ? this.translate.instant(`enum.player-position.${row.position}`) : null, this.translate.instant(`enum.lineup-role.${row.role}`)]
          .filter(Boolean)
          .join(' · ')
      : null;
  });

  protected readonly stats = computed<EdasAppCardStat[]>(() => {
    const row = this.data();
    this.translate.currentLang();

    return [
      {label: this.translate.instant('match.minutes'), value: row?.minutes_played ?? '—', muted: row?.minutes_played == null},
      {label: this.translate.instant('match.score'), value: row?.score?.raw_value ?? '—', muted: !row?.score?.raw_value},
      {label: this.translate.instant('match.points'), value: row?.score?.points ?? '—', muted: row?.score?.points == null},
    ];
  });

  /** Imagen que no carga: se deja el hueco (el círculo de fondo) en vez del icono roto. */
  protected hideImage(event: Event): void {
    (event.target as HTMLImageElement).removeAttribute('src');
  }

  protected open(): void {
    const row = this.data()!;

    this.stack.push({modalKey: 'player', section: 'info', id: playerModalId(row.player.id, row.competitionId)});
  }
}
