import { useGameStore } from '../game/store';
import GameMap from '../components/GameMap';
import ActionPanel from '../components/ActionPanel';
import StatusBar from '../components/StatusBar';
import GameSetup from '../components/GameSetup';

export default function GamePage() {
  const started = useGameStore(s => s.started);

  if (!started) {
    return <GameSetup />;
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <StatusBar />
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        <div className="flex-1 min-h-0 overflow-hidden">
          <GameMap />
        </div>
        <ActionPanel />
      </div>
    </div>
  );
}
