import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../lib/auth';
import { LogIn, UserPlus, User } from 'lucide-react';

export default function LoginPage() {
  const { signIn, signUp, signInAsGuest } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [guestName, setGuestName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) setError(error.message);
      } else {
        if (!displayName.trim()) {
          setError('Display name is required');
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, displayName);
        if (error) setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    if (!guestName.trim()) {
      setError('Enter a name to play as guest');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { error } = await signInAsGuest(guestName);
      if (error) setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6"
      >
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground tracking-tight">RISK</h1>
          <p className="text-muted-foreground text-sm">
            Sign in to conquer the world
          </p>
        </div>

        {/* Email auth */}
        <div className="bg-surface rounded-xl p-5 space-y-4 shadow-elevated">
          <div className="flex gap-2">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === 'login'
                  ? 'bg-primary text-primary-foreground shadow-glow'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <LogIn size={14} className="inline mr-1" /> Sign In
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === 'register'
                  ? 'bg-primary text-primary-foreground shadow-glow'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserPlus size={14} className="inline mr-1" /> Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <input
                type="text"
                placeholder="Display Name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-muted text-foreground text-sm placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-muted text-foreground text-sm placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-muted text-foreground text-sm placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              required
              minLength={6}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Guest sign in */}
        <div className="bg-surface rounded-xl p-5 space-y-3 shadow-elevated">
          <div className="flex items-center gap-2 text-foreground">
            <User size={16} />
            <span className="text-sm font-semibold">Play as Guest</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Your name"
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-muted text-foreground text-sm placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={handleGuestSignIn}
              disabled={loading}
              className="px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Go
            </button>
          </div>
        </div>

        {error && (
          <div className="text-destructive text-sm text-center bg-destructive/10 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </motion.div>
    </div>
  );
}
