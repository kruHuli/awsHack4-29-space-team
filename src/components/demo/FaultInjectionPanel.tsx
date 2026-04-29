"use client";

import { useState } from "react";
import type { FaultType, Satellite } from "@/lib/demo/types";

const labels: Record<FaultType, string> = {
  radiation_event: "Radiation Event",
  thermal_cycling: "Thermal Cycling",
  drive_errors: "Drive Errors",
  solar_flare: "Solar Flare",
};

type Props = {
  faultTypes: FaultType[];
  satellites: Satellite[];
  activeSatelliteId: string;
  onSelectSatellite: (id: string) => void;
  onInject: (faultType: FaultType, satelliteId: string) => void;
};

export function FaultInjectionPanel({
  faultTypes,
  satellites,
  activeSatelliteId,
  onSelectSatellite,
  onInject,
}: Props) {
  const [faultType, setFaultType] = useState<FaultType>(faultTypes[0]);

  return (
    <section className="rounded-2xl border border-amber-300/20 bg-slate-900/70 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-amber-200">
        Fault Injection
      </h3>
      <div className="grid grid-cols-1 gap-2">
        <select
          value={faultType}
          onChange={(e) => setFaultType(e.target.value as FaultType)}
          className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-200"
        >
          {faultTypes.map((type) => (
            <option key={type} value={type}>
              {labels[type]}
            </option>
          ))}
        </select>

        <select
          value={activeSatelliteId}
          onChange={(e) => onSelectSatellite(e.target.value)}
          className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-200"
        >
          {satellites.map((sat) => (
            <option key={sat.id} value={sat.id}>
              {sat.name}
            </option>
          ))}
        </select>

        <button
          onClick={() => onInject(faultType, activeSatelliteId)}
          className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
        >
          Inject Fault
        </button>
      </div>
    </section>
  );
}
