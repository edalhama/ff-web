import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {ModalStackActionBarService} from '@edas/ng/navigation/modal-stack/modal-stack-action-bar.service';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {ImagePickerComponent, ImagePickerData, ImagePickerResult} from '@edas/ng/wrapper/components/image-picker/image-picker.component';
import {InputComponent} from '@edas/ng/wrapper/components/input/input.component';
import {EdasProperty, PropertyListComponent} from '@edas/ng/wrapper/components/property-list/property-list.component';
import {DialogService} from '@edas/ng/wrapper/services/dialog.service';
import {NotificationService} from '@edas/ng/wrapper/services/notification.service';
import {SheetDialogService} from '@edas/ng/wrapper/services/sheet-dialog.service';
import {finalize, Observable} from 'rxjs';
import {changedFields, textOrNull} from '../../shared/forms/form-values';
import {ServerErrors} from '../../shared/forms/server-errors';
import {TvChannel, TvChannelPayload} from '../../shared/models/tv-channel';
import {TvChannelApiService} from '../../shared/services/api/tv-channel-api.service';
import {tvChannelImageProblem} from '../../shared/tv-channels/tv-channels';
import {LockedFieldsComponent} from '../shared/locked-fields.component';
import {TeamCrestComponent} from '../team/team-crest.component';

/** Campos como están en los controles. */
interface Fields {
  name: string;
  dial: string;
  platform: string;
}

function fieldsOf(channel: TvChannel | undefined): Fields {
  return {
    name: channel?.name ?? '',
    dial: channel?.dial ?? '',
    platform: channel?.platform ?? '',
  };
}

/**
 * Formulario de canal de TV: alta (sección `new`) y edición (sección `edit`) del modal
 * `tv-channel`. De Jornada Perfecta solo llega el nombre; el dial, la plataforma y el logo se
 * ponen aquí.
 *
 * En la edición solo se envía lo que cambia, y lo que se cambia queda protegido frente a la
 * sincronización. El logo se sube (o se quita) en el acto, con el selector de imágenes de
 * edas-ng, sin esperar a guardar; en el alta aparece al crear el canal. Desde la edición se
 * puede eliminar un canal que no emite ningún partido.
 */
@Component({
  selector: 'app-tv-channel-form-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, InputComponent, LockedFieldsComponent, PropertyListComponent, TeamCrestComponent, TranslatePipe],
  template: `
    <div class="form">
      <div class="form-block">
        <h3 class="form-title">{{ 'tv-channel.section-general' | translate }}</h3>

        <div class="grid-columns">
          <edas-input
            label="tv-channel.name"
            [value]="fields().name"
            [required]="true"
            hint="tv-channel.name-hint"
            [invalid]="errors.has('name')"
            [errorText]="errors.errorText('name')"
            (valueChange)="set('name', $event)"
          />

          <edas-input
            label="tv-channel.platform"
            [value]="fields().platform"
            hint="tv-channel.platform-hint"
            [invalid]="errors.has('platform')"
            [errorText]="errors.errorText('platform')"
            (valueChange)="set('platform', $event)"
          />

          <edas-input
            label="tv-channel.dial"
            [value]="fields().dial"
            hint="tv-channel.dial-hint"
            [invalid]="errors.has('dial')"
            [errorText]="errors.errorText('dial')"
            (valueChange)="set('dial', $event)"
          />
        </div>
      </div>

      @if (data(); as channel) {
        <edas-app-card
          [icon]="image() ? null : 'image'"
          [iconSize]="48"
          [title]="'tv-channel.image' | translate"
          [description]="(image() ? 'tv-channel.image-description' : 'tv-channel.no-image') | translate"
          [actionLabel]="(image() ? 'tv-channel.change-image' : 'tv-channel.upload-image') | translate"
          actionIcon="upload"
          (actionClick)="pickImage()"
        >
          @if (image(); as url) {
            <app-team-crest appCardLeading [src]="url" [size]="48"/>
          }
        </edas-app-card>

        <app-locked-fields
          labelPrefix="tv-channel.field"
          [fields]="channel.locked_fields"
          [unlocked]="unlock()"
          (unlockedChange)="setUnlock($event)"
        />

        <edas-app-card icon="database" [iconSize]="48" [title]="'team.source-title' | translate" [description]="'team.source-description' | translate">
          <edas-property-list [items]="sourceProperties()"/>
        </edas-app-card>
      } @else {
        <p class="help">{{ 'tv-channel.new-help' | translate }}</p>
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

    .help {
      margin: 0;
      font-size: 0.875rem;
      color: var(--edas-muted-text-color);
    }
  `],
})
export class TvChannelFormSectionComponent implements OnInit {
  /** Canal a editar; lo carga el modal por el id de la capa. Sin él, es un alta. */
  public readonly data = input<TvChannel>();

