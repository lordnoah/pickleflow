import { Player, Match, Round, TournamentSession, View } from '../../types';

export function isValidPlayer(obj: any): obj is Player {
  return obj && typeof obj.id === 'number' && typeof obj.name === 'string';
}

export function isValidMatch(obj: any): obj is Match {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.court === 'number' &&
    Array.isArray(obj.team1) &&
    obj.team1.every(isValidPlayer) &&
    Array.isArray(obj.team2) &&
    obj.team2.every(isValidPlayer) &&
    typeof obj.score1 === 'string' &&
    typeof obj.score2 === 'string' &&
    typeof obj.completed === 'boolean'
  );
}

export function isValidRound(obj: any): obj is Round {
  return (
    obj &&
    typeof obj.number === 'number' &&
    Array.isArray(obj.matches) &&
    obj.matches.every(isValidMatch) &&
    Array.isArray(obj.sittingOut) &&
    obj.sittingOut.every(isValidPlayer)
  );
}

export function validateSession(data: any): TournamentSession | null {
  if (!data || typeof data !== 'object') return null;

  const validated: Partial<TournamentSession> = {};

  if (Array.isArray(data.players) && data.players.every(isValidPlayer)) {
    validated.players = data.players.map((p: any) => ({
      id: p.id,
      name: String(p.name).replace(/<[^>]*>/g, '').substring(0, 50).trim(),
    }));
  } else {
    return null;
  }

  if (Array.isArray(data.rounds) && data.rounds.every(isValidRound)) {
    validated.rounds = data.rounds.map((r: any) => ({
      number: r.number,
      matches: r.matches.map((m: any) => ({
        id: String(m.id),
        court: m.court,
        team1: m.team1.map((p: any) => ({
          id: p.id,
          name: String(p.name).replace(/<[^>]*>/g, '').substring(0, 50).trim(),
        })),
        team2: m.team2.map((p: any) => ({
          id: p.id,
          name: String(p.name).replace(/<[^>]*>/g, '').substring(0, 50).trim(),
        })),
        score1: String(m.score1).replace(/\D/g, ''),
        score2: String(m.score2).replace(/\D/g, ''),
        completed: !!m.completed,
      })),
      sittingOut: r.sittingOut.map((p: any) => ({
        id: p.id,
        name: String(p.name).replace(/<[^>]*>/g, '').substring(0, 50).trim(),
      })),
    }));
  } else if (data.rounds) {
    return null;
  }

  if (typeof data.courtCount === 'number' && data.courtCount >= 1 && data.courtCount <= 10) {
    validated.courtCount = data.courtCount;
  }

  if (typeof data.numRounds === 'number' && data.numRounds >= 1) {
    validated.numRounds = data.numRounds;
  }

  if (typeof data.selectedDuration === 'number' && data.selectedDuration >= 1) {
    validated.selectedDuration = data.selectedDuration;
  }

  if (typeof data.currentRoundIndex === 'number' && data.currentRoundIndex >= 0) {
    if (!validated.rounds || data.currentRoundIndex < validated.rounds.length) {
      validated.currentRoundIndex = data.currentRoundIndex;
    } else {
      validated.currentRoundIndex = 0;
    }
  }

  if (typeof data.gameType === 'string' && ['standard', 'king_and_queen'].includes(data.gameType)) {
    validated.gameType = data.gameType;
  }

  if (
    typeof data.view === 'string' &&
    ['setup', 'play', 'leaderboard', 'summary'].includes(data.view)
  ) {
    validated.view = data.view as View;
  }

  validated.timestamp = typeof data.timestamp === 'string' ? data.timestamp : new Date().toISOString();

  return validated as TournamentSession;
}
