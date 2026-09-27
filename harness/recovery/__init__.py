"""Structured failure classification and recovery strategies."""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class FailureType(str, Enum):
    LOGIC_FAILURE = "LOGIC_FAILURE"
    BAD_EDIT = "BAD_EDIT"
    WRONG_ASSUMPTION = "WRONG_ASSUMPTION"
    TOOL_FAILURE = "TOOL_FAILURE"
    ENVIRONMENT_FAILURE = "ENVIRONMENT_FAILURE"
    TEST_FAILURE = "TEST_FAILURE"
    UNKNOWN_FAILURE = "UNKNOWN_FAILURE"


class RecoveryStrategy(str, Enum):
    """Explicit recovery strategies."""
    INSPECT_AND_CORRECT = "INSPECT_AND_CORRECT"       # BAD_EDIT
    REVISE_HYPOTHESIS = "REVISE_HYPOTHESIS"           # LOGIC_FAILURE
    RETURN_TO_UNDERSTAND = "RETURN_TO_UNDERSTAND"     # WRONG_ASSUMPTION
    VALIDATE_AND_RETRY_TOOL = "VALIDATE_AND_RETRY_TOOL"  # TOOL_FAILURE
    INSPECT_ENVIRONMENT = "INSPECT_ENVIRONMENT"       # ENVIRONMENT_FAILURE
    TARGETED_TEST_FIX = "TARGETED_TEST_FIX"           # TEST_FAILURE
    GATHER_EVIDENCE = "GATHER_EVIDENCE"               # UNKNOWN_FAILURE
    EXHAUSTED = "EXHAUSTED"                           # Budget exhausted


@dataclass
class FailureEvidence:
    """Evidence used for failure classification."""
    exit_code: int | None = None
    stdout: str = ""
    stderr: str = ""
    traceback: str = ""
    assertion: str = ""
    failing_test: str = ""
    changed_files: list[str] = field(default_factory=list)
    recent_action: str = ""
    recent_args: dict[str, Any] = field(default_factory=dict)
    recent_hypothesis: str = ""
    tool_name: str = ""
    tool_result_summary: str = ""


@dataclass
class ClassifiedFailure:
    """Structured failure classification result."""
    failure_type: FailureType
    summary: str
    evidence: FailureEvidence
    likely_root_cause: str
    affected_files: list[str]
    affected_tests: list[str]
    confidence: float  # 0.0 - 1.0
    recommended_strategy: RecoveryStrategy
    recommended_next_action: str
    recent_hypothesis: str = ""


@dataclass
class Hypothesis:
    """Tracked hypothesis with evidence."""
    text: str
    supporting_evidence: list[str] = field(default_factory=list)
    contradicting_evidence: list[str] = field(default_factory=list)
    attempts: int = 0
    status: str = "active"  # active, rejected, confirmed
    created_iteration: int = 0
    confirmed_iteration: int | None = None


@dataclass
class Finding:
    """Lightweight structured finding."""
    file: str
    symbol: str
    fact: str
    source: str  # "read_file", "search_code", "test", "edit"
    confidence: str = "medium"  # low, medium, high
    iteration: int = 0
    invalidated: bool = False


# Backward compatibility exports
from dataclasses import dataclass

@dataclass
class FailedAttempt:
    attempt_number: int
    phase: str
    hypothesis: str
    action: str
    tool: str | None
    args: dict[str, Any]
    failure_evidence: str
    result_summary: str


@dataclass
class RecoveryAction:
    description: str
    next_phase: str
    retryable: bool = True


