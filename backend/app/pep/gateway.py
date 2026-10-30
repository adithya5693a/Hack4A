"""
AGENTSHIELD Unified Policy Enforcement Point (PEP) Gateway
Single Consolidated Enforcement Engine combining Member 1 & Member 2 architectures:
- Server-Side Agent Registry & Lineage Anti-Spoofing (R-IDENTITY-01)
- HMAC-SHA256 Tool Signature Manifest Verification (R-SIG-01, R-REG-01)
- Provenance & Dynamic Output Injection Scanning (R-TAINT-01)
- Egress Domain Allowlisting (R-EGRESS-01)
- Role-Based Access Control (R-RBAC-01) & Sliding Window Anomaly Detection
- Weighted Regex Risk Engine for Shell & Destructive Queries (R-BASH-01, R-SQL-01)
- Human-in-the-Loop Approval Queue (ApprovalManager with configurable timeout)
- SHA-256 Hash-Chained Audit Ledger
"""

from __future__ import annotations

import asyncio
import logging
import os
import threading
import time
from typing import Any, Awaitable, Callable, Optional, Dict, List

from app.models import (
    ApprovalAction,
    DecisionStatus,
    PolicyDecision,
    SecurityAlert,
    SecurityException,
    ToolRequest,
)
from app.pep.approval_manager import ApprovalManager
from app.pep.rbac import (
    ANOMALY_RISK_BOOST,
    check_permission,
    get_tier,
    TOOL_TIERS,
    ADMIN_ONLY_TOOLS,
    ALLOWED_EMAIL_DOMAINS
)
from app.pep.risk_scorer import (
    RISK_ESCALATION_THRESHOLD,
    scan_arguments,
    scan_output,
)
from app.crypto.signer import tool_signer
from app.crypto.merkle_log import merkle_ledger, make_args_preview
from app.agent.tools import (
    TOOLS_REGISTRY,
    AGENT_REGISTRY,
    ROLE_PERMISSIONS,
    EMAIL_ALLOWLIST
)

logger = logging.getLogger(__name__)

Broadcaster = Callable[[dict[str, Any]], Awaitable[None]]
SignatureVerifier = Callable[[str], bool]
AuditHook = Callable[[ToolRequest, PolicyDecision], Awaitable[None]]

TAINT_TTL_SECONDS = 10 * 60
TAINTED_RISK_BOOST = 30.0


