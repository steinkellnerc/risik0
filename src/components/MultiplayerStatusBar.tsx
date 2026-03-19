import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMultiplayerStore } from '../game/multiplayerStore';
import { Clock, Home } from 'lucide-react';

const PLAYER_BG = [
  'bg-player-1', 'bg-player-2', 'bg-player-3', 'bg-player-4', 'bg-player-5', 'bg-player-6',
];

export default function MultiplayerStatusBar() {
  const {
    currentPlayerIndex, phase, turnNumber, players, territories,
    reinforcementsLeft, winnerId, isMyTurn, mySlotIndex, disconnect,
  } = useMultiplayerStore();
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
    const winner = players.find(p => p.userId === winnerId);
    return (
      <div className="h-12 bg-surface flex items-center justify-between px-4 shadow-elevated">
        <span className="text-lg font-semibold text-foreground">
          {winner?.displayName || 'Unknown'} wins the game!
        </span>
        <button
          onClick={handleLeave}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-secondary rounded-lg transition-colors"
        >
          <Home size={13} /> Back to Lobby
        </button>
      </div>
    );
  }

  const currentPlayer = players.find(p => p.slotIndex === currentPlayerIndex);

  return (
    <div className="h-12 bg-surface flex items-center px-4 gap-3 shadow-elevated overflow-x-auto">
      {/* Home / leave button */}
      {confirmLeave ? (
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">Leave game?</span>
          <button onClick={handleLeave} className="px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded-md hover:opacity-90">
            Leave
          </button>
          <button onClick={() => setConfirmLeave(false)} className="px-2 py-1 text-xs bg-secondary text-muted-foreground rounded-md hover:text-foreground">
            Stay
          </button>
        </div>
      ) : (
        <button
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
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/20 shrink-0">
          <span className="text-xs text-primary font-semibold">YOUR TURN</span>
        </div>
      )}

      <div className="flex-1" />

      {/* Player indicators */}
      {players.map((p) => (
        <div key={p.slotIndex} className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all duration-150 ${
          p.slotIndex === currentPlayerIndex ? 'bg-secondary shadow-surface' : ''
        } ${p.eliminated ? 'opacity-30' : ''} ${p.slotIndex === mySlotIndex ? 'ring-1 ring-primary/30' : ''}`}>
          <div className={`w-2.5 h-2.5 rounded-full ${PLAYER_BG[p.slotIndex]}`} />
          <span className="text-xs text-muted-foreground hidden lg:inline">
            {p.isAi ? 'AI ' : ''}{p.displayName.split(' ')[0]}
          </span>
          <span className="font-mono-tabular text-xs text-foreground">{playerTerritories(p.slotIndex)}</span>
          <span className="text-muted-foreground text-xs">/</span>
          <span className="font-mono-tabular text-xs text-foreground">{playerArmies(p.slotIndex)}</span>
        </div>
      ))}
    </div>
  );
}
