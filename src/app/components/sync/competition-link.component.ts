import {ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {BadgeComponent} from '@edas/ng/wrapper/components/badge/badge.component';
import {ButtonComponent} from '@edas/ng/wrapper/components/button/button.component';
import {InputComponent} from '@edas/ng/wrapper/components/input/input.component';
import {LoaderComponent} from '@edas/ng/wrapper/components/loader/loader.component';
import {DialogService} from '@edas/ng/wrapper/services/dialog.service';
import {NotificationService} from '@edas/ng/wrapper/services/notification.service';
import {finalize} from 'rxjs';
import {CompetitionLink, ProviderCompetition, SyncProvider, SyncState} from '../../shared/models/sync';
import {LinkApiService} from '../../shared/services/api/link-api.service';
import {SyncApiService} from '../../shared/services/api/sync-api.service';

/** Qué cobertura de la búsqueda se enseña, en este orden. */
const COVERAGE_KEYS = ['standings', 'players', 'lineups', 'events', 'player_statistics'] as const;

/**
 * Enlace de una competición con su proveedor (dentro de la pestaña de sincronización): con
 * qué competición del proveedor está enlazada, o el buscador para enlazarla. Cambiar el
 * enlace vuelve a abrir el buscador; desenlazar no borra nada de lo importado.
 *
 * Cada cambio devuelve el estado completo de la sincronización (`stateChange`).
 */
@Component({
  selector: 'app-competition-link',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, BadgeComponent, ButtonComponent, InputComponent, LoaderComponent, TranslatePipe],
  template: `
    @for (link of state().links; track link.provider.code) {
      @if (changing() !== link.provider.code) {
        <edas-app-card
          [icon]="link.logo ? null : 'link'"
          [iconSize]="48"
          [title]="link.name ?? ('link.unnamed' | translate: {id: link.external_id})"
          [description]="describeLink(link)"
          actionLabel="link.change"
          actionIcon="repeat"
          secondaryActionLabel="link.unlink"
          secondaryActionIcon="unlink"
          (actionClick)="startChange(link.provider.code)"
          (secondaryActionClick)="confirmUnlink(link)"
        >
          @if (link.logo) {
            <img appCardLeading class="logo" [src]="link.logo" alt="" width="48" height="48" loading="lazy" (error)="hideImage($event)"/>
          }
        </edas-app-card>
      }
    }

    @if (searchProvider(); as provider) {
      <div class="ff-panel search">
        <div class="search-head">
          <div>
            <h3 class="search-title">{{ (state().links.length > 0 ? 'link.change-title' : 'link.title') | translate: {provider: provider.name} }}</h3>
            <p class="search-help">{{ 'link.search-help' | translate: {provider: provider.name} }}</p>
          </div>
          @if (changing()) {
            <edas-button label="common.cancel" emphasis="flat" (clicked)="cancelChange()"/>
          }
        </div>

        <div class="search-form">
          <edas-input
            class="search-input"
            label="link.search"
            icon="search"
            [value]="query()"
            [disabled]="busy()"
            (valueChange)="query.set($event)"
            (keydown.enter)="search(provider)"
          />
          <edas-button appearance="primary" icon="search" label="link.search-button" [loading]="searching()" [disabled]="busy() || query().trim().length === 0" (clicked)="search(provider)"/>
        </div>

        @if (searching()) {
          <edas-loader size="s"/>
        } @else if (results(); as list) {
          @if (list.length === 0) {
            <p class="search-help">{{ 'link.no-results' | translate }}</p>
          }

          <ul class="results">
            @for (result of list; track result.external_id) {
              <li class="result">
                @if (result.logo) {
                  <img class="logo logo--small" [src]="result.logo" alt="" width="36" height="36" loading="lazy" (error)="hideImage($event)"/>
                } @else {
                  <span class="logo logo--small logo--empty" aria-hidden="true"></span>
                }

                <div class="result-body">
                  <span class="result-name">{{ result.name }}</span>
                  <span class="result-meta">{{ describeResult(result) }}</span>
                  <span class="result-coverage">
                    @for (key of coverageKeys; track key) {
                      @if (result.coverage[key]) {
                        <edas-badge appearance="neutral" size="s" [label]="'link.coverage.' + key"/>
                      }
                    }
                  </span>
                </div>

                <div class="result-action">
                  @if (result.linked_to; as owner) {
                    @if (owner.id === competitionId()) {
                      <edas-badge appearance="success" icon="check" size="s" label="link.linked"/>
                    } @else {
                      <span class="result-owner">{{ 'link.linked-to' | translate: {name: owner.name} }}</span>
                    }
                  } @else {
                    <edas-button
                      appearance="primary"
                      emphasis="soft"
                      icon="link"
                      label="link.link"
                      [disabled]="busy()"
                      [loading]="linking() === result.external_id"
                      (clicked)="link(provider, result)"
                    />
                  }
                </div>
              </li>
            }
          </ul>
        }
      </div>
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-4);
    }

    .logo {
      width: 48px;
      height: 48px;
      flex: none;
      object-fit: contain;
      padding: 6px;
      box-sizing: border-box;
      border-radius: var(--edas-radius-md);
      background: #fff;
    }

    .logo--small {
      width: 36px;
      height: 36px;
      padding: 4px;
    }

    .logo--empty {
      background: rgba(var(--edas-tone-neutral-rgb), 0.14);
    }

    .search {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-4);
      padding: 16px;
    }

    .search-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--edas-space-3);
    }

    .search-title {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
    }

    .search-help {
      margin: 4px 0 0;
      font-size: 0.875rem;
      line-height: 1.4;
      color: var(--edas-muted-text-color);
    }

    .search-form {
      display: flex;
      align-items: center;
      gap: var(--edas-space-3);
    }

    .search-input {
      flex: 1;
      min-width: 0;
    }

    .results {
      display: flex;
      flex-direction: column;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .result {
      display: flex;
      align-items: center;
      gap: var(--edas-space-3);
      padding-block: 12px;
      border-top: 1px solid var(--edas-surface-border-color);
    }

    .result-body {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .result-name {
      font-weight: 600;
    }

    .result-meta,
    .result-owner {
      font-size: 0.8125rem;
      color: var(--edas-muted-text-color);
    }

    .result-coverage {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .result-action {
      flex: none;
    }

    @media (max-width: 640px) {
      .search-form {
        flex-direction: column;
        align-items: stretch;
      }

      .result {
        flex-wrap: wrap;
      }

      .result-action {
        width: 100%;
        padding-inline-start: calc(36px + var(--edas-space-3));
      }
    }
  `],
})
export class CompetitionLinkComponent {
  public readonly competitionId = input.required<number>();
  public readonly state = input.required<SyncState>();
  /** Hay una sincronización en marcha: no se toca el enlace. */
  public readonly locked = input(false);
  public readonly stateChange = output<SyncState>();

