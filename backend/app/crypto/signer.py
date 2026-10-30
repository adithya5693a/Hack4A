"""
AGENTSHIELD Cryptographic Tool Manifest Signer (Extension 3)
HMAC-SHA256 Digital Signatures for Tool Integrity & Supply Chain Security
"""

import os
import hmac
import hashlib
import json
from typing import Dict, Any, Tuple, Optional

# Development secret with environment variable override
# Enforce cryptographic secret from environment variable for tamper resistance
import secrets
_ENV_SECRET = os.getenv("TOOL_SIGNER_KEY")
if not _ENV_SECRET:
    # Generate ephemeral cryptographically secure 256-bit key if not provided in env
    DEFAULT_SECRET = os.getenv("TOOL_SIGNER_KEY_DEV", secrets.token_hex(32))
else:
    DEFAULT_SECRET = _ENV_SECRET


class ToolSigner:
    def __init__(self, secret_key: str = DEFAULT_SECRET):
        self.secret_key = secret_key.encode("utf-8")
        self._registered_tools: Dict[str, Dict[str, Any]] = {}

    def _canonicalize(self, data: Dict[str, Any]) -> bytes:
        """Serializes dictionary deterministically with sorted keys."""
        return json.dumps(data, sort_keys=True, separators=(',', ':')).encode("utf-8")

    def sign_tool(self, tool_name: str, schema: Dict[str, Any], risk_tier: str) -> str:
        """Generates an HMAC-SHA256 signature for a tool definition."""
        payload = {
            "tool_name": tool_name,
            "schema": schema,
            "risk_tier": risk_tier
        }
        canonical_bytes = self._canonicalize(payload)
        signature = hmac.new(self.secret_key, canonical_bytes, hashlib.sha256).hexdigest()
        
        self._registered_tools[tool_name] = {
            "payload": payload,
            "signature": signature
        }
        return signature

    def verify_tool(self, tool_name: str, schema: Dict[str, Any], risk_tier: str, signature: str) -> Tuple[bool, str]:
        """
        Verifies the cryptographic integrity of a tool manifest.
        Detects parameter tampering or unauthorized shadow tools.
        """
        if tool_name not in self._registered_tools:
            return False, f"REJECTED: Unregistered shadow tool '{tool_name}' detected."

        payload = {
            "tool_name": tool_name,
            "schema": schema,
            "risk_tier": risk_tier
        }
        canonical_bytes = self._canonicalize(payload)
        expected_sig = hmac.new(self.secret_key, canonical_bytes, hashlib.sha256).hexdigest()

        if not hmac.compare_digest(expected_sig, signature):
            return False, f"REJECTED: Signature mismatch for tool '{tool_name}'. Manifest tampering detected!"

        return True, "Tool signature verified and authentic."


# Global tool registry singleton
tool_signer = ToolSigner()
