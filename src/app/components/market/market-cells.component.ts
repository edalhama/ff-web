import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {LocaleService} from '@edas/ng/shared/services/locale.service';
import {changeTone, formatChange, formatCount, formatPrice} from '../../shared/market/market';
import {MarketRow} from '../../shared/models/market';

/** Columnas del mercado que son importes en euros. */
export type MarketMoneyField = 'price' | 'fantasy_price' | 'prediction_conservative' | 'prediction_aggressive';

/** Columnas del mercado que son recuentos (solo Biwenger). */
export type MarketCountField = 'purchases' | 'sales' | 'owners';

/** Importe en euros de una columna del mercado, con el formato del idioma de quien mira. */
@Component({
  selector: 'app-market-money-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'[class.muted]': 'empty()'},
  template: `{{ text() }}`,
  styles: [`
    :host {
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    :host(.muted) {
      color: var(--edas-muted-text-color);
    }
  `],
})
export class MarketMoneyCellComponent {
  public readonly data = input<MarketRow>();
  public readonly field = input<MarketMoneyField>('price');
  private readonly locale = inject(LocaleService);

  protected readonly empty = computed(() => this.data()?.[this.field()] == null);
  protected readonly text = computed(() => formatPrice(this.data()?.[this.field()], this.locale.language()));
}

/** Variación del día: con signo, en verde si sube y en rojo si baja. */
@Component({
  selector: 'app-market-change-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'[class]': 'tone()'},
  template: `{{ text() }}`,
  styles: [`
    :host {
      font-variant-numeric: tabular-nums;
      font-weight: 600;
      white-space: nowrap;
      color: var(--edas-muted-text-color);
    }

    :host(.up) {
      color: rgb(var(--edas-tone-success-rgb));
    }

    :host(.down) {
      color: rgb(var(--edas-tone-danger-rgb));
    }
  `],
})
export class MarketChangeCellComponent {
  public readonly data = input<Pick<MarketRow, 'change'>>();
  private readonly locale = inject(LocaleService);

  protected readonly tone = computed(() => changeTone(this.data()?.change) ?? '');
  protected readonly text = computed(() => formatChange(this.data()?.change, this.locale.language()));
}

/** Compras, ventas o propietarios, con separador de miles. */
@Component({
  selector: 'app-market-count-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ text() }}`,
  styles: [`
    :host {
      font-variant-numeric: tabular-nums;
    }
  `],
})
export class MarketCountCellComponent {
  public readonly data = input<MarketRow>();
  public readonly field = input<MarketCountField>('owners');
  private readonly locale = inject(LocaleService);

  protected readonly text = computed(() => formatCount(this.data()?.[this.field()], this.locale.language()));
}
