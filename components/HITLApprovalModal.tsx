"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ShieldAlert,
  Bot,
  Wrench,
  Terminal,
  X,
  Lock,
  CheckCircle,
  Ban,
  Clock,
  Radio,
} from "lucide-react";
import type { TelemetryEvent, ApprovalDecision } from "@/types/telemetry";

interface HITLApprovalModalProps {
  event: TelemetryEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onAction: (event: TelemetryEvent, decision: ApprovalDecision) => Promise<void>;
  queueCount?: number;
}

export default function HITLApprovalModal({
  event,
  isOpen,
  onClose,
  onAction,
  queueCount = 0,
}: HITLApprovalModalProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !event) return null;

  const handleDecision = async (decision: ApprovalDecision) => {
    try {
      setIsSubmitting(true);
      await onAction(event, decision);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCritical = event.risk_score >= 80;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop with smooth fade */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-sm transition-opacity duration-150"
        onClick={onClose}
      />

      {/* Reduced-Size Modal Container with GPU-accelerated enter animation */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg bg-charcoal rounded-xl border border-coral/80 shadow-[0_0_35px_rgba(255,75,50,0.35)] overflow-hidden font-mono z-10 animate-[modalIn_180ms_cubic-bezier(0.23,1,0.32,1)_forwards]"
      >
        {/* Compact Emergency Banner in Vibrant Coral Orange */}
        <div className="bg-coral px-3.5 py-1.5 flex items-center justify-between text-white text-[11px] font-bold tracking-wider uppercase select-none">
          <div className="flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5 animate-pulse text-white" />
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              HITL INTERCEPT · TIER 3 (RISK &gt; 70%)
            </span>
          </div>
          {queueCount > 1 && (
            <span className="bg-black/50 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-white/20">
              {queueCount} QUEUED
            </span>
          )}
        </div>

        {/* Modal Header */}
        <div className="px-4 py-3 bg-neutral-900 border-b border-steel/20 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-coral text-white tracking-widest uppercase shadow-[0_0_10px_rgba(255,75,50,0.5)]">
                {event.risk_score}% {isCritical ? "CRITICAL RISK" : "HIGH RISK"}
              </span>
              <span className="text-[11px] text-steel">
                ID: <strong className="text-neutral-200">{event.id}</strong>
              </span>
            </div>
            <h2 className="text-sm font-bold text-neutral-100 tracking-wide mt-1 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-coral" />
              Human-in-the-Loop Approval Gate
            </h2>
            <p className="text-[10px] text-steel mt-0.5">
              Execution quarantined. Autonomous action requires manual SOC operator sign-off.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-steel hover:text-white hover:bg-neutral-800 active:scale-[0.97] transition-all duration-100 ease-out cursor-pointer"
            title="Dismiss / Review later"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3 max-h-[62vh] overflow-y-auto">
          {/* Diagnostic Alert Box */}
          {event.diagnosis && (
            <div className="rounded-lg bg-coral/15 border border-coral/60 p-2.5 shadow-[0_0_12px_rgba(255,75,50,0.2)]">
              <div className="flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 text-coral flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-coral">
                    Vulnerability Diagnosis
                  </div>
                  <p className="text-[11px] text-white mt-0.5 leading-snug font-medium">
                    {event.diagnosis}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Compact Agent & Tool Meta */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-neutral-900/90 rounded-lg p-2.5 border border-steel/20">
              <div className="text-[9px] uppercase tracking-wider text-steel flex items-center gap-1">
                <Bot className="h-3 w-3 text-steel" />
                Originating Agent
              </div>
              <div className="mt-0.5 text-xs font-bold text-neutral-100 truncate">
                {event.agent_id}
              </div>
            </div>

            <div className="bg-neutral-900/90 rounded-lg p-2.5 border border-steel/20">
              <div className="text-[9px] uppercase tracking-wider text-steel flex items-center gap-1">
                <Wrench className="h-3 w-3 text-coral" />
                Proposed Tool
              </div>
              <div className="mt-0.5 text-xs font-bold text-coral truncate">
                {event.tool_name}
              </div>
            </div>
          </div>

          {/* Arguments Payload Inspection */}
          <div className="bg-neutral-900/90 rounded-lg p-3 border border-steel/20">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-wider text-steel flex items-center gap-1 font-semibold">
                <Terminal className="h-3 w-3 text-steel" />
                Arguments Payload
              </span>
              <span className="text-[9px] text-steel/70 font-mono">JSON</span>
            </div>
            <pre className="p-2 rounded bg-charcoal border border-steel/20 text-[11px] text-steel overflow-x-auto whitespace-pre-wrap font-mono max-h-32">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(event.args), null, 2);
                } catch {
                  return event.args;
                }
              })()}
            </pre>
          </div>

          {/* Timestamp footer strip */}
          <div className="flex items-center justify-between text-[10px] text-steel px-1">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-steel" />
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>
            <span>Signatory: <strong className="text-neutral-200">SOC_ADMIN_01</strong></span>
          </div>
        </div>

        {/* Modal Actions (Dual CTAs with crisp active:scale-[0.97] feedback under 160ms) */}
        <div className="p-3 sm:p-4 bg-neutral-900 border-t border-steel/20 flex items-center justify-end gap-2.5">
          {/* Button 1: [Approve One-Time] in Cool Steel Grey */}
          <button
            onClick={() => handleDecision("APPROVE")}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider bg-neutral-950 border border-steel/40 text-steel hover:border-steel hover:text-white active:scale-[0.97] transition-all duration-100 ease-out shadow-[0_0_10px_rgba(0,0,0,0.5)] disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle className="h-3.5 w-3.5 text-steel" />
            <span>Approve One-Time</span>
          </button>

          {/* Button 2: [Block & Quarantine] in Vibrant Coral Orange */}
          <button
            onClick={() => handleDecision("REJECT")}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider bg-coral text-white hover:bg-[#ff351a] active:scale-[0.97] transition-all duration-100 ease-out border border-coral/80 shadow-[0_0_20px_rgba(255,75,50,0.5)] disabled:opacity-50 cursor-pointer"
          >
            <Ban className="h-3.5 w-3.5" />
            <span>Block & Quarantine</span>
          </button>
        </div>
      </div>
    </div>
  );
}
