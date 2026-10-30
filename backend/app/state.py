from app.pep.approval_manager import ApprovalManager
from app.pep.gateway import PEPGateway
from app.ws_manager import ConnectionManager

ws_manager = ConnectionManager()
approval_manager = ApprovalManager(broadcaster=ws_manager.broadcast)
gateway = PEPGateway(
    approval_manager=approval_manager,
    broadcaster=ws_manager.broadcast,
    # Member 2: attach signature_verifier and audit_hook from app.crypto here.
)
