import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMultiplayerStore } from '../game/multiplayerStore';
import { TERRITORY_MAP } from '../game/mapData';
import { Swords, Shield, Move, ChevronRight, Dices, Target, Clock, History, Coins } from 'lucide-react';

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
    capturedTerritory, endPhase, executeAttack, executeFortify, moveArmiesAfterCapture,
    log, isMyTurn, mySlotIndex,
  } = useMultiplayerStore();

  const [moveCount, setMoveCount] = useState(1);
  const [fortifyCount, setFortifyCount] = useState(1);

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
    <div className="w-80 bg-surface h-full flex flex-col shadow-elevated">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full bg-player-${currentPlayerIndex + 1}`} />
          <span className="text-base font-semibold text-foreground">
            {currentPlayer?.isAi ? 'AI ' : ''}{currentPlayer?.displayName}
          </span>
        </div>

        {isMyTurn ? (
          <p className="text-sm text-muted-foreground mt-1">
            {phase === 'REINFORCE' && `Place ${reinforcementsLeft} reinforcements on your territories.`}
            {phase === 'ATTACK' && 'Select a territory to attack from, then a target.'}
            {phase === 'FORTIFY' && 'Move armies between two adjacent territories, or skip.'}
          </p>
        ) : (
          <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
            <Clock size={12} />
            <span className="text-sm">
              {currentPlayer?.isAi ? 'AI is thinking...' : `Waiting for ${currentPlayer?.displayName}...`}
            </span>
          </div>
        )}
      </div>

      {/* Secret Mission */}
      {myMission && (
        <div className="px-4 py-2 border-b border-border bg-muted/30">
          <div className="flex items-center gap-1.5 text-primary mb-1">
            <Target size={12} />
            <span className="text-xs font-semibold">YOUR SECRET MISSION</span>
          </div>
          <p className="text-xs text-foreground/80">{myMission}</p>
        </div>
      )}

      {/* Your Cards - only visible when it's your turn */}
      {isMyTurn && myPlayer && myPlayer.cards && myPlayer.cards.length > 0 && (
        <div className="px-4 py-2 border-b border-border bg-muted/30">
          <div className="flex items-center gap-1.5 text-amber-500 mb-2">
            <Coins size={12} />
            <span className="text-xs font-semibold">YOUR CARDS ({myPlayer.cards.length})</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { type: 'Infantry', color: 'hsl(0, 84%, 60%)' },
              { type: 'Cavalry', color: 'hsl(48, 96%, 53%)' },
              { type: 'Artillery', color: 'hsl(217, 91%, 60%)' },
              { type: 'Wild', color: 'hsl(270, 67%, 60%)' },
            ].map(card => {
              const count = (myPlayer.cards || []).filter((c) => c.type === card.type).length;
              return count > 0 ? (
                <div key={card.type} className="flex flex-col items-center bg-secondary rounded px-1.5 py-1">
                  <span className="font-mono-tabular text-sm font-bold text-foreground">{count}</span>
                  <span className="text-xs text-muted-foreground text-center leading-tight">{card.type}</span>
                </div>
              ) : null;
            })}
          </div>
          {myPlayer.cards.length >= 3 && (
            <div className="mt-1.5 p-1.5 bg-primary/20 rounded text-xs text-primary text-center font-medium">
              You can trade 3+ cards!
            </div>
          )}
        </div>
      )}

      {/* Phase actions - only shown when it's my turn */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {!isMyTurn && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Clock size={24} className="mb-2 opacity-50" />
            <span className="text-sm">Read-only mode</span>
            <span className="text-xs mt-1">Actions disabled until your turn</span>
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

      {/* Game Log / History */}
      <div className="border-t border-border p-3 max-h-48 overflow-y-auto">
        <div className="flex items-center gap-1.5 mb-2">
          <History size={12} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground font-semibold">HISTORY</span>
        </div>
        <div className="space-y-1">
          {log.slice(0, 50).map((entry, i) => (
            <p key={i} className="text-sm text-foreground/70 leading-snug">
              <span className="text-muted-foreground text-xs">
                {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {' '}{entry.message}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
