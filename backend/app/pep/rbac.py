"""Role-based access control and Tier-2 anomaly checks for the PEP."""

from __future__ import annotations

import re
import threading
import time
from collections import defaultdict, deque
from typing import Any

from app.models import ToolRequest
from app.pep.policy import TOOL_TIERS, ADMIN_ONLY_TOOLS, ALLOWED_EMAIL_DOMAINS

ANOMALY_WINDOW_SECONDS = 10.0
ANOMALY_CALL_THRESHOLD = 5  # more than this many calls in the window
ANOMALY_RISK_BOOST = 25.0

_EMAIL_RE = re.compile(
    r"[a-zA-Z0-9._%+\-]+@([a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})"
)
_DESTRUCTIVE_SQL_RE = re.compile(
    r"""
    \bdrop\s+(table|database|schema|index)\b
    | \btruncate\b
    | \balter\s+table\b
    | \bdelete\s+from\b(?!.*\bwhere\b)
    """,
    re.IGNORECASE | re.DOTALL | re.VERBOSE,
)

_lock = threading.Lock()
_call_windows: dict[str, deque[float]] = defaultdict(deque)


def get_tier(tool_name: str) -> int:
    """Return the policy tier for a tool. Unknown tools fail closed as Tier 3."""
    return TOOL_TIERS.get(tool_name, 3)


def _is_worker(request: ToolRequest) -> bool:
    return request.parent_agent_id is not None


def _record_call(agent_id: str) -> int:
    """Record a call and return how many calls sit in the sliding window."""
    now = time.monotonic()
    with _lock:
        window = _call_windows[agent_id]
        window.append(now)
        cutoff = now - ANOMALY_WINDOW_SECONDS
        while window and window[0] < cutoff:
            window.popleft()
        return len(window)


def _flatten(value: Any) -> str:
    parts: list[str] = []

    def walk(item: Any) -> None:
        if isinstance(item, dict):
            for key, nested in item.items():
                parts.append(str(key))
                walk(nested)
        elif isinstance(item, (list, tuple)):
            for nested in item:
                walk(nested)
        elif item is None:
            return
        else:
            parts.append(str(item))

    walk(value)
    return " ".join(parts)


def _email_domain_anomaly(arguments: dict[str, Any]) -> str | None:
    text = _flatten(arguments)
    domains = {match.group(1).lower() for match in _EMAIL_RE.finditer(text)}
    allowed = {domain.lower() for domain in ALLOWED_EMAIL_DOMAINS}
    for domain in sorted(domains):
        if domain not in allowed:
            return f"anomaly: send_email domain not allowed ({domain})"
    return None


def _destructive_sql_anomaly(arguments: dict[str, Any]) -> str | None:
    sql = arguments.get("query") or arguments.get("sql") or arguments.get("statement")
    text = str(sql) if sql is not None else _flatten(arguments)
    if _DESTRUCTIVE_SQL_RE.search(text):
        return "anomaly: query_db contains destructive SQL"
    return None


def check_permission(request: ToolRequest) -> tuple[bool, int, list[str]]:
    """Return (allowed, tier, reasons). Unknown tools fail closed as Tier 3 with 'unknown tool' reason."""
    reasons: list[str] = []
    tool_name = request.tool_name
    tier = get_tier(tool_name)

    if tool_name not in TOOL_TIERS and tool_name not in ADMIN_ONLY_TOOLS:
        reasons.append("unknown tool")
        tier = 3

    call_count = _record_call(request.agent_id)

    if tool_name in ADMIN_ONLY_TOOLS and _is_worker(request):
        reasons.append("privilege escalation: worker attempted admin-only tool")
        return False, 3, reasons

    if tier == 2:
        if call_count > ANOMALY_CALL_THRESHOLD:
            reasons.append(
                f"anomaly: more than {ANOMALY_CALL_THRESHOLD} calls in "
                f"{int(ANOMALY_WINDOW_SECONDS)} seconds"
            )
        if tool_name == "send_email":
            email_reason = _email_domain_anomaly(request.arguments)
            if email_reason:
                reasons.append(email_reason)
        if tool_name == "query_db":
            sql_reason = _destructive_sql_anomaly(request.arguments)
            if sql_reason:
                reasons.append(sql_reason)

    return True, tier, reasons
