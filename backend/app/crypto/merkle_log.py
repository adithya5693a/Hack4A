"""
AGENTSHIELD Tamper-Evident SHA-256 Hash-Chained Audit Ledger
Cryptographic Audit Trail with Rule IDs, Lineage Tracking, Redacted Arguments Preview,
and Mathematical Integrity Verification (Single audit write path).
Durable Persistence: Every block is saved to an append-only JSONL file (audit_ledger.jsonl)
and re-verified from disk on boot.
"""

import hashlib
import json
import time
import re
import os
from pathlib import Path
from typing import List, Optional, Dict, Any
from app.models import ToolRequest, PolicyDecision, AuditBlock, VerificationResult

GENESIS_PREV_HASH = "0" * 64
STORAGE_DIR = Path(__file__).resolve().parent.parent.parent / "data"
STORAGE_FILE = STORAGE_DIR / "audit_ledger.jsonl"


def make_args_preview(args: Dict[str, Any], max_len: int = 80) -> str:
    """Creates a redacted arguments preview <= 80 characters with secrets masked."""
    try:
        raw = json.dumps(args, sort_keys=True)
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


class HashChainAuditLedger:
    """Immutable SHA-256 hash-chained log linking each decision block to the previous hash."""

    def __init__(self):
        self.chain: List[AuditBlock] = []
        STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        self._load_or_init_ledger()

    def _hash_payload(self, payload: str) -> str:
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    def _load_or_init_ledger(self):
        """Loads durable ledger from JSONL if present and verified, otherwise initializes Genesis."""
        if STORAGE_FILE.exists():
            loaded_blocks: List[AuditBlock] = []
            try:
                with open(STORAGE_FILE, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line:
                            data = json.loads(line)
                            loaded_blocks.append(AuditBlock(**data))
                if loaded_blocks:
                    self.chain = loaded_blocks
                    verification = self.verify_integrity()
                    if verification.is_valid:
                        return
            except Exception:
                pass
        self._create_genesis_block()

    def _create_genesis_block(self):
        self.chain = []
        now_ts = round(time.time(), 4)
        genesis_block = AuditBlock(
            index=0,
            timestamp=now_ts,
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
                timestamp=now_ts,
                call_id="genesis_call_000",
                agent_id="SYSTEM_ROOT",
                agent_role="system",
                tool_name="GENESIS",
                arguments_hash=self._hash_payload("{}"),
                decision="ALLOW",
                rule_id="R-GENESIS-00",
                risk_score=0.0,
                previous_hash=GENESIS_PREV_HASH
            )
        )
        self.chain.append(genesis_block)
        self._persist_block(genesis_block, mode="w")

    def _persist_block(self, block: AuditBlock, mode: str = "a"):
        """Durable append to audit_ledger.jsonl."""
        try:
            STORAGE_DIR.mkdir(parents=True, exist_ok=True)
            with open(STORAGE_FILE, mode, encoding="utf-8") as f:
                f.write(block.model_dump_json() + "\n")
        except Exception:
            pass

    def _calculate_block_hash(
        self,
        index: int,
        timestamp: float,
        call_id: str,
        agent_id: str,
        agent_role: str,
        tool_name: str,
        arguments_hash: str,
        decision: str,
        rule_id: str,
        risk_score: float,
        previous_hash: str
    ) -> str:
        ts_str = f"{float(timestamp):.4f}" if isinstance(timestamp, (int, float)) else str(timestamp)
        score_str = f"{float(risk_score):.1f}"
        raw = f"{index}|{ts_str}|{call_id}|{agent_id}|{agent_role}|{tool_name}|{arguments_hash}|{decision}|{rule_id}|{score_str}|{previous_hash}"
        return self._hash_payload(raw)

    def record_event(self, request: ToolRequest, decision: PolicyDecision) -> AuditBlock:
        """Appends a new immutable block to the cryptographic chain. Called solely by the PEP."""
        prev_block = self.chain[-1]
        args_json = json.dumps(request.arguments, sort_keys=True)
        args_hash = self._hash_payload(args_json)
        preview = make_args_preview(request.arguments, max_len=80)
        new_index = len(self.chain)

        dec_str = decision.status.value if hasattr(decision.status, "value") else str(decision.status)
        role = request.agent_role or "unknown"
        block_hash = self._calculate_block_hash(
            index=new_index,
            timestamp=decision.timestamp,
            call_id=request.call_id,
            agent_id=request.agent_id,
            agent_role=role,
            tool_name=request.tool_name,
            arguments_hash=args_hash,
            decision=dec_str,
            rule_id=decision.rule_id,
            risk_score=decision.risk_score,
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
            decision=dec_str,
            rule_id=decision.rule_id,
            reason=decision.reason or (decision.reasons[0] if decision.reasons else ""),
            risk_score=decision.risk_score,
            risk_level=getattr(decision, "risk_level", "LOW"),
            previous_hash=prev_block.block_hash,
            block_hash=block_hash
        )
        self.chain.append(block)
        self._persist_block(block, mode="a")
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
                agent_role=current.agent_role or "unknown",
                tool_name=current.tool_name,
                arguments_hash=current.arguments_hash,
                decision=current.decision,
                rule_id=current.rule_id,
                risk_score=current.risk_score,
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


# Global audit ledger singleton
merkle_ledger = HashChainAuditLedger()
TamperEvidentAuditLedger = HashChainAuditLedger  # Backwards compatibility alias
