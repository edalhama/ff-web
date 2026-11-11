/**
 * Formato de los números del mercado según el idioma de quien mira: precios en euros sin
 * decimales («18.520.000 €», «€18,520,000»), variaciones con signo («+120.000 €», «−60.000 €»)
 * y recuentos con separador de miles.
 */

/** Locale de `Intl` para cada idioma de la app: `es` → España, `en` → Reino Unido (euros con «€» delante). */
function intlLocale(language: string): string {
  return language === 'en' ? 'en-GB' : 'es-ES';
}

/** «18.520.000 €»; «—» sin valor. */
export function formatPrice(value: number | null | undefined, language: string): string {
  if (value === null || value === undefined) {
    return '—';
  }

  return new Intl.NumberFormat(intlLocale(language), {style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: 'always' as unknown as boolean}).format(value);
}

/** «+120.000 €», «−60.000 €», «0 €»; «—» sin valor. */
export function formatChange(value: number | null | undefined, language: string): string {
  if (value === null || value === undefined) {
    return '—';
  }

  return new Intl.NumberFormat(intlLocale(language), {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
    signDisplay: 'exceptZero',
    useGrouping: 'always' as unknown as boolean,
  }).format(value);
}

/** «1.520»; «—» sin valor. Con `useGrouping: 'always'`: en español, `Intl` no separa los de cuatro cifras. */
export function formatCount(value: number | null | undefined, language: string): string {
  if (value === null || value === undefined) {
    return '—';
  }

  // `'always'` es de ES2023: los tipos de la `lib` del proyecto solo admiten booleano
  return new Intl.NumberFormat(intlLocale(language), {maximumFractionDigits: 0, useGrouping: 'always' as unknown as boolean}).format(value);
}

/** Color de una variación: sube en verde, baja en rojo, sin cambio ni color. */
export function changeTone(value: number | null | undefined): 'up' | 'down' | null {
  if (value === null || value === undefined || value === 0) {
    return null;
  }

  return value > 0 ? 'up' : 'down';
}

/** Día `AAAA-MM-DD` como «22 ago 2026» / «22 Aug 2026», sin cambiar de zona (es un día, no un instante). */
export function formatDay(date: string, language: string): string {
  const [year, month, day] = date.split('-').map(Number);

  if (!year || !month || !day) {
    return date;
  }

  return new Intl.DateTimeFormat(intlLocale(language), {day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'}).format(new Date(Date.UTC(year, month - 1, day)));
}
