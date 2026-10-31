import pytest
from pathlib import Path
from app.models import ToolRequest
from app.state import gateway
from app.agent.intent_parser import deobfuscate_text, parse_user_intents, parse_untrusted_intents
from app.crypto.merkle_log import HashChainAuditLedger, STORAGE_FILE

@pytest.mark.asyncio
async def test_base64_obfuscation_deobfuscated_and_flagged():
    """Validates base64 encoded payload is de-obfuscated and flagged under R-EVASION-01."""
    payload = "echo cm0gLXJmIC9iYWNrdXBz | base64 -d | bash"
    norm, is_evasive, tags = deobfuscate_text(payload)
    assert is_evasive
    assert "rm -rf /backups" in norm

    req = ToolRequest(
        call_id="call_evasion_test",
        agent_id="agent_operator_sysadmin",
        tool_name="execute_bash",
        arguments={"command": payload}
    )
    decision = gateway.evaluate_risk(req)
    assert decision.status == "DENY"
    assert decision.rule_id == "R-EVASION-01"


@pytest.mark.asyncio
async def test_hex_escape_deobfuscated():
    """Validates hex escape sequences are decoded and flagged under R-EVASION-01."""
    payload = r"\x72\x6d\x20\x2d\x72\x66\x20\x2f"  # rm -rf /
    norm, is_evasive, tags = deobfuscate_text(payload)
    assert is_evasive
    assert "rm -rf /" in norm

    req = ToolRequest(
        call_id="call_hex_test",
        agent_id="agent_operator_sysadmin",
        tool_name="execute_bash",
        arguments={"command": payload}
    )
    decision = gateway.evaluate_risk(req)
    assert decision.status == "DENY"
    assert decision.rule_id == "R-EVASION-01"


def test_durable_audit_ledger_persists_to_file():
    """Validates that audit blocks persist to audit_ledger.jsonl on disk."""
    assert STORAGE_FILE.exists()
    assert STORAGE_FILE.stat().st_size > 0

    ledger = HashChainAuditLedger()
    res = ledger.verify_integrity()
    assert res.is_valid
    assert len(ledger.chain) >= 1
