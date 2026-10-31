"use client";

import { useAuditChain } from "@/hooks/useAuditChain";
import {
  ShieldCheck,
  ShieldAlert,
  Link2Off,
  CheckCircle2,
  AlertTriangle,
  Layers,
  RefreshCw,
  RotateCcw,
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
    resetLedger,
  } = useAuditChain();

  const handleVerifyClick = async () => {
    const res = await verifyIntegrity();
    if (res.valid) {
      toast.success("Log Integrity Verified", {
        description: res.message || "All cryptographic activity records match mathematically.",
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
      });
    } else {
      toast.error("Tamper Alert Detected", {
        description: res.message || `Hash mismatch detected at block #${res.broken_index}!`,
        icon: <AlertTriangle className="h-4 w-4 text-crimson" />,
      });
    }
  };

  const handleToggleTampering = async () => {
    await toggleTampering();
    if (!isTampered) {
      toast.error("Log Tampering Injected", {
        description: "Block #1 payload modified on PEP. Hash chain broken.",
        icon: <Link2Off className="h-4 w-4 text-crimson" />,
      });
    } else {
      toast.success("Log Integrity Restored", {
        description: "Audit ledger restored to valid cryptographic state.",
        icon: <ShieldCheck className="h-4 w-4 text-emerald-400" />,
      });
    }
  };

  const handleResetLedger = async () => {
    await resetLedger();
    toast.success("Ledger Reset to Genesis", {
      description: "Audit chain, outbox, and PEP metrics cleared.",
    });
  };

  const truncateHash = (hash: string) => {
    if (!hash || hash.length <= 16) return hash || "0x0";
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
                SHA-256 HASH CHAIN
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-0.5">
              Every decision is mathematically chained. Any unauthorized edit breaks the chain immediately.
            </p>
          </div>
        </div>

        {/* Interactive Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Button 1: [Verify Log Integrity] */}
          <button
            onClick={handleVerifyClick}
            disabled={isVerifying}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider active:scale-[0.97] transition-all duration-100 ease-out cursor-pointer disabled:opacity-60 ${
              isTampered
                ? "bg-crimson/20 border border-crimson text-red-200 hover:bg-crimson/30 shadow-[0_0_12px_rgba(163,28,24,0.3)]"
                : verificationResult.valid
                ? "bg-forest border border-emerald-800/90 text-emerald-300 hover:border-emerald-600 hover:bg-emerald-950/40 shadow-[0_0_12px_rgba(6,17,12,0.8)]"
                : "bg-neutral-900 border border-neutral-700 text-neutral-200 hover:border-neutral-500"
            }`}
          >
            {isVerifying ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Checking...</span>
              </>
            ) : isTampered ? (
              <>
                <ShieldAlert className="h-3.5 w-3.5 text-crimson" />
                <span>[Chain Broken - Recheck]</span>
              </>
            ) : verificationResult.valid ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>[Integrity Verified]</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-neutral-400" />
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

          {/* Reset button */}
          <button
            onClick={handleResetLedger}
            title="Reset ledger to Genesis"
            className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 cursor-pointer transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Alert Banner When Tamper Detected, Valid Banner, or Unverified Banner */}
      {isTampered ? (
        <div className="mb-4 p-2.5 rounded-lg bg-crimson/20 border border-crimson text-red-100 flex items-center justify-between text-xs animate-[slideDownIn_180ms_cubic-bezier(0.23,1,0.32,1)] shadow-[0_0_20px_rgba(163,28,24,0.35)]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-crimson flex-shrink-0 animate-pulse" />
            <span className="font-bold tracking-wide uppercase text-white">
              {verificationResult.message || "TAMPER DETECTED: Hash chain broken at Block #01!"}
            </span>
          </div>
          <span className="text-[10px] bg-crimson px-2.5 py-0.5 rounded text-white font-bold tracking-wider uppercase shadow-[0_0_8px_rgba(163,28,24,0.6)]">
            CHAIN BROKEN
          </span>
        </div>
      ) : verificationResult.valid ? (
        <div className="mb-4 p-2 rounded-lg bg-forest border border-emerald-900/60 text-emerald-400 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
            <span className="font-semibold tracking-wide text-neutral-200">
              {verificationResult.message || `Log Integrity Verified: All ${blocks.length} Entries Mathematically Intact`}
            </span>
          </div>
          <span className="text-[10px] text-emerald-500 font-mono">
            Total Blocks: {blocks.length}
          </span>
        </div>
      ) : (
        <div className="mb-4 p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 text-neutral-500 flex-shrink-0" />
            <span className="font-medium tracking-wide text-neutral-300">
              {verificationResult.message || "Ledger Unverified — Click '[Verify Log Integrity]' to inspect cryptographic chain continuity."}
            </span>
          </div>
          <span className="text-[10px] text-neutral-500 font-mono">
            {blocks.length} Blocks Pending Check
          </span>
        </div>
      )}

      {/* Horizontally Scrollable Hash-Chain Sequence */}
      <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neutral-800">
        <div className="flex items-center gap-2 min-w-max py-1">
          {blocks.length === 0 ? (
            <div className="p-4 text-xs text-neutral-500 font-mono">
              Waiting for ledger blocks...
            </div>
          ) : (
            blocks.map((block) => {
              const isBlockTampered = block.tampered;
              const isInvalidFromHere = block.invalid_from_here;
              const isAllow = block.decision === "ALLOW";

              return (
                <div key={block.block_id + block.call_id} className="flex items-center">
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
                        <span className="text-[10px] text-neutral-400 truncate max-w-[100px]">
                          {block.agent_id}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-neutral-400">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            isAllow
                              ? "bg-forest text-emerald-400 border border-emerald-900/60"
                              : "bg-crimson text-white"
                          }`}
                        >
                          {block.decision}
                        </span>
                      </div>
                    </div>

                    {/* Action & Rule */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-neutral-200 truncate">
                          {block.tool_name}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {block.rule_id}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-0.5 truncate" title={block.args_preview}>
                        {block.args_preview}
                      </p>
                    </div>

                    {/* Hashes: Prev & Current */}
                    <div className="pt-2 border-t border-neutral-800 space-y-1 text-[10px]">
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">Previous Link:</span>
                        <span className="text-neutral-400 font-mono">
                          {truncateHash(block.prev_hash)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">Block Hash:</span>
                        <span
                          className={`font-mono font-semibold ${
                            isBlockTampered ? "text-crimson font-bold" : "text-neutral-300"
                          }`}
                        >
                          {truncateHash(block.current_hash)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
