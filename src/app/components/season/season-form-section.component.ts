import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, input, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {ModalStackActionBarService} from '@edas/ng/navigation/modal-stack/modal-stack-action-bar.service';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {InputDateComponent} from '@edas/ng/wrapper/components/input-date/input-date.component';
import {InputComponent} from '@edas/ng/wrapper/components/input/input.component';
import {PickerComponent} from '@edas/ng/wrapper/components/picker/picker.component';
import {EdasPickerOption} from '@edas/ng/wrapper/components/picker/picker.types';
import {SwitchComponent} from '@edas/ng/wrapper/components/switch/switch.component';
import {DialogService} from '@edas/ng/wrapper/services/dialog.service';
import {NotificationService} from '@edas/ng/wrapper/services/notification.service';
import {finalize} from 'rxjs';
import {changedFields, integerOrNull, textOrNull} from '../../shared/forms/form-values';
import {ServerErrors} from '../../shared/forms/server-errors';
import {Competition} from '../../shared/models/competition';
import {Season, SEASON_STATUSES, SeasonPayload, SeasonStatus} from '../../shared/models/season';
import {SeasonApiService} from '../../shared/services/api/season-api.service';
import {LockedFieldsComponent} from '../shared/locked-fields.component';

/** Campos del formulario tal como están en los controles. */
interface Fields {
  label: string;
  slug: string;
  start_year: string;
  starts_on: string;
  ends_on: string;
  status: SeasonStatus;
  is_current: boolean;
}

function fieldsOf(season: Season | undefined): Fields {
  return {
    label: season?.label ?? '',
    slug: season?.slug ?? '',
    start_year: season ? String(season.start_year) : '',
    starts_on: season?.starts_on ?? '',
    ends_on: season?.ends_on ?? '',
    status: season?.status ?? 'upcoming',
    is_current: season?.is_current ?? false,
  };
}

/** Año con el que empieza una etiqueta: `2026/27` → `2026`. */
function yearOfLabel(label: string): string {
  return /^\s*(\d{4})/.exec(label)?.[1] ?? '';
}

/**
 * Formulario de temporada. Sirve a dos modales: `season-new` (alta dentro de una competición,
 * que llega por el input `competition`) y `season` (edición, la temporada llega por `data`).
 * Como en la competición, al editar solo se envía lo que cambia.
 */
@Component({
  selector: 'app-season-form-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, InputComponent, InputDateComponent, LockedFieldsComponent, PickerComponent, SwitchComponent, TranslatePipe],
  template: `
    <div class="form">
      <div class="grid-columns">
        <edas-input
          label="season.label"
          [value]="fields().label"
          [required]="true"
          hint="season.label-hint"
          [invalid]="errors.has('label')"
          [errorText]="errors.errorText('label')"
          (valueChange)="setLabel($event)"
        />

        <edas-input
          label="season.start-year"
          type="number"
          [value]="fields().start_year"
          [required]="true"
          hint="season.start-year-hint"
          [invalid]="errors.has('start_year')"
          [errorText]="errors.errorText('start_year')"
          (valueChange)="setStartYear($event)"
        />

        <edas-input
          label="season.slug"
          [value]="fields().slug"
          [hint]="data() ? 'season.slug-hint-edit' : 'season.slug-hint-new'"
          [invalid]="errors.has('slug')"
          [errorText]="errors.errorText('slug')"
          (valueChange)="set('slug', $event)"
        />

        <edas-input-date
          label="season.starts-on"
          [value]="fields().starts_on"
          [max]="fields().ends_on || null"
          [cleaner]="true"
          [invalid]="errors.has('starts_on')"
          [errorText]="errors.errorText('starts_on')"
          (valueChange)="set('starts_on', $event)"
        />

        <edas-input-date
          label="season.ends-on"
          [value]="fields().ends_on"
          [min]="fields().starts_on || null"
          [cleaner]="true"
          [invalid]="errors.has('ends_on')"
          [errorText]="errors.errorText('ends_on')"
          (valueChange)="set('ends_on', $event)"
        />

        <edas-picker
          label="season.status"
          [items]="statusOptions"
          [value]="fields().status"
          [required]="true"
          [invalid]="errors.has('status')"
          [errorText]="errors.errorText('status')"
          (valueChange)="set('status', $event)"
        />
      </div>

      <edas-app-card
        icon="calendar-check"
        [iconSize]="48"
        [title]="'season.is-current' | translate"
        [description]="(fields().is_current ? 'season.is-current-on' : 'season.is-current-off') | translate"
      >
        <edas-switch
          appCardTrailing
          [checked]="fields().is_current"
          [ariaLabel]="'season.is-current' | translate"
          [labelTranslate]="false"
          (checkedChange)="set('is_current', $event)"
        />
      </edas-app-card>

      @if (data(); as season) {
        <app-locked-fields
          labelPrefix="season.field"
          [fields]="season.locked_fields"
          [unlocked]="unlock()"
          (unlockedChange)="setUnlock($event)"
        />
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .form {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-4);
    }
  `],
})
export class SeasonFormSectionComponent implements OnInit {
  /** Temporada a editar (modal `season`). */
  public readonly data = input<Season>();
  /** Competición a la que se añade la temporada (modal `season-new`). */
  public readonly competition = input<Competition>();

