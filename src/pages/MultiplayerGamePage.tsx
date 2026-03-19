import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useMultiplayerStore } from '../game/multiplayerStore';
import { startGame, joinGame, cancelGame } from '../lib/multiplayerSync';
import { supabase } from '../lib/supabase';
import GameMap from '../components/GameMap';
import MultiplayerActionPanel from '../components/MultiplayerActionPanel';
import MultiplayerStatusBar from '../components/MultiplayerStatusBar';
import { Play, Users, Copy, Check, AlertCircle, ArrowLeft, Crown, Target, Trash2 } from 'lucide-react';

const PLAYER_BG = [
  'bg-player-1', 'bg-player-2', 'bg-player-3', 'bg-player-4', 'bg-player-5', 'bg-player-6',
];

export default function MultiplayerGamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [humanSlots, setHumanSlots] = useState(2);
  const [error, setError] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    connect, disconnect, status, players, connected, mySlotIndex,
    myUserId, hostUserId, useMissions,
  } = useMultiplayerStore();

  const isHost = !!myUserId && !!hostUserId && myUserId === hostUserId;

  // Connect to game on mount
  useEffect(() => {
    if (!gameId || !user) return;

    const connectToGame = async () => {
      let knownSlot: number | null = null;
      try {
        knownSlot = await joinGame(gameId, user.id, user.user_metadata?.display_name || user.email?.split('@')[0] || 'Player');
      } catch (err) {
        console.log('Join attempt:', err);
      }

      try {
        await connect(gameId, user.id);
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
        if (user) connect(gameId, user.id);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [gameId, status, user, connect]);

  const handleLeave = () => {
    disconnect();
    navigate('/lobby');
  };

  const handleDeleteGame = async () => {
    if (!gameId) return;
    setIsDeleting(true);
    try {
      disconnect();
      await cancelGame(gameId);
      navigate('/lobby');
    } catch {
      setIsDeleting(false);
      setError('Failed to delete game');
    }
  };

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

  // Connecting screen
  if (!connected || mySlotIndex === null) {
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <button
          onClick={() => navigate('/lobby')}
          className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-secondary rounded-lg transition-colors"
        >
          <ArrowLeft size={13} /> Back to Lobby
        </button>
        <div className="text-muted-foreground animate-pulse text-center">
          <div className="mb-2">Connecting to game...</div>
          <div className="text-xs text-muted-foreground/60">Game ID: {gameId?.slice(0, 8)}</div>
          {error && (
            <div className="mt-4 text-destructive text-sm bg-destructive/10 rounded p-2">
              {error}
              <button
                onClick={() => { setError(''); if (user) connect(gameId!, user.id); }}
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
    const humanPlayers = players.filter(p => !p.isAi);
    const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Player';
    const displayPlayers = humanPlayers.length > 0
      ? humanPlayers
      : [{ id: 'me', slotIndex: mySlotIndex ?? 0, displayName, color: '', userId: user?.id ?? null, isAi: false, armiesToPlace: 0, eliminated: false, secretObjective: null, cards: [] }];

    return (
      <div className="h-screen bg-background flex flex-col overflow-y-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <button
            onClick={handleLeave}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-secondary rounded-lg transition-colors"
          >
            <ArrowLeft size={13} /> {isHost ? 'Back' : 'Leave'}
          </button>

          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${useMissions ? 'bg-purple-500/20 text-purple-400' : 'bg-amber-500/20 text-amber-400'}`}>
              {useMissions ? <><Target size={11} /> Secret Missions</> : <><Crown size={11} /> World Domination</>}
            </span>
          </div>

          {isHost && (
            <button
              onClick={handleDeleteGame}
              disabled={isDeleting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-destructive hover:text-destructive bg-destructive/10 hover:bg-destructive/20 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 size={13} /> Delete Game
            </button>
          )}
          {!isHost && <div className="w-20" />}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
          <div className="w-full max-w-md space-y-5">
            <div className="text-center space-y-1">
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Game Lobby</h1>
              <p className="text-muted-foreground text-sm">
                {isHost ? 'Set up the game and start when ready' : 'Waiting for the host to start…'}
              </p>
            </div>

            {/* Players joined */}
            <div className="bg-surface rounded-xl p-4 space-y-2 shadow-elevated">
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users size={14} /> Players ({displayPlayers.length} / {humanSlots})
              </span>
              {displayPlayers.map(p => (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50">
                  <div className={`w-3 h-3 rounded-full shrink-0 ${PLAYER_BG[p.slotIndex] ?? 'bg-muted'}`} />
                  <span className="text-sm text-foreground flex-1 font-medium">{p.displayName}</span>
                  {p.userId === hostUserId && (
                    <span className="flex items-center gap-1 text-xs text-primary font-semibold">
                      <Crown size={11} /> Host
                    </span>
                  )}
                  {p.userId === myUserId && p.userId !== hostUserId && (
                    <span className="text-xs text-muted-foreground">You</span>
                  )}
                </div>
              ))}
              {displayPlayers.length < humanSlots && (
                <p className="text-xs text-muted-foreground px-1">
                  Waiting for {humanSlots - displayPlayers.length} more player{humanSlots - displayPlayers.length !== 1 ? 's' : ''}…
                </p>
              )}
            </div>

            {/* Share link */}
            <div className="bg-surface rounded-xl p-4 shadow-elevated">
              <p className="text-xs text-muted-foreground mb-2">Share this link to invite players:</p>
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-secondary text-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy Game Link'}
              </button>
            </div>

            {/* Host-only controls */}
            {isHost && (
              <>
                <div className="bg-surface rounded-xl p-4 space-y-3 shadow-elevated">
                  <span className="text-sm font-semibold text-foreground">Human Player Slots</span>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <button
                        key={num}
                        onClick={() => setHumanSlots(num)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                          humanSlots === num ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {6 - humanSlots} slot{6 - humanSlots !== 1 ? 's' : ''} will be filled by AI
                  </p>
                </div>

                <button
                  onClick={handleStartGame}
                  disabled={isStarting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl text-base font-bold hover:opacity-90 transition-opacity shadow-glow disabled:opacity-50"
                >
                  <Play size={18} /> {isStarting ? 'Starting…' : 'Start Game'}
                </button>
              </>
            )}

            {!isHost && (
              <div className="text-center text-muted-foreground text-sm py-2">
                Waiting for host to start the game…
              </div>
            )}

            {error && (
              <div className="flex gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>
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