class RecoveryManager:
    """Legacy recovery manager - kept for backward compatibility."""

    def __init__(self, max_same_approach: int = 2) -> None:
        self.failed_attempts: list[FailedAttempt] = []
        self.max_same_approach = max_same_approach

    def record(self, phase: str, hypothesis: str, action: str, tool: str | None, args: dict[str, Any], failure_evidence: str, result_summary: str) -> None:
        self.failed_attempts.append(FailedAttempt(
            attempt_number=len(self.failed_attempts) + 1,
            phase=phase, hypothesis=hypothesis, action=action,
            tool=tool, args=args, failure_evidence=failure_evidence,
            result_summary=result_summary
        ))

    def count_same_approach(self, tool: str, args: dict[str, Any]) -> int:
        return sum(1 for a in self.failed_attempts if a.tool == tool and a.args == args)

    def should_force_understand(self) -> bool:
        if len(self.failed_attempts) < 2:
            return False
        recent = self.failed_attempts[-self.max_same_approach:]
        if len(recent) < self.max_same_approach:
            return False
        first_tool, first_args = recent[0].tool, recent[0].args
        return all(a.tool == first_tool and a.args == first_args for a in recent)

    def classify_failure(self, test_result, state) -> tuple[str, str]:
        """Legacy classify_failure - delegates to new FailureClassifier."""
        from harness.tools import ToolResult
        if not isinstance(test_result, ToolResult):
            test_result = ToolResult(**test_result) if isinstance(test_result, dict) else ToolResult.fail("invalid")

        evidence = FailureEvidence(
            exit_code=test_result.exit_code,
            stdout=test_result.data.get("stdout", "") if test_result.data else "",
            stderr=test_result.data.get("stderr", "") if test_result.data else "",
            traceback="",
            assertion="",
            failing_test="",
            changed_files=state.changed_files,
            recent_action="",
            recent_args={},
            recent_hypothesis=state.hypothesis,
        )

        # Extract failure info
        data = test_result.data if test_result.data else {}
        if data.get("failures"):
            first = data["failures"][0]
            evidence.failing_test = first.get("test", "")
            evidence.assertion = first.get("error", "")
            evidence.traceback = first.get("traceback", "")

        classifier = FailureClassifier()
        classified = classifier.classify(evidence, state.hypothesis)
        return classified.failure_type.value, classified.likely_root_cause

    def suggest_recovery(self, failure_type: str, hypothesis: str, state) -> RecoveryAction:
        """Legacy suggest_recovery."""
        ft = FailureType(failure_type) if failure_type in FailureType.__members__ else FailureType.UNKNOWN_FAILURE
        evidence = FailureEvidence(recent_hypothesis=hypothesis)

        classifier = FailureClassifier()
        classified = ClassifiedFailure(
            failure_type=ft, summary=hypothesis, evidence=evidence,
            likely_root_cause=hypothesis, affected_files=[], affected_tests=[],
            confidence=0.5, recommended_strategy=RecoveryEngine().get_recovery_plan(
                ClassifiedFailure(failure_type=ft, summary="", evidence=evidence,
                                likely_root_cause="", affected_files=[], affected_tests=[],
                                confidence=0.5, recommended_strategy=RecoveryStrategy.GATHER_EVIDENCE,
                                recommended_next_action="")
            )["strategy"],
            recommended_next_action="gather evidence"
        )

        engine = RecoveryEngine()
        plan = engine.get_recovery_plan(classified)
        strategy = plan["strategy"]

        if strategy == RecoveryStrategy.RETURN_TO_UNDERSTAND:
            return RecoveryAction(description=hypothesis, next_phase="UNDERSTAND")
        elif strategy == RecoveryStrategy.INSPECT_AND_CORRECT:
            return RecoveryAction(description=hypothesis, next_phase="ACT")
        elif strategy == RecoveryStrategy.REVISE_HYPOTHESIS:
            return RecoveryAction(description=hypothesis, next_phase="UNDERSTAND")
        else:
            return RecoveryAction(description=hypothesis, next_phase="ACT")

    def get_recent_failures(self, n: int = 5) -> list:
        return self.failed_attempts[-n:]


