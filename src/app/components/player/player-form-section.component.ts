import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal} from '@angular/core';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {ModalStackActionBarService} from '@edas/ng/navigation/modal-stack/modal-stack-action-bar.service';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {ButtonComponent} from '@edas/ng/wrapper/components/button/button.component';
import {InputDateComponent} from '@edas/ng/wrapper/components/input-date/input-date.component';
import {InputComponent} from '@edas/ng/wrapper/components/input/input.component';
import {PickerComponent} from '@edas/ng/wrapper/components/picker/picker.component';
import {EdasPickerOption} from '@edas/ng/wrapper/components/picker/picker.types';
import {SwitchComponent} from '@edas/ng/wrapper/components/switch/switch.component';
import {NotificationService} from '@edas/ng/wrapper/services/notification.service';
import {finalize} from 'rxjs';
import {changedFields, integerOrNull, textOrNull} from '../../shared/forms/form-values';
import {ServerErrors} from '../../shared/forms/server-errors';
import {PLAYER_FEET, PLAYER_POSITIONS, PlayerCard, PlayerFoot, PlayerPayload, PlayerPosition} from '../../shared/models/player';
import {CountryApiService} from '../../shared/services/api/country-api.service';
import {PlayerApiService} from '../../shared/services/api/player-api.service';
import {LockedFieldsComponent} from '../shared/locked-fields.component';

const SECTION_KEY = 'edit';

/** Campos del formulario, como están en los controles. */
interface Fields {
  name: string;
  full_name: string;
  birth_date: string;
  country_id: number | null;
  second_country_id: number | null;
  height_cm: string;
  foot: PlayerFoot | null;
  position: PlayerPosition | null;
  retired: boolean;
}

function fieldsOf(player: PlayerCard): Fields {
  return {
    name: player.name,
    full_name: player.full_name ?? '',
    birth_date: player.birth_date ?? '',
    country_id: player.country_id,
    second_country_id: player.second_country_id,
    height_cm: player.height_cm != null ? String(player.height_cm) : '',
    foot: player.foot,
    position: player.position,
    retired: player.retired,
  };
}

/**
 * Ficha editable de un jugador (sección `edit` del modal `player`), para corregir lo que llega
 * de los proveedores. Como en los equipos, solo se envía lo que cambia, y lo que se cambia queda
 * protegido frente a la sincronización. El slug no se edita: se fija al crearlo.
 */
@Component({
  selector: 'app-player-form-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, ButtonComponent, InputComponent, InputDateComponent, LockedFieldsComponent, PickerComponent, SwitchComponent, TranslatePipe],
  template: `
    @if (data(); as player) {
      @if (fields(); as form) {
        <div class="form">
          @if (player.names.length > 0) {
            <div class="names">
              <span class="names-label">{{ 'player.names-from-providers' | translate }}</span>
              @for (each of player.names; track each.provider.code) {
                <edas-button
                  [appearance]="each.value === form.name ? 'primary' : 'neutral'"
                  emphasis="soft"
                  [label]="each.provider.name + ': ' + each.value"
                  [labelTranslate]="false"
                  [hint]="'player.use-this-name' | translate"
                  (clicked)="set('name', each.value)"
                />
              }
            </div>
          }

          <div class="form-block">
            <div class="grid-columns">
              <edas-input
                label="player.name"
                [value]="form.name"
                [required]="true"
                hint="player.name-hint"
                [invalid]="errors.has('name')"
                [errorText]="errors.errorText('name')"
                (valueChange)="set('name', $event)"
              />

              <edas-input
                label="player.full-name"
                [value]="form.full_name"
                [invalid]="errors.has('full_name')"
                [errorText]="errors.errorText('full_name')"
                (valueChange)="set('full_name', $event)"
              />

              <edas-input-date
                label="player.birth-date"
                [value]="form.birth_date"
                [cleaner]="true"
                [max]="today"
                [invalid]="errors.has('birth_date')"
                [errorText]="errors.errorText('birth_date')"
                (valueChange)="set('birth_date', $event)"
              />

              <edas-input
                label="player.height"
                type="number"
                [value]="form.height_cm"
                hint="player.height-hint"
                [invalid]="errors.has('height_cm')"
                [errorText]="errors.errorText('height_cm')"
                (valueChange)="set('height_cm', $event)"
              />

              <edas-picker
                label="team.squad-country"
                [items]="countryOptions()"
                [value]="form.country_id"
                [labelTranslate]="false"
                [clearable]="true"
                [searchable]="true"
                [invalid]="errors.has('country_id')"
                [errorText]="errors.errorText('country_id')"
                (valueChange)="set('country_id', $event ?? null)"
              />

              <edas-picker
                label="player.second-country"
                [items]="countryOptions()"
                [value]="form.second_country_id"
                [labelTranslate]="false"
                [clearable]="true"
                [searchable]="true"
                [invalid]="errors.has('second_country_id')"
                [errorText]="errors.errorText('second_country_id')"
                (valueChange)="set('second_country_id', $event ?? null)"
              />

              <edas-picker
                label="player.usual-position"
                [items]="positionOptions"
                [value]="form.position"
                [clearable]="true"
                [invalid]="errors.has('position')"
                [errorText]="errors.errorText('position')"
                (valueChange)="set('position', $event ?? null)"
              />

              <edas-picker
                label="player.foot"
                [items]="footOptions"
                [value]="form.foot"
                [clearable]="true"
                [invalid]="errors.has('foot')"
                [errorText]="errors.errorText('foot')"
                (valueChange)="set('foot', $event ?? null)"
              />
            </div>

            <edas-app-card
              icon="user-x"
              [iconSize]="48"
              [title]="'player.retired' | translate"
              [description]="'player.retired-description' | translate"
            >
              <edas-switch
                appCardTrailing
                [checked]="form.retired"
                [ariaLabel]="'player.retired' | translate"
                [labelTranslate]="false"
                (checkedChange)="set('retired', $event)"
              />
            </edas-app-card>
          </div>

          <app-locked-fields
            labelPrefix="player.field"
            [fields]="player.locked_fields"
            [unlocked]="unlock()"
            (unlockedChange)="setUnlock($event)"
          />
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

    .names {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--edas-space-2);
    }

    .names-label {
      font-size: 0.8125rem;
      color: var(--edas-muted-text-color);
    }
  `],
})
export class PlayerFormSectionComponent implements OnInit {
  /** Jugador a editar; lo carga el modal. */
  public readonly data = input<PlayerCard>();

