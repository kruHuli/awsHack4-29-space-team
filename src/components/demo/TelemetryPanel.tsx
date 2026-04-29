"use client";

import {
  Line,
  LineChart,
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
  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-900/70 p-3">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-300/80">
        {title}
      </h4>
      <div className="h-28 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="t" hide />
            <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
            <Tooltip
              formatter={(value) =>
                typeof value === "number" ? value.toFixed(2) : String(value ?? "")
              }
              labelFormatter={() => "Live"}
              contentStyle={{
                background: "#020617",
                border: "1px solid rgba(100, 116, 139, 0.45)",
                borderRadius: "8px",
              }}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={false}
              isAnimationActive
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function TelemetryPanel({ telemetry }: Props) {
  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <TinyChart title="Temperature (C)" color="#f97316" dataKey="temperatureC" data={telemetry} />
      <TinyChart title="Power Draw (kW)" color="#38bdf8" dataKey="powerKw" data={telemetry} />
      <TinyChart title="Server Health (%)" color="#4ade80" dataKey="healthPct" data={telemetry} />
      <TinyChart title="Radiation / SEU" color="#f43f5e" dataKey="seuRate" data={telemetry} />
    </section>
  );
}
