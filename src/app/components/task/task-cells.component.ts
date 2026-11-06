import {ChangeDetectionStrategy, Component, computed, inject, input, Signal} from '@angular/core';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {BadgeComponent} from '@edas/ng/wrapper/components/badge/badge.component';
import {ButtonComponent} from '@edas/ng/wrapper/components/button/button.component';
import {LocalizedDatePipe} from '@edas/ng/wrapper/pipes/localized-date.pipe';
import {Task, TaskStatus} from '../../shared/models/tasks';

/**
 * Celdas de la tabla de tareas (`<edas-list>` de la pantalla de tareas): cada una recibe la
 * tarea como input `data`.
 */

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export const TASK_STATUS_TONE: Record<TaskStatus, Tone> = {
  success: 'success',
  partial: 'warning',
  failed: 'danger',
  running: 'info',
  inactive: 'neutral',
  pending: 'neutral',
};

export const TASK_STATUS_ICON: Record<TaskStatus, string> = {
  success: 'check-circle',
  partial: 'triangle-alert',
  failed: 'x-circle',
  running: 'loader-circle',
  inactive: 'pause',
  pending: 'clock',
};

/** «Inactiva» y «Pendiente» son propias de las tareas; el resto, los estados de una ejecución. */
export function taskStatusLabel(status: TaskStatus): string {
  return status === 'inactive' || status === 'pending' ? `tasks.status-${status}` : `enum.sync-status.${status}`;
}

/** «6 h», «2 min · Directo»… la cadencia que aplica ahora; «—» si no está activa. */
export function taskCadence(task: Task, live: string): string {
  if (task.interval === null) {
    return '—';
  }

  const text = minutes(task.interval);

  return task.live && task.live_interval !== null && task.interval === task.live_interval ? `${text} · ${live}` : text;
}

function minutes(value: number): string {
  if (value < 60) {
    return `${value} min`;
  }
  if (value < 1440) {
    return `${Math.round(value / 60)} h`;
  }

  return `${Math.round(value / 1440)} d`;
}

/** Competición (atenuada si la tarea no está activa), con la marca de directo. */
@Component({
  selector: 'app-task-competition-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent],
  template: `
    @if (data(); as task) {
      <span class="name" [class.muted]="!task.active">{{ task.competition.name }}</span>
      @if (task.live) {
        <edas-badge class="live" appearance="danger" icon="radio" label="sync.live" size="s"/>
      }
    }
  `,
  styles: [`
    .name {
      font-weight: 600;
    }

    .muted {
      font-weight: 400;
      color: var(--edas-muted-text-color);
    }

    .live {
      margin-left: var(--edas-space-2);
    }
  `],
})
export class TaskCompetitionCellComponent {
  public readonly data = input<Task>();
}

@Component({
  selector: 'app-task-status-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent],
  template: `
    @if (data(); as task) {
      <edas-badge [appearance]="tone()" [icon]="icon()" [label]="label()" size="s"/>
    }
  `,
})
export class TaskStatusCellComponent {
  public readonly data = input<Task>();

  protected readonly tone = computed(() => TASK_STATUS_TONE[this.data()?.status ?? 'pending']);
  protected readonly icon = computed(() => TASK_STATUS_ICON[this.data()?.status ?? 'pending']);
  protected readonly label = computed(() => taskStatusLabel(this.data()?.status ?? 'pending'));
}

/** Cadencia; el asterisco marca la que se ha cambiado a mano en la fuente. */
@Component({
  selector: 'app-task-cadence-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    @if (data(); as task) {
      {{ cadence() }}
      @if (task.interval_minutes !== null) {
        <span class="muted" [title]="'tasks.custom-cadence' | translate">*</span>
      }
    }
  `,
  styles: [`
    .muted {
      color: var(--edas-muted-text-color);
    }
  `],
})
export class TaskCadenceCellComponent {
  public readonly data = input<Task>();

  private readonly translate = inject(TranslateService);

  protected readonly cadence = computed(() => {
    const task = this.data();

    return task ? taskCadence(task, this.translate.instant('sync.live')) : '';
  });
}

/** Fin de la última ejecución, con su mensaje como `title`. */
@Component({
  selector: 'app-task-last-run-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LocalizedDatePipe],
  template: `
    @if (data()?.last_run; as run) {
      <span [title]="run.message ?? ''">{{ run.finished_at | localizedDate: 'd MMM, HH:mm' }}</span>
    } @else {
      —
    }
  `,
})
export class TaskLastRunCellComponent {
  public readonly data = input<Task>();
}

@Component({
  selector: 'app-task-next-run-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LocalizedDatePipe],
  template: `
    @if (data()?.next_run_at; as at) {
      {{ at | localizedDate: 'd MMM, HH:mm' }}
    } @else {
      —
    }
  `,
})
export class TaskNextRunCellComponent {
  public readonly data = input<Task>();
}

/**
 * Lanzar ahora / abrir la sincronización. Los clics no suben a la fila (que también abre la
 * sincronización): así «Lanzar» no abre además el modal.
 */
@Component({
  selector: 'app-task-actions-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, TranslatePipe],
  host: {'(click)': '$event.stopPropagation()', '(keydown.enter)': '$event.stopPropagation()'},
  template: `
    @if (data(); as task) {
      <edas-button
        icon="play"
        appearance="flat"
        size="xs"
        [iconOnly]="true"
        [ariaLabel]="'tasks.run-now' | translate"
        [disabled]="busy()() || !task.active || task.status === 'running'"
        (clicked)="run()(task)"
      />
      <edas-button
        icon="settings-2"
        appearance="flat"
        size="xs"
        [iconOnly]="true"
        [ariaLabel]="'tasks.open-sync' | translate"
        (clicked)="openSync()(task)"
      />
    }
  `,
  styles: [`
    :host {
      display: inline-flex;
      gap: var(--edas-space-1);
    }
  `],
})
export class TaskActionsCellComponent {
  public readonly data = input<Task>();
  /** Hay una acción en curso en la pantalla: no se lanza otra. */
  public readonly busy = input.required<Signal<boolean>>();
  public readonly run = input.required<(task: Task) => void>();
  public readonly openSync = input.required<(task: Task) => void>();
}
