"use client";

import { Bot, Download, Loader2, Route, Send, ShieldCheck, Sparkles } from "lucide-react";
import {
  FormEvent,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  MissionChatMessage,
  Satellite,
  TelemetryPoint,
} from "@/lib/demo/types";

type Props = {
  activeSatellite: Satellite;
  telemetry: TelemetryPoint[];
  messages: MissionChatMessage[];
  isThinking: boolean;
  onAsk: (prompt: string) => void;
};

const latestTelemetry = (telemetry: TelemetryPoint[]) =>
  telemetry[telemetry.length - 1] ?? null;

type MarkdownBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet"; items: string[] }
  | { type: "numbered"; items: string[] };

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

const roleStyles: Record<MissionChatMessage["role"], string> = {
  assistant: "border-cyan-300/25 bg-cyan-500/10 text-cyan-50",
  user: "ml-8 border-slate-500/40 bg-slate-800/80 text-slate-100",
};

const parseMarkdownBlocks = (text: string): MarkdownBlock[] => {
  const blocks: MarkdownBlock[] = [];
  const lines = text.split(/\r?\n/);

  let paragraph: string[] = [];
  let list: { type: "bullet" | "numbered"; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  };

  const flushList = () => {
    if (!list) return;
    blocks.push(list);
    list = null;
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    const heading = trimmed.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", text: heading[1] });
      return;
    }

    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      if (!list || list.type !== "bullet") {
        flushList();
        list = { type: "bullet", items: [] };
      }
      list.items.push(bullet[1]);
      return;
    }

    const numbered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (numbered) {
      flushParagraph();
      if (!list || list.type !== "numbered") {
        flushList();
        list = { type: "numbered", items: [] };
      }
      list.items.push(numbered[1]);
      return;
    }

    flushList();
    paragraph.push(trimmed);
  });

  flushParagraph();
  flushList();

  return blocks.length > 0 ? blocks : [{ type: "paragraph", text }];
};

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return (
    <>
      {parts.map((part, index) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={`${part}-${index}`} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        ),
      )}
    </>
  );
}

function MarkdownMessage({ text }: { text: string }) {
  const blocks = parseMarkdownBlocks(text);

  return (
    <div className="space-y-2">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <h4
              key={`${block.type}-${index}`}
              className="pt-1 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-100"
            >
              <InlineMarkdown text={block.text} />
            </h4>
          );
        }

        if (block.type === "bullet") {
          return (
            <ul key={`${block.type}-${index}`} className="ml-4 list-disc space-y-1">
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`}>
                  <InlineMarkdown text={item} />
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "numbered") {
          return (
            <ol key={`${block.type}-${index}`} className="ml-4 list-decimal space-y-1">
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`}>
                  <InlineMarkdown text={item} />
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={`${block.type}-${index}`}>
            <InlineMarkdown text={block.text} />
          </p>
        );
      })}
    </div>
  );
}

