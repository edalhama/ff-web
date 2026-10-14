import {ageOn, groupByPosition} from './squad';

describe('squad', () => {
  describe('groupByPosition', () => {
    it('groups in position order, keeping the given order and leaving out empty groups', () => {
      const groups = groupByPosition([
        {name: 'Lewandowski', position: 'forward' as const},
        {name: 'Pedri', position: 'midfielder' as const},
        {name: 'Ter Stegen', position: 'goalkeeper' as const},
        {name: 'Gavi', position: 'midfielder' as const},
        {name: '¿?', position: null},
      ]);

      expect(groups.map((group) => group.position)).toEqual(['goalkeeper', 'midfielder', 'forward', null]);
      expect(groups[1].players.map((player) => player.name)).toEqual(['Pedri', 'Gavi']);
    });

    it('returns nothing for an empty squad', () => {
      expect(groupByPosition([])).toEqual([]);
    });
  });

  describe('ageOn', () => {
    it('counts the birthday only once it has arrived', () => {
      expect(ageOn('2002-11-25', new Date(2026, 10, 24))).toBe(23);
      expect(ageOn('2002-11-25', new Date(2026, 10, 25))).toBe(24);
      expect(ageOn('2002-11-25', new Date(2026, 11, 1))).toBe(24);
    });

    it('is null without a valid date', () => {
      expect(ageOn(null, new Date())).toBeNull();
      expect(ageOn('25/11/2002', new Date())).toBeNull();
    });
  });
});
