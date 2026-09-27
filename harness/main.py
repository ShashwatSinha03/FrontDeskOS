"""Harness CLI entry point. Called by `make run`."""
from __future__ import annotations

import json
import os
import sys
import time

from harness.config import HarnessConfig
from harness.orchestrator import Orchestrator
from harness.issue import IssueInput
from harness.telemetry import EXECUTION_SUMMARY


def _build_execution_summary(orchestrator: Orchestrator, issue_input, final_state, duration_ms: float) -> dict:
    """Build a compact machine-readable execution summary."""
    events = orchestrator.telemetry.get_events()
    model_calls = [e for e in events if e.type == "model_call"]
    tool_calls = [e for e in events if e.type == "tool_call"]
    state_transitions = [e for e in events if e.type == "state_transition"]
    test_executions = [e for e in events if e.type == "test_execution"]
    recovery_events = [e for e in events if e.type == "recovery"]
    errors = [e for e in events if e.type == "error"]

    # Count tokens
    total_input_tokens = sum(e.payload.get("input_tokens", 0) or 0 for e in model_calls)
    total_output_tokens = sum(e.payload.get("output_tokens", 0) or 0 for e in model_calls)
    total_tokens = sum(e.payload.get("total_tokens", 0) or 0 for e in model_calls)

    # Count tests
    test_passed = sum(1 for e in test_executions if e.payload.get("success") and e.payload.get("data", {}).get("passed"))
    test_failed = len(test_executions) - test_passed

    # Recovery stats
    recovery_attempts = len([e for e in recovery_events if e.payload.get("strategy")])
    recovery_types = set(e.payload.get("failure_type") for e in recovery_events if e.payload.get("failure_type"))

    return {
        "correlation_id": orchestrator.telemetry.get_correlation_id(),
        "timestamp": time.time(),
        "duration_ms": duration_ms,
        "issue": issue_input.issue,
        "issue_source": issue_input.metadata.get("source", "unknown"),
        "final_state": final_state.current_state.value,
        "success": final_state.current_state.value == "DONE",
        "termination_reason": _get_termination_reason(final_state, orchestrator),
        "iterations": final_state.iteration_count,
        "total_turns": len([e for e in events if e.type == "state_transition"]),
        "depth": final_state.depth,
        "max_depth": final_state.max_depth,
        "max_depth_reached": max(e.payload.get("depth", 0) for e in events),
        "model_calls": len(model_calls),
        "tool_calls": len(tool_calls),
        "state_transitions": len(state_transitions),
        "test_executions": len(test_executions),
        "tests_passed": test_passed,
        "tests_failed": test_failed,
        "recovery_attempts": recovery_attempts,
        "recovery_types": list(recovery_types),
        "errors": len(errors),
        "total_input_tokens": total_input_tokens,
        "total_output_tokens": total_output_tokens,
        "total_tokens": total_tokens,
        "changed_files": final_state.changed_files,
        "explored_files": final_state.explored_files[:50],
        "hypothesis": final_state.hypothesis,
        "plan": final_state.plan,
        "max_depth_reached": final_state.depth,
        "max_iterations": final_state.iteration_count,
        "max_depth_limit": final_state.max_depth,
        "max_recovery_attempts": orchestrator.recovery_engine.max_recovery_attempts,
        "recovery_attempts_used": len(orchestrator.recovery_engine.recovery_attempts),
        "model_calls_total": len(model_calls),
        "tool_calls_total": len(tool_calls),
        # Resource accounting
        "total_input_tokens": total_input_tokens,
        "total_output_tokens": total_output_tokens,
        "total_tokens": total_tokens,
        "tool_calls_by_type": _count_tool_calls_by_type(tool_calls),
        "model_calls_by_phase": _count_model_calls_by_phase(model_calls),
        "context_sizes": _get_context_sizes(orchestrator),
        "compression_events": len([e for e in events if e.type == "compression"]),
        "redundant_actions_skipped": len([e for e in events if e.type == "recovery" and e.payload.get("reason") == "redundant_discovery_skipped"]),
        "repeated_actions_detected": len([e for e in events if e.type == "recovery" and e.payload.get("reason") == "repeated_action_detected"]),
    }


def _count_tool_calls_by_type(tool_calls: list) -> dict[str, int]:
    """Count tool calls by type."""
    counts = {}
    for e in tool_calls:
        tool = e.payload.get("tool") or e.payload.get("name")
        if tool:
            counts[tool] = counts.get(tool, 0) + 1
    return counts


