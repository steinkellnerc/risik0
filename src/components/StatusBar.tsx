import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../game/store';
import { PLAYER_NAMES } from '../game/types';
import { Home, Square, X, Trophy } from 'lucide-react';

const PLAYER_BG = [
  'bg-player-1', 'bg-player-2', 'bg-player-3', 'bg-player-4', 'bg-player-5', 'bg-player-6',
];

export default function StatusBar() {
  const navigate = useNavigate();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [winScreenOpen, setWinScreenOpen] = useState(true);
  const { currentPlayerIndex, phase, turn, players, territories, reinforcementsLeft, winner, useMissions, missions, initGame } = useGameStore();

  const playerTerritories = (idx: number) =>
    Object.values(territories).filter(t => t.ownerId === idx).length;
  const playerArmies = (idx: number) =>
    Object.values(territories).filter(t => t.ownerId === idx).reduce((s, t) => s + t.armies, 0);

  if (winner !== null) {
    const winnerMission = useMissions ? missions[winner] : null;
    const standings = players
      .map((p, i) => ({ p, i, terr: playerTerritories(i), army: playerArmies(i) }))
      .sort((a, b) => b.terr - a.terr);

    return (
      <>
        {/* Reopen pill — shown when modal is hidden */}
        <AnimatePresence>
          {!winScreenOpen && (
            <motion.button
              type="button"
              onClick={() => setWinScreenOpen(true)}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-glow hover:opacity-90"
            >
              <Trophy size={12} />
              {PLAYER_NAMES[winner]} wins — view results
            </motion.button>
          )}
        </AnimatePresence>

        {/* Dismissible modal */}
        <AnimatePresence>
          {winScreenOpen && (
            <motion.div
              key="win-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-background/55 backdrop-blur-[2px]"
              onClick={() => setWinScreenOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                onClick={e => e.stopPropagation()}
                className="relative w-full max-w-sm max-h-[88vh] overflow-y-auto bg-surface rounded-2xl p-5 space-y-4 shadow-elevated border border-border"
              >
                {/* Close */}
                <button
                  type="button"
                  onClick={() => setWinScreenOpen(false)}
                  aria-label="Hide results"
                  className="absolute top-2.5 right-2.5 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X size={14} />
                </button>

                {/* Winner */}
                <div className="text-center space-y-2 pt-2">
                  <div className="text-5xl">🏆</div>
                  <h1 className="text-2xl font-bold text-foreground">{PLAYER_NAMES[winner]} wins!</h1>
                  {winnerMission && (
                    <p className="text-xs text-primary font-medium">Mission: {winnerMission.description}</p>
                  )}
                </div>

                {/* Final standings */}
                <div className="bg-muted/40 rounded-lg p-3 space-y-1.5">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Final standings</span>
                  {standings.map(({ p, i, terr, army }, rank) => {
                    const isWinner = i === winner;
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs font-mono-tabular">
                        <span className="w-3 text-muted-foreground">{rank + 1}</span>
                        <div className={`w-2 h-2 rounded-full shrink-0 ${PLAYER_BG[i]}`} />
                        <span className={`font-sans flex-1 truncate ${isWinner ? 'text-primary font-semibold' : p.eliminated ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                          {p.isAI ? '🤖 ' : ''}{p.name}
                        </span>
                        <span className="text-foreground">{terr}</span>
                        <Square size={9} className="text-muted-foreground/60" />
                        <span className="text-foreground">{army}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Missions */}
                {useMissions && (
                  <div className="bg-muted/40 rounded-lg p-3 space-y-1.5">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">All missions revealed</span>
                    {players.map((p, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${PLAYER_BG[i]}`} />
                        <span className={`font-semibold shrink-0 ${i === winner ? 'text-primary' : 'text-muted-foreground'}`}>
                          {p.isAI ? '🤖 ' : ''}{p.name}:
                        </span>
                        <span className={i === winner ? 'text-primary' : 'text-foreground/80'}>
                          {missions[i]?.description ?? '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setWinScreenOpen(false)}
                    className="flex-1 px-3 py-2 text-xs font-semibold bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                  >
                    Review map
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="flex-1 px-3 py-2 text-xs font-semibold bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                  >
                    Lobby
                  </button>
                  <button
                    type="button"
                    onClick={() => initGame(players.filter(p => !p.isAI).length, useMissions)}
                    className="flex-1 px-3 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity shadow-glow"
                  >
                    Play Again
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="h-12 bg-surface flex items-center px-4 gap-4 shadow-elevated overflow-x-auto">
      {/* Home button */}
      {confirmLeave ? (
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">Leave game?</span>
          <button onClick={() => navigate('/')} className="px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded-md hover:opacity-90">Leave</button>
          <button onClick={() => setConfirmLeave(false)} className="px-2 py-1 text-xs bg-secondary text-muted-foreground rounded-md hover:text-foreground">Stay</button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmLeave(true)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground bg-secondary rounded-md transition-colors shrink-0"
          title="Return to Home"
        >
          <Home size={13} />
        </button>
      )}

      {/* Turn info */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-muted-foreground text-xs">TURN</span>
        <span className="font-mono-tabular text-foreground font-semibold">{turn}</span>
        <span className="text-muted-foreground text-xs mx-1">|</span>
        <span className="text-xs font-semibold text-primary">{phase}</span>
        {phase === 'REINFORCE' && (
          <span className="font-mono-tabular text-primary text-sm">+{reinforcementsLeft}</span>
        )}
      </div>

      <div className="flex-1" />

      {/* Player indicators */}
      {players.map((p, i) => (
        <div key={i} className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all duration-150 ${
          i === currentPlayerIndex ? 'bg-secondary shadow-surface' : ''
        } ${p.eliminated ? 'opacity-30' : ''}`}>
          <div className={`w-2.5 h-2.5 rounded-full ${PLAYER_BG[i]}`} />
          <span className="text-xs text-muted-foreground hidden lg:inline">
            {p.isAI ? '🤖' : ''}{p.name.split(' ')[0]}
          </span>
          <span className="font-mono-tabular text-xs text-foreground">{playerTerritories(i)}</span>
          <Square size={9} className="text-muted-foreground/60" />
          <span className="font-mono-tabular text-xs text-foreground">{playerArmies(i)}</span>
          <span className={`font-mono-tabular text-xs ${p.cards.length > 0 ? 'text-foreground' : 'text-muted-foreground/40'}`}>🃏{p.cards.length}</span>
        </div>
      ))}
    </div>
  );
}