class FailureClassifier:
    """Classifies failures from evidence."""

    def classify(self, evidence: FailureEvidence, state_hypothesis: str) -> ClassifiedFailure:
        # Priority order: check most specific first

        # 1. Tool execution failures
        if evidence.tool_name and evidence.exit_code == -1:
            return ClassifiedFailure(
                failure_type=FailureType.TOOL_FAILURE,
                summary=f"Tool '{evidence.tool_name}' failed or timed out",
                evidence=evidence,
                likely_root_cause="Tool execution error or timeout",
                affected_files=[],
                affected_tests=[],
                confidence=0.9,
                recommended_strategy=RecoveryStrategy.VALIDATE_AND_RETRY_TOOL,
                recommended_next_action=f"Validate arguments and retry {evidence.tool_name}",
                recent_hypothesis=state_hypothesis
            )

        # 2. Environment failures (command not found, permission denied, etc.)
        if evidence.exit_code is not None and evidence.exit_code == 127:
            return ClassifiedFailure(
                failure_type=FailureType.ENVIRONMENT_FAILURE,
                summary="Command not found",
                evidence=evidence,
                likely_root_cause="Missing executable or PATH issue",
                affected_files=[],
                affected_tests=[],
                confidence=0.95,
                recommended_strategy=RecoveryStrategy.INSPECT_ENVIRONMENT,
                recommended_next_action="Check available commands and environment",
                recent_hypothesis=state_hypothesis
            )

        # 3. Syntax/indentation errors after edit
        error_text = evidence.stderr or evidence.assertion or ""
        if error_text and ("SyntaxError" in error_text or "IndentationError" in error_text):
            return ClassifiedFailure(
                failure_type=FailureType.BAD_EDIT,
                summary="Syntax error introduced by edit",
                evidence=evidence,
                likely_root_cause=f"Bad edit in {evidence.changed_files[0] if evidence.changed_files else 'unknown file'}",
                affected_files=evidence.changed_files,
                affected_tests=[],
                confidence=0.95,
                recommended_strategy=RecoveryStrategy.INSPECT_AND_CORRECT,
                recommended_next_action=f"Read {evidence.changed_files[0]} and fix syntax" if evidence.changed_files else "Check for syntax errors",
                recent_hypothesis=state_hypothesis
            )

        # 4. Import errors after edit
        if error_text and ("ImportError" in error_text or "ModuleNotFoundError" in error_text):
            return ClassifiedFailure(
                failure_type=FailureType.BAD_EDIT,
                summary="Import error likely from bad edit",
                evidence=evidence,
                likely_root_cause=f"Broken import in {evidence.changed_files[0] if evidence.changed_files else 'unknown file'}",
                affected_files=evidence.changed_files,
                affected_tests=[],
                confidence=0.9,
                recommended_strategy=RecoveryStrategy.INSPECT_AND_CORRECT,
                recommended_next_action=f"Read {evidence.changed_files[0]} and fix imports",
                recent_hypothesis=state_hypothesis
            )

        # 5. Test failures with specific assertions
        if evidence.failing_test:
            if evidence.assertion and "AssertionError" in evidence.assertion:
                return ClassifiedFailure(
                    failure_type=FailureType.TEST_FAILURE,
                    summary=f"Test assertion failed: {evidence.failing_test}",
                    evidence=evidence,
                    likely_root_cause=f"Implementation doesn't match expected behavior in {evidence.failing_test}",
                    affected_files=evidence.changed_files,
                    affected_tests=[evidence.failing_test],
                    confidence=0.9,
                    recommended_strategy=RecoveryStrategy.TARGETED_TEST_FIX,
                    recommended_next_action=f"Run targeted test {evidence.failing_test}, inspect assertion, fix implementation",
                    recent_hypothesis=state_hypothesis
                )

        # 6. Runtime errors that look like logic failures
        error_text = evidence.stderr or evidence.assertion or ""
        if error_text and any(e in error_text for e in ["TypeError", "AttributeError", "NameError", "ValueError", "KeyError", "IndexError"]):
            return ClassifiedFailure(
                failure_type=FailureType.LOGIC_FAILURE,
                summary=f"Runtime error in {evidence.failing_test or 'unknown test'}",
                evidence=evidence,
                likely_root_cause=f"Logic error in implementation: {evidence.assertion or evidence.stderr[:100]}",
                affected_files=evidence.changed_files,
                affected_tests=[evidence.failing_test] if evidence.failing_test else [],
                confidence=0.8,
                recommended_strategy=RecoveryStrategy.REVISE_HYPOTHESIS,
                recommended_next_action="Inspect failing test and traceback, revise hypothesis, fix logic",
                recent_hypothesis=state_hypothesis
            )

        # 7. Wrong assumption - when hypothesis contradicts evidence
        if state_hypothesis and evidence.recent_hypothesis:
            # If we've been operating on a hypothesis but evidence contradicts
            if evidence.failing_test and evidence.changed_files:
                return ClassifiedFailure(
                    failure_type=FailureType.WRONG_ASSUMPTION,
                    summary=f"Hypothesis contradicted by test failure",
                    evidence=evidence,
                    likely_root_cause=f"Assumption about {state_hypothesis[:50]} was wrong",
                    affected_files=evidence.changed_files,
                    affected_tests=[evidence.failing_test] if evidence.failing_test else [],
                    confidence=0.75,
                    recommended_strategy=RecoveryStrategy.RETURN_TO_UNDERSTAND,
                    recommended_next_action="Return to UNDERSTAND phase, gather new evidence, form new hypothesis",
                    recent_hypothesis=state_hypothesis
                )

        # 8. Unknown fallback
        return ClassifiedFailure(
            failure_type=FailureType.UNKNOWN_FAILURE,
            summary="Unclassified failure",
            evidence=evidence,
            likely_root_cause="Insufficient evidence to classify",
            affected_files=evidence.changed_files,
            affected_tests=[evidence.failing_test] if evidence.failing_test else [],
            confidence=0.3,
            recommended_strategy=RecoveryStrategy.GATHER_EVIDENCE,
            recommended_next_action="Gather more evidence before attempting fix",
            recent_hypothesis=state_hypothesis
        )


