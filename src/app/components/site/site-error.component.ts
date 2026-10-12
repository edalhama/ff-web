import {ChangeDetectionStrategy, Component} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';

/** Los datos de la página no han llegado (la API no responde): se dice y se ofrece reintentar. */
@Component({
  selector: 'app-site-error',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    <div class="site-empty" role="alert">
      <p class="site-empty__title">{{ 'site.error-title' | translate }}</p>
      <p>{{ 'site.error-description' | translate }}</p>
      <button type="button" class="site-link-button" (click)="reload()">{{ 'site.error-retry' | translate }}</button>
    </div>
  `,
})
export class SiteErrorComponent {
  protected reload(): void {
    location.reload();
  }
}
