import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../game/store';
import { PLAYER_NAMES } from '../game/types';
import { TERRITORY_MAP } from '../game/mapData';
import { Swords, Shield, Move, ChevronRight, Dices, Target } from 'lucide-react';

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

export default function ActionPanel() {
  const {
    phase, currentPlayerIndex, reinforcementsLeft, attackSource, attackTarget,
    fortifySource, fortifyTarget, lastDiceRoll, territories, players, awaitingMoveIn,
    capturedTerritory, endPhase, executeAttack, executeFortify, moveArmiesAfterCapture,
    tradeInCards, log, missions, useMissions,
  } = useGameStore();

  const [moveCount, setMoveCount] = useState(1);
  const [fortifyCount, setFortifyCount] = useState(1);

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
    <div className="w-80 bg-surface h-full flex flex-col shadow-elevated">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full bg-player-${currentPlayerIndex + 1}`} />
          <span className="text-base font-semibold text-foreground">
            {player?.isAI ? '🤖 ' : ''}{pName}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {phase === 'REINFORCE' && `Place ${reinforcementsLeft} reinforcements on your territories.`}
          {phase === 'ATTACK' && 'Select a territory to attack from, then a target.'}
          {phase === 'FORTIFY' && 'Move armies between two adjacent territories, or skip.'}
        </p>
      </div>

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

            {/* Card trade-in */}
            {player?.cards.length >= 3 && (
              <div className="bg-secondary rounded-lg p-3 space-y-2">
                <span className="text-xs text-muted-foreground">You have {player.cards.length} cards</span>
                <button onClick={() => {
                  const ids = player.cards.slice(0, 3).map(c => c.id);
                  tradeInCards(ids);
                }} className="w-full px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:opacity-90 transition-opacity">
                  Trade In Cards
                </button>
              </div>
            )}

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
      <div className="border-t border-border p-3 max-h-48 overflow-y-auto">
        <span className="text-sm text-muted-foreground font-semibold mb-2 block">COMMAND LOG</span>
        <div className="space-y-1">
          {log.slice(0, 20).map((entry, i) => (
            <p key={i} className="text-sm text-foreground/70 leading-snug">{entry.message}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
