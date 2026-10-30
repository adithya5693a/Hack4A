"""
AGENTSHIELD Policy Enforcement Point (PEP) & MCP Gateway
Strictly Fail-Closed Engine enforcing Server-Side Agent Identity (R-IDENTITY-01),
Egress Allowlisting (R-EGRESS-01), Taint-Tracking (R-TAINT-01), RBAC (R-RBAC-01),
and Human-in-the-Loop Approvals (120s default timeout).
"""

import asyncio
import os
from typing import Dict, Any, Optional, Callable
from app.models import ToolRequest, PolicyDecision, SystemMetrics
from app.crypto.signer import tool_signer
from app.crypto.merkle_log import make_args_preview
from app.agent.tools import (
    TOOLS_REGISTRY,
    AGENT_REGISTRY,
    ROLE_PERMISSIONS,
    EMAIL_ALLOWLIST
)

# In-memory approval events dictionary: call_id -> asyncio.Event
PENDING_APPROVAL_EVENTS: Dict[str, asyncio.Event] = {}
PENDING_APPROVAL_DECISIONS: Dict[str, str] = {}

# Global WebSocket broadcaster callback (set by main.py)
ws_broadcast_hook: Optional[Callable[[Dict[str, Any]], Any]] = None


class AgentShieldGateway:
    def __init__(self):
        self.metrics = {
            "legitimate_tasks_run": 0,
            "legitimate_tasks_allowed": 0,
            "false_blocks": 0,
            "attacks_run": 0,
            "attacks_compromised_shield_off": 0,
            "attacks_blocked_shield_on": 0,
            "approvals_required": 0,
            "approvals_granted": 0,
            "approvals_rejected": 0,
            "chain_integrity": True
        }

    def evaluate_risk(self, request: ToolRequest) -> PolicyDecision:
        """
        Evaluates incoming tool call against security policies.
        Strictly Fail-Closed: wraps all logic in try/except and defaults to DENY.
        """
        try:
            # 1. Rule R-IDENTITY-01: Server-Side Agent Registry Lookup (Anti-Spoofing)
            if request.agent_id not in AGENT_REGISTRY:
                return PolicyDecision(
                    call_id=request.call_id,
                    status="DENY",
                    rule_id="R-IDENTITY-01",
                    risk_score=100.0,
                    risk_level="CRITICAL",
                    reason=f"IDENTITY VIOLATION: Unregistered agent_id '{request.agent_id}' denied access."
                )

            # Server dictates the true role; ignore client-provided role
            actual_role = AGENT_REGISTRY[request.agent_id]["role"]
            request.agent_role = actual_role  # Ensure verified role is used downstream

            tool_name = request.tool_name
            args = request.arguments

            # 2. Rule R-REG-01: Tool Existence & Registry Check
            if tool_name not in TOOLS_REGISTRY:
                return PolicyDecision(
                    call_id=request.call_id,
                    status="DENY",
                    rule_id="R-REG-01",
                    risk_score=100.0,
                    risk_level="CRITICAL",
                    reason=f"SECURITY ALERT: Unregistered shadow tool '{tool_name}' blocked!"
                )

            # 3. Rule R-SIG-01: Cryptographic Tool Manifest Signature Check (Extension 3)
            tool_meta = TOOLS_REGISTRY[tool_name]
            is_authentic, msg = tool_signer.verify_tool(
                tool_name, tool_meta["schema"], tool_meta["risk_tier"], tool_meta.get("signature", "")
            )
            if not is_authentic:
                return PolicyDecision(
                    call_id=request.call_id,
                    status="DENY",
                    rule_id="R-SIG-01",
                    risk_score=100.0,
                    risk_level="CRITICAL",
                    reason=f"CRYPTOGRAPHIC ALERT: {msg}"
                )

            # 4. Rule R-TAINT-01: Provenance-Based Taint Guard
            # When the agent is tainted:
            # DENY: execute_bash, send_email, admin tools, and reads of sensitive files.
            # ALLOW: safe read-only calls (read_document of non-sensitive files, web_search, read-only SQL).
            if request.tainted:
                if tool_name in ["execute_bash", "send_email", "rotate_encryption_keys"]:
                    return PolicyDecision(
                        call_id=request.call_id,
                        status="DENY",
                        rule_id="R-TAINT-01",
                        risk_score=98.0,
                        risk_level="CRITICAL",
                        reason=f"TAINT ALERT: Agent context contaminated by untrusted data. Outbound action '{tool_name}' denied."
                    )
                if tool_name == "read_document":
                    target_file = str(args.get("filename", "")).lower()
                    if any(sens in target_file for sens in ["credential", "secret", "password", ".env", "token"]):
                        return PolicyDecision(
                            call_id=request.call_id,
                            status="DENY",
                            rule_id="R-TAINT-01",
                            risk_score=99.0,
                            risk_level="CRITICAL",
                            reason=f"TAINT ALERT: Tainted agent attempted sensitive file access '{target_file}'. Denied."
                        )

            # 5. Rule R-EGRESS-01 & R-EMAIL-01: Email Exfiltration & Corporate Egress Guard
            if tool_name == "send_email":
                recipient = str(args.get("to", "")).strip().lower()
                # Check egress allowlist
                if recipient not in [e.lower() for e in EMAIL_ALLOWLIST]:
                    return PolicyDecision(
                        call_id=request.call_id,
                        status="DENY",
                        rule_id="R-EGRESS-01",
                        risk_score=95.0,
                        risk_level="CRITICAL",
                        reason=f"DATA EXFILTRATION PREVENTED: Recipient '{recipient}' is not on the corporate egress allowlist."
                    )
                # Allowlisted recipient from untainted trusted context requires human confirmation
                return PolicyDecision(
                    call_id=request.call_id,
                    status="REQUIRE_APPROVAL",
                    rule_id="R-EMAIL-01",
                    risk_score=60.0,
                    risk_level="MEDIUM",
                    reason=f"Outbound email to allowlisted recipient '{recipient}' requires human authorization."
                )

            # 6. Rule R-RBAC-01: Role-Based Tool Permission Profiles (Brochure Requirement)
            allowed_tools = ROLE_PERMISSIONS.get(actual_role, [])
            if tool_name not in allowed_tools:
                return PolicyDecision(
                    call_id=request.call_id,
                    status="DENY",
                    rule_id="R-RBAC-01",
                    risk_score=90.0,
                    risk_level="CRITICAL",
                    reason=f"PRIVILEGE VIOLATION: Role '{actual_role}' is not authorized to invoke '{tool_name}'."
                )

            # 7. Rule R-SENSITIVE-01: Unauthorized Sensitive-Data Access Guard
            if tool_name == "read_document":
                target_file = str(args.get("filename", "")).lower()
                if any(sens in target_file for sens in ["credential", "secret", "password", ".env", "token"]):
                    if actual_role != "admin":
                        return PolicyDecision(
                            call_id=request.call_id,
                            status="DENY",
                            rule_id="R-SENSITIVE-01",
                            risk_score=95.0,
                            risk_level="CRITICAL",
                            reason=f"CONFIDENTIAL DATA ALERT: Role '{actual_role}' attempted to access sensitive file '{target_file}'."
                        )

            # 8. Rule R-BASH-01 & R-APPROVAL-01: Shell Execution High-Impact Guard
            if tool_name == "execute_bash":
                command = str(args.get("command", ""))
                # Immediate DENY on malicious payloads or reverse shells
                if any(mal in command for mal in ["curl ", "wget ", "chmod 777", "evil.com", "malware", "/dev/tcp", ":(){ :|:& };:"]):
                    return PolicyDecision(
                        call_id=request.call_id,
                        status="DENY",
                        rule_id="R-BASH-01",
                        risk_score=99.0,
                        risk_level="CRITICAL",
                        reason=f"MALICIOUS COMMAND: Malicious shell pattern detected in '{command}'."
                    )
                # Legitimate high-impact shell requires human approval
                return PolicyDecision(
                    call_id=request.call_id,
                    status="REQUIRE_APPROVAL",
                    rule_id="R-APPROVAL-01",
                    risk_score=75.0,
                    risk_level="CRITICAL",
                    reason=f"Tier 3 Bash execution requires human administrator confirmation ('{command}')."
                )

            # 9. Rule R-SQL-01 & R-SQL-02: Database Mutation High-Impact Guard
            if tool_name == "query_database":
                sql = str(args.get("sql", "")).upper()
                if any(kw in sql for kw in ["DROP", "DELETE", "UPDATE", "ALTER", "TRUNCATE"]):
                    if actual_role == "worker":
                        return PolicyDecision(
                            call_id=request.call_id,
                            status="DENY",
                            rule_id="R-RBAC-01",
                            risk_score=90.0,
                            risk_level="CRITICAL",
                            reason="PRIVILEGE VIOLATION: Role 'worker' cannot execute destructive database mutations."
                        )
                    return PolicyDecision(
                        call_id=request.call_id,
                        status="REQUIRE_APPROVAL",
                        rule_id="R-SQL-01",
                        risk_score=85.0,
                        risk_level="CRITICAL",
                        reason=f"High-impact database mutation detected ({sql[:30]}...). Approval needed."
                    )
                return PolicyDecision(
                    call_id=request.call_id,
                    status="ALLOW",
                    rule_id="R-SQL-02",
                    risk_score=15.0,
                    risk_level="LOW",
                    reason="Tier 2 Read-Only query permitted with audit."
                )

            # 10. Rule R-SAFE-01: Tier 1 Safe Read Operations
            if tool_name in ["read_document", "web_search"]:
                return PolicyDecision(
                    call_id=request.call_id,
                    status="ALLOW",
                    rule_id="R-SAFE-01",
                    risk_score=5.0,
                    risk_level="LOW",
                    reason="Tier 1 Safe Read operation permitted."
                )

            # 11. Rule R-ADMIN-01: Admin Key Rotation Tool
            if tool_name == "rotate_encryption_keys" and actual_role in ["admin", "system"]:
                return PolicyDecision(
                    call_id=request.call_id,
                    status="REQUIRE_APPROVAL",
                    rule_id="R-ADMIN-01",
                    risk_score=80.0,
                    risk_level="CRITICAL",
                    reason="Cryptographic root key rotation requires human authorization."
                )

            # 12. Rule R-DEFAULT-DENY: Fail-Closed Default
            return PolicyDecision(
                call_id=request.call_id,
                status="DENY",
                rule_id="R-DEFAULT-DENY",
                risk_score=100.0,
                risk_level="CRITICAL",
                reason="FAIL-CLOSED: Unrecognized tool configuration denied by default policy."
            )

        except Exception as e:
            # 13. Rule R-FAIL-CLOSED: Exception Safety Net
            return PolicyDecision(
                call_id=request.call_id,
                status="DENY",
                rule_id="R-FAIL-CLOSED",
                risk_score=100.0,
                risk_level="CRITICAL",
                reason=f"FAIL-CLOSED: Internal PEP exception occurred: {str(e)}"
            )

    async def intercept(self, request: ToolRequest, timeout: Optional[float] = None) -> PolicyDecision:
        """
        Intercepts tool call. If high risk, pauses execution and awaits human approval.
        Pushes APPROVAL_REQUIRED event over WebSocket to frontend.
        Default timeout is 120.0 seconds (overrideable via APPROVAL_TIMEOUT env var).
        """
        if timeout is None:
            timeout = float(os.getenv("APPROVAL_TIMEOUT", "120.0"))

        decision = self.evaluate_risk(request)

        if decision.status == "REQUIRE_APPROVAL":
            self.metrics["approvals_required"] += 1
            event = asyncio.Event()
            PENDING_APPROVAL_EVENTS[request.call_id] = event

            # Broadcast APPROVAL_REQUIRED to frontend via hook
            if ws_broadcast_hook:
                try:
                    await ws_broadcast_hook({
                        "event": "APPROVAL_REQUIRED",
                        "call_id": request.call_id,
                        "agent_id": request.agent_id,
                        "tool_name": request.tool_name,
                        "arguments": request.arguments,
                        "args_preview": make_args_preview(request.arguments, max_len=80),
                        "rule_id": decision.rule_id,
                        "reason": decision.reason,
                        "risk_score": decision.risk_score
                    })
                except Exception:
                    pass

            try:
                await asyncio.wait_for(event.wait(), timeout=timeout)
                admin_choice = PENDING_APPROVAL_DECISIONS.get(request.call_id, "REJECT")
                if admin_choice == "APPROVE":
                    self.metrics["approvals_granted"] += 1
                    return PolicyDecision(
                        call_id=request.call_id,
                        status="ALLOW",
                        rule_id="R-HUMAN-APPROVE",
                        risk_score=decision.risk_score,
                        risk_level=decision.risk_level,
                        reason="Human Administrator manually confirmed and approved execution."
                    )
                else:
                    self.metrics["approvals_rejected"] += 1
                    return PolicyDecision(
                        call_id=request.call_id,
                        status="DENY",
                        rule_id="R-HUMAN-REJECT",
                        risk_score=decision.risk_score,
                        risk_level=decision.risk_level,
                        reason="Human Administrator rejected execution."
                    )
            except asyncio.TimeoutError:
                self.metrics["approvals_rejected"] += 1
                return PolicyDecision(
                    call_id=request.call_id,
                    status="DENY",
                    rule_id="R-TIMEOUT-DENY",
                    risk_score=decision.risk_score,
                    risk_level=decision.risk_level,
                    reason="APPROVAL TIMEOUT: Execution denied by default safe policy."
                )
            finally:
                PENDING_APPROVAL_EVENTS.pop(request.call_id, None)
                PENDING_APPROVAL_DECISIONS.pop(request.call_id, None)

        return decision

    @staticmethod
    def resolve_approval(call_id: str, decision: str):
        """Called by UI API when admin clicks Approve or Block."""
        PENDING_APPROVAL_DECISIONS[call_id] = decision
        if call_id in PENDING_APPROVAL_EVENTS:
            PENDING_APPROVAL_EVENTS[call_id].set()

    def reset_metrics(self):
        """Resets metrics for a fresh demo run."""
        self.metrics = {
            "legitimate_tasks_run": 0,
            "legitimate_tasks_allowed": 0,
            "false_blocks": 0,
            "attacks_run": 0,
            "attacks_compromised_shield_off": 0,
            "attacks_blocked_shield_on": 0,
            "approvals_required": 0,
            "approvals_granted": 0,
            "approvals_rejected": 0,
            "chain_integrity": True
        }


gateway = AgentShieldGateway()
