import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../game/store';
import { PLAYER_NAMES } from '../game/types';
import { Bot, User, Target, Crown } from 'lucide-react';

const PLAYER_DOTS = [
  'bg-player-1', 'bg-player-2', 'bg-player-3', 'bg-player-4', 'bg-player-5', 'bg-player-6',
];

export default function GameSetup() {
  const initGame = useGameStore(s => s.initGame);
  const [humanCount, setHumanCount] = useState(2);
  const [useMissions, setUseMissions] = useState(true);
  return (
    <div className="h-screen bg-background flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground tracking-tight">RISK</h1>
          <p className="text-muted-foreground text-sm">
            The world is at a standstill. It is your move.
          </p>
        </div>

        {/* Player config */}
        <div className="bg-surface rounded-xl p-5 space-y-4 shadow-elevated">
          <div className="flex items-center gap-2 text-foreground">
            <User size={16} />
            <span className="text-sm font-semibold">Human Players</span>
          </div>

          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <button
                key={n}
                onClick={() => setHumanCount(n)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  humanCount === n
                    ? 'bg-primary text-primary-foreground shadow-glow'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          {/* Player roster */}
          <div className="space-y-1.5">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-muted/50">
                <div className={`w-2.5 h-2.5 rounded-full ${PLAYER_DOTS[i]}`} />
                <span className="text-sm text-foreground flex-1">{PLAYER_NAMES[i]}</span>
                {i < humanCount ? (
                  <span className="flex items-center gap-1 text-xs text-primary">
                    <User size={12} /> Human
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Bot size={12} /> AI
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Mission cards toggle */}
        <div className="bg-surface rounded-xl p-5 space-y-3 shadow-elevated">
          <div className="flex items-center gap-2 text-foreground">
            <Target size={16} />
            <span className="text-sm font-semibold">Win Condition</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setUseMissions(false)}
              className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
                !useMissions
                  ? 'bg-primary text-primary-foreground shadow-glow'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <Crown size={16} />
                <span>World Domination</span>
              </div>
            </button>
            <button
              onClick={() => setUseMissions(true)}
              className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
                useMissions
                  ? 'bg-primary text-primary-foreground shadow-glow'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <Target size={16} />
                <span>Secret Missions</span>
              </div>
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            {useMissions
              ? 'Each player receives a secret objective card. First to complete their mission wins.'
              : 'Classic mode — conquer all 42 territories to win.'}
          </p>
        </div>

        {/* Start button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => initGame(humanCount, useMissions)}
          className="w-full px-8 py-3.5 bg-primary text-primary-foreground rounded-xl text-base font-bold hover:opacity-90 transition-opacity shadow-glow"
        >
          Deploy Forces
        </motion.button>

        <p className="text-xs text-muted-foreground text-center">
          {humanCount} human{humanCount !== 1 ? 's' : ''} · {6 - humanCount} AI · 42 territories · Classic 1993 rules
        </p>
      </motion.div>
    </div>
  );
}
