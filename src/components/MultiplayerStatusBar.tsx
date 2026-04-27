import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useMultiplayerStore } from '../game/multiplayerStore';
import { Clock, Home, Sword, Square, Target, X, Trophy } from 'lucide-react';

const PLAYER_BG = [
  'bg-player-1', 'bg-player-2', 'bg-player-3', 'bg-player-4', 'bg-player-5', 'bg-player-6',
];

export default function MultiplayerStatusBar() {
  const {
    currentPlayerIndex, phase, turnNumber, players, territories,
    reinforcementsLeft, winnerId, isMyTurn, mySlotIndex, disconnect, useMissions,
  } = useMultiplayerStore();

  const myMission = useMissions
    ? players.find(p => p.slotIndex === mySlotIndex)?.secretObjective ?? null
    : null;
  const navigate = useNavigate();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [winScreenOpen, setWinScreenOpen] = useState(true);

  const playerTerritories = (idx: number) =>
    Object.values(territories).filter(t => t.ownerId === idx).length;
  const playerArmies = (idx: number) =>
    Object.values(territories).filter(t => t.ownerId === idx).reduce((s, t) => s + t.armies, 0);

  const round = Math.floor((turnNumber - 1) / 6) + 1;

  const handleLeave = () => {
    disconnect();
    navigate('/lobby');
  };

  if (winnerId) {
    const winner = players.find(p => p.userId === winnerId || p.id === winnerId);
    const standings = [...players].sort((a, b) => playerTerritories(b.slotIndex) - playerTerritories(a.slotIndex));

    return (
      <>
        {/* Reopen pill — shown when modal is hidden */}
        <AnimatePresence>
          {!winScreenOpen && (
            <motion.button
              type="button"
              onClick={() => setWinScreenOpen(true)}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-glow hover:opacity-90"
            >
              <Trophy size={12} />
              {winner?.displayName || 'Unknown'} wins — view results
            </motion.button>
          )}
        </AnimatePresence>

        {/* Dismissible modal */}
        <AnimatePresence>
          {winScreenOpen && (
            <motion.div
              key="win-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-background/55 backdrop-blur-[2px]"
              onClick={() => setWinScreenOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                onClick={e => e.stopPropagation()}
                className="relative w-full max-w-sm max-h-[88vh] overflow-y-auto bg-surface rounded-2xl p-5 space-y-4 shadow-elevated border border-border"
              >
                {/* Close */}
                <button
                  type="button"
                  onClick={() => setWinScreenOpen(false)}
                  aria-label="Hide results"
                  className="absolute top-2.5 right-2.5 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X size={14} />
                </button>

                {/* Winner */}
                <div className="text-center space-y-2 pt-2">
                  <div className="text-5xl">🏆</div>
                  <h1 className="text-2xl font-bold text-foreground">{winner?.displayName || 'Unknown'} wins!</h1>
                  {useMissions && winner?.secretObjective && (
                    <p className="text-xs text-primary font-medium">Mission: {winner.secretObjective}</p>
                  )}
                </div>

                {/* Final standings */}
                <div className="bg-muted/40 rounded-lg p-3 space-y-1.5">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Final standings</span>
                  {standings.map((p, idx) => {
                    const isWinner = p.userId === winnerId || p.id === winnerId;
                    return (
                      <div key={p.slotIndex} className="flex items-center gap-2 text-xs font-mono-tabular">
                        <span className="w-3 text-muted-foreground">{idx + 1}</span>
                        <div className={`w-2 h-2 rounded-full shrink-0 ${PLAYER_BG[p.slotIndex]}`} />
                        <span className={`font-sans flex-1 truncate ${isWinner ? 'text-primary font-semibold' : p.eliminated ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                          {p.isAi ? 'AI ' : ''}{p.displayName}
                        </span>
                        <span className="text-foreground">{playerTerritories(p.slotIndex)}</span>
                        <Square size={9} className="text-muted-foreground/60" />
                        <span className="text-foreground">{playerArmies(p.slotIndex)}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Missions */}
                {useMissions && (
                  <div className="bg-muted/40 rounded-lg p-3 space-y-1.5">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">All missions revealed</span>
                    {players.map(p => {
                      const isWinner = p.userId === winnerId || p.id === winnerId;
                      return (
                        <div key={p.slotIndex} className="flex items-start gap-2 text-xs">
                          <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${PLAYER_BG[p.slotIndex]}`} />
                          <span className={`font-semibold shrink-0 ${isWinner ? 'text-primary' : 'text-muted-foreground'}`}>
                            {p.isAi ? 'AI ' : ''}{p.displayName}:
                          </span>
                          <span className={isWinner ? 'text-primary' : 'text-foreground/80'}>
                            {p.secretObjective ?? '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setWinScreenOpen(false)}
                    className="flex-1 px-3 py-2 text-xs font-semibold bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                  >
                    Review map
                  </button>
                  <button
                    type="button"
                    onClick={handleLeave}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity shadow-glow"
                  >
                    <Home size={12} /> Back to Lobby
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  const currentPlayer = players.find(p => p.slotIndex === currentPlayerIndex);

  return (
    <div className="bg-surface shadow-elevated flex flex-col">
    <div className="h-12 flex items-center px-4 gap-3 overflow-x-auto">
      {/* Home / leave button */}
      {confirmLeave ? (
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">Leave game?</span>
          <button type="button" onClick={handleLeave} className="px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded-md hover:opacity-90">
            Leave
          </button>
          <button type="button" onClick={() => setConfirmLeave(false)} className="px-2 py-1 text-xs bg-secondary text-muted-foreground rounded-md hover:text-foreground">
            Stay
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmLeave(true)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground bg-secondary rounded-md transition-colors shrink-0"
          title="Back to Lobby"
        >
          <Home size={13} />
        </button>
      )}

      {/* Turn info */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-muted-foreground text-xs">ROUND</span>
        <span className="font-mono-tabular text-foreground font-semibold">{round}</span>
        <span className="text-muted-foreground text-xs mx-1">|</span>
        <span className="text-xs font-semibold text-primary">{phase}</span>
        {phase === 'REINFORCE' && isMyTurn && (
          <span className="font-mono-tabular text-primary text-sm">+{reinforcementsLeft}</span>
        )}
      </div>

      {/* Turn indicator */}
      {!isMyTurn && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 shrink-0">
          <Clock size={12} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Waiting for {currentPlayer?.isAi ? 'AI ' : ''}{currentPlayer?.displayName}...
          </span>
        </div>
      )}
      {isMyTurn && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary text-primary-foreground shadow-glow shrink-0">
          <span className="text-xs font-bold tracking-wide">YOUR TURN</span>
        </div>
      )}

      <div className="flex-1" />

      {/* Player indicators */}
      {players.map((p) => (
        <div key={p.slotIndex} className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all duration-150 shrink-0 ${
          p.slotIndex === currentPlayerIndex ? 'bg-secondary shadow-surface' : ''
        } ${p.eliminated ? 'opacity-30' : ''} ${p.slotIndex === mySlotIndex ? 'ring-1 ring-primary/30' : ''}`}>
          <div className={`w-2.5 h-2.5 rounded-full ${PLAYER_BG[p.slotIndex]} shrink-0`} />
          <span className="text-xs text-muted-foreground hidden lg:inline">
            {p.isAi ? 'AI ' : ''}{p.displayName.split(' ')[0]}
          </span>
          <span className="font-mono-tabular text-xs text-foreground">{playerTerritories(p.slotIndex)}</span>
          <Square size={9} className="text-muted-foreground/60" />
          <span className="font-mono-tabular text-xs text-foreground">{playerArmies(p.slotIndex)}</span>
          <span className={`font-mono-tabular text-xs ${p.cards.length > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>🃏{p.cards.length}</span>
        </div>
      ))}
    </div>

    {/* Secret mission — always visible on mobile below the status row */}
    {myMission && (
      <div className="md:hidden px-3 py-2 border-t-2 border-primary/30 bg-primary/10 flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <Target size={12} className="text-primary shrink-0" />
          <span className="text-xs font-bold text-primary uppercase tracking-wide">Your Mission</span>
        </div>
        <p className="text-xs text-foreground leading-snug">{myMission}</p>
      </div>
    )}
    </div>
  );
}
