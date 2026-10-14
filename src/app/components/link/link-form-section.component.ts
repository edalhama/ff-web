import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, input, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {TranslatePipe} from '@ngx-translate/core';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {ButtonComponent} from '@edas/ng/wrapper/components/button/button.component';
import {InputComponent} from '@edas/ng/wrapper/components/input/input.component';
import {LocalizedDatePipe} from '@edas/ng/wrapper/pipes/localized-date.pipe';
import {DialogService} from '@edas/ng/wrapper/services/dialog.service';
import {NotificationService} from '@edas/ng/wrapper/services/notification.service';
import {finalize} from 'rxjs';
import {LinkEntity} from '../../shared/models/link';
import {LinkApiService} from '../../shared/services/api/link-api.service';

type ProviderLink = LinkEntity['links'][number];

/**
 * Enlace a mano de un equipo, un jugador o un estadio (modal `link`): su id en cada
 * proveedor, para que la sincronización lo actualice en vez de crear otro. Una competición
 * se enlaza desde su ficha: aquí solo se enseña y se lleva hasta allí.
 */
@Component({
  selector: 'app-link-form-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, ButtonComponent, InputComponent, LocalizedDatePipe, TranslatePipe],
  template: `
    @if (entity(); as current) {
      <edas-app-card icon="link" [iconSize]="48" [labelTranslate]="false" [title]="current.name" [description]="current.detail"/>

      @if (!current.manual) {
        <edas-app-card icon="trophy" [iconSize]="48" [title]="'link.competition-elsewhere-title' | translate" [description]="'link.competition-elsewhere' | translate">
          <edas-button appCardActions appearance="primary" icon="refresh-cw" label="link.open-competition" (clicked)="openCompetition(current)"/>
        </edas-app-card>
      }

      @for (link of current.links; track link.provider.code) {
        <div class="ff-panel provider">
          <div class="provider-head">
            <h3 class="provider-name">{{ link.provider.name }}</h3>
            <span class="provider-meta">
              @if (link.external_id) {
                {{ 'link.linked-as' | translate: {id: link.external_id} }}
                @if (link.external_name) {
                  · «{{ link.external_name }}»
                }
                @if (link.last_synced_at; as at) {
                  · {{ 'link.synced' | translate }} {{ at | localizedDate: 'd MMM y, HH:mm' }}
                }
              } @else {
                {{ 'link.not-linked' | translate }}
              }
            </span>
          </div>

          @if (current.manual) {
            <div class="provider-form">
              <edas-input
                class="provider-input"
                label="link.external-id"
                [value]="draft(link)"
                [disabled]="busy() !== null"
                hint="link.external-id-hint"
                (valueChange)="setDraft(link, $event)"
                (keydown.enter)="save(current, link)"
              />
              <edas-button
                appearance="primary"
                icon="link"
                label="link.save"
                [loading]="busy() === link.provider.code"
                [disabled]="busy() !== null || !canSave(link)"
                (clicked)="save(current, link)"
              />
              @if (link.external_id) {
                <edas-button
                  appearance="danger"
                  emphasis="flat"
                  icon="unlink"
                  label="link.unlink"
                  [disabled]="busy() !== null"
                  (clicked)="confirmUnlink(current, link)"
                />
              }
            </div>
            <p class="provider-help">{{ 'link.manual-help' | translate }}</p>
          }
        </div>
      }
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-4);
      width: 100%;
    }

    .provider {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-3);
      padding: 16px;
    }

    .provider-head {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .provider-name {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
    }

    .provider-meta,
    .provider-help {
      margin: 0;
      font-size: 0.8125rem;
      line-height: 1.4;
      color: var(--edas-muted-text-color);
    }

    .provider-form {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--edas-space-3);
    }

    .provider-input {
      flex: 1 1 14rem;
      min-width: 0;
    }
  `],
})
export class LinkFormSectionComponent implements OnInit {
  /** Entidad abierta; la carga el modal. */
  public readonly data = input<LinkEntity>();

  private readonly linkApi = inject(LinkApiService);
  private readonly stack = inject(ModalStackService);
  private readonly dialogs = inject(DialogService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly entity = signal<LinkEntity | null>(null);
  /** Lo escrito en el campo de cada proveedor. */
  private readonly drafts = signal<Record<string, string>>({});
  /** Proveedor cuyo enlace se está guardando o quitando. */
  protected readonly busy = signal<string | null>(null);

  public ngOnInit(): void {
    const entity = this.data();

    if (entity) {
      this.setEntity(entity);
    }
  }

  protected draft(link: ProviderLink): string {
    return this.drafts()[link.provider.code] ?? link.external_id ?? '';
  }

  protected setDraft(link: ProviderLink, value: string): void {
    this.drafts.update((drafts) => ({...drafts, [link.provider.code]: value}));
  }

  /** Hay un id escrito y es distinto del que tiene. */
  protected canSave(link: ProviderLink): boolean {
    const value = this.draft(link).trim();

    return value !== '' && value !== link.external_id;
  }

  protected save(entity: LinkEntity, link: ProviderLink): void {
    if (this.busy() || !this.canSave(link)) {
      return;
    }

    this.busy.set(link.provider.code);

    this.linkApi
      .link(entity.type, entity.id, link.provider.code, this.draft(link).trim())
      .pipe(
        finalize(() => this.busy.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      // Un id ya usado por otro lo explica el interceptor («ya está enlazado con…»)
      .subscribe((updated) => {
        this.notifications.successKey('link.saved');
        this.setEntity(updated);
      });
  }

  protected confirmUnlink(entity: LinkEntity, link: ProviderLink): void {
    this.dialogs
      .confirm({label: 'link.unlink', message: 'link.unlink-entity-confirm', confirmLabel: 'link.unlink', cancelLabel: 'common.cancel'})
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }

        this.busy.set(link.provider.code);

        this.linkApi
          .unlink(entity.type, entity.id, link.provider.code)
          .pipe(
            finalize(() => this.busy.set(null)),
            takeUntilDestroyed(this.destroyRef),
          )
          .subscribe((updated) => {
            this.notifications.successKey('link.removed');
            this.setEntity(updated);
          });
      });
  }

  protected openCompetition(entity: LinkEntity): void {
    this.stack.push({modalKey: 'competition', section: 'sync', id: String(entity.id)});
  }

  private setEntity(entity: LinkEntity): void {
    this.entity.set(entity);
    this.drafts.set({});
  }
}
