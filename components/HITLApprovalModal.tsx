"use client";

import { useState } from "react";
import { toast } from "sonner";
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
  isAuthenticated: boolean;
  onSignIn: () => void;
}

export default function HITLApprovalModal({
  event,
  isOpen,
  onClose,
  onAction,
  queueCount = 0,
  isAuthenticated,
  onSignIn,
}: HITLApprovalModalProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !event) return null;

  const handleDecision = async (decision: ApprovalDecision) => {
    if (!isAuthenticated) {
      toast.error("Authentication Required", {
        description: "You must sign in with Google as SOC_ADMIN_01 to authorize or block critical actions.",
        icon: <Lock className="h-4 w-4 text-crimson" />,
      });
      return;
    }
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
        className="fixed inset-0 bg-black/35 backdrop-blur-[1.5px] transition-opacity duration-150"
        onClick={onClose}
      />

      {/* Reduced-Size Modal Container with GPU-accelerated enter animation */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg bg-charcoal rounded-xl border border-crimson/80 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_35px_rgba(163,28,24,0.35)] overflow-hidden font-mono z-10 animate-[modalIn_180ms_cubic-bezier(0.23,1,0.32,1)_forwards]"
      >
        {/* Compact Emergency Banner in Crimson Red */}
        <div className="bg-crimson px-3.5 py-1.5 flex items-center justify-between text-white text-[11px] font-bold tracking-wider uppercase select-none">
          <div className="flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5 animate-pulse text-white" />
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              SAFETY INTERCEPT · TIER 3 CONFIRMATION
            </span>
          </div>
          {queueCount > 1 && (
            <span className="bg-black/50 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-white/20">
              {queueCount} QUEUED
            </span>
          )}
        </div>

        {/* Modal Header */}
        <div className="px-4 py-3 bg-forest border-b border-neutral-800 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-crimson text-white tracking-widest uppercase shadow-[0_0_10px_rgba(163,28,24,0.5)]">
                Threat Level: {event.risk_score}% {isCritical ? "CRITICAL" : "HIGH"}
              </span>
              <span className="text-[11px] text-neutral-400">
                ID: <strong className="text-neutral-200">{event.id}</strong>
              </span>
            </div>
            <h2 className="text-sm font-bold text-neutral-100 tracking-wide mt-1 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-crimson" />
              Dangerous Action Detected
            </h2>
            <p className="text-[10px] text-neutral-400 mt-0.5">
              An agent attempted a critical action that requires manual human confirmation before running.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 active:scale-[0.97] transition-all duration-100 ease-out cursor-pointer"
            title="Dismiss / Review later"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3 max-h-[62vh] overflow-y-auto">
          {/* Diagnostic Alert Box */}
          {event.diagnosis && (
            <div className="rounded-lg bg-crimson/15 border border-crimson/60 p-2.5 shadow-[0_0_12px_rgba(163,28,24,0.2)]">
              <div className="flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 text-crimson flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-red-300">
                    Why Was This Stopped?
                  </div>
                  <p className="text-[11px] text-red-100 mt-0.5 leading-snug font-medium">
                    {event.diagnosis}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Compact Agent & Tool Meta */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-neutral-900/90 rounded-lg p-2.5 border border-forest">
              <div className="text-[9px] uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                <Bot className="h-3 w-3 text-emerald-400" />
                Triggering AI Agent
              </div>
              <div className="mt-0.5 text-xs font-bold text-neutral-100 truncate">
                {event.agent_id}
              </div>
            </div>

            <div className="bg-neutral-900/90 rounded-lg p-2.5 border border-forest">
              <div className="text-[9px] uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                <Wrench className="h-3 w-3 text-crimson" />
                Requested Command
              </div>
              <div className="mt-0.5 text-xs font-bold text-red-300 truncate">
                {event.tool_name}
              </div>
            </div>
          </div>

          {/* Arguments Payload Inspection */}
          <div className="bg-neutral-900/90 rounded-lg p-3 border border-neutral-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-wider text-neutral-400 flex items-center gap-1 font-semibold">
                <Terminal className="h-3 w-3 text-neutral-400" />
                Command Parameters
              </span>
              <span className="text-[9px] text-neutral-500 font-mono">JSON</span>
            </div>
            <pre className="p-2 rounded bg-charcoal border border-neutral-800 text-[11px] text-emerald-400 overflow-x-auto whitespace-pre-wrap font-mono max-h-32">
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
          <div className="flex items-center justify-between text-[10px] text-neutral-400 px-1">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-neutral-500" />
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>
            <span>Reviewer: <strong className={isAuthenticated ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>{isAuthenticated ? "SOC_ADMIN_01 (SecOps Lead)" : "Unauthorized (Session Required)"}</strong></span>
          </div>
        </div>

        {/* Authentication Warning for Unauthorized Users with 1-Click Judge Demo Bypass */}
        {!isAuthenticated && (
          <div className="mx-4 mb-3 p-3 rounded-xl bg-neutral-900 border border-amber-600/40 text-amber-200 text-xs flex flex-wrap items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <span>
                SOC Lead session (<strong>SOC_ADMIN_01</strong>) required to resolve approvals.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSignIn}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forest border border-emerald-800 hover:border-emerald-600 text-emerald-300 font-bold text-xs active:scale-[0.97] transition-all cursor-pointer shadow-[0_0_10px_rgba(6,17,12,0.8)]"
              >
                <span>⚡ Instant Sign-In (Demo Lead)</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Actions (Dual CTAs with crisp active:scale-[0.97] feedback under 160ms) */}
        <div className="p-3 sm:p-4 bg-forest border-t border-neutral-800 flex items-center justify-end gap-2.5">
          {/* Button 1: [Allow Once] (styled with subtle #06110C Forest Green border/text) */}
          <button
            onClick={() => handleDecision("APPROVE")}
            title={!isAuthenticated ? "Admin Google authentication required" : "Approve this action one-time"}
            disabled={isSubmitting || !isAuthenticated}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider bg-forest border border-emerald-900/80 text-emerald-300 hover:border-emerald-700 hover:bg-emerald-950/40 active:scale-[0.97] transition-all duration-100 ease-out shadow-[0_0_10px_rgba(6,17,12,0.8)] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
          >
            <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
            <span>[Allow Once]</span>
          </button>

          {/* Button 2: [Block & Protect] (styled with #A31C18 Crimson Red) */}
          <button
            onClick={() => handleDecision("REJECT")}
            title={!isAuthenticated ? "Admin Google authentication required" : "Block and quarantine originating agent"}
            disabled={isSubmitting || !isAuthenticated}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider bg-crimson text-white hover:bg-red-800 active:scale-[0.97] transition-all duration-100 ease-out border border-red-500/70 shadow-[0_0_20px_rgba(163,28,24,0.5)] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
          >
            <Ban className="h-3.5 w-3.5" />
            <span>[Block & Protect]</span>
          </button>
        </div>
      </div>
    </div>
  );
}
