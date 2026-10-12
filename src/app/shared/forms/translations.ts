import {edasConfig} from '../../core/edas.config';
import {changedFields, textOrNull} from './form-values';

/**
 * Textos traducibles de una entidad con página pública (competición, equipo…): los campos de
 * su tabla `<entidad>_translations` en ff-api.
 */
export interface TranslatableTexts {
  name: string;
  short_name: string | null;
  slug: string;
  seo_title: string | null;
  seo_description: string | null;
  content: string | null;
}

export type TextField = keyof TranslatableTexts;

/** Textos de un idioma tal como están en los campos (siempre texto; vacío = sin valor). */
export type TextInputs = Record<TextField, string>;

/** Textos de todos los idiomas, por código de idioma. */
export type TextInputsByLanguage = Record<string, TextInputs>;

export const TEXT_FIELDS: readonly TextField[] = ['name', 'short_name', 'slug', 'seo_title', 'seo_description', 'content'];

/** Idiomas del contenido, los mismos que `locales` en ff-api. */
export const CONTENT_LANGUAGES: readonly string[] = edasConfig.languages;

/**
 * Idioma principal: el único en el que el nombre es obligatorio. Los demás lo heredan si se
 * dejan vacíos, porque la API exige nombre en todos.
 */
export const PRIMARY_LANGUAGE = CONTENT_LANGUAGES[0];

/** Nombre de un campo traducible en los errores de la API: `translations.es.name`. */
export function translationField(language: string, field: TextField): string {
  return `translations.${language}.${field}`;
}

/** Campos de formulario a partir de las traducciones de una entidad (o vacíos, en un alta). */
export function textInputsOf(translations?: Record<string, Partial<TranslatableTexts>>): TextInputsByLanguage {
  return Object.fromEntries(
    CONTENT_LANGUAGES.map((language) => [
      language,
      Object.fromEntries(TEXT_FIELDS.map((field) => [field, translations?.[language]?.[field] ?? ''])) as TextInputs,
    ]),
  );
}

/** ¿Está el nombre en el idioma principal? Es lo mínimo para poder guardar. */
export function hasPrimaryName(texts: TextInputsByLanguage): boolean {
  return texts[PRIMARY_LANGUAGE].name.trim() !== '';
}

/** Textos de un idioma como los espera la API: recortados y con `null` en los vacíos. */
function valuesOf(texts: TextInputsByLanguage, language: string): Partial<TranslatableTexts> {
  const inputs = texts[language];

  const values: Partial<TranslatableTexts> = {
    name: inputs.name.trim() || texts[PRIMARY_LANGUAGE].name.trim(),
    short_name: textOrNull(inputs.short_name),
    seo_title: textOrNull(inputs.seo_title),
    seo_description: textOrNull(inputs.seo_description),
    content: textOrNull(inputs.content),
  };

  // Sin slug no se manda: en un alta la API lo genera del nombre; en una edición conserva el que hay
  const slug = textOrNull(inputs.slug);
  if (slug !== null) {
    values.slug = slug;
  }

  return values;
}

/** `translations` de un alta: todos los idiomas, completos. */
export function translationsPayload(texts: TextInputsByLanguage): Record<string, Partial<TranslatableTexts>> {
  return Object.fromEntries(CONTENT_LANGUAGES.map((language) => [language, valuesOf(texts, language)]));
}

/**
 * `translations` de una edición: solo los idiomas y los campos que han cambiado respecto a
 * `original`. Devuelve `undefined` si no ha cambiado ninguno.
 */
export function translationsChanges(
  original: TextInputsByLanguage,
  current: TextInputsByLanguage,
): Record<string, Partial<TranslatableTexts>> | undefined {
  const changes: Record<string, Partial<TranslatableTexts>> = {};

  for (const language of CONTENT_LANGUAGES) {
    const changed = changedFields(valuesOf(original, language), valuesOf(current, language));

    if (Object.keys(changed).length > 0) {
      changes[language] = changed;
    }
  }

  return Object.keys(changes).length > 0 ? changes : undefined;
}
