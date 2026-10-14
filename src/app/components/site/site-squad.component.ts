import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {SiteSquadPlayer} from '../../shared/models/site';
import {ageOn, groupByPosition} from '../../shared/players/squad';

/**
 * Plantilla de un equipo en la parte pública: un bloque por demarcación (porteros, defensas,
 * centrocampistas, delanteros) con el dorsal, el nombre, el país y la edad de cada jugador.
 */
@Component({
  selector: 'app-site-squad',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    @for (group of groups(); track group.position) {
      <div class="group">
        <h3 class="site-subheading">{{ 'site.squad.position.' + (group.position ?? 'unknown') | translate }}</h3>

        <ul class="players">
          @for (player of group.players; track player.slug) {
            <li class="player">
              <span class="number" [attr.aria-label]="player.shirt_number !== null ? ('site.squad.number' | translate: {number: player.shirt_number}) : null">
                {{ player.shirt_number ?? '–' }}
              </span>
              <span class="body">
                <span class="name">{{ player.name }}</span>
                @if (details(player); as text) {
                  <span class="meta">{{ text }}</span>
                }
              </span>
            </li>
          }
        </ul>
      </div>
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-5);
    }

    .group {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-3);
    }

    .players {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: var(--edas-space-2) var(--edas-space-4);
    }

    @media (min-width: 768px) {
      .players {
        grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
      }
    }

    .player {
      display: flex;
      align-items: center;
      gap: var(--edas-space-3);
      min-width: 0;
      padding-block: 6px;
      border-bottom: 1px solid var(--edas-surface-border-color);
    }

    .number {
      flex: none;
      width: 2rem;
      height: 2rem;
      display: grid;
      place-items: center;
      border-radius: var(--edas-radius-md);
      background: rgba(var(--edas-tone-neutral-rgb), 0.14);
      font-size: 0.875rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }

    .body {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .name,
    .meta {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .name {
      font-weight: 600;
    }

    .meta {
      font-size: 0.8125rem;
      color: var(--edas-muted-text-color);
    }
  `],
})
export class SiteSquadComponent {
  public readonly players = input.required<readonly SiteSquadPlayer[]>();

  private readonly translate = inject(TranslateService);

  protected readonly groups = computed(() => groupByPosition(this.players()));

  private readonly today = new Date();

  /** «España · 24 años». */
  protected details(player: SiteSquadPlayer): string {
    const age = ageOn(player.birth_date, this.today);

    return [player.country?.name, age !== null ? this.translate.instant('site.squad.age', {age}) : null].filter(Boolean).join(' · ');
  }
}
