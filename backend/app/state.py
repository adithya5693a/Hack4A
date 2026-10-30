from app.pep.approval_manager import ApprovalManager
from app.pep.gateway import PEPGateway
from app.ws_manager import ConnectionManager
from app.crypto.signer import tool_signer
from app.crypto.merkle_log import merkle_ledger

ws_manager = ConnectionManager()
approval_manager = ApprovalManager(broadcaster=ws_manager.broadcast)


def signature_verifier(tool_name: str) -> bool:
    from app.agent.tools import TOOLS_REGISTRY
    if tool_name not in TOOLS_REGISTRY:
        return False
    t = TOOLS_REGISTRY[tool_name]
    valid, _ = tool_signer.verify_tool(tool_name, t["schema"], t["risk_tier"], t.get("signature", ""))
    return valid


async def audit_hook(request, decision) -> None:
    merkle_ledger.record_event(request, decision)


gateway = PEPGateway(
    approval_manager=approval_manager,
    broadcaster=ws_manager.broadcast,
    signature_verifier=signature_verifier,
    audit_hook=audit_hook,
)
