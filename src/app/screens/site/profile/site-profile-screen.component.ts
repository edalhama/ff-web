import {ChangeDetectionStrategy, Component} from '@angular/core';
import {PreferencesComponent} from '@edas/ng/settings/preferences.component';

/**
 * Ajustes del visitante: aspecto, combinación de color e idioma. Sin cuenta: el acceso al
 * panel no forma parte de la parte pública.
 */
@Component({
  selector: 'app-site-profile-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PreferencesComponent],
  template: `
    <div class="site-page">
      <edas-preferences [showCookies]="false"/>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `],
})
export class SiteProfileScreenComponent {}
