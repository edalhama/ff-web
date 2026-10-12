import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {AppCardComponent} from '@edas/ng/wrapper/components/app-card/app-card.component';
import {SettingItemComponent} from '@edas/ng/wrapper/components/setting-item/setting-item.component';
import {SwitchComponent} from '@edas/ng/wrapper/components/switch/switch.component';

/**
 * Campos que la sincronización ya no toca (`locked_fields`), con un interruptor por campo para
 * devolvérselos. Un campo se bloquea solo al editarlo a mano; aquí solo se desbloquea, y el
 * cambio se aplica al guardar el formulario (`unlock_fields`).
 */
@Component({
  selector: 'app-locked-fields',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCardComponent, SettingItemComponent, SwitchComponent, TranslatePipe],
  template: `
    @if (fields().length > 0) {
      <edas-app-card
        icon="lock"
        [iconSize]="48"
        [title]="'common.locked-title' | translate"
        [description]="'common.locked-description' | translate"
      >
        <p class="locked-help">{{ 'common.locked-help' | translate }}</p>

        @for (field of rows(); track field.name) {
          <edas-setting-item
            [label]="field.labelKey | translate"
            [description]="(field.unlocked ? 'common.locked-off' : 'common.locked-on') | translate"
          >
            <edas-switch
              [checked]="!field.unlocked"
              [ariaLabel]="field.labelKey | translate"
              [labelTranslate]="false"
              (checkedChange)="toggle(field.name, $event)"
            />
          </edas-setting-item>
        }
      </edas-app-card>
    }
  `,
  styles: [`
    :host {
      display: block;
    }

    :host(:empty) {
      display: none;
    }

    .locked-help {
      margin: 0 0 var(--edas-space-2);
      font-size: 0.875rem;
      line-height: 1.4;
      color: var(--edas-muted-text-color);
    }
  `],
})
export class LockedFieldsComponent {
  /** Campos bloqueados ahora mismo en la entidad. */
  public readonly fields = input<readonly string[]>([]);
  /** Campos que se van a desbloquear al guardar. */
  public readonly unlocked = input<readonly string[]>([]);
  /** Prefijo de la clave i18n de cada campo: `competition.field` → `competition.field-tier`. */
  public readonly labelPrefix = input.required<string>();

  public readonly unlockedChange = output<string[]>();

  protected readonly rows = computed(() =>
    this.fields().map((name) => ({
      name,
      labelKey: `${this.labelPrefix()}-${name.replace(/_/g, '-')}`,
      unlocked: this.unlocked().includes(name),
    })),
  );

  protected toggle(field: string, locked: boolean): void {
    const rest = this.unlocked().filter((name) => name !== field);
    this.unlockedChange.emit(locked ? rest : [...rest, field]);
  }
}
