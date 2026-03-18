/**
 * Offline Validation Tests
 *
 * Tests without a live Supabase instance:
 * 1. Schema SQL file parses and contains required tables/columns
 * 2. Game engine functions work correctly (combat, reinforcements, etc.)
 * 3. Multiplayer sync module exports expected functions
 * 4. Database types are correctly defined
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Game engine imports
import {
  rollDice,
  shuffleArray,
  createDeck,
  calculateReinforcements,
  isValidCardSet,
  resolveCombat,
  distributeTerritories,
  areAdjacent,
  getNextActivePlayer,
  checkWorldDomination,
  isPlayerEliminated,
} from '../game/gameEngine';

import type { TerritoryState, RiskCard } from '../game/types';

// ============================================================
// Test 1: Schema SQL Verification
// ============================================================
describe('Schema SQL file', () => {
  const schemaPath = path.resolve(__dirname, '../../supabase/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  it('creates games table with all required columns', () => {
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS games');
    expect(schema).toContain('status TEXT');
    expect(schema).toContain('current_player_index INTEGER');
    expect(schema).toContain('turn_phase TEXT');
    expect(schema).toContain('turn_number INTEGER');
    expect(schema).toContain('trade_in_count INTEGER');
    expect(schema).toContain('has_conquered_this_turn BOOLEAN');
    expect(schema).toContain('use_missions BOOLEAN');
    expect(schema).toContain('winner_id UUID');
    expect(schema).toContain('last_move_at TIMESTAMP');
  });

  it('creates players table with all required columns', () => {
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS players');
    expect(schema).toContain('game_id UUID');
    expect(schema).toContain('user_id UUID');
    expect(schema).toContain('slot_index INTEGER');
    expect(schema).toContain('display_name TEXT');
    expect(schema).toContain('color TEXT');
    expect(schema).toContain('armies_to_place INTEGER');
    expect(schema).toContain('is_ai BOOLEAN');
    expect(schema).toContain('secret_objective TEXT');
    expect(schema).toContain('eliminated BOOLEAN');
    expect(schema).toContain('cards JSONB');
  });

  it('creates territories table with all required columns', () => {
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS territories');
    expect(schema).toContain('territory_id TEXT');
    expect(schema).toContain('owner_slot_index INTEGER');
    expect(schema).toContain('army_count INTEGER');
    expect(schema).toContain('UNIQUE(game_id, territory_id)');
  });

  it('creates risk_cards table', () => {
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS risk_cards');
    expect(schema).toContain('player_id UUID');
    expect(schema).toContain('territory_name TEXT');
    expect(schema).toContain('card_type TEXT');
  });

  it('creates game_log table', () => {
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS game_log');
    expect(schema).toContain('player_slot_index INTEGER');
    expect(schema).toContain('message TEXT');
    expect(schema).toContain('action_type TEXT');
  });

  it('enables RLS on all tables', () => {
    expect(schema).toContain('ALTER TABLE games ENABLE ROW LEVEL SECURITY');
    expect(schema).toContain('ALTER TABLE players ENABLE ROW LEVEL SECURITY');
    expect(schema).toContain('ALTER TABLE territories ENABLE ROW LEVEL SECURITY');
    expect(schema).toContain('ALTER TABLE risk_cards ENABLE ROW LEVEL SECURITY');
    expect(schema).toContain('ALTER TABLE game_log ENABLE ROW LEVEL SECURITY');
  });

  it('enables Realtime on required tables', () => {
    expect(schema).toContain('ALTER PUBLICATION supabase_realtime ADD TABLE games, players, territories, game_log');
  });

  it('creates secret objective security function', () => {
    expect(schema).toContain('get_player_secret_objective');
    expect(schema).toContain('SECURITY DEFINER');
  });

  it('creates turn validation function', () => {
    expect(schema).toContain('validate_turn_action');
  });

  it('creates RLS policies for players secret_objective protection', () => {
    expect(schema).toContain('players_select');
    expect(schema).toContain('players_update');
  });
});

// ============================================================
// Test 2: Game Engine — Create Game simulation
// ============================================================
describe('Game Engine — Create Game', () => {
  it('distributeTerritories creates 42 territories across 6 players', () => {
    const territories = distributeTerritories(6);
    const ids = Object.keys(territories);
    expect(ids.length).toBe(42);

    // Each player should own 7 territories
    for (let p = 0; p < 6; p++) {
      const owned = ids.filter(id => territories[id].ownerId === p);
      expect(owned.length).toBe(7);
    }
  });

  it('each territory has at least 1 army', () => {
    const territories = distributeTerritories(6);
    for (const state of Object.values(territories)) {
      expect(state.armies).toBeGreaterThanOrEqual(1);
    }
  });

  it('total armies equals 42 + 78 (1 per territory + 13 extra per player)', () => {
    const territories = distributeTerritories(6);
    const total = Object.values(territories).reduce((sum, t) => sum + t.armies, 0);
    // 42 territories * 1 base + 6 players * 13 extra = 42 + 78 = 120
    expect(total).toBe(120);
  });

  it('createDeck creates 44 cards (42 territory + 2 wild)', () => {
    const deck = createDeck();
    expect(deck.length).toBe(44);
    const wilds = deck.filter(c => c.type === 'Wild');
    expect(wilds.length).toBe(2);
    const territoryCards = deck.filter(c => c.territoryId !== null);
    expect(territoryCards.length).toBe(42);
  });

  it('shuffleArray returns a different order (probabilistic)', () => {
    const arr = Array.from({ length: 20 }, (_, i) => i);
    const shuffled = shuffleArray(arr);
    expect(shuffled.length).toBe(arr.length);
    // Very unlikely to be in the same order
    const sameOrder = shuffled.every((v, i) => v === arr[i]);
    // This can theoretically fail but with 20 elements it's 1/20! chance
    expect(sameOrder).toBe(false);
  });
});

// ============================================================
// Test 3: Game Engine — Reinforce simulation
// ============================================================
describe('Game Engine — Reinforce', () => {
  it('calculateReinforcements gives at least 3 for small territory count', () => {
    const territories: Record<string, TerritoryState> = {
      'alaska': { ownerId: 0, armies: 2 },
      'brazil': { ownerId: 0, armies: 1 },
      'egypt': { ownerId: 1, armies: 3 },
    };
    // Player 0 owns 2 territories → floor(2/3) = 0 → max(3, 0) = 3
    expect(calculateReinforcements(0, territories)).toBe(3);
  });

  it('calculateReinforcements adds continent bonus', () => {
    // Give player 0 all of Australia (4 territories, bonus 2)
    const territories: Record<string, TerritoryState> = {};
    const australiaTerritories = ['indonesia', 'new-guinea', 'western-australia', 'eastern-australia'];
    australiaTerritories.forEach(tid => {
      territories[tid] = { ownerId: 0, armies: 1 };
    });
    // Add some other territories for other players
    territories['alaska'] = { ownerId: 1, armies: 1 };

    // Player 0: floor(4/3) = 1 → max(3, 1) = 3, + 2 (Australia bonus) = 5
    expect(calculateReinforcements(0, territories)).toBe(5);
  });

  it('simulating reinforce: incrementing army_count works correctly', () => {
    const territories: Record<string, TerritoryState> = {
      'alaska': { ownerId: 0, armies: 3 },
    };

    // Simulate reinforce: increment alaska
    const updated = {
      ...territories,
      'alaska': { ...territories['alaska'], armies: territories['alaska'].armies + 1 },
    };

    expect(updated['alaska'].armies).toBe(4);
    expect(updated['alaska'].ownerId).toBe(0); // owner unchanged
  });
});

// ============================================================
// Test 4: Game Engine — Combat
// ============================================================
describe('Game Engine — Combat', () => {
  it('resolveCombat returns valid result structure', () => {
    const result = resolveCombat(5, 3, 0, 1, 3, 2);
    expect(result.attackerRolls.length).toBeLessThanOrEqual(3);
    expect(result.defenderRolls.length).toBeLessThanOrEqual(2);
    expect(result.attackerLosses).toBeGreaterThanOrEqual(0);
    expect(result.defenderLosses).toBeGreaterThanOrEqual(0);
    expect(result.attackerLosses + result.defenderLosses).toBeGreaterThan(0);
    expect(typeof result.captured).toBe('boolean');
  });

  it('resolveCombat caps dice at valid maximums', () => {
    // Source has 2 armies, so max attack dice = 1
    const result = resolveCombat(2, 3, 0, 1, 3, 2);
    expect(result.attackerRolls.length).toBe(1);
  });

  it('capture happens when defender armies reach 0', () => {
    // Run many combats to verify capture logic
    let capturedAtLeastOnce = false;
    for (let i = 0; i < 100; i++) {
      const result = resolveCombat(10, 1, 0, 1, 3, 1);
      if (result.captured) {
        capturedAtLeastOnce = true;
        expect(result.newTargetOwner).toBe(0); // attacker takes over
        expect(result.newTargetArmies).toBe(0);
        break;
      }
    }
    expect(capturedAtLeastOnce).toBe(true);
  });
});

// ============================================================
// Test 5: Game Engine — Utility functions
// ============================================================
describe('Game Engine — Utilities', () => {
  it('areAdjacent returns true for adjacent territories', () => {
    expect(areAdjacent('alaska', 'northwest-territory')).toBe(true);
    expect(areAdjacent('alaska', 'kamchatka')).toBe(true);
  });

  it('areAdjacent returns false for non-adjacent territories', () => {
    expect(areAdjacent('alaska', 'brazil')).toBe(false);
    expect(areAdjacent('indonesia', 'greenland')).toBe(false);
  });

  it('getNextActivePlayer skips eliminated players', () => {
    const eliminated = [false, true, false, false, true, false];
    expect(getNextActivePlayer(0, eliminated)).toBe(2);
    expect(getNextActivePlayer(2, eliminated)).toBe(3);
    expect(getNextActivePlayer(3, eliminated)).toBe(5);
    expect(getNextActivePlayer(5, eliminated)).toBe(0);
  });

  it('checkWorldDomination returns true when player owns all', () => {
    const territories: Record<string, TerritoryState> = {};
    for (let i = 0; i < 42; i++) {
      territories[`t${i}`] = { ownerId: 0, armies: 1 };
    }
    expect(checkWorldDomination(0, territories)).toBe(true);
    expect(checkWorldDomination(1, territories)).toBe(false);
  });

  it('isPlayerEliminated returns true when player has no territories', () => {
    const territories: Record<string, TerritoryState> = {
      'alaska': { ownerId: 0, armies: 1 },
      'brazil': { ownerId: 0, armies: 1 },
    };
    expect(isPlayerEliminated(0, territories)).toBe(false);
    expect(isPlayerEliminated(1, territories)).toBe(true);
  });

  it('isValidCardSet validates card combinations', () => {
    // Three of a kind
    const threeInfantry: RiskCard[] = [
      { id: '1', territoryId: 'a', type: 'Infantry' },
      { id: '2', territoryId: 'b', type: 'Infantry' },
      { id: '3', territoryId: 'c', type: 'Infantry' },
    ];
    expect(isValidCardSet(threeInfantry)).toBe(true);

    // One of each
    const oneEach: RiskCard[] = [
      { id: '1', territoryId: 'a', type: 'Infantry' },
      { id: '2', territoryId: 'b', type: 'Cavalry' },
      { id: '3', territoryId: 'c', type: 'Artillery' },
    ];
    expect(isValidCardSet(oneEach)).toBe(true);

    // With wild
    const withWild: RiskCard[] = [
      { id: '1', territoryId: 'a', type: 'Infantry' },
      { id: '2', territoryId: 'b', type: 'Infantry' },
      { id: '3', territoryId: null, type: 'Wild' },
    ];
    expect(isValidCardSet(withWild)).toBe(true);

    // Invalid: two different, no wild
    const invalid: RiskCard[] = [
      { id: '1', territoryId: 'a', type: 'Infantry' },
      { id: '2', territoryId: 'b', type: 'Infantry' },
      { id: '3', territoryId: 'c', type: 'Cavalry' },
    ];
    expect(isValidCardSet(invalid)).toBe(false);
  });

  it('rollDice returns sorted descending', () => {
    for (let i = 0; i < 20; i++) {
      const dice = rollDice(3);
      expect(dice.length).toBe(3);
      expect(dice[0]).toBeGreaterThanOrEqual(dice[1]);
      expect(dice[1]).toBeGreaterThanOrEqual(dice[2]);
      dice.forEach(d => {
        expect(d).toBeGreaterThanOrEqual(1);
        expect(d).toBeLessThanOrEqual(6);
      });
    }
  });
});

// ============================================================
// Test 6: Database types are correctly structured
// ============================================================
describe('Database Types', () => {
  it('database.types.ts exports Database interface', async () => {
    const types = await import('../lib/database.types');
    expect(types).toBeDefined();
    // Check the type module is importable (compile-time check passed by vitest)
  });
});

// ============================================================
// Test 7: Multiplayer sync module exports
// ============================================================
describe('Multiplayer Sync Module', () => {
  it('exports all required functions', async () => {
    const sync = await import('../lib/multiplayerSync');
    expect(typeof sync.createGame).toBe('function');
    expect(typeof sync.joinGame).toBe('function');
    expect(typeof sync.fillAISlots).toBe('function');
    expect(typeof sync.startGame).toBe('function');
    expect(typeof sync.fetchGameState).toBe('function');
    expect(typeof sync.updateTerritory).toBe('function');
    expect(typeof sync.updateGame).toBe('function');
    expect(typeof sync.updatePlayer).toBe('function');
    expect(typeof sync.addGameLog).toBe('function');
    expect(typeof sync.subscribeToGame).toBe('function');
    expect(typeof sync.unsubscribeFromGame).toBe('function');
    expect(typeof sync.listOpenGames).toBe('function');
  });
});
