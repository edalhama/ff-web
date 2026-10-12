import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, input, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {ModalStackActionBarService} from '@edas/ng/navigation/modal-stack/modal-stack-action-bar.service';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {ButtonComponent} from '@edas/ng/wrapper/components/button/button.component';
import {ListItemComponent} from '@edas/ng/wrapper/components/list-item/list-item.component';
import {LoaderComponent} from '@edas/ng/wrapper/components/loader/loader.component';
import {LocalizedDatePipe} from '@edas/ng/wrapper/pipes/localized-date.pipe';
import {filter} from 'rxjs';
import {Competition} from '../../shared/models/competition';
import {Season} from '../../shared/models/season';
import {SeasonApiService} from '../../shared/services/api/season-api.service';

/** Clave de la sección en el modal `competition` (y de sus acciones en la barra inferior). */
const SECTION_KEY = 'seasons';

/**
 * Temporadas de una competición (sección `seasons` del modal `competition`), de la más reciente
 * a la más antigua. Cada fila abre su ficha; la barra inferior da de alta una nueva.
 */
@Component({
  selector: 'app-season-list-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, ButtonComponent, ListItemComponent, LoaderComponent, TranslatePipe],
  template: `
    @if (seasons(); as list) {
      @if (list.length > 0) {
        <edas-app-card [showHead]="false">
          @for (season of list; track season.id) {
            <edas-list-item
              [label]="season.label"
              [description]="describe(season)"
              [icon]="season.is_current ? 'calendar-check' : 'calendar'"
              [color]="season.is_current ? 'var(--edas-primary-accent)' : null"
              (itemClick)="open(season)"
            />
          }
        </edas-app-card>
      } @else {
        <edas-app-card
          icon="calendar-plus"
          [iconSize]="48"
          [title]="'season.empty-title' | translate"
          [description]="'season.empty-description' | translate"
        >
          <p class="empty-help">{{ 'season.empty-help' | translate }}</p>
          <edas-button appearance="primary" icon="plus" label="season.add" (clicked)="add()"/>
        </edas-app-card>
      }
    } @else {
      <edas-loader/>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .empty-help {
      margin: 0 0 var(--edas-space-4);
      font-size: 0.875rem;
      line-height: 1.4;
      color: var(--edas-muted-text-color);
    }
  `],
})
export class SeasonListSectionComponent implements OnInit {
  /** Competición abierta; la carga el modal. */
  public readonly data = input<Competition>();

  private readonly seasonApi = inject(SeasonApiService);
  private readonly stack = inject(ModalStackService);
  private readonly actionBar = inject(ModalStackActionBarService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly datePipe = new LocalizedDatePipe();

  /** `null` mientras llega la primera carga. */
  protected readonly seasons = signal<Season[] | null>(null);

  constructor() {
    // Altas, ediciones y bajas hechas en las capas de encima
    this.seasonApi.changed$
      .pipe(
        filter((competitionId) => competitionId === this.data()?.id),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.load());
  }

  public ngOnInit(): void {
    this.load();

    this.actionBar.register(SECTION_KEY, [
      {id: 'add-season', labelKey: 'season.add', icon: 'plus', onClick: () => this.add()},
    ]);
    this.destroyRef.onDestroy(() => this.actionBar.unregister(SECTION_KEY));
  }

  /** Estado, si es la actual y las fechas: «En curso · Actual · 15 ago 2026 – 30 may 2027». */
  protected describe(season: Season): string {
    const parts = [this.translate.instant(`enum.season-status.${season.status}`)];

    if (season.is_current) {
      parts.push(this.translate.instant('season.current'));
    }

    const dates = [season.starts_on, season.ends_on]
      .map((date) => (date ? this.datePipe.transform(date, 'd MMM y') : null))
      .filter((date): date is string => !!date);

    if (dates.length > 0) {
      parts.push(dates.join(' – '));
    }

    return parts.join(' · ');
  }

  protected open(season: Season): void {
    this.stack.push({modalKey: 'season', section: 'calendar', id: String(season.id)});
  }

  protected add(): void {
    const competition = this.data();
    if (competition) {
      this.stack.push({modalKey: 'season-new', section: 'new', id: String(competition.id)});
    }
  }

  private load(): void {
    const competition = this.data();
    if (!competition) {
      return;
    }

    this.seasonApi
      .listByCompetition(competition.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (seasons) => this.seasons.set(seasons),
        // El aviso lo da el interceptor; la lista se queda como estaba (o vacía la primera vez)
        error: () => this.seasons.update((current) => current ?? []),
      });
  }
}
