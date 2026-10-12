/**
 * Fechas pintadas en una zona horaria concreta, con `Intl` (sin depender de la del proceso).
 *
 * Hace falta en las páginas públicas: el servidor las genera en su propia zona y el navegador
 * tiene otra, y lo que pinte cada uno tiene que coincidir (si no, la página «salta» al cargar
 * y los partidos de madrugada cambian de día). Con la zona explícita, los dos pintan lo mismo.
 */

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(locale: string, timeZone: string | undefined, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${timeZone ?? ''}|${JSON.stringify(options)}`;
  let cached = formatters.get(key);

  if (!cached) {
    cached = new Intl.DateTimeFormat(locale, {...options, timeZone});
    formatters.set(key, cached);
  }

  return cached;
}

/** `timeZone` sin indicar = la del dispositivo. */
export function formatZoned(
  value: string | Date,
  locale: string,
  timeZone: string | undefined,
  options: Intl.DateTimeFormatOptions,
): string {
  const date = typeof value === 'string' ? new Date(value) : value;

  return Number.isNaN(date.getTime()) ? '' : formatter(locale, timeZone, options).format(date);
}

/** Día del calendario (`2026-10-09`) en el que cae un instante en esa zona. */
export function zonedDayKey(value: string | Date, timeZone: string | undefined): string {
  // en-CA escribe las fechas como AAAA-MM-DD
  return formatZoned(value, 'en-CA', timeZone, {year: 'numeric', month: '2-digit', day: '2-digit'});
}

export const TIME_FORMAT: Intl.DateTimeFormatOptions = {hour: '2-digit', minute: '2-digit', hourCycle: 'h23'};
export const LONG_DAY_FORMAT: Intl.DateTimeFormatOptions = {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'};
export const SHORT_DAY_FORMAT: Intl.DateTimeFormatOptions = {day: 'numeric', month: 'short'};
export const SHORT_DAY_YEAR_FORMAT: Intl.DateTimeFormatOptions = {day: 'numeric', month: 'short', year: 'numeric'};
