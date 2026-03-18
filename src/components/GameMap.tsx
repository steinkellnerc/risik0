import { motion } from 'framer-motion';
import { useGameStore } from '../game/store';
import { useMultiplayerStore } from '../game/multiplayerStore';
import { TERRITORIES, TERRITORY_MAP, CONTINENT_COLORS } from '../game/mapData';

// Connection lines between adjacent territories
function ConnectionLines() {
  const drawn = new Set<string>();
  const lines: { x1: number; y1: number; x2: number; y2: number; wrap?: boolean }[] = [];

  for (const t of TERRITORIES) {
    for (const adjId of t.adjacent) {
      const key = [t.id, adjId].sort().join('-');
      if (drawn.has(key)) continue;
      drawn.add(key);
      const adj = TERRITORY_MAP.get(adjId)!;

      // Alaska-Kamchatka wraps
      if ((t.id === 'alaska' && adjId === 'kamchatka') || (t.id === 'kamchatka' && adjId === 'alaska')) {
        lines.push({ x1: 75, y1: 72, x2: 15, y2: 60, wrap: true });
        lines.push({ x1: 860, y1: 60, x2: 960, y2: 60, wrap: true });
      } else {
        lines.push({ x1: t.cx, y1: t.cy, x2: adj.cx, y2: adj.cy });
      }
    }
  }

  return (
    <g className="opacity-20">
      {lines.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke="hsl(210, 40%, 40%)" strokeWidth="0.8" strokeDasharray={l.wrap ? "3,3" : undefined} />
      ))}
    </g>
  );
}

const PLAYER_HSL = [
  'hsl(0, 84%, 60%)', 'hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)',
  'hsl(48, 96%, 53%)', 'hsl(270, 67%, 60%)', 'hsl(24, 95%, 53%)',
];

const PLAYER_HSL_DIM = [
  'hsl(0, 50%, 25%)', 'hsl(217, 50%, 25%)', 'hsl(142, 40%, 20%)',
  'hsl(48, 50%, 22%)', 'hsl(270, 40%, 22%)', 'hsl(24, 50%, 22%)',
];

export default function GameMap({ multiplayer = false }: { multiplayer?: boolean }) {
  // Use the appropriate store based on mode
  const localStore = useGameStore();
  const mpStore = useMultiplayerStore();

  const territories = multiplayer ? mpStore.territories : localStore.territories;
  const phase = multiplayer ? mpStore.phase : localStore.phase;
  const currentPlayerIndex = multiplayer ? mpStore.currentPlayerIndex : localStore.currentPlayerIndex;
  const attackSource = multiplayer ? mpStore.attackSource : localStore.attackSource;
  const attackTarget = multiplayer ? mpStore.attackTarget : localStore.attackTarget;
  const fortifySource = multiplayer ? mpStore.fortifySource : localStore.fortifySource;

  const placeReinforcement = multiplayer ? mpStore.placeReinforcement : localStore.placeReinforcement;
  const selectAttackSource = multiplayer ? mpStore.selectAttackSource : localStore.selectAttackSource;
  const selectAttackTarget = multiplayer ? mpStore.selectAttackTarget : localStore.selectAttackTarget;
  const selectFortifySource = multiplayer ? mpStore.selectFortifySource : localStore.selectFortifySource;
  const selectFortifyTarget = multiplayer ? mpStore.selectFortifyTarget : localStore.selectFortifyTarget;

  // In multiplayer, only allow interaction if it's my turn
  const isReadOnly = multiplayer && !mpStore.isMyTurn;

  const handleTerritoryClick = (tid: string) => {
    if (isReadOnly) return;
    const tState = territories[tid];
    if (!tState) return;

    if (phase === 'REINFORCE') {
      placeReinforcement(tid);
    } else if (phase === 'ATTACK') {
      if (!attackSource) {
        selectAttackSource(tid);
      } else if (!attackTarget) {
        if (tState.ownerId === currentPlayerIndex) {
          selectAttackSource(tid); // reselect
        } else {
          selectAttackTarget(tid);
        }
      } else {
        if (tState.ownerId === currentPlayerIndex) {
          selectAttackSource(tid);
        } else {
          selectAttackTarget(tid);
        }
      }
    } else if (phase === 'FORTIFY') {
      if (!fortifySource) {
        selectFortifySource(tid);
      } else if (!fortifySource || tState.ownerId === currentPlayerIndex) {
        if (tid === fortifySource) return;
        selectFortifyTarget(tid);
      }
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden">
      <svg viewBox="0 0 960 520" className="w-full h-full max-h-[calc(100vh-4rem)]" preserveAspectRatio="xMidYMid meet">
        {/* Background */}
        <rect width="960" height="520" fill="hsl(222, 47%, 3%)" />

        {/* Grid lines for tactical feel */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(217, 32%, 10%)" strokeWidth="0.3" />
          </pattern>
        </defs>
        <rect width="960" height="520" fill="url(#grid)" />

        {/* Continent background regions */}
        {Object.entries(CONTINENT_COLORS).map(([cid, color]) => {
          const cTerritories = TERRITORIES.filter(t => t.continentId === cid);
          const xs = cTerritories.map(t => t.cx);
          const ys = cTerritories.map(t => t.cy);
          const minX = Math.min(...xs) - 35;
          const minY = Math.min(...ys) - 30;
          const maxX = Math.max(...xs) + 35;
          const maxY = Math.max(...ys) + 30;
          return (
            <rect key={cid} x={minX} y={minY} width={maxX - minX} height={maxY - minY}
              rx="8" fill={color} opacity="0.5" />
          );
        })}

        <ConnectionLines />

        {/* Territories */}
        {TERRITORIES.map(t => {
          const state = territories[t.id];
          if (!state) return null;
          const color = PLAYER_HSL[state.ownerId];
          const dimColor = PLAYER_HSL_DIM[state.ownerId];
          const isSource = attackSource === t.id || fortifySource === t.id;
          const isTarget = attackTarget === t.id;
          const isOwned = state.ownerId === currentPlayerIndex;
          const canInteract = isReadOnly ? false :
            phase === 'REINFORCE' ? isOwned :
            phase === 'ATTACK' ? true :
            phase === 'FORTIFY' ? isOwned : false;

          return (
            <g key={t.id} onClick={() => handleTerritoryClick(t.id)}
              className={canInteract ? 'cursor-pointer' : 'cursor-default'}>
              {/* Territory circle */}
              <motion.circle
                cx={t.cx} cy={t.cy} r={isSource ? 20 : 16}
                fill={dimColor}
                stroke={isSource ? color : isTarget ? 'hsl(0, 84%, 60%)' : color}
                strokeWidth={isSource || isTarget ? 2.5 : 1.2}
                opacity={0.9}
                whileHover={canInteract ? { scale: 1.15 } : {}}
                transition={{ duration: 0.15 }}
                className={isSource ? 'animate-pulse-territory' : ''}
              />
              {/* Army count */}
              <text x={t.cx} y={t.cy + 1} textAnchor="middle" dominantBaseline="middle"
                fill="white" fontSize="15" fontFamily="IBM Plex Mono, monospace" fontWeight="700">
                {state.armies}
              </text>
              {/* Territory name */}
              <text x={t.cx} y={t.cy + 28} textAnchor="middle" dominantBaseline="middle"
                fill="hsl(210, 20%, 65%)" fontSize="8.5" fontFamily="IBM Plex Sans, sans-serif" fontWeight="500">
                {t.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
