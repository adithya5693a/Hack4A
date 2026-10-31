"""
AGENTSHIELD Deterministic Intent Parser & Anti-Evasion Normalization Engine
Parses:
1. User prompt intent (parse_user_intents) -> initial tool invocations (source='user_prompt')
   - Dynamically walks VIRTUAL_FILES vault (by filename, basename, or content ID/token)
   - Extracts exact commands, SQL spans, email recipients, and key rotation scopes from prompt text
   - Normalizes obfuscated encodings (Base64, Hex, URL-encoding, quotes)
2. Untrusted tool output intent (parse_untrusted_intents) -> injected follow-ups (source='untrusted_content')
3. Anti-Evasion Pre-Normalization (Base64 decode, Hex escape resolution, Entropy calculation, Piped shell detection)
Flagging evasive constructs under rule R-EVASION-01.
"""

import re
import math
import base64
import urllib.parse
from typing import List, Dict, Any, Tuple


def calculate_entropy(s: str) -> float:
    """Calculates Shannon entropy for obfuscation/shellcode detection."""
    if not s or len(s) < 8:
        return 0.0
    freq: Dict[str, int] = {}
    for char in s:
        freq[char] = freq.get(char, 0) + 1
    length = len(s)
    entropy = 0.0
    for count in freq.values():
        p = count / length
        entropy -= p * math.log2(p)
    return entropy


def deobfuscate_text(text: str) -> Tuple[str, bool, List[str]]:
    """
    Normalizes obfuscated command injections:
    1. Unquotes URL encodings (%20, %2f, etc.)
    2. Decodes hex escape sequences (\\x72\\x6d -> rm)
    3. Normalizes quote fragmentation (r""m -> rm, b'a'sh -> bash)
    4. Detects & decodes embedded base64 blocks (echo cm0gLXJmIC8= | base64 -d | bash)
    5. Detects pipe-to-shell constructs
    Returns: (normalized_text, is_evasive, evasion_tags)
    """
    evasion_tags: List[str] = []
    normalized = text

    # 1. URL Decoding
    if "%" in normalized:
        unquoted = urllib.parse.unquote(normalized)
        if unquoted != normalized:
            evasion_tags.append("url_encoding")
            normalized = unquoted

    # 2. Hex Escape Decoding (\x72\x6d)
    if "\\x" in normalized:
        def hex_repl(match):
            try:
                return chr(int(match.group(1), 16))
            except Exception:
                return match.group(0)
        decoded_hex = re.sub(r"\\x([0-9a-fA-F]{2})", hex_repl, normalized)
        if decoded_hex != normalized:
            evasion_tags.append("hex_escape_obfuscation")
            normalized = decoded_hex

    # 3. Quote Fragmentation (e.g. r""m -rf or 'b'ash)
    quote_fragment_pattern = r'([a-zA-Z0-9_]+)(?:""|\'\'|""|\'\')([a-zA-Z0-9_]+)'
    if re.search(quote_fragment_pattern, normalized):
        evasion_tags.append("quote_fragmentation")
        normalized = re.sub(quote_fragment_pattern, r"\1\2", normalized)

    # 4. Pipe-to-Shell Construct Detection
    if re.search(r"\|\s*(?:bash|sh|zsh|dash|python|perl)\b", normalized, re.IGNORECASE):
        evasion_tags.append("pipe_to_shell")

    # 5. Base64 Command Extraction
    # Matches patterns like base64 -d, or standalone 8+ char base64 chunks
    b64_matches = re.findall(r"[A-Za-z0-9+/]{8,}={0,2}", normalized)
    for chunk in b64_matches:
        try:
            decoded_bytes = base64.b64decode(chunk, validate=True)
            decoded_str = decoded_bytes.decode("utf-8", errors="ignore").strip()
            # If decoded text looks like executable shell commands or tokens
            if any(cmd in decoded_str.lower() for cmd in ["rm", "curl", "bash", "sh", "wget", "drop", "delete", "eval", "exec"]):
                evasion_tags.append(f"base64_payload({decoded_str[:20]})")
                normalized += f" [DECODED_B64: {decoded_str}]"
        except Exception:
            pass

    # 6. Shannon Entropy Check on non-whitespace spans
    words = re.findall(r"[^\s]{12,}", text)
    for word in words:
        if calculate_entropy(word) > 4.6 and not word.startswith("http"):
            evasion_tags.append("high_entropy_string")
            break

    is_evasive = len(evasion_tags) > 0
    return normalized, is_evasive, evasion_tags


