import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, input, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {LoaderComponent} from '@edas/ng/wrapper/components/loader/loader.component';
import {LinkEntity} from '../../shared/models/link';
import {Venue} from '../../shared/models/venue';
import {LinkApiService} from '../../shared/services/api/link-api.service';
import {LinkFormSectionComponent} from '../link/link-form-section.component';

/**
 * Enlaces del estadio con los proveedores (sección `links` del modal `venue`): con qué id lo
 * conoce cada uno, la foto que tiene cada uno, y enlazarlo o desenlazarlo a mano. Es el mismo
 * formulario que el de la pantalla de enlaces.
 */
@Component({
  selector: 'app-venue-links-section',
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
export class VenueLinksSectionComponent implements OnInit {
  /** Estadio abierto; lo carga el modal. */
  public readonly data = input<Venue>();

  private readonly linkApi = inject(LinkApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly entity = signal<LinkEntity | null>(null);

  public ngOnInit(): void {
    const venue = this.data();
    if (!venue) {
      return;
    }

    this.linkApi
      .get('venue', venue.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      // Si falla, el aviso lo da el interceptor
      .subscribe((entity) => this.entity.set(entity));
  }
}
