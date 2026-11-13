/**
 * Multiplayer Sync Layer
 * Bridges Supabase database ↔ local Zustand game store.
 * Handles: game creation, joining, realtime subscriptions, and DB writes.
 */

import { supabase } from './supabase';
import { TERRITORIES } from '../game/mapData';
import { PLAYER_NAMES, PLAYER_COLORS, type Mission, type RiskCard, type CardType } from '../game/types';
import { shuffleArray, distributeTerritories, calculateReinforcements } from '../game/gameEngine';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Json } from './database.types';

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
      host_user_id: hostUserId,
    })
    .select('id')
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
  // First: check if this user is already in the game (own row is always readable)
  const { data: myRow } = await supabase
    .from('players')
    .select('slot_index')
    .eq('game_id', gameId)
    .eq('user_id', userId)
    .single();

  if (myRow) return myRow.slot_index;

  // Try slots 0–5 sequentially — resilient to RLS blocking reads of other players
  for (let slot = 0; slot < 6; slot++) {
    const { error } = await supabase
      .from('players')
      .insert({
        game_id: gameId,
        user_id: userId,
        slot_index: slot,
        display_name: displayName,
        color: PLAYER_COLORS[slot],
        is_ai: false,
      });

    if (!error) {
      await addGameLog(gameId, slot, `${displayName} joined the game`, 'info');
      return slot;
    }

    if (error.code === '23505') continue; // Slot taken, try next
    throw new Error(error.message);       // Unexpected error
  }

  throw new Error('Game is full');
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
    const { error: missionError } = await supabase.rpc('deal_game_missions', { p_game_id: gameId });
    if (missionError) throw new Error(missionError.message);
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
    supabase.from('games')
      .select('id,status,current_player_index,turn_phase,turn_number,trade_in_count,has_conquered_this_turn,use_missions,winner_id,winner_slot_index,host_user_id,last_move_at')
      .eq('id', gameId)
      .single(),
    supabase.from('players')
      .select('id,game_id,user_id,slot_index,display_name,color,armies_to_place,is_ai,eliminated,cards')
      .eq('game_id', gameId)
      .order('slot_index'),
    supabase.from('territories')
      .select('id,game_id,territory_id,owner_slot_index,army_count')
      .eq('game_id', gameId),
    supabase.from('game_log')
      .select('id,game_id,created_at,player_slot_index,message,action_type')
      .eq('game_id', gameId)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  if (gameRes.error) throw new Error(gameRes.error.message);
  if (!gameRes.data) throw new Error('Game not found');
  if (playersRes.error) throw new Error(playersRes.error.message);
  if (territoriesRes.error) throw new Error(territoriesRes.error.message);
  if (logRes.error) throw new Error(logRes.error.message);

  const missions = gameRes.data.use_missions ? await getGameMissions(gameId) : {};

  return {
    game: gameRes.data,
    players: playersRes.data ?? [],
    territories: territoriesRes.data ?? [],
    log: logRes.data ?? [],
    missions,
  };
}

function isMission(value: Json): value is Json & Mission {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  if (
    typeof value.id !== 'string' ||
    typeof value.description !== 'string' ||
    !['conquer_continents', 'conquer_territories', 'destroy_player'].includes(value.type as string)
  ) return false;
  if (value.continents !== undefined && (!Array.isArray(value.continents) || !value.continents.every(c => typeof c === 'string'))) return false;
  if (value.territoryCount !== undefined && typeof value.territoryCount !== 'number') return false;
  if (value.minArmiesPerTerritory !== undefined && typeof value.minArmiesPerTerritory !== 'number') return false;
  if (value.targetPlayerIndex !== undefined && typeof value.targetPlayerIndex !== 'number') return false;
  return true;
}

export async function getGameMissions(gameId: string): Promise<Record<number, Mission>> {
  const { data, error } = await supabase.rpc('get_game_missions', { p_game_id: gameId });
  if (error) throw new Error(error.message);

  const missions: Record<number, Mission> = {};
  for (const row of data ?? []) {
    if (!Number.isInteger(row.slot_index) || !isMission(row.mission)) {
      throw new Error('Supabase returned an invalid game mission');
    }
    missions[row.slot_index] = row.mission;
  }
  return missions;
}

