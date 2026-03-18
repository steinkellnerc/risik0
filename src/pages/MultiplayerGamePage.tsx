import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useMultiplayerStore } from '../game/multiplayerStore';
import { startGame, joinGame } from '../lib/multiplayerSync';
import { supabase } from '../lib/supabase';
import GameMap from '../components/GameMap';
import MultiplayerActionPanel from '../components/MultiplayerActionPanel';
import MultiplayerStatusBar from '../components/MultiplayerStatusBar';
import { Play, Users, Copy, Check, AlertCircle } from 'lucide-react';

export default function MultiplayerGamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [humanSlots, setHumanSlots] = useState(2);
  const [error, setError] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  const {
    connect, disconnect, status, players, connected, mySlotIndex,
  } = useMultiplayerStore();

  // Connect to game on mount
  useEffect(() => {
    if (!gameId || !user) return;

    const connectToGame = async () => {
      let knownSlot: number | null = null;
      try {
        // Try to join - if already joined, it will return existing slot
        knownSlot = await joinGame(gameId, user.id, user.user_metadata?.display_name || user.email?.split('@')[0] || 'Player');
      } catch (err) {
        console.log('Join attempt:', err);
      }

      // Always try to connect regardless of join result
      try {
        await connect(gameId, user.id);
        // If mySlotIndex is still null (e.g. RLS prevented reading player row),
        // fall back to the slot we know from joinGame
        const state = useMultiplayerStore.getState();
        if (state.mySlotIndex === null && knownSlot !== null) {
          useMultiplayerStore.setState({
            mySlotIndex: knownSlot,
            isMyTurn: knownSlot === state.currentPlayerIndex,
          });
        }
      } catch (err) {
        console.error('Connection failed:', err);
        setError('Failed to connect to game');
      }
    };

    connectToGame();

    return () => disconnect();
  }, [gameId, user, connect, disconnect]);

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
    setIsStarting(true);
    setError('');
    try {
      const store = useMultiplayerStore.getState();
      await startGame(gameId, store.useMissions);
      if (user) await connect(gameId, user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
    } finally {
      setIsStarting(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!connected || mySlotIndex === null) {
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-muted-foreground animate-pulse text-center">
          <div className="mb-2">Connecting to game...</div>
          <div className="text-xs text-muted-foreground/60">Game ID: {gameId?.slice(0, 8)}</div>
          {error && (
            <div className="mt-4 text-destructive text-sm bg-destructive/10 rounded p-2">
              {error}
              <button
                onClick={() => {
                  setError('');
                  if (user) connect(gameId!, user.id);
                }}
                className="block mt-2 text-xs underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          )}
        </div>
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
            <p className="text-muted-foreground text-sm">
              {mySlotIndex !== null ? `You are Player ${mySlotIndex + 1}${isHost ? ' (Host)' : ''}` : 'Connecting...'}
            </p>
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
          </div>

          {/* Human slots selector (host only) */}
          {isHost && (
            <div className="bg-surface rounded-xl p-4 space-y-3 shadow-elevated">
              <span className="text-sm font-semibold text-foreground">Human Slots</span>
              <div className="flex gap-2">
                {[2, 3, 4, 5, 6].map(num => (
                  <button
                    key={num}
                    onClick={() => setHumanSlots(num)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      humanSlots === num
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">
                {6 - humanSlots} slot{6 - humanSlots !== 1 ? 's' : ''} will be AI
              </div>
            </div>
          )}

          {/* Start button (host only) */}
          {isHost ? (
            <>
              <button
                onClick={handleStartGame}
                disabled={isStarting || humanPlayers.length < 1}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl text-base font-bold hover:opacity-90 transition-opacity shadow-glow disabled:opacity-50"
              >
                <Play size={18} /> {isStarting ? 'Starting...' : 'Start Game'}
              </button>
              {humanPlayers.length < 1 && (
                <div className="text-xs text-muted-foreground text-center">
                  At least 1 human player needed to start
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-muted-foreground text-sm">
              Waiting for host to start the game...
            </div>
          )}

          {error && (
            <div className="flex gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
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
