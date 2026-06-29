import { describe, it, expect } from 'vitest';
import { standardEngine } from './standard';
import { Player, Round } from '../../types';

describe('Standard Engine Logic', () => {
  const mockPlayers: Player[] = [
    { id: 1, name: 'P1' },
    { id: 2, name: 'P2' },
    { id: 3, name: 'P3' },
    { id: 4, name: 'P4' },
    { id: 5, name: 'P5' },
  ];

  it('generateInitialRounds should return empty array if less than 4 players', () => {
    const rounds = standardEngine.generateInitialRounds(mockPlayers.slice(0, 3), 3, 2);
    expect(rounds.length).toBe(0);
  });

  it('generateInitialRounds should create correct number of rounds and matches', () => {
    // 5 players, 1 court -> 1 match per round (4 players playing, 1 sitting out)
    const rounds = standardEngine.generateInitialRounds(mockPlayers, 3, 1);
    expect(rounds.length).toBe(3);

    rounds.forEach((round, rIdx) => {
      expect(round.number).toBe(rIdx + 1);
      expect(round.matches.length).toBe(1);
      expect(round.sittingOut.length).toBe(1);

      const match = round.matches[0];
      expect(match.team1.length).toBe(2);
      expect(match.team2.length).toBe(2);
      expect(match.score1).toBe('0');
      expect(match.score2).toBe('0');
      expect(match.completed).toBe(false);
    });
  });

  it('calculateLeaderboard should correctly compute stats based on completed matches', () => {
    const mockRounds: Round[] = [
      {
        number: 1,
        sittingOut: [{ id: 5, name: 'P5' }],
        matches: [
          {
            id: 'r0-c1',
            court: 1,
            team1: [mockPlayers[0], mockPlayers[1]], // P1, P2
            team2: [mockPlayers[2], mockPlayers[3]], // P3, P4
            score1: '11',
            score2: '5',
            completed: true,
          },
        ],
      },
    ];

    const leaderboard = standardEngine.calculateLeaderboard(mockPlayers, mockRounds, 'avgPoints');

    // P5 should not be in leaderboard because they played 0 games
    expect(leaderboard.length).toBe(4);

    const p1Stats = leaderboard.find((p) => p.id === 1);
    expect(p1Stats?.wins).toBe(1);
    expect(p1Stats?.losses).toBe(0);
    expect(p1Stats?.pointsFor).toBe(11);
    expect(p1Stats?.avgPoints).toBe(11);

    const p3Stats = leaderboard.find((p) => p.id === 3);
    expect(p3Stats?.wins).toBe(0);
    expect(p3Stats?.losses).toBe(1);
    expect(p3Stats?.pointsFor).toBe(5);
    expect(p3Stats?.avgPoints).toBe(5);

    // Sorting should put winners at the top
    expect(leaderboard[0].avgPoints).toBe(11);
    expect(leaderboard[0].displayRank).toBe(1);
    expect(leaderboard[leaderboard.length - 1].avgPoints).toBe(5);
  });

  it('should generate a standard schedule with 0 repeat partnerships for 13, 14, and 15 players across 6 rounds', () => {
    const getPartnerKey = (p1: Player, p2: Player): string => {
      return `${Math.min(p1.id, p2.id)}-${Math.max(p1.id, p2.id)}`;
    };

    [13, 14, 15].forEach((count) => {
      const players = Array.from({ length: count }, (_, idx) => ({ id: idx + 1, name: `Player ${idx + 1}` }));
      const courtCount = 3;
      const numRounds = 6;

      const rounds = standardEngine.generateInitialRounds(players, numRounds, courtCount);
      expect(rounds.length).toBe(numRounds);

      const partnerCounts: Record<string, number> = {};
      let repeatPairings = 0;

      rounds.forEach((round) => {
        round.matches.forEach((match) => {
          expect(match.team1.length).toBe(2);
          expect(match.team2.length).toBe(2);

          const key1 = getPartnerKey(match.team1[0], match.team1[1]);
          const key2 = getPartnerKey(match.team2[0], match.team2[1]);

          partnerCounts[key1] = (partnerCounts[key1] || 0) + 1;
          partnerCounts[key2] = (partnerCounts[key2] || 0) + 1;
        });
      });

      Object.values(partnerCounts).forEach((c) => {
        if (c > 1) repeatPairings += c - 1;
      });

      expect(repeatPairings).toBe(0);
    });
  });
});
