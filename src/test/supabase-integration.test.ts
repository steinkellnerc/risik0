/**
 * Supabase Integration Test Script
 *
 * Tests:
 * 1. Verify table schema definitions are correct
 * 2. Create a game via the Supabase client and verify game_id
 * 3. Simulate a 'Reinforce' move on Alaska and verify DB update
 *
 * Usage:
 *   npx tsx src/test/supabase-integration.test.ts
 *
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
 * (or set TEST_SUPABASE_URL / TEST_SUPABASE_ANON_KEY env vars)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// Config
// ============================================================

const SUPABASE_URL = process.env.TEST_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.TEST_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient;
let testGameId: string | null = null;
let testPlayerId: string | null = null;

const passed: string[] = [];
const failed: string[] = [];

function log(icon: string, msg: string) {
  console.log(`  ${icon}  ${msg}`);
}

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    passed.push(label);
    log('PASS', label);
  } else {
    failed.push(label);
    log('FAIL', `${label}${detail ? ` — ${detail}` : ''}`);
  }
}

// ============================================================
// Test 1: Verify table schemas exist
// ============================================================
async function testTableSchemas() {
  console.log('\n--- Test 1: Table Schema Verification ---');

  // games table
  const { data: games, error: gamesErr } = await supabase
    .from('games')
    .select('id, created_at, status, current_player_index, turn_phase, turn_number, trade_in_count, has_conquered_this_turn, use_missions, winner_id, last_move_at')
    .limit(0);
  assert(!gamesErr, 'games table exists with all columns', gamesErr?.message);

  // players table
  const { data: players, error: playersErr } = await supabase
    .from('players')
    .select('id, game_id, user_id, slot_index, display_name, color, armies_to_place, is_ai, secret_objective, eliminated, cards')
    .limit(0);
  assert(!playersErr, 'players table exists with all columns', playersErr?.message);

  // territories table
  const { data: territories, error: terrErr } = await supabase
    .from('territories')
    .select('id, game_id, territory_id, owner_slot_index, army_count')
    .limit(0);
  assert(!terrErr, 'territories table exists with all columns', terrErr?.message);

  // risk_cards table
  const { data: cards, error: cardsErr } = await supabase
    .from('risk_cards')
    .select('id, game_id, player_id, territory_name, card_type')
    .limit(0);
  assert(!cardsErr, 'risk_cards table exists with all columns', cardsErr?.message);

  // game_log table
  const { data: logData, error: logErr } = await supabase
    .from('game_log')
    .select('id, game_id, created_at, player_slot_index, message, action_type')
    .limit(0);
  assert(!logErr, 'game_log table exists with all columns', logErr?.message);
}

// ============================================================
// Test 2: Create a game and verify game_id is returned
// ============================================================
async function testCreateGame() {
  console.log('\n--- Test 2: Create Game ---');

  // Insert a game
  const { data: game, error: gameErr } = await supabase
    .from('games')
    .insert({
      status: 'LOBBY',
      current_player_index: 0,
      turn_phase: 'REINFORCE',
      turn_number: 1,
      use_missions: false,
    })
    .select()
    .single();

  assert(!gameErr && !!game, 'Game created successfully', gameErr?.message);

  if (game) {
    testGameId = game.id;
    assert(typeof game.id === 'string' && game.id.length > 0, `game_id returned: ${game.id.slice(0, 8)}...`);
    assert(game.status === 'LOBBY', `status is LOBBY (got: ${game.status})`);
    assert(game.current_player_index === 0, `current_player_index is 0 (got: ${game.current_player_index})`);
    assert(game.turn_phase === 'REINFORCE', `turn_phase is REINFORCE (got: ${game.turn_phase})`);
    assert(game.turn_number === 1, `turn_number is 1 (got: ${game.turn_number})`);
  } else {
    log('FAIL', 'Skipping game assertions — no game created');
    return;
  }

  // Add a test player (slot 0)
  const { data: player, error: playerErr } = await supabase
    .from('players')
    .insert({
      game_id: testGameId,
      user_id: null,
      slot_index: 0,
      display_name: 'Test Commander',
      color: 'player-1',
      is_ai: false,
      armies_to_place: 5,
    })
    .select()
    .single();

  assert(!playerErr && !!player, 'Player created in game', playerErr?.message);
  if (player) {
    testPlayerId = player.id;
    assert(player.display_name === 'Test Commander', `Player name correct: ${player.display_name}`);
    assert(player.slot_index === 0, `Player slot_index is 0`);
  }

  // Insert territory: Alaska
  const { data: terr, error: terrErr } = await supabase
    .from('territories')
    .insert({
      game_id: testGameId,
      territory_id: 'alaska',
      owner_slot_index: 0,
      army_count: 3,
    })
    .select()
    .single();

  assert(!terrErr && !!terr, 'Alaska territory created with army_count=3', terrErr?.message);
  if (terr) {
    assert(terr.territory_id === 'alaska', `territory_id is alaska`);
    assert(terr.army_count === 3, `army_count is 3 (got: ${terr.army_count})`);
  }

  // Add a log entry
  const { error: logErr } = await supabase
    .from('game_log')
    .insert({
      game_id: testGameId,
      player_slot_index: 0,
      message: 'Test game created',
      action_type: 'info',
    });

  assert(!logErr, 'Game log entry created', logErr?.message);
}

// ============================================================
// Test 3: Simulate Reinforce — update Alaska's army_count
// ============================================================
async function testReinforceMove() {
  console.log('\n--- Test 3: Simulate Reinforce on Alaska ---');

  if (!testGameId) {
    log('FAIL', 'Skipping — no test game available');
    return;
  }

  // Read current army_count
  const { data: before, error: readErr } = await supabase
    .from('territories')
    .select('army_count')
    .eq('game_id', testGameId)
    .eq('territory_id', 'alaska')
    .single();

  assert(!readErr && !!before, 'Read Alaska before reinforce', readErr?.message);
  const armiesBefore = before?.army_count ?? 0;
  log('INFO', `Alaska army_count before: ${armiesBefore}`);

  // Reinforce: add 1 army
  const newCount = armiesBefore + 1;
  const { error: updateErr } = await supabase
    .from('territories')
    .update({ army_count: newCount })
    .eq('game_id', testGameId)
    .eq('territory_id', 'alaska');

  assert(!updateErr, `Updated Alaska army_count to ${newCount}`, updateErr?.message);

  // Verify the update
  const { data: after, error: verifyErr } = await supabase
    .from('territories')
    .select('army_count')
    .eq('game_id', testGameId)
    .eq('territory_id', 'alaska')
    .single();

  assert(!verifyErr && !!after, 'Read Alaska after reinforce', verifyErr?.message);
  assert(after?.army_count === newCount, `Alaska army_count is now ${newCount} (got: ${after?.army_count})`);

  // Also update the player's armies_to_place (decrement)
  if (testPlayerId) {
    const { data: playerBefore } = await supabase
      .from('players')
      .select('armies_to_place')
      .eq('id', testPlayerId)
      .single();

    const armiesLeft = (playerBefore?.armies_to_place ?? 1) - 1;
    const { error: pErr } = await supabase
      .from('players')
      .update({ armies_to_place: armiesLeft })
      .eq('id', testPlayerId);

    assert(!pErr, `Player armies_to_place decremented to ${armiesLeft}`, pErr?.message);
  }

  // Log the reinforce action
  const { error: logErr } = await supabase
    .from('game_log')
    .insert({
      game_id: testGameId,
      player_slot_index: 0,
      message: `Reinforced alaska (${armiesBefore} -> ${newCount})`,
      action_type: 'reinforce',
    });

  assert(!logErr, 'Reinforce logged to game_log', logErr?.message);

  // Verify log entry exists
  const { data: logs, error: logReadErr } = await supabase
    .from('game_log')
    .select('message, action_type')
    .eq('game_id', testGameId)
    .eq('action_type', 'reinforce');

  assert(!logReadErr && (logs?.length ?? 0) > 0, 'Reinforce log entry verified in game_log');
}

// ============================================================
// Cleanup
// ============================================================
async function cleanup() {
  if (testGameId) {
    console.log('\n--- Cleanup ---');
    // Cascading delete: removing the game removes players, territories, cards, logs
    const { error } = await supabase
      .from('games')
      .delete()
      .eq('id', testGameId);

    if (!error) {
      log('INFO', `Cleaned up test game ${testGameId.slice(0, 8)}...`);
    } else {
      log('FAIL', `Cleanup failed: ${error.message}`);
    }
  }
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log('===========================================');
  console.log(' Supabase Integration Tests for Risk');
  console.log('===========================================');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('\nNo Supabase credentials found.');
    console.log('Set TEST_SUPABASE_URL and TEST_SUPABASE_ANON_KEY env vars, or');
    console.log('create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.\n');
    console.log('Example:');
    console.log('  TEST_SUPABASE_URL=https://xyz.supabase.co \\');
    console.log('  TEST_SUPABASE_ANON_KEY=eyJ... \\');
    console.log('  npx tsx src/test/supabase-integration.test.ts\n');
    process.exit(1);
  }

  console.log(`\nURL: ${SUPABASE_URL.slice(0, 30)}...`);
  console.log('Key: ****...' + SUPABASE_KEY.slice(-8));

  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    await testTableSchemas();
    await testCreateGame();
    await testReinforceMove();
  } finally {
    await cleanup();
  }

  // Summary
  console.log('\n===========================================');
  console.log(` Results: ${passed.length} passed, ${failed.length} failed`);
  console.log('===========================================\n');

  if (failed.length > 0) {
    console.log('Failed tests:');
    failed.forEach(f => console.log(`  - ${f}`));
    console.log('');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
