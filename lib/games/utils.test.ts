import { describe, it, expect } from 'vitest';
import { shuffle, getPartnerKey, updatePartnerHistory, bestPairing } from './utils';
import { validateSession, isValidPlayer, isValidMatch, isValidRound } from './session';
import { Player } from '../../types';

describe('Games Shared Utilities', () => {
  describe('shuffle', () => {
    it('returns a new array with the same items', () => {
      const arr = [1, 2, 3, 4, 5];
      const shuffled = shuffle(arr);
      expect(shuffled).not.toBe(arr);
      expect(shuffled.slice().sort()).toEqual(arr);
    });
  });

  describe('getPartnerKey', () => {
    it('returns sorted ID-based keys to ensure consistency', () => {
      const p1: Player = { id: 4, name: 'P1' };
      const p2: Player = { id: 12, name: 'P2' };
      expect(getPartnerKey(p1, p2)).toBe('4-12');
      expect(getPartnerKey(p2, p1)).toBe('4-12');
    });
  });

  describe('updatePartnerHistory', () => {
    it('increments history count for teams correctly', () => {
      const history: Record<string, number> = {};
      const t1 = [{ id: 1, name: 'P1' }, { id: 2, name: 'P2' }];
      const t2 = [{ id: 3, name: 'P3' }, { id: 4, name: 'P4' }];

      updatePartnerHistory(history, t1, t2);
      expect(history['1-2']).toBe(1);
      expect(history['3-4']).toBe(1);
    });
  });

  describe('bestPairing', () => {
    it('chooses the pairing that minimizes repeat partnerships', () => {
      const group = [
        { id: 1, name: 'P1' },
        { id: 2, name: 'P2' },
        { id: 3, name: 'P3' },
        { id: 4, name: 'P4' },
      ];
      const partnerHistory = {
        '1-2': 10,
        '3-4': 10,
        '1-3': 0,
        '2-4': 0,
        '1-4': 0,
        '2-3': 0,
      };
      const best = bestPairing(group, partnerHistory);
      const pairedIds = [
        best.t1.map((p) => p.id).sort(),
        best.t2.map((p) => p.id).sort(),
      ];
      expect(pairedIds).not.toContainEqual([1, 2]);
    });
  });
});

describe('Validation Logic', () => {
  describe('Type Guard Helpers', () => {
    it('isValidPlayer checks object properties correctly', () => {
      expect(isValidPlayer({ id: 1, name: 'David' })).toBe(true);
      expect(isValidPlayer({ id: '1', name: 'David' })).toBe(false);
    });

    it('isValidMatch validates full structure correctly', () => {
      const match = {
        id: 'r0-c1',
        court: 1,
        team1: [{ id: 1, name: 'P1' }, { id: 2, name: 'P2' }],
        team2: [{ id: 3, name: 'P3' }, { id: 4, name: 'P4' }],
        score1: '11',
        score2: '7',
        completed: true,
      };
      expect(isValidMatch(match)).toBe(true);
      expect(isValidMatch({ ...match, court: '1' })).toBe(false);
    });

    it('isValidRound validates rounds structure correctly', () => {
      const round = {
        number: 1,
        matches: [],
        sittingOut: [{ id: 5, name: 'P5' }],
      };
      expect(isValidRound(round)).toBe(true);
      expect(isValidRound({ ...round, number: '1' })).toBe(false);
    });
  });

  describe('validateSession', () => {
    it('returns null for malformed inputs', () => {
      expect(validateSession(null)).toBeNull();
      expect(validateSession({})).toBeNull();
    });

    it('accepts and returns valid session layout', () => {
      const valid = {
        players: [{ id: 1, name: 'David M' }, { id: 2, name: 'Noah' }],
        courtCount: 3,
        numRounds: 8,
        selectedDuration: 15,
        gameType: 'standard',
        view: 'play',
      };
      const result = validateSession(valid);
      expect(result).not.toBeNull();
      expect(result?.courtCount).toBe(3);
    });

    it('sanitizes HTML tags from player names', () => {
      const scriptTagOpen = '<' + 'script' + '>';
      const scriptTagClose = '</' + 'script' + '>';
      const bTagOpen = '<' + 'b' + '>';
      const bTagClose = '</' + 'b' + '>';
      const payload = {
        players: [
          { id: 1, name: `David ${scriptTagOpen}alert(1)${scriptTagClose}` },
          { id: 2, name: `${bTagOpen}Noah${bTagClose}` },
        ],
      };
      const result = validateSession(payload);
      expect(result).not.toBeNull();
      expect(result?.players[0].name).toBe('David alert(1)');
      expect(result?.players[1].name).toBe('Noah');
    });
  });
});
