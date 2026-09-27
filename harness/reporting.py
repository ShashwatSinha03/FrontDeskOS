"""Reporting adapter - maps internal telemetry/state to organizer canonical schema.

This module provides a clean adapter boundary. If organizer provides a canonical
schema, implement the mapping here. If not, the adapter remains a no-op
that can be extended when the schema becomes available.

Do not invent the organizer schema. Wait for it to be supplied.
"""
from __future__ import annotations

from typing import Any
from dataclasses import dataclass, asdict


@dataclass
class OrganizerReport:
    """Placeholder for organizer canonical report schema.
    
    When the organizer provides the canonical schema, replace this with
    the actual schema definition. The adapter will map internal execution
    data to this schema.
    """
    # Placeholder fields - replace with actual organizer schema
    execution_id: str
    issue: str
    final_status: str  # "completed" | "failed"
    duration_ms: int
    iterations: int
    tests_passed: int
    tests_failed: int
    files_changed: list[str]
    model_calls: int
    tool_calls: int
    
    def to_dict(self) -> dict:
        return asdict(self)


class ReportingAdapter:
    """Maps internal execution data to organizer canonical report schema.
    
    If organizer schema is not yet available, this adapter returns a structured
    summary that can be easily transformed once the schema is known.
    """
    
    def __init__(self) -> None:
        self._schema_version = "1.0"
        self._adapter_version = "1.0"
    
    def adapt(self, execution_summary: dict) -> OrganizerReport:
        """Map internal execution summary to organizer report format."""
        # If organizer schema is available, implement mapping here.
        # For now, return a placeholder that captures key metrics.
        return OrganizerReport(
            execution_id=execution_summary.get("correlation_id", ""),
            issue=execution_summary.get("issue", ""),
            final_status="completed" if execution_summary.get("success") else "failed",
            duration_ms=int(execution_summary.get("duration_ms", 0)),
            iterations=execution_summary.get("iterations", 0),
            tests_passed=execution_summary.get("tests_passed", 0),
            tests_failed=execution_summary.get("tests_failed", 0),
            files_changed=execution_summary.get("changed_files", []),
            model_calls=execution_summary.get("model_calls", 0),
            tool_calls=execution_summary.get("tool_calls", 0),
        )
    
    def validate(self, report: OrganizerReport) -> list[str]:
        """Validate report against organizer schema requirements.
        
        Returns list of validation errors (empty if valid).
        """
        errors = []
        if not report.execution_id:
            errors.append("execution_id is required")
        if not report.issue:
            errors.append("issue is required")
        if report.final_status not in ("completed", "failed"):
            errors.append("final_status must be 'completed' or 'failed'")
        return errors


def create_organizer_report(execution_summary: dict) -> dict:
    """Convenience function to create organizer-compatible report.
    
    Returns a dictionary that can be serialized to JSON.
    When organizer schema is available, this will map to the exact schema.
    """
    adapter = ReportingAdapter()
    report = adapter.adapt(execution_summary)
    errors = adapter.validate(report)
    return {
        "report": report.to_dict(),
        "adapter_version": adapter._adapter_version,
        "schema_version": adapter._schema_version,
        "validation_errors": errors,
    }