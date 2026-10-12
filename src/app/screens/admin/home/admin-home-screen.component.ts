import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { PreferencesComponent } from '@edas/ng/settings/preferences.component';
import { AppCardComponent } from '@edas/ng/wrapper/components/app-card/app-card.component';
import { ButtonComponent } from '@edas/ng/wrapper/components/button/button.component';

import { SessionService } from '../../../shared/services/session.service';

/**
 * Inicio del panel: accesos a las secciones, la cuenta de la sesión y las preferencias del
 * dispositivo (aspecto, combinación de color, idioma).
 */
@Component({
  selector: 'app-admin-home-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, AppCardComponent, ButtonComponent, PreferencesComponent],
  template: `
    <div class="column gap-16 w-100">
      <div class="grid-columns">
        <edas-app-card
          icon="trophy"
          [title]="'title.competitions' | translate"
          [description]="'admin.competitions-description' | translate"
          [interactive]="true"
          routerLink="/admin/competitions"
        />
        <edas-app-card
          icon="shield"
          [title]="'title.teams' | translate"
          [description]="'admin.teams-description' | translate"
          [interactive]="true"
          routerLink="/admin/teams"
        />
      </div>

      @if (session.user(); as user) {
        <edas-app-card icon="user" [labelTranslate]="false" [title]="user.name" [description]="user.email">
          <edas-button appCardTrailing appearance="neutral" size="sm" icon="log-out" label="auth.logout" (clicked)="session.logout()"/>
        </edas-app-card>
      }

      <edas-preferences/>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `],
})
export class AdminHomeScreenComponent {
  protected readonly session = inject(SessionService);
}
