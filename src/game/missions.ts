import { Mission, MISSIONS_POOL, DESTROY_PLAYER_MISSIONS, TerritoryState } from './types';
import { CONTINENTS } from './mapData';

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Seeded PRNG (mulberry32) — produces same sequence for same seed
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/**
 * Assign missions deterministically from a gameId seed.
 * All clients derive identical results for the same gameId.
 */
export function assignMissionsSeeded(gameId: string, playerCount: number): Record<number, Mission> {
  const rng = mulberry32(hashString(gameId));
  const missions: Record<number, Mission> = {};

  const pool: Mission[] = [
    ...MISSIONS_POOL.map(m => ({ ...m })),
  ];
  for (let i = 0; i < playerCount; i++) {
    pool.push({ ...DESTROY_PLAYER_MISSIONS[i], targetPlayerIndex: i });
  }

  // Seeded Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  for (let p = 0; p < playerCount; p++) {
    const idx = pool.findIndex(m => m.type !== 'destroy_player' || m.targetPlayerIndex !== p);
    if (idx !== -1) {
      missions[p] = pool.splice(idx, 1)[0];
    } else {
      missions[p] = { id: `fallback-${p}`, type: 'conquer_territories', description: 'Conquer 24 territories.', territoryCount: 24 };
    }
  }

  return missions;
}

/**
 * Assign missions to 6 players.
 * Rules: A player cannot get "destroy yourself" mission.
 * If a player gets "destroy X" and X is already eliminated, they must conquer 24 territories instead.
 */
export function assignMissions(playerCount: number): Record<number, Mission> {
  const missions: Record<number, Mission> = {};

  // Build pool: general missions + destroy missions (excluding self-destroy)
  const pool: Mission[] = [
    ...MISSIONS_POOL.map(m => ({ ...m })),
  ];

  // Add destroy-player missions with targetPlayerIndex
  for (let i = 0; i < playerCount; i++) {
    pool.push({
      ...DESTROY_PLAYER_MISSIONS[i],
      targetPlayerIndex: i,
    });
  }

  const shuffled = shuffleArray(pool);

  for (let p = 0; p < playerCount; p++) {
    // Find a mission that isn't "destroy yourself"
    const idx = shuffled.findIndex(m =>
      m.type !== 'destroy_player' || m.targetPlayerIndex !== p
    );
    if (idx !== -1) {
      missions[p] = shuffled.splice(idx, 1)[0];
    } else {
      // Fallback: conquer 24
      missions[p] = {
        id: `fallback-${p}`,
        type: 'conquer_territories',
        description: 'Conquer 24 territories.',
        territoryCount: 24,
      };
    }
  }

  return missions;
}

/**
 * Check if a player has completed their mission.
 */
export function checkMissionComplete(
  playerIndex: number,
  mission: Mission,
  territories: Record<string, TerritoryState>,
  eliminatedPlayers: boolean[]
): boolean {
  const owned = Object.entries(territories).filter(([, s]) => s.ownerId === playerIndex);

  switch (mission.type) {
    case 'conquer_continents': {
      if (!mission.continents) return false;
      // Must own all territories in specified continents
      // For "third continent of choice" missions (2 specified), check if player owns any 3 full continents including the 2 specified
      const fullContinents = CONTINENTS.filter(c =>
        c.territories.every(tid => territories[tid]?.ownerId === playerIndex)
      );
      const fullIds = fullContinents.map(c => c.id);
      const hasRequired = mission.continents.every(cid => fullIds.includes(cid));
      // If description mentions "third continent", need one extra
      if (mission.description.includes('third continent')) {
        return hasRequired && fullContinents.length >= 3;
      }
      return hasRequired;
    }
    case 'conquer_territories': {
      if (!mission.territoryCount) return false;
      if (mission.minArmiesPerTerritory) {
        return owned.filter(([, s]) => s.armies >= mission.minArmiesPerTerritory!).length >= mission.territoryCount;
      }
      return owned.length >= mission.territoryCount;
    }
    case 'destroy_player': {
      if (mission.targetPlayerIndex === undefined) return false;
      // If target is eliminated, check if this player did it (or fallback to 24 territories)
      if (eliminatedPlayers[mission.targetPlayerIndex]) {
        return true;
      }
      return false;
    }
    default:
      return false;
  }
}