  private readonly syncApi = inject(SyncApiService);
  private readonly linkApi = inject(LinkApiService);
  private readonly dialogs = inject(DialogService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly coverageKeys = COVERAGE_KEYS;

  protected readonly query = signal('');
  protected readonly searching = signal(false);
  /** `null` antes de buscar. */
  protected readonly results = signal<ProviderCompetition[] | null>(null);
  /** Id del resultado que se está enlazando. */
  protected readonly linking = signal<string | null>(null);
  /** Proveedor cuyo enlace se está cambiando. */
  protected readonly changing = signal<string | null>(null);
  private readonly unlinking = signal(false);

  protected readonly busy = computed(() => this.locked() || this.searching() || this.linking() !== null || this.unlinking());

  /**
   * Proveedor en el que buscar: el que se está cambiando o, si la competición no está
   * enlazada con ninguno, el primero en el que se pueda buscar. null: no hay buscador.
   */
  protected readonly searchProvider = computed<SyncProvider | null>(() => {
    const {providers, links} = this.state();
    const changing = this.changing();

    if (changing) {
      return providers.find((provider) => provider.code === changing) ?? null;
    }

    return links.length === 0 ? (providers.find((provider) => provider.searchable && provider.active) ?? null) : null;
  });

  /** «API-Football · id 140 · Spain». */
  protected describeLink(link: CompetitionLink): string {
    return [link.provider.name, this.translate.instant('link.id', {id: link.external_id}), link.country].filter(Boolean).join(' · ');
  }

  /** «Spain · Liga · temporadas 2010–2026 · id 140». */
  protected describeResult(result: ProviderCompetition): string {
    const years = result.seasons.map((season) => season.year);
    const range = years.length > 0 ? this.translate.instant('link.seasons', {from: Math.min(...years), to: Math.max(...years)}) : null;
    const type = result.type ? this.translate.instant(`link.type.${result.type}`) : null;

    return [result.country, type, range, this.translate.instant('link.id', {id: result.external_id})].filter(Boolean).join(' · ');
  }

  /** Un logo que no carga deja su hueco vacío, sin el icono de imagen rota. */
  protected hideImage(event: Event): void {
    (event.target as HTMLImageElement).style.visibility = 'hidden';
  }

  protected startChange(provider: string): void {
    this.changing.set(provider);
    this.results.set(null);
    this.query.set('');
  }

  protected cancelChange(): void {
    this.changing.set(null);
    this.results.set(null);
  }

  protected search(provider: SyncProvider): void {
    const text = this.query().trim();
    if (!text || this.busy()) {
      return;
    }

    this.searching.set(true);

    this.syncApi
      .searchCompetitions(provider.code, text)
      .pipe(
        finalize(() => this.searching.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      // El motivo de un error (texto corto, cuota agotada…) lo enseña el interceptor
      .subscribe({next: (results) => this.results.set(results), error: () => this.results.set(null)});
  }

  protected link(provider: SyncProvider, result: ProviderCompetition): void {
    if (this.busy()) {
      return;
    }

    this.linking.set(result.external_id);

    this.syncApi
      .link(this.competitionId(), result, provider.code)
      .pipe(
        finalize(() => this.linking.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => {
        this.notifications.successKey('link.done', {name: result.name});
        this.changing.set(null);
        this.results.set(null);
        this.query.set('');
        this.stateChange.emit(state);
        this.linkApi.changed$.next();
      });
  }

  protected confirmUnlink(link: CompetitionLink): void {
    if (this.busy()) {
      return;
    }

    this.dialogs
      .confirm({label: 'link.unlink', message: 'link.unlink-confirm', confirmLabel: 'link.unlink', cancelLabel: 'common.cancel'})
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.unlink(link);
        }
      });
  }

  private unlink(link: CompetitionLink): void {
    this.unlinking.set(true);

    this.syncApi
      .unlink(this.competitionId(), link.provider.code)
      .pipe(
        finalize(() => this.unlinking.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => {
        this.notifications.successKey('link.removed');
        this.stateChange.emit(state);
        this.linkApi.changed$.next();
      });
  }
}
