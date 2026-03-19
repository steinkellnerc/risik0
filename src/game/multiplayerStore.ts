/**
 * Multiplayer Game Store
 * Zustand store that syncs with Supabase for multiplayer games.
 * All mutations write to Supabase; Realtime pushes updates back.
 */

import { create } from 'zustand';
import type { Phase, TerritoryState, RiskCard } from './types';
import { PLAYER_NAMES } from './types';
import { TERRITORIES, TERRITORY_MAP } from './mapData';
import {
  resolveCombat,
  calculateReinforcements,
  areAdjacent,
  getNextActivePlayer,
  checkWorldDomination,
  isPlayerEliminated,
} from './gameEngine';
import { checkMissionComplete, assignMissions, assignMissionsSeeded } from './missions';
import { aiReinforce, aiDecideAttacks, aiFortify } from './ai';
import {
  fetchGameState,
  updateTerritory,
  updateGame,
  updatePlayer,
  addGameLog,
  subscribeToGame,
  unsubscribeFromGame,
} from '../lib/multiplayerSync';
import { getTradeInValue } from './types';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface MultiplayerGameState {
  // Connection
  gameId: string | null;
  myUserId: string | null;
  mySlotIndex: number | null;
  hostUserId: string | null;
  isMyTurn: boolean;
  connected: boolean;

  // Game state (mirrored from DB)
  status: string;
  currentPlayerIndex: number;
  phase: Phase;
  turnNumber: number;
  tradeInCount: number;
  hasConqueredThisTurn: boolean;
  useMissions: boolean;
  winnerId: string | null;

  // Players
  players: Array<{
    id: string;
    slotIndex: number;
    displayName: string;
    color: string;
    userId: string | null;
    isAi: boolean;
    armiesToPlace: number;
    eliminated: boolean;
    secretObjective: string | null;
    cards: RiskCard[];
  }>;

  // Territories
  territories: Record<string, TerritoryState>;

  // UI state (local only, not synced)
  attackSource: string | null;
  attackTarget: string | null;
  fortifySource: string | null;
  fortifyTarget: string | null;
  lastDiceRoll: { attacker: number[]; defender: number[] } | null;
  capturedTerritory: string | null;
  awaitingMoveIn: boolean;
  reinforcementsLeft: number;

  // Log
  log: Array<{ timestamp: number; message: string }>;

  // Actions
  connect: (gameId: string, userId: string) => Promise<void>;
  disconnect: () => void;
  placeReinforcement: (territoryId: string) => Promise<void>;
  selectAttackSource: (territoryId: string) => void;
  selectAttackTarget: (territoryId: string) => void;
  executeAttack: (attackDice: number, defendDice: number) => Promise<void>;
  moveArmiesAfterCapture: (count: number) => Promise<void>;
  selectFortifySource: (territoryId: string) => void;
  selectFortifyTarget: (territoryId: string) => void;
  executeFortify: (count: number) => Promise<void>;
  tradeInCards: (cardIds: string[]) => Promise<void>;
  endPhase: () => Promise<void>;
  runAITurn: () => Promise<void>;
}

let realtimeChannel: RealtimeChannel | null = null;

