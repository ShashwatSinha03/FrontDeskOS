"""Internal telemetry events with rich structured data."""
from __future__ import annotations

import json
import time
import uuid
from dataclasses import asdict, dataclass, field
from typing import Any


MODEL_CALL = "model_call"
TOOL_CALL = "tool_call"
STATE_TRANSITION = "state_transition"
CONTEXT_UPDATE = "context_update"
TEST_EXECUTION = "test_execution"
ERROR = "error"
RECOVERY = "recovery"
TERMINATION = "termination"
COMPRESSION = "compression"
EXECUTION_SUMMARY = "execution_summary"

EVENT_TYPES = frozenset({
    MODEL_CALL, TOOL_CALL, STATE_TRANSITION, CONTEXT_UPDATE,
    TEST_EXECUTION, ERROR, RECOVERY, TERMINATION, COMPRESSION, EXECUTION_SUMMARY
})


def _generate_correlation_id() -> str:
    """Generate a short correlation ID for the execution."""
    return uuid.uuid4().hex[:12]


@dataclass
class TelemetryEvent:
    type: str
    payload: dict[str, Any] = field(default_factory=dict)
    timestamp: float = field(default_factory=time.time)
    event_id: int = 0
    turn: int = 0
    state: str = ""
    correlation_id: str = field(default_factory=_generate_correlation_id)
    duration_ms: float | None = None

    def __post_init__(self) -> None:
        if self.type not in EVENT_TYPES:
            raise ValueError(f"unknown telemetry event type: {self.type}")

    def to_dict(self) -> dict[str, Any]:
        d = {
            "type": self.type,
            "timestamp": self.timestamp,
            "event_id": self.event_id,
            "turn": self.turn,
            "state": self.state,
            "correlation_id": self.correlation_id,
            "payload": self.payload
        }
        if self.duration_ms is not None:
            d["duration_ms"] = self.duration_ms
        return d

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "TelemetryEvent":
        return cls(
            type=d["type"],
            payload=d.get("payload", {}),
            timestamp=d.get("timestamp", time.time()),
            event_id=d.get("event_id", 0),
            turn=d.get("turn", 0),
            state=d.get("state", ""),
            correlation_id=d.get("correlation_id", _generate_correlation_id()),
            duration_ms=d.get("duration_ms"),
        )


class TelemetryLogger:
    """Sequential event logger with turn/state tracking."""

    def __init__(self) -> None:
        self._events: list[TelemetryEvent] = []
        self._counter = 0
        self._current_turn = 0
        self._current_state = ""
        self._correlation_id = _generate_correlation_id()

    def emit(
        self,
        event_type: str,
        payload: dict[str, Any],
        turn: int | None = None,
        state: str | None = None,
        duration_ms: float | None = None,
    ) -> TelemetryEvent:
        self._counter += 1
        t = turn if turn is not None else self._current_turn
        s = state if state is not None else self._current_state
        evt = TelemetryEvent(
            event_type,
            payload,
            event_id=self._counter,
            turn=t,
            state=s,
            correlation_id=self._correlation_id,
            duration_ms=duration_ms,
        )
        self._events.append(evt)
        return evt

    def set_turn(self, turn: int) -> None:
        self._current_turn = turn

    def set_state(self, state: str) -> None:
        self._current_state = state

    def get_events(self) -> list[TelemetryEvent]:
        return list(self._events)

    def to_jsonl(self) -> str:
        return "\n".join(json.dumps(e.to_dict()) for e in self._events)

    def get_correlation_id(self) -> str:
        return self._correlation_id