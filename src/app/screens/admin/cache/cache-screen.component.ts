import {ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {GlobalActionBarService} from '@edas/ng/components/layout/action-bar/global-action-bar.service';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {BadgeComponent} from '@edas/ng/wrapper/components/badge/badge.component';
import {ButtonComponent} from '@edas/ng/wrapper/components/button/button.component';
import {InputComponent} from '@edas/ng/wrapper/components/input/input.component';
import {LoaderComponent} from '@edas/ng/wrapper/components/loader/loader.component';
import {PickerComponent} from '@edas/ng/wrapper/components/picker/picker.component';
import {EdasPickerOption} from '@edas/ng/wrapper/components/picker/picker.types';
import {LocalizedDatePipe} from '@edas/ng/wrapper/pipes/localized-date.pipe';
import {DialogService} from '@edas/ng/wrapper/services/dialog.service';
import {NotificationService} from '@edas/ng/wrapper/services/notification.service';
import {finalize} from 'rxjs';
import {Competition} from '../../../shared/models/competition';
import {PageCacheEntry, PageCachePurge, PageCachePurgeRequest, PageCacheState, PurgeLayerResult} from '../../../shared/models/page-cache';
import {CompetitionApiService} from '../../../shared/services/api/competition-api.service';
import {PageCacheApiService} from '../../../shared/services/api/page-cache-api.service';

/**
 * Caché de las páginas públicas: qué tiene guardado el servidor que las genera, si Cloudflare
 * está enlazado, y purgar (todo, una página o lo de una competición).
 *
 * Las páginas se purgan solas cuando cambian sus datos; esta pantalla es para comprobarlo y
 * para forzarlo a mano. Lo que enseña es una foto del momento: «Actualizar» la repite.
 */
@Component({
  selector: 'app-cache-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, BadgeComponent, ButtonComponent, InputComponent, LoaderComponent, LocalizedDatePipe, PickerComponent, TranslatePipe],
  template: `
    @if (state(); as cache) {
      <p class="intro">{{ 'cache.intro' | translate }}</p>

      <div class="layers">
        <div class="ff-panel layer">
          <div class="layer-head">
            <h2 class="layer-title">{{ 'cache.render-title' | translate }}</h2>
            <edas-badge [appearance]="renderTone(cache)" [label]="renderStatus(cache)" size="s"/>
          </div>
          <p class="layer-text">{{ 'cache.render-description' | translate }}</p>

          @if (cache.render.stats; as stats) {
            <dl class="figures">
              <div><dt>{{ 'cache.pages' | translate }}</dt><dd>{{ stats.entries }}</dd></div>
              <div><dt>{{ 'cache.size' | translate }}</dt><dd>{{ megabytes(stats.bytes) }} / {{ megabytes(stats.max_bytes) }} MB</dd></div>
              <div><dt>{{ 'cache.hit-rate' | translate }}</dt><dd>{{ hitRate() }}</dd></div>
              <div><dt>{{ 'cache.renders' | translate }}</dt><dd>{{ stats.renders }}</dd></div>
            </dl>
            <p class="layer-note">
              {{ 'cache.started-at' | translate }} {{ stats.started_at | localizedDate: 'd MMM y, HH:mm' }}
              @if (stats.render_errors > 0) {
                · {{ 'cache.render-errors' | translate: {count: stats.render_errors} }}
              }
            </p>
          } @else if (cache.render.configured) {
            <p class="layer-note layer-note--problem">{{ 'cache.render-unreachable' | translate }} {{ cache.render.error }}</p>
          } @else {
            <p class="layer-note">{{ 'cache.render-not-configured' | translate }}</p>
          }
        </div>

        <div class="ff-panel layer">
          <div class="layer-head">
            <h2 class="layer-title">Cloudflare</h2>
            <edas-badge
              [appearance]="cache.cloudflare.configured ? 'success' : 'neutral'"
              [label]="cache.cloudflare.configured ? 'cache.status-linked' : 'cache.status-not-linked'"
              size="s"
            />
          </div>
          <p class="layer-text">{{ 'cache.cloudflare-description' | translate }}</p>
          <p class="layer-note">{{ (cache.cloudflare.configured ? 'cache.cloudflare-linked' : 'cache.cloudflare-not-linked') | translate }}</p>
        </div>
      </div>

      @if (canPurge()) {
        <div class="ff-panel purge">
          <edas-picker
            class="purge-picker"
            label="cache.purge-competition"
            [items]="competitionOptions()"
            [value]="competitionId()"
            [labelTranslate]="true"
            [disabled]="busy()"
            (valueChange)="competitionId.set($event)"
          />
          <edas-button
            icon="eraser"
            label="cache.purge-competition-btn"
            [disabled]="busy() || competitionId() === null"
            (clicked)="purgeCompetition()"
          />
        </div>
      }

      <div class="block">
        <div class="block-head">
          <h2 class="block-title">{{ 'cache.entries-title' | translate }}</h2>
          @if (cache.render.entries.length > 0) {
            <edas-input
              class="search"
              size="sm"
              iconStart="search"
              placeholder="cache.search"
              [cleaner]="true"
              [value]="search()"
              (valueChange)="search.set($event ?? '')"
            />
          }
        </div>

        @if (entries(); as list) {
          @if (list.length > 0) {
            <div class="ff-panel ff-panel--scroll">
              <table class="ff-table">
                <thead>
                  <tr>
                    <th scope="col">{{ 'cache.page' | translate }}</th>
                    <th scope="col">{{ 'common.status' | translate }}</th>
                    <th class="end" scope="col">{{ 'cache.size' | translate }}</th>
                    <th class="end" scope="col">{{ 'cache.expires' | translate }}</th>
                    <th class="end" scope="col">{{ 'cache.hits' | translate }}</th>
                    <th scope="col"><span class="visually-hidden">{{ 'cache.purge' | translate }}</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (entry of list; track entry.path) {
                    <tr>
                      <td class="path">
                        <a [href]="cache.site_url + entry.path" target="_blank" rel="noopener">{{ entry.path }}</a>
                        @if (entry.tags.length > 0) {
                          <span class="tags">{{ entry.tags.join(' · ') }}</span>
                        }
                      </td>
                      <td>
                        <edas-badge [appearance]="entryTone(entry)" [label]="entryStatus(entry)" [labelTranslate]="false" size="s"/>
                      </td>
                      <td class="end">{{ kilobytes(entry.bytes) }} kB</td>
                      <td class="end">{{ remaining(entry) }}</td>
                      <td class="end">{{ entry.hits }}</td>
                      <td class="end">
                        <edas-button
                          icon="eraser"
                          appearance="flat"
                          size="xs"
                          [iconOnly]="true"
                          [ariaLabel]="'cache.purge-page' | translate: {path: entry.path}"
                          [disabled]="busy()"
                          (clicked)="purge({scope: 'path', path: entry.path})"
                        />
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            @if (hiddenEntries() > 0) {
              <p class="layer-note">{{ 'cache.more-entries' | translate: {count: hiddenEntries()} }}</p>
            }
          } @else {
            <p class="empty">{{ (search() ? 'cache.no-matches' : 'cache.no-entries') | translate }}</p>
          }
        }
      </div>

      <div class="block">
        <h2 class="block-title">{{ 'cache.log-title' | translate }}</h2>

        @for (purged of cache.log; track $index) {
          <div class="ff-panel log">
            <div class="log-head">
              <span class="log-what">{{ what(purged) }}</span>
              <span class="log-meta">
                {{ 'cache.reason-' + purged.reason | translate }}
                @if (purged.user) {
                  · {{ purged.user }}
                }
                · {{ purged.at | localizedDate: 'd MMM y, HH:mm' }}
              </span>
            </div>
            <p class="log-result">
              @if (purged.render; as layer) {
                <span [class.problem]="!layer.ok">{{ 'cache.render-title' | translate }}: {{ layerResult(layer) }}</span>
              }
              @if (purged.cloudflare; as layer) {
                <span [class.problem]="!layer.ok">Cloudflare: {{ layerResult(layer) }}</span>
              }
            </p>
          </div>
        } @empty {
          <p class="empty">{{ 'cache.no-log' | translate }}</p>
        }
      </div>
    } @else if (failed()) {
      <edas-app-card icon="cloud-off" [iconSize]="48" [title]="'cache.load-error' | translate" [description]="'cache.load-error-description' | translate"/>
    } @else {
      <edas-loader/>
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-6);
      width: 100%;
    }

    h2,
    p,
    dl,
    dd {
      margin: 0;
    }

    .intro {
      max-width: 75ch;
      color: var(--edas-muted-text-color);
    }

    .layers {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: var(--edas-space-4);
    }

    .layer {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-3);
      padding: var(--edas-space-5);
    }

    .layer-head,
    .block-head,
    .log-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: var(--edas-space-2) var(--edas-space-4);
    }

    .layer-title,
    .block-title {
      font-size: 1rem;
      font-weight: 700;
    }

    .layer-text {
      font-size: 0.875rem;
      color: var(--edas-muted-text-color);
    }

    .layer-note,
    .log-meta,
    .log-result,
    .tags {
      font-size: 0.8125rem;
      color: var(--edas-muted-text-color);
    }

    .layer-note--problem,
    .problem {
      color: var(--edas-danger-color);
    }

    .figures {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--edas-space-3);
    }

    .figures dt {
      font-size: 0.75rem;
      color: var(--edas-muted-text-color);
    }

    .figures dd {
      font-size: 1.125rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }

    .purge {
      display: flex;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: var(--edas-space-3);
      padding: var(--edas-space-5);
    }

    .purge-picker {
      flex: 1;
      min-width: 14rem;
      max-width: 26rem;
    }

    .block {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-3);
    }

    .search {
      width: min(20rem, 100%);
    }

    .path {
      display: flex;
      flex-direction: column;
      gap: 2px;
      max-width: 32rem;
      white-space: normal;
      word-break: break-all;
    }

    .path a {
      font-weight: 600;
      color: inherit;
    }

    .log {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-2);
      padding: var(--edas-space-4);
    }

    .log-what {
      font-weight: 600;
      word-break: break-word;
    }

    .log-result {
      display: flex;
      flex-wrap: wrap;
      gap: var(--edas-space-1) var(--edas-space-4);
    }

    .empty {
      color: var(--edas-muted-text-color);
    }

    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
    }
  `],
})
export class CacheScreenComponent implements OnInit {
  private readonly api = inject(PageCacheApiService);
  private readonly competitionApi = inject(CompetitionApiService);
  private readonly dialogs = inject(DialogService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly actionBar = inject(GlobalActionBarService);
  private readonly destroyRef = inject(DestroyRef);

  /** Filas que se pintan como mucho: con más, se busca. */
  private static readonly VISIBLE = 100;

  /** `null` mientras carga. */
  protected readonly state = signal<PageCacheState | null>(null);
  protected readonly failed = signal(false);
  protected readonly busy = signal(false);
  protected readonly search = signal('');
  protected readonly competitionId = signal<number | null>(null);
  private readonly competitions = signal<Competition[]>([]);

  /** Hay alguna capa a la que pedirle una purga. */
  protected readonly canPurge = computed(() => !!this.state() && (this.state()!.render.configured || this.state()!.cloudflare.configured));

  private readonly matching = computed(() => {
    const term = this.search().trim().toLowerCase();
    const entries = this.state()?.render.entries ?? [];

    return term ? entries.filter((entry) => entry.path.toLowerCase().includes(term) || entry.tags.some((tag) => tag.includes(term))) : entries;
  });

  protected readonly entries = computed(() => this.matching().slice(0, CacheScreenComponent.VISIBLE));
  protected readonly hiddenEntries = computed(() => this.matching().length - this.entries().length);

  protected readonly competitionOptions = computed<EdasPickerOption<number>[]>(() =>
    this.competitions().map((competition) => ({value: competition.id, label: competition.name ?? `#${competition.id}`})),
  );

  /** De cada cien páginas pedidas, cuántas han salido de la caché. */
  protected readonly hitRate = computed(() => {
    const stats = this.state()?.render.stats;
    const served = stats ? stats.hits + stats.stale + stats.misses : 0;

    return stats && served > 0 ? `${Math.round(((stats.hits + stats.stale) / served) * 100)} %` : '—';
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.actionBar.clear());
  }

  public ngOnInit(): void {
    this.load();

    this.competitionApi
      .list({active: 1, orderBy: 'position'})
      .then((page) => this.competitions.set((page.data ?? []) as Competition[]))
      // Sin la lista se puede seguir purgando todo o página a página
      .catch(() => undefined);
  }

  protected purge(request: PageCachePurgeRequest): void {
    if (this.busy()) {
      return;
    }

    this.busy.set(true);

    this.api
      .purge(request)
      .pipe(
        finalize(() => this.busy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({result, state, message}) => {
          this.apply(state);

          const failed = [result.render, result.cloudflare].some((layer) => layer !== null && !layer.ok);
          if (failed) {
            this.notifications.warning(message);
          } else {
            this.notifications.successKey('cache.purged', {count: result.render?.purged ?? 0});
          }
        },
        // El aviso de error lo da el interceptor
        error: () => undefined,
      });
  }

  protected purgeCompetition(): void {
    const id = this.competitionId();

    if (id !== null) {
      this.purge({scope: 'competition', id});
    }
  }

  protected megabytes(bytes: number): string {
    return (bytes / 1024 / 1024).toFixed(1);
  }

  protected kilobytes(bytes: number): string {
    return (bytes / 1024).toFixed(1);
  }

  protected renderTone(cache: PageCacheState): 'success' | 'danger' | 'neutral' | 'warning' {
    if (!cache.render.configured) {
      return 'neutral';
    }
    if (!cache.render.reachable) {
      return 'danger';
    }

    return cache.render.stats?.enabled ? 'success' : 'warning';
  }

  protected renderStatus(cache: PageCacheState): string {
    if (!cache.render.configured) {
      return 'cache.status-not-linked';
    }
    if (!cache.render.reachable) {
      return 'cache.status-down';
    }

    return cache.render.stats?.enabled ? 'cache.status-active' : 'cache.status-disabled';
  }

  protected entryTone(entry: PageCacheEntry): 'success' | 'warning' | 'neutral' {
    if (entry.state === 'stale') {
      return 'warning';
    }

    return entry.status === 200 ? 'success' : 'neutral';
  }

  /** «Vigente», «Caducada», y el código si no es una página normal: «Vigente · 404». */
  protected entryStatus(entry: PageCacheEntry): string {
    const state = this.translate.instant(`cache.state-${entry.state}`);

    return entry.status === 200 ? state : `${state} · ${entry.status}`;
  }

  /** «8 min», «3 h»… lo que le queda de vigencia; «—» si ya ha caducado. */
  protected remaining(entry: PageCacheEntry): string {
    const seconds = Math.round((new Date(entry.expires_at).getTime() - this.loadedAt) / 1000);

    if (seconds <= 0) {
      return '—';
    }
    if (seconds < 90) {
      return `${seconds} s`;
    }
    if (seconds < 5400) {
      return `${Math.round(seconds / 60)} min`;
    }

    return `${Math.round(seconds / 3600)} h`;
  }

  /** Qué se purgó: «Todo», las rutas o las etiquetas. */
  protected what(purged: PageCachePurge): string {
    if (purged.all) {
      return this.translate.instant('cache.purged-all');
    }

    return [...purged.paths, ...purged.tags].join(' · ');
  }

  protected layerResult(layer: NonNullable<PurgeLayerResult>): string {
    if (!layer.ok) {
      return layer.error ?? this.translate.instant('cache.layer-failed');
    }

    return layer.purged !== undefined ? this.translate.instant('cache.layer-purged', {count: layer.purged}) : this.translate.instant('cache.layer-ok');
  }

  /** Momento de la última carga: las vigencias se calculan contra él, no contra un reloj vivo. */
  private loadedAt = Date.now();

  private load(): void {
    this.api
      .state()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (state) => this.apply(state),
        error: () => this.failed.set(true),
      });
  }

  private apply(state: PageCacheState): void {
    this.loadedAt = Date.now();
    this.failed.set(false);
    this.state.set(state);

    this.actionBar.setActions([
      {id: 'refresh-cache', labelKey: 'cache.refresh', icon: 'refresh-cw', onClick: () => this.load()},
      ...(state.render.configured || state.cloudflare.configured
        ? [{id: 'purge-cache', labelKey: 'cache.purge-all', icon: 'trash-2', onClick: () => this.confirmPurgeAll()}]
        : []),
    ]);
  }

  private confirmPurgeAll(): void {
    this.dialogs
      .confirm({label: 'cache.purge-all', message: 'cache.purge-all-confirm', confirmLabel: 'cache.purge-all', cancelLabel: 'common.cancel'})
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.purge({scope: 'all'});
        }
      });
  }
}
