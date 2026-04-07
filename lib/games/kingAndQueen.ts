import { Player, Match, Round, PlayerStats } from '../../types';
import { GameEngine } from './types';

/** Court 1 is the King/Queen court — winners here earn double leaderboard points */
const KINGS_COURT = 1;
const DOUBLE_POINTS_MULTIPLIER = 2;

/**
 * Pick the best pairing from a 4-player group by minimising how often
 * these two players have been partners before.
 */
function bestPairing(
  group: Player[],
  partnerHistory: Record<string, number>,
): { t1: Player[]; t2: Player[] } {
  const getH = (p1: Player, p2: Player) =>
    partnerHistory[`${Math.min(p1.id, p2.id)}-${Math.max(p1.id, p2.id)}`] || 0;

  const options = [
    { t1: [group[0], group[1]], t2: [group[2], group[3]] },
    { t1: [group[0], group[2]], t2: [group[1], group[3]] },
    { t1: [group[0], group[3]], t2: [group[1], group[2]] },
  ];

  return options.sort(
    (a, b) =>
      getH(a.t1[0], a.t1[1]) +
      getH(a.t2[0], a.t2[1]) -
      (getH(b.t1[0], b.t1[1]) + getH(b.t2[0], b.t2[1])),
  )[0];
}

function updatePartnerHistory(history: Record<string, number>, t1: Player[], t2: Player[]): void {
  const key = (a: Player, b: Player) => `${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`;
  history[key(t1[0], t1[1])] = (history[key(t1[0], t1[1])] || 0) + 1;
  history[key(t2[0], t2[1])] = (history[key(t2[0], t2[1])] || 0) + 1;
}

/**
 * Generates Round 1 by randomly assigning players to courts,
 * then choosing the best pairing per court to split prior partners.
 */
function generateFirstRound(
  players: Player[],
  courtCount: number,
  partnerHistory: Record<string, number>,
): Round {
  // Shuffle players randomly
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const matches: Match[] = [];

  for (let c = 0; c < courtCount; c++) {
    const group = shuffled.slice(c * 4, c * 4 + 4);
    const { t1, t2 } = bestPairing(group, partnerHistory);
    updatePartnerHistory(partnerHistory, t1, t2);

    matches.push({
      id: `r0-c${c + 1}`,
      court: c + 1,
      team1: t1,
      team2: t2,
      score1: '0',
      score2: '0',
      completed: false,
    });
  }

  // Sort matches so Court 1 is first
  matches.sort((a, b) => a.court - b.court);

  return { number: 1, matches, sittingOut: [] };
}

/**
 * King & Queen court movement rules:
 * - Winners move UP (court number decreases toward 1)
 * - Losers move DOWN (court number increases away from 1)
 * - Partners always split — each winner teams with a winner from the adjacent court
 */
function generateNextRound(
  players: Player[],
  completedRounds: Round[],
  courtCount: number,
): Round | null {
  const lastRound = completedRounds[completedRounds.length - 1];
  if (!lastRound || lastRound.matches.some((m) => !m.completed)) return null;

  // Build partner history across all past rounds to minimize repeat partnerships
  const partnerHistory: Record<string, number> = {};
  players.forEach((p) =>
    players.forEach((p2) => {
      if (p.id !== p2.id) partnerHistory[`${Math.min(p.id, p2.id)}-${Math.max(p.id, p2.id)}`] = 0;
    }),
  );
  completedRounds.forEach((r) =>
    r.matches.forEach((m) => updatePartnerHistory(partnerHistory, m.team1, m.team2)),
  );

  // Determine winners and losers per court, sorted by court number (1 = top)
  const sortedMatches = [...lastRound.matches].sort((a, b) => a.court - b.court);

  /** players[courtIndex] = [winner1, winner2, loser1, loser2] */
  const courtResults: { winners: Player[]; losers: Player[] }[] = sortedMatches.map((m) => {
    const s1 = parseInt(m.score1) || 0;
    const s2 = parseInt(m.score2) || 0;
    return s1 >= s2 ? { winners: m.team1, losers: m.team2 } : { winners: m.team2, losers: m.team1 };
  });

  /**
   * Movement logic:
   *   Court 1 winners → stay on Court 1  (no court above)
   *   Court N winners → move to Court N-1
   *   Court 1 losers  → move to Court 2
   *   Court N losers  → move to Court N+1, but Court (courtCount) losers stay on Court (courtCount)
   *
   * After movement, each court collects 4 players (2 from winners who moved in,
   * 2 from losers who moved in). Partners are then split using bestPairing.
   */

  // Build pool per new court: 4 players each
  // Pool for court c (1-indexed) = winners from court c+1 (moved up) + losers from court c-1 (moved down)
  // Special cases: court 1 keeps its own winners; bottom court keeps its own losers if nowhere to go

  // We'll track which players land on which new court
  const newCourtPools: Player[][] = Array.from({ length: courtCount }, () => []);

  courtResults.forEach(({ winners, losers }, i) => {
    const courtNum = i + 1; // 1-indexed

    // Winners move up (court - 1), stay on court 1 if already there
    const winnersDestination = Math.max(1, courtNum - 1) - 1; // 0-indexed
    newCourtPools[winnersDestination].push(...winners);

    // Losers move down (court + 1), stay on bottom court if already there
    const losersDestination = Math.min(courtCount, courtNum + 1) - 1; // 0-indexed
    newCourtPools[losersDestination].push(...losers);
  });

  // Build matches from pools
  const roundNum = completedRounds.length + 1;
  const matches: Match[] = newCourtPools.map((pool, i) => {
    const courtNum = i + 1;
    // If for some edge case we have more or fewer than 4, take first 4
    const group = pool.slice(0, 4);
    const { t1, t2 } = bestPairing(group, partnerHistory);
    updatePartnerHistory(partnerHistory, t1, t2);

    return {
      id: `r${roundNum - 1}-c${courtNum}`,
      court: courtNum,
      team1: t1,
      team2: t2,
      score1: '0',
      score2: '0',
      completed: false,
    };
  });

  matches.sort((a, b) => a.court - b.court);
  return { number: roundNum, matches, sittingOut: [] };
}