export function MissionLlmChat({
  activeSatellite,
  telemetry,
  messages,
  isThinking,
  onAsk,
}: Props) {
  const [draft, setDraft] = useState("");
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
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

  const downloadPdf = async (message: MissionChatMessage) => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 44;
    const contentWidth = pageWidth - margin * 2;
    const generatedAt = new Date().toLocaleString();
    let y = 44;

    doc.setFillColor(7, 18, 38);
    doc.rect(0, 0, pageWidth, 132, "F");
    doc.setFillColor(34, 211, 238);
    doc.rect(0, 0, 8, 132, "F");
    doc.setTextColor(224, 242, 254);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Mission Autonomous Agent Report", margin, y);
    y += 24;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated ${generatedAt}`, margin, y);
    y += 30;
    doc.setTextColor(241, 245, 249);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`Asset: ${activeSatellite.name}`, margin, y);
    doc.text(`State: ${activeSatellite.health.toUpperCase()}`, margin + 180, y);
    doc.text(`Load: ${Math.round(activeSatellite.loadPct)}%`, margin + 340, y);
    y += 22;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(203, 213, 225);
    const telemetryLine = point
      ? `Telemetry: ${point.temperatureC.toFixed(1)}C | ${point.powerKw.toFixed(2)}kW | health ${point.healthPct.toFixed(1)}% | SEU ${point.seuRate.toFixed(3)}`
      : "Telemetry: unavailable";
    doc.text(telemetryLine, margin, y);
    y = 170;

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Agent Output", margin, y);
    y += 18;

    parseMarkdownBlocks(message.text).forEach((block) => {
      if (y > 720) {
        doc.addPage();
        y = 52;
      }

      if (block.type === "heading") {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(8, 145, 178);
        doc.text(block.text.replace(/\*\*/g, ""), margin, y);
        y += 18;
        return;
      }

      const items =
        block.type === "bullet" || block.type === "numbered"
          ? block.items
          : [block.text];

      items.forEach((item, index) => {
        if (y > 720) {
          doc.addPage();
          y = 52;
        }

        const prefix =
          block.type === "bullet"
            ? "- "
            : block.type === "numbered"
              ? `${index + 1}. `
              : "";
        const lines = doc.splitTextToSize(
          `${prefix}${item.replace(/\*\*/g, "")}`,
          contentWidth,
        );
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text(lines, margin, y);
        y += lines.length * 13 + 6;
      });

      y += 2;
    });

    doc.setFillColor(6, 182, 212);
    doc.rect(margin, 746, contentWidth, 2, "F");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Orbital Resilience Demo | Mission Autonomous Agent", margin, 764);
    doc.save(`mission-agent-${activeSatellite.id}-${message.id}.pdf`);
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
              Mission Autonomous Agent
            </h3>
            <p className="font-mono text-[11px] text-slate-400">
              {activeSatellite.name}
            </p>
          </div>
        </div>
        <span className="rounded-full border border-slate-600/80 px-2 py-1 font-mono text-[10px] uppercase text-slate-300">
          {activeSatellite.health}
        </span>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 font-mono text-[11px] text-slate-300">
        <div className="rounded-lg border border-slate-700/70 bg-slate-950/50 p-2">
          <span className="block text-slate-500">Load</span>
          <span className="text-slate-100">
            {isMounted ? `${Math.round(activeSatellite.loadPct)}%` : "--"}
          </span>
        </div>
        <div className="rounded-lg border border-slate-700/70 bg-slate-950/50 p-2">
          <span className="block text-slate-500">Temp</span>
          <span className="text-slate-100">
            {isMounted && point ? `${point.temperatureC.toFixed(1)}C` : "--"}
          </span>
        </div>
        <div className="rounded-lg border border-slate-700/70 bg-slate-950/50 p-2">
          <span className="block text-slate-500">Health</span>
          <span className="text-slate-100">
            {isMounted && point ? `${point.healthPct.toFixed(1)}%` : "--"}
          </span>
        </div>
        <div className="rounded-lg border border-slate-700/70 bg-slate-950/50 p-2">
          <span className="block text-slate-500">SEU</span>
          <span className="text-slate-100">
            {isMounted && point ? point.seuRate.toFixed(3) : "--"}
          </span>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            submitPrompt("Analyze current telemetry and decide whether to act.")
          }
          disabled={isThinking}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-cyan-400/70 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Sparkles size={14} />
          Analyze
        </button>
        <button
          type="button"
          onClick={() =>
            submitPrompt(
              "Reroute load away from this satellite if risk is high.",
            )
          }
          disabled={isThinking}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-amber-300/70 hover:text-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Route size={14} />
          Reroute
        </button>
        <button
          type="button"
          onClick={() =>
            submitPrompt("Stabilize and resolve the active satellite fault.")
          }
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
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] opacity-70">
                {message.ts} - {message.role}
              </p>
              {message.role === "assistant" && (
                <button
                  type="button"
                  onClick={() => void downloadPdf(message)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-cyan-300/20 text-cyan-100/80 transition hover:border-cyan-200/60 hover:text-cyan-50"
                  aria-label="Download response as PDF"
                  title="Download PDF"
                >
                  <Download size={13} />
                </button>
              )}
            </div>
            {message.role === "assistant" ? (
              <MarkdownMessage text={message.text} />
            ) : (
              <p>{message.text}</p>
            )}
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
