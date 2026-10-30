"use client";

import { useAuditChain } from "@/hooks/useAuditChain";
import {
  ShieldCheck,
  ShieldAlert,
  Link2Off,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  Layers,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export default function CryptographicAuditVisualizer() {
  const {
    blocks,
    isTampered,
    isVerifying,
    verificationResult,
    toggleTampering,
    verifyIntegrity,
  } = useAuditChain();

  const handleVerifyClick = async () => {
    const res = await verifyIntegrity();
    if (res.valid) {
      toast.success("Log Integrity Verified", {
        description: "All 5 mathematical activity records match cryptographically.",
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
      });
    } else {
      toast.error("Tamper Alert Detected", {
        description: "Log entry #2 was secretly modified! Hash chain broken.",
        icon: <AlertTriangle className="h-4 w-4 text-crimson" />,
      });
    }
  };

  const handleToggleTampering = () => {
    toggleTampering();
    if (!isTampered) {
      toast.error("Log Tampering Simulated", {
        description: "Log entry #2 was secretly modified! Hash chain broken.",
        icon: <Link2Off className="h-4 w-4 text-crimson" />,
      });
    } else {
      toast.success("Log Integrity Restored", {
        description: "Original mathematical signature reinstated. Log verified.",
        icon: <ShieldCheck className="h-4 w-4 text-emerald-400" />,
      });
    }
  };

  const truncateHash = (hash: string) => {
    if (!hash || hash.length <= 16) return hash;
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
  };

  return (
    <div
      className="bg-charcoal border border-forest rounded-xl p-4 shadow-[0_4px_25px_rgba(6,17,12,0.9)] font-mono relative overflow-hidden"
      style={{
        boxShadow: "0 0 25px rgba(6, 17, 12, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
      }}
    >
      {/* Background ambient glow based on chain state */}
      <div
        className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none transition-colors duration-300 ${
          isTampered ? "bg-crimson/15" : "bg-forest opacity-80"
        }`}
      />

      {/* Header & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-neutral-800/80">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors duration-150 ${
              isTampered
                ? "bg-crimson/20 border-crimson text-crimson shadow-[0_0_12px_rgba(163,28,24,0.4)]"
                : "bg-forest border-emerald-900/70 text-emerald-400 shadow-[0_0_12px_rgba(6,17,12,0.8)]"
            }`}
          >
            {isTampered ? (
              <Link2Off className="h-4 w-4 text-crimson animate-pulse" />
            ) : (
              <Layers className="h-4 w-4 text-emerald-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-neutral-100 uppercase tracking-wider">
                Tamper-Proof Activity Log
              </h3>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-forest text-emerald-400 border border-emerald-900/60 uppercase">
                Cryptographic Trail
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-0.5">
              Every decision is mathematically chained. Any unauthorized edit breaks the chain immediately.
            </p>
          </div>
        </div>

        {/* Dual Interactive Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Button 1: [Verify Log Integrity] */}
          <button
            onClick={handleVerifyClick}
            disabled={isVerifying}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider active:scale-[0.97] transition-all duration-100 ease-out cursor-pointer disabled:opacity-60 ${
              verificationResult.valid
                ? "bg-forest border border-emerald-800/90 text-emerald-300 hover:border-emerald-600 hover:bg-emerald-950/40 shadow-[0_0_12px_rgba(6,17,12,0.8)]"
                : "bg-crimson/20 border border-crimson text-red-200 hover:bg-crimson/30 shadow-[0_0_12px_rgba(163,28,24,0.3)]"
            }`}
          >
            {isVerifying ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Checking...</span>
              </>
            ) : verificationResult.valid ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>[Verify Log Integrity]</span>
              </>
            ) : (
              <>
                <ShieldAlert className="h-3.5 w-3.5 text-crimson" />
                <span>[Verify Log Integrity]</span>
              </>
            )}
          </button>

          {/* Switch / Toggle: Simulate Log Tampering */}
          <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 cursor-pointer select-none active:scale-[0.97] transition-all duration-100">
            <span className="text-[11px] font-semibold text-neutral-300">
              Simulate Log Tampering
            </span>
            <div className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isTampered}
                onChange={handleToggleTampering}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-crimson shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]" />
            </div>
          </label>
        </div>
      </div>

      {/* Alert Banner When Tamper Detected or Valid Banner */}
      {isTampered ? (
        <div className="mb-4 p-2.5 rounded-lg bg-crimson/20 border border-crimson text-red-100 flex items-center justify-between text-xs animate-[slideDownIn_180ms_cubic-bezier(0.23,1,0.32,1)] shadow-[0_0_20px_rgba(163,28,24,0.35)]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-crimson flex-shrink-0 animate-pulse" />
            <span className="font-bold tracking-wide uppercase text-white">
              TAMPER DETECTED: Log entry #2 was secretly modified! Hash chain broken.
            </span>
          </div>
          <span className="text-[10px] bg-crimson px-2.5 py-0.5 rounded text-white font-bold tracking-wider uppercase shadow-[0_0_8px_rgba(163,28,24,0.6)]">
            CHAIN BROKEN
          </span>
        </div>
      ) : (
        <div className="mb-4 p-2 rounded-lg bg-forest border border-emerald-900/60 text-emerald-400 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
            <span className="font-semibold tracking-wide text-neutral-200">
              Log Integrity Verified: All 5 Entries Mathematically Intact
            </span>
          </div>
          <span className="text-[10px] text-emerald-500 font-mono">
            Zero Unauthorized Modifications
          </span>
        </div>
      )}

      {/* Horizontally Scrollable Hash-Chain Sequence */}
      <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neutral-800">
        <div className="flex items-center gap-2 min-w-max py-1">
          {blocks.map((block, idx) => {
            const isBlockTampered = block.tampered;
            const isInvalidFromHere = block.invalid_from_here;
            const isLast = idx === blocks.length - 1;

            return (
              <div key={block.block_id} className="flex items-center">
                {/* Block Card */}
                <div
                  className={`w-64 rounded-xl p-3 border font-mono transition-all duration-150 relative ${
                    isBlockTampered
                      ? "bg-charcoal border-2 border-crimson shadow-[0_0_25px_rgba(163,28,24,0.4)]"
                      : isInvalidFromHere
                      ? "bg-charcoal border border-crimson/70 shadow-[0_0_15px_rgba(163,28,24,0.25)]"
                      : "bg-charcoal border border-forest hover:border-emerald-900/80 shadow-[0_0_15px_rgba(6,17,12,0.8)]"
                  }`}
                >
                  {/* Top: Block ID & Timestamp */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                          isBlockTampered || isInvalidFromHere
                            ? "bg-crimson text-white"
                            : "bg-forest border border-emerald-900/60 text-emerald-400"
                        }`}
                      >
                        {block.block_id}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        {block.agent_id}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-neutral-500">
                      <Clock className="h-2.5 w-2.5" />
                      <span>{block.timestamp}</span>
                    </div>
                  </div>

                  {/* Logged Action Preview */}
                  <div className="mb-2.5">
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400 block">
                      Logged Agent Action
                    </span>
                    <p
                      className={`text-xs font-semibold truncate ${
                        isBlockTampered || isInvalidFromHere
                          ? "text-red-200"
                          : "text-neutral-200"
                      }`}
                      title={block.action}
                    >
                      {block.action}
                    </p>
                  </div>

                  {/* Hash Signatures Box */}
                  <div className="space-y-1 p-2 rounded bg-neutral-950/90 border border-neutral-800 text-[10px]">
                    <div className="flex items-center justify-between text-neutral-500">
                      <span>PREV PROOF:</span>
                      <span className="font-mono text-neutral-400">
                        {truncateHash(block.prev_hash)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">CURRENT:</span>
                      <span
                        className={`font-mono font-bold ${
                          isBlockTampered
                            ? "text-crimson animate-pulse"
                            : isInvalidFromHere
                            ? "text-red-300"
                            : "text-emerald-400"
                        }`}
                      >
                        {truncateHash(block.current_hash)}
                      </span>
                    </div>
                  </div>

                  {/* Tampered Indicator Tag */}
                  {isBlockTampered && (
                    <div className="mt-2 text-center text-[9px] font-bold text-white bg-crimson/30 py-0.5 rounded border border-crimson/60 uppercase tracking-wider">
                      SECRETLY MODIFIED
                    </div>
                  )}
                  {!isBlockTampered && isInvalidFromHere && (
                    <div className="mt-2 text-center text-[9px] font-semibold text-red-300/90 bg-crimson/10 py-0.5 rounded border border-crimson/30 uppercase tracking-wider">
                      BROKEN CHAIN LINK
                    </div>
                  )}
                </div>

                {/* Connecting Line / Arrow between consecutive blocks */}
                {!isLast && (
                  <div className="flex items-center px-1">
                    <div
                      className={`h-0.5 w-6 transition-colors duration-150 ${
                        blocks[idx + 1].invalid_from_here
                          ? "bg-crimson shadow-[0_0_8px_rgba(163,28,24,0.6)]"
                          : "bg-forest border-b border-emerald-900/60"
                      }`}
                    />
                    <ArrowRight
                      className={`h-3 w-3 -ml-1 flex-shrink-0 transition-colors duration-150 ${
                        blocks[idx + 1].invalid_from_here
                          ? "text-crimson"
                          : "text-emerald-600/70"
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
