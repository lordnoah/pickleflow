import { Player, Match, Round, PlayerStats } from '../../types';
import { GameEngine } from './types';
import { shuffle, getPartnerKey, updatePartnerHistory, bestPairing } from './utils';

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
    const available = [...active];
    const roundMatches: Match[] = [];
    let cNum = 1;

    while (available.length >= 4) {
      const group = available.splice(0, 4);
      const pairing = bestPairing(group, partnerHistory);

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
    }

    newRounds.push({ number: r + 1, matches: roundMatches, sittingOut: sorted.slice(slots) });
  }

  return newRounds;
}

function calculateLeaderboard(
  players: Player[],
  rounds: Round[],
  sortKey: 'avgPoints' | 'pointsFor',
): PlayerStats[] {
  const stats: Record<number, Omit<PlayerStats, 'avgPoints' | 'displayRank'>> = {};

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
  });

  rounds.forEach((r) =>
    r.matches.forEach((m) => {
      if (!m.completed) return;
      const s1 = parseInt(m.score1, 10) || 0;
      const s2 = parseInt(m.score2, 10) || 0;

      m.team1.forEach((p) => {
        if (stats[p.id]) {
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
