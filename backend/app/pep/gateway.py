"""Policy Enforcement Point: evaluate, escalate, and enforce tool calls."""

from __future__ import annotations

import logging
import threading
import time
from typing import Any, Awaitable, Callable, Optional

from app.models import (
    DecisionStatus,
    PolicyDecision,
    SecurityAlert,
    SecurityException,
    ToolRequest,
)
from app.pep.approval_manager import ApprovalManager
from app.pep.rbac import ANOMALY_RISK_BOOST, check_permission, get_tier
from app.pep.risk_scorer import (
    RISK_ESCALATION_THRESHOLD,
    scan_arguments,
    scan_output,
)

logger = logging.getLogger(__name__)

Broadcaster = Callable[[dict[str, Any]], Awaitable[None]]
SignatureVerifier = Callable[[str], bool]
AuditHook = Callable[[ToolRequest, PolicyDecision], Awaitable[None]]

TAINT_TTL_SECONDS = 10 * 60
TAINTED_RISK_BOOST = 30.0


class PEPGateway:
    """Async PEP that RBAC-checks, risk-scores, and optionally waits for a human."""

    def __init__(
        self,
        approval_manager: ApprovalManager,
        broadcaster: Broadcaster,
        signature_verifier: Optional[SignatureVerifier] = None,
        audit_hook: Optional[AuditHook] = None,
    ) -> None:
        self._approval_manager = approval_manager
        self._broadcaster = broadcaster
        self._signature_verifier = signature_verifier
        self._audit_hook = audit_hook
        self._tainted: dict[str, float] = {}
        self._taint_lock = threading.Lock()

    async def evaluate(self, request: ToolRequest) -> PolicyDecision:
        """Run the allow / deny / pending-approval pipeline for one tool call."""
        tier = get_tier(request.tool_name)
        reasons: list[str] = []
        risk_score = 0.0

        if self._signature_verifier is not None:
            try:
                signed = self._signature_verifier(request.tool_name)
            except Exception:
                logger.exception("signature verifier failed; failing closed")
                signed = False
            if not signed:
                decision = PolicyDecision(
                    call_id=request.call_id,
                    status=DecisionStatus.DENY,
                    tier=tier,
                    risk_score=0.0,
                    reasons=["unsigned or tampered tool"],
                )
                await self._notify(request, decision)
                return decision

        allowed, tier, rbac_reasons = check_permission(request)
        reasons.extend(rbac_reasons)
        if not allowed:
            decision = PolicyDecision(
                call_id=request.call_id,
                status=DecisionStatus.DENY,
                tier=tier,
                risk_score=0.0,
                reasons=reasons,
            )
            await self._notify(request, decision)
            return decision

        arg_result = scan_arguments(request.tool_name, request.arguments)
        risk_score = arg_result.score
        reasons.extend(arg_result.matches)

        if any(reason.startswith("anomaly:") for reason in rbac_reasons):
            risk_score = min(100.0, risk_score + ANOMALY_RISK_BOOST)

        if self._is_tainted(request.agent_id):
            risk_score = min(100.0, risk_score + TAINTED_RISK_BOOST)
            reasons.append("agent tainted by prior injection")

        if risk_score > RISK_ESCALATION_THRESHOLD and tier < 3:
            tier = 3
            reasons.append("risk escalation")

        if tier <= 2:
            status = DecisionStatus.ALLOW
        else:
            status = DecisionStatus.PENDING_APPROVAL

        decision = PolicyDecision(
            call_id=request.call_id,
            status=status,
            tier=tier,
            risk_score=risk_score,
            reasons=reasons,
        )
        await self._notify(request, decision)
        return decision

    async def scan_tool_output(
        self,
        call_id: str,
        agent_id: str,
        tool_name: str,
        output: str,
    ) -> dict[str, Any]:
        """Scan tool output for injection cues and taint the agent if flagged."""
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
        )
        decision = PolicyDecision(
            call_id=call_id,
            status=DecisionStatus.DENY,
            tier=3,
            risk_score=result.score,
            reasons=["injection detected", *result.matches],
        )
        await self._broadcast(
            event="injection_detected",
            request=request,
            decision=decision,
        )
        await self._audit(request, decision)
        return payload

    async def enforce(
        self,
        request: ToolRequest,
        timeout_seconds: float = 300,
    ) -> PolicyDecision:
        """Evaluate a call, wait for a human if needed, or raise SecurityException."""
        decision = await self.evaluate(request)

        if decision.status == DecisionStatus.DENY:
            raise SecurityException(decision=decision)

        if decision.status == DecisionStatus.PENDING_APPROVAL:
            try:
                decision = await self._approval_manager.wait_for_human(
                    request, decision, timeout_seconds=timeout_seconds
                )
            except SecurityException as exc:
                if exc.decision is not None:
                    await self._audit(request, exc.decision)
                raise
            await self._audit(request, decision)
            return decision

        return decision

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
        """Broadcast allow/block alerts. Skip PENDING; ApprovalManager owns those."""
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
