import {contextFits, eventMinute, matchesQueryParams, matchStatusLabel, roundDateRange, roundLabelKey} from './matches';

describe('matches', () => {
  describe('matchStatusLabel', () => {
    const instant = (key: string) => key;

    it('names the status, and the period and minute of a match in play', () => {
      expect(matchStatusLabel({status: 'postponed', period: null, minute: null}, instant)).toBe('enum.match-status.postponed');
      expect(matchStatusLabel({status: 'playing', period: 'second_half', minute: 67}, instant)).toBe("enum.match-period.second_half · 67'");
      expect(matchStatusLabel({status: 'playing', period: 'half_time', minute: 45}, instant)).toBe('enum.match-period.half_time');
    });
  });

  describe('eventMinute', () => {
    it('writes the added time after the minute', () => {
      expect(eventMinute({minute: 12, added_minute: null})).toBe("12'");
      expect(eventMinute({minute: 45, added_minute: 2})).toBe("45+2'");
    });
  });

  describe('roundLabelKey', () => {
    it('names a numbered round by its number and the others by their type', () => {
      expect(roundLabelKey({number: 5, type: 'regular'})).toEqual({key: 'match.round-number', params: {number: 5}});
      expect(roundLabelKey({number: null, type: 'final'})).toEqual({key: 'enum.round-type.final'});
    });
  });

  describe('roundDateRange', () => {
    it('joins the first and the last day, once if they are the same', () => {
      const round = {starts_at: '2026-08-15T19:00:00Z', ends_at: '2026-08-17T19:00:00Z'};

      expect(roundDateRange(round, 'en', 'UTC')).toBe('Aug 15 – Aug 17');
      expect(roundDateRange({starts_at: round.starts_at, ends_at: '2026-08-15T21:00:00Z'}, 'en', 'UTC')).toBe('Aug 15');
      expect(roundDateRange({starts_at: null, ends_at: null}, 'en', 'UTC')).toBe('');
    });
  });

  describe('matchesQueryParams', () => {
    it('leaves out the current season', () => {
      expect(matchesQueryParams(1, null, 9)).toEqual({competition_id: 1, round_id: 9});
      expect(matchesQueryParams(1, 3, 9)).toEqual({competition_id: 1, season_id: 3, round_id: 9});
    });
  });

  describe('contextFits', () => {
    const context = {competitionId: 1, requestedSeasonId: null};

    it('needs the same competition', () => {
      expect(contextFits(null, 1)).toBeFalse();
      expect(contextFits(context, 1)).toBeTrue();
      expect(contextFits(context, 2)).toBeFalse();
    });

    it('needs the same requested season, where null is the current one', () => {
      expect(contextFits(context, 1, null)).toBeTrue();
      expect(contextFits(context, 1, 7)).toBeFalse();
      expect(contextFits({competitionId: 1, requestedSeasonId: 7}, 1, 7)).toBeTrue();
      expect(contextFits({competitionId: 1, requestedSeasonId: 7}, 1, null)).toBeFalse();
    });
  });
});