class RecoveryEngine:
    """Executes recovery strategies."""

    def __init__(self, max_recovery_attempts: int = 5):
        self.max_recovery_attempts = max_recovery_attempts
        self.recovery_attempts: list[dict] = []

    def can_recover(self) -> bool:
        return len(self.recovery_attempts) < self.max_recovery_attempts

    def record_attempt(self, failure: ClassifiedFailure, strategy: RecoveryStrategy, action_taken: str, outcome: str) -> None:
        self.recovery_attempts.append({
            "attempt": len(self.recovery_attempts) + 1,
            "failure_type": failure.failure_type.value,
            "strategy": strategy.value,
            "action": action_taken,
            "outcome": outcome,
        })

    def get_recovery_plan(self, failure: ClassifiedFailure) -> dict:
        """Generate deterministic recovery plan from classified failure."""
        plan = {
            "strategy": failure.recommended_strategy,
            "failure_type": failure.failure_type,
            "actions": [],
        }

        if failure.recommended_strategy == RecoveryStrategy.INSPECT_AND_CORRECT:
            plan["actions"] = [
                {"tool": "read_file", "args": {"path": failure.affected_files[0]}} if failure.affected_files else
                {"tool": "search_code", "args": {"pattern": "def "}}
            ]

        elif failure.recommended_strategy == RecoveryStrategy.REVISE_HYPOTHESIS:
            plan["actions"] = [
                {"tool": "read_file", "args": {"path": failure.affected_tests[0]}} if failure.affected_tests else
                {"tool": "search_code", "args": {"pattern": "test_"}}
            ]

        elif failure.recommended_strategy == RecoveryStrategy.RETURN_TO_UNDERSTAND:
            plan["actions"] = [
                {"tool": "search_code", "args": {"pattern": failure.recent_hypothesis[:50] if failure.recent_hypothesis else "def "}}
            ]

        elif failure.recommended_strategy == RecoveryStrategy.VALIDATE_AND_RETRY_TOOL:
            plan["actions"] = [
                {"tool": failure.evidence.tool_name, "args": failure.evidence.recent_args}
            ]

        elif failure.recommended_strategy == RecoveryStrategy.INSPECT_ENVIRONMENT:
            plan["actions"] = [
                {"tool": "run_shell", "args": {"command": "which python3 && python3 --version"}},
                {"tool": "run_shell", "args": {"command": "ls -la"}}
            ]

        elif failure.recommended_strategy == RecoveryStrategy.TARGETED_TEST_FIX:
            plan["actions"] = [
                {"tool": "run_tests", "args": {"command": f"python3 -m pytest {failure.affected_tests[0]} -v"}} if failure.affected_tests else
                {"tool": "run_tests", "args": {}}
            ]

        elif failure.recommended_strategy == RecoveryStrategy.GATHER_EVIDENCE:
            plan["actions"] = [
                {"tool": "search_code", "args": {"pattern": "def "}},
                {"tool": "list_files", "args": {"recursive": True}}
            ]

        return plan


