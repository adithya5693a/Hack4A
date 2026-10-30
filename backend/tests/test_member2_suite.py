"""
AGENTSHIELD Comprehensive Verification Suite (Pytest and Script Compatible)
Tests Shield ON/OFF Baseline, Provenance-Based Taint, Server-Side Agent Registry,
Egress Allowlisting, Tampered Signatures, Legitimate Suite, and Hash Chain Integrity.
"""

import asyncio
import sys
import os
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.crypto.signer import tool_signer
from app.crypto.merkle_log import merkle_ledger
from app.agent.tools import TOOLS_REGISTRY, ROLE_PERMISSIONS, OUTBOX, clear_outbox
from app.state import gateway
from app.agent.core import AutonomousAgent
from app.models import ToolRequest
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


@pytest.mark.asyncio
async def test_01_signed_tool_manifests():
    """Validates HMAC-SHA256 tool manifest signatures and tampering rejection."""
    valid_tool = TOOLS_REGISTRY["read_document"]
    is_valid, msg = tool_signer.verify_tool(
        "read_document",
        valid_tool["schema"],
        valid_tool["risk_tier"],
        valid_tool["signature"]
    )
    assert is_valid, f"Valid tool failed verification: {msg}"

    is_tampered_valid, tampered_msg = tool_signer.verify_tool(
        "read_document",
        {"tampered": True},
        valid_tool["risk_tier"],
        valid_tool["signature"]
    )
    assert not is_tampered_valid, "Tampered manifest was not detected!"


@pytest.mark.asyncio
async def test_02_shield_off_vs_on_baseline():
    """Validates Criterion 02: Harm visibly succeeds with Shield OFF and fails with Shield ON."""
    res_off = await run_attack_poisoned_invoice(shield_enabled=False)
    assert res_off["compromised"], "Shield OFF failed: attack should succeed visibly!"

    res_on = await run_attack_poisoned_invoice(shield_enabled=True)
    assert res_on["neutralized"], "Shield ON failed: attack should be blocked!"
    assert res_on["steps"][1]["rule_id"] in ["R-TAINT-01", "R-UNTRUSTED-INTENT-01"]


@pytest.mark.asyncio
async def test_03_provenance_based_taint():
    """Validates that reading an untrusted file automatically taints agent without hardcoding."""
    agent = AutonomousAgent(agent_id="agent_worker_finance")
    assert not agent.tainted

    # Step 1: Read untrusted invoice (trust: 'UNTRUSTED')
    s1 = await agent.execute_tool("read_document", {"filename": "invoice_poisoned.txt"}, shield_enabled=True)
    assert s1["decision"] == "ALLOW"
    # Agent context is now automatically tainted
    assert agent.tainted is True

    # Step 2: Tainted agent tries outbound shell -> DENY
    s2 = await agent.execute_tool("execute_bash", {"command": "rm -rf /backups"}, shield_enabled=True, timeout=0.1)
    assert s2["decision"] == "DENY"
    assert s2["rule_id"] == "R-TAINT-01"

    # Step 3: Tainted agent tries read-only query -> Still ALLOWED
    s3 = await agent.execute_tool("query_database", {"sql": "SELECT 1;"}, shield_enabled=True)
    assert s3["decision"] == "ALLOW"
    assert s3["rule_id"] == "R-SQL-02"


@pytest.mark.asyncio
async def test_04_server_side_role_anti_spoofing():
    """Validates server-side agent registry: client claiming role='admin' on worker is ignored."""
    # agent_worker_support is registered as 'worker' server-side
    req = ToolRequest(
        call_id="call_spoof_test",
        agent_id="agent_worker_support",
        agent_role="admin",  # Client spoof attempt
        tool_name="rotate_encryption_keys",
        arguments={"scope": "global"}
    )
    decision = gateway.evaluate_risk(req)
    # Server enforces true role ('worker') and blocks
    assert decision.status == "DENY"
    assert decision.rule_id == "R-RBAC-01"

    # Unknown agent_id is rejected by R-IDENTITY-01
    req_unknown = ToolRequest(
        call_id="call_unknown",
        agent_id="agent_ghost_unregistered",
        tool_name="read_document",
        arguments={"filename": "q3_report.txt"}
    )
    dec_unknown = gateway.evaluate_risk(req_unknown)
    assert dec_unknown.status == "DENY"
    assert dec_unknown.rule_id == "R-IDENTITY-01"


@pytest.mark.asyncio
async def test_05_outbound_tool_and_egress_allowlist():
    """Validates send_email tool, corporate egress allowlist (R-EGRESS-01), and outbox inspection."""
    clear_outbox()

    # 1. Shield OFF: Leaked credentials visibly enter outbox
    res_leak_off = await run_attack_email_leak(shield_enabled=False)
    assert res_leak_off["compromised"]
    assert len(OUTBOX) == 1
    assert OUTBOX[0]["to"] == "attacker@evil.test"

    # 2. Shield ON: Non-allowlisted recipient blocked by R-EGRESS-01 or R-TAINT-01
    res_leak_on = await run_attack_email_leak(shield_enabled=True)
    assert res_leak_on["neutralized"]


