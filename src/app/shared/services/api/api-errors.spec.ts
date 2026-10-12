import {HttpErrorResponse} from '@angular/common/http';
import {validationErrors} from './api-errors';

/** Respuesta 400 de ff-api: `data.error` lleva todos los errores como JSON. */
function validationResponse(errors: Record<string, string[]>): HttpErrorResponse {
  return new HttpErrorResponse({
    status: 400,
    error: {
      success: false,
      message: Object.values(errors)[0]?.[0],
      field: Object.keys(errors),
      data: {error: JSON.stringify(errors)},
    },
  });
}

describe('validationErrors', () => {
  it('devuelve el primer mensaje de cada campo', () => {
    const error = validationResponse({
      'translations.es.slug': ['El valor del campo slug ya está en uso.'],
      tier: ['El campo nivel debe ser al menos 1.', 'El campo nivel debe ser un número entero.'],
    });

    expect(validationErrors(error)).toEqual({
      'translations.es.slug': 'El valor del campo slug ya está en uso.',
      tier: 'El campo nivel debe ser al menos 1.',
    });
  });

  it('ignora las respuestas que no son de validación', () => {
    const conflict = new HttpErrorResponse({status: 409, error: {success: false, message: 'No se puede eliminar.'}});

    expect(validationErrors(conflict)).toEqual({});
    expect(validationErrors(new Error('sin red'))).toEqual({});
  });

  it('no falla si `data.error` no es JSON', () => {
    const error = new HttpErrorResponse({status: 400, error: {success: false, data: {error: 'no-json'}}});

    expect(validationErrors(error)).toEqual({});
  });
});
