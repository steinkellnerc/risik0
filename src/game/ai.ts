import { TERRITORIES, TERRITORY_MAP, CONTINENTS } from './mapData';
import { TerritoryState } from './types';

/**
 * Rule-based AI for Risk.
 * Strategies:
 * - Reinforce border territories (those adjacent to enemies), preferring weakest borders
 * - Attack neighbors with favorable odds (3:1+ army ratio), prioritize continent completion
 * - Fortify by moving interior armies to the weakest border
 */

// Get territories owned by a player
function getOwned(playerIndex: number, territories: Record<string, TerritoryState>): string[] {
  return Object.entries(territories)
    .filter(([, s]) => s.ownerId === playerIndex)
    .map(([id]) => id);
}

// Get border territories (adjacent to at least one enemy)
function getBorders(playerIndex: number, territories: Record<string, TerritoryState>): string[] {
  return getOwned(playerIndex, territories).filter(tid => {
    const t = TERRITORY_MAP.get(tid)!;
    return t.adjacent.some(a => territories[a]?.ownerId !== playerIndex);
  });
}

// Get interior territories (all neighbors owned by same player, armies > 1)
function getInterior(playerIndex: number, territories: Record<string, TerritoryState>): string[] {
  return getOwned(playerIndex, territories).filter(tid => {
    const t = TERRITORY_MAP.get(tid)!;
    return t.adjacent.every(a => territories[a]?.ownerId === playerIndex) && territories[tid].armies > 1;
  });
}

// Score a territory for reinforcement priority (higher = more urgent)
function borderThreatScore(tid: string, playerIndex: number, territories: Record<string, TerritoryState>): number {
  const t = TERRITORY_MAP.get(tid)!;
  const myArmies = territories[tid].armies;
  let maxEnemyArmies = 0;
  let enemyNeighborCount = 0;
  for (const adj of t.adjacent) {
    if (territories[adj]?.ownerId !== playerIndex) {
      enemyNeighborCount++;
      maxEnemyArmies = Math.max(maxEnemyArmies, territories[adj].armies);
    }
  }
  // Higher threat = more enemy neighbors, enemy has more armies than us
  return (maxEnemyArmies - myArmies) + enemyNeighborCount * 2;
}

// Check how close player is to completing a continent
function continentProgress(playerIndex: number, territories: Record<string, TerritoryState>) {
  return CONTINENTS.map(c => {
    const owned = c.territories.filter(tid => territories[tid]?.ownerId === playerIndex).length;
    return { continent: c, owned, total: c.territories.length, remaining: c.territories.length - owned };
  }).sort((a, b) => a.remaining - b.remaining);
}

// ========== AI ACTIONS ==========\

export interface AIReinforceAction {
  type: 'reinforce';
  territoryId: string;
}

export function aiReinforce(
  playerIndex: number,
  territories: Record<string, TerritoryState>,
  reinforcementsLeft: number
): AIReinforceAction[] {
  const actions: AIReinforceAction[] = [];
  const borders = getBorders(playerIndex, territories);
  if (borders.length === 0) return actions;

  // Copy territories for simulation
  const simTerritories = { ...territories };
  for (const tid of Object.keys(simTerritories)) {
    simTerritories[tid] = { ...simTerritories[tid] };
  }

  // Check continent progress - if close to completing, prioritize those borders
  const progress = continentProgress(playerIndex, simTerritories);
  const nearComplete = progress.filter(p => p.remaining <= 2 && p.remaining > 0);

  for (let i = 0; i < reinforcementsLeft; i++) {
    // Prioritize borders near continents we're close to completing
    let bestTid = '';
    let bestScore = -Infinity;

    for (const tid of borders) {
      let score = borderThreatScore(tid, playerIndex, simTerritories);
      // Bonus for being near a continent we're close to completing
      for (const nc of nearComplete) {
        const t = TERRITORY_MAP.get(tid)!;
        if (t.adjacent.some(a => nc.continent.territories.includes(a) && simTerritories[a]?.ownerId !== playerIndex)) {
          score += 5;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestTid = tid;
      }
    }

    if (bestTid) {
      actions.push({ type: 'reinforce', territoryId: bestTid });
      simTerritories[bestTid].armies += 1;
    }
  }

  return actions;
}

export interface AIAttackAction {
  type: 'attack';
  source: string;
  target: string;
  dice: number;
}

export function aiDecideAttacks(
  playerIndex: number,
  territories: Record<string, TerritoryState>
): AIAttackAction[] {
  const attacks: AIAttackAction[] = [];
  const owned = getOwned(playerIndex, territories);

  // Build candidate attacks
  const candidates: { source: string; target: string; ratio: number; continentBonus: number }[] = [];

  for (const tid of owned) {
    if (territories[tid].armies < 2) continue;
    const t = TERRITORY_MAP.get(tid)!;
    for (const adj of t.adjacent) {
      if (territories[adj]?.ownerId === playerIndex) continue;
      const ratio = territories[tid].armies / territories[adj].armies;
      // Continent completion bonus
      let continentBonus = 0;
      const progress = continentProgress(playerIndex, territories);
      for (const p of progress) {
        if (p.continent.territories.includes(adj) && p.remaining <= 3) {
          continentBonus = (4 - p.remaining) * 2;
        }
      }
      candidates.push({ source: tid, target: adj, ratio, continentBonus });
    }
  }

  // Sort by strategic value: continent completion first, then army ratio
  candidates.sort((a, b) => (b.continentBonus + b.ratio) - (a.continentBonus + a.ratio));

  // Only attack when we have good odds (ratio >= 1.5) or strong continent motivation
  for (const c of candidates) {
    if (c.ratio >= 1.5 || (c.continentBonus > 0 && c.ratio >= 1.2)) {
      const maxDice = Math.min(3, territories[c.source].armies - 1);
      if (maxDice >= 1) {
        attacks.push({ type: 'attack', source: c.source, target: c.target, dice: maxDice });
      }
    }
    // Limit to 5 attacks per turn to keep games moving
    if (attacks.length >= 5) break;
  }

  return attacks;
}

export interface AIFortifyAction {
  type: 'fortify';
  source: string;
  target: string;
  count: number;
}

export function aiFortify(
  playerIndex: number,
  territories: Record<string, TerritoryState>
): AIFortifyAction | null {
  const interior = getInterior(playerIndex, territories);
  const borders = getBorders(playerIndex, territories);
  if (interior.length === 0 || borders.length === 0) return null;

  // Find interior territory with most armies
  let bestInterior = '';
  let bestInteriorArmies = 0;
  for (const tid of interior) {
    if (territories[tid].armies > bestInteriorArmies) {
      bestInteriorArmies = territories[tid].armies;
      bestInterior = tid;
    }
  }

  if (!bestInterior || bestInteriorArmies <= 1) return null;

  // Find weakest adjacent border
  const t = TERRITORY_MAP.get(bestInterior)!;
  let bestBorder = '';
  let bestBorderScore = -Infinity;
  for (const adj of t.adjacent) {
    if (territories[adj]?.ownerId === playerIndex && borders.includes(adj)) {
      const score = borderThreatScore(adj, playerIndex, territories);
      if (score > bestBorderScore) {
        bestBorderScore = score;
        bestBorder = adj;
      }
    }
  }

  if (!bestBorder) return null;

  return {
    type: 'fortify',
    source: bestInterior,
    target: bestBorder,
    count: territories[bestInterior].armies - 1,
  };
}
