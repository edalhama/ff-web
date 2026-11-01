import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, input, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {LoaderComponent} from '@edas/ng/wrapper/components/loader/loader.component';
import {LinkEntity} from '../../shared/models/link';
import {PlayerCard} from '../../shared/models/player';
import {LinkApiService} from '../../shared/services/api/link-api.service';
import {LinkFormSectionComponent} from '../link/link-form-section.component';

/**
 * Enlaces del jugador con los proveedores (sección `links` del modal `player`): con qué id lo
 * conoce cada uno, y enlazarlo o desenlazarlo a mano. Es el mismo formulario que el de la
 * pantalla de enlaces.
 */
@Component({
  selector: 'app-player-links-section',
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
export class PlayerLinksSectionComponent implements OnInit {
  /** Jugador abierto; lo carga el modal. */
  public readonly data = input<PlayerCard>();

  private readonly linkApi = inject(LinkApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly entity = signal<LinkEntity | null>(null);

  public ngOnInit(): void {
    const player = this.data();
    if (!player) {
      return;
    }

    this.linkApi
      .get('player', player.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      // Si falla, el aviso lo da el interceptor
      .subscribe((entity) => this.entity.set(entity));
  }
}
