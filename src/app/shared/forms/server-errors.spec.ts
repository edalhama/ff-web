import {HttpErrorResponse} from '@angular/common/http';
import {TestBed} from '@angular/core/testing';
import {provideTranslateService, TranslateService} from '@ngx-translate/core';
import {ServerErrors} from './server-errors';

describe('ServerErrors', () => {
  let translate: TranslateService;
  let errors: ServerErrors;

  const response = (fields: Record<string, string[]>) =>
    new HttpErrorResponse({status: 400, error: {success: false, data: {error: JSON.stringify(fields)}}});

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideTranslateService()]});
    translate = TestBed.inject(TranslateService);
    translate.use('es');
    errors = new ServerErrors(translate);
  });

  it('registra cada mensaje bajo una clave i18n que los campos de edas-ng saben traducir', () => {
    const fields = errors.capture(response({'translations.es.slug': ['El valor del campo slug ya está en uso.']}));

    expect(fields).toEqual(['translations.es.slug']);
    expect(errors.has('translations.es.slug')).toBeTrue();
    expect(errors.errorText('translations.es.slug')).toBe('server.translations-es-slug');
    expect(translate.instant('server.translations-es-slug')).toBe('El valor del campo slug ya está en uso.');
  });

  it('un campo sin error no tiene texto', () => {
    expect(errors.has('label')).toBeFalse();
    expect(errors.errorText('label')).toBe('');
  });

  it('olvida el error de un campo al corregirlo, y todos al reenviar', () => {
    errors.capture(response({label: ['Obligatorio.'], start_year: ['Obligatorio.']}));

    errors.clear('label');
    expect(errors.has('label')).toBeFalse();
    expect(errors.has('start_year')).toBeTrue();

    errors.clear();
    expect(errors.has('start_year')).toBeFalse();
  });

  it('una respuesta que no es de validación deja el formulario sin errores', () => {
    errors.capture(response({label: ['Obligatorio.']}));

    expect(errors.capture(new HttpErrorResponse({status: 409, error: {message: 'Conflicto'}}))).toEqual([]);
    expect(errors.has('label')).toBeFalse();
  });
});
