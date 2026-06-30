import { Player, Match, Round, PlayerStats } from '../../types';
import { GameEngine } from './types';
import { shuffle, getPartnerKey, updatePartnerHistory } from './utils';

function findBestPairings(
  active: Player[],
  partnerHistory: Record<string, number>,
): { t1: Player[]; t2: Player[] }[] {
  function getHistory(p1: Player, p2: Player): number {
    return partnerHistory[getPartnerKey(p1, p2)] || 0;
  }

  function getPairingCost(pA: Player, pB: Player): number {
    const h = getHistory(pA, pB);
    return h === 0 ? 0 : Math.pow(10, h);
  }

  // Greedy generator for quick initial upper bound
  function findGreedyPairings(remainingPlayers: Player[]) {
    const remaining = [...remainingPlayers];
    const matches: { t1: Player[]; t2: Player[] }[] = [];
    let cost = 0;

    while (remaining.length >= 4) {
      const first = remaining[0];
      let bestOpt: { t1: Player[]; t2: Player[]; cost: number } | null = null;
      let bestIdxs: number[] = [];

      for (let i = 1; i < remaining.length; i++) {
        for (let j = i + 1; j < remaining.length; j++) {
          for (let k = j + 1; k < remaining.length; k++) {
            const p1 = remaining[i];
            const p2 = remaining[j];
            const p3 = remaining[k];

            const options = [
              { t1: [first, p1], t2: [p2, p3], cost: getPairingCost(first, p1) + getPairingCost(p2, p3) },
              { t1: [first, p2], t2: [p1, p3], cost: getPairingCost(first, p2) + getPairingCost(p1, p3) },
              { t1: [first, p3], t2: [p1, p2], cost: getPairingCost(first, p3) + getPairingCost(p1, p2) },
            ];

            for (const opt of options) {
              if (bestOpt === null || opt.cost < bestOpt.cost) {
                bestOpt = opt;
                bestIdxs = [i, j, k];
              }
            }
          }
        }
      }

      if (!bestOpt) break;
      matches.push({ t1: bestOpt.t1, t2: bestOpt.t2 });
      cost += bestOpt.cost;

      const sortedIdxs = [0, ...bestIdxs].sort((a, b) => b - a);
      sortedIdxs.forEach((idx) => {
        remaining.splice(idx, 1);
      });
    }

    return { matches, cost };
  }

  const greedyResult = findGreedyPairings(active);
  if (greedyResult.cost === 0) {
    return greedyResult.matches;
  }

  let bestResult = greedyResult;
  let nodeCount = 0;
  const maxNodes = 50000;

  function search(
    remaining: Player[],
    currentMatches: { t1: Player[]; t2: Player[] }[],
    currentCost: number,
  ) {
    nodeCount++;
    if (nodeCount > maxNodes) {
      return;
    }

    if (currentCost >= bestResult.cost) {
      return;
    }

    if (remaining.length === 0) {
      if (currentCost < bestResult.cost) {
        bestResult = { matches: [...currentMatches], cost: currentCost };
      }
      return;
    }

    const first = remaining[0];
    const rest = remaining.slice(1);

    for (let i = 0; i < rest.length; i++) {
      for (let j = i + 1; j < rest.length; j++) {
        for (let k = j + 1; k < rest.length; k++) {
          const p1 = rest[i];
          const p2 = rest[j];
          const p3 = rest[k];

          const options = [
            { t1: [first, p1], t2: [p2, p3], cost: getPairingCost(first, p1) + getPairingCost(p2, p3) },
            { t1: [first, p2], t2: [p1, p3], cost: getPairingCost(first, p2) + getPairingCost(p1, p3) },
            { t1: [first, p3], t2: [p1, p2], cost: getPairingCost(first, p3) + getPairingCost(p1, p2) },
          ];

          options.sort((a, b) => a.cost - b.cost);

          const nextRemaining: Player[] = [];
          for (let idx = 0; idx < rest.length; idx++) {
            if (idx !== i && idx !== j && idx !== k) {
              nextRemaining.push(rest[idx]);
            }
          }

          for (const opt of options) {
            currentMatches.push({ t1: opt.t1, t2: opt.t2 });
            search(nextRemaining, currentMatches, currentCost + opt.cost);
            currentMatches.pop();

            if (bestResult.cost === 0) {
              return;
            }
          }
        }
      }
    }
  }

  search(active, [], 0);
  return bestResult.matches;
}

