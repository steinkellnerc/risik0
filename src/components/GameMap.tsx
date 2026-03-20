import { motion } from 'framer-motion';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../game/store';
import { useMultiplayerStore } from '../game/multiplayerStore';
import { TERRITORIES, TERRITORY_MAP, CONTINENT_COLORS, CONTINENTS } from '../game/mapData';
import { CLASSIC_COORDS } from '../game/classicCoords';
import { getMapStyle, saveMapStyle } from '../lib/mapStyle';

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
    <g className="opacity-40">
      {lines.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke="hsl(210, 60%, 55%)" strokeWidth="1.2" strokeDasharray={l.wrap ? "3,3" : undefined} />
      ))}
    </g>
  );
}

// Continent boundary lines
function ContinentBorders() {
  const continentLineColors = {
    'north-america': '#FFD700',  // Yellow
    'south-america': '#FF4444',  // Red
    'europe': '#4478FF',         // Blue
    'africa': '#8B6914',         // Brown
    'asia': '#44DD44',           // Green
    'australia': '#AA44FF',      // Purple
  };

  return (
    <g className="opacity-60" strokeWidth="2.5" fill="none">
      {CONTINENTS.map(continent => {
        const cTerritories = TERRITORIES.filter(t => t.continentId === continent.id);
        const xs = cTerritories.map(t => t.cx);
        const ys = cTerritories.map(t => t.cy);
        const minX = Math.min(...xs) - 40;
        const minY = Math.min(...ys) - 35;
        const maxX = Math.max(...xs) + 40;
        const maxY = Math.max(...ys) + 35;
        const radius = 15;

        return (
          <rect
            key={continent.id}
            x={minX}
            y={minY}
            width={maxX - minX}
            height={maxY - minY}
            rx={radius}
            stroke={continentLineColors[continent.id as keyof typeof continentLineColors] || '#888'}
            strokeDasharray="5,5"
          />
        );
      })}
    </g>
  );
}

