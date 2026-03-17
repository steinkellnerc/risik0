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
  cx: number;
  cy: number;
}

export interface Continent {
  id: string;
  name: string;
  bonus: number;
  territories: string[];
}

export interface TerritoryState {
  ownerId: number;
  armies: number;
}

export interface Player {
  id: number;
  name: string;
  color: string;
  cards: RiskCard[];
  eliminated: boolean;
  isAI: boolean;
}

// Secret Mission cards (classic Risk)
export type MissionType =
  | 'conquer_continents'
  | 'conquer_territories'
  | 'destroy_player';

export interface Mission {
  id: string;
  type: MissionType;
  description: string;
  // For conquer_continents
  continents?: string[];
  // For conquer_territories  
  territoryCount?: number;
  minArmiesPerTerritory?: number;
  // For destroy_player
  targetPlayerIndex?: number;
}

export const MISSIONS_POOL: Omit<Mission, 'targetPlayerIndex'>[] = [
  { id: 'mission-na-africa', type: 'conquer_continents', description: 'Conquer North America and Africa.', continents: ['north-america', 'africa'] },
  { id: 'mission-na-australia', type: 'conquer_continents', description: 'Conquer North America and Australia.', continents: ['north-america', 'australia'] },
  { id: 'mission-asia-sa', type: 'conquer_continents', description: 'Conquer Asia and South America.', continents: ['asia', 'south-america'] },
  { id: 'mission-asia-africa', type: 'conquer_continents', description: 'Conquer Asia and Africa.', continents: ['asia', 'africa'] },
  { id: 'mission-europe-sa-third', type: 'conquer_continents', description: 'Conquer Europe, South America, and a third continent of your choice.', continents: ['europe', 'south-america'] },
  { id: 'mission-europe-australia-third', type: 'conquer_continents', description: 'Conquer Europe, Australia, and a third continent of your choice.', continents: ['europe', 'australia'] },
  { id: 'mission-24-territories', type: 'conquer_territories', description: 'Conquer 24 territories.', territoryCount: 24 },
  { id: 'mission-18-territories-2', type: 'conquer_territories', description: 'Conquer 18 territories with at least 2 armies each.', territoryCount: 18, minArmiesPerTerritory: 2 },
];

// 6 destroy-player missions (one per player color)
export const DESTROY_PLAYER_MISSIONS: Omit<Mission, 'targetPlayerIndex'>[] = [
  { id: 'destroy-0', type: 'destroy_player', description: 'Destroy all armies of Red Empire.' },
  { id: 'destroy-1', type: 'destroy_player', description: 'Destroy all armies of Blue Legion.' },
  { id: 'destroy-2', type: 'destroy_player', description: 'Destroy all armies of Green Alliance.' },
  { id: 'destroy-3', type: 'destroy_player', description: 'Destroy all armies of Yellow Republic.' },
  { id: 'destroy-4', type: 'destroy_player', description: 'Destroy all armies of Purple Dominion.' },
  { id: 'destroy-5', type: 'destroy_player', description: 'Destroy all armies of Orange Federation.' },
];

export interface GameConfig {
  humanPlayerCount: number; // 1-6
  useMissions: boolean;
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
  missions: Record<number, Mission>; // playerIndex -> mission
  useMissions: boolean;
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
export function getTradeInValue(tradeInCount: number): number {
  if (tradeInCount < TRADE_IN_VALUES.length) return TRADE_IN_VALUES[tradeInCount];
  return 15 + (tradeInCount - TRADE_IN_VALUES.length + 1) * 5;
}
