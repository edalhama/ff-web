import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {LocalizedDatePipe} from '@edas/ng/wrapper/pipes/localized-date.pipe';
import {AutomanagerMatch, PlayerAutomanager} from '../../shared/models/market';

/**
 * Valoración del automanager de Jornada Perfecta en la ficha del jugador (sección `rating`): la
 * actual de cada sistema de puntuación, con su día, y debajo la que traía a sus últimos partidos
 * (una columna por sistema, del más reciente al más antiguo).
 */
@Component({
  selector: 'app-player-automanager',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, LocalizedDatePipe, TranslatePipe],
  template: `
    @if (automanager(); as data) {
      @if (data.current.length > 0) {
        <edas-app-card
          icon="bot"
          [iconSize]="48"
          [title]="'player.automanager' | translate"
          [description]="'player.automanager-description' | translate: {date: (data.current[0].date | localizedDate: 'd MMM y')}"
        >
          <div class="systems">
            @for (rating of data.current; track rating.scoring_system.id) {
              <div class="system">
                <span class="system-value">{{ rating.rating }}</span>
                <span class="system-name">{{ rating.scoring_system.name ?? rating.scoring_system.code }}</span>
                @if (rating.date !== data.current[0].date) {
                  <span class="system-date">{{ rating.date | localizedDate: 'd MMM' }}</span>
                }
              </div>
            }
          </div>
        </edas-app-card>
      }

      @if (data.matches.length > 0) {
        <h3 class="block-title">{{ 'player.automanager-matches' | translate }}</h3>
        <div class="ff-panel ff-panel--scroll" data-no-section-swipe>
          <table class="ff-table">
            <thead>
              <tr>
                <th scope="col">{{ 'player.automanager-match' | translate }}</th>
                @for (system of systems(); track system.code) {
                  <th scope="col" class="number">{{ system.name ?? system.code }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (match of data.matches; track match.match_id) {
                <tr>
                  <td>
                    <span class="opponent">{{ (match.home ? 'player.automanager-vs' : 'player.automanager-at') | translate: {team: match.opponent.name ?? '—'} }}</span>
                    <span class="match-date">{{ match.kickoff_at ? (match.kickoff_at | localizedDate: 'd MMM y') : '—' }}</span>
                  </td>
                  @for (system of systems(); track system.code) {
                    <td class="number">{{ ratingOf(match, system.code) ?? '—' }}</td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-4);
      width: 100%;
    }

    .block-title {
      margin: var(--edas-space-2) 0 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .systems {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
      gap: var(--edas-space-2);
    }

    .system {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      text-align: center;
    }

    .system-value {
      font-size: 1.375rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }

    .system-name,
    .system-date,
    .match-date {
      font-size: 0.75rem;
      color: var(--edas-muted-text-color);
    }

    .opponent {
      display: block;
      font-weight: 600;
    }

    .number {
      text-align: end;
      font-variant-numeric: tabular-nums;
    }
  `],
})
export class PlayerAutomanagerComponent {
  public readonly automanager = input<PlayerAutomanager | null | undefined>(null);

  /** Sistemas de las columnas: los de la valoración actual y, después, los que solo salen en partidos. */
  protected readonly systems = computed(() => {
    const data = this.automanager();
    const seen = new Map<string, {code: string; name: string | null}>();

    for (const rating of data?.current ?? []) {
      seen.set(rating.scoring_system.code, rating.scoring_system);
    }

    for (const match of data?.matches ?? []) {
      for (const rating of match.ratings) {
        if (!seen.has(rating.scoring_system.code)) {
          seen.set(rating.scoring_system.code, rating.scoring_system);
        }
      }
    }

    return [...seen.values()];
  });

  protected ratingOf(match: AutomanagerMatch, code: string): number | null {
    return match.ratings.find((rating) => rating.scoring_system.code === code)?.rating ?? null;
  }
}
