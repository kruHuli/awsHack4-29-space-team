import type { ContactState } from "@/lib/demo/types";

const fmt = (seconds: number) => {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
};

export function GroundContactBadge({ contact }: { contact: ContactState }) {
  if (contact.inContact) {
    return (
      <span className="inline-flex rounded-full border border-emerald-300/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-300">
        IN CONTACT
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-rose-300/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold tracking-wide text-rose-300">
      BLACKOUT - next contact in {fmt(contact.nextContactInSec)}
    </span>
  );
}
