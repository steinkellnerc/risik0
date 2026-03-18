/**
 * Multiplayer Sync Layer
 * Bridges Supabase database ↔ local Zustand game store.
 * Handles: game creation, joining, realtime subscriptions, and DB writes.
 */

import { supabase } from './supabase';
import { TERRITORIES } from '../game/mapData';
import { PLAYER_NAMES, PLAYER_COLORS, type RiskCard, type CardType } from '../game/types';
import { shuffleArray, distributeTerritories, calculateReinforcements } from '../game/gameEngine';
import { assignMissions } from '../game/missions';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ==================== TYPES ====================

export interface MultiplayerGame {
  id: string;
  status: string;
  currentPlayerIndex: number;
  turnPhase: string;
  turnNumber: number;
  tradeInCount: number;
  hasConqueredThisTurn: boolean;
  useMissions: boolean;
  winnerId: string | null;
  lastMoveAt: string;
}

export interface MultiplayerPlayer {
  id: string;
  gameId: string;
  userId: string | null;
  slotIndex: number;
  displayName: string;
  color: string;
  armiesToPlace: number;
  isAi: boolean;
  secretObjective: string | null;
  eliminated: boolean;
  cards: RiskCard[];
}

export interface MultiplayerTerritory {
  id: string;
  gameId: string;
  territoryId: string;
  ownerSlotIndex: number;
  armyCount: number;
}

// ==================== CREATE GAME ====================

export async function createGame(
  hostUserId: string,
  hostDisplayName: string,
  useMissions: boolean
): Promise<string> {
  // 1. Create the game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({
      status: 'LOBBY',
      current_player_index: 0,
      turn_phase: 'REINFORCE',
      turn_number: 1,
      use_missions: useMissions,
    })
    .select()
    .single();

  if (gameError || !game) throw new Error(gameError?.message || 'Failed to create game');

  // 2. Add host as player slot 0
  const { error: playerError } = await supabase
    .from('players')
    .insert({
      game_id: game.id,
      user_id: hostUserId,
      slot_index: 0,
      display_name: hostDisplayName,
      color: PLAYER_COLORS[0],
      is_ai: false,
    });

  if (playerError) throw new Error(playerError.message);

  // 3. Log creation
  await addGameLog(game.id, null, `Game created by ${hostDisplayName}`, 'info');

  return game.id;
}

// ==================== JOIN GAME ====================

export async function joinGame(
  gameId: string,
  userId: string,
  displayName: string
): Promise<number> {
  // Find the next available slot
  const { data: existingPlayers } = await supabase
    .from('players')
    .select('slot_index')
    .eq('game_id', gameId)
    .order('slot_index');

  const takenSlots = new Set(existingPlayers?.map(p => p.slot_index) ?? []);

  // Check if user already joined
  const { data: existing } = await supabase
    .from('players')
    .select('slot_index')
    .eq('game_id', gameId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) return existing.slot_index;

  let slotIndex = -1;
  for (let i = 0; i < 6; i++) {
    if (!takenSlots.has(i)) {
      slotIndex = i;
      break;
    }
  }
  if (slotIndex === -1) throw new Error('Game is full');

  const { error } = await supabase
    .from('players')
    .insert({
      game_id: gameId,
      user_id: userId,
      slot_index: slotIndex,
      display_name: displayName,
      color: PLAYER_COLORS[slotIndex],
      is_ai: false,
    });

  if (error) throw new Error(error.message);

  await addGameLog(gameId, slotIndex, `${displayName} joined the game`, 'info');
  return slotIndex;
}

// ==================== FILL AI SLOTS ====================

export async function fillAISlots(gameId: string): Promise<void> {
  const { data: players } = await supabase
    .from('players')
    .select('slot_index')
    .eq('game_id', gameId);

  const takenSlots = new Set(players?.map(p => p.slot_index) ?? []);
  const aiPlayers = [];

  for (let i = 0; i < 6; i++) {
    if (!takenSlots.has(i)) {
      aiPlayers.push({
        game_id: gameId,
        user_id: null,
        slot_index: i,
        display_name: PLAYER_NAMES[i],
        color: PLAYER_COLORS[i],
        is_ai: true,
      });
    }
  }

  if (aiPlayers.length > 0) {
    const { error } = await supabase.from('players').insert(aiPlayers);
    if (error) throw new Error(error.message);
  }
}

// ==================== START GAME ====================

