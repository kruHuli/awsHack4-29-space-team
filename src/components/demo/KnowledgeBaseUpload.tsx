"use client";

import { UploadCloud, CheckCircle2, FileText, Loader2 } from "lucide-react";
import { useState } from "react";

type Props = {
  isLoaded: boolean;
  onLoad: () => void;
};

export function KnowledgeBaseUpload({ isLoaded, onLoad }: Props) {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = () => {
    if (isLoaded || isUploading) return;
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      onLoad();
    }, 2000);
  };

  return (
    <section className="rounded-2xl border border-indigo-500/20 bg-slate-900/60 p-4 backdrop-blur-md shadow-[0_0_30px_-10px_rgba(99,102,241,0.2)]">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-indigo-300">
        <FileText size={16} /> Operations Manual
      </h3>

      {isLoaded ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3">
          <CheckCircle2 className="text-emerald-400" size={20} />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-emerald-200">Knowledge Base Active</span>
            <span className="text-xs text-emerald-400/70">Protocol engine ready.</span>
          </div>
        </div>
      ) : (
        <button
          onClick={handleUpload}
          disabled={isUploading}
          className="group relative flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-500/30 bg-indigo-950/20 py-6 transition-all hover:border-indigo-400/50 hover:bg-indigo-900/30 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isUploading ? (
            <Loader2 className="animate-spin text-indigo-400" size={28} />
          ) : (
            <UploadCloud className="text-indigo-400 group-hover:scale-110 transition-transform" size={28} />
          )}
          <span className="text-sm font-medium text-indigo-200">
            {isUploading ? "Ingesting Manual..." : "Upload Manual Workbook"}
          </span>
          {!isUploading && (
            <span className="text-[10px] uppercase tracking-wider text-indigo-400/60">
              Drag & Drop PDF/MD
            </span>
          )}
        </button>
      )}
    </section>
  );
}
