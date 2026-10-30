"""
AGENTSHIELD Deterministic Intent Parser
Parses document or tool output text and extracts proposed follow-up tool calls.
Ensures the agent genuinely follows injection cues instead of running hardcoded attacks.
Pure deterministic regex extraction — no LLM required.
"""

import re
from typing import List, Dict, Any


def parse_untrusted_intents(text: str) -> List[Dict[str, Any]]:
    """
    Scans text for injected instructions and returns proposed tool invocations.
    Tagged as source='untrusted_content'.
    """
    proposed_calls: List[Dict[str, Any]] = []

    # 1. Extract bash execution intent (e.g. "execute_bash rm -rf /backups" or "run bash: curl ...")
    bash_patterns = [
        r"(?:execute_bash|run\s+bash|execute\s+command)[:\s]+['\"]?([^'\"\n\r]+)['\"]?",
        r"(?:run|execute)\s+`([^`]+)`",
        r"(?:rm\s+-rf\s+[^\s\n\r]+)",
        r"(?:curl\s+[^\s\n\r]+\s*\|\s*(?:bash|sh))"
    ]
    for pattern in bash_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            cmd = match.group(1) if match.groups() else match.group(0)
            proposed_calls.append({
                "tool_name": "execute_bash",
                "arguments": {"command": cmd.strip()}
            })
            break

    # 2. Extract outbound email intent (e.g. "send_email to=attacker@evil.test" or "email ... to attacker@evil.test")
    email_patterns = [
        r"(?:send_email|email|forward).*?(?:to\s+)?([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})",
        r"to=([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})",
        r"([a-zA-Z0-9._%+\-]+@evil\.test)"
    ]
    for pattern in email_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            recipient = match.group(1).strip()
            proposed_calls.append({
                "tool_name": "send_email",
                "arguments": {
                    "to": recipient,
                    "subject": "EXFILTRATED_DATA",
                    "body": "Sensitive business records exfiltrated per document instructions.",
                    "trusted_origin": False
                }
            })
            break

    # 3. Extract destructive SQL intent (e.g. "DROP TABLE users")
    sql_patterns = [
        r"(DROP\s+TABLE\s+[a-zA-Z0-9_]+)",
        r"(DELETE\s+FROM\s+[a-zA-Z0-9_]+)"
    ]
    for pattern in sql_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            sql = match.group(1).strip()
            proposed_calls.append({
                "tool_name": "query_database",
                "arguments": {"sql": sql}
            })
            break

    # 4. Extract sensitive file read intent (e.g. "read enterprise_vault/credentials.env")
    read_patterns = [
        r"(?:read|fetch|open|cat)\s+([a-zA-Z0-9_/-]+\.(?:env|key|txt))"
    ]
    for pattern in read_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            filename = match.group(1).strip()
            proposed_calls.append({
                "tool_name": "read_document",
                "arguments": {"filename": filename}
            })
            break

    return proposed_calls
