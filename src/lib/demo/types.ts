export type SatelliteHealth = "nominal" | "warning" | "critical";

export type AiMessageType =
  | "observation"
  | "action"
  | "recommendation"
  | "incident";

export type FaultType =
  | "radiation_event"
  | "thermal_cycling"
  | "drive_errors"
  | "solar_flare";

export interface GroundStation {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export interface ContactState {
  inContact: boolean;
  nextContactInSec: number;
  stationId: string | null;
}

export interface Satellite {
  id: string;
  name: string;
  orbitRadius: number;
  angleDeg: number;
  speedDegPerTick: number;
  loadPct: number;
  health: SatelliteHealth;
  contact: ContactState;
}

export interface TelemetryPoint {
  t: number;
  temperatureC: number;
  powerKw: number;
  healthPct: number;
  seuRate: number;
}

export interface AiMessage {
  id: string;
  ts: string;
  type: AiMessageType;
  satelliteId: string;
  text: string;
}

export interface RerouteEvent {
  id: string;
  fromSatelliteId: string;
  toSatelliteIds: string[];
  startedAt: number;
  durationMs: number;
}