export async function getDestroyMissionWinner(gameId: string, targetSlot: number): Promise<number | null> {
  const { data, error } = await supabase.rpc('get_destroy_mission_winner', {
    p_game_id: gameId,
    p_target_slot: targetSlot,
  });
  if (error) throw new Error(error.message);
  return data;
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
    onPlayerUpdate: (player: Record<string, unknown>) => void;
    onTerritoryUpdate: (territory: Record<string, unknown>) => void;
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
      (payload) => {
        // Use payload.new directly — no re-fetch, no race conditions
        if (payload.new && Object.keys(payload.new).length > 0) {
          callbacks.onPlayerUpdate(payload.new as Record<string, unknown>);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'territories', filter: `game_id=eq.${gameId}` },
      (payload) => {
        // Use payload.new directly — no re-fetch, no race conditions
        if (payload.new && Object.keys(payload.new).length > 0) {
          callbacks.onTerritoryUpdate(payload.new as Record<string, unknown>);
        }
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

export async function listOpenGames(currentUserId?: string): Promise<Array<{
  id: string;
  created_at: string;
  status: string;
  playerCount: number;
  hostUserId: string | null;
  useMissions: boolean;
}>> {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  // Fetch recent games + any games hosted by the current user (so they can delete old ones)
  const [recentRes, myRes] = await Promise.all([
    supabase
      .from('games')
      .select('id, created_at, status, host_user_id, use_missions')
      .eq('status', 'LOBBY')
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: false })
      .limit(20),
    currentUserId
      ? supabase
          .from('games')
          .select('id, created_at, status, host_user_id, use_missions')
          .eq('status', 'LOBBY')
          .eq('host_user_id', currentUserId)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  // Merge, deduplicate by id
  const allGames = [...(recentRes.data ?? [])];
  for (const g of (myRes.data ?? [])) {
    if (!allGames.find(x => x.id === g.id)) allGames.push(g);
  }

  if (!allGames.length) return [];

  const gameIds = allGames.map(g => g.id);

  // Single query for all human player rows across all games
  const { data: playerRows } = await supabase
    .from('players')
    .select('game_id')
    .in('game_id', gameIds)
    .eq('is_ai', false);

  const countByGame = new Map<string, number>();
  for (const row of (playerRows ?? [])) {
    countByGame.set(row.game_id, (countByGame.get(row.game_id) ?? 0) + 1);
  }

  return allGames.map(game => ({
    ...game,
    playerCount: countByGame.get(game.id) ?? 0,
    hostUserId: (game.host_user_id as string | null) ?? null,
    useMissions: (game.use_missions as boolean) ?? false,
  }));
}

// ==================== GRANT CARD ====================

export async function grantCard(gameId: string, playerSlotIndex: number): Promise<RiskCard | null> {
  // Look up the player's UUID id from their slot index
  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('id')
    .eq('game_id', gameId)
    .eq('slot_index', playerSlotIndex)
    .single();

  if (playerError) throw new Error(playerError.message);
  if (!player) return null;

  // Find an unowned card in the deck
  const { data: card, error: cardError } = await supabase
    .from('risk_cards')
    .select('id, card_type, territory_name')
    .eq('game_id', gameId)
    .is('player_id', null)
    .limit(1)
    .maybeSingle();

  if (cardError) throw new Error(cardError.message);
  if (!card) return null;

  // Claim the card only if it is still in the deck.
  const { data: claimedCard, error: claimError } = await supabase
    .from('risk_cards')
    .update({ player_id: player.id })
    .eq('id', card.id)
    .is('player_id', null)
    .select('id')
    .maybeSingle();

  if (claimError) throw new Error(claimError.message);
  if (!claimedCard) return null;

  return {
    id: card.id,
    type: card.card_type as CardType,
    territoryId: card.territory_name,
  };
}

export async function returnCards(cardIds: string[]): Promise<void> {
  if (!cardIds.length) return;
  const { error } = await supabase
    .from('risk_cards')
    .update({ player_id: null })
    .in('id', cardIds);
  if (error) throw new Error(error.message);
}

// ==================== LIST ACTIVE GAMES FOR USER ====================

export async function listMyActiveGames(userId: string): Promise<Array<{
  id: string;
  playerCount: number;
  useMissions: boolean;
  turnNumber: number;
  hostUserId: string | null;
}>> {
  const { data: playerRows } = await supabase
    .from('players')
    .select('game_id')
    .eq('user_id', userId)
    .eq('is_ai', false);

  if (!playerRows?.length) return [];

  const gameIds = playerRows.map(r => r.game_id as string);
  const { data: games } = await supabase
    .from('games')
    .select('id, use_missions, turn_number, host_user_id')
    .eq('status', 'ACTIVE')
    .in('id', gameIds);

  if (!games?.length) return [];

  const { data: allPlayerRows } = await supabase
    .from('players')
    .select('game_id')
    .in('game_id', games.map(g => g.id))
    .eq('is_ai', false);

  const countByGame = new Map<string, number>();
  for (const row of (allPlayerRows ?? [])) {
    countByGame.set(row.game_id, (countByGame.get(row.game_id) ?? 0) + 1);
  }

  return games.map(g => ({
    id: g.id as string,
    playerCount: countByGame.get(g.id) ?? 0,
    useMissions: (g.use_missions as boolean) ?? false,
    turnNumber: (g.turn_number as number) ?? 1,
    hostUserId: (g.host_user_id as string | null) ?? null,
  }));
}

// ==================== CANCEL GAME ====================

export async function cancelGame(gameId: string): Promise<void> {
  const { error } = await supabase
    .from('games')
    .update({ status: 'CANCELLED' })
    .eq('id', gameId);
  if (error) throw new Error(error.message);
}

// ==================== LEADERBOARD ====================

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
}

export async function getLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('games')
    .select('id, winner_id, players(user_id, display_name, is_ai)')
    .eq('status', 'COMPLETED')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error || !data) return [];

  const stats = new Map<string, { displayName: string; played: number; won: number }>();

  for (const game of data as Array<{
    id: string;
    winner_id: string | null;
    players: Array<{ user_id: string | null; display_name: string; is_ai: boolean }> | null;
  }>) {
    for (const p of game.players ?? []) {
      if (p.is_ai || !p.user_id) continue;
      const entry = stats.get(p.user_id) ?? { displayName: p.display_name, played: 0, won: 0 };
      entry.played += 1;
      entry.displayName = p.display_name;
      if (game.winner_id && game.winner_id === p.user_id) entry.won += 1;
      stats.set(p.user_id, entry);
    }
  }

  return Array.from(stats.entries())
    .map(([userId, s]) => ({
      userId,
      displayName: s.displayName,
      gamesPlayed: s.played,
      gamesWon: s.won,
      winRate: s.played > 0 ? s.won / s.played : 0,
    }))
    .sort((a, b) =>
      b.gamesWon - a.gamesWon ||
      b.winRate - a.winRate ||
      b.gamesPlayed - a.gamesPlayed
    )
    .slice(0, limit);
}
