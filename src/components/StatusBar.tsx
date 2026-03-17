import { useGameStore } from '../game/store';
import { PLAYER_NAMES } from '../game/types';
import { TERRITORIES, TERRITORY_MAP } from '../game/mapData';

const PLAYER_BG = [
  'bg-player-1', 'bg-player-2', 'bg-player-3', 'bg-player-4', 'bg-player-5', 'bg-player-6',
];

export default function StatusBar() {
  const { currentPlayerIndex, phase, turn, players, territories, reinforcementsLeft, winner } = useGameStore();

  const playerTerritories = (idx: number) =>
    Object.values(territories).filter(t => t.ownerId === idx).length;
  const playerArmies = (idx: number) =>
    Object.values(territories).filter(t => t.ownerId === idx).reduce((s, t) => s + t.armies, 0);

  if (winner !== null) {
    return (
      <div className="h-12 bg-surface flex items-center justify-center shadow-elevated">
        <span className="text-lg font-semibold text-foreground">
          🏆 {PLAYER_NAMES[winner]} wins the game!
        </span>
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
          <span className="font-mono-tabular text-xs text-foreground">{playerTerritories(i)}</span>
          <span className="text-muted-foreground text-xs">/</span>
          <span className="font-mono-tabular text-xs text-foreground">{playerArmies(i)}</span>
          {p.cards.length > 0 && (
            <span className="font-mono-tabular text-xs text-muted-foreground">🃏{p.cards.length}</span>
          )}
        </div>
      ))}
    </div>
  );
}
