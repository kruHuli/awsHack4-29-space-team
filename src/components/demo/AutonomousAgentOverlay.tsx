"use client";

import { BrainCircuit, Check, ChevronRight, Loader2, ShieldAlert } from "lucide-react";
import type { AgentTask } from "@/lib/demo/types";

type Props = {
  task: AgentTask | null;
};

export function AutonomousAgentOverlay({ task }: Props) {
  if (!task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-cyan-500/40 bg-slate-900 shadow-[0_0_80px_-15px_rgba(6,182,212,0.5)]">
        <div className="border-b border-cyan-500/20 bg-cyan-950/40 p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-900/50">
              <BrainCircuit className="text-cyan-400" size={24} />
              <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500">
                <ShieldAlert className="text-white" size={10} />
              </div>
            </div>
            <div>
              <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-cyan-400 text-shadow-glow">
                Live Agent Diagnostics
              </h2>
              <p className="text-xs text-cyan-200/70">
                Autonomous resolution activated for {task.satelliteId}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-mono text-xs text-slate-400">STATUS: {task.status === "running" ? "EXECUTING PROTOCOL" : "RESOLVED"}</span>
            {task.status === "running" && <Loader2 className="animate-spin text-cyan-400" size={16} />}
          </div>

          <div className="space-y-3 font-mono text-sm">
            {task.steps.map((step) => {
              const isPending = step.status === "pending";
              const isRunning = step.status === "running";
              const isSuccess = step.status === "success";

              return (
                <div
                  key={step.id}
                  className={`flex items-start gap-3 transition-opacity duration-300 ${isPending ? "opacity-30" : "opacity-100"}`}
                >
                  <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                    {isPending && <ChevronRight className="text-slate-500" size={16} />}
                    {isRunning && <Loader2 className="animate-spin text-cyan-400" size={16} />}
                    {isSuccess && <Check className="text-emerald-400" size={16} />}
                  </div>
                  <span
                    className={`leading-snug ${
                      isSuccess
                        ? "text-emerald-300"
                        : isRunning
                        ? "text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                        : "text-slate-500"
                    }`}
                  >
                    {step.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
