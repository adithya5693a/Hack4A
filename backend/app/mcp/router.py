"""
AGENTSHIELD JSON-RPC 2.0 MCP Tool Gateway
Brochure Focus: AI-agent / MCP / tool-use security
- GET /api/mcp/tools: Returns tool schemas, risk tiers, and HMAC-SHA256 signatures
- POST /api/mcp/rpc: Intercepts tools/call and tools/list JSON-RPC invocations through the PEP gateway
"""

import uuid
from typing import Any, Dict, Optional, Union
from fastapi import APIRouter
from pydantic import BaseModel

from app.models import ToolRequest, DecisionStatus
from app.state import gateway
from app.agent.tools import TOOLS_REGISTRY
from app.pep.policy import AGENT_REGISTRY

mcp_router = APIRouter(prefix="/api/mcp", tags=["MCP Gateway"])


class MCPCallParams(BaseModel):
    name: Optional[str] = None
    arguments: Dict[str, Any] = {}
    agent_id: Optional[str] = "agent_worker_01"


class MCPRequest(BaseModel):
    jsonrpc: str = "2.0"
    method: str
    params: Optional[MCPCallParams] = None
    id: Optional[Union[int, str]] = 1


@mcp_router.get("/tools")
def list_mcp_tools():
    """Returns tools with risk tiers and HMAC-SHA256 signatures."""
    tools = []
    for name, meta in TOOLS_REGISTRY.items():
        tools.append({
            "name": name,
            "description": f"Risk Tier {meta['risk_tier']} tool: {meta['schema'].get('description', '')}",
            "inputSchema": meta["schema"],
            "security": {
                "risk_tier": meta["risk_tier"],
                "signature": meta.get("signature")
            }
        })
    return {
        "jsonrpc": "2.0",
        "tools": tools,
        "mcp_style": "JSON-RPC 2.0 tool gateway"
    }


@mcp_router.post("/rpc")
async def mcp_rpc(request: MCPRequest):
    """Intercepts standard MCP JSON-RPC tool calls through PEP Gateway."""
    if request.method == "tools/list":
        tools_resp = list_mcp_tools()
        return {
            "jsonrpc": "2.0",
            "result": {
                "tools": tools_resp["tools"],
                "mcp_style": "JSON-RPC 2.0 tool gateway"
            },
            "id": request.id
        }

    if request.method != "tools/call":
        return {
            "jsonrpc": "2.0",
            "error": {"code": -32601, "message": f"Method '{request.method}' not found. Supported: 'tools/call', 'tools/list'"},
            "id": request.id
        }

    params = request.params or MCPCallParams(name="")
    if not params.name:
        return {
            "jsonrpc": "2.0",
            "error": {"code": -32602, "message": "Missing tool name in params"},
            "id": request.id
        }

    agent_id = params.agent_id or "agent_worker_01"
    if agent_id not in AGENT_REGISTRY:
        return {
            "jsonrpc": "2.0",
            "error": {
                "code": -32003,
                "message": f"SecurityPolicyViolation [R-IDENTITY-01]: Unregistered agent identity '{agent_id}'",
                "data": {"rule_id": "R-IDENTITY-01", "decision": "DENY", "risk_score": 100.0}
            },
            "id": request.id
        }

    # Anti-Spoofing: Unauthenticated callers cannot claim admin/system roles
    if AGENT_REGISTRY[agent_id]["role"] in ["admin", "system"]:
        return {
            "jsonrpc": "2.0",
            "error": {
                "code": -32003,
                "message": f"SecurityPolicyViolation [R-IDENTITY-SPOOF]: Privileged agent identity '{agent_id}' requires verified administrative session",
                "data": {"rule_id": "R-IDENTITY-SPOOF", "decision": "DENY", "risk_score": 100.0}
            },
            "id": request.id
        }

    tool_req = ToolRequest(
        call_id=f"mcp_{uuid.uuid4().hex[:8]}",
        agent_id=agent_id,
        tool_name=params.name,
        arguments=params.arguments,
        source="user_prompt"
    )

    # Intercept tool call via PEP (sole authoritative writer to HashChainAuditLedger)
    decision = await gateway.intercept(tool_req)

    if decision.status != DecisionStatus.ALLOW and decision.status != "ALLOW":
        return {
            "jsonrpc": "2.0",
            "error": {
                "code": -32003,
                "message": f"SecurityPolicyViolation [{decision.rule_id}]: {decision.reason}",
                "data": {
                    "rule_id": decision.rule_id,
                    "risk_score": decision.risk_score,
                    "risk_level": getattr(decision, "risk_level", "CRITICAL"),
                    "decision": decision.status.value if hasattr(decision.status, "value") else str(decision.status)
                }
            },
            "id": request.id
        }

    # Execute allowed tool
    if params.name not in TOOLS_REGISTRY:
        return {
            "jsonrpc": "2.0",
            "error": {"code": -32602, "message": f"Tool '{params.name}' not found"},
            "id": request.id
        }

    tool_fn = TOOLS_REGISTRY[params.name]["fn"]
    result = tool_fn(**params.arguments)
    output_text = str(result.get("output", result)) if isinstance(result, dict) else str(result)

    # Scan output before returning to client (taint propagation)
    scan_res = await gateway.scan_tool_output(tool_req.call_id, tool_req.agent_id, tool_req.tool_name, output_text)
    if scan_res.get("flagged"):
        return {
            "jsonrpc": "2.0",
            "error": {
                "code": -32003,
                "message": f"SecurityPolicyViolation [R-TAINT-01]: Output scan detected injection payload: {scan_res.get('matches', [])}",
                "data": {
                    "rule_id": "R-TAINT-01",
                    "risk_score": scan_res.get("score", 95.0),
                    "risk_level": "CRITICAL",
                    "decision": "DENY",
                    "matches": scan_res.get("matches", [])
                }
            },
            "id": request.id
        }

    return {
        "jsonrpc": "2.0",
        "result": {
            "content": [{"type": "text", "text": output_text}],
            "mcp_style": "JSON-RPC 2.0 tool gateway"
        },
        "id": request.id
    }
