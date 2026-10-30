"use client";

import { ShieldCheck, ShieldAlert, Zap, Terminal, CheckCircle, AlertTriangle } from "lucide-react";
import type { TelemetryEvent } from "@/types/telemetry";

interface ManualTestToolbarProps {
  onSimulateSafe: () => void;
  onSimulateAttack: () => void;
}

export default function ManualTestToolbar({
  onSimulateSafe,
  onSimulateAttack,
}: ManualTestToolbarProps) {
  return (
    <div
      className="bg-charcoal border border-forest rounded-xl p-3 shadow-[0_4px_20px_rgba(6,17,12,0.8)] flex flex-wrap items-center justify-between gap-3 font-mono"
      style={{
        boxShadow: "0 0 20px rgba(6, 17, 12, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
      }}
    >
      {/* Title & Pipeline Badge */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-forest border border-emerald-900/60">
          <Zap className="h-3.5 w-3.5 text-crimson animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-100 uppercase tracking-wider">
              Manual Simulation Sandbox
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-neutral-900 text-neutral-400 border border-neutral-800">
              SOC TEST PIPELINE
            </span>
          </div>
          <p className="text-[10px] text-neutral-500">
            Instant telemetry injection for live hackathon pitch evaluation
          </p>
        </div>
      </div>

      {/* Dual Test Trigger Action Buttons */}
      <div className="flex items-center gap-2.5 w-full sm:w-auto">
        {/* Button 1: Simulate Safe Event */}
        {/* Styled with Forest Green #06110C border, crisp active:scale-[0.97], duration under 160ms */}
        <button
          onClick={onSimulateSafe}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg font-mono text-xs font-semibold uppercase tracking-wider bg-forest border border-emerald-800/80 text-emerald-300 hover:border-emerald-600 hover:bg-emerald-950/40 active:scale-[0.97] transition-all duration-100 ease-out shadow-[0_0_12px_rgba(6,17,12,0.6)] cursor-pointer"
        >
          <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
          <span>Simulate Safe Event</span>
        </button>

        {/* Button 2: Simulate Tier 3 Attack */}
        {/* Styled with Crimson Red #A31C18, crisp active:scale-[0.97], duration under 160ms */}
        <button
          onClick={onSimulateAttack}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider bg-crimson text-white hover:bg-red-800 active:scale-[0.97] transition-all duration-100 ease-out border border-red-500/60 shadow-[0_0_15px_rgba(163,28,24,0.5)] cursor-pointer"
        >
          <ShieldAlert className="h-3.5 w-3.5 text-white" />
          <span>Simulate Tier 3 Attack</span>
        </button>
      </div>
    </div>
  );
}
