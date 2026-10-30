"use client";

import type { TelemetryStatus } from "@/types/telemetry";

interface StatusBadgeProps {
  status: TelemetryStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  if (status === "ALLOWED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-forest border border-emerald-800/70 text-emerald-400 shadow-[0_0_8px_rgba(6,17,12,0.8)]">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-glow-pulse" />
        ALLOWED
      </span>
    );
  }

  if (status === "BLOCKED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-crimson border border-red-600/60 text-red-100 shadow-[0_0_12px_rgba(163,28,24,0.4)]">
        <span className="h-1.5 w-1.5 rounded-full bg-red-200 animate-glow-pulse" />
        BLOCKED
      </span>
    );
  }

  // PENDING: styled with an amber/neutral badge with Charcoal border
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-neutral-900 border border-charcoal text-amber-300/90 shadow-[0_0_6px_rgba(245,158,11,0.15)]">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-glow-pulse" />
      PENDING
    </span>
  );
}
