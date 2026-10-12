import {formatZoned, LONG_DAY_FORMAT, TIME_FORMAT, zonedDayKey} from './zoned-dates';

describe('zoned-dates', () => {
  // 23:30 UTC del 15 de agosto: en Madrid (UTC+2 en verano) ya es día 16
  const lateKickoff = '2026-08-15T23:30:00.000Z';

  it('pinta la hora en la zona pedida, no en la del proceso', () => {
    expect(formatZoned(lateKickoff, 'es', 'Europe/Madrid', TIME_FORMAT)).toBe('01:30');
    expect(formatZoned(lateKickoff, 'es', 'UTC', TIME_FORMAT)).toBe('23:30');
    expect(formatZoned(lateKickoff, 'es', 'America/New_York', TIME_FORMAT)).toBe('19:30');
  });

  it('agrupa por el día de la zona pedida', () => {
    expect(zonedDayKey(lateKickoff, 'Europe/Madrid')).toBe('2026-08-16');
    expect(zonedDayKey(lateKickoff, 'UTC')).toBe('2026-08-15');
  });

  it('escribe la fecha en el idioma pedido', () => {
    expect(formatZoned(lateKickoff, 'es', 'Europe/Madrid', LONG_DAY_FORMAT)).toBe('domingo, 16 de agosto de 2026');
    expect(formatZoned(lateKickoff, 'en', 'Europe/Madrid', LONG_DAY_FORMAT)).toBe('Sunday, August 16, 2026');
  });

  it('devuelve vacío con una fecha que no lo es', () => {
    expect(formatZoned('no-es-fecha', 'es', 'UTC', TIME_FORMAT)).toBe('');
  });
});
