"use client";

import { useState, useCallback, useMemo } from "react";
import type { AuditBlock, AuditVerificationResponse } from "@/types/audit";

const ORIGINAL_BLOCKS: AuditBlock[] = [
  {
    block_number: 1,
    block_id: "#01",
    timestamp: "20:44:02",
    full_timestamp: "2026-10-30T20:44:02.110Z",
    action: "System Started: Policy Engine Active",
    agent_id: "Orchestrator-Alpha",
    prev_hash: "0x0000000000000000",
    current_hash: "0x9c42b781f208aa1b44e0192a83f9",
  },
  {
    block_number: 2,
    block_id: "#02",
    timestamp: "20:44:38",
    full_timestamp: "2026-10-30T20:44:38.450Z",
    action: "read_file: /etc/nginx/nginx.conf",
    agent_id: "Scout-Agent-09",
    prev_hash: "0x9c42b781f208aa1b44e0192a83f9",
    current_hash: "0x7a89e1f48201cdba990145ef2081",
  },
  {
    block_number: 3,
    block_id: "#03",
    timestamp: "20:45:01",
    full_timestamp: "2026-10-30T20:45:01.890Z",
    action: "web_search: CVE-2026-4418 mitigation",
    agent_id: "Worker-Agent-01",
    prev_hash: "0x7a89e1f48201cdba990145ef2081",
    current_hash: "0x3f55092dae4109cf887201bb7442",
  },
  {
    block_number: 4,
    block_id: "#04",
    timestamp: "20:45:12",
    full_timestamp: "2026-10-30T20:45:12.300Z",
    action: "execute_bash: rm -rf /backups",
    agent_id: "Worker-Agent-01",
    prev_hash: "0x3f55092dae4109cf887201bb7442",
    current_hash: "0x51c72018ea6541bb09204481ae67",
  },
  {
    block_number: 5,
    block_id: "#05",
    timestamp: "20:45:25",
    full_timestamp: "2026-10-30T20:45:25.900Z",
    action: "quarantine_agent: isolated_PID_4812",
    agent_id: "SOC_ADMIN_01",
    prev_hash: "0x51c72018ea6541bb09204481ae67",
    current_hash: "0x88f110bcde890911776532014fed",
  },
];

const MUTATED_HASH_BLOCK_2 = "0xdeadbeef1337c0debadc0ffeef00";

export function useAuditChain() {
  const [isTampered, setIsTampered] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<AuditVerificationResponse>({
    valid: true,
    total_blocks: 5,
    tampered_block: null,
    message: "Integrity Verified: Chain Valid",
    verified_at: "2026-10-30T20:45:25.900Z",
  });

  // Calculate dynamic block representations based on tampering toggle
  const blocks = useMemo(() => {
    return ORIGINAL_BLOCKS.map((block) => {
      if (!isTampered) {
        return {
          ...block,
          tampered: false,
          invalid_from_here: false,
        };
      }

      // Block #02 was mutated deliberately
      if (block.block_number === 2) {
        return {
          ...block,
          current_hash: MUTATED_HASH_BLOCK_2,
          tampered: true,
          invalid_from_here: true,
        };
      }

      // Block #03 and onwards inherit a broken prev_hash mismatch
      if (block.block_number > 2) {
        return {
          ...block,
          invalid_from_here: true,
          tampered: false,
        };
      }

      return {
        ...block,
        tampered: false,
        invalid_from_here: false,
      };
    });
  }, [isTampered]);

  // Toggle tampering simulation
  const toggleTampering = useCallback(() => {
    setIsTampered((prev) => {
      const next = !prev;
      if (next) {
        setVerificationResult({
          valid: false,
          total_blocks: 5,
          tampered_block: {
            block_number: 2,
            block_id: "#02",
            expected_hash: "0x7a89e1f48201cdba",
            actual_hash: MUTATED_HASH_BLOCK_2,
          },
          message: "TAMPER DETECTED: Hash mismatch at Block #02",
          verified_at: new Date().toISOString(),
        });
      } else {
        setVerificationResult({
          valid: true,
          total_blocks: 5,
          tampered_block: null,
          message: "Integrity Verified: Chain Valid",
          verified_at: new Date().toISOString(),
        });
      }
      return next;
    });
  }, []);

  // Verification routine (GET /api/audit/verify with offline fallback)
  const verifyIntegrity = useCallback(async () => {
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/audit/verify?tampered=${isTampered}`);
      if (res.ok) {
        const data: AuditVerificationResponse = await res.json();
        setVerificationResult(data);
        return data;
      }
    } catch {
      // Offline fallback evaluation
    } finally {
      // Subtle delay under 200ms for tactile button feedback
      setTimeout(() => {
        setIsVerifying(false);
      }, 160);
    }

    const fallback: AuditVerificationResponse = isTampered
      ? {
          valid: false,
          total_blocks: 5,
          tampered_block: {
            block_number: 2,
            block_id: "#02",
            expected_hash: "0x7a89e1f48201cdba",
            actual_hash: MUTATED_HASH_BLOCK_2,
          },
          message: "TAMPER DETECTED: Hash mismatch at Block #02",
          verified_at: new Date().toISOString(),
        }
      : {
          valid: true,
          total_blocks: 5,
          tampered_block: null,
          message: "Integrity Verified: Chain Valid",
          verified_at: new Date().toISOString(),
        };

    setVerificationResult(fallback);
    return fallback;
  }, [isTampered]);

  return {
    blocks,
    isTampered,
    isVerifying,
    verificationResult,
    toggleTampering,
    verifyIntegrity,
  };
}
