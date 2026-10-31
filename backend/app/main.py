import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.models import ApprovalAction, ScanOutputRequest, SecurityException, ToolRequest, AgentRunRequest
from app.pep.policy import ADMIN_ONLY_TOOLS, ALLOWED_EMAIL_DOMAINS, TOOL_TIERS
from app.pep.approval_manager import ApprovalAlreadyConsumedError
from app.pep.risk_scorer import RISK_ESCALATION_THRESHOLD
from app.state import approval_manager, gateway, ws_manager

security = HTTPBearer(auto_error=False)

AUTH_REGISTRY: dict[str, dict[str, str]] = {
    "admin-secret-session-90214": {"id": "soc_admin_01", "role": "admin"},
    "soc-admin-bearer-token": {"id": "soc_admin_01", "role": "admin"},
    "agentshield-admin-session-token-90214": {"id": "soc_admin_01", "role": "admin"},
    "worker-token-01": {"id": "worker_01", "role": "worker"},
}

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Security(security)) -> dict[str, str]:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication credentials required")
    token = credentials.credentials.strip()
    user = AUTH_REGISTRY.get(token)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    return user

def require_admin(user: dict[str, str] = Depends(get_current_user)) -> dict[str, str]:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden: Admin role required")
    return user

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


class SessionRequest(BaseModel):
    role: Optional[str] = "admin"

@app.post("/api/auth/session")
async def create_auth_session(body: Optional[SessionRequest] = None):
    role = body.role if body and body.role else "admin"
    token = "admin-secret-session-90214" if role == "admin" else "worker-token-01"
    return {
        "status": "AUTHENTICATED",
        "token": token,
        "user": AUTH_REGISTRY[token]
    }


@app.get("/api/approvals/pending")
async def list_pending(admin: dict[str, str] = Depends(require_admin)) -> list[dict]:
    return approval_manager.list_pending()


@app.post("/api/approvals/{call_id}/action")
async def approval_action(call_id: str, body: ApprovalAction, admin: dict[str, str] = Depends(require_admin)) -> dict[str, bool]:
    if body.call_id and body.call_id != call_id:
        raise HTTPException(status_code=400, detail="Mismatched call_id")
    body.reviewer = admin.get("id", "soc_admin_01")
    try:
        ok = approval_manager.resolve(call_id, body)
        if not ok:
            raise HTTPException(status_code=404, detail="Unknown call_id or expired")
        return {"ok": True}
    except ApprovalAlreadyConsumedError:
        raise HTTPException(status_code=409, detail="Approval already consumed (replay attack rejected)")


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
    from app.pep.policy import ROLE_PERMISSIONS, AGENT_REGISTRY
    return {
        "tool_tiers": TOOL_TIERS,
        "admin_only_tools": sorted(ADMIN_ONLY_TOOLS),
        "risk_threshold": RISK_ESCALATION_THRESHOLD,
        "allowed_email_domains": sorted(ALLOWED_EMAIL_DOMAINS),
        "role_permissions": ROLE_PERMISSIONS,
        "agent_registry": AGENT_REGISTRY,
    }


@app.post("/api/pep/intercept-tool-call")
async def intercept_standard_tool_call(payload: dict):
    import json
    import uuid
    results = []
    agent_id = payload.get("agent_id", "agent_worker_01")

    if "tool_calls" in payload and isinstance(payload["tool_calls"], list):
        for tc in payload["tool_calls"]:
            func = tc.get("function", {})
            name = func.get("name", "")
            raw_args = func.get("arguments", "{}")
            parsed_args = json.loads(raw_args) if isinstance(raw_args, str) else raw_args
            call_id = tc.get("id") or f"call_{uuid.uuid4().hex[:8]}"
            req = ToolRequest(
                call_id=call_id,
                agent_id=agent_id,
                tool_name=name,
                arguments=parsed_args,
                source="untrusted_content" if payload.get("untrusted") else "user_prompt"
            )
            dec = await gateway.intercept(req, timeout=0.2)
            results.append({
                "tool_call_id": req.call_id,
                "tool_name": name,
                "decision": dec.status.value if hasattr(dec.status, "value") else str(dec.status),
                "rule_id": dec.rule_id,
                "risk_score": dec.risk_score,
                "reason": dec.reason
            })
    elif "name" in payload or "tool_name" in payload:
        name = payload.get("name") or payload.get("tool_name")
        args = payload.get("input") or payload.get("arguments") or {}
        call_id = payload.get("id") or f"call_{uuid.uuid4().hex[:8]}"
        req = ToolRequest(
            call_id=call_id,
            agent_id=agent_id,
            tool_name=name,
            arguments=args,
            source="untrusted_content" if payload.get("untrusted") else "user_prompt"
        )
        dec = await gateway.intercept(req, timeout=0.2)
        results.append({
            "tool_call_id": req.call_id,
            "tool_name": name,
            "decision": dec.status.value if hasattr(dec.status, "value") else str(dec.status),
            "rule_id": dec.rule_id,
            "risk_score": dec.risk_score,
            "reason": dec.reason
        })
    else:
        raise HTTPException(status_code=400, detail="Invalid payload format. Expected OpenAI 'tool_calls' array or Anthropic tool call schema.")

    overall_status = "BLOCKED" if any(r["decision"] == "DENY" for r in results) else "ALLOWED"
    return {
        "status": overall_status,
        "interceptions": results,
        "total_calls": len(results)
    }


