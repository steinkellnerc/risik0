import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMultiplayerStore } from '../game/multiplayerStore';
import { TERRITORY_MAP } from '../game/mapData';
import type { RiskCard } from '../game/types';
import { Swords, Shield, Move, ChevronRight, Dices, Target, Clock, History, ScrollText, ChevronDown, ChevronUp } from 'lucide-react';

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
  for (let i = 0; i < cards.length - 2; i++)
    for (let j = i + 1; j < cards.length - 1; j++)
      for (let k = j + 1; k < cards.length; k++) {
        const combo = [cards[i], cards[j], cards[k]];
        if (isValidSet(combo)) return combo;
      }
  return null;
}

const CARD_LABELS: Record<string, string> = {
  Infantry: '⚔ Infantry',
  Cavalry: '🐴 Cavalry',
  Artillery: '💣 Artillery',
  Wild: '★ Wild',
};

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
              onClick={() => onTrade(bestSet.map(c => c.id))}
              className="w-full px-3 py-1.5 bg-destructive text-destructive-foreground rounded-md text-xs font-medium hover:opacity-90 transition-opacity"
            >
              Trade Best Set (required)
            </button>
          )}

          {canSelect && selectedCardIds.length > 0 && (
            <button
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

function DiceDisplay({ rolls, label, color }: { rolls: number[]; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-8">{label}</span>
      <div className="flex gap-1">
        {rolls.map((r, i) => (
          <motion.div key={i}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.08, type: 'spring', stiffness: 400, damping: 15 }}
            className="w-8 h-8 rounded-md flex items-center justify-center font-mono-tabular text-sm font-bold shadow-elevated"
            style={{ backgroundColor: color, color: 'white' }}>
            {r}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function MultiplayerActionPanel() {
  const {
    phase, currentPlayerIndex, reinforcementsLeft, attackSource, attackTarget,
    fortifySource, fortifyTarget, lastDiceRoll, territories, players, awaitingMoveIn,
    capturedTerritory, minMoveIn, endPhase, executeAttack, executeFortify, moveArmiesAfterCapture,
    tradeInCards, log, isMyTurn, mySlotIndex,
  } = useMultiplayerStore();

  const [moveCount, setMoveCount] = useState(1);
  const [fortifyCount, setFortifyCount] = useState(1);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [mobileExpanded, setMobileExpanded] = useState(true);

  // Reset move-in slider to the required minimum whenever a new capture happens
  useEffect(() => { if (awaitingMoveIn) setMoveCount(minMoveIn); }, [awaitingMoveIn, minMoveIn]);
  // Reset fortify slider when selections change (after each fortify move or new selection)
  useEffect(() => { setFortifyCount(1); }, [fortifySource, fortifyTarget]);

  const currentPlayer = players.find(p => p.slotIndex === currentPlayerIndex);
  const myPlayer = players.find(p => p.slotIndex === mySlotIndex);

  const sourceState = attackSource ? territories[attackSource] : null;
  const targetState = attackTarget ? territories[attackTarget] : null;
  const maxAttackDice = sourceState ? Math.min(3, sourceState.armies - 1) : 0;
  const maxDefendDice = targetState ? Math.min(2, targetState.armies) : 0;

  const fortifySourceState = fortifySource ? territories[fortifySource] : null;
  const maxFortify = fortifySourceState ? fortifySourceState.armies - 1 : 0;

  // Move-in after capture
  const captureSource = capturedTerritory ? (() => {
    const t = TERRITORY_MAP.get(capturedTerritory);
    if (!t) return null;
    const adj = t.adjacent.find(a =>
      territories[a]?.ownerId === currentPlayerIndex && territories[a]?.armies > 1
    );
    return adj ? territories[adj] : null;
  })() : null;
  const maxMoveIn = captureSource ? captureSource.armies - 1 : 1;

  // Secret mission for current user
  const myMission = myPlayer?.secretObjective;

  return (
    <div className="w-full md:w-72 bg-surface md:h-full flex flex-col shadow-elevated border-t md:border-t-0 md:border-l border-border">
      {/* Header — acts as mobile toggle */}
      <div
        className="p-3 md:p-4 border-b border-border cursor-pointer md:cursor-default"
        onClick={() => setMobileExpanded(v => !v)}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full bg-player-${currentPlayerIndex + 1}`} />
          <span className="text-sm font-semibold text-foreground flex-1">
            {currentPlayer?.isAi ? 'AI ' : ''}{currentPlayer?.displayName}
          </span>
          <span className="text-xs font-semibold text-primary">{phase}</span>
          {isMyTurn && phase === 'REINFORCE' && reinforcementsLeft > 0 && (
            <span className="font-mono-tabular text-primary text-sm ml-1">+{reinforcementsLeft}</span>
          )}
          {!isMyTurn && <Clock size={11} className="text-muted-foreground ml-1" />}
          <span className="md:hidden ml-1 text-muted-foreground">
            {mobileExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 hidden md:block">
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

      {/* Secret Mission — always visible, outside collapsible */}
      {myMission && (
        <div className="px-3 py-2 border-b-2 border-primary/30 bg-primary/10 flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <Target size={12} className="text-primary shrink-0" />
            <span className="text-xs font-bold text-primary uppercase tracking-wide">Your Mission</span>
          </div>
          <p className="text-xs text-foreground leading-snug">{myMission}</p>
        </div>
      )}

      {/* Collapsible body */}
      <div className={`${mobileExpanded ? 'flex' : 'hidden'} md:flex flex-col flex-1 overflow-hidden max-h-[50vh] md:max-h-full`}>

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
          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
            <Clock size={20} className="mb-1.5 opacity-50" />
            <span className="text-xs">Waiting for {currentPlayer?.isAi ? 'AI' : currentPlayer?.displayName}...</span>
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
              <button onClick={endPhase}
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
                <button onClick={() => { moveArmiesAfterCapture(Math.max(minMoveIn, Math.min(moveCount, Math.max(minMoveIn, maxMoveIn)))); setMoveCount(minMoveIn); }}
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
                    {[...Array(maxAttackDice)].map((_, i) => (
                      <button key={i} onClick={() => executeAttack(i + 1, maxDefendDice)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-destructive text-destructive-foreground rounded-md text-xs font-medium hover:opacity-90 transition-opacity">
                        <Dices size={14} />
                        Attack with {i + 1} {i === 0 ? 'die' : 'dice'}
                      </button>
                    ))}
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
              <button onClick={endPhase}
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
            <div className="flex items-center gap-2 text-primary">
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
                <button onClick={() => { executeFortify(Math.min(fortifyCount, Math.max(1, maxFortify))); }}
                  className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity">
                  Move {fortifyCount} Armies
                </button>
              </div>
            )}

            <button onClick={endPhase}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-border text-muted-foreground rounded-md text-sm hover:bg-secondary transition-colors">
              <span>End Turn</span>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Game Log — desktop only */}
      <div className="hidden md:block border-t border-border p-3 max-h-40 overflow-y-auto">
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

      </div>{/* end collapsible body */}
    </div>
  );
}
