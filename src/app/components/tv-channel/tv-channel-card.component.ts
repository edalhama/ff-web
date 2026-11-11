import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {ModalStackService} from '@edas/ng/navigation/modal-stack/modal-stack.service';
import {AppCardComponent, EdasAppCardStat} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {TvChannel} from '../../shared/models/tv-channel';
import {TeamCrestComponent} from '../team/team-crest.component';

/**
 * Tarjeta de canal del listado del panel: logo, nombre, plataforma, dial y partidos que emite.
 * Toda la tarjeta abre la ficha del canal.
 */
@Component({
  selector: 'app-tv-channel-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, TeamCrestComponent],
  template: `
    @if (data(); as channel) {
      <edas-app-card
        [icon]="channel.image ? null : 'tv'"
        [iconSize]="48"
        [labelTranslate]="false"
        [title]="channel.name"
        [description]="channel.platform"
        [tag]="channel.dial"
        [interactive]="true"
        [stats]="stats()"
        (cardClick)="open()"
      >
        @if (channel.image) {
          <app-team-crest appCardLeading [src]="channel.image" [size]="40"/>
        }
      </edas-app-card>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `],
})
export class TvChannelCardComponent {
  public readonly data = input<TvChannel>();

  private readonly stack = inject(ModalStackService);
  private readonly translate = inject(TranslateService);

  protected readonly stats = computed<EdasAppCardStat[]>(() => {
    const channel = this.data();
    // Lee el idioma activo (signal) para que las etiquetas cambien con él
    this.translate.currentLang();

    return [
      {
        label: this.translate.instant('tv-channel.matches'),
        value: channel?.matches_count ?? 0,
        muted: !channel?.matches_count,
      },
    ];
  });

  protected open(): void {
    this.stack.push({modalKey: 'tv-channel', section: 'edit', id: String(this.data()!.id)});
  }
}
