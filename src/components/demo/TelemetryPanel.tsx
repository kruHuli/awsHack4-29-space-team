"use client";

import { memo, useMemo } from "react";
import type { TelemetryPoint } from "@/lib/demo/types";

type Props = {
  telemetry: TelemetryPoint[];
};

type TelemetryMetric = Exclude<keyof TelemetryPoint, "t">;

const chartWidth = 320;
const chartHeight = 96;

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

export function TelemetryPanel({ telemetry }: Props) {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <TinyChart title="Temperature (C)" color="#f97316" dataKey="temperatureC" data={telemetry} />
      <TinyChart title="Power Draw (kW)" color="#38bdf8" dataKey="powerKw" data={telemetry} />
      <TinyChart title="Server Health (%)" color="#4ade80" dataKey="healthPct" data={telemetry} />
      <TinyChart title="Radiation / SEU" color="#f43f5e" dataKey="seuRate" data={telemetry} />
    </section>
  );
}
