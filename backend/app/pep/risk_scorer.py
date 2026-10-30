"""Weighted regex risk scoring for tool arguments and model/tool outputs."""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from typing import Any

RISK_ESCALATION_THRESHOLD = 70.0

# (human-readable name, regex, weight). Edit weights here.
# Patterns run against normalized text (lowercase, NFKC, collapsed whitespace).
ARGUMENT_PATTERNS: list[tuple[str, str, float]] = [
    ("rm -rf targeting / ~ or *", r"rm\s+-rf\s*(?:/|~|\*)", 90.0),
    ("rm -rf", r"rm\s+-rf", 60.0),
    ("DROP TABLE/DATABASE", r"\bdrop\s+(table|database)\b", 90.0),
    ("DELETE FROM with no WHERE", r"\bdelete\s+from\b(?!.*\bwhere\b)", 80.0),
    ("TRUNCATE", r"\btruncate\b", 75.0),
    ("curl|wget piped to bash/sh", r"(?:curl|wget)\b.{0,200}\|\s*(?:bash|sh)\b", 90.0),
    ("chmod 777", r"chmod\s+0*777", 50.0),
    ("mkfs", r"\bmkfs(?:\.\w+)?\b", 85.0),
    ("dd if=", r"\bdd\s+if=", 70.0),
    ("fork bomb", r":\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;?", 95.0),
    ("write to /dev/sd*", r">\s*/dev/sd\w*", 90.0),
    ("nc -e", r"\b(?:nc|ncat|netcat)\s+-e\b", 80.0),
    ("base64 -d | sh", r"base64\s+-d\s*\|\s*(?:sh|bash)\b", 85.0),
    ("read /etc/shadow", r"/etc/shadow", 80.0),
    ("read ~/.ssh", r"(?:~|/root|/home/[^/\s]+)/\s*\.ssh\b|\.ssh/(?:id_|authorized)", 70.0),
    (
        "command chaining with dangerous token",
        r"(?:;|&&|\|\|).{0,80}(?:rm\s+-rf|\bmkfs\b|\bdd\s+if=|/etc/shadow|\bdrop\s+|\bchmod\s+0*777)",
        70.0,
    ),
    ("targets /backups", r"/backups\b", 40.0),
    ("targets /var/lib", r"/var/lib\b", 40.0),
]

INJECTION_PATTERNS: list[tuple[str, str, float]] = [
    ("ignore previous instructions", r"ignore previous instructions", 80.0),
    ("ignore all prior", r"ignore all prior", 80.0),
    ("system prompt override", r"system prompt override", 85.0),
    ("system override", r"system override", 70.0),
    ("you are now", r"you are now", 60.0),
    ("disregard your instructions", r"disregard your instructions", 80.0),
    ("new instructions:", r"new instructions:", 75.0),
    ("do not tell the user", r"do not tell the user", 85.0),
    (
        "imperative + tool name",
        r"\b(?:run|call|use|execute|invoke|please)\b.{0,60}"
        r"\b(?:execute_bash|delete_database|query_db|send_email|"
        r"read_file|web_search|admin_reset|modify_policy|grant_permissions)\b",
        70.0,
    ),
    (
        "tool name + imperative",
        r"\b(?:execute_bash|delete_database|query_db|admin_reset|modify_policy)\b"
        r".{0,40}\b(?:now|must|immediately|please)\b",
        70.0,
    ),
]

_ARG_COMPILED = [
    (name, re.compile(pattern, re.IGNORECASE | re.DOTALL), weight)
    for name, pattern, weight in ARGUMENT_PATTERNS
]
_INJECTION_COMPILED = [
    (name, re.compile(pattern, re.IGNORECASE | re.DOTALL), weight)
    for name, pattern, weight in INJECTION_PATTERNS
]


@dataclass(frozen=True)
class RiskResult:
    """Capped 0-100 score plus the names of patterns that fired."""

    score: float
    matches: list[str]


def normalize_text(text: str) -> str:
    """Lowercase, Unicode NFKC, collapse whitespace."""
    normalized = unicodedata.normalize("NFKC", text).lower()
    return re.sub(r"\s+", " ", normalized).strip()


def flatten_arguments(value: Any) -> str:
    """Recursively flatten nested dict/list arguments into a single string."""
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


def _scan(text: str, compiled: list[tuple[str, re.Pattern[str], float]]) -> RiskResult:
    if not text:
        return RiskResult(score=0.0, matches=[])
    normalized = normalize_text(text)
    matches: list[str] = []
    total = 0.0
    for name, pattern, weight in compiled:
        if pattern.search(normalized):
            matches.append(name)
            total += weight
    return RiskResult(score=min(100.0, total), matches=matches)


def scan_arguments(tool_name: str, arguments: dict[str, Any]) -> RiskResult:
    """Score dangerous tokens in a tool's arguments (nested structures flattened)."""
    blob = f"{tool_name} {flatten_arguments(arguments)}"
    return _scan(blob, _ARG_COMPILED)


def scan_output(text: str) -> RiskResult:
    """Score prompt-injection cues in tool or model output text."""
    return _scan(text, _INJECTION_COMPILED)
