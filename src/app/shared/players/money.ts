/**
 * Importe en euros, compacto y en el idioma del panel: `220 M €`, `500 mil €`. Para el valor de
 * mercado de un jugador (Transfermarkt) y el importe de un traspaso; `—` si no hay.
 */
export function formatMoney(value: number | null | undefined, lang: string | null | undefined, currency = 'EUR'): string {
  if (value == null) {
    return '—';
  }

  try {
    return new Intl.NumberFormat(lang || 'es', {style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1}).format(value);
  } catch {
    // Moneda que el navegador no conoce: el número y su código
    return `${new Intl.NumberFormat(lang || 'es', {notation: 'compact', maximumFractionDigits: 1}).format(value)} ${currency}`;
  }
}
