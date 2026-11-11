import {changeTone, formatChange, formatCount, formatDay, formatPrice} from './market';

/** `Intl` separa con espacios finos o duros según la versión: se normalizan para comparar. */
function plain(text: string): string {
  return text.replace(/[  ]/g, ' ');
}

describe('market', () => {
  it('formats prices in euros without decimals, by language', () => {
    expect(plain(formatPrice(18520000, 'es'))).toBe('18.520.000 €');
    expect(formatPrice(18520000, 'en')).toBe('€18,520,000');
    expect(formatPrice(null, 'es')).toBe('—');
  });

  it('signs the change, but not a zero one', () => {
    expect(plain(formatChange(120000, 'es'))).toBe('+120.000 €');
    expect(plain(formatChange(-60000, 'es'))).toMatch(/^[-−]60\.000 €$/);
    expect(plain(formatChange(0, 'es'))).toBe('0 €');
    expect(formatChange(null, 'en')).toBe('—');
  });

  it('groups thousands also with four digits in Spanish', () => {
    expect(formatCount(1520, 'es')).toBe('1.520');
    expect(formatCount(1520, 'en')).toBe('1,520');
    expect(formatCount(undefined, 'es')).toBe('—');
  });

  it('tones the change: up, down or none', () => {
    expect(changeTone(1)).toBe('up');
    expect(changeTone(-1)).toBe('down');
    expect(changeTone(0)).toBeNull();
    expect(changeTone(null)).toBeNull();
  });

  it('formats a day without moving it to another time zone', () => {
    expect(formatDay('2026-08-22', 'en')).toBe('22 Aug 2026');
    expect(formatDay('2026-08-22', 'es')).toMatch(/^22 ago\.? 2026$/);
    expect(formatDay('nope', 'es')).toBe('nope');
  });
});
