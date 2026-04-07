import { Player, Round, PlayerStats } from '../../types';

export interface GameEngine {
  /** Unique identifier used in localStorage and state */
  id: string;
  /** Human-readable display name */
  name: string;
  /** Short description shown in UI */
  description: string;
  /**
   * Generate the full schedule upfront (used by Standard Round Robin).
   * Return an empty array if the engine generates rounds dynamically.
   */
  generateInitialRounds(players: Player[], numRounds: number, courtCount: number): Round[];
  /**
   * Generate a single next round based on prior completed rounds.
   * Only needed for dynamic engines like King & Queen.
   */
  generateNextRound(players: Player[], completedRounds: Round[], courtCount: number): Round | null;
  /** Calculate the final sorted leaderboard */
  calculateLeaderboard(
    players: Player[],
    rounds: Round[],
    sortKey: 'avgPoints' | 'pointsFor',
  ): PlayerStats[];
  /**
   * Whether this engine requires round-by-round generation.
   * false = all rounds generated upfront; true = one round at a time.
   */
  isDynamic: boolean;
}