export const useMultiplayerStore = create<MultiplayerGameState>((set, get) => ({
  // Connection
  gameId: null,
  myUserId: null,
  mySlotIndex: null,
  hostUserId: null,
  isMyTurn: false,
  connected: false,

  // Game state
  status: 'LOBBY',
  currentPlayerIndex: 0,
  phase: 'REINFORCE' as Phase,
  turnNumber: 1,
  tradeInCount: 0,
  hasConqueredThisTurn: false,
  useMissions: false,
  winnerId: null,

  // Players & territories
  players: [],
  territories: {},

  // UI state
  attackSource: null,
  attackTarget: null,
  fortifySource: null,
  fortifyTarget: null,
  lastDiceRoll: null,
  capturedTerritory: null,
  awaitingMoveIn: false,
  reinforcementsLeft: 0,

  // Log
  log: [],

  // ==================== CONNECT ====================
  connect: async (gameId: string, userId: string) => {
    // Disconnect any existing subscription
    if (realtimeChannel) {
      unsubscribeFromGame(realtimeChannel);
      realtimeChannel = null;
    }

    // Fetch initial state
    const state = await fetchGameState(gameId);
    const myPlayer = state.players.find((p: Record<string, unknown>) => p.user_id === userId);
    const mySlot = myPlayer ? (myPlayer.slot_index as number) : null;
    // Prefer host_user_id from the game record (RLS-safe), fall back to slot-0 player
    const hostFromGame = state.game.host_user_id as string | null;
    const hostFromPlayers = (state.players.find((p: Record<string, unknown>) => p.slot_index === 0)?.user_id as string | null) ?? null;
    const hostUserId = hostFromGame ?? hostFromPlayers;

    // Convert territories from DB format
    const territories: Record<string, TerritoryState> = {};
    for (const t of state.territories) {
      territories[t.territory_id as string] = {
        ownerId: t.owner_slot_index as number,
        armies: t.army_count as number,
      };
    }

    // Compute missions client-side (deterministic from gameId — avoids RLS issues with DB writes)
    const useMissionsFlag = state.game.use_missions as boolean;
    const missionMap = useMissionsFlag ? assignMissionsSeeded(gameId, 6) : {};

    // Convert players from DB format
    const players = (state.players as Array<Record<string, unknown>>).map(p => ({
      id: p.id as string,
      slotIndex: p.slot_index as number,
      displayName: p.display_name as string,
      color: p.color as string,
      userId: p.user_id as string | null,
      isAi: p.is_ai as boolean,
      armiesToPlace: p.armies_to_place as number,
      eliminated: p.eliminated as boolean,
      secretObjective: useMissionsFlag
        ? (missionMap[p.slot_index as number]?.description ?? null)
        : null,
      cards: (p.cards as RiskCard[] || []) as RiskCard[],
    }));

    const currentPlayerIndex = state.game.current_player_index as number;
    const isMyTurn = mySlot === currentPlayerIndex;

    // Find the current player's armies to place
    const currentPlayer = players.find(p => p.slotIndex === currentPlayerIndex);
    const reinforcementsLeft = currentPlayer?.armiesToPlace ?? 0;

    // Convert log
    const log = (state.log as Array<Record<string, unknown>>).map(entry => ({
      timestamp: new Date(entry.created_at as string).getTime(),
      message: entry.message as string,
    }));

    set({
      gameId,
      myUserId: userId,
      mySlotIndex: mySlot,
      hostUserId,
      isMyTurn,
      connected: true,
      status: state.game.status as string,
      currentPlayerIndex,
      phase: state.game.turn_phase as Phase,
      turnNumber: state.game.turn_number as number,
      tradeInCount: state.game.trade_in_count as number,
      hasConqueredThisTurn: state.game.has_conquered_this_turn as boolean,
      useMissions: state.game.use_missions as boolean,
      winnerId: state.game.winner_id as string | null,
      players,
      territories,
      reinforcementsLeft,
      log,
      // Reset UI state
      attackSource: null,
      attackTarget: null,
      fortifySource: null,
      fortifyTarget: null,
      lastDiceRoll: null,
      capturedTerritory: null,
      awaitingMoveIn: false,
    });

    // Subscribe to realtime changes
    realtimeChannel = subscribeToGame(gameId, {
      onGameUpdate: (game) => {
        const s = get();
        const newCurrentPlayer = game.current_player_index as number;
        const newIsMyTurn = s.mySlotIndex === newCurrentPlayer;

        set({
          status: game.status as string,
          currentPlayerIndex: newCurrentPlayer,
          phase: game.turn_phase as Phase,
          turnNumber: game.turn_number as number,
          tradeInCount: game.trade_in_count as number,
          hasConqueredThisTurn: game.has_conquered_this_turn as boolean,
          winnerId: game.winner_id as string | null,
          isMyTurn: newIsMyTurn,
          // Reset UI when turn changes
          ...(newCurrentPlayer !== s.currentPlayerIndex ? {
            attackSource: null,
            attackTarget: null,
            fortifySource: null,
            fortifyTarget: null,
            lastDiceRoll: null,
            capturedTerritory: null,
            awaitingMoveIn: false,
          } : {}),
        });

        // Trigger AI turn if needed
        const currentP = s.players.find(p => p.slotIndex === newCurrentPlayer);
        if (currentP?.isAi && game.status === 'ACTIVE' && game.turn_phase === 'REINFORCE') {
          setTimeout(() => get().runAITurn(), 1000);
        }
      },
      onPlayerUpdate: (dbPlayers) => {
        const s = get();
        const missionMap = s.useMissions && s.gameId ? assignMissionsSeeded(s.gameId, 6) : {};
        const players = dbPlayers.map((p: Record<string, unknown>) => ({
          id: p.id as string,
          slotIndex: p.slot_index as number,
          displayName: p.display_name as string,
          color: p.color as string,
          userId: p.user_id as string | null,
          isAi: p.is_ai as boolean,
          armiesToPlace: p.armies_to_place as number,
          eliminated: p.eliminated as boolean,
          secretObjective: s.useMissions
            ? (missionMap[p.slot_index as number]?.description ?? null)
            : null,
          cards: (p.cards as RiskCard[] || []) as RiskCard[],
        }));

        const currentPlayer = players.find(p => p.slotIndex === s.currentPlayerIndex);
        set({
          players,
          reinforcementsLeft: s.isMyTurn ? (currentPlayer?.armiesToPlace ?? 0) : s.reinforcementsLeft,
        });
      },
      onTerritoryUpdate: (dbTerritories) => {
        const territories: Record<string, TerritoryState> = {};
        for (const t of dbTerritories) {
          territories[t.territory_id as string] = {
            ownerId: t.owner_slot_index as number,
            armies: t.army_count as number,
          };
        }
        set({ territories });
      },
      onLogInsert: (entry) => {
        set(s => ({
          log: [
            { timestamp: new Date(entry.created_at as string).getTime(), message: entry.message as string },
            ...s.log
          ].slice(0, 100),
        }));
      },
    });

    // Auto-trigger AI if it's AI's turn on connect
    const currentP = players.find(p => p.slotIndex === currentPlayerIndex);
    if (currentP?.isAi && state.game.status === 'ACTIVE') {
      setTimeout(() => get().runAITurn(), 1000);
    }
  },

  // ==================== DISCONNECT ====================
  disconnect: () => {
    if (realtimeChannel) {
      unsubscribeFromGame(realtimeChannel);
      realtimeChannel = null;
    }
    set({
      gameId: null,
      connected: false,
      myUserId: null,
      mySlotIndex: null,
    });
  },

  // ==================== REINFORCE ====================
  placeReinforcement: async (territoryId: string) => {
    const s = get();
    if (!s.gameId || s.phase !== 'REINFORCE' || s.reinforcementsLeft <= 0) return;
    if (!s.isMyTurn && !s.players.find(p => p.slotIndex === s.currentPlayerIndex)?.isAi) return;
    if (s.territories[territoryId]?.ownerId !== s.currentPlayerIndex) return;

    // Optimistic update
    set({
      territories: {
        ...s.territories,
        [territoryId]: { ...s.territories[territoryId], armies: s.territories[territoryId].armies + 1 },
      },
      reinforcementsLeft: s.reinforcementsLeft - 1,
    });

    // Write to DB
    await updateTerritory(s.gameId, territoryId, {
      army_count: s.territories[territoryId].armies + 1,
    });
    await updatePlayer(s.gameId, s.currentPlayerIndex, {
      armies_to_place: s.reinforcementsLeft - 1,
    });
    await addGameLog(s.gameId, s.currentPlayerIndex, `Reinforced ${territoryId}`, 'reinforce');

    // Auto-advance to attack phase when all reinforcements placed
    if (s.reinforcementsLeft - 1 === 0) {
      await get().endPhase();
    }
  },

  // ==================== ATTACK SELECTION ====================
  selectAttackSource: (territoryId: string) => {
    const s = get();
    if (s.phase !== 'ATTACK') return;
    if (s.territories[territoryId]?.ownerId !== s.currentPlayerIndex) return;
    if (s.territories[territoryId].armies < 2) return;
    set({ attackSource: territoryId, attackTarget: null, lastDiceRoll: null });
  },

  selectAttackTarget: (territoryId: string) => {
    const s = get();
    if (!s.attackSource) return;
    if (!areAdjacent(s.attackSource, territoryId)) return;
    if (s.territories[territoryId]?.ownerId === s.currentPlayerIndex) return;
    set({ attackTarget: territoryId });
  },

  // ==================== EXECUTE ATTACK ====================
  executeAttack: async (attackDice: number, defendDice: number) => {
    const s = get();
    if (!s.gameId || !s.attackSource || !s.attackTarget) return;
    if (!s.isMyTurn && !s.players.find(p => p.slotIndex === s.currentPlayerIndex)?.isAi) return;

    const source = s.territories[s.attackSource];
    const target = s.territories[s.attackTarget];

    const result = resolveCombat(
      source.armies, target.armies,
      source.ownerId, target.ownerId,
      attackDice, defendDice
    );

    // Build new territory states
    const newTerritories = { ...s.territories };
    newTerritories[s.attackSource] = { ...source, armies: result.newSourceArmies };
    newTerritories[s.attackTarget] = {
      ownerId: result.newTargetOwner,
      armies: result.captured ? 0 : result.newTargetArmies,
    };

    const targetName = s.attackTarget;
    const logMsg = `Attack: ${result.attackerRolls.join(',')} vs ${result.defenderRolls.join(',')} — Lost A:${result.attackerLosses} D:${result.defenderLosses}${result.captured ? ' CAPTURED!' : ''}`;

    // Check for elimination
    let winnerId: string | null = s.winnerId;
    const defenderId = target.ownerId;

    if (result.captured) {
      const defenderEliminated = isPlayerEliminated(defenderId, newTerritories);
      if (defenderEliminated) {
        await updatePlayer(s.gameId, defenderId, { eliminated: true });
        await addGameLog(s.gameId, s.currentPlayerIndex,
          `${s.players.find(p => p.slotIndex === defenderId)?.displayName || PLAYER_NAMES[defenderId]} eliminated!`, 'elimination');
      }

      // Check win
      if (checkWorldDomination(s.currentPlayerIndex, newTerritories)) {
        const winnerPlayer = s.players.find(p => p.slotIndex === s.currentPlayerIndex);
        winnerId = winnerPlayer?.userId ?? null;
      }
    }

    // Optimistic update
    set({
      territories: newTerritories,
      lastDiceRoll: { attacker: result.attackerRolls, defender: result.defenderRolls },
      hasConqueredThisTurn: s.hasConqueredThisTurn || result.captured,
      capturedTerritory: result.captured ? targetName : null,
      awaitingMoveIn: result.captured,
      attackSource: result.captured ? null : s.attackSource,
      attackTarget: result.captured ? null : s.attackTarget,
    });

    // Write to DB
    await updateTerritory(s.gameId, s.attackSource, { army_count: result.newSourceArmies });
    await updateTerritory(s.gameId, targetName, {
      owner_slot_index: result.newTargetOwner,
      army_count: result.captured ? 0 : result.newTargetArmies,
    });
    await updateGame(s.gameId, { has_conquered_this_turn: s.hasConqueredThisTurn || result.captured });
    await addGameLog(s.gameId, s.currentPlayerIndex, logMsg, 'attack');

    if (winnerId) {
      await updateGame(s.gameId, { status: 'COMPLETED', winner_id: winnerId });
    }
  },

  // ==================== MOVE IN AFTER CAPTURE ====================
  moveArmiesAfterCapture: async (count: number) => {
    const s = get();
    if (!s.gameId || !s.capturedTerritory || !s.awaitingMoveIn) return;

    const captured = s.capturedTerritory;
    const t = TERRITORY_MAP.get(captured);
    if (!t) return;

    // Find adjacent owned territory with armies to spare (prefer most armies)
    const sourceId = t.adjacent
      .filter(a => s.territories[a]?.ownerId === s.currentPlayerIndex && s.territories[a]?.armies > 1)
      .sort((a, b) => s.territories[b].armies - s.territories[a].armies)[0];
    if (!sourceId) {
      // No source available — set 1 army on captured territory as minimum
      set({ territories: { ...s.territories, [captured]: { ...s.territories[captured], armies: 1 } }, capturedTerritory: null, awaitingMoveIn: false });
      await updateTerritory(s.gameId, captured, { army_count: 1 });
      return;
    }

    const sourceState = s.territories[sourceId];
    const maxMove = sourceState.armies - 1;
    count = Math.max(1, Math.min(count, maxMove));

    // Optimistic update
    set({
      territories: {
        ...s.territories,
        [sourceId]: { ...sourceState, armies: sourceState.armies - count },
        [captured]: { ...s.territories[captured], armies: count },
      },
      capturedTerritory: null,
      awaitingMoveIn: false,
    });

    // Write to DB
    await updateTerritory(s.gameId, sourceId, { army_count: sourceState.armies - count });
    await updateTerritory(s.gameId, captured, { army_count: count });
  },

  // ==================== FORTIFY SELECTION ====================
  selectFortifySource: (territoryId: string) => {
    const s = get();
    if (s.phase !== 'FORTIFY') return;
    if (s.territories[territoryId]?.ownerId !== s.currentPlayerIndex) return;
    if (s.territories[territoryId].armies < 2) return;
    set({ fortifySource: territoryId, fortifyTarget: null });
  },

  selectFortifyTarget: (territoryId: string) => {
    const s = get();
    if (!s.fortifySource) return;
    if (!areAdjacent(s.fortifySource, territoryId)) return;
    if (s.territories[territoryId]?.ownerId !== s.currentPlayerIndex) return;
    set({ fortifyTarget: territoryId });
  },

  // ==================== EXECUTE FORTIFY ====================
  executeFortify: async (count: number) => {
    const s = get();
    if (!s.gameId || !s.fortifySource || !s.fortifyTarget) return;

    const source = s.territories[s.fortifySource];
    count = Math.min(count, source.armies - 1);
    if (count < 1) return;

    const fSource = s.fortifySource;
    const fTarget = s.fortifyTarget;

    // Optimistic update
    set({
      territories: {
        ...s.territories,
        [fSource]: { ...source, armies: source.armies - count },
        [fTarget]: { ...s.territories[fTarget], armies: s.territories[fTarget].armies + count },
      },
    });

    // Write to DB
    await updateTerritory(s.gameId, fSource, { army_count: source.armies - count });
    await updateTerritory(s.gameId, fTarget, { army_count: s.territories[fTarget].armies + count });
    await addGameLog(s.gameId, s.currentPlayerIndex, `Fortified ${count} to ${fTarget}`, 'fortify');

    // End phase
    await get().endPhase();
  },

  // ==================== TRADE IN CARDS ====================
  tradeInCards: async (cardIds: string[]) => {
    const s = get();
    if (!s.gameId || s.phase !== 'REINFORCE' || s.mySlotIndex === null) return;
    const myPlayer = s.players.find(p => p.slotIndex === s.mySlotIndex);
    if (!myPlayer) return;

    const selectedCards = cardIds.map(id => myPlayer.cards.find(c => c.id === id)).filter(Boolean) as RiskCard[];
    if (selectedCards.length !== 3) return;

    const bonus = getTradeInValue(s.tradeInCount);
    const remainingCards = myPlayer.cards.filter(c => !cardIds.includes(c.id));
    const newArmies = s.reinforcementsLeft + bonus;

    // Optimistic update
    const updatedPlayers = s.players.map(p =>
      p.slotIndex === s.mySlotIndex ? { ...p, cards: remainingCards } : p
    );
    set({ players: updatedPlayers, reinforcementsLeft: newArmies, tradeInCount: s.tradeInCount + 1 });

    // Write to DB
    await updatePlayer(s.gameId, s.mySlotIndex, {
      cards: remainingCards,
      armies_to_place: newArmies,
    });
    await updateGame(s.gameId, { trade_in_count: s.tradeInCount + 1 });
    await addGameLog(s.gameId, s.mySlotIndex, `Traded cards for ${bonus} armies`, 'info');
  },

  // ==================== END PHASE ====================
  endPhase: async () => {
    const s = get();
    if (!s.gameId) return;

    if (s.phase === 'REINFORCE' && s.reinforcementsLeft > 0) return;

    if (s.phase === 'REINFORCE') {
      await updateGame(s.gameId, { turn_phase: 'ATTACK' });
      await addGameLog(s.gameId, s.currentPlayerIndex, 'Attack phase', 'info');
      set({ phase: 'ATTACK', attackSource: null, attackTarget: null, lastDiceRoll: null });
    } else if (s.phase === 'ATTACK') {
      // Grant a card if a human player conquered at least one territory this turn
      const currentPlayer = s.players.find(p => p.slotIndex === s.currentPlayerIndex);
      if (s.hasConqueredThisTurn && currentPlayer && !currentPlayer.isAi) {
        const CARD_TYPES: RiskCard['type'][] = ['Infantry', 'Cavalry', 'Artillery'];
        const type = CARD_TYPES[Math.floor(Math.random() * CARD_TYPES.length)];
        const newCard: RiskCard = { id: crypto.randomUUID(), type, territoryId: '' };
        const updatedPlayers = s.players.map(p =>
          p.slotIndex === s.currentPlayerIndex ? { ...p, cards: [...p.cards, newCard] } : p
        );
        set({ players: updatedPlayers });
        await updatePlayer(s.gameId, s.currentPlayerIndex, {
          cards: updatedPlayers.find(p => p.slotIndex === s.currentPlayerIndex)!.cards,
        });
        await addGameLog(s.gameId, s.currentPlayerIndex, 'Earned a Risk card', 'info');
      }
      await updateGame(s.gameId, { turn_phase: 'FORTIFY' });
      await addGameLog(s.gameId, s.currentPlayerIndex, 'Fortify phase', 'info');
      set({ phase: 'FORTIFY', fortifySource: null, fortifyTarget: null, attackSource: null, attackTarget: null });
    } else if (s.phase === 'FORTIFY') {
      // Advance to next player
      const eliminated = s.players.map(p => p.eliminated);
      const next = getNextActivePlayer(s.currentPlayerIndex, eliminated);
      const reinforcements = calculateReinforcements(next, s.territories);

      const nextPlayer = s.players.find(p => p.slotIndex === next);
      const nextName = nextPlayer?.displayName || PLAYER_NAMES[next];

      await updatePlayer(s.gameId, next, { armies_to_place: reinforcements });
      await updateGame(s.gameId, {
        current_player_index: next,
        turn_phase: 'REINFORCE',
        turn_number: s.turnNumber + 1,
        has_conquered_this_turn: false,
      });
      await addGameLog(s.gameId, next,
        `${nextPlayer?.isAi ? 'AI ' : ''}${nextName}'s turn — ${reinforcements} reinforcements`, 'turn_start');

      set({
        currentPlayerIndex: next,
        phase: 'REINFORCE',
        turnNumber: s.turnNumber + 1,
        reinforcementsLeft: reinforcements,
        hasConqueredThisTurn: false,
        fortifySource: null,
        fortifyTarget: null,
        attackSource: null,
        attackTarget: null,
        lastDiceRoll: null,
        isMyTurn: s.mySlotIndex === next,
      });

      // Trigger AI if next player is AI
      if (nextPlayer?.isAi) {
        setTimeout(() => get().runAITurn(), 1000);
      }
    }
  },

  // ==================== AI TURN ====================
  runAITurn: async () => {
    const s = get();
    if (!s.gameId) return;
    const player = s.players.find(p => p.slotIndex === s.currentPlayerIndex);
    if (!player?.isAi) return;

    // Reinforce
    const reinforceActions = aiReinforce(s.currentPlayerIndex, s.territories, s.reinforcementsLeft);
    for (const action of reinforceActions) {
      await get().placeReinforcement(action.territoryId);
      await delay(200);
    }

    // End reinforce → attack
    await get().endPhase();
    await delay(500);

    // Attack
    const attacks = aiDecideAttacks(s.currentPlayerIndex, get().territories);
    for (const attack of attacks) {
      const currentTerritories = get().territories;
      const src = currentTerritories[attack.source];
      const tgt = currentTerritories[attack.target];
      if (!src || !tgt || src.ownerId !== s.currentPlayerIndex || tgt.ownerId === s.currentPlayerIndex) continue;
      if (src.armies < 2) continue;

      get().selectAttackSource(attack.source);
      get().selectAttackTarget(attack.target);
      await delay(300);

      const maxDice = Math.min(3, get().territories[attack.source].armies - 1);
      const defDice = Math.min(2, get().territories[attack.target].armies);
      if (maxDice >= 1 && defDice >= 1) {
        await get().executeAttack(maxDice, defDice);
        await delay(400);

        if (get().awaitingMoveIn && get().capturedTerritory) {
          const capturedTerr = get().capturedTerritory!;
          const t = TERRITORY_MAP.get(capturedTerr);
          if (t) {
            const srcEntry = t.adjacent.find(a => {
              const ts = get().territories[a];
              return ts && ts.ownerId === s.currentPlayerIndex && ts.armies > 1;
            });
            if (srcEntry) {
              const moveCount = Math.max(1, Math.floor((get().territories[srcEntry].armies - 1) / 2));
              await get().moveArmiesAfterCapture(moveCount);
            }
          }
          await delay(200);
        }
      }

      if (get().winnerId !== null) return;
    }

    // End attack → fortify
    await get().endPhase();
    await delay(500);

    // Fortify
    const fortifyAction = aiFortify(s.currentPlayerIndex, get().territories);
    if (fortifyAction) {
      get().selectFortifySource(fortifyAction.source);
      get().selectFortifyTarget(fortifyAction.target);
      await delay(300);
      await get().executeFortify(fortifyAction.count);
    } else {
      await get().endPhase();
    }
  },
}));

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
