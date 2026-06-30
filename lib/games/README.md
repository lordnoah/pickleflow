# 🏓 PickleFlow Game Engines

This directory contains the pluggable scheduling and standings calculation logic for PickleFlow Pro.

## 🏗️ Architecture

All game engines implement the `GameEngine` interface defined in [types.ts](types.ts):

```typescript
export interface GameEngine {
  id: string;             // Unique identifier for local storage / state
  name: string;           // Display name in UI selection
  description: string;    // Subtitle description in Setup
  isDynamic: boolean;     // True if rounds are generated one-by-one (e.g. King & Queen)
  
  // Generates upfront rounds (used by static engines like standard Round Robin)
  generateInitialRounds(players: Player[], numRounds: number, courtCount: number): Round[];
  
  // Generates the next round based on completed match results (used by dynamic engines)
  generateNextRound(players: Player[], completedRounds: Round[], courtCount: number): Round | null;
  
  // Custom leaderboard sorter and differential calculator. If limitScoresCount is defined, 
  // aggregates stats using only the first N matches played chronologically by each player.
  calculateLeaderboard(
    players: Player[],
    rounds: Round[],
    sortKey: 'avgPoints' | 'pointsFor',
    limitScoresCount?: number,
  ): PlayerStats[];
}
```

## 🛠️ Shared Utilities

Common logic used across multiple game engines is extracted to [utils.ts](utils.ts) to avoid code duplication and enhance maintainability:
- `shuffle<T>`: Standard Fisher-Yates array shuffling.
- `getPartnerKey`: Generates a consistent, sorted key representing a pair of player IDs.
- `updatePartnerHistory`: Tracks pairing frequency to maximize play-mixing fairness.
- `bestPairing`: Calculates the optimal match pairings for a court based on partnership histories.

## 🔌 Registering Engines

To register a new game engine:
1. Implement the engine in a new file in this directory (e.g., `myCustomEngine.ts`).
2. Export your engine instance.
3. Add your instance to the `GAME_ENGINES` list in [index.ts](index.ts).

## 🧪 Testing

Each engine should be backed by a corresponding `.test.ts` file in this directory. Run them via:
```bash
npm run test
```
