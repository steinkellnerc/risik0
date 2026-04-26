import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useMultiplayerStore } from '../game/multiplayerStore';
import { Clock, Home, Sword, Square, Target } from 'lucide-react';

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
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background/95 backdrop-blur-sm px-4 overflow-y-auto py-8"
      >
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 18 }}
          className="text-7xl"
        >
          🏆
        </motion.div>
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">{winner?.displayName || 'Unknown'} wins!</h1>
          {useMissions && winner?.secretObjective && (
            <p className="text-sm text-primary font-medium">Mission: {winner.secretObjective}</p>
          )}
        </div>
        {useMissions && (
          <div className="w-full max-w-sm bg-surface rounded-xl p-4 space-y-2 shadow-elevated">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">All missions revealed</span>
            {players.map(p => (
              <div key={p.slotIndex} className="flex items-start gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full mt-0.5 shrink-0 ${PLAYER_BG[p.slotIndex]}`} />
                <span className={`font-semibold shrink-0 ${p.userId === winnerId ? 'text-primary' : 'text-muted-foreground'}`}>
                  {p.isAi ? 'AI ' : ''}{p.displayName}:
                </span>
                <span className={p.userId === winnerId ? 'text-primary' : 'text-foreground/80'}>
                  {p.secretObjective ?? '—'}
                </span>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={handleLeave}
          className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity shadow-glow"
        >
          <Home size={14} /> Back to Lobby
        </button>
      </motion.div>
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
