"""Structured ToolResult for model-readable outputs + Tool protocol."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol


class ToolError(RuntimeError):
    pass


@dataclass
class ToolResult:
    success: bool
    summary: str = ""
    data: Any = None
    error: str | None = None
    duration_ms: float = 0.0
    relevant_files: list[str] = field(default_factory=list)
    exit_code: int | None = None

    @classmethod
    def ok(cls, summary: str, data: Any = None, relevant_files: list[str] | None = None, duration_ms: float = 0.0, exit_code: int | None = None) -> "ToolResult":
        # Backward compat: if first arg is dict, treat as data
        if isinstance(summary, dict) and data is None:
            return cls(success=True, summary="ok", data=summary, relevant_files=relevant_files or [], duration_ms=duration_ms, exit_code=exit_code)
        return cls(success=True, summary=summary, data=data, relevant_files=relevant_files or [], duration_ms=duration_ms, exit_code=exit_code)

    @classmethod
    def fail(cls, error: str, duration_ms: float = 0.0, exit_code: int | None = None, summary: str = "", data: Any = None) -> "ToolResult":
        return cls(success=False, summary=summary or error, error=error, duration_ms=duration_ms, exit_code=exit_code, data=data)

    def to_model_dict(self) -> dict[str, Any]:
        """Compact dict for model consumption."""
        return {
            "success": self.success,
            "summary": self.summary,
            "data": self.data,
            "error": self.error,
            "duration_ms": round(self.duration_ms, 1),
        }


class Tool(Protocol):
    """All tools implement this protocol."""

    name: str
    description: str

    def execute(self, **kwargs) -> ToolResult: ...