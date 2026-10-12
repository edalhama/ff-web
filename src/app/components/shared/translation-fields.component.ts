import {ChangeDetectionStrategy, Component, computed, effect, input, output, signal, untracked} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {InputComponent} from '@edas/ng/wrapper/components/input/input.component';
import {EdasTabItem, TabsComponent} from '@edas/ng/wrapper/components/tabs/tabs.component';
import {TextareaComponent} from '@edas/ng/wrapper/components/textarea/textarea.component';
import {ServerErrors} from '../../shared/forms/server-errors';
import {
  CONTENT_LANGUAGES,
  hasPrimaryName,
  PRIMARY_LANGUAGE,
  TEXT_FIELDS,
  TextField,
  TextInputsByLanguage,
  translationField,
} from '../../shared/forms/translations';

/**
 * Textos por idioma de una entidad con página pública (nombre, slug y lo que ven los
 * buscadores), con una pestaña por idioma. Lo usan los formularios de competición y de equipo.
 *
 * El nombre solo es obligatorio en el idioma principal. La pestaña que tiene algo pendiente
 * lo avisa con un icono, y si el servidor rechaza un campo de otro idioma se cambia a su
 * pestaña, para que el error no quede escondido.
 */
@Component({
  selector: 'app-translation-fields',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InputComponent, TabsComponent, TextareaComponent, TranslatePipe],
  template: `
    <h3 class="form-title">{{ 'texts.title' | translate }}</h3>

    <edas-tabs [tabs]="tabs()" [activeKey]="language()" (activeKeyChange)="language.set($event)"/>

    @let lang = language();
    @let text = texts()[lang];

    <div class="grid-columns">
      <edas-input
        label="texts.name"
        [value]="text.name"
        [required]="lang === primary"
        [hint]="lang === primary ? '' : 'texts.name-hint-fallback'"
        [invalid]="errors().has(field(lang, 'name'))"
        [errorText]="errors().errorText(field(lang, 'name'))"
        (valueChange)="set(lang, 'name', $event)"
      />

      <edas-input
        label="texts.short-name"
        [value]="text.short_name"
        [invalid]="errors().has(field(lang, 'short_name'))"
        [errorText]="errors().errorText(field(lang, 'short_name'))"
        (valueChange)="set(lang, 'short_name', $event)"
      />

      <edas-input
        label="texts.slug"
        [value]="text.slug"
        [hint]="editing() ? 'texts.slug-hint-edit' : 'texts.slug-hint-new'"
        [invalid]="errors().has(field(lang, 'slug'))"
        [errorText]="errors().errorText(field(lang, 'slug'))"
        (valueChange)="set(lang, 'slug', $event)"
      />
    </div>

    <edas-input
      label="texts.seo-title"
      [value]="text.seo_title"
      hint="texts.seo-title-hint"
      [invalid]="errors().has(field(lang, 'seo_title'))"
      [errorText]="errors().errorText(field(lang, 'seo_title'))"
      (valueChange)="set(lang, 'seo_title', $event)"
    />

    <edas-textarea
      label="texts.seo-description"
      [value]="text.seo_description"
      [rows]="2"
      hint="texts.seo-description-hint"
      [invalid]="errors().has(field(lang, 'seo_description'))"
      [errorText]="errors().errorText(field(lang, 'seo_description'))"
      (valueChange)="set(lang, 'seo_description', $event)"
    />

    <edas-textarea
      label="texts.content"
      [value]="text.content"
      [rows]="4"
      hint="texts.content-hint"
      [invalid]="errors().has(field(lang, 'content'))"
      [errorText]="errors().errorText(field(lang, 'content'))"
      (valueChange)="set(lang, 'content', $event)"
    />
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--edas-space-4);
    }

    .form-title {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }
  `],
})
export class TranslationFieldsComponent {
  /** Textos de todos los idiomas, tal como están en los campos. */
  public readonly texts = input.required<TextInputsByLanguage>();
  /** Errores del servidor del formulario que lo contiene. */
  public readonly errors = input.required<ServerErrors>();
  /** Edición de algo que ya existe (cambia la ayuda del slug). */
  public readonly editing = input<boolean>(false);

  /** Los textos con el cambio aplicado. */
  public readonly textsChange = output<TextInputsByLanguage>();

  protected readonly primary = PRIMARY_LANGUAGE;
  protected readonly language = signal<string>(PRIMARY_LANGUAGE);
  protected readonly field = translationField;

  protected readonly tabs = computed<EdasTabItem[]>(() =>
    CONTENT_LANGUAGES.map((language) => ({
      key: language,
      labelKey: `lang.${language}`,
      icon: this.needsAttention(language) ? 'circle-alert' : undefined,
    })),
  );

  constructor() {
    // Si el servidor rechaza algo de un idioma que no se está viendo, se lleva a su pestaña
    effect(() => {
      const errors = this.errors();
      const withErrors = CONTENT_LANGUAGES.filter((language) => TEXT_FIELDS.some((name) => errors.has(translationField(language, name))));

      untracked(() => {
        if (withErrors.length > 0 && !withErrors.includes(this.language())) {
          this.language.set(withErrors[0]);
        }
      });
    });
  }

  protected set(language: string, name: TextField, value: string): void {
    const texts = this.texts();

    this.errors().clear(translationField(language, name));
    this.textsChange.emit({...texts, [language]: {...texts[language], [name]: value}});
  }

  /** Falta el nombre en el idioma principal o el servidor ha rechazado algo de este idioma. */
  private needsAttention(language: string): boolean {
    // Sin ese nombre no se puede guardar: que se vea aunque se esté en otra pestaña
    if (language === PRIMARY_LANGUAGE && language !== this.language() && !hasPrimaryName(this.texts())) {
      return true;
    }

    return TEXT_FIELDS.some((name) => this.errors().has(translationField(language, name)));
  }
}
