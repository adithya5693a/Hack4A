"""
AGENTSHIELD RFC-Compliant MCP (Model Context Protocol) JSON-RPC 2.0 Gateway
Brochure Focus: AI-agent / MCP / tool-use security
- GET /api/mcp/tools: Returns MCP tools manifest with schemas, risk tiers, and HMAC-SHA256 signatures
- POST /api/mcp/rpc: Intercepts tools/call JSON-RPC invocations through the PEP gateway
"""

import uuid
from typing import Any, Dict, Optional, Union
from fastapi import APIRouter
from pydantic import BaseModel

from app.models import ToolRequest, DecisionStatus
from app.state import gateway
from app.agent.tools import TOOLS_REGISTRY

mcp_router = APIRouter(prefix="/api/mcp", tags=["MCP Gateway"])


class MCPCallParams(BaseModel):
    name: str
    arguments: Dict[str, Any] = {}
    agent_id: Optional[str] = "agent_worker_01"


class MCPRequest(BaseModel):
    jsonrpc: str = "2.0"
    method: str
    params: MCPCallParams
    id: Optional[Union[int, str]] = 1


@mcp_router.get("/tools")
def list_mcp_tools():
    """Returns tools complying with Model Context Protocol specification."""
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
        "mcp_compliance": "Anthropic Model Context Protocol 2024-11-05"
    }


@mcp_router.post("/rpc")
async def mcp_rpc(request: MCPRequest):
    """Intercepts standard MCP JSON-RPC tool calls through PEP Gateway."""
    if request.method != "tools/call":
        return {
            "jsonrpc": "2.0",
            "error": {"code": -32601, "message": f"Method '{request.method}' not found. Supported: 'tools/call'"},
            "id": request.id
        }

    agent_id = request.params.agent_id or "agent_worker_01"
    tool_req = ToolRequest(
        call_id=f"mcp_{uuid.uuid4().hex[:8]}",
        agent_id=agent_id,
        tool_name=request.params.name,
        arguments=request.params.arguments,
        source="user_prompt"
    )

    # Intercept tool call via PEP (which solely writes to the HashChainAuditLedger)
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
    if request.params.name not in TOOLS_REGISTRY:
        return {
            "jsonrpc": "2.0",
            "error": {"code": -32602, "message": f"Tool '{request.params.name}' not found"},
            "id": request.id
        }

    tool_fn = TOOLS_REGISTRY[request.params.name]["fn"]
    result = tool_fn(**request.params.arguments)
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
            "content": [{"type": "text", "text": output_text}]
        },
        "id": request.id
    }