class HypothesisTracker:
    """Tracks and manages hypotheses."""

    def __init__(self):
        self.current: Hypothesis | None = None
        self.history: list[Hypothesis] = []

    def set_hypothesis(self, text: str, iteration: int) -> None:
        self.current = Hypothesis(text=text, created_iteration=iteration)
        self.history.append(self.current)

    def add_supporting_evidence(self, evidence: str) -> None:
        if self.current and evidence not in self.current.supporting_evidence:
            self.current.supporting_evidence.append(evidence)

    def add_contradicting_evidence(self, evidence: str) -> None:
        if self.current and evidence not in self.current.contradicting_evidence:
            self.current.contradicting_evidence.append(evidence)
            # Auto-reject if contradicted
            if len(self.current.contradicting_evidence) >= 2:
                self.current.status = "rejected"

    def reject(self, reason: str) -> None:
        if self.current:
            self.current.status = "rejected"
            self.current.contradicting_evidence.append(f"REJECTED: {reason}")

    def confirm(self, iteration: int) -> None:
        if self.current:
            self.current.status = "confirmed"
            self.current.confirmed_iteration = iteration

    def is_active(self) -> bool:
        return self.current is not None and self.current.status == "active"

    def get_rejected_hypotheses(self) -> list[Hypothesis]:
        return [h for h in self.history if h.status == "rejected"]


class FindingsStore:
    """Lightweight structured findings store."""

    def __init__(self):
        self.findings: list[Finding] = []

    def add(self, finding: Finding) -> None:
        # Check for duplicate
        for existing in self.findings:
            if (existing.file == finding.file and
                existing.symbol == finding.symbol and
                existing.fact == finding.fact):
                # Update confidence to highest
                confidences = {"low": 1, "medium": 2, "high": 3}
                if confidences.get(finding.confidence, 0) > confidences.get(existing.confidence, 0):
                    existing.confidence = finding.confidence
                existing.iteration = finding.iteration
                return
        self.findings.append(finding)

    def get_for_file(self, file: str) -> list[Finding]:
        return [f for f in self.findings if f.file == file and not f.invalidated]

    def get_for_symbol(self, symbol: str) -> list[Finding]:
        return [f for f in self.findings if f.symbol == symbol and not f.invalidated]

    def invalidate_file(self, file: str) -> None:
        for f in self.findings:
            if f.file == file:
                f.invalidated = True

    def get_relevant(self, query: str, max_results: int = 10) -> list[Finding]:
        """Find findings relevant to query."""
        query_lower = query.lower()
        scored = []
        for f in self.findings:
            if f.invalidated:
                continue
            score = 0
            if query_lower in f.fact.lower():
                score += 3
            if query_lower in f.symbol.lower():
                score += 2
            if query_lower in f.file.lower():
                score += 1
            if score > 0:
                scored.append((score, f))
        scored.sort(key=lambda x: -x[0])
        return [f for _, f in scored[:max_results]]

    def to_context_lines(self) -> list[str]:
        """Convert to context lines for model."""
        lines = ["## Relevant Findings"]
        for f in self.findings:
            if not f.invalidated:
                lines.append(f"  {f.file}::{f.symbol} - {f.fact} (source: {f.source}, conf: {f.confidence})")
        if len(lines) == 1:
            return []
        return lines