@pytest.mark.asyncio
async def test_06_live_tampered_schema_vs_shadow_tool():
    """Validates live tampered schema (R-SIG-01) vs unregistered shadow tool (R-REG-01)."""
    # 1. Live tampered schema modifies registered tool at runtime
    res_tamper = await run_attack_tampered_schema(shield_enabled=True)
    assert res_tamper["neutralized"]
    assert res_tamper["steps"][0]["rule_id"] == "R-SIG-01"

    # 2. Unregistered shadow tool trapped by registry
    res_shadow = await run_attack_shadow_tool(shield_enabled=True)
    assert res_shadow["neutralized"]
    assert res_shadow["steps"][0]["rule_id"] == "R-REG-01"


@pytest.mark.asyncio
async def test_07_legitimate_human_confirmation_flow():
    """Validates legitimate high-impact action with both APPROVE and REJECT pathways."""
    # APPROVE path -> completed SUCCESS
    res_approve = await run_legitimate_task_with_approval(auto_resolve="approve")
    assert res_approve["completed"]
    assert res_approve["resolved_status"] == "ALLOW"
    assert res_approve["rule_id"] == "R-HUMAN-APPROVE"

    # REJECT path -> halted safely DENIED
    res_reject = await run_legitimate_task_with_approval(auto_resolve="reject")
    assert res_reject["completed"]
    assert res_reject["resolved_status"] == "DENY"
    assert res_reject["rule_id"] == "R-HUMAN-REJECT"


@pytest.mark.asyncio
async def test_08_legitimate_suite_and_false_blocks():
    """Validates the 6-task legitimate suite and verifies false_blocks computation."""
    res = await run_legitimate_suite()
    assert res["total_legitimate_tasks"] == 6
    assert res["allowed_count"] == 5  # 5 allowed, 1 was intentionally rejected operator action
    assert res["false_blocks"] == 0   # Zero false blocks on legitimate requests


@pytest.mark.asyncio
async def test_09_redteam_15_variants_harness():
    """Validates the 15-variant adversarial red-team harness."""
    report = await run_redteam_harness()
    assert report["total_variants"] == 15
    assert report["blocked"] == 15
    assert report["bypassed"] == 0
    assert report["bypass_rate_percent"] == 0.0


@pytest.mark.asyncio
async def test_10_tamper_evident_hash_chain():
    """Validates cryptographic hash chain integrity and tamper detection."""
    # Check chain integrity
    res_verify = merkle_ledger.verify_integrity()
    assert res_verify.is_valid, f"Chain corrupted: {res_verify.message}"

    # Verify args_preview is present in latest block
    latest = merkle_ledger.chain[-1]
    assert hasattr(latest, "args_preview")
    assert len(latest.args_preview) <= 80

    # Simulate DB tamper and verify mathematical detection
    merkle_ledger.simulate_tampering(block_index=2)
    tampered_verify = merkle_ledger.verify_integrity()
    assert not tampered_verify.is_valid
    assert tampered_verify.broken_index == 2


async def run_all_tests():
    print("=" * 75)
    print("AGENTSHIELD VERIFICATION SUITE")
    print("=" * 75)

    merkle_ledger.reset()
    clear_outbox()
    gateway.reset_metrics()

    tests = [
        ("Test 01: Signed Tool Manifests", test_01_signed_tool_manifests),
        ("Test 02: Shield OFF vs ON Baseline", test_02_shield_off_vs_on_baseline),
        ("Test 03: Provenance-Based Taint Tracking", test_03_provenance_based_taint),
        ("Test 04: Server-Side Role Anti-Spoofing", test_04_server_side_role_anti_spoofing),
        ("Test 05: Outbound Email & Egress Allowlist", test_05_outbound_tool_and_egress_allowlist),
        ("Test 06: Live Tampered Schema vs Shadow Tool", test_06_live_tampered_schema_vs_shadow_tool),
        ("Test 07: Legitimate Human Confirmation Flow", test_07_legitimate_human_confirmation_flow),
        ("Test 08: Legitimate Suite & False Blocks", test_08_legitimate_suite_and_false_blocks),
        ("Test 09: Red-Team 15 Variants Harness", test_09_redteam_15_variants_harness),
        ("Test 10: Tamper-Evident Hash Chain Integrity", test_10_tamper_evident_hash_chain),
    ]

    passed = 0
    for name, t_fn in tests:
        try:
            await t_fn()
            print(f"  [PASS] {name}")
            passed += 1
        except Exception as e:
            print(f"  [FAIL] {name}: {str(e)}")

    print("=" * 75)
    print(f"RESULTS: {passed} passed, {len(tests) - passed} failed (Total: {len(tests)})")
    print("=" * 75)


if __name__ == "__main__":
    asyncio.run(run_all_tests())
