import {ChangeDetectionStrategy, Component, computed, input, signal} from '@angular/core';
import {BadgeComponent} from '@edas/ng/wrapper/components/badge/badge.component';
import {IconComponent} from '@edas/ng/wrapper/components/icon/icon.component';
import {Team} from '../../shared/models/team';

/** Celda de nombre de la tabla de equipos: escudo (o icono genérico con su color), nombre y abreviatura. */
@Component({
  selector: 'app-team-name-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    @if (data(); as team) {
      @if (crest(); as url) {
        <img class="crest" [src]="url" alt="" width="32" height="32" loading="lazy" (error)="failedCrest.set(url)"/>
      } @else {
        <span class="icon"><Icon icon="shield" size="sm" [style.color]="team.primary_color"/></span>
      }
      <span class="text">
        <span class="name">{{ team.name ?? '—' }}</span>
        @if (team.code) {
          <span class="code">{{ team.code }}</span>
        }
      </span>
    }
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      gap: var(--edas-space-2);
      max-width: 18rem;
    }

    .crest {
      width: 32px;
      height: 32px;
      flex: none;
      object-fit: contain;
    }

    .icon {
      display: inline-flex;
      flex: none;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
    }

    .text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .name {
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .code {
      font-size: 0.8125rem;
      color: var(--edas-muted-text-color);
    }
  `],
})
export class TeamNameCellComponent {
  public readonly data = input<Team>();

  protected readonly failedCrest = signal<string | null>(null);

  protected readonly crest = computed(() => {
    const url = this.data()?.crest ?? null;

    return url && url !== this.failedCrest() ? url : null;
  });
}

/** Celda de estado: en un equipo se dice «activo», no «activa». */
@Component({
  selector: 'app-team-active-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent],
  template: `
    @if (data(); as team) {
      <edas-badge
        [appearance]="team.active ? 'success' : 'neutral'"
        [icon]="team.active ? 'check-circle' : 'x-circle'"
        [label]="team.active ? 'team.active' : 'team.inactive'"
        size="s"
      />
    }
  `,
})
export class TeamActiveCellComponent {
  public readonly data = input<Team>();
}
