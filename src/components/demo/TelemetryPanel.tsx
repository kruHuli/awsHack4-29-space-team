"use client";

import { memo, useMemo } from "react";
import type { SatelliteHealth, TelemetryPoint } from "@/lib/demo/types";

type Props = {
  dataCenterTelemetry: TelemetryPoint[];
  activeSatelliteName: string;
  activeSatelliteLoadPct: number;
  activeSatelliteHealth: SatelliteHealth;
  activeSatelliteTelemetry: TelemetryPoint[];
  faultActive: boolean;
};

type TelemetryMetric = Exclude<keyof TelemetryPoint, "t">;

const chartWidth = 320;
const chartHeight = 96;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const buildChartPath = (data: TelemetryPoint[], dataKey: TelemetryMetric) => {
  const values = data.map((point) => Number(point[dataKey]));
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;
  const range = Math.max(max - min, 0.001);
  const lastIndex = Math.max(data.length - 1, 1);

  const points = values.map((value, index) => {
    const x = (index / lastIndex) * chartWidth;
    const y = chartHeight - ((value - min) / range) * chartHeight;
    return { x, y };
  });

  if (points.length === 0) {
    return { areaPath: "", linePath: "", min, max };
  }

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  const first = points[0];
  const last = points[points.length - 1];
  const areaPath = `${linePath} L ${last.x.toFixed(2)} ${chartHeight} L ${first.x.toFixed(2)} ${chartHeight} Z`;

  return { areaPath, linePath, min, max };
};

const TinyChart = memo(function TinyChart({
  title,
  color,
  dataKey,
  data,
}: {
  title: string;
  color: string;
  dataKey: TelemetryMetric;
  data: TelemetryPoint[];
}) {
  const currentVal = data.length > 0 ? Number(data[data.length - 1][dataKey]) : 0;
  const { areaPath, linePath, min, max } = useMemo(
    () => buildChartPath(data, dataKey),
    [data, dataKey],
  );

  return (
    <div className="relative rounded-xl border border-slate-700/50 bg-slate-900/40 p-4 backdrop-blur-md shadow-[inset_0_0_20px_rgba(15,23,42,0.8)]">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
            {title}
          </h4>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-medium tracking-tight text-slate-100" style={{ textShadow: `0 0 10px ${color}40` }}>
              {currentVal.toFixed(2)}
            </span>
            <div className="flex flex-col text-[10px] text-slate-500 font-mono leading-tight">
              <span>MAX {max.toFixed(2)}</span>
              <span>MIN {min.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div className="flex h-2 w-2 items-center justify-center rounded-full bg-slate-800">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: color }} />
        </div>
      </div>
      
      <div className="h-24 w-full min-w-0">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="h-full w-full overflow-visible"
          preserveAspectRatio="none"
          role="img"
          aria-label={`${title} telemetry chart`}
        >
          <defs>
            <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {[24, 48, 72].map((y) => (
            <line
              key={y}
              x1="0"
              x2={chartWidth}
              y1={y}
              y2={y}
              stroke="rgba(100,116,139,0.15)"
              strokeDasharray="3 3"
            />
          ))}
          {areaPath && <path d={areaPath} fill={`url(#gradient-${dataKey})`} />}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
      </div>
    </div>
  );
});