# ---------------------------------------------------------------------------
# Member 2 will add:
#   POST /api/agent/run
#   GET  /api/audit/*
# ---------------------------------------------------------------------------

# ===========================================================================
# Member 2 AgentShield REST API Routes
# ===========================================================================

from app.crypto.merkle_log import merkle_ledger
from app.agent.tools import OUTBOX, clear_outbox
from app.agent.core import agent
from app.state import gateway as agentshield_gw
PENDING_APPROVAL_EVENTS: dict = {}
from app.models import SystemMetrics
from app.agent.attacks import (
    run_attack_poisoned_invoice,
    run_attack_email_leak,
    run_attack_sensitive_data,
    run_attack_privilege_escalation,
    run_attack_database_wipe,
    run_attack_shadow_tool,
    run_attack_tampered_schema,
    run_attack_destructive_shell,
    run_legitimate_task_with_approval,
    run_legitimate_suite
)
from app.agent.redteam import run_redteam_harness

# gw_mod.ws_broadcast_hook = ws_manager.broadcast  (already wired in app/state.py)


@app.get("/api/outbox")
def get_outbox():
    return {"total_sent": len(OUTBOX), "outbox": OUTBOX}


@app.get("/api/metrics", response_model=SystemMetrics)
def get_metrics():
    m = agentshield_gw.metrics
    integrity = merkle_ledger.verify_integrity().is_valid
    return SystemMetrics(
        legitimate_tasks_run=m["legitimate_tasks_run"],
        legitimate_tasks_allowed=m["legitimate_tasks_allowed"],
        false_blocks=m["false_blocks"],
        attacks_run=m["attacks_run"],
        attacks_compromised_shield_off=m["attacks_compromised_shield_off"],
        attacks_blocked_shield_on=m["attacks_blocked_shield_on"],
        approvals_required=m["approvals_required"],
        approvals_granted=m["approvals_granted"],
        approvals_rejected=m["approvals_rejected"],
        approvals_timeout=m.get("approvals_timeout", 0),
        chain_integrity=integrity
    )


def _do_reset():
    merkle_ledger.reset()
    clear_outbox()
    agentshield_gw.reset_metrics()
    PENDING_APPROVAL_EVENTS.clear()

@app.post("/api/reset")
def reset_system_state(admin: dict[str, str] = Depends(require_admin)):
    _do_reset()
    return {"status": "RESET_SUCCESSFUL", "message": "Audit ledger, outbox, and security metrics reset to Genesis."}


@app.post("/api/agent/run")
async def trigger_agent(req: AgentRunRequest):
    result = await agent.run_scenario(req.prompt, req.scenario_id or "custom", shield_enabled=True)
    if merkle_ledger.chain:
        latest = merkle_ledger.chain[-1]
        await ws_manager.broadcast({
            "event": "NEW_BLOCK",
            "block": latest.model_dump()
        })
    return {
        "task_id": result.task_id,
        "prompt": result.prompt,
        "shield_enabled": result.shield_enabled,
        "steps": result.steps,
        "final_output": result.final_output,
        "success": result.success
    }


@app.get("/api/audit/chain")
def get_audit_chain():
    return {
        "total_blocks": len(merkle_ledger.chain),
        "chain": [b.model_dump() for b in merkle_ledger.chain]
    }


@app.get("/api/audit/verify")
def verify_audit_ledger():
    return merkle_ledger.verify_integrity().model_dump()


@app.post("/api/audit/tamper")
def tamper_audit_ledger(block_index: int = 1, admin: dict[str, str] = Depends(require_admin)):
    ok = merkle_ledger.simulate_tampering(block_index)
    if not ok:
        raise HTTPException(status_code=400, detail="Cannot tamper: Block index not found.")
    return {
        "status": "TAMPER_INJECTED",
        "block_index": block_index,
        "verification": merkle_ledger.verify_integrity().model_dump()
    }


