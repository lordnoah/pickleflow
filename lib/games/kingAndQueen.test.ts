import { describe, it, expect } from 'vitest';
import { kingAndQueenEngine } from './kingAndQueen';
import { Player, Round } from '../../types';

const makePlayers = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `P${i + 1}` }));

describe('King & Queen Engine', () => {
  describe('generateInitialRounds', () => {
    it('generates exactly 1 round with no sitting-out players', () => {
      const players = makePlayers(8); // 2 courts × 4
      const rounds = kingAndQueenEngine.generateInitialRounds(players, 99, 2);
      expect(rounds.length).toBe(1);
      expect(rounds[0].sittingOut.length).toBe(0);
      expect(rounds[0].matches.length).toBe(2);
    });

    it('each match has exactly 2 players per team', () => {
      const players = makePlayers(16); // 4 courts × 4
      const rounds = kingAndQueenEngine.generateInitialRounds(players, 99, 4);
      rounds[0].matches.forEach((m) => {
        expect(m.team1.length).toBe(2);
        expect(m.team2.length).toBe(2);
      });
    });

    it('courts are numbered 1..courtCount', () => {
      const players = makePlayers(12); // 3 courts
      const rounds = kingAndQueenEngine.generateInitialRounds(players, 99, 3);
      const courtNumbers = rounds[0].matches.map((m) => m.court).sort((a, b) => a - b);
      expect(courtNumbers).toEqual([1, 2, 3]);
    });
  });

  describe('generateNextRound', () => {
    it('returns null if current round is not fully completed', () => {
      const players = makePlayers(8);
      const rounds = kingAndQueenEngine.generateInitialRounds(players, 99, 2);
      // Round is not completed
      const next = kingAndQueenEngine.generateNextRound(players, rounds, 2);
      expect(next).toBeNull();
    });

    it('winners move up a court and losers move down', () => {
      const players = makePlayers(8);
      // Build a deterministic completed round: Court 1 and Court 2 matches
      const completedRound: Round = {
        number: 1,
        sittingOut: [],
        matches: [
          {
            id: 'r0-c1',
            court: 1,
            team1: [players[0], players[1]], // WIN on Court 1
            team2: [players[2], players[3]], // LOSE on Court 1 → move to Court 2
            score1: '11',
            score2: '5',
            completed: true,
          },
          {
            id: 'r0-c2',
            court: 2,
            team1: [players[4], players[5]], // WIN on Court 2 → move to Court 1
            team2: [players[6], players[7]], // LOSE on Court 2 → stay Court 2 (bottom)
            score1: '11',
            score2: '3',
            completed: true,
          },
        ],
      };

      const next = kingAndQueenEngine.generateNextRound(players, [completedRound], 2);
      expect(next).not.toBeNull();
      expect(next!.number).toBe(2);
      expect(next!.sittingOut.length).toBe(0);

      // Court 1 should have: winners from Court 1 + winners from Court 2
      const court1Match = next!.matches.find((m) => m.court === 1)!;
      const court1Players = [...court1Match.team1, ...court1Match.team2];
      // P1, P2 stayed (Court 1 winners), P5, P6 moved up (Court 2 winners)
      const expectedCourt1Ids = new Set([1, 2, 5, 6]);
      expect(new Set(court1Players.map((p) => p.id))).toEqual(expectedCourt1Ids);

      // Court 2 should have: losers from Court 1 + losers from Court 2
      const court2Match = next!.matches.find((m) => m.court === 2)!;
      const court2Players = [...court2Match.team1, ...court2Match.team2];
      const expectedCourt2Ids = new Set([3, 4, 7, 8]);
      expect(new Set(court2Players.map((p) => p.id))).toEqual(expectedCourt2Ids);
    });
  });

  describe('calculateLeaderboard - Court 1 double points', () => {
    it('doubles pointsFor for winners on Court 1', () => {
      const players = makePlayers(4);
      const round: Round = {
        number: 1,
        sittingOut: [],
        matches: [
          {
            id: 'r0-c1',
            court: 1, // King's Court
            team1: [players[0], players[1]], // WIN 11-5
            team2: [players[2], players[3]],
            score1: '11',
            score2: '5',
            completed: true,
          },
        ],
      };

      const lb = kingAndQueenEngine.calculateLeaderboard(players, [round], 'pointsFor');

      const p1 = lb.find((s) => s.id === 1)!;
      const p3 = lb.find((s) => s.id === 3)!;

      // Winners on Court 1 get 11 × 2 = 22 leaderboard points
      expect(p1.pointsFor).toBe(22);
      expect(p1.wins).toBe(1);

      // Losers on Court 1 get normal points (no multiplier for losers)
      expect(p3.pointsFor).toBe(5);
      expect(p3.losses).toBe(1);
    });

    it('does NOT double points for winners on Court 2', () => {
      const players = makePlayers(4);
      const round: Round = {
        number: 1,
        sittingOut: [],
        matches: [
          {
            id: 'r0-c2',
            court: 2,
            team1: [players[0], players[1]], // WIN 11-5
            team2: [players[2], players[3]],
            score1: '11',
            score2: '5',
            completed: true,
          },
        ],
      };

      const lb = kingAndQueenEngine.calculateLeaderboard(players, [round], 'pointsFor');
      const p1 = lb.find((s) => s.id === 1)!;

      // No multiplier — normal 11 points
      expect(p1.pointsFor).toBe(11);
    });
  });
});
