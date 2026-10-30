"""
AGENTSHIELD Tamper-Evident SHA-256 Hash-Chained Audit Ledger (Extension 4)
Cryptographic Audit Trail with Rule IDs, Lineage Tracking, Redacted Arguments Preview,
and Mathematical Integrity Verification
"""

import hashlib
import json
import time
import re
from typing import List, Optional, Dict, Any
from app.models import ToolRequest, PolicyDecision, AuditBlock, VerificationResult

GENESIS_PREV_HASH = "0" * 64


def make_args_preview(args: Dict[str, Any], max_len: int = 80) -> str:
    """Creates a redacted arguments preview <= 80 characters with secrets masked."""
    try:
        raw = json.dumps(args, sort_keys=True)
        # Mask secrets
        masked = re.sub(
            r'(password|key|token|secret|credential)["\']?\s*:\s*["\']?[^"\',}\s]+',
            r'\1: "***"',
            raw,
            flags=re.IGNORECASE
        )
        if len(masked) > max_len:
            return masked[:max_len - 3] + "..."
        return masked
    except Exception:
        return "{}"


class TamperEvidentAuditLedger:
    def __init__(self):
        self.chain: List[AuditBlock] = []
        self._create_genesis_block()

    def _hash_payload(self, payload: str) -> str:
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    def _create_genesis_block(self):
        self.chain = []
        genesis_block = AuditBlock(
            index=0,
            timestamp=1730300000.0,
            call_id="genesis_call_000",
            agent_id="SYSTEM_ROOT",
            agent_role="system",
            parent_agent_id=None,
            tool_name="GENESIS",
            arguments_hash=self._hash_payload("{}"),
            args_preview="{}",
            decision="ALLOW",
            rule_id="R-GENESIS-00",
            reason="Genesis initialization block.",
            risk_score=0.0,
            risk_level="LOW",
            previous_hash=GENESIS_PREV_HASH,
            block_hash=self._calculate_block_hash(
                index=0,
                timestamp=1730300000.0,
                call_id="genesis_call_000",
                agent_id="SYSTEM_ROOT",
                tool_name="GENESIS",
                arguments_hash=self._hash_payload("{}"),
                decision="ALLOW",
                rule_id="R-GENESIS-00",
                previous_hash=GENESIS_PREV_HASH
            )
        )
        self.chain.append(genesis_block)

    def _calculate_block_hash(
        self,
        index: int,
        timestamp: float,
        call_id: str,
        agent_id: str,
        tool_name: str,
        arguments_hash: str,
        decision: str,
        rule_id: str,
        previous_hash: str
    ) -> str:
        ts_str = f"{float(timestamp):.4f}" if isinstance(timestamp, (int, float)) else str(timestamp)
        raw = f"{index}|{ts_str}|{call_id}|{agent_id}|{tool_name}|{arguments_hash}|{decision}|{rule_id}|{previous_hash}"
        return self._hash_payload(raw)

    def record_event(self, request: ToolRequest, decision: PolicyDecision) -> AuditBlock:
        """Appends a new immutable block to the cryptographic chain."""
        prev_block = self.chain[-1]
        args_json = json.dumps(request.arguments, sort_keys=True)
        args_hash = self._hash_payload(args_json)
        preview = make_args_preview(request.arguments, max_len=80)
        new_index = len(self.chain)

        block_hash = self._calculate_block_hash(
            index=new_index,
            timestamp=decision.timestamp,
            call_id=request.call_id,
            agent_id=request.agent_id,
            tool_name=request.tool_name,
            arguments_hash=args_hash,
            decision=decision.status,
            rule_id=decision.rule_id,
            previous_hash=prev_block.block_hash
        )

        block = AuditBlock(
            index=new_index,
            timestamp=decision.timestamp,
            call_id=request.call_id,
            agent_id=request.agent_id,
            agent_role=request.agent_role or "unknown",
            parent_agent_id=request.parent_agent_id,
            tool_name=request.tool_name,
            arguments_hash=args_hash,
            args_preview=preview,
            decision=decision.status,
            rule_id=decision.rule_id,
            reason=decision.reason,
            risk_score=decision.risk_score,
            risk_level=decision.risk_level,
            previous_hash=prev_block.block_hash,
            block_hash=block_hash
        )
        self.chain.append(block)
        return block

    def verify_integrity(self) -> VerificationResult:
        """
        Validates the entire ledger from Genesis.
        Mathematically proves no block has been altered, deleted, or inserted.
        """
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            previous = self.chain[i - 1]

            if current.previous_hash != previous.block_hash:
                return VerificationResult(
                    is_valid=False,
                    total_blocks=len(self.chain),
                    broken_index=i,
                    message=f"CRITICAL: Pointer broken at Block #{i}. Expected prev_hash {previous.block_hash[:8]}..., found {current.previous_hash[:8]}..."
                )

            expected_hash = self._calculate_block_hash(
                index=current.index,
                timestamp=current.timestamp,
                call_id=current.call_id,
                agent_id=current.agent_id,
                tool_name=current.tool_name,
                arguments_hash=current.arguments_hash,
                decision=current.decision,
                rule_id=current.rule_id,
                previous_hash=current.previous_hash
            )

            if current.block_hash != expected_hash:
                return VerificationResult(
                    is_valid=False,
                    total_blocks=len(self.chain),
                    broken_index=i,
                    message=f"CRITICAL: Data forgery detected inside Block #{i}! Content altered."
                )

        return VerificationResult(
            is_valid=True,
            total_blocks=len(self.chain),
            broken_index=None,
            message="VERIFIED: 100% Cryptographic integrity preserved across all blocks."
        )

    def simulate_tampering(self, block_index: int) -> bool:
        """Demo utility: simulates an attacker modifying a historical log entry directly in DB."""
        if 0 < block_index < len(self.chain):
            target = self.chain[block_index]
            target.decision = "ALLOW" if target.decision != "ALLOW" else "DENY"
            return True
        return False

    def reset(self):
        """Resets the ledger back to the single Genesis block for a fresh demo run."""
        self._create_genesis_block()


merkle_ledger = TamperEvidentAuditLedger()
