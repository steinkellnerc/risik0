import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../game/store';
import { PLAYER_NAMES } from '../game/types';
import { Home, Square } from 'lucide-react';

const PLAYER_BG = [
  'bg-player-1', 'bg-player-2', 'bg-player-3', 'bg-player-4', 'bg-player-5', 'bg-player-6',
];

export default function StatusBar() {
  const navigate = useNavigate();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const { currentPlayerIndex, phase, turn, players, territories, reinforcementsLeft, winner, useMissions, missions, initGame } = useGameStore();

  const playerTerritories = (idx: number) =>
    Object.values(territories).filter(t => t.ownerId === idx).length;
  const playerArmies = (idx: number) =>
    Object.values(territories).filter(t => t.ownerId === idx).reduce((s, t) => s + t.armies, 0);

  if (winner !== null) {
    const winnerMission = useMissions ? missions[winner] : null;
    return (
      <div className="bg-surface shadow-elevated px-4 py-5 flex flex-col items-center gap-4">
        <span className="text-2xl font-bold text-foreground">
          🏆 {PLAYER_NAMES[winner]} wins the game!
        </span>
        {winnerMission && (
          <p className="text-sm text-primary font-medium text-center">
            Mission: {winnerMission.description}
          </p>
        )}
        {useMissions && (
          <div className="w-full max-w-lg bg-muted rounded-lg p-3 space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">All missions revealed</span>
            {players.map((p, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full mt-0.5 shrink-0 ${PLAYER_BG[i]}`} />
                <span className={`font-semibold shrink-0 ${i === winner ? 'text-primary' : 'text-muted-foreground'}`}>
                  {p.isAI ? '🤖 ' : ''}{p.name}:
                </span>
                <span className={i === winner ? 'text-primary' : 'text-foreground'}>
                  {missions[i]?.description ?? '—'}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/')}
            className="px-3 py-1.5 text-xs font-semibold bg-secondary text-foreground rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            Return to Lobby
          </button>
          <button
            onClick={() => initGame(players.filter(p => !p.isAI).length, useMissions)}
            className="px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-12 bg-surface flex items-center px-4 gap-4 shadow-elevated overflow-x-auto">
      {/* Home button */}
      {confirmLeave ? (
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">Leave game?</span>
          <button onClick={() => navigate('/')} className="px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded-md hover:opacity-90">Leave</button>
          <button onClick={() => setConfirmLeave(false)} className="px-2 py-1 text-xs bg-secondary text-muted-foreground rounded-md hover:text-foreground">Stay</button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmLeave(true)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground bg-secondary rounded-md transition-colors shrink-0"
          title="Return to Home"
        >
          <Home size={13} />
        </button>
      )}

      {/* Turn info */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-muted-foreground text-xs">TURN</span>
        <span className="font-mono-tabular text-foreground font-semibold">{turn}</span>
        <span className="text-muted-foreground text-xs mx-1">|</span>
        <span className="text-xs font-semibold text-primary">{phase}</span>
        {phase === 'REINFORCE' && (
          <span className="font-mono-tabular text-primary text-sm">+{reinforcementsLeft}</span>
        )}
      </div>

      <div className="flex-1" />

      {/* Player indicators */}
      {players.map((p, i) => (
        <div key={i} className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all duration-150 ${
          i === currentPlayerIndex ? 'bg-secondary shadow-surface' : ''
        } ${p.eliminated ? 'opacity-30' : ''}`}>
          <div className={`w-2.5 h-2.5 rounded-full ${PLAYER_BG[i]}`} />
          <span className="text-xs text-muted-foreground hidden lg:inline">
            {p.isAI ? '🤖' : ''}{p.name.split(' ')[0]}
          </span>
          <span className="font-mono-tabular text-xs text-foreground">{playerTerritories(i)}</span>
          <Square size={9} className="text-muted-foreground/60" />
          <span className="font-mono-tabular text-xs text-foreground">{playerArmies(i)}</span>
          <span className={`font-mono-tabular text-xs ${p.cards.length > 0 ? 'text-foreground' : 'text-muted-foreground/40'}`}>🃏{p.cards.length}</span>
        </div>
      ))}
    </div>
  );
}
