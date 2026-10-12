import {changedFields, integerOrNull, textOrNull} from './form-values';

describe('form-values', () => {
  it('textOrNull recorta y deja en null lo vacío', () => {
    expect(textOrNull('  LaLiga ')).toBe('LaLiga');
    expect(textOrNull('   ')).toBeNull();
    expect(textOrNull('')).toBeNull();
  });

  it('integerOrNull convierte enteros y deja pasar lo demás para que lo rechace la API', () => {
    expect(integerOrNull(' 12 ')).toBe(12);
    expect(integerOrNull('0')).toBe(0);
    expect(integerOrNull('')).toBeNull();
    expect(integerOrNull('1.5')).toBe('1.5');
    expect(integerOrNull('abc')).toBe('abc');
  });

  it('changedFields devuelve solo lo que cambia', () => {
    const original = {label: '2026/27', start_year: 2026, starts_on: null as string | null, is_current: false};

    expect(changedFields(original, {...original})).toEqual({});
    expect(changedFields(original, {...original, starts_on: '2026-08-14', is_current: true})).toEqual({
      starts_on: '2026-08-14',
      is_current: true,
    });
  });

  it('changedFields recoge un valor que pasa a null', () => {
    expect(changedFields({tier: 1 as number | null}, {tier: null})).toEqual({tier: null});
  });
});
