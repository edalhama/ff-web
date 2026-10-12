import {hasPrimaryName, textInputsOf, translationField, translationsChanges, translationsPayload} from './translations';

describe('translations', () => {
  const laliga = {
    es: {name: 'LaLiga', short_name: null, slug: 'laliga', seo_title: null, seo_description: 'La liga española', content: null},
    en: {name: 'LaLiga', short_name: 'Liga', slug: 'laliga', seo_title: null, seo_description: null, content: null},
  };

  it('prepara los campos de cada idioma, vacíos donde no hay valor', () => {
    const empty = textInputsOf();

    expect(Object.keys(empty)).toEqual(['es', 'en']);
    expect(empty['es']).toEqual({name: '', short_name: '', slug: '', seo_title: '', seo_description: '', content: ''});

    const inputs = textInputsOf(laliga);

    expect(inputs['es'].seo_description).toBe('La liga española');
    expect(inputs['en'].short_name).toBe('Liga');
    expect(inputs['en'].content).toBe('');
  });

  it('nombra los campos como en los errores de la API', () => {
    expect(translationField('en', 'seo_title')).toBe('translations.en.seo_title');
  });

  it('solo exige el nombre en el idioma principal', () => {
    const inputs = textInputsOf();

    expect(hasPrimaryName(inputs)).toBeFalse();

    inputs['en'].name = 'LaLiga';
    expect(hasPrimaryName(inputs)).toBeFalse();

    inputs['es'].name = '  LaLiga ';
    expect(hasPrimaryName(inputs)).toBeTrue();
  });

  it('en un alta manda todos los idiomas, y el que no tiene nombre hereda el del principal', () => {
    const inputs = textInputsOf();
    inputs['es'].name = ' LaLiga EA Sports ';
    inputs['es'].seo_title = 'LaLiga';

    expect(translationsPayload(inputs)).toEqual({
      // Sin slug: lo genera la API
      es: {name: 'LaLiga EA Sports', short_name: null, seo_title: 'LaLiga', seo_description: null, content: null},
      en: {name: 'LaLiga EA Sports', short_name: null, seo_title: null, seo_description: null, content: null},
    });
  });

  it('en una edición manda solo lo que cambia', () => {
    const original = textInputsOf(laliga);

    expect(translationsChanges(original, textInputsOf(laliga))).toBeUndefined();

    const current = textInputsOf(laliga);
    current['es'].name = 'LaLiga EA Sports';
    current['es'].seo_description = '';

    expect(translationsChanges(original, current)).toEqual({es: {name: 'LaLiga EA Sports', seo_description: null}});
  });

  it('un slug vaciado no se manda: la API conserva el que hay', () => {
    const current = textInputsOf(laliga);
    current['en'].slug = '';

    expect(translationsChanges(textInputsOf(laliga), current)).toBeUndefined();
  });

  it('vaciar el nombre de un idioma secundario lo deja heredado del principal', () => {
    const original = textInputsOf({...laliga, en: {...laliga.en, name: 'The Spanish League'}});
    const current = textInputsOf({...laliga, en: {...laliga.en, name: ''}});

    expect(translationsChanges(original, current)).toEqual({en: {name: 'LaLiga'}});
  });
});
