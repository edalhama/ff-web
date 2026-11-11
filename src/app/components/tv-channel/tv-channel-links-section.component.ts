import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, input, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {LoaderComponent} from '@edas/ng/wrapper/components/loader/loader.component';
import {LinkEntity} from '../../shared/models/link';
import {TvChannel} from '../../shared/models/tv-channel';
import {LinkApiService} from '../../shared/services/api/link-api.service';
import {LinkFormSectionComponent} from '../link/link-form-section.component';

/**
 * Enlaces del canal con los proveedores (sección `links` del modal `tv-channel`): con qué id lo
 * conoce cada uno (BeSoccer puede tener varios; aquí sale el principal, y todos en la ficha), y
 * enlazarlo o desenlazarlo a mano. Es el mismo formulario que el de la pantalla de enlaces.
 */
@Component({
  selector: 'app-tv-channel-links-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LinkFormSectionComponent, LoaderComponent],
  template: `
    @if (entity(); as current) {
      <app-link-form-section [data]="current"/>
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
export class TvChannelLinksSectionComponent implements OnInit {
  /** Canal abierto; lo carga el modal. */
  public readonly data = input<TvChannel>();

  private readonly linkApi = inject(LinkApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly entity = signal<LinkEntity | null>(null);

  public ngOnInit(): void {
    const channel = this.data();
    if (!channel) {
      return;
    }

    this.linkApi
      .get('tv_channel', channel.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      // Si falla, el aviso lo da el interceptor
      .subscribe((entity) => this.entity.set(entity));
  }
}
