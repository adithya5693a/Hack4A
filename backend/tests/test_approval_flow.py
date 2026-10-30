import asyncio
from typing import Any

import pytest

from app.models import ApprovalAction, DecisionStatus, SecurityException, ToolRequest
from app.pep.approval_manager import ApprovalManager
from app.pep.gateway import PEPGateway


async def _noop_broadcast(_message: dict[str, Any]) -> None:
    return None


def _make_gateway() -> tuple[PEPGateway, ApprovalManager]:
    manager = ApprovalManager(broadcaster=_noop_broadcast)
    gw = PEPGateway(approval_manager=manager, broadcaster=_noop_broadcast)
    return gw, manager


def _bash_request(call_id: str) -> ToolRequest:
    return ToolRequest(
        call_id=call_id,
        agent_id="approval-agent",
        tool_name="execute_bash",
        arguments={"command": "echo hi"},
    )


async def _wait_until_pending(manager: ApprovalManager, call_id: str) -> None:
    for _ in range(100):
        pending = manager.list_pending()
        if any(item["call_id"] == call_id for item in pending):
            return
        await asyncio.sleep(0.01)
    raise AssertionError(f"call {call_id} never became pending")


@pytest.mark.asyncio
async def test_enforce_approve_returns_allow() -> None:
    gw, manager = _make_gateway()
    request = _bash_request("approve-1")
    task = asyncio.create_task(gw.enforce(request))
    await _wait_until_pending(manager, request.call_id)
    assert manager.list_pending()
    ok = manager.resolve(
        request.call_id,
        ApprovalAction(action="APPROVE", reviewer="alice"),
    )
    assert ok is True
    decision = await task
    assert decision.status == DecisionStatus.ALLOW
    assert any("approved" in reason for reason in decision.reasons)


@pytest.mark.asyncio
async def test_enforce_reject_raises_security_exception() -> None:
    gw, manager = _make_gateway()
    request = _bash_request("reject-1")
    task = asyncio.create_task(gw.enforce(request))
    await _wait_until_pending(manager, request.call_id)
    ok = manager.resolve(
        request.call_id,
        ApprovalAction(action="REJECT", reviewer="bob", note="too risky"),
    )
    assert ok is True
    with pytest.raises(SecurityException) as exc_info:
        await task
    assert exc_info.value.decision is not None
    assert exc_info.value.decision.status == DecisionStatus.DENY


@pytest.mark.asyncio
async def test_enforce_timeout_raises_security_exception() -> None:
    gw, _manager = _make_gateway()
    request = _bash_request("timeout-1")
    with pytest.raises(SecurityException) as exc_info:
        await gw.enforce(request, timeout_seconds=0.05)
    assert exc_info.value.decision is not None
    assert exc_info.value.decision.status == DecisionStatus.DENY
    assert any("timeout" in reason for reason in exc_info.value.decision.reasons)
