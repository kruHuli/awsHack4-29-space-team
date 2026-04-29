"use client";

export function SponsorFooter({ isProcessing }: { isProcessing: boolean }) {
  return (
    <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700/80 bg-slate-900/70 px-4 py-3">
      <div className="flex items-center gap-3 text-sm text-slate-300">
        <span className="rounded bg-slate-800 px-2 py-1 font-semibold tracking-wide">RunPod</span>
        <span className="rounded bg-slate-800 px-2 py-1 font-semibold tracking-wide">LightSprint</span>
      </div>

      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-300">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${
            isProcessing ? "animate-pulse bg-cyan-300" : "bg-slate-500"
          }`}
        />
        Inference: RunPod GPU
      </div>
    </footer>
  );
}
