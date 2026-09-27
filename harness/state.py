"""Agent state + explicit state machine phases."""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from enum import Enum


class AgentPhase(str, Enum):
    BOOT = "BOOT"
    DISCOVER = "DISCOVER"
    UNDERSTAND = "UNDERSTAND"
    PLAN = "PLAN"
    ACT = "ACT"
    VERIFY = "VERIFY"
    DIAGNOSE = "DIAGNOSE"
    DONE = "DONE"
    FAILED = "FAILED"


# Explicit legal transitions. The model never chooses these; Orchestrator does.
LEGAL_TRANSITIONS: dict[AgentPhase, set[AgentPhase]] = {
    AgentPhase.BOOT: {AgentPhase.DISCOVER, AgentPhase.FAILED},
    AgentPhase.DISCOVER: {AgentPhase.UNDERSTAND, AgentPhase.DIAGNOSE, AgentPhase.FAILED},
    AgentPhase.UNDERSTAND: {AgentPhase.PLAN, AgentPhase.DIAGNOSE, AgentPhase.FAILED},
    AgentPhase.PLAN: {AgentPhase.ACT, AgentPhase.DIAGNOSE, AgentPhase.FAILED},
    AgentPhase.ACT: {AgentPhase.VERIFY, AgentPhase.DIAGNOSE, AgentPhase.FAILED},
    AgentPhase.VERIFY: {AgentPhase.DONE, AgentPhase.DIAGNOSE, AgentPhase.FAILED},
    AgentPhase.DIAGNOSE: {
        AgentPhase.DISCOVER,
        AgentPhase.UNDERSTAND,
        AgentPhase.PLAN,
        AgentPhase.ACT,
        AgentPhase.DONE,
        AgentPhase.FAILED,
    },
    AgentPhase.DONE: set(),
    AgentPhase.FAILED: set(),
}


def is_legal_transition(frm: AgentPhase, to: AgentPhase) -> bool:
    return to in LEGAL_TRANSITIONS.get(frm, set())


@dataclass
class AgentState:
    issue: str = ""
    current_state: AgentPhase = AgentPhase.BOOT
    repo_root: str = "."
    explored_files: list[str] = field(default_factory=list)
    findings: list[str] = field(default_factory=list)
    hypothesis: str = ""
    plan: list[str] = field(default_factory=list)
    changed_files: list[str] = field(default_factory=list)
    test_status: str = "not_run"
    failed_approaches: list[str] = field(default_factory=list)
    iteration_count: int = 0
    depth: int = 0
    max_depth: int = 3

    def to_dict(self) -> dict:
        d = asdict(self)
        d["current_state"] = self.current_state.value
        return d

    @classmethod
    def from_dict(cls, d: dict) -> "AgentState":
        data = dict(d)
        if "current_state" in data and isinstance(data["current_state"], str):
            data["current_state"] = AgentPhase(data["current_state"])
        return cls(**data)