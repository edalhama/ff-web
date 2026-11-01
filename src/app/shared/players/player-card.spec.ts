import {PlayerCard, PlayerMembership} from '../models/player';
import {contextCompetitionId, contextMemberships} from './player-card';

function membership(id: number, competitionId: number, seasonId: number): PlayerMembership {
  return {
    id,
    competition: {id: competitionId, name: `C${competitionId}`},
    season: {id: seasonId, label: `S${seasonId}`, start_year: 2000 + seasonId, is_current: false},
    team: {id, name: `T${id}`, short_name: null, code: null},
    shirt_number: null,
    position: null,
    status: 'unknown',
    status_note: null,
    status_until: null,
    active: true,
  };
}

function card(memberships: PlayerMembership[], competitionId: number | null): PlayerCard {
  return {memberships, context_competition_id: competitionId} as PlayerCard;
}

describe('player-card', () => {
  // Como llegan de la API: la temporada más reciente primero
  const memberships = [membership(1, 1, 26), membership(2, 1, 26), membership(3, 2, 26), membership(4, 1, 25)];

  it('shows the competition it was opened with or, without one, the latest', () => {
    expect(contextCompetitionId(card(memberships, 2))).toBe(2);
    expect(contextCompetitionId(card(memberships, null))).toBe(1);
    expect(contextCompetitionId(card([], null))).toBeNull();
  });

  it('keeps the cards of the latest season in that competition, one per team', () => {
    expect(contextMemberships(card(memberships, 1)).map((each) => each.id)).toEqual([1, 2]);
    expect(contextMemberships(card(memberships, 2)).map((each) => each.id)).toEqual([3]);
    expect(contextMemberships(card(memberships, 9))).toEqual([]);
  });
});
