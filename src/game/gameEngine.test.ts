import { describe, expect, it, vi } from 'vitest';
import {
  areAdjacent,
  distributeTerritories,
  getTerritoryCardBonus,
  isValidCardSet,
  resolveCombat,
} from './gameEngine';
import { TERRITORIES } from './mapData';
import type { RiskCard, TerritoryState } from './types';
import { aiDecideAttacks } from './ai';

const card = (id: string, type: RiskCard['type']): RiskCard => ({
  id,
  type,
  territoryId: null,
});

describe('classic game rules', () => {
  it('distributes all territories and 20 starting armies to each of six players', () => {
    const territories = distributeTerritories(6);
    const ownedCount = Array(6).fill(0) as number[];
    const armyCount = Array(6).fill(0) as number[];

    for (const territory of Object.values(territories)) {
      ownedCount[territory.ownerId]++;
      armyCount[territory.ownerId] += territory.armies;
    }

    expect(Object.keys(territories)).toHaveLength(42);
    expect(ownedCount).toEqual([7, 7, 7, 7, 7, 7]);
    expect(armyCount).toEqual([20, 20, 20, 20, 20, 20]);
  });

  it('validates card sets, including wild cards', () => {
    expect(isValidCardSet([card('a', 'Infantry'), card('b', 'Infantry'), card('c', 'Infantry')])).toBe(true);
    expect(isValidCardSet([card('a', 'Infantry'), card('b', 'Cavalry'), card('c', 'Artillery')])).toBe(true);
    expect(isValidCardSet([card('a', 'Infantry'), card('b', 'Wild'), card('c', 'Artillery')])).toBe(true);
    expect(isValidCardSet([card('a', 'Infantry'), card('b', 'Cavalry'), card('c', 'Cavalry')])).toBe(false);
    expect(isValidCardSet([card('a', 'Infantry'), card('b', 'Infantry')])).toBe(false);
  });

  it('awards two bonus armies for each traded territory card already owned', () => {
    expect(getTerritoryCardBonus(
      [card('a', 'Infantry'), { ...card('b', 'Cavalry'), territoryId: 'alaska' }],
      0,
      { alaska: { ownerId: 0, armies: 2 } }
    )).toBe(2);
  });

  it('keeps combat ties in the defender\'s favor', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const result = resolveCombat(3, 2, 0, 1, 1, 1);
    vi.restoreAllMocks();

    expect(result.attackerLosses).toBe(1);
    expect(result.defenderLosses).toBe(0);
  });

  it('uses the game map adjacency when checking attacks', () => {
    expect(areAdjacent('alaska', 'kamchatka')).toBe(true);
    expect(areAdjacent('alaska', 'brazil')).toBe(false);
  });

  it('prioritizes attacks against a secret-mission target', () => {
    const territories = Object.fromEntries(
      TERRITORIES.map(territory => [territory.id, { ownerId: 2, armies: 1 }])
    ) as Record<string, TerritoryState>;
    territories.alaska = { ownerId: 0, armies: 3 };
    territories['northwest-territory'] = { ownerId: 1, armies: 2 };

    const attacks = aiDecideAttacks(0, territories, {
      id: 'destroy-1',
      type: 'destroy_player',
      description: 'Destroy the Yellow Republic.',
      targetPlayerIndex: 1,
    });

    expect(attacks[0]).toMatchObject({
      source: 'alaska',
      target: 'northwest-territory',
    });
  });
});
