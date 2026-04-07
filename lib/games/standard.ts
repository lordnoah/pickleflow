import { Player, Match, Round, PlayerStats } from '../../types';
import { GameEngine } from './types';

function generateSchedule(players: Player[], numRounds: number, courtCount: number): Round[] {
  if (players.length < 4) return [];

  const newRounds: Round[] = [];
  const playCount: Record<number, number> = {};
  const partnerHistory: Record<string, number> = {};

  players.forEach((p) => {
    playCount[p.id] = 0;
    players.forEach((p2) => {
      if (p.id !== p2.id) {
        partnerHistory[`${Math.min(p.id, p2.id)}-${Math.max(p.id, p2.id)}`] = 0;
      }
    });
  });

  for (let r = 0; r < numRounds; r++) {
    const sorted = [...players].sort(
      (a, b) => playCount[a.id] - playCount[b.id] || Math.random() - 0.5,
    );
    const slots = Math.min(players.length - (players.length % 4), courtCount * 4);
    const active = sorted.slice(0, slots);
    const available = [...active];
    const roundMatches: Match[] = [];
    let cNum = 1;

    while (available.length >= 4) {
      const group = available.splice(0, 4);
      const pairings = [
        { t1: [group[0], group[1]], t2: [group[2], group[3]] },
        { t1: [group[0], group[2]], t2: [group[1], group[3]] },
        { t1: [group[0], group[3]], t2: [group[1], group[2]] },
      ].sort((a, b) => {
        const getH = (p1: Player, p2: Player) =>
          partnerHistory[`${Math.min(p1.id, p2.id)}-${Math.max(p1.id, p2.id)}`] || 0;
        return (
          getH(a.t1[0], a.t1[1]) +
          getH(a.t2[0], a.t2[1]) -
          (getH(b.t1[0], b.t1[1]) + getH(b.t2[0], b.t2[1]))
        );
      });

      const best = pairings[0];

      best.t1.forEach((p) => playCount[p.id]++);
      best.t2.forEach((p) => playCount[p.id]++);
      partnerHistory[
        `${Math.min(best.t1[0].id, best.t1[1].id)}-${Math.max(best.t1[0].id, best.t1[1].id)}`
      ]++;
      partnerHistory[
        `${Math.min(best.t2[0].id, best.t2[1].id)}-${Math.max(best.t2[0].id, best.t2[1].id)}`
      ]++;

      roundMatches.push({
        id: `r${r}-c${cNum}`,
        court: cNum++,
        team1: best.t1,
        team2: best.t2,
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

      m.team1.forEach((p) => {
        if (stats[p.id]) {
          stats[p.id].gamesPlayed++;
          stats[p.id].pointsFor += s1;
          stats[p.id].pointsAgainst += s2;
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
          if (s2 > s1) stats[p.id].wins++;
          else if (s2 < s1) stats[p.id].losses++;
          else stats[p.id].ties++;
        }
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

export const standardEngine: GameEngine = {
  id: 'standard',
  name: 'Standard Round Robin',
  description: 'All rounds generated upfront. Partners rotate to maximize mixing.',
  isDynamic: false,
  generateInitialRounds: generateSchedule,
  generateNextRound: () => null,
  calculateLeaderboard,
};
