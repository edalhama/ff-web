import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, input, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {TranslatePipe} from '@ngx-translate/core';
import {apiErrorBody} from '@edas/ng';
import {ModalStackActionBarService} from '@edas/ng/navigation/modal-stack/modal-stack-action-bar.service';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {BadgeComponent} from '@edas/ng/wrapper/components/badge/badge.component';
import {InputComponent} from '@edas/ng/wrapper/components/input/input.component';
import {LoaderComponent} from '@edas/ng/wrapper/components/loader/loader.component';
import {SwitchComponent} from '@edas/ng/wrapper/components/switch/switch.component';
import {LocalizedDatePipe} from '@edas/ng/wrapper/pipes/localized-date.pipe';
import {NotificationService} from '@edas/ng/wrapper/services/notification.service';
import {finalize, Subscription, switchMap, takeWhile, timer} from 'rxjs';
import {Competition} from '../../shared/models/competition';
import {SyncDataType, SyncRun, SyncSource, SyncState, SyncStatus} from '../../shared/models/sync';
import {CompetitionApiService} from '../../shared/services/api/competition-api.service';
import {SeasonApiService} from '../../shared/services/api/season-api.service';
import {SyncApiService} from '../../shared/services/api/sync-api.service';
import {TeamApiService} from '../../shared/services/api/team-api.service';
import {CompetitionLinkComponent} from './competition-link.component';

const SECTION_KEY = 'sync';

/** Cada cuánto se consulta el estado mientras hay una sincronización en segundo plano. */
const POLL_MS = 5000;
/** Tope de la espera: pasado esto, una ejecución «en curso» se da por colgada. */
const POLL_LIMIT_MS = 20 * 60 * 1000;

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
 * Calendario y clasificación se esperan en pantalla (unos segundos). Con las plantillas
 * (minutos) la API la lanza en segundo plano y esta sección consulta el estado cada pocos
 * segundos hasta que termina.
 *
 * Arriba, el enlace con el proveedor (`app-competition-link`: buscar y enlazar, cambiar,
 * desenlazar) y un interruptor por cada tipo de dato que el proveedor sabe traer.
 */
