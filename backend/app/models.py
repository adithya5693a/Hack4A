from datetime import datetime, timezone
from enum import Enum
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class ToolRequest(BaseModel):
    call_id: str
    agent_id: str
    parent_agent_id: Optional[str] = None
    tool_name: str
    arguments: dict[str, Any]


class DecisionStatus(str, Enum):
    ALLOW = "ALLOW"
    DENY = "DENY"
    PENDING_APPROVAL = "PENDING_APPROVAL"


class PolicyDecision(BaseModel):
    call_id: str
    status: DecisionStatus
    tier: int = Field(ge=1, le=3)
    risk_score: float = Field(ge=0, le=100)
    reasons: list[str]
    timestamp: str = Field(default_factory=utc_now_iso)


class ApprovalAction(BaseModel):
    action: Literal["APPROVE", "REJECT"]
    reviewer: Optional[str] = None
    note: Optional[str] = None


class SecurityAlert(BaseModel):
    event: str
    call_id: str
    agent_id: str
    tool_name: str
    status: DecisionStatus | str
    tier: int
    risk_score: float
    reasons: list[str]
    timestamp: str = Field(default_factory=utc_now_iso)


class ScanOutputRequest(BaseModel):
    call_id: str
    agent_id: str
    tool_name: str
    output: str


class AgentRunRequest(BaseModel):
    prompt: str
    scenario_id: Optional[str] = None


class SecurityException(Exception):
    """Raised when a tool call is denied or an approval is rejected/times out."""

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
        else:
            self.message = "Security exception"
        super().__init__(self.message)
