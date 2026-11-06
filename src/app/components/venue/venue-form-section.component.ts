import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal} from '@angular/core';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {ModalStackActionBarService} from '@edas/ng/navigation/modal-stack/modal-stack-action-bar.service';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {ButtonComponent} from '@edas/ng/wrapper/components/button/button.component';
import {InputComponent} from '@edas/ng/wrapper/components/input/input.component';
import {PickerComponent} from '@edas/ng/wrapper/components/picker/picker.component';
import {EdasPickerOption} from '@edas/ng/wrapper/components/picker/picker.types';
import {EdasProperty, PropertyListComponent} from '@edas/ng/wrapper/components/property-list/property-list.component';
import {NotificationService} from '@edas/ng/wrapper/services/notification.service';
import {finalize} from 'rxjs';
import {changedFields, integerOrNull, textOrNull} from '../../shared/forms/form-values';
import {ServerErrors} from '../../shared/forms/server-errors';
import {TeamSummary} from '../../shared/models/team';
import {Venue, VenuePayload, VENUE_SURFACES, VenueSurface} from '../../shared/models/venue';
import {CountryApiService} from '../../shared/services/api/country-api.service';
import {VenueApiService} from '../../shared/services/api/venue-api.service';
import {LockedFieldsComponent} from '../shared/locked-fields.component';

const SECTION_KEY = 'edit';

/** Campos como están en los controles. */
interface Fields {
  name: string;
  city: string;
  country_id: number | null;
  address: string;
  capacity: string;
  opened_year: string;
  surface: VenueSurface | null;
  pitch_length: string;
  pitch_width: string;
  latitude: string;
  longitude: string;
}

function fieldsOf(venue: Venue): Fields {
  const text = (value: number | string | null | undefined) => (value != null ? String(value) : '');

  return {
    name: venue.name,
    city: venue.city ?? '',
    country_id: venue.country_id,
    address: venue.address ?? '',
    capacity: text(venue.capacity),
    opened_year: text(venue.opened_year),
    surface: (venue.surface as VenueSurface | null) ?? null,
    pitch_length: text(venue.pitch_length),
    pitch_width: text(venue.pitch_width),
    latitude: text(venue.latitude),
    longitude: text(venue.longitude),
  };
}

/** Número decimal de un campo opcional. Lo que no es un número se manda tal cual y lo rechaza la API. */
function decimalOrNull(value: string): number | string | null {
  const text = value.trim().replace(',', '.');
  if (text === '') {
    return null;
  }
  return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : text;
}

/**
 * Ficha de un estadio (sección `edit` del modal `venue`). Sirve para corregir lo que llega de
 * los proveedores: el nombre comercial, el aforo, la superficie, las medidas del campo.
 *
 * Como en el equipo, solo se envía lo que cambia, y lo que se cambia queda protegido frente a
 * la sincronización.
 */
@Component({
  selector: 'app-venue-form-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, ButtonComponent, InputComponent, LockedFieldsComponent, PickerComponent, PropertyListComponent, TranslatePipe],
  template: `
    @if (data(); as venue) {
      @if (fields(); as form) {
      <div class="form">
        <div class="form-block">
          <h3 class="form-title">{{ 'venue.section-general' | translate }}</h3>

          <div class="grid-columns">
            <edas-input
              label="texts.name"
              [value]="form.name"
              [required]="true"
              [invalid]="errors.has('name')"
              [errorText]="errors.errorText('name')"
              (valueChange)="set('name', $event)"
            />

            <edas-input
              label="venue.city"
              [value]="form.city"
              [invalid]="errors.has('city')"
              [errorText]="errors.errorText('city')"
              (valueChange)="set('city', $event)"
            />

            <edas-picker
              label="venue.country"
              [items]="countryOptions()"
              [value]="form.country_id"
              [labelTranslate]="false"
              [clearable]="true"
              [searchable]="true"
              [invalid]="errors.has('country_id')"
              [errorText]="errors.errorText('country_id')"
              (valueChange)="set('country_id', $event ?? null)"
            />

            <edas-input
              label="venue.address"
              [value]="form.address"
              [invalid]="errors.has('address')"
              [errorText]="errors.errorText('address')"
              (valueChange)="set('address', $event)"
            />

            <edas-input
              label="venue.capacity"
              type="number"
              [value]="form.capacity"
              [invalid]="errors.has('capacity')"
              [errorText]="errors.errorText('capacity')"
              (valueChange)="set('capacity', $event)"
            />

            <edas-input
              label="venue.opened"
              type="number"
              [value]="form.opened_year"
              [invalid]="errors.has('opened_year')"
              [errorText]="errors.errorText('opened_year')"
              (valueChange)="set('opened_year', $event)"
            />
          </div>
        </div>

        <div class="form-block">
          <h3 class="form-title">{{ 'venue.section-pitch' | translate }}</h3>

          <div class="grid-columns">
            <edas-picker
              label="venue.surface"
              [items]="surfaceOptions"
              [value]="form.surface"
              [clearable]="true"
              [invalid]="errors.has('surface')"
              [errorText]="errors.errorText('surface')"
              (valueChange)="set('surface', $event ?? null)"
            />

            <edas-input
              label="venue.pitch-length"
              type="number"
              [value]="form.pitch_length"
              hint="venue.metres"
              [invalid]="errors.has('pitch_length')"
              [errorText]="errors.errorText('pitch_length')"
              (valueChange)="set('pitch_length', $event)"
            />

            <edas-input
              label="venue.pitch-width"
              type="number"
              [value]="form.pitch_width"
              hint="venue.metres"
              [invalid]="errors.has('pitch_width')"
              [errorText]="errors.errorText('pitch_width')"
              (valueChange)="set('pitch_width', $event)"
            />
          </div>
        </div>

        <div class="form-block">
          <h3 class="form-title">{{ 'venue.section-location' | translate }}</h3>

          <div class="grid-columns">
            <edas-input
              label="venue.latitude"
              [value]="form.latitude"
              hint="venue.coordinate-hint"
              [invalid]="errors.has('latitude')"
              [errorText]="errors.errorText('latitude')"
              (valueChange)="set('latitude', $event)"
            />

            <edas-input
              label="venue.longitude"
              [value]="form.longitude"
              hint="venue.coordinate-hint"
              [invalid]="errors.has('longitude')"
              [errorText]="errors.errorText('longitude')"
              (valueChange)="set('longitude', $event)"
            />
          </div>
        </div>

        <app-locked-fields
          labelPrefix="venue.field"
          [fields]="venue.locked_fields"
          [unlocked]="unlock()"
          (unlockedChange)="setUnlock($event)"
        />

        <edas-app-card icon="shield" [iconSize]="48" [title]="'venue.teams-title' | translate" [description]="'venue.teams-description' | translate">
          @for (team of venue.teams ?? []; track team.id) {
            <edas-button appCardActions appearance="neutral" size="sm" icon="shield" [label]="team.name ?? '—'" [labelTranslate]="false" (clicked)="openTeam(team)"/>
          } @empty {
            <p class="empty">{{ 'venue.no-teams' | translate }}</p>
          }
        </edas-app-card>

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

    .empty {
      margin: 0;
      font-size: 0.875rem;
      color: var(--edas-muted-text-color);
    }
  `],
})
export class VenueFormSectionComponent implements OnInit {
  /** Estadio a editar; lo carga el modal por el id de la capa. */
  public readonly data = input<Venue>();

