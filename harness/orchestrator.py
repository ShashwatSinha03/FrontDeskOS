"""Explicit state machine orchestrator with recovery engine, hypothesis tracking, findings store."""
from __future__ import annotations

import json
import time
import uuid
from typing import Any

from harness.config import HarnessConfig
from harness.model import ModelAdapter, ModelResponse
from harness.state import AgentPhase, AgentState, is_legal_transition
from harness.telemetry import (
    TelemetryLogger,
    MODEL_CALL,
    TOOL_CALL,
    STATE_TRANSITION,
    CONTEXT_UPDATE,
    TEST_EXECUTION,
    ERROR,
    RECOVERY,
    TERMINATION,
    EXECUTION_SUMMARY,
)
from harness.context import ContextManager, build_model_context, ContextMetadata
from harness.recovery import (
    FailureClassifier,
    RecoveryEngine,
    HypothesisTracker,
    FindingsStore,
    FailureType,
    RecoveryStrategy,
    FailureEvidence,
    ClassifiedFailure,
    Finding,
)
from harness.tools.base import create_toolkit
from harness.issue import IssueInput
from harness.tools import ToolResult


class _Timer:
    """Simple context manager for timing operations."""
    def __init__(self) -> None:
        self.start = time.perf_counter()
        self.end: float | None = None

    def stop(self) -> float:
        self.end = time.perf_counter()
        return (self.end - self.start) * 1000

    @property
    def duration_ms(self) -> float | None:
        if self.end is None:
            return None
        return (self.end - self.start) * 1000


