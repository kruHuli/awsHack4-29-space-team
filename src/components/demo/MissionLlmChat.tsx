"use client";

import { Bot, Loader2, Route, Send, ShieldCheck, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import type { MissionChatMessage, Satellite, TelemetryPoint } from "@/lib/demo/types";

type Props = {
  activeSatellite: Satellite;
  telemetry: TelemetryPoint[];
  messages: MissionChatMessage[];
  isThinking: boolean;
  onAsk: (prompt: string) => void;
};

const latestTelemetry = (telemetry: TelemetryPoint[]) =>
  telemetry[telemetry.length - 1] ?? null;

const roleStyles: Record<MissionChatMessage["role"], string> = {
  assistant: "border-cyan-300/25 bg-cyan-500/10 text-cyan-50",
  user: "ml-8 border-slate-500/40 bg-slate-800/80 text-slate-100",
};

export function MissionLlmChat({
  activeSatellite,
  telemetry,
  messages,
  isThinking,
  onAsk,
}: Props) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const point = latestTelemetry(telemetry);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isThinking]);

  const submitPrompt = (prompt: string) => {
    const nextPrompt = prompt.trim();
    if (!nextPrompt || isThinking) return;
    onAsk(nextPrompt);
    setDraft("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitPrompt(draft);
  };

  return (
    <section className="rounded-2xl border border-cyan-400/25 bg-slate-900/70 p-4 shadow-[0_0_36px_-18px_rgba(34,211,238,0.55)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
            <Bot size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-200">
              Mission Atonomou Agent
            </h3>
            <p className="font-mono text-[11px] text-slate-400">{activeSatellite.name}</p>
          </div>
        </div>
        <span className="rounded-full border border-slate-600/80 px-2 py-1 font-mono text-[10px] uppercase text-slate-300">
          {activeSatellite.health}
        </span>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 font-mono text-[11px] text-slate-300">
        <div className="rounded-lg border border-slate-700/70 bg-slate-950/50 p-2">
          <span className="block text-slate-500">Load</span>
          <span className="text-slate-100">{Math.round(activeSatellite.loadPct)}%</span>
        </div>
        <div className="rounded-lg border border-slate-700/70 bg-slate-950/50 p-2">
          <span className="block text-slate-500">Temp</span>
          <span className="text-slate-100">
            {point ? `${point.temperatureC.toFixed(1)}C` : "--"}
          </span>
        </div>
        <div className="rounded-lg border border-slate-700/70 bg-slate-950/50 p-2">
          <span className="block text-slate-500">Health</span>
          <span className="text-slate-100">
            {point ? `${point.healthPct.toFixed(1)}%` : "--"}
          </span>
        </div>
        <div className="rounded-lg border border-slate-700/70 bg-slate-950/50 p-2">
          <span className="block text-slate-500">SEU</span>
          <span className="text-slate-100">{point ? point.seuRate.toFixed(3) : "--"}</span>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => submitPrompt("Analyze current telemetry and decide whether to act.")}
          disabled={isThinking}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-cyan-400/70 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Sparkles size={14} />
          Analyze
        </button>
        <button
          type="button"
          onClick={() => submitPrompt("Reroute load away from this satellite if risk is high.")}
          disabled={isThinking}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-amber-300/70 hover:text-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Route size={14} />
          Reroute
        </button>
        <button
          type="button"
          onClick={() => submitPrompt("Stabilize and resolve the active satellite fault.")}
          disabled={isThinking}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-emerald-300/70 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ShieldCheck size={14} />
          Stabilize
        </button>
      </div>

      <div className="h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-700/70 bg-slate-950/45 p-2">
        {messages.map((message) => (
          <article
            key={message.id}
            className={`rounded-lg border p-2 text-sm leading-relaxed ${roleStyles[message.role]}`}
          >
            <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] opacity-70">
              {message.ts} - {message.role}
            </p>
            <p>{message.text}</p>
          </article>
        ))}
        {isThinking && (
          <div className="flex items-center gap-2 rounded-lg border border-cyan-300/20 bg-cyan-500/10 p-2 text-xs text-cyan-100">
            <Loader2 className="animate-spin" size={14} />
            Thinking
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={isThinking}
          placeholder="Ask for analysis or mitigation"
          className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isThinking || !draft.trim()}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-300 text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Send message"
        >
          <Send size={17} />
        </button>
      </form>
    </section>
  );
}
