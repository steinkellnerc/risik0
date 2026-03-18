import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useMultiplayerStore } from '../game/multiplayerStore';
import { startGame, joinGame } from '../lib/multiplayerSync';
import { supabase } from '../lib/supabase';
import GameMap from '../components/GameMap';
import MultiplayerActionPanel from '../components/MultiplayerActionPanel';
import MultiplayerStatusBar from '../components/MultiplayerStatusBar';
import { Play, Users, Copy, Check } from 'lucide-react';

export default function MultiplayerGamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const {
    connect, disconnect, status, players, connected, mySlotIndex,
  } = useMultiplayerStore();

  // Connect to game on mount
  useEffect(() => {
    if (!gameId || !user) return;

    // Auto-join if not already in the game
    joinGame(gameId, user.id, user.user_metadata?.display_name || user.email?.split('@')[0] || 'Player')
      .then(() => connect(gameId, user.id))
      .catch(() => {
        // Already joined, just connect
        connect(gameId, user.id);
      });

    return () => disconnect();
  }, [gameId, user]);

  // Subscribe to player changes in lobby
  useEffect(() => {
    if (!gameId || status !== 'LOBBY') return;

    const channel = supabase
      .channel(`lobby:${gameId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}`
      }, () => {
        // Re-fetch player list by reconnecting
        if (user) connect(gameId, user.id);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [gameId, status, user]);

  const handleStartGame = async () => {
    if (!gameId) return;
    const store = useMultiplayerStore.getState();
    await startGame(gameId, store.useMissions);
    if (user) await connect(gameId, user.id);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!connected) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Connecting to game...</div>
      </div>
    );
  }

  // Lobby view
  if (status === 'LOBBY') {
    const humanPlayers = players.filter(p => !p.isAi && p.userId);
    const isHost = mySlotIndex === 0;

    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Game Lobby</h1>
            <p className="text-muted-foreground text-sm">Waiting for players to join...</p>
          </div>

          {/* Share link */}
          <div className="bg-surface rounded-xl p-4 shadow-elevated">
            <div className="flex items-center gap-2 text-foreground mb-2">
              <Users size={16} />
              <span className="text-sm font-semibold">Invite Players</span>
            </div>
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-secondary text-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy Game Link'}
            </button>
          </div>

          {/* Player list */}
          <div className="bg-surface rounded-xl p-4 space-y-2 shadow-elevated">
            <span className="text-sm font-semibold text-foreground">Players ({humanPlayers.length}/6)</span>
            {humanPlayers.map(p => (
              <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50">
                <div className={`w-2.5 h-2.5 rounded-full bg-${p.color}`} />
                <span className="text-sm text-foreground flex-1">{p.displayName}</span>
                {p.slotIndex === 0 && (
                  <span className="text-xs text-primary">Host</span>
                )}
              </div>
            ))}
            {humanPlayers.length < 6 && (
              <div className="text-xs text-muted-foreground text-center py-2">
                Empty slots will be filled with AI
              </div>
            )}
          </div>

          {/* Start button (host only) */}
          {isHost && (
            <button
              onClick={handleStartGame}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl text-base font-bold hover:opacity-90 transition-opacity shadow-glow"
            >
              <Play size={18} /> Start Game
            </button>
          )}

          {!isHost && (
            <div className="text-center text-muted-foreground text-sm">
              Waiting for host to start the game...
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active game view
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <MultiplayerStatusBar />
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <GameMap multiplayer />
        </div>
        <MultiplayerActionPanel />
      </div>
    </div>
  );
}
