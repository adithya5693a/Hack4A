"use client";

import { useState, useCallback, useEffect } from "react";
import type { AuditBlock, BackendAuditBlock, AuditVerificationResponse } from "@/types/audit";
import { BACKEND_URL } from "@/lib/api-config";

export function useAuditChain() {
  const [blocks, setBlocks] = useState<AuditBlock[]>([]);
  const [isTampered, setIsTampered] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<AuditVerificationResponse>({
    valid: false,
    total_blocks: 0,
    tampered_block: null,
    message: "Unverified (Click 'Verify Log Integrity')",
    verified_at: "",
  });

  const mapBackendBlock = (b: BackendAuditBlock, brokenIndex: number | null): AuditBlock => {
    let formattedTime = "00:00:00";
    let fullIso = new Date().toISOString();
    if (typeof b.timestamp === "number") {
      const d = new Date(b.timestamp > 1e11 ? b.timestamp : b.timestamp * 1000);
      formattedTime = d.toTimeString().split(" ")[0];
      fullIso = d.toISOString();
    } else if (typeof b.timestamp === "string") {
      try {
        const d = new Date(b.timestamp);
        formattedTime = d.toTimeString().split(" ")[0];
        fullIso = d.toISOString();
      } catch {
        formattedTime = b.timestamp;
      }
    }

    const isBlockTampered = brokenIndex !== null && b.index === brokenIndex;
    const isInvalidFromHere = brokenIndex !== null && b.index >= brokenIndex;

    return {
      index: b.index,
      block_number: b.index,
      block_id: `#0${b.index}`,
      timestamp: formattedTime,
      full_timestamp: fullIso,
      call_id: b.call_id,
      agent_id: b.agent_id,
      agent_role: b.agent_role,
      parent_agent_id: b.parent_agent_id,
      tool_name: b.tool_name,
      args_preview: b.args_preview,
      decision: b.decision,
      rule_id: b.rule_id,
      reason: b.reason,
      risk_score: b.risk_score,
      risk_level: b.risk_level,
      prev_hash: b.previous_hash,
      current_hash: b.block_hash,
      tampered: isBlockTampered,
      invalid_from_here: isInvalidFromHere,
    };
  };

  const fetchChain = useCallback(async (brokenIndex: number | null = null) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/audit/chain`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.chain)) {
          const mapped = data.chain.map((b: BackendAuditBlock) => mapBackendBlock(b, brokenIndex));
          setBlocks(mapped);
          return mapped;
        }
      }
    } catch (err) {
      console.warn("[Audit] Could not fetch real chain from backend:", err);
    }
    return [];
  }, []);

  const verifyIntegrity = useCallback(async (): Promise<AuditVerificationResponse> => {
    setIsVerifying(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/audit/verify`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        const isValid = !!data.is_valid;
        const brokenIdx = data.broken_index !== undefined ? data.broken_index : null;

        const result: AuditVerificationResponse = {
          valid: isValid,
          total_blocks: data.total_blocks || 1,
          broken_index: brokenIdx,
          tampered_block: !isValid && brokenIdx !== null
            ? {
                block_number: brokenIdx,
                block_id: `#0${brokenIdx}`,
                expected_hash: data.expected_hash || "mismatch",
                actual_hash: data.actual_hash || "mismatch",
              }
            : null,
          message: data.message || (isValid ? "Integrity Verified: Chain Valid" : "Hash mismatch detected"),
          verified_at: new Date().toISOString(),
        };

        setVerificationResult(result);
        setIsTampered(!isValid);
        await fetchChain(brokenIdx);
        return result;
      }
    } catch (err) {
      console.warn("[Audit] Verify failed:", err);
    } finally {
      setIsVerifying(false);
    }

    const fallback: AuditVerificationResponse = {
      valid: false,
      total_blocks: 0,
      broken_index: null,
      message: "Verification failed (Backend offline)",
      verified_at: new Date().toISOString(),
    };
    setVerificationResult(fallback);
    return fallback;
  }, [fetchChain]);

  const toggleTampering = useCallback(async () => {
    const adminToken = (typeof window !== "undefined" && localStorage.getItem("agentshield_admin_session")) || "admin-secret-session-90214";
    if (!isTampered) {
      // Inject real tamper into block index 1 on the backend
      try {
        const res = await fetch(`${BACKEND_URL}/api/audit/tamper?block_index=1`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${adminToken}`,
          },
        });
        if (res.ok) {
          setIsTampered(true);
          await verifyIntegrity();
          return;
        }
      } catch (err) {
        console.warn("[Audit] Tamper call failed:", err);
      }
    } else {
      // Reset backend to clean state
      try {
        const res = await fetch(`${BACKEND_URL}/api/reset`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${adminToken}`,
          },
        });
        if (res.ok) {
          setIsTampered(false);
          await fetchChain(null);
          await verifyIntegrity();
          return;
        }
      } catch (err) {
        console.warn("[Audit] Reset call failed:", err);
      }
    }
  }, [isTampered, fetchChain, verifyIntegrity]);

  const resetLedger = useCallback(async () => {
    const adminToken = (typeof window !== "undefined" && localStorage.getItem("agentshield_admin_session")) || "admin-secret-session-90214";
    try {
      const res = await fetch(`${BACKEND_URL}/api/reset`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${adminToken}`,
        },
      });
      if (res.ok) {
        setIsTampered(false);
        await fetchChain(null);
        await verifyIntegrity();
      }
    } catch (err) {
      console.warn("[Audit] Reset failed:", err);
    }
  }, [fetchChain, verifyIntegrity]);

  // Initial load
  useEffect(() => {
    fetchChain(null);
  }, [fetchChain]);

  return {
    blocks,
    isTampered,
    isVerifying,
    verificationResult,
    toggleTampering,
    verifyIntegrity,
    refreshChain: fetchChain,
    resetLedger,
  };
}
