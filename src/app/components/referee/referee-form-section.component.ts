import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal} from '@angular/core';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {ModalStackActionBarService} from '@edas/ng/navigation/modal-stack/modal-stack-action-bar.service';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {InputDateComponent} from '@edas/ng/wrapper/components/input-date/input-date.component';
import {InputComponent} from '@edas/ng/wrapper/components/input/input.component';
import {PickerComponent} from '@edas/ng/wrapper/components/picker/picker.component';
import {EdasPickerOption} from '@edas/ng/wrapper/components/picker/picker.types';
import {EdasProperty, PropertyListComponent} from '@edas/ng/wrapper/components/property-list/property-list.component';
import {NotificationService} from '@edas/ng/wrapper/services/notification.service';
import {finalize} from 'rxjs';
import {changedFields, textOrNull} from '../../shared/forms/form-values';
import {ServerErrors} from '../../shared/forms/server-errors';
import {Referee, RefereePayload} from '../../shared/models/referee';
import {CountryApiService} from '../../shared/services/api/country-api.service';
import {RefereeApiService} from '../../shared/services/api/referee-api.service';
import {LockedFieldsComponent} from '../shared/locked-fields.component';

const SECTION_KEY = 'edit';

/** Campos como están en los controles. */
interface Fields {
  name: string;
  short_name: string;
  birth_date: string;
  birth_place: string;
  country_id: number | null;
}

function fieldsOf(referee: Referee): Fields {
  return {
    name: referee.name,
    short_name: referee.short_name ?? '',
    birth_date: referee.birth_date ?? '',
    birth_place: referee.birth_place ?? '',
    country_id: referee.country_id,
  };
}

/**
 * Ficha de un árbitro (sección `edit` del modal `referee`). Sirve para corregir lo que llega
 * de los proveedores: el nombre con el que se le conoce, su nacimiento y su país.
 *
 * Solo se envía lo que cambia, y lo que se cambia queda protegido frente a la sincronización.
 */
@Component({
  selector: 'app-referee-form-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, InputComponent, InputDateComponent, LockedFieldsComponent, PickerComponent, PropertyListComponent, TranslatePipe],
  template: `
    @if (data(); as referee) {
      @if (fields(); as form) {
      <div class="form">
        <div class="form-block">
          <h3 class="form-title">{{ 'referee.section-general' | translate }}</h3>

          <div class="grid-columns">
            <edas-input
              label="referee.name"
              [value]="form.name"
              [required]="true"
              [invalid]="errors.has('name')"
              [errorText]="errors.errorText('name')"
              (valueChange)="set('name', $event)"
            />

            <edas-input
              label="referee.short-name"
              [value]="form.short_name"
              hint="referee.short-name-hint"
              [invalid]="errors.has('short_name')"
              [errorText]="errors.errorText('short_name')"
              (valueChange)="set('short_name', $event)"
            />

            <edas-input-date
              label="referee.birth-date"
              [value]="form.birth_date"
              [cleaner]="true"
              [max]="today"
              [invalid]="errors.has('birth_date')"
              [errorText]="errors.errorText('birth_date')"
              (valueChange)="set('birth_date', $event)"
            />

            <edas-input
              label="referee.birth-place"
              [value]="form.birth_place"
              [invalid]="errors.has('birth_place')"
              [errorText]="errors.errorText('birth_place')"
              (valueChange)="set('birth_place', $event)"
            />

            <edas-picker
              label="referee.country"
              [items]="countryOptions()"
              [value]="form.country_id"
              [labelTranslate]="false"
              [clearable]="true"
              [searchable]="true"
              [invalid]="errors.has('country_id')"
              [errorText]="errors.errorText('country_id')"
              (valueChange)="set('country_id', $event ?? null)"
            />
          </div>
        </div>

        <app-locked-fields
          labelPrefix="referee.field"
          [fields]="referee.locked_fields"
          [unlocked]="unlock()"
          (unlockedChange)="setUnlock($event)"
        />

        <edas-app-card icon="database" [iconSize]="48" [title]="'team.source-title' | translate" [description]="'team.source-description' | translate">
          <edas-property-list [items]="sourceProperties()"/>
        </edas-app-card>
      </div>
      }
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .form,
    .form-block {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-4);
    }

    .form {
      gap: var(--edas-space-7);
    }

    .form-title {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }
  `],
})
export class RefereeFormSectionComponent implements OnInit {
  /** Árbitro a editar; lo carga el modal por el id de la capa. */
  public readonly data = input<Referee>();

