"use client";

import dynamic from "next/dynamic";
import { AiOperatorFeed } from "@/components/demo/AiOperatorFeed";
import { AutonomousAgentOverlay } from "@/components/demo/AutonomousAgentOverlay";
import { FaultInjectionPanel } from "@/components/demo/FaultInjectionPanel";
import { GroundContactBadge } from "@/components/demo/GroundContactBadge";
import { KnowledgeBaseUpload } from "@/components/demo/KnowledgeBaseUpload";
import { OrbitalHero } from "@/components/demo/OrbitalHero";
import { SponsorFooter } from "@/components/demo/SponsorFooter";
import { useDemoState } from "@/lib/demo/useDemoState";

const TelemetryPanel = dynamic(
  () => import("@/components/demo/TelemetryPanel").then((mod) => mod.TelemetryPanel),
  {
    ssr: false,
    loading: () => (
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="h-40 rounded-xl border border-slate-700/80 bg-slate-900/70 p-3" />
        <div className="h-40 rounded-xl border border-slate-700/80 bg-slate-900/70 p-3" />
        <div className="h-40 rounded-xl border border-slate-700/80 bg-slate-900/70 p-3" />
        <div className="h-40 rounded-xl border border-slate-700/80 bg-slate-900/70 p-3" />
      </section>
    ),
  },
);

export default function Home() {
  const {
    satellites,
    groundStations,
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
  } = useDemoState();

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-6 text-slate-100 md:px-10">
      <AutonomousAgentOverlay task={agentTask} />
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/80">Mission Control</p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Orbital Resilience Demo</h1>
          </div>
          <GroundContactBadge contact={activeSatellite.contact} />
        </header>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.45fr_1fr]">
          <OrbitalHero
            satellites={satellites}
            groundStations={groundStations}
            activeSatelliteId={activeSatelliteId}
            onSelectSatellite={setActiveSatelliteId}
            reroutes={reroutes}
          />

          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-700/80 bg-slate-900/70 p-4">
              <h2 className="text-lg font-semibold">{activeSatellite.name}</h2>
              <p className="mt-1 text-sm text-slate-300">
                Load: <span className="font-semibold text-slate-100">{Math.round(activeSatellite.loadPct)}%</span>
              </p>
              <p className="text-sm text-slate-300">
                Health: <span className="font-semibold uppercase text-slate-100">{activeSatellite.health}</span>
              </p>
            </div>

            <KnowledgeBaseUpload
              isLoaded={isWorkbookLoaded}
              onLoad={() => setIsWorkbookLoaded(true)}
            />

            <FaultInjectionPanel
              faultTypes={faultTypes}
              satellites={satellites}
              activeSatelliteId={activeSatelliteId}
              onInject={injectFault}
            />

            <AiOperatorFeed messages={messages} />
          </aside>
        </section>

        <section className="mt-4 rounded-2xl border border-slate-700/80 bg-slate-900/60 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-200">
            Live Telemetry - {activeSatellite.name}
          </h3>
          <TelemetryPanel telemetry={telemetry[activeSatellite.id] ?? []} />
        </section>

        <SponsorFooter isProcessing={isProcessing} />
      </div>
    </main>
  );
}
