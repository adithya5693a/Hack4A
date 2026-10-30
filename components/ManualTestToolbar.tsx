"use client";

import { ShieldCheck, ShieldAlert, Zap, CheckCircle } from "lucide-react";

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
      className="bg-charcoal border border-steel/20 rounded-xl p-3 shadow-[0_4px_20px_rgba(0,0,0,0.8)] flex flex-wrap items-center justify-between gap-3 font-mono"
      style={{
        boxShadow: "0 0 20px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(146, 157, 167, 0.05)",
      }}
    >
      {/* Title & Pipeline Badge */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 border border-coral/50">
          <Zap className="h-3.5 w-3.5 text-coral animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-100 uppercase tracking-wider">
              Manual Simulation Sandbox
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-neutral-900 text-steel border border-steel/30">
              SOC TEST PIPELINE
            </span>
          </div>
          <p className="text-[10px] text-steel">
            Instant telemetry injection for live hackathon pitch evaluation
          </p>
        </div>
      </div>

      {/* Dual Test Trigger Action Buttons */}
      <div className="flex items-center gap-2.5 w-full sm:w-auto">
        {/* Button 1: Simulate Safe Event (Cool Steel Grey) */}
        <button
          onClick={onSimulateSafe}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg font-mono text-xs font-semibold uppercase tracking-wider bg-neutral-900 border border-steel/40 text-steel hover:border-steel hover:text-white active:scale-[0.97] transition-all duration-100 ease-out shadow-[0_0_10px_rgba(0,0,0,0.5)] cursor-pointer"
        >
          <CheckCircle className="h-3.5 w-3.5 text-steel" />
          <span>Simulate Safe Event</span>
        </button>

        {/* Button 2: Simulate Tier 3 Attack (Vibrant Coral Orange) */}
        <button
          onClick={onSimulateAttack}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider bg-coral text-white hover:bg-[#ff351a] active:scale-[0.97] transition-all duration-100 ease-out border border-coral/80 shadow-[0_0_15px_rgba(255,75,50,0.5)] cursor-pointer"
        >
          <ShieldAlert className="h-3.5 w-3.5 text-white" />
          <span>Simulate Tier 3 Attack</span>
        </button>
      </div>
    </div>
  );
}
