import { standardEngine } from './standard';
import { kingAndQueenEngine } from './kingAndQueen';
import { GameEngine } from './types';

export const GAME_ENGINES: GameEngine[] = [standardEngine, kingAndQueenEngine];

export function getEngine(id: string): GameEngine {
  return GAME_ENGINES.find((e) => e.id === id) ?? standardEngine;
}

export type { GameEngine };