@Component({
  selector: 'app-competition-sync-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, BadgeComponent, CompetitionLinkComponent, InputComponent, LoaderComponent, LocalizedDatePipe, SwitchComponent, TranslatePipe],
  template: `
    @if (state(); as sync) {
      @if (data(); as competition) {
        <app-competition-link [competitionId]="competition.id" [state]="sync" [locked]="running() || polling()" (stateChange)="setState($event)"/>
      }

      @for (link of sync.links; track link.provider.code) {
        <edas-app-card icon="database" [iconSize]="48" [title]="'sync.sources-title' | translate" [description]="'sync.sources-description' | translate: {provider: link.provider.name}">
          <ul class="sources">
            @for (type of typesOf(sync, link.provider.code); track type) {
              @let source = sourceOf(sync, link.provider.code, type);
              <li class="source">
                <span class="source-type">{{ 'enum.sync-type.' + type | translate }}</span>
                <span class="source-date">
                  @if (source?.last_run_at; as at) {
                    {{ 'sync.last-run' | translate }} {{ at | localizedDate: 'd MMM y, HH:mm' }}
                  } @else if (source?.active) {
                    {{ 'sync.never' | translate }}
                  } @else {
                    {{ 'sync.source-off' | translate }}
                  }
                </span>
                <edas-switch
                  [checked]="source?.active ?? false"
                  [disabled]="running() || polling() || toggling() !== null"
                  [ariaLabel]="'enum.sync-type.' + type | translate"
                  [labelTranslate]="false"
                  (checkedChange)="toggle(link.provider.code, type, $event)"
                />
              </li>
            }
          </ul>
        </edas-app-card>
      }

      @if (sync.providers.length === 0) {
        <edas-app-card icon="unplug" [iconSize]="48" [title]="'sync.unlinked-title' | translate" [description]="'sync.no-providers' | translate"/>
      }

      @if (sync.sources.length > 0 || sync.runs.length > 0) {
        <edas-input
          class="season-year"
          label="sync.season-year"
          type="number"
          hint="sync.season-year-hint"
          [value]="seasonYear()"
          [disabled]="running()"
          (valueChange)="setSeasonYear($event)"
        />

        @if (running() || polling()) {
          <div class="running" role="status">
            <edas-loader size="s"/>
            <span>{{ (polling() ? 'sync.background' : 'sync.running') | translate }}</span>
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

    @media (max-width: 640px) {
      .source {
        grid-template-columns: minmax(0, 1fr) auto;
      }

      .source-date {
        grid-column: 1;
        grid-row: 2;
      }

      .source edas-switch {
        grid-row: 1 / span 2;
        grid-column: 2;
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
  /** Hay una sincronización en segundo plano y se está siguiendo. */
  protected readonly polling = signal(false);
  /** Tipo de dato que se está activando o desactivando. */
  protected readonly toggling = signal<SyncDataType | null>(null);
  private poll: Subscription | null = null;
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
        next: (state) => {
          this.setState(state);

          // Se abre la pantalla con una ya en marcha (lanzada antes, o desde otra pestaña)
          if (this.hasRunning(state)) {
            this.follow(competition.id, false);
          }
        },
        error: () => this.setState({providers: [], links: [], sources: [], runs: []}),
      });

    this.actionBar.register(SECTION_KEY, [
      {
        id: 'sync',
        labelKey: 'sync.run',
        icon: 'refresh-cw',
        disabled: () => this.running() || this.polling() || !this.canRun(),
        onClick: () => this.run(),
      },
    ]);
    this.destroyRef.onDestroy(() => this.actionBar.unregister(SECTION_KEY));
  }

  /** Tipos que sabe traer un proveedor. */
  protected typesOf(state: SyncState, provider: string): SyncDataType[] {
    return state.providers.find((each) => each.code === provider)?.types ?? [];
  }

  protected sourceOf(state: SyncState, provider: string, type: SyncDataType): SyncSource | null {
    return state.sources.find((source) => source.provider.code === provider && source.data_type === type) ?? null;
  }

  /** Activa o desactiva un tipo de dato. */
  protected toggle(provider: string, type: SyncDataType, active: boolean): void {
    const competition = this.data();
    if (!competition || this.toggling()) {
      return;
    }

    this.toggling.set(type);

    this.syncApi
      .setSource(competition.id, provider, type, active)
      .pipe(
        finalize(() => this.toggling.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (state) => this.setState(state),
        // El interceptor da el aviso; se vuelve a pintar como estaba
        error: () => this.state.update((state) => (state ? {...state} : state)),
      });
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

    return (this.state()?.sources.some((source) => source.active) ?? false) && (year === '' || /^(18|19|20|21)\d{2}$/.test(year));
  }

  private run(): void {
    const competition = this.data();
    if (!competition || this.running() || this.polling() || !this.canRun()) {
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
        next: ({state, background}) => {
          this.setState(state);

          if (background) {
            this.notifications.infoKey('sync.started');
            this.follow(competition.id, true);

            return;
          }

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

  /**
   * Consulta el estado cada pocos segundos hasta que no quede ninguna ejecución en curso.
   * `notify`: al terminar, avisa de cómo ha ido (la ha lanzado esta pantalla).
   */
  private follow(competitionId: number, notify: boolean): void {
    this.poll?.unsubscribe();
    this.setPolling(true);

    const startedAt = Date.now();
    // Cuántas ejecuciones había antes: las nuevas son las de esta sincronización
    const before = new Set((this.state()?.runs ?? []).map((run) => run.id));

    this.poll = timer(POLL_MS, POLL_MS)
      .pipe(
        switchMap(() => this.syncApi.state(competitionId)),
        takeWhile((state) => {
          this.setState(state);

          return this.hasRunning(state) && Date.now() - startedAt < POLL_LIMIT_MS;
        }, true),
        finalize(() => this.setPolling(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        complete: () => {
          const fresh = (this.state()?.runs ?? []).filter((run) => !before.has(run.id));

          if (notify && fresh.length > 0) {
            if (fresh.some((run) => run.status === 'failed')) {
              this.notifications.errorKey('sync.failed');
            } else {
              this.notifications.successKey(fresh.some((run) => run.status === 'partial') ? 'sync.partial' : 'sync.done');
            }
          }

          this.announce(competitionId);
        },
      });
  }

  private hasRunning(state: SyncState): boolean {
    return state.runs.some((run) => run.status === 'running');
  }

  private setPolling(polling: boolean): void {
    this.polling.set(polling);
    this.actionBar.refresh();
  }

  /** Lo sincronizado cambia lo que muestran otras listas ya montadas. */
  private announce(competitionId: number): void {
    this.seasonApi.changed$.next(competitionId);
    this.competitionApi.refreshList$.next();
    this.teamApi.refreshList$.next();
  }

  protected setState(state: SyncState): void {
    this.state.set(state);
    this.actionBar.refresh();
  }

  private setRunning(running: boolean): void {
    this.running.set(running);
    this.actionBar.refresh();
  }
}
