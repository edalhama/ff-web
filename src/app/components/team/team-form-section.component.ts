import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal} from '@angular/core';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {ModalStackActionBarService} from '@edas/ng/navigation/modal-stack/modal-stack-action-bar.service';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {InputColorComponent} from '@edas/ng/wrapper/components/input-color/input-color.component';
import {InputComponent} from '@edas/ng/wrapper/components/input/input.component';
import {PickerComponent} from '@edas/ng/wrapper/components/picker/picker.component';
import {EdasPickerOption} from '@edas/ng/wrapper/components/picker/picker.types';
import {EdasProperty, PropertyListComponent} from '@edas/ng/wrapper/components/property-list/property-list.component';
import {SwitchComponent} from '@edas/ng/wrapper/components/switch/switch.component';
import {NotificationService} from '@edas/ng/wrapper/services/notification.service';
import {finalize} from 'rxjs';
import {changedFields, integerOrNull, textOrNull} from '../../shared/forms/form-values';
import {ServerErrors} from '../../shared/forms/server-errors';
import {hasPrimaryName, textInputsOf, TextInputsByLanguage, translationsChanges} from '../../shared/forms/translations';
import {Gender, GENDERS, TEAM_TYPES, TeamType} from '../../shared/models/competition';
import {Team, TeamPayload} from '../../shared/models/team';
import {CountryApiService} from '../../shared/services/api/country-api.service';
import {TeamApiService} from '../../shared/services/api/team-api.service';
import {LockedFieldsComponent} from '../shared/locked-fields.component';
import {TranslationFieldsComponent} from '../shared/translation-fields.component';

const SECTION_KEY = 'edit';

/** Campos comunes a todos los idiomas, como están en los controles. */
interface General {
  type: TeamType;
  gender: Gender;
  country_id: number | null;
  code: string;
  founded_year: string;
  primary_color: string;
  active: boolean;
}

function generalOf(team: Team): General {
  return {
    type: team.type,
    gender: team.gender,
    country_id: team.country_id,
    code: team.code ?? '',
    founded_year: team.founded_year != null ? String(team.founded_year) : '',
    primary_color: team.primary_color ?? '',
    active: team.active,
  };
}

/**
 * Ficha de un equipo (sección `edit` del modal `team`). Sirve sobre todo para corregir lo
 * que llega de los proveedores: los nombres vienen en inglés y sin tildes.
 *
 * Como en la competición, solo se envía lo que cambia, y lo que se cambia queda protegido
 * frente a la sincronización. Los textos no necesitan protección: la sincronización nunca
 * toca los de un equipo que ya existe.
 */
