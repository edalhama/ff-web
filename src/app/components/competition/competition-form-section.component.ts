import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal} from '@angular/core';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {ModalStackActionBarService} from '@edas/ng/navigation/modal-stack/modal-stack-action-bar.service';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {InputComponent} from '@edas/ng/wrapper/components/input/input.component';
import {PickerComponent} from '@edas/ng/wrapper/components/picker/picker.component';
import {EdasPickerOption} from '@edas/ng/wrapper/components/picker/picker.types';
import {SwitchComponent} from '@edas/ng/wrapper/components/switch/switch.component';
import {DialogService} from '@edas/ng/wrapper/services/dialog.service';
import {NotificationService} from '@edas/ng/wrapper/services/notification.service';
import {finalize} from 'rxjs';
import {changedFields, integerOrNull} from '../../shared/forms/form-values';
import {ServerErrors} from '../../shared/forms/server-errors';
import {hasPrimaryName, textInputsOf, TextInputsByLanguage, translationsChanges, translationsPayload} from '../../shared/forms/translations';
import {
  Competition,
  COMPETITION_TYPES,
  CompetitionPayload,
  CompetitionType,
  Gender,
  GENDERS,
  TEAM_TYPES,
  TeamType,
} from '../../shared/models/competition';
import {CompetitionApiService} from '../../shared/services/api/competition-api.service';
import {CountryApiService} from '../../shared/services/api/country-api.service';
import {LockedFieldsComponent} from '../shared/locked-fields.component';
import {TranslationFieldsComponent} from '../shared/translation-fields.component';

/** Campos comunes a todos los idiomas, como están en los controles. */
interface General {
  type: CompetitionType;
  team_type: TeamType;
  gender: Gender;
  country_id: number | null;
  tier: string;
  position: string;
  active: boolean;
}

function generalOf(competition: Competition | undefined): General {
  return {
    type: competition?.type ?? 'league',
    team_type: competition?.team_type ?? 'club',
    gender: competition?.gender ?? 'male',
    country_id: competition?.country_id ?? null,
    tier: competition?.tier != null ? String(competition.tier) : '',
    position: competition ? String(competition.position) : '',
    active: competition?.active ?? true,
  };
}

/**
 * Formulario de competición: alta (sección `new`) y edición (sección `edit`) del modal
 * `competition`.
 *
 * Los textos van por idioma, en pestañas; el resto de datos son comunes. En la edición solo se
 * envía lo que ha cambiado: la API bloquea frente a la sincronización los campos que recibe
 * modificados, y aquí mismo se pueden desbloquear.
 */
