import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {AppCardComponent, EdasAppCardStat} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {playerModalId, PlayerRow} from '../../shared/models/player';
import {formatMoney} from '../../shared/players/money';
import {ageOn} from '../../shared/players/squad';
import {PlayerApiService} from '../../shared/services/api/player-api.service';
import {PlayerStatusCellComponent} from './player-cells.component';

/**
 * Tarjeta del listado de jugadores: nombre, equipo, dorsal, posición, país, edad y valor de mercado. Toda la
 * tarjeta abre la ficha del jugador en la competición del listado.
 */
@Component({
  selector: 'app-player-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, PlayerStatusCellComponent],
  template: `
    @if (data(); as row) {
      <edas-app-card
        icon="user"
        [iconSize]="48"
        [labelTranslate]="false"
        [title]="row.player.name"
        [description]="row.team.name"
        [tag]="row.shirt_number != null ? '#' + row.shirt_number : null"
        [interactive]="true"
        [stats]="stats()"
        (cardClick)="open()"
      >
        <app-player-status-cell [data]="row"/>
      </edas-app-card>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `],
})
export class PlayerCardComponent {
  public readonly data = input<PlayerRow>();
  private readonly stack = inject(ModalStackService);
  private readonly playerApi = inject(PlayerApiService);
  private readonly translate = inject(TranslateService);
  private readonly today = new Date();

  protected readonly stats = computed<EdasAppCardStat[]>(() => {
    const row = this.data();
    // Lee el idioma activo (signal) para que las etiquetas cambien con él
    const lang = this.translate.currentLang();
    const age = ageOn(row?.player.birth_date, this.today);
    const value = row?.player.market_value ?? null;

    return [
      {
        label: this.translate.instant('team.squad-position'),
        value: row?.position ? this.translate.instant(`enum.player-position.${row.position}`) : '—',
        muted: !row?.position,
      },
      {label: this.translate.instant('team.squad-country'), value: row?.player.country?.name ?? '—', muted: !row?.player.country},
      {label: this.translate.instant('team.squad-age'), value: age != null ? String(age) : '—', muted: age == null},
      {label: this.translate.instant('player.value-short'), value: formatMoney(value, lang), muted: value == null},
    ];
  });

  /** Ficha del jugador, en la competición del listado. */
  protected open(): void {
    const competitionId = this.playerApi.listContext()?.competitionId ?? null;

    this.stack.push({modalKey: 'player', section: 'info', id: playerModalId(this.data()!.player.id, competitionId)});
  }
}