const ClusterNodeTopology = memo(function ClusterNodeTopology({
  activeSatelliteName,
  activeSatelliteLoadPct,
  activeSatelliteTelemetry,
  faultActive,
}: {
  activeSatelliteName: string;
  activeSatelliteLoadPct: number;
  activeSatelliteTelemetry: TelemetryPoint[];
  faultActive: boolean;
}) {
  const latestTelemetry = activeSatelliteTelemetry[activeSatelliteTelemetry.length - 1];
  const telemetryBias = latestTelemetry ? clamp((latestTelemetry.healthPct - 80) / 5, -4, 4) : 0;
  const satSeed = activeSatelliteName
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const seedOffset = (satSeed % 7) - 3;
  const loadBase = clamp(activeSatelliteLoadPct, 0, 100);

  const nodes = [
    {
      id: "NODE-01",
      role: "COMMS",
      status: "NOMINAL",
      critical: false,
      cpuLoad: faultActive ? 85 : clamp(Math.round(34 + loadBase * 0.2 + seedOffset), 18, 92),
      memLoad: faultActive ? 67 : clamp(Math.round(44 + loadBase * 0.16 + telemetryBias), 22, 90),
    },
    {
      id: "NODE-02",
      role: "NAV",
      status: "NOMINAL",
      critical: false,
      cpuLoad: clamp(Math.round(32 + loadBase * 0.18 - seedOffset), 16, 90),
      memLoad: clamp(Math.round(40 + loadBase * 0.14 + telemetryBias), 20, 88),
    },
    {
      id: "NODE-03",
      role: "INFERENCE",
      status: faultActive ? "CRITICAL" : "NOMINAL",
      critical: faultActive,
      cpuLoad: faultActive ? 0 : clamp(Math.round(36 + loadBase * 0.22 + seedOffset), 20, 95),
      memLoad: faultActive ? 0 : clamp(Math.round(46 + loadBase * 0.18 + telemetryBias), 24, 92),
    },
    {
      id: "NODE-04",
      role: "BACKUP",
      status: "NOMINAL",
      critical: false,
      cpuLoad: faultActive ? 84 : clamp(Math.round(30 + loadBase * 0.17 - seedOffset), 16, 89),
      memLoad: faultActive ? 66 : clamp(Math.round(38 + loadBase * 0.15 + telemetryBias), 18, 86),
    },
  ] as const;

  return (
    <div
      className="relative rounded-xl border p-4 font-mono shadow-[inset_0_0_24px_rgba(0,0,0,0.45)]"
      style={{ backgroundColor: "#0f0f15", borderColor: "rgba(148,163,184,0.22)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs uppercase tracking-[0.18em] text-slate-300">Cluster Node Topology</h4>
        <span className="text-[10px] uppercase tracking-[0.14em] text-cyan-300/80">
          Active Satellite: {activeSatelliteName}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {nodes.map((node) => (
          <div
            key={node.id}
            className="rounded-md border p-2.5"
            style={{ borderColor: "rgba(148,163,184,0.28)", backgroundColor: "rgba(15,23,42,0.26)" }}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="min-w-0">
                <p className="truncate text-[10px] uppercase tracking-[0.14em] text-slate-400">{node.id}</p>
                <p className="truncate text-[11px] uppercase tracking-[0.1em] text-slate-200">{node.role}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    node.critical ? "animate-pulse bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)]" : "bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.95)]"
                  }`}
                />
                <span
                  className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${
                    node.critical ? "animate-pulse text-red-400" : "text-emerald-300"
                  }`}
                >
                  {node.critical ? "CRITICAL" : node.status}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 text-[9px] uppercase tracking-[0.12em] text-slate-400">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span>CPU Load</span>
                  <span className={node.critical ? "text-red-400" : "text-slate-300"}>{node.cpuLoad}%</span>
                </div>
                <div className="h-1 w-full rounded bg-slate-800">
                  <div
                    className={`h-1 rounded transition-all duration-300 ${
                      node.critical ? "bg-red-500" : "bg-cyan-300"
                    }`}
                    style={{ width: `${node.cpuLoad}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span>Mem Load</span>
                  <span className={node.critical ? "text-red-400" : "text-slate-300"}>{node.memLoad}%</span>
                </div>
                <div className="h-1 w-full rounded bg-slate-800">
                  <div
                    className={`h-1 rounded transition-all duration-300 ${
                      node.critical ? "bg-red-500" : "bg-violet-300"
                    }`}
                    style={{ width: `${node.memLoad}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export function TelemetryPanel({
  dataCenterTelemetry,
  activeSatelliteName,
  activeSatelliteLoadPct,
  activeSatelliteHealth,
  activeSatelliteTelemetry,
  faultActive,
}: Props) {
  const rackStatusLabel = activeSatelliteHealth === "critical" ? "SAT LINK DEGRADED" : "SAT LINK STABLE";

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <TinyChart
        title="Temperature (C)"
        color="#f97316"
        dataKey="temperatureC"
        data={dataCenterTelemetry}
      />
      <TinyChart title="Power Draw (kW)" color="#38bdf8" dataKey="powerKw" data={dataCenterTelemetry} />
      <ClusterNodeTopology
        activeSatelliteName={activeSatelliteName}
        activeSatelliteLoadPct={activeSatelliteLoadPct}
        activeSatelliteTelemetry={activeSatelliteTelemetry}
        faultActive={faultActive}
      />
      <div className="space-y-2">
        <TinyChart title="Radiation / SEU" color="#f43f5e" dataKey="seuRate" data={dataCenterTelemetry} />
        <p className="px-1 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">{rackStatusLabel}</p>
      </div>
    </section>
  );
}
