"use client";

import { useAuditChain } from "@/hooks/useAuditChain";
import {
  ShieldCheck,
  ShieldAlert,
  Link as LinkIcon,
  Link2Off,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Hash,
  Clock,
  Layers,
  RefreshCw,
  Cpu,
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
      toast.success("Chain Integrity Verified", {
        description: "All 5 SHA-256 Merkle hashes match cryptographically.",
        icon: <CheckCircle2 className="h-4 w-4 text-steel" />,
      });
    } else {
      toast.error("Cryptographic Tamper Alert", {
        description: res.message,
        icon: <AlertTriangle className="h-4 w-4 text-coral" />,
      });
    }
  };

  const handleToggleTampering = () => {
    toggleTampering();
    if (!isTampered) {
      toast.error("Data Tampering Simulated", {
        description: "Block #02 payload mutated. Cryptographic hash chain broken.",
        icon: <Link2Off className="h-4 w-4 text-coral" />,
      });
    } else {
      toast.success("Chain Restored", {
        description: "Original hash signature reinstated. Chain verified.",
        icon: <ShieldCheck className="h-4 w-4 text-steel" />,
      });
    }
  };

  const truncateHash = (hash: string) => {
    if (!hash || hash.length <= 16) return hash;
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
  };

  return (
    <div
      className="bg-charcoal border border-steel/20 rounded-xl p-4 shadow-[0_4px_25px_rgba(0,0,0,0.8)] font-mono relative overflow-hidden"
      style={{
        boxShadow: "0 0 25px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(146, 157, 167, 0.05)",
      }}
    >
      {/* Background ambient glow based on chain state */}
      <div
        className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none transition-colors duration-300 ${
          isTampered ? "bg-coral/20" : "bg-steel/10"
        }`}
      />

      {/* Header & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-steel/20">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors duration-150 ${
              isTampered
                ? "bg-coral/20 border-coral text-coral shadow-[0_0_15px_rgba(255,75,50,0.4)]"
                : "bg-neutral-900 border-steel/40 text-steel shadow-[0_0_15px_rgba(146,157,167,0.2)]"
            }`}
          >
            {isTampered ? (
              <Link2Off className="h-4 w-4 text-coral animate-pulse" />
            ) : (
              <Layers className="h-4 w-4 text-steel" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-neutral-100 uppercase tracking-wider">
                Cryptographic Audit Visualizer
              </h3>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-neutral-900 text-steel border border-steel/30 uppercase">
                SHA-256 Merkle Chain
              </span>
            </div>
            <p className="text-[10px] text-steel mt-0.5">
              Immutable ledger securing all AI agent tool invocations against unauthorized mutation.
            </p>
          </div>
        </div>

        {/* Dual Interactive Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Button 1: [Verify Integrity] */}
          <button
            onClick={handleVerifyClick}
            disabled={isVerifying}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider active:scale-[0.97] transition-all duration-100 ease-out cursor-pointer disabled:opacity-60 ${
              verificationResult.valid
                ? "bg-neutral-900 border border-steel/40 text-steel hover:border-steel hover:text-white shadow-[0_0_12px_rgba(0,0,0,0.5)]"
                : "bg-coral/20 border border-coral text-coral hover:bg-coral/30 shadow-[0_0_15px_rgba(255,75,50,0.35)]"
            }`}
          >
            {isVerifying ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : verificationResult.valid ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-steel" />
                <span>Verify Integrity</span>
              </>
            ) : (
              <>
                <ShieldAlert className="h-3.5 w-3.5 text-coral" />
                <span>Verify Integrity</span>
              </>
            )}
          </button>

          {/* Switch / Toggle: Simulate Data Tampering */}
          <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-900 border border-steel/25 hover:border-steel/60 cursor-pointer select-none active:scale-[0.97] transition-all duration-100">
            <span className="text-[11px] font-semibold text-neutral-300">
              Simulate Data Tampering
            </span>
            <div className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isTampered}
                onChange={handleToggleTampering}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-coral shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]" />
            </div>
          </label>
        </div>
      </div>

      {/* Alert Banner When Tamper Detected or Valid Banner */}
      {isTampered ? (
        <div className="mb-4 p-2.5 rounded-lg bg-coral/20 border border-coral text-red-100 flex items-center justify-between text-xs animate-[slideDownIn_180ms_cubic-bezier(0.23,1,0.32,1)] shadow-[0_0_20px_rgba(255,75,50,0.35)]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-coral flex-shrink-0 animate-pulse" />
            <span className="font-bold tracking-wide uppercase text-white">
              TAMPER DETECTED: Hash mismatch at Block #02
            </span>
          </div>
          <span className="text-[10px] bg-coral px-2.5 py-0.5 rounded text-white font-bold tracking-wider uppercase shadow-[0_0_8px_rgba(255,75,50,0.6)]">
            CHAIN BROKEN
          </span>
        </div>
      ) : (
        <div className="mb-4 p-2 rounded-lg bg-neutral-900/90 border border-steel/30 text-steel flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-steel flex-shrink-0" />
            <span className="font-semibold tracking-wide text-neutral-200">
              Integrity Verified: Chain Valid (5 Blocks Consistent)
            </span>
          </div>
          <span className="text-[10px] text-steel font-mono">
            Zero Discrepancies
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
                      ? "bg-charcoal border-2 border-coral shadow-[0_0_25px_rgba(255,75,50,0.4)]"
                      : isInvalidFromHere
                      ? "bg-charcoal border border-coral/70 shadow-[0_0_15px_rgba(255,75,50,0.25)]"
                      : "bg-charcoal border border-steel/25 hover:border-steel/60 shadow-[0_0_15px_rgba(0,0,0,0.6)]"
                  }`}
                >
                  {/* Top: Block ID & Timestamp */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                          isBlockTampered || isInvalidFromHere
                            ? "bg-coral text-white"
                            : "bg-neutral-900 border border-steel/30 text-steel"
                        }`}
                      >
                        {block.block_id}
                      </span>
                      <span className="text-[10px] text-steel">
                        {block.agent_id}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-steel/70">
                      <Clock className="h-2.5 w-2.5" />
                      <span>{block.timestamp}</span>
                    </div>
                  </div>

                  {/* Logged Action Preview */}
                  <div className="mb-2.5">
                    <span className="text-[9px] uppercase tracking-wider text-steel block">
                      Logged Action
                    </span>
                    <p
                      className={`text-xs font-semibold truncate ${
                        isBlockTampered || isInvalidFromHere
                          ? "text-coral"
                          : "text-neutral-200"
                      }`}
                      title={block.action}
                    >
                      {block.action}
                    </p>
                  </div>

                  {/* Hash Signatures Box */}
                  <div className="space-y-1 p-2 rounded bg-neutral-950/90 border border-steel/15 text-[10px]">
                    <div className="flex items-center justify-between text-steel">
                      <span>PREV HASH:</span>
                      <span className="font-mono text-neutral-400">
                        {truncateHash(block.prev_hash)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-steel">CURRENT:</span>
                      <span
                        className={`font-mono font-bold ${
                          isBlockTampered
                            ? "text-coral animate-pulse"
                            : isInvalidFromHere
                            ? "text-coral/80"
                            : "text-steel"
                        }`}
                      >
                        {truncateHash(block.current_hash)}
                      </span>
                    </div>
                  </div>

                  {/* Tampered Indicator Tag */}
                  {isBlockTampered && (
                    <div className="mt-2 text-center text-[9px] font-bold text-white bg-coral/30 py-0.5 rounded border border-coral/60 uppercase tracking-wider">
                      MUTATED PAYLOAD
                    </div>
                  )}
                  {!isBlockTampered && isInvalidFromHere && (
                    <div className="mt-2 text-center text-[9px] font-semibold text-coral/90 bg-coral/10 py-0.5 rounded border border-coral/30 uppercase tracking-wider">
                      INVALID PREV HASH LINK
                    </div>
                  )}
                </div>

                {/* Connecting Line / Arrow between consecutive blocks */}
                {!isLast && (
                  <div className="flex items-center px-1">
                    <div
                      className={`h-0.5 w-6 transition-colors duration-150 ${
                        blocks[idx + 1].invalid_from_here
                          ? "bg-coral shadow-[0_0_8px_rgba(255,75,50,0.6)]"
                          : "bg-neutral-800 border-b border-steel/30"
                      }`}
                    />
                    <ArrowRight
                      className={`h-3 w-3 -ml-1 flex-shrink-0 transition-colors duration-150 ${
                        blocks[idx + 1].invalid_from_here
                          ? "text-coral"
                          : "text-steel/60"
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
