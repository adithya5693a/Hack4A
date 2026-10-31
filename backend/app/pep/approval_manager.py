from __future__ import annotations

import asyncio
import threading
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable, Optional

from app.models import (
    ApprovalAction,
    DecisionStatus,
    PolicyDecision,
    SecurityAlert,
    SecurityException,
    ToolRequest,
)

Broadcaster = Callable[[dict[str, Any]], Awaitable[None]]


class ApprovalAlreadyConsumedError(Exception):
    """Raised when an approval is replayed after already being consumed."""
    pass


class ApprovalManager:
    def __init__(self, broadcaster: Broadcaster) -> None:
        self._broadcaster = broadcaster
        self._pending: dict[str, dict[str, Any]] = {}
        self._consumed: set[str] = set()
        self._lock = threading.Lock()

    async def wait_for_human(
        self,
        request: ToolRequest,
        decision: PolicyDecision,
        timeout_seconds: float = 300,
    ) -> PolicyDecision:
        event = asyncio.Event()
        item: dict[str, Any] = {
            "request": request,
            "decision": decision,
            "event": event,
            "result": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        with self._lock:
            self._pending[request.call_id] = item

        await self._broadcast_alert(
            event="approval_required",
            request=request,
            decision=decision,
            extra_reasons=[],
            status=decision.status,
        )

        approved = False
        outcome_reason = "approval timeout"
        try:
            timed_out = False
            try:
                await asyncio.wait_for(event.wait(), timeout=timeout_seconds)
            except asyncio.TimeoutError:
                timed_out = True

            result: Optional[ApprovalAction] = item["result"]
            if not timed_out and result is not None and result.action == "APPROVE":
                approved = True
                reviewer = result.reviewer or "human reviewer"
                outcome_reason = f"approved by {reviewer}"
                return PolicyDecision(
                    call_id=request.call_id,
                    status=DecisionStatus.ALLOW,
                    tier=decision.tier,
                    risk_score=decision.risk_score,
                    reasons=[*decision.reasons, outcome_reason],
                )

            if timed_out or result is None:
                outcome_reason = "approval timeout"
            else:
                outcome_reason = "rejected by human reviewer"
                if result.note:
                    outcome_reason = f"{outcome_reason}: {result.note}"

            deny_decision = PolicyDecision(
                call_id=request.call_id,
                status=DecisionStatus.DENY,
                tier=decision.tier,
                risk_score=decision.risk_score,
                reasons=[*decision.reasons, outcome_reason],
            )
            raise SecurityException(decision=deny_decision, message=outcome_reason)
        finally:
            with self._lock:
                self._pending.pop(request.call_id, None)
            await self._broadcast_alert(
                event="approval_resolved",
                request=request,
                decision=decision,
                extra_reasons=[outcome_reason],
                status=DecisionStatus.ALLOW if approved else DecisionStatus.DENY,
            )

    def resolve(self, call_id: str, action: ApprovalAction) -> bool:
        with self._lock:
            if call_id in self._consumed:
                raise ApprovalAlreadyConsumedError(f"Approval for call_id '{call_id}' has already been consumed.")
            item = self._pending.get(call_id)
            if item is None:
                return False
            self._consumed.add(call_id)
            item["result"] = action
            item["event"].set()
            return True

    def list_pending(self) -> list[dict[str, Any]]:
        with self._lock:
            snapshot = list(self._pending.items())
        pending: list[dict[str, Any]] = []
        for call_id, item in snapshot:
            request: ToolRequest = item["request"]
            decision: PolicyDecision = item["decision"]
            # Redact sensitive values from pending arguments preview to prevent secret exposure
            redacted_args = {}
            for k, v in (request.arguments or {}).items():
                if any(sec in k.lower() for sec in ["key", "secret", "password", "token", "credential", "auth"]):
                    redacted_args[k] = "***REDACTED***"
                else:
                    redacted_args[k] = v
            pending.append(
                {
                    "call_id": call_id,
                    "agent_id": request.agent_id,
                    "tool_name": request.tool_name,
                    "arguments": redacted_args,
                    "risk_score": decision.risk_score,
                    "reasons": decision.reasons,
                    "created_at": item["created_at"],
                }
            )
        return pending

    async def _broadcast_alert(
        self,
        *,
        event: str,
        request: ToolRequest,
        decision: PolicyDecision,
        extra_reasons: list[str],
        status: DecisionStatus | str,
    ) -> None:
        alert = SecurityAlert(
            event=event,
            call_id=request.call_id,
            agent_id=request.agent_id,
            tool_name=request.tool_name,
            status=status,
            tier=decision.tier,
            risk_score=decision.risk_score,
            reasons=[*decision.reasons, *extra_reasons],
        )
        await self._broadcaster(alert.model_dump(mode="json"))
