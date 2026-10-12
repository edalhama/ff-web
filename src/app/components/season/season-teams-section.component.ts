import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, input, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {TranslatePipe} from '@ngx-translate/core';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {ListItemComponent} from '@edas/ng/wrapper/components/list-item/list-item.component';
import {LoaderComponent} from '@edas/ng/wrapper/components/loader/loader.component';
import {Season} from '../../shared/models/season';
import {Team} from '../../shared/models/team';
import {SeasonContentApiService} from '../../shared/services/api/season-content-api.service';
import {TeamApiService} from '../../shared/services/api/team-api.service';

/** Equipos inscritos en una temporada (sección `teams` del modal `season`). Cada fila abre su ficha. */
@Component({
  selector: 'app-season-teams-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, ListItemComponent, LoaderComponent, TranslatePipe],
  template: `
    @if (teams(); as list) {
      @if (list.length > 0) {
        <edas-app-card [showHead]="false">
          @for (team of list; track team.id) {
            <edas-list-item
              icon="shield"
              [color]="team.primary_color"
              [label]="team.name ?? '—'"
              [description]="describe(team)"
              (itemClick)="open(team)"
            />
          }
        </edas-app-card>
      } @else {
        <edas-app-card
          icon="shield-off"
          [iconSize]="48"
          [title]="'season.no-teams-title' | translate"
          [description]="'season.not-synced' | translate"
        />
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
  `],
})
export class SeasonTeamsSectionComponent implements OnInit {
  /** Temporada abierta; la carga el modal. */
  public readonly data = input<Season>();

  private readonly content = inject(SeasonContentApiService);
  private readonly stack = inject(ModalStackService);
  private readonly destroyRef = inject(DestroyRef);

  /** `null` mientras llega la primera carga. */
  protected readonly teams = signal<Team[] | null>(null);

  constructor() {
    // Un equipo corregido en la capa de encima cambia de nombre también aquí
    inject(TeamApiService)
      .refreshList$.pipe(takeUntilDestroyed())
      .subscribe(() => this.load());
  }

  public ngOnInit(): void {
    this.load();
  }

  /** Abreviatura y estadio: «RMA · Estadio Santiago Bernabéu». */
  protected describe(team: Team): string {
    return [team.code, team.venue?.name].filter(Boolean).join(' · ');
  }

  protected open(team: Team): void {
    this.stack.push({modalKey: 'team', section: 'edit', id: String(team.id)});
  }

  private load(): void {
    const season = this.data();
    if (!season) {
      return;
    }

    this.content
      .teams(season.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (teams) => this.teams.set(teams),
        // El aviso lo da el interceptor; la lista se queda como estaba (o vacía la primera vez)
        error: () => this.teams.update((current) => current ?? []),
      });
  }
}
