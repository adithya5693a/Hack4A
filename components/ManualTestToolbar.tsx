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
      className="bg-gradient-to-b from-[#1e2329]/70 to-[#17191c] border border-[#929da7]/30 rounded-2xl p-4 shadow-[0_4px_25px_rgba(0,0,0,0.85)] flex flex-wrap items-center justify-between gap-3 font-mono"
    >
      {/* Title & Pipeline Badge */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#17191c] border border-crimson/50 shadow-[0_0_12px_rgba(255,75,50,0.3)]">
          <Zap className="h-4 w-4 text-crimson animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-neutral-100 uppercase tracking-wider">
              Manual Testing Sandbox
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#17191c] text-[#929da7] border border-[#929da7]/30">
              ONE-CLICK DEMO
            </span>
          </div>
          <p className="text-xs text-[#929da7]">
            Push instant safe or dangerous events to demonstrate guardrail responses
          </p>
        </div>
      </div>

      {/* Dual Test Trigger Action Buttons */}
      <div className="flex items-center gap-2.5 w-full sm:w-auto">
        {/* Button 1: Simulate Safe Event */}
        <button
          onClick={onSimulateSafe}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-mono text-xs font-semibold uppercase tracking-wider bg-[#17191c] border border-emerald-900/80 text-emerald-300 hover:border-emerald-700 hover:bg-emerald-950/40 active:scale-[0.97] transition-all duration-150 ease-out shadow-sm cursor-pointer"
        >
          <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
          <span>Simulate Safe Event</span>
        </button>

        {/* Button 2: Simulate Tier 3 Attack */}
        <button
          onClick={onSimulateAttack}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider bg-crimson text-white hover:bg-[#e03d25] active:scale-[0.97] transition-all duration-150 ease-out border border-[#ff4b32]/70 shadow-[0_0_15px_rgba(255,75,50,0.45)] cursor-pointer"
        >
          <ShieldAlert className="h-3.5 w-3.5 text-white" />
          <span>Simulate Tier 3 Attack</span>
        </button>
      </div>
    </div>
  );
}
