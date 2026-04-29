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
    <section className="relative rounded-3xl border border-cyan-300/15 bg-slate-900/70 p-4 shadow-[0_0_60px_-25px_rgba(14,165,233,0.5)]">
      <div className="mb-3 flex items-center justify-between px-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200/80">
          Orbital Command View
        </h2>
        <span className="text-xs text-slate-300/70">LEO Mesh: 5 Assets</span>
      </div>

      <div className="relative aspect-square w-full max-w-[620px] overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.75),rgba(2,6,23,1))]">
        <svg viewBox="0 0 600 600" className="h-full w-full">
          <defs>
            <radialGradient id="earthGlow" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.82" />
              <stop offset="70%" stopColor="#1d4ed8" stopOpacity="0.34" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.9" />
            </radialGradient>
          </defs>

          {satellites.map((sat) => (
            <circle
              key={`${sat.id}-orbit`}
              cx={CENTER}
              cy={CENTER}
              r={sat.orbitRadius}
              fill="none"
              stroke="rgba(148, 163, 184, 0.18)"
              strokeDasharray="4 8"
            />
          ))}

          <circle cx={CENTER} cy={CENTER} r={EARTH_RADIUS} fill="url(#earthGlow)" />
          <circle
            cx={CENTER}
            cy={CENTER}
            r={EARTH_RADIUS + 2}
            fill="none"
            stroke="rgba(56, 189, 248, 0.3)"
          />

          {groundStations.map((station) => {
            const point = stationPositions[station.id];
            return (
              <g key={station.id}>
                <circle cx={point.x} cy={point.y} r={4} fill="#a78bfa" />
                <text
                  x={point.x + 8}
                  y={point.y - 8}
                  fill="rgba(226, 232, 240, 0.8)"
                  fontSize="10"
                >
                  {station.name}
                </text>
              </g>
            );
          })}

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
                  strokeOpacity={0.9}
                />
              );
            })}

          {reroutes.map((event) => {
            const from = satPositions[event.fromSatelliteId];
            return event.toSatelliteIds.map((toId) => {
              const to = satPositions[toId];
              const dx = to.x - from.x;
              const dy = to.y - from.y;
              const mx = (from.x + to.x) / 2 + dy * 0.18;
              const my = (from.y + to.y) / 2 - dx * 0.18;
              return (
                <path
                  key={`${event.id}-${toId}`}
                  d={`M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  strokeDasharray="5 6"
                  className="animate-pulse"
                />
              );
            });
          })}

          {satellites.map((sat) => {
            const pos = satPositions[sat.id];
            const active = sat.id === activeSatelliteId;
            const fill =
              sat.health === "critical"
                ? "#f43f5e"
                : sat.health === "warning"
                  ? "#f59e0b"
                  : "#22d3ee";
            return (
              <g key={sat.id} onClick={() => onSelectSatellite(sat.id)} className="cursor-pointer">
                {active && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={13}
                    fill="none"
                    stroke="#f8fafc"
                    strokeOpacity={0.9}
                  />
                )}
                <circle cx={pos.x} cy={pos.y} r={7} fill={fill} />
                <text
                  x={pos.x + 10}
                  y={pos.y - 10}
                  fill="rgba(241, 245, 249, 0.92)"
                  fontSize="11"
                >
                  {sat.name} {Math.round(sat.loadPct)}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