  private readonly playerApi = inject(PlayerApiService);
  private readonly countryApi = inject(CountryApiService);
  private readonly stack = inject(ModalStackService);
  private readonly actionBar = inject(ModalStackActionBarService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly errors = new ServerErrors(this.translate);

  /** Null hasta que llega el jugador. */
  protected readonly fields = signal<Fields | null>(null);
  /** Campos protegidos que se devolverán a la sincronización al guardar. */
  protected readonly unlock = signal<string[]>([]);
  private readonly busy = signal(false);

  /** Punto de partida, para enviar solo lo que cambia. */
  private original: Fields | null = null;

  /** Una fecha de nacimiento no puede ser de hoy en adelante. */
  protected readonly today = new Date().toISOString().slice(0, 10);

  private readonly countries = toSignal(this.countryApi.list(), {initialValue: []});

  protected readonly countryOptions = computed<EdasPickerOption<number>[]>(() =>
    this.countries().map((country) => ({value: country.id, label: country.name, description: country.code})),
  );

  protected readonly positionOptions: readonly EdasPickerOption[] = PLAYER_POSITIONS.map((position) => ({
    value: position,
    label: `enum.player-position.${position}`,
  }));
  protected readonly footOptions: readonly EdasPickerOption[] = PLAYER_FEET.map((foot) => ({value: foot, label: `enum.foot.${foot}`}));

  public ngOnInit(): void {
    const player = this.data();
    if (!player) {
      return;
    }

    this.original = fieldsOf(player);
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
    const fields = this.fields();

    return !this.busy() && !!fields && fields.name.trim() !== '' && Object.keys(this.changes()).length > 0;
  }

  /** Valores como los espera la API. */
  private values(fields: Fields): PlayerPayload {
    return {
      name: fields.name.trim(),
      full_name: textOrNull(fields.full_name),
      birth_date: textOrNull(fields.birth_date),
      country_id: fields.country_id,
      second_country_id: fields.second_country_id,
      height_cm: integerOrNull(fields.height_cm) as number | null,
      foot: fields.foot,
      position: fields.position,
      retired: fields.retired,
    };
  }

  /** Cuerpo de la petición: solo lo modificado. */
  private changes(): PlayerPayload {
    const fields = this.fields();

    if (!fields || !this.original) {
      return {};
    }

    const payload: PlayerPayload = changedFields(this.values(this.original), this.values(fields));

    if (this.unlock().length > 0) {
      payload.unlock_fields = this.unlock();
    }

    return payload;
  }

  private save(): void {
    const player = this.data();
    if (!player || !this.canSave()) {
      return;
    }

    this.errors.clear();
    this.setBusy(true);

    this.playerApi
      .update(player.id, this.changes(), player.context_competition_id)
      .pipe(
        finalize(() => this.setBusy(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.notifications.successKey('player.updated');
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