@Component({
  selector: 'app-competition-form-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AppCardComponent,
    InputComponent,
    LockedFieldsComponent,
    PickerComponent,
    SwitchComponent,
    TranslatePipe,
    TranslationFieldsComponent,
  ],
  template: `
    <div class="form">
      <app-translation-fields [texts]="texts()" [errors]="errors" [editing]="!!data()" (textsChange)="setTexts($event)"/>

      <div class="form-block">
        <h3 class="form-title">{{ 'competition.section-general' | translate }}</h3>

        <div class="grid-columns">
          <edas-picker
            label="competition.type"
            [items]="typeOptions"
            [value]="general().type"
            [required]="true"
            [invalid]="errors.has('type')"
            [errorText]="errors.errorText('type')"
            (valueChange)="setGeneral('type', $event)"
          />

          <edas-picker
            label="competition.team-type"
            [items]="teamTypeOptions"
            [value]="general().team_type"
            [required]="true"
            [invalid]="errors.has('team_type')"
            [errorText]="errors.errorText('team_type')"
            (valueChange)="setGeneral('team_type', $event)"
          />

          <edas-picker
            label="competition.gender"
            [items]="genderOptions"
            [value]="general().gender"
            [required]="true"
            [invalid]="errors.has('gender')"
            [errorText]="errors.errorText('gender')"
            (valueChange)="setGeneral('gender', $event)"
          />

          <edas-picker
            label="competition.country"
            placeholder="competition.international"
            hint="competition.country-hint"
            [items]="countryOptions()"
            [value]="general().country_id"
            [labelTranslate]="false"
            [clearable]="true"
            [searchable]="true"
            [invalid]="errors.has('country_id')"
            [errorText]="errors.errorText('country_id')"
            (valueChange)="setGeneral('country_id', $event ?? null)"
          />

          <edas-input
            label="competition.tier"
            type="number"
            [value]="general().tier"
            hint="competition.tier-hint"
            [invalid]="errors.has('tier')"
            [errorText]="errors.errorText('tier')"
            (valueChange)="setGeneral('tier', $event)"
          />

          <edas-input
            label="competition.position"
            type="number"
            [value]="general().position"
            hint="competition.position-hint"
            [invalid]="errors.has('position')"
            [errorText]="errors.errorText('position')"
            (valueChange)="setGeneral('position', $event)"
          />
        </div>

        <edas-app-card
          icon="power"
          [iconSize]="48"
          [title]="'common.status' | translate"
          [description]="(general().active ? 'competition.active-description' : 'competition.inactive-description') | translate"
        >
          <edas-switch
            appCardTrailing
            [checked]="general().active"
            [ariaLabel]="'common.status' | translate"
            [labelTranslate]="false"
            (checkedChange)="setGeneral('active', $event)"
          />
        </edas-app-card>
      </div>

      @if (data(); as competition) {
        <app-locked-fields
          labelPrefix="competition.field"
          [fields]="competition.locked_fields"
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
export class CompetitionFormSectionComponent implements OnInit {
  /** Competición a editar; la carga el modal por el id de la capa. Sin ella, es un alta. */
  public readonly data = input<Competition>();

  private readonly competitionApi = inject(CompetitionApiService);
  private readonly countryApi = inject(CountryApiService);
  private readonly stack = inject(ModalStackService);
  private readonly actionBar = inject(ModalStackActionBarService);
  private readonly notifications = inject(NotificationService);
  private readonly dialogs = inject(DialogService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly errors = new ServerErrors(inject(TranslateService));

  protected readonly texts = signal<TextInputsByLanguage>(textInputsOf());
  protected readonly general = signal<General>(generalOf(undefined));
  /** Campos bloqueados que se devolverán a la sincronización al guardar. */
  protected readonly unlock = signal<string[]>([]);
  private readonly busy = signal(false);

  /** Punto de partida de la edición, para enviar solo lo que cambia. */
  private originalTexts: TextInputsByLanguage = this.texts();
  private originalGeneral: General = this.general();

  private readonly countries = toSignal(this.countryApi.list(), {initialValue: []});

  protected readonly countryOptions = computed<EdasPickerOption<number>[]>(() =>
    this.countries().map((country) => ({value: country.id, label: country.name, description: country.code})),
  );

  protected readonly typeOptions: readonly EdasPickerOption[] = COMPETITION_TYPES.map((type) => ({
    value: type,
    label: `enum.competition-type.${type}`,
  }));
  protected readonly teamTypeOptions: readonly EdasPickerOption[] = TEAM_TYPES.map((type) => ({
    value: type,
    label: `enum.team-type.${type}`,
  }));
  protected readonly genderOptions: readonly EdasPickerOption[] = GENDERS.map((gender) => ({
    value: gender,
    label: `enum.gender.${gender}`,
  }));

  private get sectionKey(): string {
    return this.data() ? 'edit' : 'new';
  }

  public ngOnInit(): void {
    const competition = this.data();

    if (competition) {
      this.originalTexts = textInputsOf(competition.translations);
      this.originalGeneral = generalOf(competition);
      this.texts.set(this.originalTexts);
      this.general.set(this.originalGeneral);
    }

    this.registerActions();
    this.destroyRef.onDestroy(() => this.actionBar.unregister(this.sectionKey));
  }

  protected setTexts(texts: TextInputsByLanguage): void {
    this.texts.set(texts);
    this.actionBar.refresh();
  }

  protected setGeneral<K extends keyof General>(name: K, value: General[K]): void {
    this.general.update((general) => ({...general, [name]: value}));
    this.errors.clear(name);
    this.actionBar.refresh();
  }

  protected setUnlock(fields: string[]): void {
    this.unlock.set(fields);
    this.actionBar.refresh();
  }

  private canSave(): boolean {
    if (this.busy() || !hasPrimaryName(this.texts())) {
      return false;
    }
    return !this.data() || Object.keys(this.changes()).length > 0;
  }

  /** Cuerpo de la petición: todo en un alta, solo lo modificado en una edición. */
  private changes(): CompetitionPayload {
    const general = this.general();
    const values = {
      type: general.type,
      team_type: general.team_type,
      gender: general.gender,
      country_id: general.country_id,
      tier: integerOrNull(general.tier) as number | null,
      position: integerOrNull(general.position) as number,
      active: general.active,
    };

    if (!this.data()) {
      const payload: CompetitionPayload = {...values, translations: translationsPayload(this.texts())};

      // Sin orden, la API pone el suyo por defecto
      if (values.position === null) {
        delete payload.position;
      }

      return payload;
    }

    const original = generalOf(this.data());
    const payload: CompetitionPayload = changedFields(
      {...original, tier: integerOrNull(original.tier) as number | null, position: integerOrNull(original.position) as number},
      values,
    );

    const translations = translationsChanges(this.originalTexts, this.texts());

    if (translations) {
      payload.translations = translations;
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

    const competition = this.data();
    const payload = this.changes();

    this.errors.clear();
    this.setBusy(true);

    const request$ = competition ? this.competitionApi.update(competition.id, payload) : this.competitionApi.create(payload);

    request$
      .pipe(
        finalize(() => this.setBusy(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (saved) => {
          if (competition) {
            this.notifications.successKey('competition.updated');
            this.stack.pop();
          } else {
            // De la ficha recién creada lo siguiente es darle su primera temporada
            this.notifications.successKey('competition.created');
            this.stack.replaceTop({modalKey: 'competition', section: 'seasons', id: String(saved.id)});
          }
        },
        error: (error) => this.errors.capture(error),
      });
  }

  private confirmRemove(): void {
    const competition = this.data();
    if (!competition || this.busy()) {
      return;
    }

    this.dialogs
      .confirm({label: 'competition.delete', message: 'competition.delete-confirm', confirmLabel: 'common.delete', cancelLabel: 'common.cancel'})
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.remove(competition);
        }
      });
  }

  private remove(competition: Competition): void {
    this.setBusy(true);

    this.competitionApi
      .remove(competition.id)
      .pipe(
        finalize(() => this.setBusy(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.notifications.successKey('competition.deleted');
          this.stack.pop();
        },
        // El motivo (p. ej. que tiene temporadas) ya lo enseña el interceptor
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