@Component({
  selector: 'app-team-form-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AppCardComponent,
    InputColorComponent,
    InputComponent,
    LockedFieldsComponent,
    PickerComponent,
    PropertyListComponent,
    SwitchComponent,
    TranslatePipe,
    TranslationFieldsComponent,
  ],
  template: `
    @if (data(); as team) {
      @if (general(); as form) {
      <div class="form">
        <app-translation-fields [texts]="texts()" [errors]="errors" [editing]="true" (textsChange)="setTexts($event)"/>

        <div class="form-block">
          <h3 class="form-title">{{ 'team.section-general' | translate }}</h3>

          <div class="grid-columns">
            <edas-input
              label="team.code"
              [value]="form.code"
              hint="team.code-hint"
              [invalid]="errors.has('code')"
              [errorText]="errors.errorText('code')"
              (valueChange)="setGeneral('code', $event)"
            />

            <edas-picker
              label="team.country"
              [items]="countryOptions()"
              [value]="form.country_id"
              [labelTranslate]="false"
              [clearable]="true"
              [searchable]="true"
              [invalid]="errors.has('country_id')"
              [errorText]="errors.errorText('country_id')"
              (valueChange)="setGeneral('country_id', $event ?? null)"
            />

            <edas-input
              label="team.founded"
              type="number"
              [value]="form.founded_year"
              [invalid]="errors.has('founded_year')"
              [errorText]="errors.errorText('founded_year')"
              (valueChange)="setGeneral('founded_year', $event)"
            />

            <edas-input-color
              label="team.primary-color"
              [value]="form.primary_color"
              hint="team.primary-color-hint"
              [cleaner]="true"
              [invalid]="errors.has('primary_color')"
              [errorText]="errors.errorText('primary_color')"
              (valueChange)="setGeneral('primary_color', $event)"
            />

            <edas-picker
              label="team.type"
              [items]="typeOptions"
              [value]="form.type"
              [required]="true"
              [invalid]="errors.has('type')"
              [errorText]="errors.errorText('type')"
              (valueChange)="setGeneral('type', $event)"
            />

            <edas-picker
              label="team.gender"
              [items]="genderOptions"
              [value]="form.gender"
              [required]="true"
              [invalid]="errors.has('gender')"
              [errorText]="errors.errorText('gender')"
              (valueChange)="setGeneral('gender', $event)"
            />
          </div>

          <edas-app-card
            icon="power"
            [iconSize]="48"
            [title]="'common.status' | translate"
            [description]="(form.active ? 'team.active-description' : 'team.inactive-description') | translate"
          >
            <edas-switch
              appCardTrailing
              [checked]="form.active"
              [ariaLabel]="'common.status' | translate"
              [labelTranslate]="false"
              (checkedChange)="setGeneral('active', $event)"
            />
          </edas-app-card>
        </div>

        <app-locked-fields
          labelPrefix="team.field"
          [fields]="team.locked_fields"
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
export class TeamFormSectionComponent implements OnInit {
  /** Equipo a editar; lo carga el modal por el id de la capa. */
  public readonly data = input<Team>();

  private readonly teamApi = inject(TeamApiService);
  private readonly countryApi = inject(CountryApiService);
  private readonly stack = inject(ModalStackService);
  private readonly actionBar = inject(ModalStackActionBarService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly errors = new ServerErrors(this.translate);

  protected readonly texts = signal<TextInputsByLanguage>(textInputsOf());
  /** Null hasta que llega el equipo. */
  protected readonly general = signal<General | null>(null);
  /** Campos protegidos que se devolverán a la sincronización al guardar. */
  protected readonly unlock = signal<string[]>([]);
  private readonly busy = signal(false);

  /** Punto de partida, para enviar solo lo que cambia. */
  private originalTexts: TextInputsByLanguage = this.texts();
  private originalGeneral: General | null = null;

  private readonly countries = toSignal(this.countryApi.list(), {initialValue: []});

  protected readonly countryOptions = computed<EdasPickerOption<number>[]>(() =>
    this.countries().map((country) => ({value: country.id, label: country.name, description: country.code})),
  );

  protected readonly typeOptions: readonly EdasPickerOption[] = TEAM_TYPES.map((type) => ({
    value: type,
    label: `enum.team-type.${type}`,
  }));
  protected readonly genderOptions: readonly EdasPickerOption[] = GENDERS.map((gender) => ({
    value: gender,
    label: `enum.gender.${gender}`,
  }));

  /** Estadio y con qué id lo conoce cada proveedor: informativo, no se edita aquí. */
  protected readonly sourceProperties = computed<EdasProperty[]>(() => {
    const team = this.data();
    const venue = team?.venue;

    return [
      {label: 'team.venue', value: venue ? [venue.name, venue.city].filter(Boolean).join(' · ') : null, wide: true},
      ...(team?.providers ?? []).map((provider) => ({label: provider.name, value: provider.external_id})),
    ];
  });

  public ngOnInit(): void {
    const team = this.data();
    if (!team) {
      return;
    }

    this.originalTexts = textInputsOf(team.translations);
    this.originalGeneral = generalOf(team);
    this.texts.set(this.originalTexts);
    this.general.set(this.originalGeneral);

    this.actionBar.register(SECTION_KEY, [
      {id: 'save', labelKey: 'common.save', icon: 'save', disabled: () => !this.canSave(), onClick: () => this.save()},
    ]);
    this.destroyRef.onDestroy(() => this.actionBar.unregister(SECTION_KEY));
  }

  protected setTexts(texts: TextInputsByLanguage): void {
    this.texts.set(texts);
    this.actionBar.refresh();
  }

  protected setGeneral<K extends keyof General>(name: K, value: General[K]): void {
    this.general.update((general) => general && {...general, [name]: value});
    this.errors.clear(name);
    this.actionBar.refresh();
  }

  protected setUnlock(fields: string[]): void {
    this.unlock.set(fields);
    this.actionBar.refresh();
  }

  private canSave(): boolean {
    return !this.busy() && hasPrimaryName(this.texts()) && Object.keys(this.changes()).length > 0;
  }

  /** Valores como los espera la API. */
  private values(general: General): TeamPayload {
    return {
      type: general.type,
      gender: general.gender,
      country_id: general.country_id,
      code: textOrNull(general.code),
      founded_year: integerOrNull(general.founded_year) as number | null,
      primary_color: textOrNull(general.primary_color),
      active: general.active,
    };
  }

  /** Cuerpo de la petición: solo lo modificado. */
  private changes(): TeamPayload {
    const general = this.general();

    if (!general || !this.originalGeneral) {
      return {};
    }

    const payload: TeamPayload = changedFields(this.values(this.originalGeneral), this.values(general));
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
    const team = this.data();
    if (!team || !this.canSave()) {
      return;
    }

    this.errors.clear();
    this.setBusy(true);

    this.teamApi
      .update(team.id, this.changes())
      .pipe(
        finalize(() => this.setBusy(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.notifications.successKey('team.updated');
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
