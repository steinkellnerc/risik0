import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { createGame, listOpenGames, joinGame, cancelGame } from '../lib/multiplayerSync';
import { LogOut, Plus, Users, RefreshCw, Gamepad2, Target, Crown, Trash2 } from 'lucide-react';

type GameEntry = {
  id: string;
  created_at: string;
  status: string;
  playerCount: number;
  hostUserId: string | null;
  useMissions: boolean;
};

export default function LobbyPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState<GameEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [useMissions, setUseMissions] = useState(true);
  const [error, setError] = useState('');

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Player';

  const refreshGames = async () => {
    setLoading(true);
    try {
      const result = await listOpenGames(user?.id);
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

  const handleDeleteGame = async (gameId: string) => {
    try {
      await cancelGame(gameId);
      setGames(prev => prev.filter(g => g.id !== gameId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete game');
    }
  };

  const myGames = games.filter(g => g.hostUserId === user?.id);
  const otherGames = games.filter(g => g.hostUserId !== user?.id);

  return (
    <div className="h-screen bg-background flex flex-col items-center justify-center px-4 overflow-y-auto py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg space-y-5"
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
                !useMissions ? 'bg-primary text-primary-foreground shadow-glow' : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <Crown size={14} className="inline mr-1" /> World Domination
            </button>
            <button
              onClick={() => setUseMissions(true)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all ${
                useMissions ? 'bg-primary text-primary-foreground shadow-glow' : 'bg-secondary text-muted-foreground hover:text-foreground'
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

        {/* My games */}
        {myGames.length > 0 && (
          <div className="bg-surface rounded-xl p-5 space-y-3 shadow-elevated">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Crown size={14} className="text-primary" /> My Games
              </span>
            </div>
            <div className="space-y-2">
              {myGames.map(game => (
                <div key={game.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-foreground font-medium">{game.playerCount} player{game.playerCount !== 1 ? 's' : ''} waiting</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${game.useMissions ? 'bg-purple-500/20 text-purple-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {game.useMissions ? <><Target size={10} className="inline mr-0.5" />Missions</> : <><Crown size={10} className="inline mr-0.5" />Domination</>}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">Created {new Date(game.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDeleteGame(game.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10 transition-colors"
                      title="Delete game"
                    >
                      <Trash2 size={13} />
                    </button>
                    <button
                      onClick={() => handleJoinGame(game.id)}
                      className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-semibold hover:opacity-90 transition-opacity"
                    >
                      Open
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Open games from others */}
        <div className="bg-surface rounded-xl p-5 space-y-3 shadow-elevated">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-foreground">
              <Users size={16} />
              <span className="text-sm font-semibold">Join a Game</span>
            </div>
            <button onClick={refreshGames} disabled={loading} className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary transition-colors">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {otherGames.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No open games from other players.</p>
          ) : (
            <div className="space-y-2">
              {otherGames.map(game => (
                <div key={game.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/50">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-foreground font-medium">{game.playerCount} player{game.playerCount !== 1 ? 's' : ''} waiting</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${game.useMissions ? 'bg-purple-500/20 text-purple-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {game.useMissions ? <><Target size={10} className="inline mr-0.5" />Missions</> : <><Crown size={10} className="inline mr-0.5" />Domination</>}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleJoinGame(game.id)}
                    className="px-3 py-1.5 bg-secondary text-foreground rounded-md text-xs font-semibold hover:bg-secondary/80 transition-colors"
                  >
                    Join
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Local game */}
        <button
          onClick={() => navigate('/local')}
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
