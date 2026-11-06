import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {AppCardComponent, EdasAppCardStat} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {Referee} from '../../shared/models/referee';
import {ageOn} from '../../shared/players/squad';

/**
 * Tarjeta de árbitro del listado del panel: nombre, nombre corto, país, edad y partidos
 * arbitrados. Toda la tarjeta abre la ficha del árbitro.
 */
@Component({
  selector: 'app-referee-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent],
  template: `
    @if (data(); as referee) {
      <edas-app-card
        icon="flag"
        [iconSize]="48"
        [labelTranslate]="false"
        [title]="referee.name"
        [description]="referee.short_name"
        [tag]="referee.country?.code ?? null"
        [interactive]="true"
        [stats]="stats()"
        (cardClick)="open()"
      />
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `],
})
export class RefereeCardComponent {
  public readonly data = input<Referee>();

  private readonly stack = inject(ModalStackService);
  private readonly translate = inject(TranslateService);
  private readonly today = new Date();

  protected readonly stats = computed<EdasAppCardStat[]>(() => {
    const referee = this.data();
    // Lee el idioma activo (signal) para que las etiquetas cambien con él
    this.translate.currentLang();
    const age = ageOn(referee?.birth_date, this.today);

    return [
      {
        label: this.translate.instant('referee.country'),
        value: referee?.country?.name ?? '—',
        muted: !referee?.country,
      },
      {
        label: this.translate.instant('referee.age'),
        value: age != null ? this.translate.instant('player.age', {age}) : '—',
        muted: age == null,
      },
      {
        label: this.translate.instant('referee.matches'),
        value: referee?.designations_count ?? 0,
        muted: !referee?.designations_count,
      },
    ];
  });

  protected open(): void {
    this.stack.push({modalKey: 'referee', section: 'edit', id: String(this.data()!.id)});
  }
}