// Continent bonus table
function ContinentBonusTable() {
  return (
    <g>
      {/* Background - bottom left corner */}
      <rect x="10" y="415" width="132" height="95" rx="4" fill="hsl(222, 40%, 8%)" stroke="hsl(210, 50%, 50%)" strokeWidth="1.2" opacity="0.95" />

      {/* Title */}
      <text x="76" y="430" textAnchor="middle" fill="hsl(210, 80%, 70%)" fontSize="10" fontWeight="bold" fontFamily="IBM Plex Sans, sans-serif">
        Continent Bonuses
      </text>

      {/* Divider line */}
      <line x1="15" y1="435" x2="137" y2="435" stroke="hsl(210, 50%, 40%)" strokeWidth="0.6" />

      {/* Continent rows */}
      <g fontSize="7.5" fontFamily="IBM Plex Mono, monospace" fill="hsl(210, 70%, 65%)">
        <text x="16" y="449">North America</text>
        <text x="137" y="449" textAnchor="end" fill="hsl(48, 96%, 53%)">+5</text>

        <text x="16" y="459">South America</text>
        <text x="137" y="459" textAnchor="end" fill="hsl(0, 84%, 60%)">+2</text>

        <text x="16" y="469">Europe</text>
        <text x="137" y="469" textAnchor="end" fill="hsl(217, 91%, 60%)">+5</text>

        <text x="16" y="479">Africa</text>
        <text x="137" y="479" textAnchor="end" fill="hsl(24, 95%, 53%)">+3</text>

        <text x="16" y="489">Asia</text>
        <text x="137" y="489" textAnchor="end" fill="hsl(142, 71%, 45%)">+7</text>

        <text x="16" y="499">Australia</text>
        <text x="137" y="499" textAnchor="end" fill="hsl(270, 67%, 60%)">+2</text>
      </g>
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
  const classic = false;
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
      if (tState.ownerId === currentPlayerIndex) {
        // Own territory: set as source (keep target if adjacent)
        selectAttackSource(tid);
      } else {
        // Enemy territory: set as target (then player picks source)
        selectAttackTarget(tid);
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

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, moved: false });
  const lastTouchDist = useRef(0);
  const lastTouchMid = useRef({ x: 0, y: 0 });

  const clampTransform = useCallback((x: number, y: number, scale: number) => {
    const s = Math.max(0.6, Math.min(4, scale));
    return { x, y, scale: s };
  }, []);

  // Wheel zoom (toward cursor)
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setTransform(t => {
      const factor = e.deltaY < 0 ? 1.12 : 0.88;
      const newScale = Math.max(0.6, Math.min(4, t.scale * factor));
      const sf = newScale / t.scale;
      return clampTransform(mx - sf * (mx - t.x), my - sf * (my - t.y), newScale);
    });
  }, [clampTransform]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, moved: false };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.moved = true;
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    setTransform(t => clampTransform(t.x + dx, t.y + dy, t.scale));
  };
  const handleMouseUp = () => { dragRef.current.dragging = false; };

  // Touch: pinch zoom + drag
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.hypot(dx, dy);
      lastTouchMid.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    } else if (e.touches.length === 1) {
      dragRef.current = { dragging: true, startX: e.touches[0].clientX, startY: e.touches[0].clientY, moved: false };
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const mid = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
      const rect = containerRef.current!.getBoundingClientRect();
      const mx = mid.x - rect.left;
      const my = mid.y - rect.top;
      const factor = dist / lastTouchDist.current;
      lastTouchDist.current = dist;
      lastTouchMid.current = mid;
      setTransform(t => {
        const newScale = Math.max(0.6, Math.min(4, t.scale * factor));
        const sf = newScale / t.scale;
        return clampTransform(mx - sf * (mx - t.x), my - sf * (my - t.y), newScale);
      });
    } else if (e.touches.length === 1 && dragRef.current.dragging) {
      const dx = e.touches[0].clientX - dragRef.current.startX;
      const dy = e.touches[0].clientY - dragRef.current.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.moved = true;
      dragRef.current.startX = e.touches[0].clientX;
      dragRef.current.startY = e.touches[0].clientY;
      setTransform(t => clampTransform(t.x + dx, t.y + dy, t.scale));
    }
  };
  const handleTouchEnd = () => { dragRef.current.dragging = false; };

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden select-none relative"
      style={{ cursor: dragRef.current.dragging ? 'grabbing' : 'grab' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {classic ? (
        /* ==================== CLASSIC MAP ==================== */
        <svg
          ref={svgRef}
          viewBox="0 0 720 720"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Classic Risiko board image */}
          <image href="/risk-map-classic.jpg" x="0" y="0" width="720" height="720"
            preserveAspectRatio="xMidYMid meet" />

          {/* All map content — panned and zoomed */}
          <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
            {TERRITORIES.map(t => {
              const coords = CLASSIC_COORDS[t.id];
              if (!coords) return null;
              const state = territories[t.id];
              if (!state) return null;
              const { cx, cy } = coords;
              const color = PLAYER_HSL[state.ownerId];
              const dimColor = PLAYER_HSL_DIM[state.ownerId];
              const isSource = attackSource === t.id || fortifySource === t.id;
              const isTarget = attackTarget === t.id;
              const isOwned = state.ownerId === currentPlayerIndex;
              const isPotentialSource = phase === 'ATTACK' && !attackSource && !!attackTarget &&
                isOwned && state.armies >= 2 && t.adjacent.includes(attackTarget);
              const canInteract = isReadOnly ? false :
                phase === 'REINFORCE' ? isOwned :
                phase === 'ATTACK' ? true :
                phase === 'FORTIFY' ? isOwned : false;

              return (
                <g key={t.id} onClick={() => !dragRef.current.moved && handleTerritoryClick(t.id)}
                  className={canInteract ? 'cursor-pointer' : 'cursor-default'}>
                  {isTarget && (
                    <motion.circle cx={cx} cy={cy} r={27}
                      fill="none" stroke="hsl(0, 84%, 60%)"
                      strokeWidth={2} strokeDasharray="4,3"
                      className="animate-pulse-territory" />
                  )}
                  <motion.circle
                    cx={cx} cy={cy} r={isSource ? 20 : isPotentialSource ? 19 : isTarget ? 20 : 16}
                    fill={dimColor}
                    stroke={isSource ? color : isTarget ? 'hsl(0, 84%, 60%)' : isPotentialSource ? 'hsl(48, 96%, 53%)' : color}
                    strokeWidth={isSource || isTarget || isPotentialSource ? 2.5 : 1.2}
                    opacity={0.92}
                    whileHover={canInteract ? { scale: 1.15 } : {}}
                    transition={{ duration: 0.15 }}
                    className={isSource || isTarget || isPotentialSource ? 'animate-pulse-territory' : ''}
                  />
                  <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
                    fill="white" fontSize="15" fontFamily="IBM Plex Mono, monospace" fontWeight="700">
                    {state.armies}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      ) : (
        /* ==================== MODERN MAP ==================== */
        <svg
          ref={svgRef}
          viewBox="0 0 960 520"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Background — outside transform so it always fills */}
          <rect width="960" height="520" fill="hsl(222, 47%, 3%)" />

          {/* Grid lines for tactical feel */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(217, 32%, 10%)" strokeWidth="0.3" />
            </pattern>
          </defs>
          <rect width="960" height="520" fill="url(#grid)" />

          {/* All map content — panned and zoomed */}
          <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
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
            <ContinentBorders />
            <ContinentBonusTable />

            {TERRITORIES.map(t => {
              const state = territories[t.id];
              if (!state) return null;
              const color = PLAYER_HSL[state.ownerId];
              const dimColor = PLAYER_HSL_DIM[state.ownerId];
              const isSource = attackSource === t.id || fortifySource === t.id;
              const isTarget = attackTarget === t.id;
              const isOwned = state.ownerId === currentPlayerIndex;
              const isPotentialSource = phase === 'ATTACK' && !attackSource && !!attackTarget &&
                isOwned && state.armies >= 2 && t.adjacent.includes(attackTarget);
              const canInteract = isReadOnly ? false :
                phase === 'REINFORCE' ? isOwned :
                phase === 'ATTACK' ? true :
                phase === 'FORTIFY' ? isOwned : false;

              return (
                <g key={t.id} onClick={() => !dragRef.current.moved && handleTerritoryClick(t.id)}
                  className={canInteract ? 'cursor-pointer' : 'cursor-default'}>
                  {isTarget && (
                    <motion.circle
                      cx={t.cx} cy={t.cy} r={27}
                      fill="none"
                      stroke="hsl(0, 84%, 60%)"
                      strokeWidth={2}
                      strokeDasharray="4,3"
                      className="animate-pulse-territory"
                    />
                  )}
                  <motion.circle
                    cx={t.cx} cy={t.cy} r={isSource ? 20 : isPotentialSource ? 19 : isTarget ? 20 : 16}
                    fill={dimColor}
                    stroke={isSource ? color : isTarget ? 'hsl(0, 84%, 60%)' : isPotentialSource ? 'hsl(48, 96%, 53%)' : color}
                    strokeWidth={isSource || isTarget || isPotentialSource ? 2.5 : 1.2}
                    opacity={0.9}
                    whileHover={canInteract ? { scale: 1.15 } : {}}
                    transition={{ duration: 0.15 }}
                    className={isSource || isTarget || isPotentialSource ? 'animate-pulse-territory' : ''}
                  />
                  <text x={t.cx} y={t.cy + 1} textAnchor="middle" dominantBaseline="middle"
                    fill="white" fontSize="15" fontFamily="IBM Plex Mono, monospace" fontWeight="700">
                    {state.armies}
                  </text>
                  <text x={t.cx} y={t.cy + 28} textAnchor="middle" dominantBaseline="middle"
                    fill="hsl(210, 20%, 65%)" fontSize="8.5" fontFamily="IBM Plex Sans, sans-serif" fontWeight="500">
                    {t.name}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      )}
    </div>
  );
}
