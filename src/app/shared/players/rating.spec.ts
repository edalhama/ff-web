import {cardStatKey, groupStats, ratingTier, stars} from './rating';

describe('rating', () => {
  it('uses the card colours of the game', () => {
    expect(ratingTier(90)).toBe('gold');
    expect(ratingTier(75)).toBe('gold');
    expect(ratingTier(74)).toBe('silver');
    expect(ratingTier(65)).toBe('silver');
    expect(ratingTier(64)).toBe('bronze');
  });

  it('names the card stats of a goalkeeper as the game does', () => {
    expect(cardStatKey('pace', {position: 'ST'})).toBe('player.card-stat.pace');
    expect(cardStatKey('pace', {position: 'GK'})).toBe('player.card-stat.gk-pace');
  });

  it('groups the detailed stats in the game order, without empty groups', () => {
    const groups = groupStats({finishing: 94, acceleration: 97, sprintSpeed: 97, newThing: 50});

    expect(groups.map((group) => group.key)).toEqual(['pace', 'shooting', 'other']);
    expect(groups[0].stats.map((stat) => stat.key)).toEqual(['acceleration', 'sprintSpeed']);
    expect(groups[2].stats).toEqual([{key: 'newThing', value: 50, known: false}]);
    expect(groupStats({})).toEqual([]);
  });

  it('draws stars out of five', () => {
    expect(stars(4)).toBe('★★★★☆');
    expect(stars(null)).toBeNull();
  });
});
