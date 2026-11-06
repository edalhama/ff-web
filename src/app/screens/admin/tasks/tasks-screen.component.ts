import {ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {GlobalActionBarService} from '@edas/ng/components/layout/action-bar/global-action-bar.service';
import {ListFilter} from '@edas/ng/components/layout/list/list-filters';
import {EdasListMemoryOptions} from '@edas/ng/components/layout/list/list-memory';
import {EdasListColumn} from '@edas/ng/components/layout/list/list-view';
import {ListComponent} from '@edas/ng/components/layout/list/list.component';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {BadgeComponent} from '@edas/ng/wrapper/components/badge/badge.component';
import {ButtonComponent} from '@edas/ng/wrapper/components/button/button.component';
import {InputComponent} from '@edas/ng/wrapper/components/input/input.component';
import {LoaderComponent} from '@edas/ng/wrapper/components/loader/loader.component';
import {LocalizedDatePipe} from '@edas/ng/wrapper/pipes/localized-date.pipe';
import {DialogService} from '@edas/ng/wrapper/services/dialog.service';
import {NotificationService} from '@edas/ng/wrapper/services/notification.service';
import {finalize} from 'rxjs';
import {
  TASK_STATUS_ICON,
  TASK_STATUS_TONE,
  TaskActionsCellComponent,
  TaskCadenceCellComponent,
  TaskCompetitionCellComponent,
  TaskLastRunCellComponent,
  TaskNextRunCellComponent,
  TaskStatusCellComponent,
} from '../../../components/task/task-cells.component';
import {Incident, Task, TasksState, TaskStatus} from '../../../shared/models/tasks';
import {SyncApiService} from '../../../shared/services/api/sync-api.service';
import {TasksApiService} from '../../../shared/services/api/tasks-api.service';
import {SessionService} from '../../../shared/services/session.service';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

/** Filtro de estado de la tabla de tareas (viaja como `status` a `memoryListPage`). */
const TASK_FILTERS: readonly ListFilter[] = [
  {
    key: 'status',
    label: 'common.status',
    defaultValue: null,
    options: [
      {value: null, label: 'tasks.filter-all'},
      {value: 'failing', label: 'tasks.filter-failing'},
      {value: 'active', label: 'tasks.filter-active'},
      {value: 'inactive', label: 'tasks.filter-inactive'},
    ],
  },
];

/** Para ordenar por estado: lo que falla, arriba. */
const STATUS_ORDER: Record<TaskStatus, number> = {failed: 0, partial: 1, running: 2, pending: 3, success: 4, inactive: 5};

/**
 * Gestión de tareas: si corre el programador, cada tarea de sincronización (una fuente de
 * cada competición) con su estado y su próxima ejecución, las incidencias abiertas (y las
 * últimas resueltas) y las últimas ejecuciones de todo el sistema.
 *
 * Las incidencias las abre el servidor cuando algo falla y avisa por email; aquí se ven y se
 * cierran a mano si hace falta (se cierran solas cuando lo que fallaba vuelve a ir). Lo que
 * enseña es una foto del momento: «Actualizar» la repite.
 */
@Component({
  selector: 'app-tasks-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, BadgeComponent, ButtonComponent, InputComponent, ListComponent, LoaderComponent, LocalizedDatePipe, TranslatePipe],
  template: `
    @if (state(); as tasks) {
      <p class="intro">{{ 'tasks.intro' | translate }}</p>

      <div class="layers">
        <div class="ff-panel layer">
          <div class="layer-head">
            <h2 class="layer-title">{{ 'tasks.scheduler-title' | translate }}</h2>
            <edas-badge [appearance]="schedulerTone(tasks)" [icon]="tasks.scheduler.stalled ? 'octagon-alert' : 'activity'" [label]="schedulerStatus(tasks)" size="s"/>
          </div>
          <p class="layer-text">{{ 'tasks.scheduler-description' | translate: {minutes: tasks.scheduler.gap_minutes} }}</p>
          @if (tasks.scheduler.last_tick_at; as at) {
            <p class="layer-note" [class.layer-note--problem]="tasks.scheduler.stalled">
              {{ 'tasks.scheduler-last' | translate }} {{ at | localizedDate: 'd MMM y, HH:mm' }}
            </p>
          } @else {
            <p class="layer-note layer-note--problem">{{ 'tasks.scheduler-never' | translate }}</p>
          }
          @if (tasks.scheduler.stalled) {
            <p class="layer-note"><code>* * * * * php artisan schedule:run</code></p>
          }
        </div>

        <div class="ff-panel layer">
          <div class="layer-head">
            <h2 class="layer-title">{{ 'tasks.tasks-title' | translate }}</h2>
            @if (tasks.summary.failing > 0) {
              <edas-badge appearance="danger" icon="x-circle" [label]="'tasks.failing' | translate: {count: tasks.summary.failing}" [labelTranslate]="false" size="s"/>
            } @else {
              <edas-badge appearance="success" icon="check-circle" label="tasks.all-fine" size="s"/>
            }
          </div>
          <dl class="figures">
            <div><dt>{{ 'tasks.active' | translate }}</dt><dd>{{ tasks.summary.active }} / {{ tasks.summary.tasks }}</dd></div>
            <div><dt>{{ 'tasks.with-failure' | translate }}</dt><dd [class.problem]="tasks.summary.failing > 0">{{ tasks.summary.failing }}</dd></div>
          </dl>
        </div>

        <div class="ff-panel layer">
          <div class="layer-head">
            <h2 class="layer-title">{{ 'tasks.incidents-title' | translate }}</h2>
            <edas-badge
              [appearance]="tasks.summary.open_incidents > 0 ? 'danger' : 'success'"
              [icon]="tasks.summary.open_incidents > 0 ? 'siren' : 'check-circle'"
              [label]="tasks.summary.open_incidents > 0 ? ('tasks.open-count' | translate: {count: tasks.summary.open_incidents}) : ('tasks.none-open' | translate)"
              [labelTranslate]="false"
              size="s"
            />
          </div>
          <p class="layer-text">{{ 'tasks.incidents-description' | translate }}</p>
          <p class="layer-note">
            {{ 'tasks.recipients' | translate }}
            @if (tasks.scheduler.recipients.length > 0) {
              {{ tasks.scheduler.recipients.join(', ') }}
            } @else {
              <span class="problem">{{ 'tasks.recipients-none' | translate }}</span>
            }
          </p>
          <div class="test-email">
            <edas-input
              class="test-email-input"
              size="sm"
              type="email"
              iconStart="mail"
              placeholder="tasks.test-email-placeholder"
              [value]="testEmail()"
              [disabled]="busy()"
              (valueChange)="testEmail.set($event ?? '')"
            />
            <edas-button
              appearance="neutral"
              size="sm"
              icon="send"
              label="tasks.test-email"
              [hint]="'tasks.test-email-hint' | translate"
              [disabled]="busy() || testEmail().trim() === ''"
              (clicked)="sendTestEmail()"
            />
          </div>
        </div>

        <div class="ff-panel layer">
          <div class="layer-head">
            <h2 class="layer-title">{{ 'tasks.runs-24h' | translate }}</h2>
          </div>
          <dl class="figures figures--3">
            <div><dt>{{ 'enum.sync-status.success' | translate }}</dt><dd>{{ tasks.summary.runs_24h.success }}</dd></div>
            <div><dt>{{ 'enum.sync-status.partial' | translate }}</dt><dd [class.warn]="tasks.summary.runs_24h.partial > 0">{{ tasks.summary.runs_24h.partial }}</dd></div>
            <div><dt>{{ 'enum.sync-status.failed' | translate }}</dt><dd [class.problem]="tasks.summary.runs_24h.failed > 0">{{ tasks.summary.runs_24h.failed }}</dd></div>
          </dl>
        </div>
      </div>

      <div class="block">
        <div class="block-head">
          <h2 class="block-title">{{ 'tasks.incidents-title' | translate }}</h2>
          @if (tasks.resolved.length > 0) {
            <edas-button
              appearance="flat"
              size="sm"
              [icon]="showResolved() ? 'eye-off' : 'history'"
              [label]="(showResolved() ? 'tasks.hide-resolved' : 'tasks.show-resolved') | translate: {count: tasks.resolved.length}"
              [labelTranslate]="false"
              (clicked)="showResolved.set(!showResolved())"
            />
          }
        </div>

        @for (incident of tasks.incidents; track incident.id) {
          <div class="ff-panel incident" [class.incident--error]="incident.severity === 'error'" [class.incident--warning]="incident.severity === 'warning'">
            <div class="incident-head">
              <div class="incident-labels">
                <edas-badge [appearance]="incident.severity === 'error' ? 'danger' : 'warning'" [icon]="incident.severity === 'error' ? 'octagon-alert' : 'triangle-alert'" [label]="'tasks.severity-' + incident.severity" size="s"/>
                <edas-badge appearance="neutral" [label]="'tasks.kind-' + incident.kind" size="s"/>
                @if (incident.occurrences > 1) {
                  <span class="incident-meta">{{ 'tasks.occurrences' | translate: {count: incident.occurrences} }}</span>
                }
              </div>
              <edas-button
                appearance="neutral"
                size="xs"
                icon="check"
                label="tasks.close-incident"
                [disabled]="busy()"
                (clicked)="confirmClose(incident)"
              />
            </div>
            <h3 class="incident-title">{{ incident.title }}</h3>
            @if (incident.message) {
              <p class="incident-message">{{ incident.message }}</p>
            }
            @if (incident.errors.length > 0) {
              <ul class="incident-errors">
                @for (error of incident.errors.slice(0, 5); track $index) {
                  <li>{{ error }}</li>
                }
              </ul>
            }
            <p class="incident-meta">
              {{ 'tasks.first-seen' | translate }} {{ incident.first_seen_at | localizedDate: 'd MMM y, HH:mm' }}
              @if (incident.occurrences > 1) {
                · {{ 'tasks.last-seen' | translate }} {{ incident.last_seen_at | localizedDate: 'd MMM y, HH:mm' }}
              }
              · {{ (incident.notified_at ? 'tasks.notified' : 'tasks.not-notified') | translate }}
              @if (incident.competition; as competition) {
                · <a class="link" href="" (click)="openSync(competition.id); $event.preventDefault()">{{ competition.name }}</a>
              }
            </p>
          </div>
        } @empty {
          <p class="empty">{{ 'tasks.no-open-incidents' | translate }}</p>
        }

        @if (showResolved()) {
          @for (incident of tasks.resolved; track incident.id) {
            <div class="ff-panel incident incident--resolved">
              <div class="incident-head">
                <div class="incident-labels">
                  <edas-badge appearance="success" icon="check-circle" label="tasks.status-resolved" size="s"/>
                  <edas-badge appearance="neutral" [label]="'tasks.kind-' + incident.kind" size="s"/>
                </div>
              </div>
              <h3 class="incident-title">{{ incident.title }}</h3>
              <p class="incident-meta">
                {{ 'tasks.first-seen' | translate }} {{ incident.first_seen_at | localizedDate: 'd MMM y, HH:mm' }}
                · {{ 'tasks.resolved-at' | translate }} {{ incident.resolved_at | localizedDate: 'd MMM y, HH:mm' }}
                · {{ incident.resolved_by ? ('tasks.resolved-by' | translate: {name: incident.resolved_by.name}) : ('tasks.resolved-auto' | translate) }}
                @if (incident.occurrences > 1) {
                  · {{ 'tasks.occurrences' | translate: {count: incident.occurrences} }}
                }
              </p>
            </div>
          }
        }
      </div>

      <div class="block">
        <h2 class="block-title">{{ 'tasks.tasks-title' | translate }}</h2>
        <edas-list
          [component]="taskCard"
          [items]="tasks.tasks"
          [itemsOptions]="taskListOptions"
          [filters]="taskFilters"
          [columns]="taskColumns"
          viewMode="table"
          orderBy=""
          filtersStorageKey="tasks"
          (rowClick)="openSync($event.competition.id)"
        />
      </div>

      <div class="block">
        <h2 class="block-title">{{ 'tasks.runs-title' | translate }}</h2>
        @if (tasks.runs.length > 0) {
          <div class="ff-panel ff-panel--scroll">
            <table class="ff-table">
              <thead>
                <tr>
                  <th scope="col">{{ 'tasks.when' | translate }}</th>
                  <th scope="col">{{ 'tasks.competition' | translate }}</th>
                  <th scope="col">{{ 'tasks.type' | translate }}</th>
                  <th scope="col">{{ 'tasks.provider' | translate }}</th>
                  <th scope="col">{{ 'common.status' | translate }}</th>
                  <th scope="col">{{ 'tasks.result' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (run of tasks.runs; track run.id) {
                  <tr>
                    <td class="nowrap">{{ (run.started_at ?? run.finished_at) | localizedDate: 'd MMM, HH:mm' }}</td>
                    <td>{{ run.competition?.name ?? '—' }}</td>
                    <td>{{ 'enum.sync-type.' + run.data_type | translate }}</td>
                    <td>{{ run.provider.name }}</td>
                    <td>
                      <edas-badge [appearance]="tone(run.status)" [icon]="icon(run.status)" [label]="'enum.sync-status.' + run.status" size="s"/>
                    </td>
                    <td class="message">
                      {{ run.message }}
                      <span class="muted">· {{ 'enum.sync-trigger.' + run.triggered_by | translate }}@if (run.user) { · {{ run.user.name }}}</span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="empty">{{ 'tasks.no-runs' | translate }}</p>
        }
      </div>
    } @else if (failed()) {
      <edas-app-card icon="cloud-off" [iconSize]="48" [title]="'tasks.load-error' | translate" [description]="'tasks.load-error-description' | translate"/>
    } @else {
      <edas-loader/>
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-6);
      width: 100%;
    }

    h2,
    h3,
    p,
    dl,
    dd,
    ul {
      margin: 0;
    }

    .intro {
      max-width: 75ch;
      color: var(--edas-muted-text-color);
    }

    .layers {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: var(--edas-space-4);
    }

    .layer {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-3);
      padding: var(--edas-space-5);
    }

    .layer-head,
    .block-head,
    .incident-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: var(--edas-space-2) var(--edas-space-4);
    }

    .layer-title,
    .block-title {
      font-size: 1rem;
      font-weight: 700;
    }

    .layer-text {
      font-size: 0.875rem;
      color: var(--edas-muted-text-color);
    }

    .layer-note,
    .incident-meta,
    .muted {
      font-size: 0.8125rem;
      color: var(--edas-muted-text-color);
    }

    .layer-note code {
      font-size: 0.75rem;
    }

    .layer-note--problem,
    .problem {
      color: var(--edas-danger-color);
    }

    .warn {
      color: var(--edas-warning-color, #b45309);
    }

    .figures {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--edas-space-3);
    }

    .figures--3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .figures dt {
      font-size: 0.75rem;
      color: var(--edas-muted-text-color);
    }

    .figures dd {
      font-size: 1.125rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }

    .block {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-3);
    }

    .test-email {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: var(--edas-space-2);
      margin-top: auto;
    }

    .test-email-input {
      flex: 1;
      min-width: 12rem;
    }

    .incident {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-2);
      padding: var(--edas-space-4);
      border-left: 4px solid var(--edas-border-color);
    }

    .incident--error {
      border-left-color: var(--edas-danger-color);
    }

    .incident--warning {
      border-left-color: var(--edas-warning-color, #b45309);
    }

    .incident--resolved {
      opacity: 0.8;
    }

    .incident-labels {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--edas-space-2);
    }

    .incident-title {
      font-size: 0.9375rem;
      font-weight: 600;
    }

    .incident-message {
      font-size: 0.875rem;
      white-space: pre-line;
    }

    .incident-errors {
      padding-left: 1.25rem;
      font-size: 0.8125rem;
      color: var(--edas-muted-text-color);
    }

    .link {
      font-weight: 600;
      color: inherit;
    }

    .nowrap {
      white-space: nowrap;
    }

    .message {
      max-width: 36rem;
      white-space: normal;
    }

    .empty {
      color: var(--edas-muted-text-color);
    }

  `],
})
export class TasksScreenComponent implements OnInit {
  private readonly api = inject(TasksApiService);
  private readonly syncApi = inject(SyncApiService);
  private readonly session = inject(SessionService);
  private readonly stack = inject(ModalStackService);
  private readonly dialogs = inject(DialogService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly actionBar = inject(GlobalActionBarService);
  private readonly destroyRef = inject(DestroyRef);

  /** `null` mientras carga. */
  protected readonly state = signal<TasksState | null>(null);
  protected readonly failed = signal(false);
  protected readonly busy = signal(false);
  protected readonly showResolved = signal(false);
  /** A quién mandar el correo de prueba: por defecto, a quien mira. */
  protected readonly testEmail = signal(this.session.user()?.email ?? '');

  /** Exigida por `edas-list`; con la vista fija en tabla no se pinta. */
  protected readonly taskCard = TaskCompetitionCellComponent;
  protected readonly taskFilters = TASK_FILTERS;

  protected readonly taskColumns: readonly EdasListColumn<Task>[] = [
    {key: 'competition', label: 'tasks.competition', sortable: true, sticky: true, cell: TaskCompetitionCellComponent},
    {key: 'data_type', label: 'tasks.type', sortable: true, value: (task) => this.translate.instant('enum.sync-type.' + task.data_type)},
    {key: 'provider', label: 'tasks.provider', sortable: true, value: (task) => task.provider.name},
    {key: 'status', label: 'common.status', sortable: true, cell: TaskStatusCellComponent},
    {key: 'cadence', label: 'tasks.cadence', sortable: true, cell: TaskCadenceCellComponent, hideOn: 'mobile'},
    {key: 'last_run', label: 'tasks.last-run', sortable: true, cell: TaskLastRunCellComponent},
    {key: 'next_run', label: 'tasks.next-run', sortable: true, cell: TaskNextRunCellComponent},
    {
      key: 'actions',
      label: 'tasks.actions',
      align: 'end',
      cell: TaskActionsCellComponent,
      inputs: {busy: this.busy, run: (task: Task) => this.run(task), openSync: (task: Task) => this.openSync(task.competition.id)},
    },
  ];

  /** Buscador, filtro y orden de la tabla, en memoria: el estado llega entero. */
  protected readonly taskListOptions: EdasListMemoryOptions<Task> = {
    search: (task) => `${task.competition.name} ${task.provider.name} ${this.translate.instant('enum.sync-type.' + task.data_type)}`,
    filters: {
      status: (task, value) =>
        (value === 'failing' && (task.status === 'failed' || task.status === 'partial')) ||
        (value === 'active' && task.active) ||
        (value === 'inactive' && !task.active),
    },
    sort: {
      competition: (task) => task.competition.name,
      data_type: (task) => this.translate.instant('enum.sync-type.' + task.data_type),
      provider: (task) => task.provider.name,
      status: (task) => STATUS_ORDER[task.status],
      cadence: (task) => task.interval,
      last_run: (task) => task.last_run?.finished_at,
      next_run: (task) => task.next_run_at,
    },
  };

  constructor() {
    this.actionBar.setActions([{id: 'refresh-tasks', labelKey: 'tasks.refresh', icon: 'refresh-cw', onClick: () => this.load()}]);
    this.destroyRef.onDestroy(() => this.actionBar.clear());
  }

  public ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.api
      .state()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (state) => {
          this.failed.set(false);
          this.state.set(state);
        },
        error: () => this.failed.set(true),
      });
  }

  /** Lanza ahora esa tarea (solo ese tipo de dato de esa competición). */
  protected run(task: Task): void {
    if (this.busy()) {
      return;
    }

    this.busy.set(true);

    this.syncApi
      .run(task.competition.id, {types: [task.data_type]})
      .pipe(
        finalize(() => this.busy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({background}) => {
          this.notifications.successKey(background ? 'tasks.run-started' : 'tasks.run-done');
          this.load();
        },
        // El aviso de error lo da el interceptor; el estado puede haber cambiado igualmente
        error: () => this.load(),
      });
  }

  /** Correo de prueba, en el acto: confirma que el transporte entrega, no solo que la cola acepta. */
  protected sendTestEmail(): void {
    const email = this.testEmail().trim();
    if (this.busy() || email === '') {
      return;
    }

    this.busy.set(true);

    this.api
      .sendTestEmail(email)
      .pipe(
        finalize(() => this.busy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({mailer}) => this.notifications.successKey('tasks.test-email-sent', {email, mailer}),
        // El motivo del fallo (el que da el proveedor) lo enseña el interceptor
        error: () => undefined,
      });
  }

  protected confirmClose(incident: Incident): void {
    this.dialogs
      .confirm({label: 'tasks.close-incident', message: 'tasks.close-confirm', confirmLabel: 'tasks.close-incident', cancelLabel: 'common.cancel'})
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.close(incident);
        }
      });
  }

  private close(incident: Incident): void {
    this.busy.set(true);

    this.api
      .resolve(incident.id)
      .pipe(
        finalize(() => this.busy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (state) => {
          this.state.set(state);
          this.notifications.successKey('tasks.closed');
        },
        error: () => this.load(),
      });
  }

  /** La pestaña Sincronización de la competición, donde se enciende, apaga o cambia la cadencia de cada fuente. */
  protected openSync(competitionId: number): void {
    this.stack.push({modalKey: 'competition', section: 'sync', id: String(competitionId)});
  }

  protected tone(status: TaskStatus): Tone {
    return TASK_STATUS_TONE[status];
  }

  protected icon(status: TaskStatus): string {
    return TASK_STATUS_ICON[status];
  }

  protected schedulerTone(state: TasksState): Tone {
    return state.scheduler.stalled ? 'danger' : 'success';
  }

  protected schedulerStatus(state: TasksState): string {
    if (!state.scheduler.stalled) {
      return 'tasks.scheduler-running';
    }

    return state.scheduler.last_tick_at ? 'tasks.scheduler-stalled' : 'tasks.scheduler-never-short';
  }
}