  private readonly tvChannelApi = inject(TvChannelApiService);
  private readonly stack = inject(ModalStackService);
  private readonly actionBar = inject(ModalStackActionBarService);
  private readonly notifications = inject(NotificationService);
  private readonly dialogs = inject(DialogService);
  private readonly sheets = inject(SheetDialogService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly errors = new ServerErrors(this.translate);

  protected readonly fields = signal<Fields>(fieldsOf(undefined));
  /** Campos protegidos que se devolverán a la sincronización al guardar. */
  protected readonly unlock = signal<string[]>([]);
  /** Logo actual: cambia en el acto al subirlo o quitarlo, sin recargar la ficha. */
  protected readonly image = signal<string | null>(null);
  private readonly busy = signal(false);

  /** Punto de partida, para enviar solo lo que cambia. */
  private original: Fields = this.fields();

  /** Partidos que emite y con qué id lo conoce cada proveedor: informativo, no se edita aquí. */
  protected readonly sourceProperties = computed<EdasProperty[]>(() => {
    const channel = this.data();
    // Lee el idioma activo (signal) para que las etiquetas cambien con él
    this.translate.currentLang();

    return [
      {label: 'tv-channel.matches', value: channel?.matches_count ?? 0},
      ...(channel?.providers ?? []).map((provider) => ({label: provider.name, value: provider.external_ids.join(', ')})),
    ];
  });

  private get sectionKey(): string {
    return this.data() ? 'edit' : 'new';
  }

  public ngOnInit(): void {
    const channel = this.data();

    if (channel) {
      this.original = fieldsOf(channel);
      this.fields.set(this.original);
      this.image.set(channel.image);
    }

    this.registerActions();
    this.destroyRef.onDestroy(() => this.actionBar.unregister(this.sectionKey));
  }

  protected set<K extends keyof Fields>(name: K, value: Fields[K]): void {
    this.fields.update((fields) => ({...fields, [name]: value}));
    this.errors.clear(name);
    this.actionBar.refresh();
  }

  protected setUnlock(fields: string[]): void {
    this.unlock.set(fields);
    this.actionBar.refresh();
  }

  /** Selector de imágenes de edas-ng: una imagen nueva la sube; «Quitar», la quita. */
  protected pickImage(): void {
    const channel = this.data();
    if (!channel || this.busy()) {
      return;
    }

    this.sheets
      .open<ImagePickerData, ImagePickerResult>(ImagePickerComponent, {
        label: this.translate.instant('tv-channel.image'),
        data: {filename: this.image(), canEdit: true, target: 'tv-channel'},
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result instanceof File) {
          this.uploadImage(channel, result);
        } else if (result === null) {
          this.changeImage(this.tvChannelApi.removeImage(channel.id), 'tv-channel.image-removed');
        }
      });
  }

  private uploadImage(channel: TvChannel, file: File): void {
    const problem = tvChannelImageProblem(file);

    if (problem) {
      this.notifications.errorKey(problem);

      return;
    }

    this.changeImage(this.tvChannelApi.uploadImage(channel.id, file), 'tv-channel.image-saved');
  }

  private changeImage(request$: Observable<TvChannel>, messageKey: string): void {
    this.setBusy(true);

    request$
      .pipe(
        finalize(() => this.setBusy(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (saved) => {
          this.image.set(saved.image);
          this.notifications.successKey(messageKey);
        },
        // El motivo (formato, tamaño) ya lo enseña el interceptor
        error: () => undefined,
      });
  }

  private canSave(): boolean {
    if (this.busy() || this.fields().name.trim() === '') {
      return false;
    }

    return !this.data() || Object.keys(this.changes()).length > 0;
  }

  /** Valores como los espera la API. */
  private values(fields: Fields): TvChannelPayload {
    return {
      name: fields.name.trim(),
      dial: textOrNull(fields.dial),
      platform: textOrNull(fields.platform),
    };
  }

  /** Cuerpo de la petición: todo en un alta, solo lo modificado en una edición. */
  private changes(): TvChannelPayload {
    if (!this.data()) {
      return this.values(this.fields());
    }

    const payload: TvChannelPayload = changedFields(this.values(this.original), this.values(this.fields()));

    if (this.unlock().length > 0) {
      payload.unlock_fields = this.unlock();
    }

    return payload;
  }

  private save(): void {
    if (!this.canSave()) {
      return;
    }

    const channel = this.data();
    const payload = this.changes();

    this.errors.clear();
    this.setBusy(true);

    const request$ = channel ? this.tvChannelApi.update(channel.id, payload) : this.tvChannelApi.create(payload);

    request$
      .pipe(
        finalize(() => this.setBusy(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (saved) => {
          if (channel) {
            this.notifications.successKey('tv-channel.updated');
            this.stack.pop();
          } else {
            // Del canal recién creado lo siguiente suele ser ponerle el logo
            this.notifications.successKey('tv-channel.created');
            this.stack.replaceTop({modalKey: 'tv-channel', section: 'edit', id: String(saved.id)});
          }
        },
        error: (error) => this.errors.capture(error),
      });
  }

  private confirmRemove(): void {
    const channel = this.data();
    if (!channel || this.busy()) {
      return;
    }

    this.dialogs
      .confirm({label: 'tv-channel.delete', message: 'tv-channel.delete-confirm', confirmLabel: 'common.delete', cancelLabel: 'common.cancel'})
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.remove(channel);
        }
      });
  }

  private remove(channel: TvChannel): void {
    this.setBusy(true);

    this.tvChannelApi
      .remove(channel.id)
      .pipe(
        finalize(() => this.setBusy(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.notifications.successKey('tv-channel.deleted');
          this.stack.pop();
        },
        // El motivo (que emite partidos) ya lo enseña el interceptor
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
