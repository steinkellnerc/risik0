import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../game/store';
import { PLAYER_NAMES, type RiskCard } from '../game/types';
import { TERRITORY_MAP } from '../game/mapData';
import { Swords, Shield, Move, ChevronRight, Dices, Target, ScrollText, ChevronDown, ChevronUp } from 'lucide-react';

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

const CARD_LABELS: Record<string, string> = {
  Infantry: '⚔ Infantry',
  Cavalry: '🐴 Cavalry',
  Artillery: '💣 Artillery',
  Wild: '★ Wild',
};

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

function findValidSet(cards: RiskCard[]): RiskCard[] | null {
  for (let i = 0; i < cards.length - 2; i++)
    for (let j = i + 1; j < cards.length - 1; j++)
      for (let k = j + 1; k < cards.length; k++) {
        const combo = [cards[i], cards[j], cards[k]];
        if (isValidSet(combo)) return combo;
      }
  return null;
}

function CardsPanel({
  cards, phase, selectedCardIds, setSelectedCardIds, onTrade,
}: {
  cards: RiskCard[];
  phase: string;
  selectedCardIds: string[];
  setSelectedCardIds: (ids: string[]) => void;
  onTrade: (ids: string[]) => void;
}) {
  const mustTrade = cards.length >= 5;
  const selectedCards = cards.filter(c => selectedCardIds.includes(c.id));
  const canTrade = selectedCards.length === 3 && isValidSet(selectedCards);
  const canSelect = phase === 'REINFORCE';
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

          {/* One-click trade when forced */}
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

export default function ActionPanel() {
  const {
    phase, currentPlayerIndex, reinforcementsLeft, attackSource, attackTarget,
    fortifySource, fortifyTarget, lastDiceRoll, territories, players, awaitingMoveIn,
    capturedTerritory, endPhase, executeAttack, executeFortify, moveArmiesAfterCapture,
    tradeInCards, log, missions, useMissions,
  } = useGameStore();

  const [moveCount, setMoveCount] = useState(1);
  const [fortifyCount, setFortifyCount] = useState(1);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [mobileExpanded, setMobileExpanded] = useState(true);

  const player = players[currentPlayerIndex];
  const pName = PLAYER_NAMES[currentPlayerIndex];

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

  return (
    <div className="w-full md:w-80 bg-surface md:h-full flex flex-col shadow-elevated border-t md:border-t-0 md:border-l border-border">
      {/* Header — acts as mobile toggle */}
      <div
        className="p-3 md:p-4 border-b border-border cursor-pointer md:cursor-default"
        onClick={() => setMobileExpanded(v => !v)}
      >
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full bg-player-${currentPlayerIndex + 1}`} />
          <span className="text-base font-semibold text-foreground flex-1">
            {player?.isAI ? '🤖 ' : ''}{pName}
          </span>
          <span className="text-xs font-semibold text-primary">{phase}</span>
          {phase === 'REINFORCE' && reinforcementsLeft > 0 && (
            <span className="font-mono-tabular text-primary text-sm ml-1">+{reinforcementsLeft}</span>
          )}
          <span className="md:hidden ml-2 text-muted-foreground">
            {mobileExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 hidden md:block">
          {phase === 'REINFORCE' && player?.cards.length >= 5
            ? 'You must trade in cards before placing troops.'
            : phase === 'REINFORCE'
            ? `Place ${reinforcementsLeft} reinforcements on your territories.`
            : phase === 'ATTACK'
            ? 'Click an enemy territory to target it, then pick a source — or click your own territory first.'
            : 'Move armies between two adjacent territories, or skip.'}
        </p>
      </div>

      {/* Collapsible body on mobile */}
      <div className={`${mobileExpanded ? 'flex' : 'hidden'} md:flex flex-col flex-1 overflow-hidden max-h-[55vh] md:max-h-full`}>

      {/* Secret Mission */}
      {useMissions && missions[currentPlayerIndex] && !player?.isAI && (
        <div className="px-4 py-2 border-b border-border bg-muted/30">
          <div className="flex items-center gap-1.5 text-primary mb-1">
            <Target size={12} />
            <span className="text-xs font-semibold">SECRET MISSION</span>
          </div>
          <p className="text-xs text-foreground/80">{missions[currentPlayerIndex].description}</p>
        </div>
      )}

      {/* Cards */}
      {!player?.isAI && (
        <CardsPanel
          cards={player?.cards ?? []}
          phase={phase}
          selectedCardIds={selectedCardIds}
          setSelectedCardIds={setSelectedCardIds}
          onTrade={(ids) => { tradeInCards(ids); setSelectedCardIds([]); }}
        />
      )}

      {/* Phase actions */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* REINFORCE */}
        {phase === 'REINFORCE' && (
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
        {phase === 'ATTACK' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-destructive">
              <Swords size={16} />
              <span className="text-sm font-medium">Attack</span>
            </div>

            {awaitingMoveIn && capturedTerritory && (
              <div className="bg-secondary rounded-lg p-3 space-y-3">
                <p className="text-xs text-foreground font-medium">Territory captured! Move armies in:</p>
                <div className="flex items-center gap-2">
                  <input type="range" min={1} max={maxMoveIn} value={moveCount}
                    onChange={e => setMoveCount(Number(e.target.value))}
                    className="flex-1 accent-primary" />
                  <span className="font-mono-tabular text-sm text-foreground w-8 text-right">{moveCount}</span>
                </div>
                <button onClick={() => { moveArmiesAfterCapture(moveCount); setMoveCount(1); }}
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

                {/* Dice results */}
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
                <span>End Attack → Fortify</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        )}

        {/* FORTIFY */}
        {phase === 'FORTIFY' && (
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
                  <input type="range" min={1} max={maxFortify} value={fortifyCount}
                    onChange={e => setFortifyCount(Number(e.target.value))}
                    className="flex-1 accent-primary" />
                  <span className="font-mono-tabular text-sm text-foreground w-8 text-right">{fortifyCount}</span>
                </div>
                <button onClick={() => { executeFortify(fortifyCount); setFortifyCount(1); }}
                  className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity">
                  Move {fortifyCount} Armies
                </button>
              </div>
            )}

            <button onClick={endPhase}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-border text-muted-foreground rounded-md text-sm hover:bg-secondary transition-colors">
              <span>Skip → End Turn</span>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Game Log */}
      <div className="border-t border-border p-3 max-h-32 md:max-h-48 overflow-y-auto">
        <span className="text-xs text-muted-foreground font-semibold mb-2 block">COMMAND LOG</span>
        <div className="space-y-1">
          {log.slice(0, 20).map((entry, i) => (
            <p key={i} className="text-xs text-foreground/70 leading-snug">{entry.message}</p>
          ))}
        </div>
      </div>

      </div>{/* end collapsible body */}
    </div>
  );
}
