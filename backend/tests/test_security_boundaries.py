import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

from app.main import app
from app.models import ToolRequest, DecisionStatus, ApprovalAction
from app.state import gateway, approval_manager
from app.crypto.merkle_log import HashChainAuditLedger, AuditPersistenceError

client = TestClient(app)

ADMIN_TOKEN = "admin-secret-session-90214"
WORKER_TOKEN = "worker-token-01"


def test_auth_boundaries_401_and_403():
    """Verify that protected routes require authentication and fail 401 without token, 403 for worker."""
    # 1. Unauthenticated request -> 401
    resp = client.post("/api/reset")
    assert resp.status_code == 401
    assert "Authentication credentials required" in resp.json()["detail"]

    resp = client.post("/api/audit/tamper?block_index=1")
    assert resp.status_code == 401

    resp = client.get("/api/approvals/pending")
    assert resp.status_code == 401

    resp = client.post("/api/approvals/test_call/action", json={"action": "APPROVE"})
    assert resp.status_code == 401

    # 2. Worker role attempting admin route -> 403
    resp_worker = client.post(
        "/api/reset",
        headers={"Authorization": f"Bearer {WORKER_TOKEN}"}
    )
    assert resp_worker.status_code == 403
    assert "Admin role required" in resp_worker.json()["detail"]


def test_session_creation_endpoint():
    """Verify POST /api/auth/session issues valid admin and worker sessions."""
    resp = client.post("/api/auth/session", json={"role": "admin"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["token"] == ADMIN_TOKEN
    assert data["user"]["role"] == "admin"

    # Use the issued token on protected route -> 200 OK
    resp_reset = client.post(
        "/api/reset",
        headers={"Authorization": f"Bearer {data['token']}"}
    )
    assert resp_reset.status_code == 200


def test_mcp_identity_anti_spoofing():
    """Verify unauthenticated MCP caller cannot claim admin/system agent or unknown agent."""
    # 1. Unregistered agent -> R-IDENTITY-01 error
    resp_unknown = client.post("/api/mcp/rpc", json={
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {
            "name": "read_document",
            "arguments": {"filename": "test.txt"},
            "agent_id": "malicious_unregistered_agent"
        },
        "id": 1
    })
    assert resp_unknown.status_code == 200
    err = resp_unknown.json().get("error", {})
    assert "R-IDENTITY-01" in err.get("message", "")

    # 2. Spoofing agent_admin -> R-IDENTITY-SPOOF
    resp_spoof = client.post("/api/mcp/rpc", json={
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {
            "name": "delete_database",
            "arguments": {"database_name": "prod_users"},
            "agent_id": "agent_admin"
        },
        "id": 2
    })
    assert resp_spoof.status_code == 200
    err = resp_spoof.json().get("error", {})
    assert "R-IDENTITY-SPOOF" in err.get("message", "")


def test_pending_approvals_redacts_secrets():
    """Verify GET /api/approvals/pending redacts sensitive fields from argument previews."""
    # Insert a dummy pending item with sensitive arguments
    req = ToolRequest(
        call_id="call_secret_redact_test",
        agent_id="agent_worker_01",
        tool_name="query_database",
        arguments={
            "query": "SELECT * FROM users",
            "api_key": "sk-secret-live-key-9999",
            "db_password": "supersecretpassword"
        },
        source="user_prompt"
    )
    from app.models import PolicyDecision
    dec = PolicyDecision(
        call_id=req.call_id,
        status=DecisionStatus.PENDING_APPROVAL,
        tier=2,
        risk_score=75.0,
        reasons=["High risk database query"]
    )
    import asyncio
    item = {
        "request": req,
        "decision": dec,
        "event": asyncio.Event(),
        "result": None,
        "created_at": "2026-10-31T12:00:00Z"
    }
    with approval_manager._lock:
        approval_manager._pending[req.call_id] = item

    try:
        resp = client.get(
            "/api/approvals/pending",
            headers={"Authorization": f"Bearer {ADMIN_TOKEN}"}
        )
        assert resp.status_code == 200
        pending_list = resp.json()
        target = next((p for p in pending_list if p["call_id"] == req.call_id), None)
        assert target is not None
        assert target["arguments"]["api_key"] == "***REDACTED***"
        assert target["arguments"]["db_password"] == "***REDACTED***"
        assert target["arguments"]["query"] == "SELECT * FROM users"
    finally:
        with approval_manager._lock:
            approval_manager._pending.pop(req.call_id, None)


@pytest.mark.asyncio
async def test_audit_failure_fails_closed():
    """Verify that when audit persistence fails, PEP fails closed with DENY and R-AUDIT-FAIL."""
    req = ToolRequest(
        call_id="call_audit_fail_test",
        agent_id="agent_worker_01",
        tool_name="read_document",
        arguments={"filename": "public_report.pdf"},
        source="user_prompt"
    )

    with patch.object(gateway, "_audit", side_effect=AuditPersistenceError("Disk I/O error")):
        decision = await gateway.intercept(req)
        assert decision.status == DecisionStatus.DENY
        assert decision.rule_id == "R-AUDIT-FAIL"
        assert decision.risk_score == 100.0
        assert "Audit ledger write failed" in decision.reason
