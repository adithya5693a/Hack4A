import pytest
from app.pep import rbac
from app.pep.policy import AGENT_REGISTRY

TEST_FIXTURE_AGENTS = {
    "agent_shadow_test": {"role": "worker", "description": "Shadow test worker agent", "parent": None},
    "agent-admin": {"role": "admin", "description": "Member 1 test fixture admin", "parent": None},
    "agent-1": {"role": "worker", "description": "Member 1 test fixture worker", "parent": None},
    "agent-gw": {"role": "operator", "description": "Member 1 gateway test agent", "parent": None},
    "approval-agent": {"role": "operator", "description": "Approval flow agent", "parent": None},
    "rate-limit-agent": {"role": "operator", "description": "Rate limit anomaly test agent", "parent": None},
    "demo-agent-1": {"role": "worker", "description": "Demo agent 1", "parent": None},
    "demo-agent-2": {"role": "operator", "description": "Demo agent 2", "parent": None},
    "demo-agent-4": {"role": "worker", "description": "Demo agent 4", "parent": None},
    "worker-1": {"role": "worker", "description": "Worker agent 1", "parent": "supervisor-1"},
    "worker-3": {"role": "worker", "description": "Worker agent 3", "parent": "supervisor-1"},
    "tainted-agent": {"role": "operator", "description": "Tainted test agent", "parent": None},
    "fresh_worker_deputy": {"role": "worker", "description": "Lineage test child agent", "parent": "agent_supervisor_accounting"},
    "mcp_agent": {"role": "worker", "description": "MCP caller agent", "parent": None},
    "agent_ops_intern": {"role": "operator", "description": "Ops intern", "parent": "agent_admin"},
    "agent_supervisor_root": {"role": "supervisor", "description": "Root supervisor", "parent": "agent_admin"},
    "agent_untrusted_marketing": {"role": "worker", "description": "Marketing agent", "parent": "agent_supervisor_root"},
    "agent_db_worker": {"role": "worker", "description": "DB worker", "parent": "agent_supervisor_root"},
}


@pytest.fixture(autouse=True)
def manage_test_registry():
    """Isolates test agents in AGENT_REGISTRY: updates before test, restores exact state after."""
    with rbac._lock:
        rbac._call_windows.clear()
    saved = dict(AGENT_REGISTRY)
    AGENT_REGISTRY.update(TEST_FIXTURE_AGENTS)
    yield
    AGENT_REGISTRY.clear()
    AGENT_REGISTRY.update(saved)
