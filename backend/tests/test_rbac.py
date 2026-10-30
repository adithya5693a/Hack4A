from app.models import ToolRequest
from app.pep.rbac import (
    check_permission,
    get_tier,
)


def _request(
    tool_name: str,
    arguments: dict | None = None,
    *,
    agent_id: str = "worker-1",
    parent_agent_id: str | None = None,
) -> ToolRequest:
    return ToolRequest(
        call_id="call-rbac",
        agent_id=agent_id,
        parent_agent_id=parent_agent_id,
        tool_name=tool_name,
        arguments=arguments or {},
    )


def test_known_tool_tiers() -> None:
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
    # Fail closed: unknown tools are denied by policy
    assert allowed is False


def test_worker_blocked_from_admin_only_tools() -> None:
    allowed, tier, reasons = check_permission(
        _request("delete_database", parent_agent_id="supervisor-1")
    )
    assert allowed is False
    assert tier == 3
    assert any("privilege escalation" in reason for reason in reasons)


def test_admin_allowed_delete_database() -> None:
    allowed, tier, reasons = check_permission(
        _request("delete_database", agent_id="agent-admin", parent_agent_id=None)
    )
    assert allowed is True
    assert tier == 3
    assert not reasons


def test_operator_tier_2_within_limit_allowed() -> None:
    allowed, tier, reasons = check_permission(
        _request(
            "send_email",
            {"to": "alice@company.com", "body": "hello"},
            agent_id="agent-gw",
        )
    )
    assert allowed is True
    assert tier == 2
    assert not reasons
