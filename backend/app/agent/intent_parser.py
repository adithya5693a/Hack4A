"""
AGENTSHIELD Deterministic Intent Parser
Parses:
1. User prompt intent (parse_user_intents) -> initial tool invocations (source='user_prompt')
   - Dynamically walks VIRTUAL_FILES vault (by filename, basename, or content ID/token)
   - Extracts exact commands, SQL spans, email recipients, and key rotation scopes from prompt text
   - Unrecognized prompts yield zero tools (no invented default fallbacks)
2. Untrusted tool output intent (parse_untrusted_intents) -> injected follow-ups (source='untrusted_content')
100% deterministic regex extraction — zero external LLM dependencies.
"""

import re
from typing import List, Dict, Any


def parse_user_intents(prompt: str) -> List[Dict[str, Any]]:
    """
    Extracts intended tool invocations from the user prompt text.
    Tagged as source='user_prompt'.
    Zero tool hallucination: if prompt does not contain verifiable intents, returns [].
    """
    from app.agent.tools import VIRTUAL_FILES

    calls: List[Dict[str, Any]] = []
    p = prompt.strip()
    p_lower = p.lower()

    # 1. Vault File Resolution: walk VIRTUAL_FILES dynamically
    matched_file = None

    # Check exact filenames or basenames in prompt
    for filename in VIRTUAL_FILES.keys():
        f_lower = filename.lower()
        base_lower = filename.split("/")[-1].lower()
        if f_lower in p_lower or base_lower in p_lower:
            matched_file = filename
            break

    # If not matched directly by name, check if prompt contains an ID or token inside file content (e.g. 90214)
    if not matched_file:
        tokens = re.findall(r"\b\d{4,}\b", p)
        for token in tokens:
            for filename, file_data in VIRTUAL_FILES.items():
                if token in file_data.get("content", ""):
                    matched_file = filename
                    break
            if matched_file:
                break

    # If still not matched, check keyword hints like 'credentials' or 'manual' or 'report'
    if not matched_file:
        if "credential" in p_lower or "secret" in p_lower:
            for filename in VIRTUAL_FILES.keys():
                if "credential" in filename.lower():
                    matched_file = filename
                    break
        elif "manual" in p_lower:
            for filename in VIRTUAL_FILES.keys():
                if "manual" in filename.lower():
                    matched_file = filename
                    break
        elif "report" in p_lower:
            for filename in VIRTUAL_FILES.keys():
                if "report" in filename.lower():
                    matched_file = filename
                    break

    if matched_file:
        calls.append({
            "tool_name": "read_document",
            "arguments": {"filename": matched_file}
        })

    # 2. Bash Execution Intent: commands extracted directly from prompt text
    # Checks for backtick command (`echo hello`), quoted command, or specific CLI invocations
    cmd_match = re.search(r"`([^`]+)`", p)
    if cmd_match:
        calls.append({
            "tool_name": "execute_bash",
            "arguments": {"command": cmd_match.group(1).strip()}
        })
    else:
        # Check for piped curl, rm -rf, pg_dump, or explicit run/execute quotes
        cli_match = re.search(
            r"(curl\s+[^\s\n\r|]+\s*\|\s*(?:bash|sh)|rm\s+-rf\s+[^\s\n\r]+|pg_dump\s+[^;\n\r]+)",
            p,
            re.IGNORECASE
        )
        if cli_match:
            calls.append({
                "tool_name": "execute_bash",
                "arguments": {"command": cli_match.group(1).strip()}
            })
        else:
            quote_match = re.search(r"(?:run|execute|bash|command)[:\s]+['\"]([^'\"]+)['\"]", p, re.IGNORECASE)
            if quote_match:
                calls.append({
                    "tool_name": "execute_bash",
                    "arguments": {"command": quote_match.group(1).strip()}
                })

    # 3. SQL Database Intent: extracts exact SQL statement from prompt text
    sql_match = re.search(r"\b((?:DROP\s+TABLE|DELETE\s+FROM|SELECT|UPDATE|ALTER\s+TABLE|TRUNCATE)\s+[^;]+;?)", p, re.IGNORECASE)
    if sql_match:
        calls.append({
            "tool_name": "query_database",
            "arguments": {"sql": sql_match.group(1).strip()}
        })

    # 4. Privilege Escalation / Encryption Key Rotation
    if "rotate" in p_lower and ("key" in p_lower or "encryption" in p_lower):
        scope_match = re.search(r"scope[:\s=]+([a-zA-Z0-9_-]+)", p, re.IGNORECASE)
        scope = scope_match.group(1).strip() if scope_match else "default"
        calls.append({
            "tool_name": "rotate_encryption_keys",
            "arguments": {"scope": scope}
        })

    # 5. Outbound Corporate Email: recipient derived strictly from prompt
    email_match = re.search(r"\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b", p)
    if email_match and ("email" in p_lower or "send" in p_lower):
        recipient = email_match.group(1).strip()
        calls.append({
            "tool_name": "send_email",
            "arguments": {
                "to": recipient,
                "subject": "Notification",
                "body": p
            }
        })

    # 6. Unregistered Shadow Tool
    if "unregistered" in p_lower or "shadow" in p_lower:
        calls.append({
            "tool_name": "unregistered_shadow_tool",
            "arguments": {"action": "exfiltrate"}
        })

    # Unknown prompts produce zero tool calls (no default fallback)
    return calls


def parse_untrusted_intents(text: str) -> List[Dict[str, Any]]:
    """
    Scans document or tool output text for injected instructions and returns proposed tool invocations.
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
