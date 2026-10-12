import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {IconComponent} from '@edas/ng/wrapper/components/icon/icon.component';
import {Competition, competitionIcon} from '../../shared/models/competition';

/** Celda de nombre de la tabla de competiciones: icono del tipo, nombre y país. */
@Component({
  selector: 'app-competition-name-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, TranslatePipe],
  template: `
    @if (data(); as competition) {
      <Icon [icon]="icon()" size="sm"/>
      <span class="text">
        <span class="name">{{ competition.name ?? '—' }}</span>
        <span class="country">{{ competition.country?.name ?? ('competition.international' | translate) }}</span>
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

    .country {
      font-size: 0.8125rem;
      color: var(--edas-muted-text-color);
    }
  `],
})
export class CompetitionNameCellComponent {
  public readonly data = input<Competition>();

  protected readonly icon = computed(() => competitionIcon(this.data()?.type));
}

/** Celda de tipo: el valor del enum, traducido. */
@Component({
  selector: 'app-competition-type-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    @if (data(); as competition) {
      {{ 'enum.competition-type.' + competition.type | translate }}
    }
  `,
})
export class CompetitionTypeCellComponent {
  public readonly data = input<Competition>();
}
