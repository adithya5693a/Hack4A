"""
AGENTSHIELD Unified Security Policy
Single source of truth for:
- Agent Registries & Lineage
- Role-Based Access Control (RBAC) Permissions
- Tool Tiers & Canonical Aliases
- Email Domain Allowlist
- Sensitive Files & Token Blocklists
"""

from typing import Dict, Any, List

# 1. Server-Side Agent Registry (Anti-Spoofing & Lineage - Product Agents Only)
AGENT_REGISTRY: Dict[str, Dict[str, Any]] = {
    "SYSTEM_ROOT": {
        "role": "system",
        "description": "System root supervisor identity",
        "parent": None
    },
    "agent_admin": {
        "role": "admin",
        "description": "Cryptographic key manager & policy administrator",
        "parent": None
    },
    "agent_security_admin": {
        "role": "admin",
        "description": "Policy and cryptographic administrator",
        "parent": None
    },
    "agent_operator_sysadmin": {
        "role": "operator",
        "description": "Infrastructure & database maintenance operator",
        "parent": "agent_admin"
    },
    "agent_supervisor_accounting": {
        "role": "supervisor",
        "description": "Senior financial controller & auditor",
        "parent": "agent_admin"
    },
    "agent_supervisor_support": {
        "role": "supervisor",
        "description": "Lead customer operations supervisor",
        "parent": "agent_admin"
    },
    "agent_worker_finance": {
        "role": "finance",
        "description": "Accounts payable invoice & billing worker",
        "parent": "agent_supervisor_accounting"
    },
    "agent_worker_support": {
        "role": "worker",
        "description": "General customer & employee ticket processing agent",
        "parent": "agent_supervisor_support"
    },
    "agent_worker_01": {
        "role": "worker",
        "description": "Standard autonomous worker agent",
        "parent": "agent_supervisor_support"
    }
}

# 2. Role-Based Tool Permissions
ROLE_PERMISSIONS: Dict[str, List[str]] = {
    "worker": ["read_document", "read_file", "web_search", "query_database", "query_db"],
    "finance": ["read_document", "read_file", "web_search", "query_database", "query_db", "send_email"],
    "operator": ["read_document", "read_file", "web_search", "query_database", "query_db", "execute_bash", "send_email"],
    "supervisor": ["read_document", "read_file", "web_search", "query_database", "query_db", "execute_bash", "send_email", "delete_database"],
    "admin": ["read_document", "read_file", "web_search", "query_database", "query_db", "execute_bash", "send_email", "rotate_encryption_keys", "delete_database", "admin_reset", "modify_policy", "grant_permissions"],
    "system": ["read_document", "read_file", "web_search", "query_database", "query_db", "execute_bash", "send_email", "rotate_encryption_keys", "delete_database"]
}

# 3. Policy Tool Tiers
TOOL_TIERS: Dict[str, int] = {
    "read_file": 1,
    "read_document": 1,
    "web_search": 1,
    "query_db": 2,
    "query_database": 2,
    "send_email": 2,
    "execute_bash": 3,
    "delete_database": 3,
    "rotate_encryption_keys": 3,
    "admin_reset": 3,
    "modify_policy": 3,
    "grant_permissions": 3,
}

# 4. Admin-Only Tools
ADMIN_ONLY_TOOLS: frozenset[str] = frozenset({
    "delete_database",
    "admin_reset",
    "modify_policy",
    "grant_permissions",
    "rotate_encryption_keys"
})

# 5. Outbound Email Allowed Domains
EMAIL_ALLOWLIST: List[str] = [
    "company.com",
    "company.test",
    "internal.local",
    "example.com",
    "partner.test"
]

ALLOWED_EMAIL_DOMAINS: frozenset[str] = frozenset(EMAIL_ALLOWLIST)

# 6. Sensitive Path Tokens
SENSITIVE_PATH_TOKENS: List[str] = [
    "credentials",
    "production.env",
    ".env",
    "secret",
    "private_key",
    "/etc/shadow",
    ".ssh"
]

# Canonical Tool Aliases
TOOL_ALIASES: Dict[str, str] = {
    "read_file": "read_document",
    "query_db": "query_database"
}