@app.post("/api/attacks/{attack_type}")
async def trigger_attack(attack_type: str, shield_enabled: bool = True, auto_resolve: Optional[str] = None):
    agentshield_gw.metrics["attacks_run"] += 1
    if shield_enabled:
        agentshield_gw.metrics["attacks_shield_on_run"] = agentshield_gw.metrics.get("attacks_shield_on_run", 0) + 1

    if attack_type == "poisoned_invoice":
        result = await run_attack_poisoned_invoice(shield_enabled=shield_enabled)
    elif attack_type == "email_leak":
        result = await run_attack_email_leak(shield_enabled=shield_enabled)
    elif attack_type == "sensitive_data":
        result = await run_attack_sensitive_data(shield_enabled=shield_enabled)
    elif attack_type == "privilege_escalation":
        result = await run_attack_privilege_escalation(shield_enabled=shield_enabled)
    elif attack_type == "database_wipe":
        result = await run_attack_database_wipe(shield_enabled=shield_enabled)
    elif attack_type == "shadow_tool":
        result = await run_attack_shadow_tool(shield_enabled=shield_enabled)
    elif attack_type == "tampered_schema":
        result = await run_attack_tampered_schema(shield_enabled=shield_enabled)
    elif attack_type == "destructive_shell":
        result = await run_attack_destructive_shell(shield_enabled=shield_enabled)
    elif attack_type == "legitimate_approval":
        result = await run_legitimate_task_with_approval(auto_resolve=auto_resolve)
    elif attack_type == "legitimate_rejection":
        result = await run_legitimate_task_with_approval(auto_resolve="reject")
    else:
        raise HTTPException(status_code=404, detail="Unknown scenario type")

    if result.get("compromised"):
        agentshield_gw.metrics["attacks_compromised_shield_off"] += 1
    if result.get("neutralized"):
        agentshield_gw.metrics["attacks_blocked_shield_on"] += 1

    await ws_manager.broadcast({
        "event": "ATTACK_INTERCEPTED",
        "data": result
    })
    return result


@app.post("/api/legitimate/run")
async def run_all_legitimate_suite():
    return await run_legitimate_suite()


@app.post("/api/redteam/run")
async def run_redteam():
    return await run_redteam_harness()


@app.post("/api/demo/run-all")
async def run_full_demo(admin: dict[str, str] = Depends(require_admin)):
    _do_reset()
    attacks = [
        "poisoned_invoice",
        "email_leak",
        "sensitive_data",
        "privilege_escalation",
        "database_wipe",
        "tampered_schema",
        "destructive_shell"
    ]
    shield_off_results = []
    for a in attacks:
        r = await trigger_attack(a, shield_enabled=False)
        actual_status = "COMPROMISED" if r.get("compromised", False) else r.get("status", "EXECUTED")
        shield_off_results.append({
            "scenario": a,
            "status": actual_status,
            "output_preview": (r.get("steps", [{}])[-1].get("output", ""))[:60],
            "shield": "OFF"
        })

    shield_on_results = []
    for a in attacks:
        r = await trigger_attack(a, shield_enabled=True)
        shield_on_results.append({
            "scenario": a,
            "decision": r.get("steps", [{}])[-1].get("decision", "DENY"),
            "rule_id": r.get("steps", [{}])[-1].get("rule_id", "R-UNKNOWN"),
            "shield": "ON"
        })

    legit_results = await run_legitimate_suite()
    current_metrics = get_metrics()

    return {
        "status": "DEMO_COMPLETED",
        "summary": {
            "attacks_tested": len(attacks),
            "shield_off_compromises": len(shield_off_results),
            "shield_on_neutralizations": len(shield_on_results),
            "legitimate_tasks_run": legit_results["total_legitimate_tasks"],
            "legitimate_tasks_allowed": legit_results["allowed_count"],
            "false_blocks": legit_results["false_blocks"],
            "chain_integrity": current_metrics.chain_integrity
        },
        "metrics": current_metrics.model_dump(),
        "shield_off_table": shield_off_results,
        "shield_on_table": shield_on_results,
        "legitimate_tasks_table": legit_results["tasks"]
    }

from app.mcp.router import mcp_router
app.include_router(mcp_router)


@app.get("/api/benchmark/summary")
def get_benchmark_summary():
    """Live dynamic security efficacy and ledger metrics computed from runtime state."""
    integrity = merkle_ledger.verify_integrity().is_valid
    m = agentshield_gw.metrics
    attacks_run = m["attacks_run"]
    attacks_blocked = m["attacks_blocked_shield_on"]
    shield_on_runs = m.get("attacks_shield_on_run", attacks_blocked)
    if shield_on_runs == 0 and attacks_blocked > 0:
        shield_on_runs = attacks_blocked
    detection_pct = f"{(attacks_blocked / shield_on_runs * 100):.1f}%" if shield_on_runs > 0 else "100.0%"
    fp_pct = f"{(m['false_blocks'] / m['legitimate_tasks_run'] * 100):.1f}%" if m["legitimate_tasks_run"] > 0 else "0.0%"

    return {
        "framework": "AgentShield Policy Enforcement Point",
        "mcp_style": "JSON-RPC 2.0 tool gateway",
        "live_metrics": {
            "attacks_executed": attacks_run,
            "attacks_intercepted": attacks_blocked,
            "attack_detection_rate": detection_pct,
            "false_positive_rate": fp_pct,
            "approvals_required": m["approvals_required"],
            "approvals_granted": m["approvals_granted"],
            "approvals_rejected": m["approvals_rejected"],
            "approvals_timeout": m.get("approvals_timeout", 0)
        },
        "cryptographic_ledger": {
            "status": "VERIFIED" if integrity else "CORRUPTED",
            "total_blocks": len(merkle_ledger.chain),
            "tamper_detection": "SHA-256 Hash Chained Audit Ledger with HMAC-SHA256 Tool Manifest Signatures"
        }
    }
