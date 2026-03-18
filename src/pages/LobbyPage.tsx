import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { createGame, listOpenGames, joinGame, cancelGame } from '../lib/multiplayerSync';
import { LogOut, Plus, Users, RefreshCw, Gamepad2, Target, Crown, Trash2 } from 'lucide-react';

export default function LobbyPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState<Array<{ id: string; created_at: string; status: string; playerCount: number; hostUserId: string | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [useMissions, setUseMissions] = useState(true);
  const [error, setError] = useState('');

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Player';

  const refreshGames = async () => {
    setLoading(true);
    try {
      const result = await listOpenGames();
      setGames(result);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshGames();
    const interval = setInterval(refreshGames, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateGame = async () => {
    if (!user) return;
    setCreating(true);
    setError('');
    try {
      const gameId = await createGame(user.id, displayName, useMissions);
      navigate(`/game/${gameId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinGame = async (gameId: string) => {
    if (!user) return;
    setError('');
    try {
      await joinGame(gameId, user.id, displayName);
      navigate(`/game/${gameId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game');
    }
  };

  const handleCancelGame = async (gameId: string) => {
    try {
      await cancelGame(gameId);
      await refreshGames();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel game');
    }
  };

  const handleLocalGame = () => {
    navigate('/local');
  };

  return (
    <div className="h-screen bg-background flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">RISK</h1>
            <p className="text-muted-foreground text-sm">Welcome, {displayName}</p>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-secondary rounded-lg transition-colors"
          >
            <LogOut size={12} /> Sign Out
          </button>
        </div>

        {/* Create game */}
        <div className="bg-surface rounded-xl p-5 space-y-4 shadow-elevated">
          <div className="flex items-center gap-2 text-foreground">
            <Plus size={16} />
            <span className="text-sm font-semibold">Create New Game</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setUseMissions(false)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all ${
                !useMissions
                  ? 'bg-primary text-primary-foreground shadow-glow'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <Crown size={14} className="inline mr-1" /> World Domination
            </button>
            <button
              onClick={() => setUseMissions(true)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all ${
                useMissions
                  ? 'bg-primary text-primary-foreground shadow-glow'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <Target size={14} className="inline mr-1" /> Secret Missions
            </button>
          </div>

          <button
            onClick={handleCreateGame}
            disabled={creating}
            className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:opacity-90 transition-opacity shadow-glow disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Game'}
          </button>
        </div>

        {/* Open games */}
        <div className="bg-surface rounded-xl p-5 space-y-3 shadow-elevated">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-foreground">
              <Users size={16} />
              <span className="text-sm font-semibold">Open Games</span>
            </div>
            <button
              onClick={refreshGames}
              disabled={loading}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {games.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No open games. Create one!
            </p>
          ) : (
            <div className="space-y-2">
              {games.map(game => (
                <div key={game.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50">
                  <div>
                    <span className="text-xs text-foreground font-medium">
                      Game {game.id.slice(0, 8)}...
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {game.playerCount}/6 players
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {game.hostUserId === user?.id && (
                      <button
                        onClick={() => handleCancelGame(game.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10 transition-colors"
                        title="Cancel game"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => handleJoinGame(game.id)}
                      className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-xs font-semibold hover:opacity-90 transition-opacity"
                    >
                      {game.hostUserId === user?.id ? 'Resume' : 'Join'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Local game option */}
        <button
          onClick={handleLocalGame}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-border text-muted-foreground rounded-xl text-sm hover:bg-secondary transition-colors"
        >
          <Gamepad2 size={16} /> Play Local (Single Device)
        </button>

        {error && (
          <div className="text-destructive text-sm text-center bg-destructive/10 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </motion.div>
    </div>
  );
}
