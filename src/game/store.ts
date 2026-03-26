import { create } from 'zustand';
import { GameState, Phase, Player, TerritoryState, RiskCard, CardType, Mission, PLAYER_NAMES, PLAYER_COLORS, getTradeInValue } from './types';
import { TERRITORIES, CONTINENTS } from './mapData';
import { aiReinforce, aiDecideAttacks, aiFortify } from './ai';
import { assignMissions, checkMissionComplete } from './missions';

function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createDeck(): RiskCard[] {
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

function calculateReinforcements(playerIndex: number, territories: Record<string, TerritoryState>): number {
  const owned = Object.entries(territories).filter(([, s]) => s.ownerId === playerIndex);
  let armies = Math.max(3, Math.floor(owned.length / 3));
  for (const continent of CONTINENTS) {
    if (continent.territories.every(tid => territories[tid]?.ownerId === playerIndex)) {
      armies += continent.bonus;
    }
  }
  return armies;
}

function isValidSet(cards: RiskCard[]): boolean {
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

function findValidSet(cards: RiskCard[]): RiskCard[] | null {
  for (let i = 0; i < cards.length - 2; i++) {
    for (let j = i + 1; j < cards.length - 1; j++) {
      for (let k = j + 1; k < cards.length; k++) {
        const combo = [cards[i], cards[j], cards[k]];
        if (isValidSet(combo)) return combo;
      }
    }
  }
  return null;
}

export interface GameStore extends GameState {
  initGame: (humanCount: number, useMissions: boolean) => void;
  placeReinforcement: (territoryId: string) => void;
  tradeInCards: (cardIds: string[]) => void;
  selectAttackSource: (territoryId: string) => void;
  selectAttackTarget: (territoryId: string) => void;
  executeAttack: (attackDice: number, defendDice: number) => void;
  moveArmiesAfterCapture: (count: number) => void;
  selectFortifySource: (territoryId: string) => void;
  selectFortifyTarget: (territoryId: string) => void;
  executeFortify: (count: number) => void;
  endPhase: () => void;
  addLog: (message: string) => void;
  runAITurn: () => void;
  deck: RiskCard[];
  capturedTerritory: string | null;
  awaitingMoveIn: boolean;
  minMoveIn: number;
}

export const useGameStore = create<GameStore>((set, get) => ({
  id: '',
  turn: 0,
  currentPlayerIndex: 0,
  phase: 'SETUP' as Phase,
  territories: {},
  players: [],
  tradeInCount: 0,
  reinforcementsLeft: 0,
  hasConqueredThisTurn: false,
  attackSource: null,
  attackTarget: null,
  fortifySource: null,
  fortifyTarget: null,
  lastDiceRoll: null,
  log: [],
  winner: null,
  started: false,
  deck: [],
  capturedTerritory: null,
  awaitingMoveIn: false,
  minMoveIn: 1,
  missions: {},
  useMissions: false,

  addLog: (message: string) => set(s => ({
    log: [{ timestamp: Date.now(), message }, ...s.log].slice(0, 100),
  })),

  initGame: (humanCount: number, useMissions: boolean) => {
    const players: Player[] = Array.from({ length: 6 }, (_, i) => ({
      id: i,
      name: PLAYER_NAMES[i],
      color: PLAYER_COLORS[i],
      cards: [],
      eliminated: false,
      isAI: i >= humanCount,
    }));

    const shuffled = shuffleArray(TERRITORIES.map(t => t.id));
    const territories: Record<string, TerritoryState> = {};
    shuffled.forEach((tid, i) => {
      territories[tid] = { ownerId: i % 6, armies: 1 };
    });

    for (let p = 0; p < 6; p++) {
      let remaining = 13;
      const owned = shuffled.filter((_, i) => i % 6 === p);
      while (remaining > 0) {
        const tid = owned[Math.floor(Math.random() * owned.length)];
        territories[tid].armies += 1;
        remaining--;
      }
    }

    const missions = useMissions ? assignMissions(6) : {};
    const reinforcements = calculateReinforcements(0, territories);

    set({
      id: crypto.randomUUID(),
      turn: 1,
      currentPlayerIndex: 0,
      phase: 'REINFORCE',
      territories,
      players,
      tradeInCount: 0,
      reinforcementsLeft: reinforcements,
      hasConqueredThisTurn: false,
      attackSource: null,
      attackTarget: null,
      fortifySource: null,
      fortifyTarget: null,
      lastDiceRoll: null,
      log: [{ timestamp: Date.now(), message: `Game started. ${players[0].isAI ? '🤖 ' : ''}${PLAYER_NAMES[0]} begins.` }],
      winner: null,
      started: true,
      deck: createDeck(),
      capturedTerritory: null,
      awaitingMoveIn: false,
      minMoveIn: 1,
      missions,
      useMissions,
    });

    // If first player is AI, run their turn
    if (players[0].isAI) {
      setTimeout(() => get().runAITurn(), 500);
    }
  },

  placeReinforcement: (territoryId: string) => {
    const s = get();
    if (s.phase !== 'REINFORCE' || s.reinforcementsLeft <= 0) return;
    if (s.territories[territoryId]?.ownerId !== s.currentPlayerIndex) return;
    // Must trade cards before placing if holding 5 or more
    if (s.players[s.currentPlayerIndex].cards.length >= 5) return;

    const newLeft = s.reinforcementsLeft - 1;
    set({
      territories: {
        ...s.territories,
        [territoryId]: { ...s.territories[territoryId], armies: s.territories[territoryId].armies + 1 },
      },
      reinforcementsLeft: newLeft,
    });
    get().addLog(`Reinforced ${territoryId}`);

    // Auto-advance to attack phase when all reinforcements are placed
    if (newLeft === 0) {
      get().endPhase();
    }
  },

  tradeInCards: (cardIds: string[]) => {
    const s = get();
    const player = s.players[s.currentPlayerIndex];
    const cards = cardIds.map(id => player.cards.find(c => c.id === id)).filter(Boolean) as RiskCard[];
    if (!isValidSet(cards)) return;

    const bonus = getTradeInValue(s.tradeInCount);
    const newPlayers = [...s.players];
    newPlayers[s.currentPlayerIndex] = {
      ...player,
      cards: player.cards.filter(c => !cardIds.includes(c.id)),
    };

    const newDeck = shuffleArray([...s.deck, ...cards]);

    set({
      players: newPlayers,
      reinforcementsLeft: s.reinforcementsLeft + bonus,
      tradeInCount: s.tradeInCount + 1,
      deck: newDeck,
    });
    get().addLog(`Traded cards for ${bonus} armies`);
  },

  selectAttackSource: (territoryId: string) => {
    const s = get();
    if (s.phase !== 'ATTACK') return;
    if (s.territories[territoryId]?.ownerId !== s.currentPlayerIndex) return;
    if (s.territories[territoryId].armies < 2) return;
    // Keep existing target if this source is adjacent to it
    const keepTarget = s.attackTarget &&
      TERRITORIES.find(t => t.id === territoryId)?.adjacent.includes(s.attackTarget);
    set({ attackSource: territoryId, attackTarget: keepTarget ? s.attackTarget : null, lastDiceRoll: null });
  },

  selectAttackTarget: (territoryId: string) => {
    const s = get();
    if (s.phase !== 'ATTACK') return;
    if (s.territories[territoryId]?.ownerId === s.currentPlayerIndex) return;
    // If source already selected, validate adjacency
    if (s.attackSource) {
      const source = TERRITORIES.find(t => t.id === s.attackSource)!;
      if (!source.adjacent.includes(territoryId)) return;
    }
    // Target-first: clear source since it hasn't been validated yet
    set({ attackTarget: territoryId, attackSource: s.attackSource ?? null, lastDiceRoll: null });
  },

  executeAttack: (attackDice: number, defendDice: number) => {
    const s = get();
    if (!s.attackSource || !s.attackTarget) return;
    const sourceState = s.territories[s.attackSource];
    const targetState = s.territories[s.attackTarget];

    const maxAttack = Math.min(3, sourceState.armies - 1);
    const maxDefend = Math.min(2, targetState.armies);
    attackDice = Math.min(attackDice, maxAttack);
    defendDice = Math.min(defendDice, maxDefend);
    if (attackDice < 1 || defendDice < 1) return;

    const aRolls = Array.from({ length: attackDice }, () => rollDie()).sort((a, b) => b - a);
    const dRolls = Array.from({ length: defendDice }, () => rollDie()).sort((a, b) => b - a);

    let aLoss = 0, dLoss = 0;
    for (let i = 0; i < Math.min(aRolls.length, dRolls.length); i++) {
      if (aRolls[i] > dRolls[i]) dLoss++;
      else aLoss++;
    }

    const newTerritories = { ...s.territories };
    newTerritories[s.attackSource] = { ...sourceState, armies: sourceState.armies - aLoss };
    newTerritories[s.attackTarget] = { ...targetState, armies: targetState.armies - dLoss };

    const targetName = s.attackTarget;
    const captured = newTerritories[s.attackTarget].armies <= 0;

    if (captured) {
      newTerritories[s.attackTarget] = {
        ownerId: s.currentPlayerIndex,
        armies: 0,
      };
    }

    get().addLog(`Attack: ${aRolls.join(',')} vs ${dRolls.join(',')} — Lost A:${aLoss} D:${dLoss}${captured ? ' CAPTURED!' : ''}`);

    const defenderId = targetState.ownerId;
    let winner: number | null = null;
    let newPlayers = [...s.players];

    if (captured) {
      const defenderStillHas = Object.values(newTerritories).some(t => t.ownerId === defenderId);
      if (!defenderStillHas) {
        newPlayers[defenderId] = { ...newPlayers[defenderId], eliminated: true };
        newPlayers[s.currentPlayerIndex] = {
          ...newPlayers[s.currentPlayerIndex],
          cards: [...newPlayers[s.currentPlayerIndex].cards, ...newPlayers[defenderId].cards],
        };
        newPlayers[defenderId] = { ...newPlayers[defenderId], cards: [] };
        get().addLog(`${PLAYER_NAMES[defenderId]} eliminated!`);
      }

      // Check win conditions
      const allOwned = Object.values(newTerritories).every(t => t.ownerId === s.currentPlayerIndex);
      if (allOwned) {
        winner = s.currentPlayerIndex;
      } else if (s.useMissions) {
        const eliminated = newPlayers.map(p => p.eliminated);
        // Check attacker's mission
        if (s.missions[s.currentPlayerIndex] && checkMissionComplete(s.currentPlayerIndex, s.missions[s.currentPlayerIndex], newTerritories, eliminated)) {
          winner = s.currentPlayerIndex;
          get().addLog(`🎯 ${PLAYER_NAMES[s.currentPlayerIndex]} completed their secret mission!`);
        }
        // If defender was just eliminated, check all other players whose mission is to destroy them
        if (winner === null && newPlayers[defenderId].eliminated) {
          for (let p = 0; p < newPlayers.length; p++) {
            if (p === s.currentPlayerIndex) continue;
            if (newPlayers[p].eliminated) continue;
            const m = s.missions[p];
            if (m && checkMissionComplete(p, m, newTerritories, eliminated)) {
              winner = p;
              get().addLog(`🎯 ${PLAYER_NAMES[p]} completed their secret mission!`);
              break;
            }
          }
        }
      }
    }

    set({
      territories: newTerritories,
      lastDiceRoll: { attacker: aRolls, defender: dRolls },
      hasConqueredThisTurn: s.hasConqueredThisTurn || captured,
      players: newPlayers,
      winner,
      capturedTerritory: captured ? targetName : null,
      awaitingMoveIn: captured,
      minMoveIn: captured ? attackDice : 1,
      attackSource: captured ? null : s.attackSource,
      attackTarget: captured ? null : s.attackTarget,
    });
  },

  moveArmiesAfterCapture: (count: number) => {
    const s = get();
    if (!s.capturedTerritory || !s.awaitingMoveIn) return;
    const lastSource = Object.entries(s.territories)
      .filter(([id, t]) => t.ownerId === s.currentPlayerIndex && t.armies > 1 &&
        TERRITORIES.find(tt => tt.id === id)?.adjacent.includes(s.capturedTerritory!))
      .sort(([, a], [, b]) => b.armies - a.armies)[0];

    if (!lastSource) return;
    const [sourceId, sourceState] = lastSource;
    const maxMove = sourceState.armies - 1;
    // Must move at least as many armies as attack dice used (capped at maxMove if source ran low)
    count = Math.max(Math.min(s.minMoveIn, maxMove), Math.min(count, maxMove));

    set({
      territories: {
        ...s.territories,
        [sourceId]: { ...sourceState, armies: sourceState.armies - count },
        [s.capturedTerritory]: { ...s.territories[s.capturedTerritory], armies: count },
      },
      capturedTerritory: null,
      awaitingMoveIn: false,
    });
  },

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
    const source = TERRITORIES.find(t => t.id === s.fortifySource)!;
    if (!source.adjacent.includes(territoryId)) return;
    if (s.territories[territoryId]?.ownerId !== s.currentPlayerIndex) return;
    set({ fortifyTarget: territoryId });
  },

  executeFortify: (count: number) => {
    const s = get();
    if (!s.fortifySource || !s.fortifyTarget) return;
    const source = s.territories[s.fortifySource];
    count = Math.min(count, source.armies - 1);
    if (count < 1) return;

    set({
      territories: {
        ...s.territories,
        [s.fortifySource]: { ...source, armies: source.armies - count },
        [s.fortifyTarget]: { ...s.territories[s.fortifyTarget], armies: s.territories[s.fortifyTarget].armies + count },
      },
    });
    get().addLog(`Fortified ${count} to ${s.fortifyTarget}`);
    // Reset selections so player can make another fortify move; endPhase is via the "End Turn" button
    set({ fortifySource: null, fortifyTarget: null });
  },

  endPhase: () => {
    const s = get();
    if (s.phase === 'REINFORCE' && s.reinforcementsLeft > 0) return;

    if (s.phase === 'REINFORCE') {
      // Check mission completion after all reinforcements are placed
      if (s.useMissions && s.missions[s.currentPlayerIndex]) {
        const eliminated = s.players.map(p => p.eliminated);
        if (checkMissionComplete(s.currentPlayerIndex, s.missions[s.currentPlayerIndex], s.territories, eliminated)) {
          set({ winner: s.currentPlayerIndex });
          get().addLog(`${PLAYER_NAMES[s.currentPlayerIndex]} completed their secret mission!`);
          return;
        }
      }
      set({ phase: 'ATTACK', attackSource: null, attackTarget: null, lastDiceRoll: null });
      get().addLog('Attack phase');
    } else if (s.phase === 'ATTACK') {
      if (s.hasConqueredThisTurn && s.deck.length > 0) {
        const [card, ...rest] = s.deck;
        const newPlayers = [...s.players];
        newPlayers[s.currentPlayerIndex] = {
          ...newPlayers[s.currentPlayerIndex],
          cards: [...newPlayers[s.currentPlayerIndex].cards, card],
        };
        set({ players: newPlayers, deck: rest });
        get().addLog('Earned a Risk card');
      }
      set({ phase: 'FORTIFY', fortifySource: null, fortifyTarget: null, attackSource: null, attackTarget: null });
      get().addLog('Fortify phase');
    } else if (s.phase === 'FORTIFY') {
      // Check mission completion after fortify (e.g. 18 territories with 2 armies)
      if (s.useMissions && s.missions[s.currentPlayerIndex]) {
        const eliminated = s.players.map(p => p.eliminated);
        if (checkMissionComplete(s.currentPlayerIndex, s.missions[s.currentPlayerIndex], s.territories, eliminated)) {
          set({ winner: s.currentPlayerIndex });
          get().addLog(`${PLAYER_NAMES[s.currentPlayerIndex]} completed their secret mission!`);
          return;
        }
      }
      let next = (s.currentPlayerIndex + 1) % 6;
      while (s.players[next].eliminated) {
        next = (next + 1) % 6;
      }
      const reinforcements = calculateReinforcements(next, s.territories);
      set({
        currentPlayerIndex: next,
        phase: 'REINFORCE',
        turn: s.turn + 1,
        reinforcementsLeft: reinforcements,
        hasConqueredThisTurn: false,
        fortifySource: null,
        fortifyTarget: null,
        attackSource: null,
        attackTarget: null,
        lastDiceRoll: null,
      });
      get().addLog(`${s.players[next].isAI ? '🤖 ' : ''}${PLAYER_NAMES[next]}'s turn — ${reinforcements} reinforcements`);

      // Auto-run AI turn
      if (s.players[next].isAI) {
        setTimeout(() => get().runAITurn(), 600);
      }
    }
  },

  runAITurn: () => {
    const s = get();
    const player = s.players[s.currentPlayerIndex];
    if (!player.isAI) return;

    // Mandatory: trade until < 5 cards. Then optionally trade if >= 3.
    let currentCards = get().players[s.currentPlayerIndex].cards;
    while (currentCards.length >= 5) {
      const validSet = findValidSet(currentCards);
      if (!validSet) break;
      get().tradeInCards(validSet.map(c => c.id));
      currentCards = get().players[s.currentPlayerIndex].cards;
    }
    if (currentCards.length >= 3) {
      const validSet = findValidSet(currentCards);
      if (validSet) get().tradeInCards(validSet.map(c => c.id));
    }

    // Reinforce
    const reinforceActions = aiReinforce(s.currentPlayerIndex, get().territories, get().reinforcementsLeft);
    for (const action of reinforceActions) {
      get().placeReinforcement(action.territoryId);
    }

    // Move to attack phase (placeReinforcement auto-advances on last placement, avoid double-advance)
    if (get().phase === 'REINFORCE') {
      get().endPhase();
    }

    // Attack — re-evaluate each round so AI adapts as territories change
    let attacksThisTurn = 0;
    const MAX_ATTACKS = 20;
    while (attacksThisTurn < MAX_ATTACKS) {
      const freshAttacks = aiDecideAttacks(s.currentPlayerIndex, get().territories);
      if (freshAttacks.length === 0) break;

      const attack = freshAttacks[0];
      const currentTerritories = get().territories;
      const src = currentTerritories[attack.source];
      const tgt = currentTerritories[attack.target];
      if (!src || !tgt || src.ownerId !== s.currentPlayerIndex || tgt.ownerId === s.currentPlayerIndex) break;
      if (src.armies < 2) break;

      get().selectAttackSource(attack.source);
      get().selectAttackTarget(attack.target);
      const maxDice = Math.min(3, get().territories[attack.source].armies - 1);
      const defDice = Math.min(2, get().territories[attack.target].armies);
      if (maxDice < 1 || defDice < 1) break;

      get().executeAttack(maxDice, defDice);
      attacksThisTurn++;

      // Handle move-in after capture
      if (get().awaitingMoveIn) {
        const capturedTerr = get().capturedTerritory;
        if (capturedTerr) {
          const srcState = Object.entries(get().territories)
            .find(([id, t]) => t.ownerId === s.currentPlayerIndex && t.armies > 1 &&
              TERRITORIES.find(tt => tt.id === id)?.adjacent.includes(capturedTerr));
          if (srcState) {
            const moveCount = Math.max(1, Math.floor((srcState[1].armies - 1) / 2));
            get().moveArmiesAfterCapture(moveCount);
          }
        }
      }

      if (get().winner !== null) return;
    }

    // End attack → fortify
    get().endPhase();

    // Fortify
    const fortifyAction = aiFortify(s.currentPlayerIndex, get().territories);
    if (fortifyAction) {
      get().selectFortifySource(fortifyAction.source);
      get().selectFortifyTarget(fortifyAction.target);
      get().executeFortify(fortifyAction.count);
      get().endPhase();
    } else {
      get().endPhase(); // skip fortify
    }
  },
}));