  private readonly refereeApi = inject(RefereeApiService);
  private readonly countryApi = inject(CountryApiService);
  private readonly stack = inject(ModalStackService);
  private readonly actionBar = inject(ModalStackActionBarService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly errors = new ServerErrors(this.translate);
  protected readonly today = new Date().toISOString().slice(0, 10);

  /** Null hasta que llega el árbitro. */
  protected readonly fields = signal<Fields | null>(null);
  /** Campos protegidos que se devolverán a la sincronización al guardar. */
  protected readonly unlock = signal<string[]>([]);
  private readonly busy = signal(false);

  /** Punto de partida, para enviar solo lo que cambia. */
  private original: Fields | null = null;

  private readonly countries = toSignal(this.countryApi.list(), {initialValue: []});

  protected readonly countryOptions = computed<EdasPickerOption<number>[]>(() =>
    this.countries().map((country) => ({value: country.id, label: country.name, description: country.code})),
  );

  /** Partidos arbitrados y con qué id lo conoce cada proveedor: informativo, no se edita aquí. */
  protected readonly sourceProperties = computed<EdasProperty[]>(() => {
    const referee = this.data();
    // Lee el idioma activo (signal) para que las etiquetas cambien con él
    this.translate.currentLang();

    return [
      {label: 'referee.matches', value: referee?.designations_count ?? 0},
      ...(referee?.providers ?? []).map((provider) => ({label: provider.name, value: provider.external_id})),
    ];
  });

  public ngOnInit(): void {
    const referee = this.data();
    if (!referee) {
      return;
    }

    this.original = fieldsOf(referee);
    this.fields.set(this.original);

    this.actionBar.register(SECTION_KEY, [
      {id: 'save', labelKey: 'common.save', icon: 'save', disabled: () => !this.canSave(), onClick: () => this.save()},
    ]);
    this.destroyRef.onDestroy(() => this.actionBar.unregister(SECTION_KEY));
  }

  protected set<K extends keyof Fields>(name: K, value: Fields[K]): void {
    this.fields.update((fields) => fields && {...fields, [name]: value});
    this.errors.clear(name);
    this.actionBar.refresh();
  }

  protected setUnlock(fields: string[]): void {
    this.unlock.set(fields);
    this.actionBar.refresh();
  }

  private canSave(): boolean {
    return !this.busy() && (this.fields()?.name.trim() ?? '') !== '' && Object.keys(this.changes()).length > 0;
  }

  /** Valores como los espera la API. */
  private values(fields: Fields): RefereePayload {
    return {
      name: fields.name.trim(),
      short_name: textOrNull(fields.short_name),
      birth_date: textOrNull(fields.birth_date),
      birth_place: textOrNull(fields.birth_place),
      country_id: fields.country_id,
    };
  }

  /** Cuerpo de la petición: solo lo modificado. */
  private changes(): RefereePayload {
    const fields = this.fields();

    if (!fields || !this.original) {
      return {};
    }

    const payload: RefereePayload = changedFields(this.values(this.original), this.values(fields));

    if (this.unlock().length > 0) {
      payload.unlock_fields = this.unlock();
    }

    return payload;
  }

  private save(): void {
    const referee = this.data();
    if (!referee || !this.canSave()) {
      return;
    }

    this.errors.clear();
    this.setBusy(true);

    this.refereeApi
      .update(referee.id, this.changes())
      .pipe(
        finalize(() => this.setBusy(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.notifications.successKey('referee.updated');
          this.stack.pop();
        },
        error: (error) => this.errors.capture(error),
      });
  }

  private setBusy(busy: boolean): void {
    this.busy.set(busy);
    this.actionBar.refresh();
  }
}