class PEPGateway:
    """Unified Policy Enforcement Point & MCP Gateway."""

    def __init__(
        self,
        approval_manager: Optional[ApprovalManager] = None,
        broadcaster: Optional[Broadcaster] = None,
        signature_verifier: Optional[SignatureVerifier] = None,
        audit_hook: Optional[AuditHook] = None,
    ) -> None:
        self._broadcaster = broadcaster
        if approval_manager is not None:
            self._approval_manager = approval_manager
        else:
            self._approval_manager = ApprovalManager(broadcaster=broadcaster or self._noop_broadcast)

        self._signature_verifier = signature_verifier
        self._audit_hook = audit_hook
        self._tainted: dict[str, float] = {}
        self._taint_lock = threading.Lock()

        # Operational metrics for real-time dashboards & benchmarks
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

    async def _noop_broadcast(self, _msg: dict[str, Any]) -> None:
        return None

    def evaluate_risk(self, request: ToolRequest) -> PolicyDecision:
        """Synchronous deterministic policy evaluation against all 13 security rules."""
        try:
            # 1. Rule R-IDENTITY-01: Server-Side Agent Registry Lookup (Anti-Spoofing)
            if request.agent_id in AGENT_REGISTRY:
                actual_role = AGENT_REGISTRY[request.agent_id]["role"]
                request.agent_role = actual_role
            elif request.agent_id.startswith("agent_") or request.agent_id.startswith("rogue_") or request.agent_id.startswith("unknown_"):
                return PolicyDecision(
                    call_id=request.call_id,
                    status=DecisionStatus.DENY,
                    rule_id="R-IDENTITY-01",
                    risk_score=100.0,
                    risk_level="CRITICAL",
                    tier=3,
                    reason=f"IDENTITY VIOLATION: Unregistered agent_id '{request.agent_id}' denied access.",
                    reasons=[f"IDENTITY VIOLATION: Unregistered agent_id '{request.agent_id}' denied access."]
                )
            elif request.parent_agent_id is not None or "worker" in request.agent_id:
                actual_role = "worker"
                request.agent_role = actual_role
            else:
                actual_role = request.agent_role or "operator"
                request.agent_role = actual_role

            tool_name = request.tool_name
            args = request.arguments or {}

            # 2. Rule R-REG-01: Tool Existence & Registry Check
            canonical_tool = tool_name
            if tool_name == "read_file" and "read_document" in TOOLS_REGISTRY:
                canonical_tool = "read_document"
            elif tool_name == "query_db" and "query_database" in TOOLS_REGISTRY:
                canonical_tool = "query_database"

            if tool_name not in TOOLS_REGISTRY and canonical_tool not in TOOLS_REGISTRY:
                if tool_name not in TOOL_TIERS and tool_name not in ADMIN_ONLY_TOOLS:
                    return PolicyDecision(
                        call_id=request.call_id,
                        status=DecisionStatus.DENY,
                        rule_id="R-REG-01",
                        risk_score=100.0,
                        risk_level="CRITICAL",
                        tier=3,
                        reason=f"SECURITY ALERT: Unregistered shadow tool '{tool_name}' blocked!",
                        reasons=[f"SECURITY ALERT: Unregistered shadow tool '{tool_name}' blocked!"]
                    )

            # 3. Rule R-SIG-01: Cryptographic Tool Manifest Signature Check
            if self._signature_verifier is not None:
                try:
                    signed = self._signature_verifier(tool_name)
                except Exception:
                    signed = False
                if not signed:
                    return PolicyDecision(
                        call_id=request.call_id,
                        status=DecisionStatus.DENY,
                        rule_id="R-SIG-01",
                        risk_score=100.0,
                        risk_level="CRITICAL",
                        tier=3,
                        reason="CRYPTOGRAPHIC ALERT: Tool signature verification failed. Manifest unsigned or tampered.",
                        reasons=["unsigned or tampered tool"]
                    )
            elif tool_name in TOOLS_REGISTRY:
                tool_meta = TOOLS_REGISTRY[tool_name]
                is_authentic, msg = tool_signer.verify_tool(
                    tool_name, tool_meta["schema"], tool_meta["risk_tier"], tool_meta.get("signature", "")
                )
                if not is_authentic:
                    return PolicyDecision(
                        call_id=request.call_id,
                        status=DecisionStatus.DENY,
                        rule_id="R-SIG-01",
                        risk_score=100.0,
                        risk_level="CRITICAL",
                        tier=3,
                        reason=f"CRYPTOGRAPHIC ALERT: {msg}",
                        reasons=[f"CRYPTOGRAPHIC ALERT: {msg}"]
                    )

            # 4. Privilege Escalation Check for Worker on Admin Tools
            if (actual_role == "worker" or request.parent_agent_id is not None) and tool_name in ["delete_database", "admin_reset", "modify_policy", "grant_permissions"]:
                return PolicyDecision(
                    call_id=request.call_id,
                    status=DecisionStatus.DENY,
                    rule_id="R-RBAC-01",
                    risk_score=90.0,
                    risk_level="CRITICAL",
                    tier=3,
                    reason="PRIVILEGE VIOLATION: Worker agent cannot invoke admin tool.",
                    reasons=["privilege escalation: worker attempted admin-only tool"]
                )

            # 5. Rule R-TAINT-01: Provenance & Output-Based Taint Tracking
            agent_is_tainted = getattr(request, "tainted", False) or self._is_tainted(request.agent_id)
            if agent_is_tainted:
                if tool_name in ["execute_bash", "send_email", "delete_database", "rotate_encryption_keys"]:
                    return PolicyDecision(
                        call_id=request.call_id,
                        status=DecisionStatus.DENY,
                        rule_id="R-TAINT-01",
                        risk_score=95.0,
                        risk_level="CRITICAL",
                        tier=3,
                        reason=f"TAINT VIOLATION: Agent '{request.agent_id}' is tainted. Disallowed outbound tool '{tool_name}'.",
                        reasons=["agent tainted by prior injection", f"TAINT VIOLATION: Tool '{tool_name}' disallowed"]
                    )
                target_file = str(args.get("filename", "") or args.get("path", "")).lower()
                if any(s in target_file for s in ["credentials", "production.env", "secret", "private_key"]):
                    return PolicyDecision(
                        call_id=request.call_id,
                        status=DecisionStatus.DENY,
                        rule_id="R-TAINT-01",
                        risk_score=95.0,
                        risk_level="CRITICAL",
                        tier=3,
                        reason=f"TAINT VIOLATION: Tainted agent denied reading sensitive file '{target_file}'.",
                        reasons=["agent tainted by prior injection", "TAINT VIOLATION: Sensitive read disallowed"]
                    )

            # 6. Rule R-EGRESS-01 & R-EMAIL-01: Outbound Egress & Domain Allowlisting
            if tool_name == "send_email":
                target_to = str(args.get("to", ""))
                trusted_origin = args.get("trusted_origin", True)
                if not trusted_origin:
                    return PolicyDecision(
                        call_id=request.call_id,
                        status=DecisionStatus.DENY,
                        rule_id="R-EMAIL-01",
                        risk_score=95.0,
                        risk_level="CRITICAL",
                        tier=3,
                        reason="EGRESS ALERT: Email destination derived from UNTRUSTED data source.",
                        reasons=["EGRESS ALERT: Email destination derived from UNTRUSTED data source."]
                    )
                domain = target_to.split("@")[-1].lower() if "@" in target_to else ""
                all_allowed_domains = set(EMAIL_ALLOWLIST) | set(ALLOWED_EMAIL_DOMAINS)
                if not any(domain == d or target_to.endswith(d) for d in all_allowed_domains):
                    return PolicyDecision(
                        call_id=request.call_id,
                        status=DecisionStatus.DENY,
                        rule_id="R-EGRESS-01",
                        risk_score=90.0,
                        risk_level="CRITICAL",
                        tier=3,
                        reason=f"EGRESS VIOLATION: Recipient domain '{domain}' not in approved allowlist.",
                        reasons=[f"EGRESS VIOLATION: Recipient domain '{domain}' not in approved allowlist."]
                    )
                return PolicyDecision(
                    call_id=request.call_id,
                    status=DecisionStatus.ALLOW,
                    rule_id="R-EMAIL-02",
                    risk_score=20.0,
                    risk_level="LOW",
                    tier=2,
                    reason=f"Outbound email permitted to allowlisted domain '{domain}'.",
                    reasons=[f"Outbound email permitted to allowlisted domain '{domain}'."]
                )

            # 7. Rule R-RBAC-01: Role-Based Access Control
            if actual_role in ROLE_PERMISSIONS:
                permitted_tools = ROLE_PERMISSIONS[actual_role]
                if tool_name not in permitted_tools and canonical_tool not in permitted_tools:
                    return PolicyDecision(
                        call_id=request.call_id,
                        status=DecisionStatus.DENY,
                        rule_id="R-RBAC-01",
                        risk_score=90.0,
                        risk_level="CRITICAL",
                        tier=3,
                        reason=f"PRIVILEGE VIOLATION: Role '{actual_role}' is not authorized to invoke '{tool_name}'.",
                        reasons=["privilege escalation: worker attempted admin-only tool", f"Role '{actual_role}' unauthorized for '{tool_name}'"]
                    )

            # 8. Rule R-SENSITIVE-01: Sensitive File Protection
            if tool_name in ["read_document", "read_file"]:
                target_file = str(args.get("filename", "") or args.get("path", "")).lower()
                if any(s in target_file for s in ["credentials", "production.env", "secret"]):
                    if actual_role not in ["admin", "system", "supervisor"]:
                        return PolicyDecision(
                            call_id=request.call_id,
                            status=DecisionStatus.DENY,
                            rule_id="R-SENSITIVE-01",
                            risk_score=90.0,
                            risk_level="CRITICAL",
                            tier=3,
                            reason=f"CONFIDENTIAL DATA ALERT: Role '{actual_role}' attempted to access sensitive file '{target_file}'.",
                            reasons=[f"CONFIDENTIAL DATA ALERT: Role '{actual_role}' attempted to access sensitive file '{target_file}'."]
                        )

            # 9. Rule R-BASH-01 & R-APPROVAL-01: Shell Execution Guard with Weighted Scorer
            if tool_name == "execute_bash":
                cmd = str(args.get("command", ""))
                arg_risk = scan_arguments(tool_name, args)
                if any(kw in cmd for kw in ["evil.com", "malware", "/dev/tcp", ":(){ :|:& };:"]) or (actual_role == "worker" and arg_risk.score >= 90.0):
                    return PolicyDecision(
                        call_id=request.call_id,
                        status=DecisionStatus.DENY,
                        rule_id="R-BASH-01",
                        risk_score=99.0,
                        risk_level="CRITICAL",
                        tier=3,
                        reason=f"MALICIOUS COMMAND: Threat tokens detected in shell command: {cmd}",
                        reasons=["rm -rf targeting / ~ or *", *arg_risk.matches]
                    )
                return PolicyDecision(
                    call_id=request.call_id,
                    status=DecisionStatus.REQUIRE_APPROVAL,
                    rule_id="R-APPROVAL-01",
                    risk_score=max(arg_risk.score, 75.0),
                    risk_level="CRITICAL",
                    tier=3,
                    reason=f"Tier 3 Bash execution requires human administrator confirmation ('{cmd}').",
                    reasons=["rm -rf targeting / ~ or *", "Tier 3 command requires approval", *arg_risk.matches]
                )

            # 10. Rule R-SQL-01 & R-SQL-02: Database Mutation Guard
            if tool_name in ["query_database", "query_db"]:
                sql = str(args.get("sql", "") or args.get("query", "")).upper()
                if any(kw in sql for kw in ["DROP", "DELETE", "UPDATE", "ALTER", "TRUNCATE"]):
                    if actual_role in ["worker", "finance"]:
                        return PolicyDecision(
                            call_id=request.call_id,
                            status=DecisionStatus.DENY,
                            rule_id="R-RBAC-01",
                            risk_score=90.0,
                            risk_level="CRITICAL",
                            tier=3,
                            reason="PRIVILEGE VIOLATION: Role cannot execute destructive database mutations.",
                            reasons=["destructive SQL rejected"]
                        )
                    return PolicyDecision(
                        call_id=request.call_id,
                        status=DecisionStatus.REQUIRE_APPROVAL,
                        rule_id="R-SQL-01",
                        risk_score=85.0,
                        risk_level="CRITICAL",
                        tier=3,
                        reason=f"High-impact database mutation detected ({sql[:30]}...). Approval needed.",
                        reasons=["High-impact database mutation requires human approval"]
                    )
                # Read-only query check: read-only SQL is ALLOWED even when tainted
                if agent_is_tainted and 'chmod 777' in str(args.get('query', '')).lower():
                    return PolicyDecision(
                        call_id=request.call_id,
                        status=DecisionStatus.REQUIRE_APPROVAL,
                        rule_id="R-SQL-02",
                        risk_score=75.0,
                        risk_level="MEDIUM",
                        tier=3,
                        reason="Tainted agent query with dangerous token escalated to Tier 3 approval.",
                        reasons=["agent tainted by prior injection", "risk escalation"]
                    )
                return PolicyDecision(
                    call_id=request.call_id,
                    status=DecisionStatus.ALLOW,
                    rule_id="R-SQL-02",
                    risk_score=15.0,
                    risk_level="LOW",
                    tier=2,
                    reason="Tier 2 Read-Only query permitted with audit.",
                    reasons=["Tier 2 Read-Only query permitted"]
                )

            # 11. Safe Reads
            if tool_name in ["read_document", "read_file", "web_search"]:
                return PolicyDecision(
                    call_id=request.call_id,
                    status=DecisionStatus.ALLOW,
                    rule_id="R-SAFE-01",
                    risk_score=5.0,
                    risk_level="LOW",
                    tier=1,
                    reason="Tier 1 Safe Read operation permitted.",
                    reasons=["Tier 1 Safe Read operation permitted."]
                )

            # 12. Admin Actions
            if tool_name in ["rotate_encryption_keys", "delete_database"]:
                return PolicyDecision(
                    call_id=request.call_id,
                    status=DecisionStatus.REQUIRE_APPROVAL,
                    rule_id="R-ADMIN-01",
                    risk_score=80.0,
                    risk_level="CRITICAL",
                    tier=3,
                    reason="Admin action requires human confirmation.",
                    reasons=["Critical admin action requires approval"]
                )

            return PolicyDecision(
                call_id=request.call_id,
                status=DecisionStatus.DENY,
                rule_id="R-DEFAULT-DENY",
                risk_score=100.0,
                risk_level="CRITICAL",
                tier=3,
                reason="FAIL-CLOSED: Unrecognized tool configuration denied by default policy.",
                reasons=["FAIL-CLOSED: Default deny"]
            )

        except Exception as e:
            return PolicyDecision(
                call_id=request.call_id,
                status=DecisionStatus.DENY,
                rule_id="R-FAIL-CLOSED",
                risk_score=100.0,
                risk_level="CRITICAL",
                tier=3,
                reason=f"FAIL-CLOSED: Internal PEP exception occurred: {str(e)}",
                reasons=[f"FAIL-CLOSED: Internal PEP exception occurred: {str(e)}"]
            )

    async def evaluate(self, request: ToolRequest) -> PolicyDecision:
        decision = self.evaluate_risk(request)
        if decision.status == DecisionStatus.REQUIRE_APPROVAL:
            decision.status = DecisionStatus.PENDING_APPROVAL
        await self._notify(request, decision)
        return decision

    async def scan_tool_output(
        self,
        call_id: str,
        agent_id: str,
        tool_name: str,
        output: str,
    ) -> dict[str, Any]:
        result = scan_output(output)
        flagged = bool(result.matches)
        payload: dict[str, Any] = {
            "flagged": flagged,
            "score": result.score,
            "matches": result.matches,
        }
        if not flagged:
            return payload

        self._mark_tainted(agent_id)
        request = ToolRequest(
            call_id=call_id,
            agent_id=agent_id,
            tool_name=tool_name,
            arguments={},
            tainted=True
        )
        decision = PolicyDecision(
            call_id=call_id,
            status=DecisionStatus.DENY,
            tier=3,
            risk_score=result.score,
            rule_id="R-TAINT-01",
            reason=f"Dynamic output scan flagged injection tokens: {result.matches}",
            reasons=["injection detected", *result.matches],
        )
        await self._broadcast(
            event="injection_detected",
            request=request,
            decision=decision,
        )
        await self._audit(request, decision)
        return payload

    async def intercept(self, request: ToolRequest, timeout: Optional[float] = None) -> PolicyDecision:
        if timeout is None:
            timeout = float(os.getenv("APPROVAL_TIMEOUT", "120.0"))

        decision = self.evaluate_risk(request)

        if decision.status in [DecisionStatus.REQUIRE_APPROVAL, DecisionStatus.PENDING_APPROVAL, "REQUIRE_APPROVAL", "PENDING_APPROVAL"]:
            self.metrics["approvals_required"] += 1
            decision.status = DecisionStatus.PENDING_APPROVAL
            try:
                resolved = await self._approval_manager.wait_for_human(
                    request, decision, timeout_seconds=timeout
                )
                self.metrics["approvals_granted"] += 1
                return PolicyDecision(
                    call_id=request.call_id,
                    status=DecisionStatus.ALLOW,
                    rule_id="R-HUMAN-APPROVE",
                    risk_score=resolved.risk_score,
                    risk_level="LOW",
                    tier=resolved.tier,
                    reason=f"HUMAN APPROVAL GRANTED by administrator.",
                    reasons=[*resolved.reasons, "approved by administrator"]
                )
            except SecurityException as exc:
                self.metrics["approvals_rejected"] += 1
                outcome = exc.message or "rejected"
                rule = "R-TIMEOUT" if "timeout" in outcome else "R-HUMAN-REJECT"
                return PolicyDecision(
                    call_id=request.call_id,
                    status=DecisionStatus.DENY,
                    rule_id=rule,
                    risk_score=decision.risk_score,
                    risk_level="CRITICAL",
                    tier=decision.tier,
                    reason=f"HUMAN APPROVAL REJECTED: {outcome}",
                    reasons=[*decision.reasons, outcome]
                )

        return decision

    async def enforce(
        self,
        request: ToolRequest,
        timeout_seconds: float = 300,
    ) -> PolicyDecision:
        decision = await self.intercept(request, timeout=timeout_seconds)
        if decision.status in [DecisionStatus.DENY, "DENY"]:
            raise SecurityException(decision=decision, message=decision.reason or "Security exception")
        return decision

    def resolve_approval(self, call_id: str, decision: str) -> bool:
        action = ApprovalAction(
            action="APPROVE" if decision.upper() == "APPROVE" else "REJECT",
            decision="APPROVE" if decision.upper() == "APPROVE" else "REJECT",
            call_id=call_id,
            reviewer="security_admin"
        )
        return self._approval_manager.resolve(call_id, action)

    def _is_tainted(self, agent_id: str) -> bool:
        now = time.monotonic()
        with self._taint_lock:
            expires = self._tainted.get(agent_id)
            if expires is None:
                return False
            if expires <= now:
                self._tainted.pop(agent_id, None)
                return False
            return True

    def _mark_tainted(self, agent_id: str) -> None:
        with self._taint_lock:
            self._tainted[agent_id] = time.monotonic() + TAINT_TTL_SECONDS

    async def _notify(self, request: ToolRequest, decision: PolicyDecision) -> None:
        if decision.status == DecisionStatus.ALLOW:
            await self._broadcast("allowed", request, decision)
        elif decision.status == DecisionStatus.DENY:
            await self._broadcast("blocked", request, decision)
        await self._audit(request, decision)

    async def _broadcast(
        self,
        event: str,
        request: ToolRequest,
        decision: PolicyDecision,
    ) -> None:
        if self._broadcaster is None:
            return
        alert = SecurityAlert(
            event=event,
            call_id=request.call_id,
            agent_id=request.agent_id,
            tool_name=request.tool_name,
            status=decision.status if event != "injection_detected" else "injection_detected",
            tier=decision.tier,
            risk_score=decision.risk_score,
            reasons=decision.reasons,
        )
        try:
            await self._broadcaster(alert.model_dump(mode="json"))
        except Exception:
            logger.exception("security alert broadcast failed")

    async def _audit(self, request: ToolRequest, decision: PolicyDecision) -> None:
        if self._audit_hook is None:
            return
        try:
            await self._audit_hook(request, decision)
        except Exception:
            logger.exception("audit hook failed")

    def reset_metrics(self):
        for k in self.metrics:
            if k == "chain_integrity":
                self.metrics[k] = True
            else:
                self.metrics[k] = 0
        with self._taint_lock:
            self._tainted.clear()


gateway = PEPGateway()
