import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {TranslatePipe} from '@ngx-translate/core';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {BadgeComponent} from '@edas/ng/wrapper/components/badge/badge.component';
import {LoaderComponent} from '@edas/ng/wrapper/components/loader/loader.component';
import {EdasTabItem, TabsComponent} from '@edas/ng/wrapper/components/tabs/tabs.component';
import {PlayerStatus, SquadMember, TeamSquad} from '../../shared/models/player';
import {Team} from '../../shared/models/team';
import {ageOn} from '../../shared/players/squad';
import {TeamApiService} from '../../shared/services/api/team-api.service';

const STATUS_TONE: Partial<Record<PlayerStatus, 'success' | 'warning' | 'danger'>> = {
  ok: 'success',
  doubt: 'warning',
  warned: 'warning',
  injured: 'danger',
  suspended: 'danger',
};

/**
 * Plantilla de un equipo (sección `squad` del modal `team`): una pestaña por temporada en la
 * que está inscrito, con dorsal, posición, país, edad y estado de cada jugador. Es de solo
 * lectura: llega por la sincronización de plantillas. Los que han dejado el equipo salen al
 * final, atenuados.
 */
@Component({
  selector: 'app-team-squad-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, BadgeComponent, LoaderComponent, TabsComponent, TranslatePipe],
  template: `
    @if (squads(); as list) {
      @if (list.length > 1) {
        <edas-tabs [tabs]="tabs()" [activeKey]="String(selected()?.season?.id ?? '')" (activeKeyChange)="select($event)"/>
      }

      @if (selected(); as squad) {
        @if (squad.members.length > 0) {
          <p class="note">
            {{ squad.competition.name }} · {{ squad.season.label }} ·
            {{ 'team.squad-count' | translate: {count: activeCount()} }}
          </p>

          <div class="ff-panel ff-panel--scroll" data-no-section-swipe>
            <table class="ff-table">
              <thead>
                <tr>
                  <th class="end" scope="col">{{ 'team.squad-number' | translate }}</th>
                  <th class="sticky" scope="col">{{ 'team.squad-player' | translate }}</th>
                  <th scope="col">{{ 'team.squad-position' | translate }}</th>
                  <th scope="col">{{ 'team.squad-country' | translate }}</th>
                  <th class="end" scope="col">{{ 'team.squad-age' | translate }}</th>
                  <th scope="col">{{ 'team.squad-status' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (member of squad.members; track member.id) {
                  <tr [class.gone]="!member.active">
                    <td class="end number">{{ member.shirt_number ?? '–' }}</td>
                    <td class="sticky">
                      <span class="name">{{ member.player.name }}</span>
                      @if (member.player.full_name && member.player.full_name !== member.player.name) {
                        <span class="full-name">{{ member.player.full_name }}</span>
                      }
                    </td>
                    <td>{{ member.position ? ('enum.player-position.' + member.position | translate) : '—' }}</td>
                    <td>{{ member.player.country?.name ?? '—' }}</td>
                    <td class="end">{{ age(member) ?? '—' }}</td>
                    <td>
                      @if (!member.active) {
                        <edas-badge appearance="neutral" label="team.squad-inactive" size="s"/>
                      } @else if (member.status !== 'unknown') {
                        <edas-badge [appearance]="tone(member)" [label]="'enum.player-status.' + member.status" size="s"/>
                      } @else {
                        <span class="muted">—</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <edas-app-card icon="users" [iconSize]="48" [title]="'team.squad-empty-title' | translate" [description]="'team.squad-empty' | translate"/>
        }
      } @else {
        <edas-app-card icon="users" [iconSize]="48" [title]="'team.squad-empty-title' | translate" [description]="'team.squad-empty' | translate"/>
      }
    } @else {
      <edas-loader/>
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-4);
      width: 100%;
    }

    .note {
      margin: 0;
      font-size: 0.875rem;
      color: var(--edas-muted-text-color);
    }

    .number {
      font-weight: 700;
    }

    .name {
      display: block;
      font-weight: 600;
    }

    .full-name,
    .muted {
      font-size: 0.8125rem;
      color: var(--edas-muted-text-color);
    }

    .gone td {
      opacity: 0.55;
    }
  `],
})
export class TeamSquadSectionComponent implements OnInit {
  /** Equipo abierto; lo carga el modal. */
  public readonly data = input<Team>();

  private readonly teamApi = inject(TeamApiService);
  private readonly destroyRef = inject(DestroyRef);

  /** `null` mientras cargan. */
  protected readonly squads = signal<TeamSquad[] | null>(null);
  private readonly seasonId = signal<number | null>(null);

  protected readonly selected = computed(() => {
    const list = this.squads() ?? [];

    return list.find((squad) => squad.season.id === this.seasonId()) ?? list[0] ?? null;
  });

  protected readonly tabs = computed<EdasTabItem[]>(() =>
    (this.squads() ?? []).map((squad) => ({
      key: String(squad.season.id),
      labelKey: `${squad.competition.name ?? ''} ${squad.season.label}`.trim(),
      labelTranslate: false,
    })),
  );

  protected readonly activeCount = computed(() => this.selected()?.members.filter((member) => member.active).length ?? 0);

  protected readonly String = String;

  private readonly today = new Date();

  public ngOnInit(): void {
    const team = this.data();
    if (!team) {
      return;
    }

    this.teamApi
      .squads(team.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (squads) => this.squads.set(squads),
        // El aviso lo da el interceptor
        error: () => this.squads.set([]),
      });
  }

  protected select(key: string): void {
    this.seasonId.set(Number(key));
  }

  protected age(member: SquadMember): number | null {
    return ageOn(member.player.birth_date, this.today);
  }

  protected tone(member: SquadMember): 'success' | 'warning' | 'danger' | 'neutral' {
    return STATUS_TONE[member.status] ?? 'neutral';
  }
}
