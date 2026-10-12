import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Injector, afterNextRender, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { apiErrorStatus } from '@edas/ng';
import { BrandLogoComponent } from '@edas/ng/brand/brand-logo.component';
import { EdasBrandMarkDirective } from '@edas/ng/brand/brand-mark';
import { ButtonComponent } from '@edas/ng/wrapper/components/button/button.component';
import { IconComponent } from '@edas/ng/wrapper/components/icon/icon.component';
import { InputComponent } from '@edas/ng/wrapper/components/input/input.component';
import { TypographyComponent } from '@edas/ng/wrapper/components/typography/typography.component';
import { finalize } from 'rxjs';

import { SessionService } from '../../../shared/services/session.service';

/**
 * Acceso al panel. Diseño de edas-layout/auth.less (`.edas-auth*`): dos columnas desde 1024px
 * (panel de marca y tarjeta con el formulario); en móvil, solo el formulario.
 */
@Component({
  selector: 'app-login-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, BrandLogoComponent, EdasBrandMarkDirective, ButtonComponent, IconComponent, InputComponent, TypographyComponent],
  template: `
    <div class="edas-auth">
      <div class="edas-auth__brand">
        <div class="column gap-16">
          <p class="edas-auth__brand-title">{{ 'landing.hero-title' | translate }}</p>
          <Typography variant="body-l" class="text-muted" label="landing.hero-subtitle"/>
        </div>

        <ul class="edas-auth__features">
          @for (feature of features; track feature.titleKey) {
            <li class="row gap-12">
              <span class="edas-auth__feature-icon"><Icon [icon]="feature.icon" size="md"/></span>
              <span class="tui-text_body-m bold">{{ feature.titleKey | translate }}</span>
            </li>
          }
        </ul>
      </div>

      <div class="edas-auth__card-slot">
        <div class="edas-auth__card">
          <div class="column gap-12">
            <a routerLink="/" class="edas-auth__logo-link">
              <edas-brand-logo class="edas-auth__logo" edasBrandMark/>
            </a>
            <h1 class="edas-auth__title">{{ 'auth.login-heading' | translate }}</h1>
            <Typography variant="body-m" class="text-muted" label="auth.login-subtitle"/>
          </div>

          <form class="column gap-16" (submit)="$event.preventDefault(); login()" (keydown.enter)="submitOnEnter($event)">
            <edas-input label="auth.email" type="email" iconStart="mail" name="email" autocomplete="email"
              placeholder="auth.email-hint" [disabled]="submitting()"
              [value]="email()" (valueChange)="email.set($event); loginError.set(null)"/>

            <edas-input label="auth.password" type="password" iconStart="key-round" name="password"
              autocomplete="current-password" placeholder="auth.password" [showPasswordToggle]="true"
              [disabled]="submitting()" [invalid]="!!loginError()" [errorText]="loginError() ?? ''"
              [value]="password()" (valueChange)="password.set($event); loginError.set(null)"/>

            <edas-button type="submit" appearance="primary" emphasis="solid" size="lg" [fullWidth]="true"
              [loading]="submitting()" [disabled]="!canSubmit()"
              label="auth.login-btn" [icon]="submitting() ? null : 'log-in'"/>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `],
})
export class LoginScreenComponent {
  private readonly session = inject(SessionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly features = [
    { icon: 'trophy', titleKey: 'landing.check-competitions' },
    { icon: 'star', titleKey: 'landing.check-scores' },
    { icon: 'languages', titleKey: 'landing.check-languages' },
  ];

  protected readonly email = signal('');
  protected readonly password = signal('');
  /** Petición en curso: bloquea campos y botón. */
  protected readonly submitting = signal(false);
  /** Clave i18n del error que se pinta bajo la contraseña (sin aviso global, ver SessionService.logIn). */
  protected readonly loginError = signal<string | null>(null);

  protected canSubmit(): boolean {
    return !this.submitting() && /^\S+@\S+\.\S+$/.test(this.email().trim()) && this.password() !== '';
  }

  protected login(): void {
    if (!this.canSubmit()) {
      return;
    }

    this.loginError.set(null);
    this.submitting.set(true);

    this.session.logIn(this.email().trim(), this.password()).pipe(
      finalize(() => this.submitting.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      error: (error: unknown) => {
        this.loginError.set(this.errorKey(error));
        this.password.set('');
        // Tras reactivar el campo (deja de estar `disabled` al acabar la petición).
        afterNextRender(() => {
          this.host.nativeElement.querySelector<HTMLInputElement>('input[name="password"]')?.focus();
        }, { injector: this.injector });
      },
    });
  }

  /**
   * Enter en cualquier campo envía el formulario. No se deja al envío implícito del navegador,
   * que depende de que el botón esté habilitado en ese instante. Nunca a mitad de una
   * composición IME.
   */
  protected submitOnEnter(event: Event): void {
    const keyboard = event as KeyboardEvent;
    if (keyboard.isComposing || !(keyboard.target instanceof HTMLInputElement)) {
      return;
    }
    keyboard.preventDefault();
    this.login();
  }

  private errorKey(error: unknown): string {
    if (error instanceof Error && error.message.startsWith('auth.')) {
      return error.message;
    }

    switch (apiErrorStatus(error)) {
      case 401: return 'auth.login-invalid';
      case 403: return 'auth.login-inactive';
      case 429: return 'auth.login-throttled';
      default: return 'alert.error-generic';
    }
  }
}
