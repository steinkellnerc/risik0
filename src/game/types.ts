export type Phase = 'SETUP' | 'REINFORCE' | 'ATTACK' | 'FORTIFY';

export type CardType = 'Infantry' | 'Cavalry' | 'Artillery' | 'Wild';

export interface RiskCard {
  id: string;
  territoryId: string | null;
  type: CardType;
}

export interface Territory {
  id: string;
  name: string;
  continentId: string;
  adjacent: string[];
  cx: number; // SVG centroid x
  cy: number; // SVG centroid y
}

export interface Continent {
  id: string;
  name: string;
  bonus: number;
  territories: string[];
}

export interface TerritoryState {
  ownerId: number; // player index 0-5
  armies: number;
}

export interface Player {
  id: number;
  name: string;
  color: string; // tailwind class
  cards: RiskCard[];
  eliminated: boolean;
}

export interface GameState {
  id: string;
  turn: number;
  currentPlayerIndex: number;
  phase: Phase;
  territories: Record<string, TerritoryState>;
  players: Player[];
  tradeInCount: number;
  reinforcementsLeft: number;
  hasConqueredThisTurn: boolean;
  attackSource: string | null;
  attackTarget: string | null;
  fortifySource: string | null;
  fortifyTarget: string | null;
  lastDiceRoll: { attacker: number[]; defender: number[] } | null;
  log: { timestamp: number; message: string }[];
  winner: number | null;
  started: boolean;
}

export const PLAYER_COLORS = [
  'player-1', 'player-2', 'player-3', 'player-4', 'player-5', 'player-6'
];

export const PLAYER_CSS_VARS = [
  '--player-1', '--player-2', '--player-3', '--player-4', '--player-5', '--player-6'
];

export const PLAYER_NAMES = [
  'Red Empire', 'Blue Legion', 'Green Alliance', 'Yellow Republic', 'Purple Dominion', 'Orange Federation'
];

export const TRADE_IN_VALUES = [4, 6, 8, 10, 12, 15];
// After 6th trade-in, each subsequent adds 5
export function getTradeInValue(tradeInCount: number): number {
  if (tradeInCount < TRADE_IN_VALUES.length) return TRADE_IN_VALUES[tradeInCount];
  return 15 + (tradeInCount - TRADE_IN_VALUES.length + 1) * 5;
}
