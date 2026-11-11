import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {LocaleService} from '@edas/ng/shared/services/locale.service';
import {AppCardComponent, EdasAppCardStat} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {formatCount, formatPrice} from '../../shared/market/market';
import {MarketRow} from '../../shared/models/market';
import {playerModalId} from '../../shared/models/player';
import {MarketApiService} from '../../shared/services/api/market-api.service';
import {MarketChangeCellComponent} from './market-cells.component';

/**
 * Tarjeta del mercado (la vista de tarjetas y el móvil): jugador, equipo y posición, la variación
 * del día y, en cifras, el precio, la predicción conservadora y (en Biwenger) los propietarios.
 * Toda la tarjeta abre la ficha del jugador en la competición del listado.
 */
@Component({
  selector: 'app-market-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, MarketChangeCellComponent],
  template: `
    @if (data(); as row) {
      <edas-app-card
        icon="user"
        [iconSize]="48"
        [labelTranslate]="false"
        [title]="row.player.name"
        [description]="description()"
        [interactive]="true"
        [stats]="stats()"
        (cardClick)="open()"
      >
        <app-market-change-cell [data]="row"/>
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
export class MarketCardComponent {
  public readonly data = input<MarketRow>();
  private readonly stack = inject(ModalStackService);
  private readonly marketApi = inject(MarketApiService);
  private readonly translate = inject(TranslateService);
  private readonly locale = inject(LocaleService);

  /** «Barcelona · Centrocampista». */
  protected readonly description = computed(() => {
    const row = this.data();
    this.translate.currentLang();

    return [row?.team.name, row?.position ? this.translate.instant(`enum.player-position.${row.position}`) : null].filter(Boolean).join(' · ');
  });

  protected readonly stats = computed<EdasAppCardStat[]>(() => {
    const row = this.data();
    const lang = this.locale.language();
    // Lee el idioma activo (signal) para que las etiquetas cambien con él
    this.translate.currentLang();
    const biwenger = this.marketApi.listContext()?.provider !== 'laliga-fantasy';

    return [
      {label: this.translate.instant('market.price'), value: formatPrice(row?.price, lang)},
      {
        label: this.translate.instant('market.prediction-conservative'),
        value: formatPrice(row?.prediction_conservative, lang),
        muted: row?.prediction_conservative == null,
      },
      ...(biwenger ? [{label: this.translate.instant('market.owners'), value: formatCount(row?.owners, lang), muted: row?.owners == null}] : []),
    ];
  });

  /** Ficha del jugador, en la competición del listado. */
  protected open(): void {
    const competitionId = this.marketApi.listContext()?.competitionId ?? null;

    this.stack.push({modalKey: 'player', section: 'info', id: playerModalId(this.data()!.player.id, competitionId)});
  }
}
