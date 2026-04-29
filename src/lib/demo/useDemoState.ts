"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AiMessage,
  FaultType,
  GroundStation,
  RerouteEvent,
  Satellite,
  TelemetryPoint,
} from "@/lib/demo/types";

const MAX_POINTS = 45;

const GROUND_STATIONS: GroundStation[] = [
  { id: "gs-hou", name: "Houston GS", lat: 29.6, lon: -95.2 },
  { id: "gs-osl", name: "Oslo GS", lat: 59.9, lon: 10.7 },
  { id: "gs-syd", name: "Sydney GS", lat: -33.8, lon: 151.2 },
];

const SATELLITE_SEEDS: Omit<Satellite, "contact">[] = [
  { id: "sat-01", name: "Aster-1", orbitRadius: 176, angleDeg: 20, speedDegPerTick: 0.55, loadPct: 58, health: "nominal" },
  { id: "sat-02", name: "Aster-2", orbitRadius: 210, angleDeg: 100, speedDegPerTick: 0.42, loadPct: 41, health: "nominal" },
  { id: "sat-03", name: "Aster-3", orbitRadius: 236, angleDeg: 182, speedDegPerTick: 0.35, loadPct: 64, health: "nominal" },
  { id: "sat-04", name: "Aster-4", orbitRadius: 192, angleDeg: 260, speedDegPerTick: 0.46, loadPct: 33, health: "nominal" },
  { id: "sat-05", name: "Aster-5", orbitRadius: 222, angleDeg: 320, speedDegPerTick: 0.4, loadPct: 49, health: "nominal" },
];

const FAULT_LABELS: Record<FaultType, string> = {
  radiation_event: "Radiation Event",
  thermal_cycling: "Thermal Cycling",
  drive_errors: "Drive Errors",
  solar_flare: "Solar Flare",
};

const faultTypes: FaultType[] = [
  "radiation_event",
  "thermal_cycling",
  "drive_errors",
  "solar_flare",
];

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const randomDelta = (spread: number) => (Math.random() - 0.5) * spread;

const normalizeDeg = (deg: number) => {
  const n = deg % 360;
  return n < 0 ? n + 360 : n;
};

const angularDistance = (a: number, b: number) => {
  const d = Math.abs(normalizeDeg(a) - normalizeDeg(b));
  return Math.min(d, 360 - d);
};

const stationLonToAngle = (lon: number) => normalizeDeg(lon + 180);

const buildContact = (satAngle: number, satSpeed: number) => {
  let nearestId: string | null = null;
  let nearestDist = Number.POSITIVE_INFINITY;

  GROUND_STATIONS.forEach((station) => {
    const dist = angularDistance(satAngle, stationLonToAngle(station.lon));
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestId = station.id;
    }
  });

  const inContact = nearestDist <= 38;
  const remaining = inContact ? 0 : Math.round((nearestDist - 38) / satSpeed);

  return {
    inContact,
    nextContactInSec: Math.max(0, remaining),
    stationId: inContact ? nearestId : null,
  };
};

const buildInitialTelemetry = (): Record<string, TelemetryPoint[]> => {
  const now = Date.now();
  return SATELLITE_SEEDS.reduce<Record<string, TelemetryPoint[]>>((acc, sat, idx) => {
    const points: TelemetryPoint[] = [];
    for (let i = 20; i >= 0; i -= 1) {
      const t = now - i * 1000;
      points.push({
        t,
        temperatureC: 38 + idx * 2 + Math.sin(i / 4) * 2,
        powerKw: 4.8 + idx * 0.2 + Math.cos(i / 5) * 0.35,
        healthPct: 97 - idx + Math.sin(i / 6),
        seuRate: 0.03 + idx * 0.01 + Math.abs(Math.sin(i / 7)) * 0.04,
      });
    }
    acc[sat.id] = points;
    return acc;
  }, {});
};

const asTime = (ms: number) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(ms);

