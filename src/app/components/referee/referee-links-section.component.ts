import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, input, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {LoaderComponent} from '@edas/ng/wrapper/components/loader/loader.component';
import {LinkEntity} from '../../shared/models/link';
import {Referee} from '../../shared/models/referee';
import {LinkApiService} from '../../shared/services/api/link-api.service';
import {LinkFormSectionComponent} from '../link/link-form-section.component';

/**
 * Enlaces del árbitro con los proveedores (sección `links` del modal `referee`): con qué id
 * lo conoce cada uno, y enlazarlo o desenlazarlo a mano. Es el mismo formulario que el de la
 * pantalla de enlaces.
 */
@Component({
  selector: 'app-referee-links-section',
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
export class RefereeLinksSectionComponent implements OnInit {
  /** Árbitro abierto; lo carga el modal. */
  public readonly data = input<Referee>();

  private readonly linkApi = inject(LinkApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly entity = signal<LinkEntity | null>(null);

  public ngOnInit(): void {
    const referee = this.data();
    if (!referee) {
      return;
    }

    this.linkApi
      .get('referee', referee.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      // Si falla, el aviso lo da el interceptor
      .subscribe((entity) => this.entity.set(entity));
  }
}
