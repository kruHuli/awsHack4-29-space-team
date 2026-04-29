"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AgentTask,
  AiMessage,
  FaultType,
  GroundStation,
  MissionAgentAction,
  MissionAgentContext,
  MissionChatMessage,
  RerouteEvent,
  Satellite,
  TelemetryPoint,
} from "@/lib/demo/types";

const MAX_POINTS = 45;
const TICK_MS = 1000;

const GROUND_STATIONS: GroundStation[] = [
  { id: "gs-hou", name: "Houston GS", lat: 29.6, lon: -95.2 },
  { id: "gs-osl", name: "Oslo GS", lat: 59.9, lon: 10.7 },
  { id: "gs-syd", name: "Sydney GS", lat: -33.8, lon: 151.2 },
];

const SATELLITE_SEEDS: Omit<Satellite, "contact">[] = [
  {
    id: "sat-01",
    name: "Aster-1",
    orbitRadius: 176,
    angleDeg: 20,
    speedDegPerTick: 0.55,
    loadPct: 58,
    health: "nominal",
  },
  {
    id: "sat-02",
    name: "Aster-2",
    orbitRadius: 210,
    angleDeg: 100,
    speedDegPerTick: 0.42,
    loadPct: 41,
    health: "nominal",
  },
  {
    id: "sat-03",
    name: "Aster-3",
    orbitRadius: 236,
    angleDeg: 182,
    speedDegPerTick: 0.35,
    loadPct: 64,
    health: "nominal",
  },
  {
    id: "sat-04",
    name: "Aster-4",
    orbitRadius: 192,
    angleDeg: 260,
    speedDegPerTick: 0.46,
    loadPct: 33,
    health: "nominal",
  },
  {
    id: "sat-05",
    name: "Aster-5",
    orbitRadius: 222,
    angleDeg: 320,
    speedDegPerTick: 0.4,
    loadPct: 49,
    health: "nominal",
  },
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

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

const randomDelta = (spread: number) => (Math.random() - 0.5) * spread;

type TelemetryProfile = {
  baseTemp: number;
  basePower: number;
  radiationBaseline: number;
  thermalMass: number;
  powerEfficiency: number;
  sensorPhase: number;
};

const normalizeDeg = (deg: number) => {
  const n = deg % 360;
  return n < 0 ? n + 360 : n;
};

const angularDistance = (a: number, b: number) => {
  const d = Math.abs(normalizeDeg(a) - normalizeDeg(b));
  return Math.min(d, 360 - d);
};

const stationLonToAngle = (lon: number) => normalizeDeg(lon + 180);

const SATELLITE_TELEMETRY_PROFILES = SATELLITE_SEEDS.reduce<
  Record<string, TelemetryProfile>
>((acc, sat, idx) => {
  acc[sat.id] = {
    baseTemp: 33 + idx * 1.3,
    basePower: 3.9 + idx * 0.22,
    radiationBaseline: 0.02 + idx * 0.006,
    thermalMass: 0.9 + idx * 0.12,
    powerEfficiency: 0.94 - idx * 0.025,
    sensorPhase: idx * 0.85,
  };
  return acc;
}, {});

const buildTelemetryPoint = (
  now: number,
  sat: Satellite,
  previous: TelemetryPoint,
  profile: TelemetryProfile,
) => {
  const timeSec = now / 1000;
  const orbitalPhase =
    sat.angleDeg * (Math.PI / 180) + profile.sensorPhase + timeSec * 0.0045;
  const solarExposure = (Math.sin(orbitalPhase) + 1) / 2;
  const loadFactor = sat.loadPct / 100;
  const healthPenalty =
    sat.health === "critical" ? 5.2 : sat.health === "warning" ? 2.4 : 0;
  const thermalTarget =
    profile.baseTemp +
    loadFactor * 10.5 +
    (1 - solarExposure) * 2.8 +
    (sat.contact.inContact ? -1.2 : 0.8) +
    healthPenalty;
  const temperatureC = clamp(
    previous.temperatureC +
      (thermalTarget - previous.temperatureC) * 0.23 +
      randomDelta(0.35 * profile.thermalMass),
    24,
    98,
  );

  const powerTarget =
    profile.basePower +
    loadFactor * (2.9 - profile.powerEfficiency * 0.4) +
    Math.max(temperatureC - 50, 0) * 0.025 +
    (sat.health === "critical" ? 0.5 : 0);
  const powerKw = clamp(
    previous.powerKw +
      (powerTarget - previous.powerKw) * 0.34 +
      randomDelta(0.08),
    2.5,
    9.4,
  );

  const radiationCycle =
    0.012 * (1 + Math.sin(timeSec / 18 + profile.sensorPhase * 0.6));
  const seuTarget =
    profile.radiationBaseline +
    radiationCycle +
    Math.max(temperatureC - 58, 0) * 0.0012 +
    (sat.health === "critical" ? 0.03 : 0);
  const seuRate = clamp(
    previous.seuRate +
      (seuTarget - previous.seuRate) * 0.2 +
      randomDelta(0.007),
    0.008,
    0.35,
  );

  const wearRate = Math.max(temperatureC - 60, 0) * 0.004 + seuRate * 1.25;
  const baseRecovery =
    sat.health === "nominal" && sat.contact.inContact ? 0.03 : 0.008;
  const healthTarget = clamp(
    previous.healthPct - wearRate + baseRecovery + randomDelta(0.06),
    38,
    100,
  );
  const healthPct = clamp(
    previous.healthPct + (healthTarget - previous.healthPct) * 0.28,
    38,
    100,
  );

  return {
    t: now,
    temperatureC,
    powerKw,
    healthPct,
    seuRate,
  };
};

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
  return SATELLITE_SEEDS.reduce<Record<string, TelemetryPoint[]>>(
    (acc, sat, idx) => {
      const points: TelemetryPoint[] = [];
      for (let i = 20; i >= 0; i -= 1) {
        const t = now - i * 1000;
        if (points.length === 0) {
          points.push({
            t,
            temperatureC: 35 + idx * 1.6 + randomDelta(0.8),
            powerKw: 4.4 + idx * 0.18 + randomDelta(0.2),
            healthPct: 97 - idx * 0.9 + randomDelta(0.3),
            seuRate: 0.028 + idx * 0.006 + randomDelta(0.006),
          });
          continue;
        }

        const prev = points[points.length - 1];
        const syntheticSat: Satellite = {
          ...sat,
          loadPct: sat.loadPct + Math.sin(i / 4 + idx * 0.6) * 6,
          health: "nominal",
          contact: buildContact(
            sat.angleDeg + (20 - i) * sat.speedDegPerTick,
            sat.speedDegPerTick,
          ),
        };
        points.push(
          buildTelemetryPoint(
            t,
            syntheticSat,
            prev,
            SATELLITE_TELEMETRY_PROFILES[sat.id],
          ),
        );
      }
      acc[sat.id] = points;
      return acc;
    },
    {},
  );
};

