# 🏓 PickleFlow Game Engines

This directory contains the pluggable scheduling and standings calculation logic for PickleFlow Pro.

## 🏗️ Architecture

All game engines implement the `GameEngine` interface defined in [types.ts](../../types.ts):

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
  
  // Custom leaderboard sorter and differential calculator
  calculateLeaderboard(players: Player[], rounds: Round[], sortKey: 'avgPoints' | 'pointsFor'): PlayerStats[];
}
```

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
