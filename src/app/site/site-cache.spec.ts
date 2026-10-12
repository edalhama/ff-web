import {SiteMatch} from '../shared/models/site';
import {SITE_TTL, ttlForMatches} from './site-cache';

describe('ttlForMatches', () => {
  const now = new Date('2026-10-09T12:00:00Z').getTime();

  function match(status: SiteMatch['status'], kickoff: string | null): SiteMatch {
    return {status, kickoff_at: kickoff} as SiteMatch;
  }

  it('usa la vigencia normal si no hay nada cerca', () => {
    expect(ttlForMatches([match('finished', '2026-10-04T19:00:00Z'), match('scheduled', '2026-10-17T19:00:00Z')], SITE_TTL.current, now)).toBe(SITE_TTL.current);
  });

  it('es corta con un partido en juego', () => {
    expect(ttlForMatches([match('scheduled', '2026-10-17T19:00:00Z'), match('playing', '2026-10-09T11:00:00Z')], SITE_TTL.archive, now)).toBe(SITE_TTL.live);
  });

  it('no pasa del siguiente saque inicial', () => {
    expect(ttlForMatches([match('scheduled', '2026-10-09T12:05:00Z')], SITE_TTL.current, now)).toBe(300);
    expect(ttlForMatches([match('scheduled', '2026-10-09T12:00:20Z')], SITE_TTL.current, now)).toBe(SITE_TTL.live);
  });

  it('trata como en juego un programado cuya hora acaba de pasar', () => {
    expect(ttlForMatches([match('scheduled', '2026-10-09T11:30:00Z')], SITE_TTL.current, now)).toBe(SITE_TTL.live);
    // Uno «programado» de hace días es un dato sin actualizar, no un partido en juego
    expect(ttlForMatches([match('scheduled', '2026-10-01T11:30:00Z')], SITE_TTL.current, now)).toBe(SITE_TTL.current);
  });

  it('ignora los partidos sin fecha', () => {
    expect(ttlForMatches([match('scheduled', null), match('postponed', null)], SITE_TTL.current, now)).toBe(SITE_TTL.current);
  });
});
