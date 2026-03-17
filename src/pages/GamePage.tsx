import { useGameStore } from '../game/store';
import GameMap from '../components/GameMap';
import ActionPanel from '../components/ActionPanel';
import StatusBar from '../components/StatusBar';

export default function GamePage() {
  const started = useGameStore(s => s.started);
  const initGame = useGameStore(s => s.initGame);

  if (!started) {
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center gap-6">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">RISK</h1>
          <p className="text-muted-foreground text-sm max-w-md">
            The world is at a standstill. It is your move.
          </p>
        </div>
        <button onClick={initGame}
          className="px-8 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-glow">
          Deploy Forces
        </button>
        <p className="text-xs text-muted-foreground">6 players · 42 territories · Classic 1993 rules</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <StatusBar />
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <GameMap />
        </div>
        <ActionPanel />
      </div>
    </div>
  );
}