function generateSchedule(players: Player[], numRounds: number, courtCount: number): Round[] {
  if (players.length < 4) return [];

  const newRounds: Round[] = [];
  const playCount: Record<number, number> = {};
  const partnerHistory: Record<string, number> = {};

  players.forEach((p) => {
    playCount[p.id] = 0;
    players.forEach((p2) => {
      if (p.id !== p2.id) {
        partnerHistory[getPartnerKey(p, p2)] = 0;
      }
    });
  });

  for (let r = 0; r < numRounds; r++) {
    const shuffled = shuffle(players);
    const sorted = shuffled.sort((a, b) => playCount[a.id] - playCount[b.id]);

    const slots = Math.min(players.length - (players.length % 4), courtCount * 4);
    const active = sorted.slice(0, slots);

    const pairingResult = findBestPairings(active, partnerHistory);
    const roundMatches: Match[] = [];
    let cNum = 1;

    pairingResult.forEach((pairing) => {
      pairing.t1.forEach((p) => playCount[p.id]++);
      pairing.t2.forEach((p) => playCount[p.id]++);
      updatePartnerHistory(partnerHistory, pairing.t1, pairing.t2);

      roundMatches.push({
        id: `r${r}-c${cNum}`,
        court: cNum++,
        team1: pairing.t1,
        team2: pairing.t2,
        score1: '0',
        score2: '0',
        completed: false,
      });
    });

    newRounds.push({ number: r + 1, matches: roundMatches, sittingOut: sorted.slice(slots) });
  }

  return newRounds;
}

function calculateLeaderboard(
  players: Player[],
  rounds: Round[],
  sortKey: 'avgPoints' | 'pointsFor',
  limitScoresCount?: number,
): PlayerStats[] {
  const stats: Record<number, Omit<PlayerStats, 'avgPoints' | 'displayRank'>> = {};
  const gamesCounted: Record<number, number> = {};

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
      diff: 0,
    };
    gamesCounted[p.id] = 0;
  });

  rounds.forEach((r) =>
    r.matches.forEach((m) => {
      if (!m.completed) return;
      const s1 = parseInt(m.score1, 10) || 0;
      const s2 = parseInt(m.score2, 10) || 0;

      m.team1.forEach((p) => {
        if (stats[p.id]) {
          if (limitScoresCount !== undefined && gamesCounted[p.id] >= limitScoresCount) {
            return;
          }
          gamesCounted[p.id]++;
          stats[p.id].gamesPlayed++;
          stats[p.id].pointsFor += s1;
          stats[p.id].pointsAgainst += s2;
          stats[p.id].diff += s1 - s2;
          if (s1 > s2) stats[p.id].wins++;
          else if (s1 < s2) stats[p.id].losses++;
          else stats[p.id].ties++;
        }
      });

      m.team2.forEach((p) => {
        if (stats[p.id]) {
          if (limitScoresCount !== undefined && gamesCounted[p.id] >= limitScoresCount) {
            return;
          }
          gamesCounted[p.id]++;
          stats[p.id].gamesPlayed++;
          stats[p.id].pointsFor += s2;
          stats[p.id].pointsAgainst += s1;
          stats[p.id].diff += s2 - s1;
          if (s2 > s1) stats[p.id].wins++;
          else if (s2 < s1) stats[p.id].losses++;
          else stats[p.id].ties++;
        }
      });
    }),
  );

  const sorted = Object.values(stats)
    .filter((s) => s.gamesPlayed > 0)
    .map((s) => ({
      ...s,
      avgPoints: s.pointsFor / s.gamesPlayed,
    }))
    .sort((a, b) => b[sortKey] - a[sortKey] || b.wins - a.wins);

  return sorted.map((p, i) => ({ ...p, displayRank: i + 1 })) as PlayerStats[];
}

export const standardEngine: GameEngine = {
  id: 'standard',
  name: 'Standard Round Robin',
  description: 'All rounds generated upfront. Partners rotate to maximize mixing.',
  isDynamic: false,
  generateInitialRounds: generateSchedule,
  generateNextRound: () => null,
  calculateLeaderboard,
};
