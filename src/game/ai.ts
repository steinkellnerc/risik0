import { TERRITORIES, TERRITORY_MAP, CONTINENTS } from './mapData';
import { TerritoryState, Mission } from './types';

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
  territories: Record<string, TerritoryState>,
  mission?: Mission
): AIAttackAction[] {
  const attacks: AIAttackAction[] = [];
  const owned = getOwned(playerIndex, territories);
  const progress = continentProgress(playerIndex, territories);

  // Build candidate attacks
  const candidates: { source: string; target: string; ratio: number; score: number }[] = [];

  for (const tid of owned) {
    if (territories[tid].armies < 2) continue;
    const t = TERRITORY_MAP.get(tid)!;
    for (const adj of t.adjacent) {
      if (territories[adj]?.ownerId === playerIndex) continue;
      const ratio = territories[tid].armies / Math.max(1, territories[adj].armies);

      // Continent completion bonus — aggressively pursue near-complete continents
      let continentBonus = 0;
      for (const p of progress) {
        if (p.continent.territories.includes(adj) && p.remaining <= 3) {
          continentBonus = (4 - p.remaining) * 3;
        }
      }

      // Mission-specific bonuses
      let missionBonus = 0;
      if (mission) {
        if (mission.type === 'destroy_player' && mission.targetPlayerIndex !== undefined) {
          // Heavily prioritize attacking the target player's territories
          if (territories[adj].ownerId === mission.targetPlayerIndex) missionBonus = 8;
        } else if (mission.type === 'conquer_continents' && mission.continents) {
          // Prioritize territories in mission continents
          const adjTerritory = TERRITORY_MAP.get(adj);
          if (adjTerritory && mission.continents.includes(adjTerritory.continentId)) missionBonus = 6;
        }
      }

      // Eliminate weakened players (target has only 1 army = easy pick)
      const easyPickBonus = territories[adj].armies === 1 ? 2 : 0;

      candidates.push({ source: tid, target: adj, ratio, score: ratio + continentBonus + missionBonus + easyPickBonus });
    }
  }

  // Sort by strategic value
  candidates.sort((a, b) => b.score - a.score);

  for (const c of candidates) {
    const srcArmies = territories[c.source].armies;
    // High-priority (mission / continent completion): accept 3-army source and softer ratio
    if (c.score >= 8 && srcArmies >= 3 && c.ratio >= 0.8) {
      attacks.push({ type: 'attack', source: c.source, target: c.target, dice: Math.min(3, srcArmies - 1) });
    // Standard attack: require 4+ armies at source (3 attacking dice) and favorable odds
    } else if (srcArmies >= 4 && c.ratio >= 1.2) {
      attacks.push({ type: 'attack', source: c.source, target: c.target, dice: Math.min(3, srcArmies - 1) });
    }
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
  const owned = getOwned(playerIndex, territories);
  const borderSet = new Set(getBorders(playerIndex, territories));
  if (borderSet.size === 0) return null;

  // Find the best source→target pair:
  // source = any owned territory with > 1 army
  // target = an adjacent owned border with higher threat than the source
  let bestAction: AIFortifyAction | null = null;
  let bestScore = -Infinity;

  for (const src of owned) {
    if (territories[src].armies <= 1) continue;
    const srcThreat = borderSet.has(src) ? borderThreatScore(src, playerIndex, territories) : -10;
    const t = TERRITORY_MAP.get(src)!;

    for (const adj of t.adjacent) {
      if (territories[adj]?.ownerId !== playerIndex) continue;
      if (!borderSet.has(adj)) continue;
      const adjThreat = borderThreatScore(adj, playerIndex, territories);
      // Only move armies if the destination is more threatened than the source
      const score = adjThreat - srcThreat;
      if (score > bestScore) {
        bestScore = score;
        bestAction = {
          type: 'fortify',
          source: src,
          target: adj,
          count: territories[src].armies - 1,
        };
      }
    }
  }

  return bestAction;
}