  private readonly venueApi = inject(VenueApiService);
  private readonly countryApi = inject(CountryApiService);
  private readonly stack = inject(ModalStackService);
  private readonly actionBar = inject(ModalStackActionBarService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly errors = new ServerErrors(this.translate);

  /** Null hasta que llega el estadio. */
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

  protected readonly surfaceOptions: readonly EdasPickerOption<VenueSurface>[] = VENUE_SURFACES.map((surface) => ({
    value: surface,
    label: `enum.surface.${surface}`,
  }));

  /** Partidos y con qué id lo conoce cada proveedor: informativo, no se edita aquí. */
  protected readonly sourceProperties = computed<EdasProperty[]>(() => {
    const venue = this.data();
    // Lee el idioma activo (signal) para que las etiquetas cambien con él
    this.translate.currentLang();

    return [
      {label: 'venue.matches', value: venue?.matches_count ?? 0},
      ...(venue?.providers ?? []).map((provider) => ({label: provider.name, value: provider.external_id})),
    ];
  });

  public ngOnInit(): void {
    const venue = this.data();
    if (!venue) {
      return;
    }

    this.original = fieldsOf(venue);
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

  protected openTeam(team: TeamSummary): void {
    this.stack.push({modalKey: 'team', section: 'edit', id: String(team.id)});
  }

  private canSave(): boolean {
    return !this.busy() && (this.fields()?.name.trim() ?? '') !== '' && Object.keys(this.changes()).length > 0;
  }

  /** Valores como los espera la API. */
  private values(fields: Fields): VenuePayload {
    return {
      name: fields.name.trim(),
      city: textOrNull(fields.city),
      country_id: fields.country_id,
      address: textOrNull(fields.address),
      capacity: integerOrNull(fields.capacity) as number | null,
      opened_year: integerOrNull(fields.opened_year) as number | null,
      surface: fields.surface,
      pitch_length: integerOrNull(fields.pitch_length) as number | null,
      pitch_width: integerOrNull(fields.pitch_width) as number | null,
      latitude: decimalOrNull(fields.latitude) as number | null,
      longitude: decimalOrNull(fields.longitude) as number | null,
    };
  }

  /** Cuerpo de la petición: solo lo modificado. */
  private changes(): VenuePayload {
    const fields = this.fields();

    if (!fields || !this.original) {
      return {};
    }

    const payload: VenuePayload = changedFields(this.values(this.original), this.values(fields));

    if (this.unlock().length > 0) {
      payload.unlock_fields = this.unlock();
    }

    return payload;
  }

  private save(): void {
    const venue = this.data();
    if (!venue || !this.canSave()) {
      return;
    }

    this.errors.clear();
    this.setBusy(true);

    this.venueApi
      .update(venue.id, this.changes())
      .pipe(
        finalize(() => this.setBusy(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.notifications.successKey('venue.updated');
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
