"use client";

import { useEffect, useRef } from "react";
import type { AiMessage } from "@/lib/demo/types";

const typeStyles: Record<AiMessage["type"], string> = {
  observation: "border-sky-300/30 bg-sky-500/10 text-sky-100",
  action: "border-violet-300/30 bg-violet-500/10 text-violet-100",
  recommendation: "border-amber-300/30 bg-amber-500/10 text-amber-100",
  incident: "border-rose-300/40 bg-rose-500/10 text-rose-100",
};

export function AiOperatorFeed({ messages }: { messages: AiMessage[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <section className="rounded-2xl border border-slate-700/80 bg-slate-900/70 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-200">
        AI Operator Feed
      </h3>
      <div className="h-72 space-y-2 overflow-y-auto pr-2">
        {messages.map((msg) => (
          <article
            key={msg.id}
            className={`rounded-lg border p-2 text-sm ${typeStyles[msg.type]}`}
          >
            <p className="mb-1 text-[11px] uppercase tracking-[0.12em] opacity-80">
              {msg.ts} - {msg.type}
            </p>
            <p>{msg.text}</p>
          </article>
        ))}
        <div ref={endRef} />
      </div>
    </section>
  );
}