export function useDemoState() {
  const [satellites, setSatellites] = useState<Satellite[]>(
    SATELLITE_SEEDS.map((sat) => ({
      ...sat,
      contact: buildContact(sat.angleDeg, sat.speedDegPerTick),
    })),
  );
  const [activeSatelliteId, setActiveSatelliteId] = useState<string>("sat-01");
  const [telemetry, setTelemetry] = useState<Record<string, TelemetryPoint[]>>(
    buildInitialTelemetry(),
  );
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      id: "boot-message",
      ts: "00:00:00",
      type: "observation",
      satelliteId: "sat-01",
      text: "Orbit mesh online. Monitoring 5 assets in LEO.",
    },
  ]);
  const [reroutes, setReroutes] = useState<RerouteEvent[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();

      setSatellites((prev) =>
        prev.map((sat) => {
          const nextAngle = normalizeDeg(sat.angleDeg + sat.speedDegPerTick);
          const nextLoad = clamp(sat.loadPct + randomDelta(1.8), 20, 96);
          return {
            ...sat,
            angleDeg: nextAngle,
            loadPct: nextLoad,
            contact: buildContact(nextAngle, sat.speedDegPerTick),
          };
        }),
      );

      setTelemetry((prev) => {
        const next: Record<string, TelemetryPoint[]> = {};
        Object.entries(prev).forEach(([satId, points]) => {
          const last = points[points.length - 1];
          const newPoint: TelemetryPoint = {
            t: now,
            temperatureC: clamp(last.temperatureC + randomDelta(0.7), 21, 95),
            powerKw: clamp(last.powerKw + randomDelta(0.12), 2.5, 8.6),
            healthPct: clamp(last.healthPct + randomDelta(0.4), 42, 100),
            seuRate: clamp(last.seuRate + randomDelta(0.01), 0.01, 0.35),
          };
          next[satId] = [...points.slice(-(MAX_POINTS - 1)), newPoint];
        });
        return next;
      });

      setReroutes((prev) =>
        prev.filter((event) => now - event.startedAt < event.durationMs),
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const activeSatellite = useMemo(
    () => satellites.find((sat) => sat.id === activeSatelliteId) ?? satellites[0],
    [activeSatelliteId, satellites],
  );

  const addMessage = (type: AiMessage["type"], satelliteId: string, text: string) => {
    setMessages((prev) => [
      ...prev.slice(-80),
      {
        id: crypto.randomUUID(),
        ts: asTime(Date.now()),
        type,
        satelliteId,
        text,
      },
    ]);
  };

  const injectFault = (fault: FaultType, satelliteId: string) => {
    setIsProcessing(true);
    const sat = satellites.find((s) => s.id === satelliteId);
    if (!sat) return;

    addMessage("incident", satelliteId, `${FAULT_LABELS[fault]} detected on ${sat.name}.`);

    setTimeout(() => {
      setSatellites((prev) =>
        prev.map((item) =>
          item.id === satelliteId
            ? {
                ...item,
                health: "critical",
                loadPct: clamp(item.loadPct + 20, 20, 99),
              }
            : {
                ...item,
                health: "nominal",
                loadPct: clamp(item.loadPct - 5, 10, 95),
              },
        ),
      );

      const healthyTargets = satellites
        .filter((item) => item.id !== satelliteId)
        .slice(0, 3)
        .map((item) => item.id);

      setReroutes((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          fromSatelliteId: satelliteId,
          toSatelliteIds: healthyTargets,
          startedAt: Date.now(),
          durationMs: 4200,
        },
      ]);

      addMessage("action", satelliteId, "Autonomous workload reroute initiated to resilient peers.");
      addMessage("recommendation", satelliteId, "Schedule thermal and radiation diagnostics window.");
      setIsProcessing(false);
    }, 1400);
  };

  return {
    satellites,
    groundStations: GROUND_STATIONS,
    activeSatellite,
    activeSatelliteId,
    setActiveSatelliteId,
    telemetry,
    messages,
    reroutes,
    isProcessing,
    faultTypes,
    injectFault,
  };
}
