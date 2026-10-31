from datetime import datetime, timezone
from enum import Enum
from typing import Any, Literal, Optional, List, Dict
import time

from pydantic import BaseModel, Field


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class DecisionStatus(str, Enum):
    ALLOW = "ALLOW"
    DENY = "DENY"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    REQUIRE_APPROVAL = "REQUIRE_APPROVAL"


class ToolRequest(BaseModel):
    call_id: str
    agent_id: str
    agent_role: Optional[str] = None
    parent_agent_id: Optional[str] = None
    tool_name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)
    timestamp: float = Field(default_factory=time.time)
    originating_prompt_hash: Optional[str] = None
    tainted: bool = False
    source: Literal["user_prompt", "untrusted_content", "trusted_content"] = "user_prompt"


class PolicyDecision(BaseModel):
    call_id: str
    status: Any  # Supports DecisionStatus or str ("ALLOW", "DENY", "REQUIRE_APPROVAL", "PENDING_APPROVAL")
    tier: int = 1
    risk_score: float = 0.0
    risk_level: str = "LOW"
    rule_id: str = "R-POLICY"
    reason: str = ""
    reasons: List[str] = Field(default_factory=list)
    timestamp: Any = Field(default_factory=utc_now_iso)

    def __init__(self, **data):
        super().__init__(**data)
        if self.reason and not self.reasons:
            self.reasons = [self.reason]
        elif self.reasons and not self.reason:
            self.reason = self.reasons[0]


class ApprovalAction(BaseModel):
    action: Optional[Literal["APPROVE", "REJECT"]] = None
    decision: Optional[Literal["APPROVE", "REJECT"]] = None
    call_id: Optional[str] = None
    reviewer: Optional[str] = "security_admin"
    note: Optional[str] = None
    timestamp: float = Field(default_factory=time.time)


class SecurityAlert(BaseModel):
    event: str
    call_id: str
    agent_id: str
    tool_name: str
    status: Any
    tier: int
    risk_score: float
    reasons: List[str]
    timestamp: str = Field(default_factory=utc_now_iso)


class ScanOutputRequest(BaseModel):
    call_id: str
    agent_id: str
    tool_name: str
    output: str


class AgentRunRequest(BaseModel):
    prompt: str
    scenario_id: Optional[str] = None
    shield_enabled: bool = True


class SecurityException(Exception):
    def __init__(
        self,
        decision: PolicyDecision | None = None,
        message: str | None = None,
    ) -> None:
        self.decision = decision
        if message is not None:
            self.message = message
        elif decision is not None and decision.reasons:
            self.message = decision.reasons[-1]
        elif decision is not None and getattr(decision, 'reason', None):
            self.message = decision.reason
        else:
            self.message = "Security exception"
        super().__init__(self.message)


class AuditBlock(BaseModel):
    index: int
    timestamp: Any = Field(default_factory=time.time)
    call_id: str
    agent_id: str
    agent_role: str
    parent_agent_id: Optional[str] = None
    tool_name: str
    arguments_hash: str
    args_preview: str = ""
    decision: Literal["ALLOW", "DENY", "REQUIRE_APPROVAL", "PENDING_APPROVAL"]
    rule_id: str
    reason: str
    risk_score: float
    risk_level: str
    previous_hash: str
    block_hash: str
    signature: Optional[str] = None


class VerificationResult(BaseModel):
    is_valid: bool
    total_blocks: int
    broken_index: Optional[int] = None
    message: str


class SystemMetrics(BaseModel):
    legitimate_tasks_run: int = 0
    legitimate_tasks_allowed: int = 0
    false_blocks: int = 0
    attacks_run: int = 0
    attacks_compromised_shield_off: int = 0
    attacks_blocked_shield_on: int = 0
    approvals_required: int = 0
    approvals_granted: int = 0
    approvals_rejected: int = 0
    approvals_timeout: int = 0
    chain_integrity: bool = True
