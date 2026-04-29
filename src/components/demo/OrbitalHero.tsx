"use client";

import type { GroundStation, RerouteEvent, Satellite } from "@/lib/demo/types";

type Point = { x: number; y: number };

type Props = {
  satellites: Satellite[];
  groundStations: GroundStation[];
  activeSatelliteId: string;
  onSelectSatellite: (id: string) => void;
  reroutes: RerouteEvent[];
};

const CENTER = 300;
const EARTH_RADIUS = 110;

const satPoint = (angleDeg: number, radius: number): Point => {
  const a = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER + Math.cos(a) * radius,
    y: CENTER + Math.sin(a) * radius,
  };
};

const stationPoint = (lat: number, lon: number): Point => {
  const lonRad = (lon * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;
  const x = CENTER + Math.cos(latRad) * Math.sin(lonRad) * EARTH_RADIUS;
  const y = CENTER - Math.sin(latRad) * EARTH_RADIUS;
  return { x, y };
};

export function OrbitalHero({
  satellites,
  groundStations,
  activeSatelliteId,
  onSelectSatellite,
  reroutes,
}: Props) {
  const satPositions = Object.fromEntries(
    satellites.map((sat) => [sat.id, satPoint(sat.angleDeg, sat.orbitRadius)]),
  ) as Record<string, Point>;

  const stationPositions = Object.fromEntries(
    groundStations.map((gs) => [gs.id, stationPoint(gs.lat, gs.lon)]),
  ) as Record<string, Point>;

  return (
    <section className="relative rounded-3xl border border-cyan-500/20 bg-slate-900/60 p-4 shadow-[0_0_80px_-20px_rgba(6,182,212,0.3)] backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between px-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
          Orbital Command View
        </h2>
        <span className="font-mono text-xs tracking-wider text-cyan-400/80">
          LEO Mesh: {satellites.length} Assets
        </span>
      </div>

      <div className="relative aspect-square w-full max-w-[620px] overflow-hidden rounded-full border border-cyan-900/40 bg-[radial-gradient(circle_at_center,rgba(2,6,23,0.8),rgba(2,6,23,1))] shadow-[inset_0_0_50px_rgba(8,145,178,0.2)]">
        <svg viewBox="0 0 600 600" className="h-full w-full">
          <defs>
            <radialGradient id="earthGlow" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#0369a1" stopOpacity="0.6" />
              <stop offset="90%" stopColor="#0f172a" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#020617" stopOpacity="1" />
            </radialGradient>
            
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <linearGradient id="radarSweep" x1="50%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Radar Sweep Animation */}
          <g className="origin-center animate-[spin_4s_linear_infinite]">
            <path
              d={`M ${CENTER} ${CENTER} L ${CENTER + 280} ${CENTER} A 280 280 0 0 1 ${CENTER + 198} ${CENTER + 198} Z`}
              fill="url(#radarSweep)"
              opacity="0.15"
            />
          </g>

          {/* Orbit Rings */}
          {satellites.map((sat) => (
            <circle
              key={`${sat.id}-orbit`}
              cx={CENTER}
              cy={CENTER}
              r={sat.orbitRadius}
              fill="none"
              stroke="rgba(34, 211, 238, 0.15)"
              strokeWidth="1"
              strokeDasharray="4 12"
            />
          ))}

          {/* Earth Body */}
          <circle cx={CENTER} cy={CENTER} r={EARTH_RADIUS} fill="url(#earthGlow)" />
          
          {/* Earth Grid (Lat/Lon) */}
          <g stroke="rgba(56, 189, 248, 0.15)" strokeWidth="1" fill="none">
            <ellipse cx={CENTER} cy={CENTER} rx={EARTH_RADIUS} ry={EARTH_RADIUS * 0.3} />
            <ellipse cx={CENTER} cy={CENTER} rx={EARTH_RADIUS} ry={EARTH_RADIUS * 0.7} />
            <ellipse cx={CENTER} cy={CENTER} rx={EARTH_RADIUS * 0.3} ry={EARTH_RADIUS} />
            <ellipse cx={CENTER} cy={CENTER} rx={EARTH_RADIUS * 0.7} ry={EARTH_RADIUS} />
          </g>
          
          <circle
            cx={CENTER}
            cy={CENTER}
            r={EARTH_RADIUS + 2}
            fill="none"
            stroke="rgba(56, 189, 248, 0.4)"
            strokeWidth="2"
            filter="url(#neonGlow)"
          />

          {/* Ground Stations */}
          {groundStations.map((station) => {
            const point = stationPositions[station.id];
            return (
              <g key={station.id} className="cursor-help">
                <circle cx={point.x} cy={point.y} r={8} fill="rgba(167, 139, 250, 0.2)" className="animate-ping origin-center" style={{ transformOrigin: `${point.x}px ${point.y}px` }} />
                <rect x={point.x - 3} y={point.y - 3} width={6} height={6} fill="#a78bfa" rx="1" filter="url(#neonGlow)" />
                <text
                  x={point.x + 12}
                  y={point.y - 4}
                  fill="rgba(196, 181, 253, 0.9)"
                  fontSize="11"
                  fontFamily="var(--font-geist-mono)"
                  letterSpacing="1"
                >
                  {station.name}
                </text>
              </g>
            );
          })}

          {/* Laser Connections */}
          {satellites
            .filter((sat) => sat.contact.inContact && sat.contact.stationId)
            .map((sat) => {
              const satPos = satPositions[sat.id];
              const gsPos = stationPositions[sat.contact.stationId as string];
              return (
                <line
                  key={`contact-${sat.id}`}
                  x1={satPos.x}
                  y1={satPos.y}
                  x2={gsPos.x}
                  y2={gsPos.y}
                  stroke="#4ade80"
                  strokeWidth={2}
                  strokeOpacity={0.8}
                  strokeDasharray="4 4"
                  className="animate-orbit-dash-slow"
                  filter="url(#neonGlow)"
                />
              );
            })}

          {/* Reroute Events */}
          {reroutes.map((event) => {
            const from = satPositions[event.fromSatelliteId];
            return event.toSatelliteIds.map((toId) => {
              const to = satPositions[toId];
              const dx = to.x - from.x;
              const dy = to.y - from.y;
              const mx = (from.x + to.x) / 2 + dy * 0.2;
              const my = (from.y + to.y) / 2 - dx * 0.2;
              return (
                <path
                  key={`${event.id}-${toId}`}
                  d={`M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth={3}
                  strokeDasharray="6 8"
                  className="animate-orbit-dash-fast"
                  filter="url(#neonGlow)"
                />
              );
            });
          })}

          {/* Satellites */}
          {satellites.map((sat) => {
            const pos = satPositions[sat.id];
            const active = sat.id === activeSatelliteId;
            const color =
              sat.health === "critical"
                ? "#f43f5e"
                : sat.health === "warning"
                  ? "#f59e0b"
                  : "#22d3ee";
            
            return (
              <g key={sat.id} onClick={() => onSelectSatellite(sat.id)} className="cursor-pointer transition-transform hover:scale-110" style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}>
                {active && (
                  <>
                    <circle cx={pos.x} cy={pos.y} r={18} fill="none" stroke={color} strokeWidth="1" strokeOpacity="0.5" className="animate-ping origin-center" style={{ transformOrigin: `${pos.x}px ${pos.y}px` }} />
                    <circle cx={pos.x} cy={pos.y} r={14} fill="none" stroke="#f8fafc" strokeWidth="2" strokeDasharray="4 4" className="animate-[spin_4s_linear_infinite] origin-center" style={{ transformOrigin: `${pos.x}px ${pos.y}px` }} filter="url(#neonGlow)" />
                  </>
                )}
                <path d={`M ${pos.x-5} ${pos.y} L ${pos.x} ${pos.y-6} L ${pos.x+5} ${pos.y} L ${pos.x} ${pos.y+6} Z`} fill={color} filter="url(#neonGlow)" />
                <text
                  x={pos.x + 12}
                  y={pos.y - 12}
                  fill="rgba(241, 245, 249, 0.95)"
                  fontSize="12"
                  fontFamily="var(--font-geist-mono)"
                  className="drop-shadow-md"
                >
                  {sat.name} <tspan fill={color}>[{Math.round(sat.loadPct)}%]</tspan>
                </text>
              </g>
            );
          })}
        </svg>

      </div>
    </section>
  );
}
