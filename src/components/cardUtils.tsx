import { motion } from 'framer-motion';
import type { RiskCard } from '../game/types';

export const CARD_LABELS: Record<string, string> = {
  Infantry: '⚔ Infantry',
  Cavalry: '🐴 Cavalry',
  Artillery: '💣 Artillery',
  Wild: '★ Wild',
};

export function isValidSet(cards: RiskCard[]): boolean {
  if (cards.length !== 3) return false;
  const types = cards.map(c => c.type);
  const wilds = types.filter(t => t === 'Wild').length;
  const nonWild = types.filter(t => t !== 'Wild');
  if (wilds >= 2) return true;
  if (wilds === 1) return true;
  if (nonWild[0] === nonWild[1] && nonWild[1] === nonWild[2]) return true;
  if (new Set(nonWild).size === 3) return true;
  return false;
}

export function findValidSet(cards: RiskCard[]): RiskCard[] | null {
  for (let i = 0; i < cards.length - 2; i++)
    for (let j = i + 1; j < cards.length - 1; j++)
      for (let k = j + 1; k < cards.length; k++) {
        const combo = [cards[i], cards[j], cards[k]];
        if (isValidSet(combo)) return combo;
      }
  return null;
}

export function DiceDisplay({ rolls, label, color }: { rolls: number[]; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-8">{label}</span>
      <div className="flex gap-1">
        {rolls.map((r, i) => (
          <motion.div key={i}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.08, type: 'spring', stiffness: 400, damping: 15 }}
            className="w-8 h-8 rounded-md flex items-center justify-center font-mono-tabular text-sm font-bold shadow-elevated"
            style={{ backgroundColor: color, color: 'white' }}>
            {r}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