class Orchestrator:
    def __init__(self, config: HarnessConfig) -> None:
        self.config = config
        self.model = ModelAdapter(config)
        self.state = AgentState(repo_root=config.repo_root, max_depth=config.max_depth)
        self.tools = create_toolkit(config.repo_root, config.test_command)
        self.context = ContextManager(config.max_context_chars)
        self.telemetry = TelemetryLogger()
        self._tool_schemas = self.model.get_tool_schemas()
        self._turn = 0
        self._latest_tool_result: ToolResult | None = None
        self._latest_test_result: ToolResult | None = None
        self._action_fingerprints: list[str] = []

        # New Sprint 3 components
        self.failure_classifier = FailureClassifier()
        self.recovery_engine = RecoveryEngine(max_recovery_attempts=config.max_recovery_attempts if hasattr(config, 'max_recovery_attempts') else 5)
        self.hypothesis_tracker = HypothesisTracker()
        self.findings_store = FindingsStore()

        # Backward compatibility
        from harness.recovery import RecoveryManager
        self.recovery = RecoveryManager()

    # --- Telemetry ---
    def _emit(self, event_type: str, payload: dict[str, Any], turn: int | None = None, state: str | None = None, duration_ms: float | None = None) -> None:
        self.telemetry.emit(event_type, payload, turn=turn, state=state, duration_ms=duration_ms)

    def _emit_transition(self, frm: AgentPhase, to: AgentPhase, turn: int, reason: str) -> None:
        self.telemetry.set_state(to.value)
        payload = {
            "from": frm.value,
            "to": to.value,
            "turn": turn,
            "reason": reason,
            "depth": self.state.depth,
            "iteration": self.state.iteration_count,
        }
        self._emit(STATE_TRANSITION, payload, turn=turn, state=to.value)

    # --- State machine ---
    def _transition(self, new_state: AgentPhase, turn: int, reason: str) -> bool:
        if not is_legal_transition(self.state.current_state, new_state):
            self._emit(ERROR, {
                "message": f"illegal transition {self.state.current_state.value} -> {new_state.value}",
                "turn": turn,
                "depth": self.state.depth,
            }, turn=turn, state=self.state.current_state.value)
            return False
        old = self.state.current_state
        self.state.current_state = new_state
        self._emit_transition(old, new_state, turn, reason)
        return True

    def _check_depth_limit(self, turn: int) -> bool:
        if self.state.depth >= self.state.max_depth:
            self._emit(ERROR, {
                "message": f"max depth {self.state.max_depth} exceeded",
                "turn": turn,
                "depth": self.state.depth,
                "max_depth": self.state.max_depth,
            }, turn=turn, state=self.state.current_state.value)
            self._transition(AgentPhase.FAILED, turn, "max_depth_exceeded")
            return False
        return True

    def _check_recovery_budget(self, turn: int) -> bool:
        if not self.recovery_engine.can_recover():
            self._emit(ERROR, {
                "message": f"recovery budget exhausted: max recovery attempts {self.recovery_engine.max_recovery_attempts} exceeded",
                "turn": turn,
                "recovery_attempts": len(self.recovery_engine.recovery_attempts),
            }, turn=turn, state=self.state.current_state.value)
            self._transition(AgentPhase.FAILED, turn, "recovery_budget_exhausted")
            return False
        return True

    def run(self, issue_input: IssueInput) -> AgentState:
        self.state.issue = issue_input.issue
        self.telemetry.set_state(AgentPhase.BOOT.value)
        self._emit(STATE_TRANSITION, {"from": "START", "to": AgentPhase.BOOT.value, "turn": 0, "reason": "initialization"}, turn=0, state=AgentPhase.BOOT.value)

        while self.state.iteration_count < self.config.max_iterations:
            if not self._check_depth_limit(self._turn + 1):
                break

            self._turn = self.state.iteration_count + 1
            self.telemetry.set_turn(self._turn)

            if self.state.current_state == AgentPhase.BOOT:
                self._boot()
            elif self.state.current_state == AgentPhase.DISCOVER:
                self._discover()
            elif self.state.current_state == AgentPhase.UNDERSTAND:
                self._understand()
            elif self.state.current_state == AgentPhase.PLAN:
                self._plan()
            elif self.state.current_state == AgentPhase.ACT:
                self._act()
            elif self.state.current_state == AgentPhase.VERIFY:
                self._verify()
            elif self.state.current_state == AgentPhase.DIAGNOSE:
                self._diagnose()
            elif self.state.current_state in (AgentPhase.DONE, AgentPhase.FAILED):
                break
            else:
                self._transition(AgentPhase.FAILED, self._turn, "unknown_state")
                break

            self.state.iteration_count += 1

        if self.state.current_state not in (AgentPhase.DONE, AgentPhase.FAILED):
            self._emit(ERROR, {
                "message": f"iteration budget exhausted after {self.state.iteration_count} iterations",
                "turn": self._turn,
                "max_iterations": self.config.max_iterations,
            }, turn=self._turn, state=self.state.current_state.value)
            self._transition(AgentPhase.FAILED, self._turn, "iteration_budget_exhausted")

        self._emit(TERMINATION, {
            "final_state": self.state.current_state.value,
            "total_turns": self._turn,
            "final_depth": self.state.depth,
            "final_iteration": self.state.iteration_count,
            "recovery_attempts": len(self.recovery_engine.recovery_attempts),
        }, turn=self._turn, state=self.state.current_state.value)

        # Write telemetry to disk
        self._write_telemetry()

        return self.state

    def _write_telemetry(self) -> None:
        """Write telemetry to disk."""
        import os
        try:
            telemetry_path = os.path.join(self.config.repo_root, self.config.telemetry_path)
            with open(telemetry_path, "w", encoding="utf-8") as f:
                f.write(self.telemetry.to_jsonl())
        except Exception as e:
            # Don't fail the run if telemetry write fails
            pass

    # --- Phase implementations ---

    def _boot(self) -> None:
        self._transition(AgentPhase.DISCOVER, self._turn, "boot_complete")

    def _discover(self) -> None:
        """Adaptive discovery - explore repository based on issue type."""
        ctx, meta = build_model_context(self.state, max_chars=self.config.max_context_chars)
        self._emit(CONTEXT_UPDATE, {"chars": meta.total_chars, "sections": meta.sections, "truncated": meta.truncated}, turn=self._turn, state="DISCOVER")

        prompt = self._discover_prompt(ctx)
        timer = _Timer()
        resp = self.model.generate(prompt, tools=self._tool_schemas)
        self._record_model_call(resp, timer.stop())

        # Track discovery calls for efficiency metrics
        discovery_calls = 0
        for tc in resp.tool_calls or []:
            result = self._execute_tool(tc)
            self._latest_tool_result = result
            self._emit(TOOL_CALL, result.to_model_dict(), turn=self._turn, state="DISCOVER")
            discovery_calls += 1

            if result.success and tc["name"] == "list_files":
                self.state.explored_files = result.data.get("files", [])
                # Add findings
                for f in result.data.get("files", []):
                    self.findings_store.add(Finding(
                        file=f, symbol="", fact=f"File exists: {f}",
                        source="list_files", confidence="high", iteration=self.state.iteration_count
                    ))
            elif result.success and tc["name"] == "search_code":
                for m in result.data.get("matches", []):
                    if m["file"] not in self.state.explored_files:
                        self.state.explored_files.append(m["file"])
                    self.findings_store.add(Finding(
                        file=m["file"], symbol=m.get("match", "").split("(")[0].strip(),
                        fact=f"Match: {m['match'][:100]} at line {m['line']}",
                        source="search_code", confidence="medium", iteration=self.state.iteration_count
                    ))

        # Emit discovery efficiency telemetry
        self._emit(RECOVERY, {"reason": "discovery_complete", "tool_calls": discovery_calls, "files_found": len(self.state.explored_files)}, turn=self._turn, state="DISCOVER")

        self._transition(AgentPhase.UNDERSTAND, self._turn, "discover_complete")

    def _understand(self) -> None:
        """Adaptive understanding - investigate based on issue and discoveries."""
        # Include findings in context
        findings_lines = self.findings_store.to_context_lines()
        ctx, meta = build_model_context(self.state, self._latest_tool_result, max_chars=self.config.max_context_chars)
        if findings_lines:
            ctx = ctx + "\n\n" + "\n".join(findings_lines)
            self._emit(CONTEXT_UPDATE, {"chars": len(ctx), "sections": meta.sections, "truncated": meta.truncated, "findings_added": len(findings_lines)}, turn=self._turn, state="UNDERSTAND")

        prompt = self._understand_prompt(ctx)
        timer = _Timer()
        resp = self.model.generate(prompt, tools=self._tool_schemas)
        self._record_model_call(resp, timer.stop())

        # Track understanding calls for efficiency metrics
        understanding_calls = 0
        for tc in resp.tool_calls or []:
            # Check for redundant discovery
            if tc["name"] in ("list_files", "search_code", "read_file"):
                redundant = self._is_redundant_discovery(tc["name"], tc["args"])
                if redundant:
                    self._emit(RECOVERY, {"reason": "redundant_discovery_skipped", "tool": tc["name"], "args": tc["args"]}, turn=self._turn, state="UNDERSTAND")
                    continue

            fingerprint = self._make_fingerprint(tc["name"], tc["args"])
            self._action_fingerprints.append(fingerprint)

            result = self._execute_tool(tc)
            self._latest_tool_result = result
            self._emit(TOOL_CALL, result.to_model_dict(), turn=self._turn, state="UNDERSTAND")
            understanding_calls += 1

            if result.success and tc["name"] == "read_file":
                path = tc["args"].get("path")
                content = result.data.get("content", "")
                self.findings_store.add(Finding(
                    file=path, symbol="", fact=f"File content: {content[:200]}",
                    source="read_file", confidence="high", iteration=self.state.iteration_count
                ))

        # Emit understanding efficiency telemetry
        self._emit(RECOVERY, {"reason": "understanding_complete", "tool_calls": understanding_calls, "findings_added": len(self.findings_store.findings)}, turn=self._turn, state="UNDERSTAND")

        self._parse_understanding(resp.text)
        # Set hypothesis in tracker
        if self.state.hypothesis:
            self.hypothesis_tracker.set_hypothesis(self.state.hypothesis, self.state.iteration_count)

        self._transition(AgentPhase.PLAN, self._turn, "understanding_complete")

    def _plan(self) -> None:
        findings_lines = self.findings_store.to_context_lines()
        ctx, meta = build_model_context(self.state, self._latest_tool_result, max_chars=self.config.max_context_chars)
        if findings_lines:
            ctx = ctx + "\n\n" + "\n".join(findings_lines)

        self._emit(CONTEXT_UPDATE, {"chars": meta.total_chars, "sections": meta.sections, "truncated": meta.truncated}, turn=self._turn, state="PLAN")

        prompt = self._plan_prompt(ctx)
        timer = _Timer()
        resp = self.model.generate(prompt, tools=self._tool_schemas)
        self._record_model_call(resp, timer.stop())

        self._parse_plan(resp.text)

        if not self.state.plan:
            self.state.plan = ["No plan generated"]
            self._transition(AgentPhase.FAILED, self._turn, "plan_empty")
        else:
            self._transition(AgentPhase.ACT, self._turn, "plan_complete")

    def _act(self) -> None:
        # Check for repeated failed action
        if self._should_force_reconsideration():
            self.hypothesis_tracker.add_contradicting_evidence("Repeated failed action")
            self._transition(AgentPhase.UNDERSTAND, self._turn, "repeated_failed_action_forced_reconsideration")
            return

        findings_lines = self.findings_store.to_context_lines()
        ctx, meta = build_model_context(self.state, self._latest_tool_result, max_chars=self.config.max_context_chars)
        if findings_lines:
            ctx = ctx + "\n\n" + "\n".join(findings_lines)

        self._emit(CONTEXT_UPDATE, {"chars": meta.total_chars, "sections": meta.sections, "truncated": meta.truncated}, turn=self._turn, state="ACT")

        prompt = self._act_prompt(ctx)
        timer = _Timer()
        resp = self.model.generate(prompt, tools=self._tool_schemas)
        self._record_model_call(resp, timer.stop())

        executed = False
        for tc in resp.tool_calls or []:
            # Check for redundant discovery
            if tc["name"] in ("list_files", "search_code", "read_file"):
                redundant = self._is_redundant_discovery(tc["name"], tc["args"])
                if redundant:
                    self._emit(RECOVERY, {"reason": "redundant_discovery_skipped", "tool": tc["name"], "args": tc["args"]}, turn=self._turn, state="ACT")
                    continue

            fingerprint = self._make_fingerprint(tc["name"], tc["args"])
            if fingerprint in self._action_fingerprints:
                self._emit(RECOVERY, {"reason": "repeated_action_detected", "fingerprint": fingerprint}, turn=self._turn, state="ACT")
            self._action_fingerprints.append(fingerprint)

            result = self._execute_tool(tc)
            self._latest_tool_result = result
            self._emit(TOOL_CALL, result.to_model_dict(), turn=self._turn, state="ACT")

            # Record in old recovery manager for compatibility
            self.recovery.record(
                phase="ACT",
                hypothesis=self.state.hypothesis,
                action=tc["name"],
                tool=tc["name"],
                args=tc["args"],
                failure_evidence=result.error or "",
                result_summary=result.summary
            )

            if result.success and tc["name"] == "edit_file":
                path = tc["args"].get("path")
                if path and path not in self.state.changed_files:
                    self.state.changed_files.append(path)
                # Invalidate findings for this file
                self.findings_store.invalidate_file(path)

            executed = True
            break

        if not executed:
            if "done" in resp.text.lower() or "complete" in resp.text.lower():
                # No-op handling: model reports complete but no edits made
                if not self.state.changed_files:
                    # Check if tests already pass - if so, this is a valid no-op
                    test_result = self.tools["run_tests"].execute()
                    self._emit(TEST_EXECUTION, test_result.to_model_dict(), turn=self._turn, state="VERIFY")
                    if test_result.success and test_result.data.get("passed"):
                        self._emit(RECOVERY, {"reason": "no_op_already_correct", "test_status": "passed"}, turn=self._turn, state="ACT")
                        self._transition(AgentPhase.DONE, self._turn, "no_op_tests_passed")
                        return
                    else:
                        # Tests fail but no changes made - need to actually fix something
                        self._emit(RECOVERY, {"reason": "no_op_but_tests_fail", "test_failure": test_result.summary}, turn=self._turn, state="ACT")
                        self._transition(AgentPhase.DIAGNOSE, self._turn, "no_op_tests_fail")
                        return
                self._transition(AgentPhase.VERIFY, self._turn, "model_reports_complete")
            else:
                self._emit(RECOVERY, {"reason": "no_tool_action"}, turn=self._turn, state="ACT")
                self._transition(AgentPhase.DIAGNOSE, self._turn, "no_tool_action")

    def _verify(self) -> None:
        """Deterministic verification - runs tests without model calls."""
        # First run the standard test suite
        result = self.tools["run_tests"].execute()
        self._latest_test_result = result
        self._emit(TEST_EXECUTION, result.to_model_dict(), turn=self._turn, state="VERIFY")

        self.state.test_status = "passed" if result.success and result.data.get("passed") else "failed"

        if result.success and result.data.get("passed"):
            # Confirm hypothesis if active
            if self.hypothesis_tracker.current and self.hypothesis_tracker.current.status == "active":
                self.hypothesis_tracker.confirm(self.state.iteration_count)
            
            # Regression awareness: if files were changed, run broader tests to check for regressions
            if self.state.changed_files:
                self._emit(RECOVERY, {"reason": "running_regression_tests", "changed_files": self.state.changed_files}, turn=self._turn, state="VERIFY")
                regression_result = self.tools["run_tests"].execute()
                self._emit(TEST_EXECUTION, regression_result.to_model_dict(), turn=self._turn, state="VERIFY")
                if not (regression_result.success and regression_result.data.get("passed")):
                    self._emit(RECOVERY, {"reason": "regression_detected", "regression_summary": regression_result.summary}, turn=self._turn, state="VERIFY")
                    self._transition(AgentPhase.DIAGNOSE, self._turn, "regression_detected")
                    return
            
            self._transition(AgentPhase.DONE, self._turn, "tests_passed")
        else:
            # Check for no-op: if no files changed but tests fail, might be pre-existing failure
            if not self.state.changed_files:
                self._emit(RECOVERY, {"reason": "no_changes_made_tests_fail", "test_failure": result.summary}, turn=self._turn, state="VERIFY")
            self._transition(AgentPhase.DIAGNOSE, self._turn, "tests_failed")

    def _diagnose(self) -> None:
        if not self._latest_test_result:
            self._transition(AgentPhase.FAILED, self._turn, "no_test_result_for_diagnosis")
            return

        # Check recovery budget
        if not self._check_recovery_budget(self._turn):
            return

        # Build evidence for classification
        evidence = self._build_failure_evidence()
        classified = self.failure_classifier.classify(evidence, self.state.hypothesis)

        # Update hypothesis tracker
        if classified.failure_type in (FailureType.WRONG_ASSUMPTION, FailureType.LOGIC_FAILURE):
            self.hypothesis_tracker.add_contradicting_evidence(classified.likely_root_cause)
        elif classified.failure_type == FailureType.BAD_EDIT:
            self.hypothesis_tracker.add_contradicting_evidence("Bad edit introduced")

        # Emit classification telemetry
        self._emit(RECOVERY, {
            "failure_type": classified.failure_type.value,
            "summary": classified.summary,
            "root_cause": classified.likely_root_cause,
            "affected_files": classified.affected_files,
            "affected_tests": classified.affected_tests,
            "confidence": classified.confidence,
            "strategy": classified.recommended_strategy.value,
            "next_action": classified.recommended_next_action,
            "evidence": {
                "failing_test": evidence.failing_test,
                "assertion": evidence.assertion,
                "traceback": evidence.traceback[:200] if evidence.traceback else "",
            }
        }, turn=self._turn, state="DIAGNOSE")

        # Get recovery plan
        plan = self.recovery_engine.get_recovery_plan(classified)
        strategy = plan["strategy"]

        # Record recovery attempt
        self.recovery_engine.record_attempt(
            classified, strategy, classified.recommended_next_action, "initiated"
        )

        # Execute recovery strategy deterministically
        target_phase = self._execute_recovery_strategy(classified, plan, strategy)

        if target_phase in ("UNDERSTAND", "DISCOVER"):
            self.state.depth += 1
            if not self._check_depth_limit(self._turn):
                return

        self._transition(target_phase, self._turn, f"recovery_{classified.failure_type.value.lower()}")

    def _build_failure_evidence(self) -> FailureEvidence:
        """Build structured evidence from latest test result."""
        test_result = self._latest_test_result
        data = test_result.data if test_result.data else {}

        failing_test = ""
        assertion = ""
        traceback = ""

        if data.get("failures"):
            first_fail = data["failures"][0]
            failing_test = first_fail.get("test", "")
            assertion = first_fail.get("error", "")
            traceback = first_fail.get("traceback", "")

        return FailureEvidence(
            exit_code=test_result.exit_code,
            stdout=test_result.data.get("stdout", "") if test_result.data else "",
            stderr=test_result.data.get("stderr", "") if test_result.data else "",
            traceback=traceback,
            assertion=assertion,
            failing_test=failing_test,
            changed_files=self.state.changed_files,
            recent_action=self._action_fingerprints[-1] if self._action_fingerprints else "",
            recent_args={},
            recent_hypothesis=self.state.hypothesis,
            tool_name="",
            tool_result_summary=test_result.summary,
        )

    def _execute_recovery_strategy(self, classified: ClassifiedFailure, plan: dict, strategy: RecoveryStrategy) -> AgentPhase:
        """Execute recovery strategy and return target phase."""
        # For now, delegate to the deterministic phase mapping
        # In future, could execute specific tool calls from plan["actions"]

        if strategy == RecoveryStrategy.INSPECT_AND_CORRECT:
            return AgentPhase.ACT
        elif strategy == RecoveryStrategy.REVISE_HYPOTHESIS:
            return AgentPhase.UNDERSTAND
        elif strategy == RecoveryStrategy.RETURN_TO_UNDERSTAND:
            return AgentPhase.UNDERSTAND
        elif strategy == RecoveryStrategy.VALIDATE_AND_RETRY_TOOL:
            return AgentPhase.ACT
        elif strategy == RecoveryStrategy.INSPECT_ENVIRONMENT:
            return AgentPhase.ACT
        elif strategy == RecoveryStrategy.TARGETED_TEST_FIX:
            # Could run targeted test here, but for now go to ACT
            return AgentPhase.ACT
        elif strategy == RecoveryStrategy.GATHER_EVIDENCE:
            return AgentPhase.UNDERSTAND
        elif strategy == RecoveryStrategy.EXHAUSTED:
            return AgentPhase.FAILED
        else:
            return AgentPhase.ACT

    # --- Helpers ---

    def _is_redundant_discovery(self, tool: str, args: dict) -> bool:
        """Check if equivalent discovery was already done recently."""
        fingerprint = self._make_fingerprint(tool, args)
        # Check last 3 discovery actions
        recent_discovery = [fp for fp in self._action_fingerprints[-5:]
                           if fp.startswith(("list_files|", "search_code|", "read_file|"))]
        return fingerprint in recent_discovery

    def _record_model_call(self, resp: ModelResponse, duration_ms: float | None = None) -> None:
        self._emit(MODEL_CALL, {
            "model": resp.model_id,
            "finish_reason": resp.finish_reason,
            "input_tokens": resp.input_tokens,
            "output_tokens": resp.output_tokens,
            "total_tokens": resp.total_tokens,
            "has_tool_calls": resp.tool_calls is not None and len(resp.tool_calls) > 0,
            "tool_calls": [{"name": tc["name"], "args": tc["args"]} for tc in (resp.tool_calls or [])],
            "depth": self.state.depth,
            "iteration": self.state.iteration_count,
        }, turn=self._turn, state=self.state.current_state.value, duration_ms=duration_ms)

    def _execute_tool(self, tool_call: dict[str, Any]) -> ToolResult:
        name = tool_call["name"]
        args = tool_call["args"]
        tool = self.tools.get(name)
        if not tool:
            return ToolResult.fail(f"unknown tool: {name}")
        timer = _Timer()
        result = tool.execute(**args)
        duration = timer.stop()
        return ToolResult(
            success=result.success,
            summary=result.summary,
            data=result.data,
            error=result.error,
            duration_ms=duration,
            relevant_files=result.relevant_files,
            exit_code=result.exit_code,
        )

    def _make_fingerprint(self, tool: str, args: dict) -> str:
        key_parts = [tool]
        for k in sorted(args.keys()):
            if k == "call_id":
                continue  # Exclude call_id from fingerprint
            v = args[k]
            if isinstance(v, str) and len(v) > 100:
                v = v[:100] + "..."
            key_parts.append(f"{k}={v}")
        return "|".join(key_parts)

    def _should_force_reconsideration(self) -> bool:
        # Track repeated failed edit actions specifically
        edit_fingerprints = [fp for fp in self._action_fingerprints if fp.startswith("edit_file|")]
        if len(edit_fingerprints) < 2:
            return False
        recent = edit_fingerprints[-2:]
        return len(set(recent)) == 1

    # --- Prompts ---

    def _discover_prompt(self, ctx: str) -> str:
        return f"""{ctx}

## Task: DISCOVER
Explore the repository to understand its structure. Use list_files (recursive) to get an overview.
Focus on: source structure, test structure, config files, entry points.
Return tool calls only - do not provide analysis yet."""

    def _understand_prompt(self, ctx: str) -> str:
        return f"""{ctx}

## Task: UNDERSTAND
Analyze the issue and repository to form a hypothesis.

Issue: {self.state.issue}

Determine:
1. What behavior is required?
2. What area of code is likely affected?
3. What functions/classes/modules are relevant?
4. What constraints exist?
5. What is your initial hypothesis?

Use search_code and read_file to investigate specific areas.
Respond with your hypothesis and any tool calls needed."""

    def _plan_prompt(self, ctx: str) -> str:
        return f"""{ctx}

## Task: PLAN
Create a concrete actionable plan to fix the issue.

Current hypothesis: {self.state.hypothesis}

Output a JSON object with:
{{
  "goal": "one sentence goal",
  "steps": ["step 1", "step 2", ...],
  "files": ["file1.py", "file2.py", ...],
  "verification": ["how to verify step 1", "how to verify step 2", ...],
  "hypothesis": "refined hypothesis"
}}

Only output the JSON. No extra text."""

    def _act_prompt(self, ctx: str) -> str:
        plan_text = "\n".join(f"  {i+1}. {s}" for i, s in enumerate(self.state.plan))
        return f"""{ctx}

## Task: ACT
Execute the next step of the plan.

Current plan:
{plan_text}

Changed files so far: {self.state.changed_files if self.state.changed_files else "none"}

Propose ONE tool call to advance the plan. Valid tools:
- list_files (explore)
- search_code (find patterns)
- read_file (examine code)
- edit_file (make changes)
- run_shell (run commands)
- run_tests (verify - only when plan complete)

If plan is complete, respond with "PLAN_COMPLETE" and I will run verification.
Otherwise, make ONE tool call."""

    # --- Parsers ---

    def _parse_understanding(self, text: str) -> None:
        lines = text.splitlines()
        for i, line in enumerate(lines):
            if "hypothesis" in line.lower() and ":" in line:
                self.state.hypothesis = line.split(":", 1)[1].strip()
                break
        if not self.state.hypothesis:
            for line in reversed(lines):
                if line.strip():
                    self.state.hypothesis = line.strip()[:200]
                    break

    def _parse_plan(self, text: str) -> None:
        """Parse plan with robust error handling for malformed model output."""
        try:
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                plan_data = json.loads(text[start:end])
                self.state.plan = plan_data.get("steps", [])
                self.state.hypothesis = plan_data.get("hypothesis", self.state.hypothesis)
                # Validate plan structure
                if not isinstance(self.state.plan, list):
                    self.state.plan = []
                # Ensure steps are strings
                self.state.plan = [str(s) for s in self.state.plan if s]
                if not self.state.plan:
                    raise ValueError("Empty plan")
            else:
                raise ValueError("No JSON found in response")
        except Exception as e:
            self._emit(RECOVERY, {"reason": "malformed_plan", "error": str(e), "raw_text": text[:200]}, turn=self._turn, state="PLAN")
            self.state.plan = [line.strip("- ").strip() for line in text.splitlines()
                              if line.strip().startswith(("- ", "1.", "2.", "3.", "Step"))][:10]
            # If still no plan, create a default
            if not self.state.plan:
                self.state.plan = ["Analyze issue", "Identify fix location", "Implement fix", "Verify fix"]