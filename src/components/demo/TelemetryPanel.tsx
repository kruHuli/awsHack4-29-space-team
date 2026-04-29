"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TelemetryPoint } from "@/lib/demo/types";

type Props = {
  telemetry: TelemetryPoint[];
};

function TinyChart({
  title,
  color,
  dataKey,
  data,
}: {
  title: string;
  color: string;
  dataKey: keyof TelemetryPoint;
  data: TelemetryPoint[];
}) {
  const currentVal = data.length > 0 ? Number(data[data.length - 1][dataKey]) : 0;
  const values = data.map((d) => Number(d[dataKey]));
  const minVal = values.length > 0 ? Math.min(...values) : 0;
  const maxVal = values.length > 0 ? Math.max(...values) : 0;

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
              <span>MAX {maxVal.toFixed(2)}</span>
              <span>MIN {minVal.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div className="flex h-2 w-2 items-center justify-center rounded-full bg-slate-800">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: color }} />
        </div>
      </div>
      
      <div className="h-24 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={96}>
          <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" vertical={false} />
            <XAxis dataKey="t" hide />
            <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
            <Tooltip
              formatter={(value) =>
                typeof value === "number" ? value.toFixed(2) : String(value ?? "")
              }
              labelFormatter={() => "Live"}
              contentStyle={{
                background: "rgba(2, 6, 23, 0.8)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(100, 116, 139, 0.45)",
                borderRadius: "8px",
                fontFamily: "var(--font-geist-mono)",
                fontSize: "12px"
              }}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#gradient-${dataKey})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

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
