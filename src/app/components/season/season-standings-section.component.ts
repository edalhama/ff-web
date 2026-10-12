import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {TranslatePipe} from '@ngx-translate/core';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {LoaderComponent} from '@edas/ng/wrapper/components/loader/loader.component';
import {EdasTabItem, TabsComponent} from '@edas/ng/wrapper/components/tabs/tabs.component';
import {LocalizedDatePipe} from '@edas/ng/wrapper/pipes/localized-date.pipe';
import {Season} from '../../shared/models/season';
import {STANDING_SCOPES, StandingScope, StandingsTable} from '../../shared/models/standing';
import {TeamSummary} from '../../shared/models/team';
import {SeasonContentApiService} from '../../shared/services/api/season-content-api.service';
import {StandingsTableComponent} from '../standing/standings-table.component';

/**
 * Clasificación de una temporada (sección `standings` del modal `season`): general, como
 * local o como visitante. Cada fila abre la ficha del equipo.
 */
@Component({
  selector: 'app-season-standings-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, LoaderComponent, LocalizedDatePipe, StandingsTableComponent, TabsComponent, TranslatePipe],
  template: `
    <edas-tabs [tabs]="scopeTabs" [activeKey]="scope()" (activeKeyChange)="setScope($event)"/>

    @if (tables(); as list) {
      @for (table of list; track table.stage_id) {
        @if (table.rows.length > 0) {
          <app-standings-table
            [rows]="table.rows"
            [showForm]="scope() === 'total'"
            [interactive]="true"
            (teamSelected)="open($event)"
          />

          @if (table.synced_at) {
            <p class="note">{{ 'standing.synced-at' | translate }} {{ table.synced_at | localizedDate: 'd MMM y, HH:mm' }}</p>
          }
        }
      }

      @if (isEmpty()) {
        <edas-app-card
          icon="list-ordered"
          [iconSize]="48"
          [title]="'standing.empty-title' | translate"
          [description]="'season.not-synced' | translate"
        />
      }
    } @else {
      <edas-loader/>
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-4);
      width: 100%;
    }

    .note {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--edas-muted-text-color);
    }
  `],
})
export class SeasonStandingsSectionComponent implements OnInit {
  /** Temporada abierta; la carga el modal. */
  public readonly data = input<Season>();

  private readonly content = inject(SeasonContentApiService);
  private readonly stack = inject(ModalStackService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly scope = signal<StandingScope>('total');
  /** `null` mientras cargan. */
  protected readonly tables = signal<StandingsTable[] | null>(null);

  protected readonly isEmpty = computed(() => (this.tables() ?? []).every((table) => table.rows.length === 0));

  protected readonly scopeTabs: EdasTabItem[] = STANDING_SCOPES.map((scope) => ({key: scope, labelKey: `standing.scope-${scope}`}));

  public ngOnInit(): void {
    this.load();
  }

  protected setScope(scope: string): void {
    if (scope !== this.scope()) {
      this.scope.set(scope as StandingScope);
      this.load();
    }
  }

  protected open(team: TeamSummary): void {
    this.stack.push({modalKey: 'team', section: 'edit', id: String(team.id)});
  }

  private load(): void {
    const season = this.data();
    if (!season) {
      return;
    }

    const scope = this.scope();

    this.content
      .standings(season.id, scope)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        // Si se ha cambiado de pestaña mientras llegaba, esta respuesta ya no vale
        next: (tables) => this.scope() === scope && this.tables.set(tables),
        error: () => this.scope() === scope && this.tables.update((current) => current ?? []),
      });
  }
}
