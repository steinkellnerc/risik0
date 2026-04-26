import { useState, useEffect } from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';
import { AnimatePresence } from 'framer-motion';
import { useMultiplayerStore } from '../game/multiplayerStore';
import { TERRITORY_MAP } from '../game/mapData';
import type { RiskCard } from '../game/types';
import { useIsMobile } from '../hooks/use-mobile';
import { Swords, Shield, Move, ChevronRight, Dices, Target, Clock, History, ScrollText } from 'lucide-react';
import { isValidSet, findValidSet, CARD_LABELS, DiceDisplay } from './cardUtils';

function CardsPanel({
  cards, phase, active, selectedCardIds, setSelectedCardIds, onTrade,
}: {
  cards: RiskCard[];
  phase: string;
  active: boolean;
  selectedCardIds: string[];
  setSelectedCardIds: (ids: string[]) => void;
  onTrade: (ids: string[]) => void;
}) {
  const mustTrade = active && cards.length >= 5;
  const selectedCards = cards.filter(c => selectedCardIds.includes(c.id));
  const canTrade = selectedCards.length === 3 && isValidSet(selectedCards);
  const canSelect = active && phase === 'REINFORCE';
  const bestSet = mustTrade ? findValidSet(cards) : null;

  const toggleCard = (id: string) => {
    if (!canSelect) return;
    if (selectedCardIds.includes(id)) {
      setSelectedCardIds(selectedCardIds.filter(s => s !== id));
    } else if (selectedCardIds.length < 3) {
      setSelectedCardIds([...selectedCardIds, id]);
    }
  };

  return (
    <div className={`px-4 py-2 border-b border-border ${mustTrade ? 'bg-destructive/10' : 'bg-muted/20'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <ScrollText size={12} />
          <span className="text-xs font-semibold">CARDS ({cards.length})</span>
        </div>
        {mustTrade && (
          <span className="text-xs font-bold text-destructive animate-pulse">MUST TRADE</span>
        )}
      </div>

      {cards.length === 0 ? (
        <p className="text-xs text-muted-foreground/60">No cards yet — earn one by conquering a territory.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1 mb-2">
            {cards.map(card => {
              const isSelected = selectedCardIds.includes(card.id);
              const isInBestSet = bestSet?.some(c => c.id === card.id) ?? false;
              const isDisabled = !isSelected && selectedCardIds.length >= 3;
              return (
                <button
                  type="button"
                  key={card.id}
                  onClick={() => toggleCard(card.id)}
                  disabled={!canSelect || isDisabled}
                  className={`px-2 py-0.5 rounded text-xs font-medium border transition-all ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : mustTrade && isInBestSet && selectedCardIds.length === 0
                      ? 'bg-destructive/20 text-foreground border-destructive/60 cursor-pointer'
                      : canSelect && !isDisabled
                      ? 'bg-secondary text-foreground border-border hover:border-primary/60 cursor-pointer'
                      : 'bg-secondary text-muted-foreground border-border opacity-70'
                  }`}
                >
                  {CARD_LABELS[card.type]}
                </button>
              );
            })}
          </div>

          {mustTrade && bestSet && selectedCardIds.length === 0 && (
            <button
              type="button"
              onClick={() => onTrade(bestSet.map(c => c.id))}
              className="w-full px-3 py-1.5 bg-destructive text-destructive-foreground rounded-md text-xs font-medium hover:opacity-90 transition-opacity"
            >
              Trade Best Set (required)
            </button>
          )}

          {canSelect && selectedCardIds.length > 0 && (
            <button
              type="button"
              onClick={() => onTrade(selectedCardIds)}
              disabled={!canTrade}
              className="w-full px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {selectedCardIds.length < 3
                ? `Select ${3 - selectedCardIds.length} more`
                : canTrade
                ? 'Trade Selected Cards'
                : 'Invalid set — try another combo'}
            </button>
          )}

          {canSelect && selectedCardIds.length === 0 && !mustTrade && cards.length >= 3 && (
            <p className="text-xs text-muted-foreground">Tap cards to select a set of 3 to trade</p>
          )}

          {!canSelect && cards.length > 0 && (
            <p className="text-xs text-muted-foreground/60">Trade available during Reinforce phase</p>
          )}
        </>
      )}
    </div>
  );
}

export default function MultiplayerActionPanel() {
  const {
    phase, currentPlayerIndex, reinforcementsLeft, attackSource, attackTarget,
    fortifySource, fortifyTarget, lastDiceRoll, territories, players, awaitingMoveIn,
    capturedTerritory, captureSource: captureSourceId, minMoveIn, endPhase, executeAttack, executeFortify, moveArmiesAfterCapture,
    tradeInCards, log, isMyTurn, mySlotIndex, myUserId, hostUserId, kickAI,
  } = useMultiplayerStore();

  const [moveCount, setMoveCount] = useState(1);
  const [fortifyCount, setFortifyCount] = useState(1);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const isMobile = useIsMobile();

  // Reset move-in slider to the required minimum whenever a new capture happens
  useEffect(() => { if (awaitingMoveIn) setMoveCount(minMoveIn); }, [awaitingMoveIn, minMoveIn]);
  // Reset fortify slider when selections change (after each fortify move or new selection)
  useEffect(() => { setFortifyCount(1); }, [fortifySource, fortifyTarget]);
  // Clear stale card selection when the active player changes
  useEffect(() => { setSelectedCardIds([]); }, [currentPlayerIndex]);

  const currentPlayer = players.find(p => p.slotIndex === currentPlayerIndex);
  const myPlayer = players.find(p => p.slotIndex === mySlotIndex);

  const sourceState = attackSource ? territories[attackSource] : null;
  const targetState = attackTarget ? territories[attackTarget] : null;
  const maxAttackDice = sourceState ? Math.min(3, sourceState.armies - 1) : 0;
  const maxDefendDice = targetState ? Math.min(2, targetState.armies) : 0;

  const fortifySourceState = fortifySource ? territories[fortifySource] : null;
  const maxFortify = fortifySourceState ? fortifySourceState.armies - 1 : 0;

  // Move-in after capture — armies come only from the attacking territory
  const captureSourceState = captureSourceId ? territories[captureSourceId] : null;
  const maxMoveIn = captureSourceState ? captureSourceState.armies - 1 : 1;

  // Secret mission for current user
  const myMission = myPlayer?.secretObjective;

  const header = (
    <div className="p-3 border-b border-border shrink-0">
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full bg-player-${currentPlayerIndex + 1}`} />
        <span className="text-sm font-semibold text-foreground flex-1">
          {currentPlayer?.isAi ? 'AI ' : ''}{currentPlayer?.displayName}
        </span>
        <span className={`text-xs font-semibold ${phase === 'ATTACK' ? 'text-destructive' : phase === 'FORTIFY' ? 'text-green-400' : 'text-primary'}`}>{phase}</span>
        {isMyTurn && phase === 'REINFORCE' && reinforcementsLeft > 0 && (
          <span className="font-mono-tabular text-primary text-sm ml-1">+{reinforcementsLeft}</span>
        )}
        {!isMyTurn && <Clock size={11} className="text-muted-foreground ml-1" />}
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">
        {isMyTurn
          ? phase === 'REINFORCE' && (myPlayer?.cards ?? []).length >= 5
            ? 'Trade in cards before placing troops.'
            : phase === 'REINFORCE'
            ? `Place ${reinforcementsLeft} reinforcements.`
            : phase === 'ATTACK'
            ? 'Select source, then target.'
            : 'Move armies or skip.'
          : currentPlayer?.isAi
          ? 'AI is thinking...'
          : `Waiting for ${currentPlayer?.displayName}...`}
      </p>
    </div>
  );

  const body = (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">

      {/* Secret Mission */}
      {myMission && (
        <div className="px-3 py-2 border-b-2 border-primary/30 bg-primary/10 flex flex-col gap-1 shrink-0">
          <div className="flex items-center gap-1.5">
            <Target size={12} className="text-primary shrink-0" />
            <span className="text-xs font-bold text-primary uppercase tracking-wide">Your Mission</span>
          </div>
          <p className="text-xs text-foreground leading-snug">{myMission}</p>
        </div>
      )}

      {/* Cards — always visible to the local player, interactive only on their turn */}
      {myPlayer && (
        <CardsPanel
          cards={myPlayer.cards ?? []}
          phase={phase}
          active={isMyTurn}
          selectedCardIds={selectedCardIds}
          setSelectedCardIds={setSelectedCardIds}
          onTrade={async (ids) => { await tradeInCards(ids); setSelectedCardIds([]); }}
        />
      )}

      {/* Phase actions */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        {!isMyTurn && (
          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground gap-2">
            <Clock size={20} className="mb-1.5 opacity-50" />
            <span className="text-xs">Waiting for {currentPlayer?.isAi ? 'AI' : currentPlayer?.displayName}...</span>
            {currentPlayer?.isAi && myUserId === hostUserId && (
              <button
                type="button"
                onClick={kickAI}
                className="mt-1 text-xs px-3 py-1.5 rounded bg-muted hover:bg-muted/70 border border-border text-foreground"
              >
                Nudge AI
              </button>
            )}
          </div>
        )}

        {/* REINFORCE */}
        {isMyTurn && phase === 'REINFORCE' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Shield size={16} />
              <span className="text-sm font-medium">Reinforce</span>
            </div>
            <div className="bg-muted rounded-lg p-3 text-center">
              <span className="font-mono-tabular text-2xl font-bold text-foreground">{reinforcementsLeft}</span>
              <p className="text-xs text-muted-foreground mt-1">armies remaining</p>
            </div>

            {reinforcementsLeft === 0 && (
              <button type="button" onClick={endPhase}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity">
                <span>Proceed to Attack</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        )}

        {/* ATTACK */}
        {isMyTurn && phase === 'ATTACK' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-destructive">
              <Swords size={16} />
              <span className="text-sm font-medium">Attack</span>
            </div>

            {awaitingMoveIn && capturedTerritory && (
              <div className="bg-secondary rounded-lg p-3 space-y-3">
                <p className="text-xs text-foreground font-medium">Territory captured! Move armies in:</p>
                <div className="flex items-center gap-2">
                  <input type="range" min={minMoveIn} max={Math.max(minMoveIn, maxMoveIn)}
                    value={Math.max(minMoveIn, Math.min(moveCount, Math.max(minMoveIn, maxMoveIn)))}
                    onChange={e => setMoveCount(Number(e.target.value))}
                    className="flex-1 accent-primary" />
                  <span className="font-mono-tabular text-sm text-foreground w-8 text-right">{Math.max(minMoveIn, Math.min(moveCount, Math.max(minMoveIn, maxMoveIn)))}</span>
                </div>
                <button type="button" onClick={() => { moveArmiesAfterCapture(Math.max(minMoveIn, Math.min(moveCount, Math.max(minMoveIn, maxMoveIn)))); setMoveCount(minMoveIn); }}
                  className="w-full px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:opacity-90 transition-opacity">
                  Move In
                </button>
              </div>
            )}

            {!awaitingMoveIn && (
              <>
                {attackSource && (
                  <div className="bg-secondary rounded-lg p-2">
                    <span className="text-xs text-muted-foreground">From: </span>
                    <span className="text-xs text-foreground font-medium">{TERRITORY_MAP.get(attackSource)?.name} ({sourceState?.armies})</span>
                  </div>
                )}
                {attackTarget && (
                  <div className="bg-secondary rounded-lg p-2">
                    <span className="text-xs text-muted-foreground">Target: </span>
                    <span className="text-xs text-foreground font-medium">{TERRITORY_MAP.get(attackTarget)?.name} ({targetState?.armies})</span>
                  </div>
                )}

                {attackSource && attackTarget && (
                  <div className="space-y-2">
                    {[...Array(maxAttackDice)].map((_, i) => {
                      const diceCount = maxAttackDice - i;
                      const isMax = i === 0;
                      return (
                        <button key={diceCount} type="button" onClick={() => executeAttack(diceCount, maxDefendDice)}
                          className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium hover:opacity-90 transition-opacity ${isMax ? 'bg-destructive text-destructive-foreground' : 'border border-destructive/40 text-destructive hover:bg-destructive/10'}`}>
                          <Dices size={14} />
                          Attack with {diceCount} {diceCount === 1 ? 'die' : 'dice'}
                        </button>
                      );
                    })}
                  </div>
                )}

                <AnimatePresence>
                  {lastDiceRoll && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="bg-muted rounded-lg p-3 space-y-2">
                      <DiceDisplay rolls={lastDiceRoll.attacker} label="ATK" color="hsl(0, 84%, 45%)" />
                      <DiceDisplay rolls={lastDiceRoll.defender} label="DEF" color="hsl(217, 60%, 40%)" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            {!awaitingMoveIn && (
              <button type="button" onClick={endPhase}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-border text-muted-foreground rounded-md text-sm hover:bg-secondary transition-colors">
                <span>End Attack</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        )}

        {/* FORTIFY */}
        {isMyTurn && phase === 'FORTIFY' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-400">
              <Move size={16} />
              <span className="text-sm font-medium">Fortify</span>
            </div>

            {fortifySource && (
              <div className="bg-secondary rounded-lg p-2">
                <span className="text-xs text-muted-foreground">From: </span>
                <span className="text-xs text-foreground font-medium">{TERRITORY_MAP.get(fortifySource)?.name}</span>
              </div>
            )}
            {fortifyTarget && (
              <div className="bg-secondary rounded-lg p-2">
                <span className="text-xs text-muted-foreground">To: </span>
                <span className="text-xs text-foreground font-medium">{TERRITORY_MAP.get(fortifyTarget)?.name}</span>
              </div>
            )}

            {fortifySource && fortifyTarget && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input type="range" min={1} max={Math.max(1, maxFortify)}
                    value={Math.min(fortifyCount, Math.max(1, maxFortify))}
                    onChange={e => setFortifyCount(Number(e.target.value))}
                    className="flex-1 accent-primary" />
                  <span className="font-mono-tabular text-sm text-foreground w-8 text-right">{Math.min(fortifyCount, Math.max(1, maxFortify))}</span>
                </div>
                <button type="button" onClick={() => { executeFortify(Math.min(fortifyCount, Math.max(1, maxFortify))); }}
                  className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity">
                  Move {Math.min(fortifyCount, Math.max(1, maxFortify))} Armies
                </button>
              </div>
            )}

            <button type="button" onClick={endPhase}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-border text-muted-foreground rounded-md text-sm hover:bg-secondary transition-colors">
              <span>End Turn</span>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Game Log */}
      <div className="border-t border-border p-3 max-h-40 overflow-y-auto shrink-0">
        <div className="flex items-center gap-1.5 mb-1.5">
          <History size={11} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-semibold">HISTORY</span>
        </div>
        <div className="space-y-0.5">
          {log.slice(0, 30).map((entry, i) => (
            <p key={i} className="text-xs text-foreground/70 leading-snug">
              <span className="text-muted-foreground/60">
                {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {' '}{entry.message}
            </p>
          ))}
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <DrawerPrimitive.Root open onOpenChange={() => {}} modal={false} snapPoints={[0.14, 0.72]} defaultSnap={0.14} dismissible={false}>
        <DrawerPrimitive.Portal>
          <DrawerPrimitive.Content className="fixed inset-x-0 bottom-0 z-40 flex flex-col bg-surface rounded-t-2xl border-t border-border pb-safe" style={{ maxHeight: '72vh' }}>
            <div className="flex justify-center py-2 shrink-0">
              <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
            </div>
            {header}
            <div className="flex-1 overflow-y-auto min-h-0">
              {body}
            </div>
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Portal>
      </DrawerPrimitive.Root>
    );
  }

  return (
    <div className="w-72 bg-surface h-full flex flex-col shadow-elevated border-l border-border">
      {header}
      {body}
    </div>
  );
}
