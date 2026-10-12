import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, input, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {TranslatePipe} from '@ngx-translate/core';
import {apiErrorBody} from '@edas/ng';
import {ModalStackActionBarService} from '@edas/ng/navigation/modal-stack/modal-stack-action-bar.service';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {BadgeComponent} from '@edas/ng/wrapper/components/badge/badge.component';
import {InputComponent} from '@edas/ng/wrapper/components/input/input.component';
import {LoaderComponent} from '@edas/ng/wrapper/components/loader/loader.component';
import {LocalizedDatePipe} from '@edas/ng/wrapper/pipes/localized-date.pipe';
import {NotificationService} from '@edas/ng/wrapper/services/notification.service';
import {finalize} from 'rxjs';
import {Competition} from '../../shared/models/competition';
import {SyncRun, SyncState, SyncStatus} from '../../shared/models/sync';
import {CompetitionApiService} from '../../shared/services/api/competition-api.service';
import {SeasonApiService} from '../../shared/services/api/season-api.service';
import {SyncApiService} from '../../shared/services/api/sync-api.service';
import {TeamApiService} from '../../shared/services/api/team-api.service';

const SECTION_KEY = 'sync';

const STATUS_TONE: Record<SyncStatus, 'success' | 'warning' | 'danger' | 'info'> = {
  success: 'success',
  partial: 'warning',
  failed: 'danger',
  running: 'info',
};

const STATUS_ICON: Record<SyncStatus, string> = {
  success: 'check-circle',
  partial: 'triangle-alert',
  failed: 'x-circle',
  running: 'loader-circle',
};

/**
 * Sincronización de una competición (sección `sync` del modal `competition`): de qué
 * proveedor viene cada dato, lanzarla ahora y ver qué pasó en las últimas ejecuciones.
 *
 * La sincronización se espera en pantalla (una liga entera son unos segundos). Enlazar la
 * competición con un proveedor se hace por consola, con `sync:link`.
 */
@Component({
  selector: 'app-competition-sync-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, BadgeComponent, InputComponent, LoaderComponent, LocalizedDatePipe, TranslatePipe],
  template: `
    @if (state(); as sync) {
      @if (sync.sources.length > 0) {
        <edas-app-card icon="database" [iconSize]="48" [title]="'sync.sources-title' | translate" [description]="'sync.sources-description' | translate">
          <ul class="sources">
            @for (source of sync.sources; track source.id) {
              <li class="source">
                <span class="source-type">{{ 'enum.sync-type.' + source.data_type | translate }}</span>
                <span class="source-detail">
                  {{ source.provider.name }}
                  @if (source.external_id) {
                    · {{ 'sync.external-id' | translate }} {{ source.external_id }}
                  }
                </span>
                <span class="source-date">
                  @if (!source.active) {
                    <edas-badge appearance="neutral" label="sync.source-inactive" size="s"/>
                  } @else if (source.last_run_at) {
                    {{ source.last_run_at | localizedDate: 'd MMM y, HH:mm' }}
                  } @else {
                    {{ 'sync.never' | translate }}
                  }
                </span>
              </li>
            }
          </ul>
        </edas-app-card>

        <edas-input
          class="season-year"
          label="sync.season-year"
          type="number"
          hint="sync.season-year-hint"
          [value]="seasonYear()"
          [disabled]="running()"
          (valueChange)="setSeasonYear($event)"
        />

        @if (running()) {
          <div class="running" role="status">
            <edas-loader size="s"/>
            <span>{{ 'sync.running' | translate }}</span>
          </div>
        }

        <div class="runs">
          <h3 class="runs-title">{{ 'sync.runs-title' | translate }}</h3>

          @for (run of sync.runs; track run.id) {
            <div class="ff-panel run">
              <div class="run-head">
                <edas-badge [appearance]="tone(run)" [icon]="icon(run)" [label]="'enum.sync-status.' + run.status" size="s"/>
                <span class="run-type">{{ 'enum.sync-type.' + run.data_type | translate }}</span>
                <span class="run-meta">
                  {{ run.started_at | localizedDate: 'd MMM y, HH:mm' }}
                  @if (run.user) {
                    · {{ run.user.name }}
                  }
                </span>
              </div>

              @if (run.message) {
                <p class="run-message">{{ run.message }}</p>
              }

              @if (run.errors.length > 0) {
                <ul class="run-lines run-lines--errors">
                  @for (line of run.errors; track $index) {
                    <li>{{ line }}</li>
                  }
                </ul>
              }

              @if (run.notes.length > 0) {
                <ul class="run-lines">
                  @for (line of run.notes; track $index) {
                    <li>{{ line }}</li>
                  }
                </ul>
              }

              @if (run.quota_remaining !== null) {
                <p class="run-quota">{{ 'sync.quota' | translate: {requests: run.requests ?? 0, remaining: run.quota_remaining} }}</p>
              }
            </div>
          } @empty {
            <p class="runs-empty">{{ 'sync.no-runs' | translate }}</p>
          }
        </div>
      } @else {
        <edas-app-card icon="unplug" [iconSize]="48" [title]="'sync.unlinked-title' | translate" [description]="'sync.unlinked-description' | translate">
          <p class="help">{{ 'sync.unlinked-help' | translate }}</p>
          <code class="command">sail artisan sync:link {{ slug() }} api-football &lt;id&gt;</code>
        </edas-app-card>
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

    .sources {
      display: flex;
      flex-direction: column;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .source {
      display: grid;
      grid-template-columns: 9rem minmax(0, 1fr) auto;
      align-items: center;
      gap: var(--edas-space-3);
      padding-block: 10px;
      border-top: 1px solid var(--edas-surface-border-color);
      font-size: 0.875rem;
    }

    .source-type {
      font-weight: 600;
    }

    .source-detail,
    .source-date {
      color: var(--edas-muted-text-color);
    }

    .season-year {
      max-width: 22rem;
    }

    .running {
      display: flex;
      align-items: center;
      gap: var(--edas-space-3);
      color: var(--edas-muted-text-color);
    }

    .runs {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-3);
    }

    .runs-title {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .runs-empty,
    .help {
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.4;
      color: var(--edas-muted-text-color);
    }

    .run {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-2);
      padding: 14px 16px;
    }

    .run-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--edas-space-2) var(--edas-space-3);
    }

    .run-type {
      font-weight: 600;
    }

    .run-meta {
      margin-inline-start: auto;
      font-size: 0.8125rem;
      color: var(--edas-muted-text-color);
    }

    .run-message {
      margin: 0;
      font-size: 0.9375rem;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }

    .run-lines {
      margin: 0;
      padding-inline-start: 1.1rem;
      font-size: 0.8125rem;
      line-height: 1.5;
      color: var(--edas-muted-text-color);
      overflow-wrap: anywhere;
    }

    .run-lines--errors {
      color: var(--edas-danger-color);
    }

    .run-quota {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--edas-muted-text-color);
    }

    .command {
      display: block;
      margin-top: var(--edas-space-3);
      padding: 10px 12px;
      border-radius: var(--edas-radius-md);
      background: rgba(var(--edas-tone-neutral-rgb), 0.16);
      font-size: 0.8125rem;
      overflow-wrap: anywhere;
    }

    @media (max-width: 640px) {
      .source {
        grid-template-columns: minmax(0, 1fr) auto;
      }

      .source-detail {
        grid-column: 1 / -1;
        grid-row: 2;
      }

      .run-meta {
        margin-inline-start: 0;
        flex-basis: 100%;
      }
    }
  `],
})
export class CompetitionSyncSectionComponent implements OnInit {
  /** Competición abierta; la carga el modal. */
  public readonly data = input<Competition>();

