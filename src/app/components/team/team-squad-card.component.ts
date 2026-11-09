import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {AppCardComponent, EdasAppCardStat} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {playerModalId, SquadMember} from '../../shared/models/player';
import {ageOn} from '../../shared/players/squad';
import {PlayerStatusCellComponent} from '../player/player-cells.component';
import {PlayerRatingBadgeComponent} from '../player/player-rating-badge.component';

/**
 * Tarjeta de un jugador en la plantilla de un equipo: foto, nombre, dorsal, posición, país, edad,
 * valoración y estado. Los que han dejado el equipo salen atenuados. Toda la tarjeta abre la
 * ficha del jugador en la competición de la plantilla.
 */
@Component({
  selector: 'app-team-squad-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, PlayerRatingBadgeComponent, PlayerStatusCellComponent],
  host: {'[class.gone]': 'data()?.active === false'},
  template: `
    @if (data(); as member) {
      <edas-app-card
        [icon]="member.player.photo ? null : 'user'"
        [iconSize]="48"
        [labelTranslate]="false"
        [title]="member.player.name"
        [description]="member.player.full_name !== member.player.name ? member.player.full_name : null"
        [tag]="member.shirt_number != null ? '#' + member.shirt_number : null"
        [interactive]="true"
        [stats]="stats()"
        (cardClick)="open()"
      >
        @if (member.player.photo; as photo) {
          <img appCardLeading class="photo" [src]="photo" alt="" width="48" height="48" loading="lazy" (error)="hideImage($event)"/>
        }
        <div class="state">
          @if (member.player.rating; as rating) {
            <app-player-rating-badge [rating]="rating"/>
          }
          <app-player-status-cell [data]="member"/>
        </div>
      </edas-app-card>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    :host(.gone) {
      opacity: 0.55;
    }

    .photo {
      display: block;
      width: 48px;
      height: 48px;
      object-fit: cover;
      border-radius: 50%;
      background: rgba(var(--edas-tone-neutral-rgb), 0.14);
    }

    .state {
      display: flex;
      align-items: center;
      gap: var(--edas-space-2);
    }
  `],
})
export class TeamSquadCardComponent {
  public readonly data = input<SquadMember>();
  /** Competición de la plantilla: con ella se abre la ficha. */
  public readonly competitionId = input<number | null>(null);

  private readonly stack = inject(ModalStackService);
  private readonly translate = inject(TranslateService);
  private readonly today = new Date();

  protected readonly stats = computed<EdasAppCardStat[]>(() => {
    const member = this.data();
    // Lee el idioma activo (signal) para que las etiquetas cambien con él
    this.translate.currentLang();
    const age = ageOn(member?.player.birth_date, this.today);

    return [
      {
        label: this.translate.instant('team.squad-position'),
        value: member?.position ? this.translate.instant(`enum.player-position.${member.position}`) : '—',
        muted: !member?.position,
      },
      {label: this.translate.instant('team.squad-country'), value: member?.player.country?.name ?? '—', muted: !member?.player.country},
      {label: this.translate.instant('team.squad-age'), value: age != null ? String(age) : '—', muted: age == null},
    ];
  });

  /** Imagen que no carga: se deja el hueco (el círculo de fondo) en vez del icono roto. */
  protected hideImage(event: Event): void {
    (event.target as HTMLImageElement).removeAttribute('src');
  }

  protected open(): void {
    this.stack.push({modalKey: 'player', section: 'info', id: playerModalId(this.data()!.player.id, this.competitionId())});
  }
}