def _count_model_calls_by_phase(model_calls: list) -> dict[str, int]:
    """Count model calls by phase."""
    counts = {}
    for e in model_calls:
        phase = e.payload.get("phase", "unknown")
        counts[phase] = counts.get(phase, 0) + 1
    return counts


def _get_context_sizes(orchestrator) -> dict:
    """Get context sizes from telemetry."""
    events = orchestrator.telemetry.get_events()
    context_events = [e for e in events if e.type == "context_update"]
    sizes = {}
    for e in context_events:
        phase = e.state
        chars = e.payload.get("chars", 0)
        if phase not in sizes or chars > sizes[phase]:
            sizes[phase] = chars
    return sizes


def _get_termination_reason(final_state, orchestrator) -> str:
    if final_state.current_state.value == "DONE":
        return "tests_passed"
    elif final_state.current_state.value == "FAILED":
        if final_state.depth >= final_state.max_depth:
            return "max_depth_exceeded"
        elif not orchestrator.recovery_engine.can_recover():
            return "recovery_budget_exhausted"
        elif final_state.iteration_count >= final_state.max_iterations:
            return "iteration_budget_exhausted"
        else:
            return "unrecoverable_failure"
    return "unknown"


def main() -> int:
    start_time = time.perf_counter()

    try:
        config = HarnessConfig.from_env(require_key=True)
    except RuntimeError as e:
        print(f"[config] {e}", file=sys.stderr)
        return 2

    # Load issue from CLI arg or fallback sources
    cli_issue = sys.argv[1] if len(sys.argv) > 1 else None
    issue_input = IssueInput.load(cli_issue)

    print(f"[harness] Issue: {issue_input.issue[:80]}{'...' if len(issue_input.issue) > 80 else ''}")
    print(f"[harness] Source: {issue_input.metadata.get('source', 'unknown')}")

    orchestrator = Orchestrator(config)
    final_state = orchestrator.run(issue_input)

    duration_ms = (time.perf_counter() - start_time) * 1000

    # Emit execution summary telemetry event
    summary = _build_execution_summary(orchestrator, issue_input, final_state, duration_ms)
    orchestrator.telemetry.emit(EXECUTION_SUMMARY, summary, turn=orchestrator._turn, state=final_state.current_state.value)

    # Write telemetry (to repo_root)
    try:
        telemetry_path = os.path.join(config.repo_root, config.telemetry_path)
        with open(telemetry_path, "w", encoding="utf-8") as f:
            f.write(orchestrator.telemetry.to_jsonl())
    except Exception as e:
        print(f"[telemetry] write failed: {e}", file=sys.stderr)

    # Write machine-readable execution summary
    try:
        summary_path = os.path.join(config.repo_root, config.report_path.replace(".md", "_summary.json"))
        with open(summary_path, "w", encoding="utf-8") as f:
            json.dump(_build_execution_summary(orchestrator, issue_input, final_state, duration_ms), f, indent=2)
    except Exception as e:
        print(f"[summary] write failed: {e}", file=sys.stderr)

    # Write minimal human-readable report (to repo_root)
    try:
        report_path = os.path.join(config.repo_root, config.report_path)
        with open(report_path, "w", encoding="utf-8") as f:
            f.write(f"# Harness Run Report\n\n")
            f.write(f"**Issue:** {issue_input.issue}\n\n")
            f.write(f"**Final State:** {final_state.current_state.value}\n")
            f.write(f"**Iterations:** {final_state.iteration_count}\n")
            f.write(f"**Test Status:** {final_state.test_status}\n")
            f.write(f"**Depth:** {final_state.depth}/{final_state.max_depth}\n")
            f.write(f"\n## Explored Files\n")
            for p in final_state.explored_files[:50]:
                f.write(f"- {p}\n")
            f.write(f"\n## Changed Files\n")
            for p in final_state.changed_files:
                f.write(f"- {p}\n")
            f.write(f"\n## Hypothesis\n{final_state.hypothesis}\n")
            f.write(f"\n## Plan\n")
            for i, step in enumerate(final_state.plan, 1):
                f.write(f"{i}. {step}\n")
            f.write(f"\n## Failed Approaches\n")
            for fa in final_state.failed_approaches:
                f.write(f"- {fa}\n")
    except Exception as e:
        print(f"[report] write failed: {e}", file=sys.stderr)

    print(f"[harness] final state: {final_state.current_state.value} after {final_state.iteration_count} iterations (depth {final_state.depth})")
    print(f"[harness] duration: {duration_ms:.0f}ms")
    return 0 if final_state.current_state.value == "DONE" else 1


if __name__ == "__main__":
    sys.exit(main())