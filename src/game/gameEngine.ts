/**
 * Shared game engine - pure functions for Risk game rules.
 * Used by both local store and multiplayer Supabase sync.
 * No side effects, no state mutations, no DB calls.
 */

import { TerritoryState, RiskCard, CardType, getTradeInValue } from './types';
import { TERRITORIES, CONTINENTS, TERRITORY_MAP } from './mapData';

// ==================== DICE ====================

export function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function rollDice(count: number): number[] {
  return Array.from({ length: count }, () => rollDie()).sort((a, b) => b - a);
}

// ==================== SHUFFLING ====================

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ==================== DECK ====================

export function createDeck(): RiskCard[] {
  const types: CardType[] = ['Infantry', 'Cavalry', 'Artillery'];
  const cards: RiskCard[] = TERRITORIES.map((t, i) => ({
    id: `card-${t.id}`,
    territoryId: t.id,
    type: types[i % 3],
  }));
  cards.push({ id: 'wild-1', territoryId: null, type: 'Wild' });
  cards.push({ id: 'wild-2', territoryId: null, type: 'Wild' });
  return shuffleArray(cards);
}

// ==================== REINFORCEMENTS ====================

export function calculateReinforcements(
  playerIndex: number,
  territories: Record<string, TerritoryState>
): number {
  const owned = Object.entries(territories).filter(([, s]) => s.ownerId === playerIndex);
  let armies = Math.max(3, Math.floor(owned.length / 3));
  for (const continent of CONTINENTS) {
    if (continent.territories.every(tid => territories[tid]?.ownerId === playerIndex)) {
      armies += continent.bonus;
    }
  }
  return armies;
}

// ==================== CARD VALIDATION ====================

export function isValidCardSet(cards: RiskCard[]): boolean {
  if (cards.length !== 3) return false;
  const types = cards.map(c => c.type);
  const wilds = types.filter(t => t === 'Wild').length;
  const nonWild = types.filter(t => t !== 'Wild');
  if (wilds >= 2) return true;
  if (wilds === 1) return true;
  if (nonWild[0] === nonWild[1] && nonWild[1] === nonWild[2]) return true;
  if (new Set(nonWild).size === 3) return true;
  return false;
}

export { getTradeInValue };

// ==================== COMBAT ====================

export interface CombatResult {
  attackerRolls: number[];
  defenderRolls: number[];
  attackerLosses: number;
  defenderLosses: number;
  captured: boolean;
  newSourceArmies: number;
  newTargetArmies: number;
  newTargetOwner: number;  // ownerId of target after combat
}

export function resolveCombat(
  sourceArmies: number,
  targetArmies: number,
  sourceOwner: number,
  targetOwner: number,
  attackDice: number,
  defendDice: number
): CombatResult {
  const maxAttack = Math.min(3, sourceArmies - 1);
  const maxDefend = Math.min(2, targetArmies);
  attackDice = Math.min(attackDice, maxAttack);
  defendDice = Math.min(defendDice, maxDefend);

  const aRolls = rollDice(attackDice);
  const dRolls = rollDice(defendDice);

  let aLoss = 0, dLoss = 0;
  for (let i = 0; i < Math.min(aRolls.length, dRolls.length); i++) {
    if (aRolls[i] > dRolls[i]) dLoss++;
    else aLoss++;
  }

  const newSourceArmies = sourceArmies - aLoss;
  const newTargetArmies = targetArmies - dLoss;
  const captured = newTargetArmies <= 0;

  return {
    attackerRolls: aRolls,
    defenderRolls: dRolls,
    attackerLosses: aLoss,
    defenderLosses: dLoss,
    captured,
    newSourceArmies,
    newTargetArmies: captured ? 0 : newTargetArmies,
    newTargetOwner: captured ? sourceOwner : targetOwner,
  };
}

// ==================== TERRITORY SETUP ====================

export function distributeTerritories(playerCount: number): Record<string, TerritoryState> {
  const shuffled = shuffleArray(TERRITORIES.map(t => t.id));
  const territories: Record<string, TerritoryState> = {};

  shuffled.forEach((tid, i) => {
    territories[tid] = { ownerId: i % playerCount, armies: 1 };
  });

  // Distribute remaining armies (14 per player = 7 territories + 7 extra)
  for (let p = 0; p < playerCount; p++) {
    let remaining = 13; // 14 total - 1 already placed per territory = varies, but classic is 14 per player
    const owned = shuffled.filter((_, i) => i % playerCount === p);
    while (remaining > 0) {
      const tid = owned[Math.floor(Math.random() * owned.length)];
      territories[tid].armies += 1;
      remaining--;
    }
  }

  return territories;
}

// ==================== ADJACENCY CHECK ====================

export function areAdjacent(tid1: string, tid2: string): boolean {
  const t = TERRITORY_MAP.get(tid1);
  return t ? t.adjacent.includes(tid2) : false;
}

// ==================== NEXT PLAYER ====================

export function getNextActivePlayer(
  currentIndex: number,
  eliminatedSlots: boolean[],
  playerCount: number = 6
): number {
  let next = (currentIndex + 1) % playerCount;
  while (eliminatedSlots[next]) {
    next = (next + 1) % playerCount;
    if (next === currentIndex) break; // safety: all eliminated
  }
  return next;
}

// ==================== WIN CHECK ====================

export function checkWorldDomination(
  playerIndex: number,
  territories: Record<string, TerritoryState>
): boolean {
  return Object.values(territories).every(t => t.ownerId === playerIndex);
}

export function isPlayerEliminated(
  playerIndex: number,
  territories: Record<string, TerritoryState>
): boolean {
  return !Object.values(territories).some(t => t.ownerId === playerIndex);
}
