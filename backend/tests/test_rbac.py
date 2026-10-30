from app.models import ToolRequest
from app.pep.rbac import ANOMALY_CALL_THRESHOLD, check_permission, get_tier


def _request(
    tool_name: str,
    *,
    agent_id: str = "agent-1",
    parent_agent_id: str | None = None,
    arguments: dict | None = None,
) -> ToolRequest:
    return ToolRequest(
        call_id="c1",
        agent_id=agent_id,
        parent_agent_id=parent_agent_id,
        tool_name=tool_name,
        arguments=arguments or {},
    )


def test_tier_lookup() -> None:
    assert get_tier("read_file") == 1
    assert get_tier("web_search") == 1
    assert get_tier("query_db") == 2
    assert get_tier("send_email") == 2
    assert get_tier("execute_bash") == 3
    assert get_tier("delete_database") == 3


def test_unknown_tool_fails_closed() -> None:
    assert get_tier("totally_unknown_tool") == 3
    allowed, tier, reasons = check_permission(_request("totally_unknown_tool"))
    assert tier == 3
    assert "unknown tool" in reasons
    # Fail closed: unknown tools are treated as critical (human approval), not Tier 1.
    assert allowed is True


def test_worker_blocked_from_admin_only_tools() -> None:
    allowed, tier, reasons = check_permission(
        _request("delete_database", parent_agent_id="supervisor-1")
    )
    assert allowed is False
    assert tier == 3
    assert any("privilege escalation" in reason for reason in reasons)


def test_supervisor_allowed_admin_tool_is_tier_3() -> None:
    allowed, tier, reasons = check_permission(_request("delete_database"))
    assert allowed is True
    assert tier == 3
    assert not any("privilege escalation" in reason for reason in reasons)


def test_tier_2_rate_limit_anomaly() -> None:
    agent_id = "rate-limit-agent"
    last_reasons: list[str] = []
    last_allowed = False
    last_tier = 0
    for _ in range(ANOMALY_CALL_THRESHOLD + 1):
        last_allowed, last_tier, last_reasons = check_permission(
            _request("query_db", agent_id=agent_id, arguments={"query": "SELECT 1"})
        )
    assert last_allowed is True
    assert last_tier == 2
    assert any(reason.startswith("anomaly:") for reason in last_reasons)
    assert any("calls in" in reason for reason in last_reasons)