export async function startGame(gameId: string, useMissions: boolean): Promise<void> {
  // 1. Fill remaining slots with AI
  await fillAISlots(gameId);

  // 2. Distribute territories
  const territories = distributeTerritories(6);
  const territoryRows = Object.entries(territories).map(([tid, state]) => ({
    game_id: gameId,
    territory_id: tid,
    owner_slot_index: state.ownerId,
    army_count: state.armies,
  }));

  const { error: terrError } = await supabase.from('territories').insert(territoryRows);
  if (terrError) throw new Error(terrError.message);

  // 3. Create card deck
  const types: CardType[] = ['Infantry', 'Cavalry', 'Artillery'];
  const cardRows = TERRITORIES.map((t, i) => ({
    game_id: gameId,
    player_id: null,
    territory_name: t.id,
    card_type: types[i % 3],
  }));
  cardRows.push({ game_id: gameId, player_id: null, territory_name: null, card_type: 'Wild' });
  cardRows.push({ game_id: gameId, player_id: null, territory_name: null, card_type: 'Wild' });

  const { error: cardError } = await supabase.from('risk_cards').insert(cardRows);
  if (cardError) throw new Error(cardError.message);

  // 4. Assign missions if enabled
  if (useMissions) {
    const missions = assignMissions(6);
    for (const [slotIdx, mission] of Object.entries(missions)) {
      await supabase
        .from('players')
        .update({ secret_objective: mission.description })
        .eq('game_id', gameId)
        .eq('slot_index', Number(slotIdx));
    }
  }

  // 5. Calculate initial reinforcements for player 0
  const reinforcements = calculateReinforcements(0, territories);
  await supabase
    .from('players')
    .update({ armies_to_place: reinforcements })
    .eq('game_id', gameId)
    .eq('slot_index', 0);

  // 6. Set game to ACTIVE
  const { error: gameError } = await supabase
    .from('games')
    .update({
      status: 'ACTIVE',
      current_player_index: 0,
      turn_phase: 'REINFORCE',
      turn_number: 1,
    })
    .eq('id', gameId);

  if (gameError) throw new Error(gameError.message);

  await addGameLog(gameId, null, 'Game started!', 'info');
}

// ==================== GAME STATE FETCH ====================

export async function fetchGameState(gameId: string) {
  const [gameRes, playersRes, territoriesRes, logRes] = await Promise.all([
    supabase.from('games').select('*').eq('id', gameId).single(),
    supabase.from('players').select('*').eq('game_id', gameId).order('slot_index'),
    supabase.from('territories').select('*').eq('game_id', gameId),
    supabase.from('game_log').select('*').eq('game_id', gameId).order('created_at', { ascending: false }).limit(100),
  ]);

  if (gameRes.error) throw new Error(gameRes.error.message);

  return {
    game: gameRes.data,
    players: playersRes.data ?? [],
    territories: territoriesRes.data ?? [],
    log: logRes.data ?? [],
  };
}

// ==================== DB UPDATE HELPERS ====================

export async function updateTerritory(
  gameId: string,
  territoryId: string,
  updates: { owner_slot_index?: number; army_count?: number }
): Promise<void> {
  const { error } = await supabase
    .from('territories')
    .update(updates)
    .eq('game_id', gameId)
    .eq('territory_id', territoryId);
  if (error) throw new Error(error.message);
}

export async function updateGame(
  gameId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from('games')
    .update({ ...updates, last_move_at: new Date().toISOString() })
    .eq('id', gameId);
  if (error) throw new Error(error.message);
}

export async function updatePlayer(
  gameId: string,
  slotIndex: number,
  updates: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from('players')
    .update(updates)
    .eq('game_id', gameId)
    .eq('slot_index', slotIndex);
  if (error) throw new Error(error.message);
}

export async function addGameLog(
  gameId: string,
  playerSlotIndex: number | null,
  message: string,
  actionType: string = 'info'
): Promise<void> {
  await supabase.from('game_log').insert({
    game_id: gameId,
    player_slot_index: playerSlotIndex,
    message,
    action_type: actionType,
  });
}

// ==================== REALTIME SUBSCRIPTIONS ====================

export function subscribeToGame(
  gameId: string,
  callbacks: {
    onGameUpdate: (game: Record<string, unknown>) => void;
    onPlayerUpdate: (players: Record<string, unknown>[]) => void;
    onTerritoryUpdate: (territories: Record<string, unknown>[]) => void;
    onLogInsert: (entry: Record<string, unknown>) => void;
  }
): RealtimeChannel {
  const channel = supabase
    .channel(`game:${gameId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
      (payload) => callbacks.onGameUpdate(payload.new as Record<string, unknown>)
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
      async () => {
        // Re-fetch all players on any change
        const { data } = await supabase
          .from('players')
          .select('*')
          .eq('game_id', gameId)
          .order('slot_index');
        if (data) callbacks.onPlayerUpdate(data as unknown as Record<string, unknown>[]);
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'territories', filter: `game_id=eq.${gameId}` },
      async () => {
        // Re-fetch all territories on any change
        const { data } = await supabase
          .from('territories')
          .select('*')
          .eq('game_id', gameId);
        if (data) callbacks.onTerritoryUpdate(data as unknown as Record<string, unknown>[]);
      }
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'game_log', filter: `game_id=eq.${gameId}` },
      (payload) => callbacks.onLogInsert(payload.new as Record<string, unknown>)
    )
    .subscribe();

  return channel;
}

export function unsubscribeFromGame(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}

// ==================== LIST AVAILABLE GAMES ====================

export async function listOpenGames(): Promise<Array<{
  id: string;
  created_at: string;
  status: string;
  playerCount: number;
}>> {
  const { data: games } = await supabase
    .from('games')
    .select('id, created_at, status')
    .eq('status', 'LOBBY')
    .order('created_at', { ascending: false })
    .limit(20);

  if (!games) return [];

  const results = [];
  for (const game of games) {
    const { count } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', game.id)
      .eq('is_ai', false);
    results.push({ ...game, playerCount: count ?? 0 });
  }
  return results;
}