def parse_user_intents(prompt: str) -> List[Dict[str, Any]]:
    """
    Extracts intended tool invocations from the user prompt text.
    Tagged as source='user_prompt'.
    Zero tool hallucination: if prompt does not contain verifiable intents, returns [].
    """
    from app.agent.tools import VIRTUAL_FILES

    calls: List[Dict[str, Any]] = []
    p = prompt.strip()
    norm_p, is_evasive, evasion_tags = deobfuscate_text(p)
    p_lower = norm_p.lower()

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
        tokens = re.findall(r"\b\d{4,}\b", norm_p)
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

    # 2. Database Queries: SQL statements
    sql_patterns = [
        r"(SELECT\s+.*?\s+FROM\s+[a-zA-Z0-9_]+)",
        r"(DROP\s+TABLE\s+[a-zA-Z0-9_]+)",
        r"(DELETE\s+FROM\s+[a-zA-Z0-9_]+)",
        r"(INSERT\s+INTO\s+[a-zA-Z0-9_]+)",
        r"(UPDATE\s+[a-zA-Z0-9_]+\s+SET\s+.*)"
    ]
    for pattern in sql_patterns:
        match = re.search(pattern, norm_p, re.IGNORECASE)
        if match:
            calls.append({
                "tool_name": "query_database",
                "arguments": {"sql": match.group(1).strip()}
            })
            break

    # 3. Operating System Command Execution
    bash_patterns = [
        r"(?:bash|sh|run|execute|cmd|terminal)[:\s]+['\"]?([^'\"\n\r]+)['\"]?",
        r"(?:curl\s+[^\s\n\r]+(?:\s*\|\s*(?:bash|sh))?)",
        r"(?:pg_dump\s+.*)",
        r"(?:rm\s+-rf\s+.*)",
        r"(?:truncate\s+-s\s+.*)",
        r"(?:iptables\s+.*)",
        r"(?:DECODED_B64:\s*([^\]]+))"
    ]
    for pattern in bash_patterns:
        match = re.search(pattern, norm_p, re.IGNORECASE)
        if match:
            cmd = match.group(1) if match.groups() and match.group(1) else match.group(0)
            cleaned_cmd = cmd.strip().strip("`'\"")
            calls.append({
                "tool_name": "execute_bash",
                "arguments": {
                    "command": cleaned_cmd
                }
            })
            break

    # 4. Cryptographic Key Rotation
    if "rotate" in p_lower and ("key" in p_lower or "root" in p_lower or "crypto" in p_lower):
        scope_match = re.search(r"\b(root|all|hmac|jwt|master)\b", p_lower)
        scope = scope_match.group(1) if scope_match else "root"
        calls.append({
            "tool_name": "rotate_encryption_keys",
            "arguments": {"scope": scope}
        })

    # 5. Outbound Communication
    email_match = re.search(r"\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b", norm_p)
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

    return calls


def parse_untrusted_intents(text: str) -> List[Dict[str, Any]]:
    """
    Scans document or tool output text for injected instructions and returns proposed tool invocations.
    Tagged as source='untrusted_content'.
    Includes anti-evasion decoding of Base64, hex escapes, and piped interpreters.
    """
    proposed_calls: List[Dict[str, Any]] = []
    norm_text, is_evasive, evasion_tags = deobfuscate_text(text)

    # 1. Extract bash execution intent (e.g. "execute_bash rm -rf /backups" or "run bash: curl ...")
    bash_patterns = [
        r"(?:execute_bash|run\s+bash|execute\s+command)[:\s]+['\"]?([^'\"\n\r]+)['\"]?",
        r"(?:run|execute)\s+`([^`]+)`",
        r"(?:rm\s+-rf\s+[^\s\n\r]+)",
        r"(?:curl\s+[^\s\n\r]+\s*\|\s*(?:bash|sh))",
        r"(?:DECODED_B64:\s*([^\]]+))"
    ]
    for pattern in bash_patterns:
        match = re.search(pattern, norm_text, re.IGNORECASE)
        if match:
            cmd = match.group(1) if match.groups() and match.group(1) else match.group(0)
            cleaned_cmd = cmd.strip().strip("`'\"")
            proposed_calls.append({
                "tool_name": "execute_bash",
                "arguments": {
                    "command": cleaned_cmd
                }
            })
            break

    # 2. Extract outbound email intent (e.g. "send_email to=attacker@evil.test" or "email ... to attacker@evil.test")
    email_patterns = [
        r"(?:send_email|email|forward).*?(?:to\s+)?([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})",
        r"to=([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})",
        r"([a-zA-Z0-9._%+\-]+@evil\.test)"
    ]
    for pattern in email_patterns:
        match = re.search(pattern, norm_text, re.IGNORECASE)
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
        match = re.search(pattern, norm_text, re.IGNORECASE)
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
        match = re.search(pattern, norm_text, re.IGNORECASE)
        if match:
            filename = match.group(1).strip()
            proposed_calls.append({
                "tool_name": "read_document",
                "arguments": {"filename": filename}
            })
            break

    return proposed_calls