function calculateLeaderboard(
  players: Player[],
  rounds: Round[],
  sortKey: 'avgPoints' | 'pointsFor',
): PlayerStats[] {
  const stats: Record<number, any> = {};

  players.forEach((p) => {
    stats[p.id] = {
      id: p.id,
      name: p.name,
      number: p.id,
      wins: 0,
      losses: 0,
      ties: 0,
      gamesPlayed: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    };
  });

  rounds.forEach((r) =>
    r.matches.forEach((m) => {
      if (!m.completed) return;
      const s1 = parseInt(m.score1) || 0;
      const s2 = parseInt(m.score2) || 0;
      const isKingsCourt = m.court === KINGS_COURT;

      // Winners on Court 1 get double points for their leaderboard total
      const t1Won = s1 > s2;
      const t2Won = s2 > s1;

      m.team1.forEach((p) => {
        if (!stats[p.id]) return;
        stats[p.id].gamesPlayed++;
        const multiplier = isKingsCourt && t1Won ? DOUBLE_POINTS_MULTIPLIER : 1;
        stats[p.id].pointsFor += s1 * multiplier;
        stats[p.id].pointsAgainst += s2;
        if (t1Won) stats[p.id].wins++;
        else if (t2Won) stats[p.id].losses++;
        else stats[p.id].ties++;
      });

      m.team2.forEach((p) => {
        if (!stats[p.id]) return;
        stats[p.id].gamesPlayed++;
        const multiplier = isKingsCourt && t2Won ? DOUBLE_POINTS_MULTIPLIER : 1;
        stats[p.id].pointsFor += s2 * multiplier;
        stats[p.id].pointsAgainst += s1;
        if (t2Won) stats[p.id].wins++;
        else if (t1Won) stats[p.id].losses++;
        else stats[p.id].ties++;
      });
    }),
  );

  const sorted = Object.values(stats)
    .filter((s: any) => s.gamesPlayed > 0)
    .map((s: any) => ({
      ...s,
      avgPoints: s.pointsFor / s.gamesPlayed,
    }))
    .sort((a: any, b: any) => b[sortKey] - a[sortKey] || b.wins - a.wins);

  return sorted.map((p: any, i: number) => ({ ...p, displayRank: i + 1 })) as PlayerStats[];
}

export const kingAndQueenEngine: GameEngine = {
  id: 'king_and_queen',
  name: 'King & Queen of the Court',
  description:
    'Winners move up, losers move down each round. Court 1 winners earn double leaderboard points. Requires exactly 4 players per court.',
  isDynamic: true,
  generateInitialRounds(players, _numRounds, courtCount) {
    const partnerHistory: Record<string, number> = {};
    players.forEach((p) =>
      players.forEach((p2) => {
        if (p.id !== p2.id) partnerHistory[`${Math.min(p.id, p2.id)}-${Math.max(p.id, p2.id)}`] = 0;
      }),
    );
    return [generateFirstRound(players, courtCount, partnerHistory)];
  },
  generateNextRound,
  calculateLeaderboard,
};
