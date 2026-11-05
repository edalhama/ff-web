import {ChangeDetectionStrategy, Component, input, signal} from '@angular/core';

/**
 * Escudo de un equipo (o logo de una competición): la imagen que da la API, ya en nuestro
 * almacenamiento (ver ff-api/docs/ASSETS.md). Decorativa: el nombre va siempre al lado.
 *
 * Sin imagen no ocupa sitio, salvo con `reserve`, que deja el hueco para que las filas de una
 * tabla o de una lista de partidos sigan alineadas. Una imagen que no carga tampoco deja un
 * icono roto: se oculta.
 */
@Component({
  selector: 'app-team-crest',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--crest-size.px]': 'size()',
    '[class.crest--empty]': '!src()',
    '[class.crest--reserve]': 'reserve()',
  },
  template: `
    @if (src(); as url) {
      <img [src]="url" alt="" [width]="size()" [height]="size()" loading="lazy" decoding="async" [class.failed]="failed() === url" (error)="failed.set(url)"/>
    }
  `,
  styles: [`
    :host {
      display: inline-flex;
      flex: none;
      align-items: center;
      justify-content: center;
      width: var(--crest-size);
      height: var(--crest-size);
      vertical-align: middle;
    }

    :host(.crest--empty:not(.crest--reserve)) {
      display: none;
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .failed {
      visibility: hidden;
    }
  `],
})
export class TeamCrestComponent {
  /** URL de la imagen; sin ella, nada (o un hueco, con `reserve`). */
  public readonly src = input<string | null | undefined>();
  /** Lado, en píxeles. */
  public readonly size = input(24);
  /** Deja el hueco aunque no haya imagen. */
  public readonly reserve = input(false);

  /** URL que no ha cargado (se oculta); si cambia la imagen, se vuelve a intentar. */
  protected readonly failed = signal<string | null>(null);
}
