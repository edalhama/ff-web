import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {PlayerRating} from '../../shared/models/player';
import {CARD_STATS, cardStatKey, ratingTier} from '../../shared/players/rating';

/**
 * Media de un jugador en el videojuego, con el color de su carta (oro, plata o bronce). Al
 * pasar por encima, las seis medias; si se sabe su ficha en la web del juego, es un enlace a
 * ella.
 */
@Component({
  selector: 'app-player-rating-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (rating(); as current) {
      @if (current.profile_url && linked()) {
        <a class="overall" [class]="tierClass()" [href]="current.profile_url" target="_blank" rel="noopener noreferrer" [title]="title()" (click)="$event.stopPropagation()" (keydown.enter)="$event.stopPropagation()">{{ current.overall }}</a>
      } @else {
        <span class="overall" [class]="tierClass()" [title]="title()">{{ current.overall }}</span>
      }
    }
  `,
  styles: [`
    :host {
      display: inline-flex;
    }

    /* Con texto oscuro sobre el metal, se lee igual en modo claro y oscuro */
    .overall {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 2.25rem;
      padding: 2px 6px;
      border-radius: var(--edas-radius-sm, 6px);
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      color: #1d1d1f;
      text-decoration: none;
      cursor: help;
    }

    .overall.large {
      min-width: 3.5rem;
      padding: 6px 10px;
      font-size: 1.5rem;
      border-radius: var(--edas-radius-md, 10px);
    }

    a.overall {
      cursor: pointer;
    }

    a.overall:focus-visible {
      outline: 2px solid var(--edas-color-primary);
      outline-offset: 2px;
    }

    .overall.gold {
      background: #e8c766;
    }

    .overall.silver {
      background: #ccd2da;
    }

    .overall.bronze {
      background: #d29a6c;
    }
  `],
})
export class PlayerRatingBadgeComponent {
  public readonly rating = input<PlayerRating | null | undefined>(null);
  /** Enlaza con su ficha en el juego, si se sabe. */
  public readonly linked = input(true);
  public readonly size = input<'m' | 'l'>('m');

  private readonly translate = inject(TranslateService);

  protected readonly tierClass = computed(() => {
    const rating = this.rating();

    return ['overall', rating ? ratingTier(rating.overall) : '', this.size() === 'l' ? 'large' : ''].join(' ').trim();
  });

  /** «RIT 76 · TIR 75 · …» (las de portero, si lo es). */
  protected readonly title = computed(() => {
    const rating = this.rating();
    // Lee el idioma activo (signal) para que cambie con él
    this.translate.currentLang();

    if (!rating) {
      return '';
    }

    return CARD_STATS.filter((stat) => rating[stat] !== null)
      .map((stat) => `${this.translate.instant(cardStatKey(stat, rating))} ${rating[stat]}`)
      .join(' · ');
  });
}
