import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {BadgeComponent} from '@edas/ng/wrapper/components/badge/badge.component';
import {Player, PlayerMembershipState, PlayerPosition} from '../../shared/models/player';
import {formatMoney} from '../../shared/players/money';
import {playerStatusTone} from '../../shared/players/squad';

/** Celda de nombre de la tabla de jugadores: su cara, el deportivo y, debajo, el completo. */
@Component({
  selector: 'app-player-name-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (data(); as row) {
      @if (row.player.photo) {
        <img class="photo" [src]="row.player.photo" alt="" width="32" height="32" loading="lazy" (error)="hideImage($event)"/>
      } @else {
        <span class="photo"></span>
      }
      <span class="names">
        <span class="name">{{ row.player.name }}</span>
        @if (row.player.full_name && row.player.full_name !== row.player.name) {
          <span class="full-name">{{ row.player.full_name }}</span>
        }
      </span>
    }
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      gap: var(--edas-space-2);
      max-width: 20rem;
    }

    .photo {
      width: 32px;
      height: 32px;
      flex: none;
      object-fit: cover;
      border-radius: 50%;
      background: rgba(var(--edas-tone-neutral-rgb), 0.14);
    }

    .names {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .name {
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .full-name {
      font-size: 0.8125rem;
      color: var(--edas-muted-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `],
})
export class PlayerNameCellComponent {
  /** Una fila del listado de jugadores o de la plantilla de un equipo. */
  public readonly data = input<{player: Pick<Player, 'name' | 'full_name' | 'photo'>}>();

  /** Imagen que no carga: se deja el hueco (el círculo de fondo) en vez del icono roto. */
  protected hideImage(event: Event): void {
    (event.target as HTMLImageElement).removeAttribute('src');
  }
}

/** Celda de posición: la de la temporada (o, en la hoja de un partido, la de ese partido). */
@Component({
  selector: 'app-player-position-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `{{ data()?.position ? ('enum.player-position.' + data()!.position | translate) : '—' }}`,
})
export class PlayerPositionCellComponent {
  public readonly data = input<{position: PlayerPosition | null}>();
}

/** Estado de una ficha: «ya no está» si ha dejado el equipo; si no, su estado, si se sabe. */
@Component({
  selector: 'app-player-status-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent],
  host: {'[class.gone]': 'data()?.active === false'},
  template: `
    @if (data(); as member) {
      @if (!member.active) {
        <edas-badge appearance="neutral" label="team.squad-inactive" size="s"/>
      } @else if (member.status !== 'unknown') {
        <edas-badge [appearance]="tone(member)" [label]="'enum.player-status.' + member.status" size="s"/>
      } @else {
        <span class="muted">—</span>
      }
    }
  `,
  styles: [`
    .muted {
      color: var(--edas-muted-text-color);
    }
  `],
})
export class PlayerStatusCellComponent {
  public readonly data = input<PlayerMembershipState>();

  protected tone(member: PlayerMembershipState): 'success' | 'warning' | 'danger' | 'neutral' {
    return playerStatusTone(member.status);
  }
}

/** Celda del valor de mercado (Transfermarkt): compacto, en euros; `—` si no tiene. */
@Component({
  selector: 'app-player-value-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'[class.muted]': 'data()?.player?.market_value == null'},
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
export class PlayerValueCellComponent {
  /** Una fila del listado de jugadores o de la plantilla de un equipo. */
  public readonly data = input<{player: {market_value: number | null}}>();

  private readonly translate = inject(TranslateService);

  protected readonly text = computed(() => formatMoney(this.data()?.player.market_value, this.translate.currentLang()));
}
