from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.models import ApprovalAction, ScanOutputRequest, SecurityException, ToolRequest
from app.pep.rbac import ADMIN_ONLY_TOOLS, ALLOWED_EMAIL_DOMAINS, TOOL_TIERS
from app.pep.risk_scorer import RISK_ESCALATION_THRESHOLD
from app.state import approval_manager, gateway, ws_manager

app = FastAPI(title="AI Agent Security Firewall")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.websocket("/ws/security-stream")
async def security_stream(websocket: WebSocket) -> None:
    await ws_manager.connect(websocket)
    try:
        await websocket.send_json({"event": "connected"})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await ws_manager.disconnect(websocket)


@app.get("/api/approvals/pending")
async def list_pending() -> list[dict]:
    return approval_manager.list_pending()


@app.post("/api/approvals/{call_id}/action")
async def approval_action(call_id: str, body: ApprovalAction) -> dict[str, bool]:
    ok = approval_manager.resolve(call_id, body)
    if not ok:
        raise HTTPException(status_code=404, detail="Unknown call_id")
    return {"ok": True}


@app.post("/api/dev/mock-alert")
async def mock_alert() -> dict:
    alert = {
        "event": "approval_required",
        "call_id": "mock-call-001",
        "agent_id": "dev-agent",
        "tool_name": "execute_bash",
        "status": "PENDING_APPROVAL",
        "tier": 3,
        "risk_score": 92,
        "reasons": ["mock high-risk tool call for frontend stream testing"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await ws_manager.broadcast(alert)
    return {"ok": True, "alert": alert}


@app.post("/api/pep/evaluate")
async def pep_evaluate(body: ToolRequest):
    """Non-blocking policy check for UI/testing. Does not wait for human approval."""
    return await gateway.evaluate(body)


@app.post("/api/pep/enforce")
async def pep_enforce(body: ToolRequest):
    """Blocking enforcement. Waits for human approval when the decision is pending."""
    try:
        return await gateway.enforce(body)
    except SecurityException as exc:
        reasons = (
            exc.decision.reasons
            if exc.decision is not None
            else [exc.message]
        )
        raise HTTPException(status_code=403, detail={"reasons": reasons}) from exc


@app.post("/api/pep/scan-output")
async def pep_scan_output(body: ScanOutputRequest):
    return await gateway.scan_tool_output(
        call_id=body.call_id,
        agent_id=body.agent_id,
        tool_name=body.tool_name,
        output=body.output,
    )


@app.get("/api/pep/policy")
async def pep_policy() -> dict:
    return {
        "tool_tiers": TOOL_TIERS,
        "admin_only_tools": sorted(ADMIN_ONLY_TOOLS),
        "risk_threshold": RISK_ESCALATION_THRESHOLD,
        "allowed_email_domains": sorted(ALLOWED_EMAIL_DOMAINS),
    }


# ---------------------------------------------------------------------------
# Member 2 will add:
#   POST /api/agent/run
#   GET  /api/audit/*
# ---------------------------------------------------------------------------