const asTime = (ms: number) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(ms);

const chooseHealthyTargets = (satellites: Satellite[], satelliteId: string) =>
  satellites
    .filter((item) => item.id !== satelliteId && item.health !== "critical")
    .slice(0, 3)
    .map((item) => item.id);

type MissionAgentApiResponse = {
  message: string;
  actions?: MissionAgentAction[];
};

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
  const [isWorkbookLoaded, setIsWorkbookLoaded] = useState(false);
  const [agentTask, setAgentTask] = useState<AgentTask | null>(null);
  const [assistantMessages, setAssistantMessages] = useState<
    MissionChatMessage[]
  >([
    {
      id: "assistant-boot",
      ts: "00:00:00",
      role: "assistant",
      text: "Mission Autonomous Agent online. Ask me to analyze telemetry, reroute load, or stabilize the selected satellite.",
    },
  ]);
  const [isAssistantThinking, setIsAssistantThinking] = useState(false);

  useEffect(() => {
    if (!agentTask) return;

    if (agentTask.status === "completed") {
      const timer = setTimeout(() => {
        setAgentTask(null);
      }, 3000);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setAgentTask((prev) => {
        if (!prev) return null;
        const nextSteps = [...prev.steps];
        const runningIdx = nextSteps.findIndex((s) => s.status === "running");

        if (runningIdx === -1) {
          const firstPending = nextSteps.findIndex(
            (s) => s.status === "pending",
          );
          if (firstPending !== -1) {
            nextSteps[firstPending].status = "running";
            return { ...prev, steps: nextSteps };
          } else {
            // All steps completed
            // Resolve the fault
            setSatellites((sats) =>
              sats.map((item) =>
                item.id === prev.satelliteId
                  ? {
                      ...item,
                      health: "nominal",
                      loadPct: clamp(item.loadPct - 30, 10, 95),
                    }
                  : item,
              ),
            );
            return { ...prev, status: "completed" };
          }
        } else {
          // Complete the running step
          nextSteps[runningIdx].status = "success";
          return { ...prev, steps: nextSteps };
        }
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [agentTask]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      let nextSatellites: Satellite[] = [];

      setSatellites((prev) => {
        nextSatellites = prev.map((sat) => {
          const nextAngle = normalizeDeg(sat.angleDeg + sat.speedDegPerTick);
          const nextLoad = clamp(sat.loadPct + randomDelta(1.8), 20, 96);
          return {
            ...sat,
            angleDeg: nextAngle,
            loadPct: nextLoad,
            contact: buildContact(nextAngle, sat.speedDegPerTick),
          };
        });
        return nextSatellites;
      });

      setTelemetry((prev) => {
        const next: Record<string, TelemetryPoint[]> = {};
        const satById = nextSatellites.reduce<Record<string, Satellite>>(
          (acc, sat) => {
            acc[sat.id] = sat;
            return acc;
          },
          {},
        );
        Object.entries(prev).forEach(([satId, points]) => {
          const last = points[points.length - 1];
          const sat = satById[satId];
          const profile = SATELLITE_TELEMETRY_PROFILES[satId];
          const fallbackSat: Satellite = {
            id: satId,
            name: satId,
            orbitRadius: 200,
            angleDeg: 0,
            speedDegPerTick: 0.4,
            loadPct: 50,
            health: "nominal",
            contact: { inContact: false, nextContactInSec: 0, stationId: null },
          };
          const newPoint = buildTelemetryPoint(
            now,
            sat ?? fallbackSat,
            last,
            profile,
          );
          next[satId] = [...points.slice(-(MAX_POINTS - 1)), newPoint];
        });
        return next;
      });

      setReroutes((prev) =>
        prev.filter((event) => now - event.startedAt < event.durationMs),
      );
    }, TICK_MS);

    return () => clearInterval(timer);
  }, []);

  const activeSatellite = useMemo(
    () =>
      satellites.find((sat) => sat.id === activeSatelliteId) ?? satellites[0],
    [activeSatelliteId, satellites],
  );

  const addMessage = (
    type: AiMessage["type"],
    satelliteId: string,
    text: string,
  ) => {
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

  const addAssistantMessage = (
    role: MissionChatMessage["role"],
    text: string,
  ) => {
    setAssistantMessages((prev) => [
      ...prev.slice(-40),
      {
        id: crypto.randomUUID(),
        ts: asTime(Date.now()),
        role,
        text,
      },
    ]);
  };

  const buildMissionContext = (
    activeId = activeSatelliteId,
    satelliteSnapshot = satellites,
    telemetrySnapshot = telemetry,
    lastInjectedFault?: MissionAgentContext["lastInjectedFault"],
  ): MissionAgentContext => ({
    activeSatelliteId: activeId,
    satellites: satelliteSnapshot,
    telemetry: telemetrySnapshot,
    operatorMessages: messages,
    isWorkbookLoaded,
    lastInjectedFault,
  });

  const applyAgentAction = (action: MissionAgentAction) => {
    const sat = satellites.find((item) => item.id === action.satelliteId);
    if (!sat) return;

    if (action.type === "monitor") {
      addMessage(
        "observation",
        action.satelliteId,
        `Agent assessment for ${sat.name}: ${action.rationale}`,
      );
      return;
    }

    if (action.type === "reroute") {
      const healthyTargets = action.targetSatelliteIds?.length
        ? action.targetSatelliteIds
        : chooseHealthyTargets(satellites, action.satelliteId);
      setReroutes((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          fromSatelliteId: action.satelliteId,
          toSatelliteIds: healthyTargets,
          startedAt: Date.now(),
          durationMs: 5200,
        },
      ]);
      setSatellites((prev) =>
        prev.map((item) =>
          item.id === action.satelliteId
            ? {
                ...item,
                health: "warning",
                loadPct: clamp(item.loadPct - 18, 10, 95),
              }
            : item.id && healthyTargets.includes(item.id)
              ? { ...item, loadPct: clamp(item.loadPct + 6, 10, 96) }
              : item,
        ),
      );
      addMessage(
        "action",
        action.satelliteId,
        `Agent rerouted non-essential workloads from ${sat.name}.`,
      );
      return;
    }

    setSatellites((prev) =>
      prev.map((item) =>
        item.id === action.satelliteId
          ? {
              ...item,
              health: "nominal",
              loadPct: clamp(item.loadPct - 26, 10, 95),
            }
          : item,
      ),
    );
    setTelemetry((prev) => {
      const points = prev[action.satelliteId] ?? [];
      const last = points[points.length - 1];
      if (!last) return prev;

      return {
        ...prev,
        [action.satelliteId]: [
          ...points.slice(-(MAX_POINTS - 1)),
          {
            t: Date.now(),
            temperatureC: clamp(last.temperatureC - 8, 21, 95),
            powerKw: clamp(last.powerKw - 0.45, 2.5, 8.6),
            healthPct: clamp(last.healthPct + 9, 42, 100),
            seuRate: clamp(last.seuRate - 0.05, 0.01, 0.35),
          },
        ],
      };
    });
    addMessage(
      "action",
      action.satelliteId,
      `Agent stabilized ${sat.name}: ${action.rationale}`,
    );
  };

  const runMissionAgent = async (
    prompt: string,
    options?: {
      activeId?: string;
      satelliteSnapshot?: Satellite[];
      lastInjectedFault?: MissionAgentContext["lastInjectedFault"];
      showUserMessage?: boolean;
    },
  ) => {
    const trimmed = prompt.trim();
    if (!trimmed || isAssistantThinking) return;

    const userMessage: MissionChatMessage = {
      id: crypto.randomUUID(),
      ts: asTime(Date.now()),
      role: "user",
      text: trimmed,
    };

    if (options?.showUserMessage !== false) {
      setAssistantMessages((prev) => [...prev.slice(-40), userMessage]);
    }

    setIsAssistantThinking(true);

    try {
      const response = await fetch("/api/mission-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          messages: [...assistantMessages.slice(-12), userMessage],
          context: buildMissionContext(
            options?.activeId,
            options?.satelliteSnapshot,
            telemetry,
            options?.lastInjectedFault,
          ),
        }),
      });

      const payload = (await response.json()) as
        | MissionAgentApiResponse
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Mission agent request failed.",
        );
      }

      const agentPayload = payload as MissionAgentApiResponse;
      addAssistantMessage("assistant", agentPayload.message);
      agentPayload.actions?.forEach((action: MissionAgentAction) =>
        applyAgentAction(action),
      );
    } catch (error) {
      addAssistantMessage(
        "assistant",
        error instanceof Error
          ? `LangGraph agent unavailable: ${error.message}`
          : "LangGraph agent unavailable: unknown error.",
      );
    } finally {
      setIsAssistantThinking(false);
      setIsProcessing(false);
    }
  };

  const askAssistant = (prompt: string) => {
    void runMissionAgent(prompt);
  };

  const injectFault = (fault: FaultType, satelliteId: string) => {
    setIsProcessing(true);
    const sat = satellites.find((s) => s.id === satelliteId);
    if (!sat) return;

    addMessage(
      "incident",
      satelliteId,
      `${FAULT_LABELS[fault]} detected on ${sat.name}.`,
    );
    addAssistantMessage(
      "assistant",
      `Fault event received for ${sat.name}: ${FAULT_LABELS[fault]}. I am checking live telemetry and selecting a mitigation path.`,
    );

    const nextSatellites: Satellite[] = satellites.map((item) =>
      item.id === satelliteId
        ? {
            ...item,
            health: "critical" as const,
            loadPct: clamp(item.loadPct + 20, 20, 99),
          }
        : item,
    );
    setSatellites(nextSatellites);

    if (isWorkbookLoaded) {
      setAgentTask({
        id: crypto.randomUUID(),
        satelliteId,
        faultType: fault,
        status: "running",
        steps: [
          {
            id: "s1",
            text: "Scanning ingested Operations Manual...",
            status: "running",
          },
          {
            id: "s2",
            text: `Cross-referencing anomaly signature with Protocol ${Math.floor(Math.random() * 90) + 10}A...`,
            status: "pending",
          },
          {
            id: "s3",
            text: "Rerouting non-essential workloads to resilient peers...",
            status: "pending",
          },
          {
            id: "s4",
            text: "Rebooting affected subsystem and stabilizing...",
            status: "pending",
          },
        ],
      });
    }

    void runMissionAgent(
      `${FAULT_LABELS[fault]} was injected on ${sat.name}. Inspect all telemetry and playbook protocols, then choose and execute the best mitigation.`,
      {
        activeId: satelliteId,
        satelliteSnapshot: nextSatellites,
        lastInjectedFault: { faultType: fault, satelliteId },
        showUserMessage: false,
      },
    );
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
    isWorkbookLoaded,
    setIsWorkbookLoaded,
    agentTask,
    setAgentTask,
    assistantMessages,
    isAssistantThinking,
    askAssistant,
  };
}
