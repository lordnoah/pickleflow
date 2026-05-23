export interface Player {
  id: number;
  name: string;
}

export interface Match {
  id: string;
  court: number;
  team1: Player[];
  team2: Player[];
  score1: string;
  score2: string;
  completed: boolean;
}

export interface Round {
  number: number;
  matches: Match[];
  sittingOut: Player[];
}

export interface PlayerStats {
  id: number;
  name: string;
  number: number;
  wins: number;
  losses: number;
  ties: number;
  gamesPlayed: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
  avgPoints: number;
  displayRank: number;
}

export type View = 'setup' | 'play' | 'leaderboard' | 'summary';

export interface TournamentSession {
  players: Player[];
  rounds: Round[];
  currentRoundIndex: number;
  courtCount: number;
  numRounds: number;
  selectedDuration: number;
  view: View;
  gameType: string;
  timestamp: string;
}