  private readonly seasonApi = inject(SeasonApiService);
  private readonly stack = inject(ModalStackService);
  private readonly actionBar = inject(ModalStackActionBarService);
  private readonly notifications = inject(NotificationService);
  private readonly dialogs = inject(DialogService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly errors = new ServerErrors(inject(TranslateService));

  protected readonly fields = signal<Fields>(fieldsOf(undefined));
  protected readonly unlock = signal<string[]>([]);
  private readonly busy = signal(false);

  /** En un alta el año acompaña a la etiqueta hasta que se escribe a mano. */
  private startYearTouched = false;

  protected readonly statusOptions: readonly EdasPickerOption[] = SEASON_STATUSES.map((status) => ({
    value: status,
    label: `enum.season-status.${status}`,
  }));

  private get sectionKey(): string {
    return this.data() ? 'edit' : 'new';
  }

  public ngOnInit(): void {
    const season = this.data();

    if (season) {
      this.fields.set(fieldsOf(season));
      this.startYearTouched = true;
    }

    this.registerActions();
    this.destroyRef.onDestroy(() => this.actionBar.unregister(this.sectionKey));
  }

  protected set<K extends keyof Fields>(name: K, value: Fields[K]): void {
    this.fields.update((fields) => ({...fields, [name]: value}));
    this.errors.clear(name);
    this.actionBar.refresh();
  }

  protected setLabel(label: string): void {
    this.set('label', label);

    if (!this.startYearTouched) {
      this.set('start_year', yearOfLabel(label));
    }
  }

  protected setStartYear(year: string): void {
    this.startYearTouched = true;
    this.set('start_year', year);
  }

  protected setUnlock(fields: string[]): void {
    this.unlock.set(fields);
    this.actionBar.refresh();
  }

  private canSave(): boolean {
    const fields = this.fields();

    if (this.busy() || fields.label.trim() === '' || fields.start_year.trim() === '') {
      return false;
    }
    return !this.data() || Object.keys(this.changes()).length > 0;
  }

  /** Valores como los espera la API. */
  private values(fields: Fields): SeasonPayload {
    return {
      label: fields.label.trim(),
      slug: fields.slug.trim(),
      start_year: integerOrNull(fields.start_year) as number,
      starts_on: textOrNull(fields.starts_on),
      ends_on: textOrNull(fields.ends_on),
      status: fields.status,
      is_current: fields.is_current,
    };
  }

  /** Cuerpo de la petición: todo en un alta, solo lo modificado en una edición. */
  private changes(): SeasonPayload {
    const values = this.values(this.fields());
    const season = this.data();

    if (!season) {
      // Sin slug, la API lo saca de la etiqueta
      if (!values.slug) {
        delete values.slug;
      }
      return values;
    }

    const payload = changedFields(this.values(fieldsOf(season)), values);

    // Un slug vaciado no se manda: la temporada conserva el suyo
    if ('slug' in payload && !payload.slug) {
      delete payload.slug;
    }

    if (this.unlock().length > 0) {
      payload.unlock_fields = this.unlock();
    }

    return payload;
  }

  private save(): void {
    if (!this.canSave()) {
      return;
    }

    const season = this.data();
    const competition = this.competition();
    const payload = this.changes();

    if (!season && !competition) {
      return;
    }

    this.errors.clear();
    this.setBusy(true);

    const request$ = season ? this.seasonApi.update(season.id, payload) : this.seasonApi.create(competition!.id, payload);

    request$
      .pipe(
        finalize(() => this.setBusy(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.notifications.successKey(season ? 'season.updated' : 'season.created');
          this.stack.pop();
        },
        error: (error) => this.errors.capture(error),
      });
  }

  private confirmRemove(): void {
    const season = this.data();
    if (!season || this.busy()) {
      return;
    }

    this.dialogs
      .confirm({label: 'season.delete', message: 'season.delete-confirm', confirmLabel: 'common.delete', cancelLabel: 'common.cancel'})
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.remove(season);
        }
      });
  }

  private remove(season: Season): void {
    this.setBusy(true);

    this.seasonApi
      .remove(season)
      .pipe(
        finalize(() => this.setBusy(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.notifications.successKey('season.deleted');
          this.stack.pop();
        },
        // El motivo (p. ej. que ya tiene partidos) lo enseña el interceptor
        error: () => undefined,
      });
  }

  private setBusy(busy: boolean): void {
    this.busy.set(busy);
    this.actionBar.refresh();
  }

  private registerActions(): void {
    const actions = [
      {
        id: 'save',
        labelKey: 'common.save',
        icon: 'save',
        disabled: () => !this.canSave(),
        onClick: () => this.save(),
      },
    ];

    if (this.data()) {
      actions.push({
        id: 'delete',
        labelKey: 'common.delete',
        icon: 'trash-2',
        disabled: () => this.busy(),
        onClick: () => this.confirmRemove(),
      });
    }

    this.actionBar.register(this.sectionKey, actions);
  }
}
