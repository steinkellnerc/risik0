import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { createGame, listOpenGames, listMyActiveGames, joinGame, cancelGame } from '../lib/multiplayerSync';
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
  const [activeGames, setActiveGames] = useState<Array<{ id: string; playerCount: number; useMissions: boolean; turnNumber: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [useMissions, setUseMissions] = useState(true);
  const [error, setError] = useState('');

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Player';

  const refreshGames = async () => {
    setLoading(true);
    try {
      const [open, active] = await Promise.all([
        listOpenGames(user?.id),
        user?.id ? listMyActiveGames(user.id) : Promise.resolve([]),
      ]);
      setGames(open);
      setActiveGames(active);
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
    setGames(prev => prev.filter(g => g.id !== gameId));
    try {
      await cancelGame(gameId);
    } catch (err) {
      console.error('Delete failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete game');
      await refreshGames(); // restore list if delete failed
    }
  };

  const myGames = games.filter(g => g.hostUserId === user?.id);
  const otherGames = games.filter(g => g.hostUserId !== user?.id);

  const ModeTag = ({ useMissions: m }: { useMissions: boolean }) => (
    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium ${m ? 'bg-purple-500/20 text-purple-400' : 'bg-amber-500/20 text-amber-400'}`}>
      {m ? <><Target size={10} />Missions</> : <><Crown size={10} />Domination</>}
    </span>
  );

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">

      {/* Fixed top — header + create game */}
      <div className="flex-none border-b border-border bg-background px-4 pt-5 pb-4">
        <div className="max-w-lg mx-auto space-y-4">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">RISK</h1>
                <p className="text-muted-foreground text-sm">Welcome, {displayName}</p>
              </div>
              <button onClick={signOut} className="flex items-center gap-1 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-secondary rounded-lg transition-colors">
                <LogOut size={12} /> Sign Out
              </button>
            </div>

            {/* Create game */}
            <div className="bg-surface rounded-xl p-4 space-y-3 shadow-elevated">
              <div className="flex items-center gap-2 text-foreground">
                <Plus size={15} />
                <span className="text-sm font-semibold">Create New Game</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setUseMissions(false)} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${!useMissions ? 'bg-primary text-primary-foreground shadow-glow' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                  <Crown size={13} className="inline mr-1" /> World Domination
                </button>
                <button onClick={() => setUseMissions(true)} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${useMissions ? 'bg-primary text-primary-foreground shadow-glow' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                  <Target size={13} className="inline mr-1" /> Secret Missions
                </button>
              </div>
              <button onClick={handleCreateGame} disabled={creating} className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:opacity-90 transition-opacity shadow-glow disabled:opacity-50">
                {creating ? 'Creating...' : 'Create Game'}
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scrollable games list */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

          {/* My games */}
          {myGames.length > 0 && (
            <div className="bg-surface rounded-xl p-4 space-y-2 shadow-elevated">
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Crown size={14} className="text-primary" /> My Games
              </span>
              {myGames.map(game => (
                <div key={game.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-foreground font-medium">{game.playerCount} player{game.playerCount !== 1 ? 's' : ''} waiting</span>
                      <ModeTag useMissions={game.useMissions} />
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(game.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleDeleteGame(game.id)} className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10 transition-colors" title="Delete">
                      <Trash2 size={13} />
                    </button>
                    <button onClick={() => handleJoinGame(game.id)} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-semibold hover:opacity-90 transition-opacity">
                      Open
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Active / in-progress games */}
          {activeGames.length > 0 && (
            <div className="bg-surface rounded-xl p-4 space-y-2 shadow-elevated">
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                <RefreshCw size={14} className="text-green-400" /> In Progress
              </span>
              {activeGames.map(game => (
                <div key={game.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-foreground font-medium">Round {Math.floor((game.turnNumber - 1) / 6) + 1}</span>
                      <ModeTag useMissions={game.useMissions} />
                      <span className="text-xs text-muted-foreground">{game.playerCount} players</span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/game/${game.id}`)}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-md text-xs font-semibold hover:opacity-90 transition-opacity"
                  >
                    Resume
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Other games */}
          <div className="bg-surface rounded-xl p-4 space-y-2 shadow-elevated">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users size={14} /> Join a Game
              </span>
              <button onClick={refreshGames} disabled={loading} className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary transition-colors">
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
            {otherGames.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">No open games from other players.</p>
            ) : (
              otherGames.map(game => (
                <div key={game.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-foreground font-medium">{game.playerCount} waiting</span>
                    <ModeTag useMissions={game.useMissions} />
                  </div>
                  <button onClick={() => handleJoinGame(game.id)} className="px-3 py-1.5 bg-secondary text-foreground rounded-md text-xs font-semibold hover:bg-secondary/80 transition-colors">
                    Join
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Local game */}
          <button onClick={() => navigate('/local')} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-border text-muted-foreground rounded-xl text-sm hover:bg-secondary transition-colors">
            <Gamepad2 size={16} /> Play Local (Single Device)
          </button>

          {error && (
            <div className="text-destructive text-sm text-center bg-destructive/10 rounded-lg px-3 py-2">{error}</div>
          )}
        </div>
      </div>
    </div>
  );
}