  private readonly syncApi = inject(SyncApiService);
  private readonly seasonApi = inject(SeasonApiService);
  private readonly competitionApi = inject(CompetitionApiService);
  private readonly teamApi = inject(TeamApiService);
  private readonly actionBar = inject(ModalStackActionBarService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  /** `null` mientras llega la primera carga. */
  protected readonly state = signal<SyncState | null>(null);
  protected readonly running = signal(false);
  /** Año de inicio de la temporada a sincronizar, como está en el campo; vacío = la actual del proveedor. */
  protected readonly seasonYear = signal('');

  public ngOnInit(): void {
    const competition = this.data();
    if (!competition) {
      return;
    }

    // Por defecto, la temporada que el panel tiene como actual
    this.seasonYear.set(competition.current_season ? String(competition.current_season.start_year) : '');

    this.syncApi
      .state(competition.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (state) => this.setState(state),
        error: () => this.setState({sources: [], runs: []}),
      });

    this.actionBar.register(SECTION_KEY, [
      {
        id: 'sync',
        labelKey: 'sync.run',
        icon: 'refresh-cw',
        disabled: () => this.running() || !this.canRun(),
        onClick: () => this.run(),
      },
    ]);
    this.destroyRef.onDestroy(() => this.actionBar.unregister(SECTION_KEY));
  }

  /** Slug de la competición, para el comando de ejemplo. */
  protected slug(): string {
    const translations = this.data()?.translations ?? {};

    return Object.values(translations)[0]?.slug ?? String(this.data()?.id ?? '');
  }

  protected setSeasonYear(value: string): void {
    this.seasonYear.set(value);
    this.actionBar.refresh();
  }

  protected tone(run: SyncRun): 'success' | 'warning' | 'danger' | 'info' {
    return STATUS_TONE[run.status];
  }

  protected icon(run: SyncRun): string {
    return STATUS_ICON[run.status];
  }

  /** Hay fuentes y el año, si se ha escrito, tiene pinta de año. */
  private canRun(): boolean {
    const year = this.seasonYear().trim();

    return (this.state()?.sources.length ?? 0) > 0 && (year === '' || /^(18|19|20|21)\d{2}$/.test(year));
  }

  private run(): void {
    const competition = this.data();
    if (!competition || this.running() || !this.canRun()) {
      return;
    }

    const year = this.seasonYear().trim();

    this.setRunning(true);

    this.syncApi
      .run(competition.id, {seasonYear: year === '' ? null : Number(year)})
      .pipe(
        finalize(() => this.setRunning(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (state) => {
          this.setState(state);
          this.notifications.successKey(state.runs.some((run) => run.status === 'partial') ? 'sync.partial' : 'sync.done');
          this.announce(competition.id);
        },
        error: (error) => {
          // El motivo ya lo enseña el interceptor; la respuesta trae además cómo ha quedado todo
          const state = this.syncApi.stateOf(apiErrorBody(error));

          if (state) {
            this.setState(state);
          }
        },
      });
  }

  /** Lo sincronizado cambia lo que muestran otras listas ya montadas. */
  private announce(competitionId: number): void {
    this.seasonApi.changed$.next(competitionId);
    this.competitionApi.refreshList$.next();
    this.teamApi.refreshList$.next();
  }

  private setState(state: SyncState): void {
    this.state.set(state);
    this.actionBar.refresh();
  }

  private setRunning(running: boolean): void {
    this.running.set(running);
    this.actionBar.refresh();
  }
}
