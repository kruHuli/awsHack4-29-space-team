export const operationsPlaybook = {
  mission: "LEO orbital resilience demo",
  protocols: [
    {
      id: "RAD-21A",
      faultTypes: ["radiation_event", "solar_flare"],
      triggers: ["high SEU rate", "critical health", "radiation event"],
      steps: [
        "Isolate non-essential compute workloads.",
        "Reroute traffic to healthy peer satellites.",
        "Schedule radiation diagnostics on next ground contact.",
      ],
      preferredAction: "reroute",
    },
    {
      id: "THERM-14C",
      faultTypes: ["thermal_cycling", "solar_flare"],
      triggers: ["temperature above 70C", "power draw instability"],
      steps: [
        "Throttle payload processing.",
        "Stabilize thermal control loop.",
        "Confirm temperature trend drops before returning to nominal load.",
      ],
      preferredAction: "stabilize",
    },
    {
      id: "DRV-09B",
      faultTypes: ["drive_errors"],
      triggers: ["storage drive errors", "health below 75%"],
      steps: [
        "Move write-heavy workloads to resilient peers.",
        "Restart affected storage subsystem.",
        "Run integrity checks after stabilization.",
      ],
      preferredAction: "stabilize",
    },
    {
      id: "LOAD-33F",
      faultTypes: ["radiation_event", "thermal_cycling", "drive_errors", "solar_flare"],
      triggers: ["load above 85%", "critical state", "operator reroute request"],
      steps: [
        "Select up to three healthy satellites as target peers.",
        "Reroute non-essential workloads for five seconds.",
        "Keep the affected asset in warning state until telemetry normalizes.",
      ],
      preferredAction: "reroute",
    },
  ],
  nominalRanges: {
    temperatureC: "21-70",
    powerKw: "2.5-8.6",
    healthPct: "75-100",
    seuRate: "0.01-0.18",
    loadPct: "10-85",
  },
} as const;
