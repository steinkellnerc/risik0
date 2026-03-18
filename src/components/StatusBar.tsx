import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../game/store';
import { PLAYER_NAMES } from '../game/types';

const PLAYER_BG = [
  'bg-player-1', 'bg-player-2', 'bg-player-3', 'bg-player-4', 'bg-player-5', 'bg-player-6',
];

export default function StatusBar() {
  const navigate = useNavigate();
  const { currentPlayerIndex, phase, turn, players, territories, reinforcementsLeft, winner, useMissions, initGame } = useGameStore();

  const playerTerritories = (idx: number) =>
    Object.values(territories).filter(t => t.ownerId === idx).length;
  const playerArmies = (idx: number) =>
    Object.values(territories).filter(t => t.ownerId === idx).reduce((s, t) => s + t.armies, 0);

  if (winner !== null) {
    return (
      <div className="h-12 bg-surface flex items-center justify-center gap-6 shadow-elevated px-4">
        <span className="text-lg font-semibold text-foreground">
          🏆 {PLAYER_NAMES[winner]} wins the game!
        </span>
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
    );
  }

  return (
    <div className="h-12 bg-surface flex items-center px-4 gap-4 shadow-elevated overflow-x-auto">
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
          <span className="font-mono-tabular text-xs text-foreground" title="territories">{playerTerritories(i)}</span>
          <span className="text-muted-foreground text-xs">⊡</span>
          <span className="font-mono-tabular text-xs text-foreground" title="armies">{playerArmies(i)}</span>
          <span className="text-muted-foreground text-xs">⚔</span>
          {p.cards.length > 0 && (
            <span className="font-mono-tabular text-xs text-muted-foreground">🃏{p.cards.length}</span>
          )}
        </div>
      ))}
    </div>
  );
}
