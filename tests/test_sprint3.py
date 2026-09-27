"""Sprint 3 tests: failure classification, hypothesis tracking, findings store, recovery engine."""
from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


# --- Failure Classification Tests ---

def test_failure_classifier_logic_failure():
    from harness.recovery import FailureClassifier, FailureEvidence
    classifier = FailureClassifier()
    evidence = FailureEvidence(
        failing_test="test_x",
        assertion="TypeError: unsupported operand",
        stderr="TypeError: unsupported operand",
    )
    result = classifier.classify(evidence, "hypothesis")
    assert result.failure_type.value == "LOGIC_FAILURE"
    assert result.confidence > 0.5


def test_failure_classifier_bad_edit_syntax():
    from harness.recovery import FailureClassifier, FailureEvidence
    classifier = FailureClassifier()
    evidence = FailureEvidence(
        failing_test="test_x",
        assertion="SyntaxError: invalid syntax",
        stderr="SyntaxError: invalid syntax",
        changed_files=["src/main.py"],
    )
    result = classifier.classify(evidence, "hypothesis")
    assert result.failure_type.value == "BAD_EDIT"
    assert "src/main.py" in result.affected_files


def test_failure_classifier_test_failure():
    from harness.recovery import FailureClassifier, FailureEvidence
    classifier = FailureClassifier()
    evidence = FailureEvidence(
        failing_test="test_math.py::test_add",
        assertion="AssertionError: expected 5 got 3",
        changed_files=["src/math.py"],
    )
    result = classifier.classify(evidence, "hypothesis")
    assert result.failure_type.value == "TEST_FAILURE"
    assert result.recommended_strategy.value == "TARGETED_TEST_FIX"


def test_failure_classifier_tool_failure():
    from harness.recovery import FailureClassifier, FailureEvidence
    classifier = FailureClassifier()
    evidence = FailureEvidence(
        tool_name="edit_file",
        exit_code=-1,
        recent_args={"path": "a.py"},
    )
    result = classifier.classify(evidence, "hypothesis")
    assert result.failure_type.value == "TOOL_FAILURE"
    assert result.recommended_strategy.value == "VALIDATE_AND_RETRY_TOOL"


def test_failure_classifier_env_failure():
    from harness.recovery import FailureClassifier, FailureEvidence
    classifier = FailureClassifier()
    evidence = FailureEvidence(
        exit_code=127,
        stderr="command not found",
    )
    result = classifier.classify(evidence, "hypothesis")
    assert result.failure_type.value == "ENVIRONMENT_FAILURE"
    assert result.recommended_strategy.value == "INSPECT_ENVIRONMENT"


def test_failure_classifier_wrong_assumption():
    from harness.recovery import FailureClassifier, FailureEvidence
    classifier = FailureClassifier()
    evidence = FailureEvidence(
        failing_test="test_x",
        changed_files=["src/main.py"],
        recent_hypothesis="wrong function",
    )
    result = classifier.classify(evidence, "wrong function")
    assert result.failure_type.value == "WRONG_ASSUMPTION"
    assert result.recommended_strategy.value == "RETURN_TO_UNDERSTAND"


# --- Hypothesis Tracker Tests ---

def test_hypothesis_tracker_creation():
    from harness.recovery import HypothesisTracker
    tracker = HypothesisTracker()
    tracker.set_hypothesis("initial hypothesis", 1)
    assert tracker.current is not None
    assert tracker.current.text == "initial hypothesis"
    assert tracker.current.status == "active"
    assert tracker.current.created_iteration == 1


def test_hypothesis_tracker_supporting_evidence():
    from harness.recovery import HypothesisTracker
    tracker = HypothesisTracker()
    tracker.set_hypothesis("hypothesis", 1)
    tracker.add_supporting_evidence("evidence 1")
    tracker.add_supporting_evidence("evidence 2")
    assert len(tracker.current.supporting_evidence) == 2


def test_hypothesis_tracker_contradicting_evidence():
    from harness.recovery import HypothesisTracker
    tracker = HypothesisTracker()
    tracker.set_hypothesis("hypothesis", 1)
    tracker.add_contradicting_evidence("contradiction 1")
    tracker.add_contradicting_evidence("contradiction 2")
    assert tracker.current.status == "rejected"


def test_hypothesis_tracker_reject_explicit():
    from harness.recovery import HypothesisTracker
    tracker = HypothesisTracker()
    tracker.set_hypothesis("hypothesis", 1)
    tracker.reject("explicit rejection")
    assert tracker.current.status == "rejected"


def test_hypothesis_tracker_confirm():
    from harness.recovery import HypothesisTracker
    tracker = HypothesisTracker()
    tracker.set_hypothesis("hypothesis", 1)
    tracker.confirm(5)
    assert tracker.current.status == "confirmed"
    assert tracker.current.confirmed_iteration == 5


def test_hypothesis_tracker_rejected_list():
    from harness.recovery import HypothesisTracker
    tracker = HypothesisTracker()
    tracker.set_hypothesis("h1", 1)
    tracker.reject("reason")
    tracker.set_hypothesis("h2", 2)
    tracker.set_hypothesis("h3", 3)
    rejected = tracker.get_rejected_hypotheses()
    assert len(rejected) == 1
    assert rejected[0].text == "h1"


# --- Findings Store Tests ---

def test_findings_store_add():
    from harness.recovery import FindingsStore, Finding
    store = FindingsStore()
    store.add(Finding(file="a.py", symbol="foo", fact="function foo exists", source="search_code"))
    assert len(store.findings) == 1


def test_findings_store_dedupe():
    from harness.recovery import FindingsStore, Finding
    store = FindingsStore()
    store.add(Finding(file="a.py", symbol="foo", fact="function foo exists", source="search_code", confidence="medium"))
    store.add(Finding(file="a.py", symbol="foo", fact="function foo exists", source="read_file", confidence="high"))
    assert len(store.findings) == 1
    assert store.findings[0].confidence == "high"


def test_findings_store_get_for_file():
    from harness.recovery import FindingsStore, Finding
    store = FindingsStore()
    store.add(Finding(file="a.py", symbol="foo", fact="fact 1", source="search_code"))
    store.add(Finding(file="b.py", symbol="bar", fact="fact 2", source="search_code"))
    store.add(Finding(file="a.py", symbol="baz", fact="fact 3", source="read_file"))
    a_findings = store.get_for_file("a.py")
    assert len(a_findings) == 2


def test_findings_store_get_for_symbol():
    from harness.recovery import FindingsStore, Finding
    store = FindingsStore()
    store.add(Finding(file="a.py", symbol="foo", fact="fact 1", source="search_code"))
    store.add(Finding(file="b.py", symbol="foo", fact="fact 2", source="search_code"))
    foo_findings = store.get_for_symbol("foo")
    assert len(foo_findings) == 2


def test_findings_store_invalidate():
    from harness.recovery import FindingsStore, Finding
    store = FindingsStore()
    store.add(Finding(file="a.py", symbol="foo", fact="fact 1", source="search_code"))
    store.invalidate_file("a.py")
    a_findings = store.get_for_file("a.py")
    assert len(a_findings) == 0
    # But finding still exists, just invalidated
    assert store.findings[0].invalidated


def test_findings_store_relevance():
    from harness.recovery import FindingsStore, Finding
    store = FindingsStore()
    store.add(Finding(file="a.py", symbol="foo", fact="function foo adds numbers", source="search_code"))
    store.add(Finding(file="b.py", symbol="bar", fact="function bar multiplies", source="search_code"))
    relevant = store.get_relevant("add", max_results=5)
    assert len(relevant) == 1
    assert relevant[0].symbol == "foo"


def test_findings_store_context_lines():
    from harness.recovery import FindingsStore, Finding
    store = FindingsStore()
    store.add(Finding(file="a.py", symbol="foo", fact="adds numbers", source="search_code", confidence="high", iteration=1))
    lines = store.to_context_lines()
    assert len(lines) == 2
    assert "a.py::foo" in lines[1]
    assert "adds numbers" in lines[1]


# --- Recovery Engine Tests ---

def test_recovery_engine_budget():
    from harness.recovery import RecoveryEngine, ClassifiedFailure, FailureType, RecoveryStrategy, FailureEvidence
    engine = RecoveryEngine(max_recovery_attempts=2)
    assert engine.can_recover()
    
    failure = ClassifiedFailure(
        failure_type=FailureType.LOGIC_FAILURE,
        summary="test",
        evidence=FailureEvidence(),
        likely_root_cause="test",
        affected_files=[],
        affected_tests=[],
        confidence=0.5,
        recommended_strategy=RecoveryStrategy.GATHER_EVIDENCE,
        recommended_next_action="test"
    )
    engine.record_attempt(failure, RecoveryStrategy.GATHER_EVIDENCE, "action", "outcome")
    assert engine.can_recover()
    engine.record_attempt(failure, RecoveryStrategy.GATHER_EVIDENCE, "action", "outcome")
    assert not engine.can_recover()


def test_recovery_engine_plan_bad_edit():
    from harness.recovery import RecoveryEngine, FailureClassifier, FailureEvidence, ClassifiedFailure, FailureType, RecoveryStrategy
    engine = RecoveryEngine()
    classifier = FailureClassifier()
    evidence = FailureEvidence(changed_files=["a.py"], assertion="SyntaxError")
    classified = classifier.classify(evidence, "")
    plan = engine.get_recovery_plan(classified)
    assert plan["strategy"] == RecoveryStrategy.INSPECT_AND_CORRECT


def test_recovery_engine_plan_wrong_assumption():
    from harness.recovery import RecoveryEngine, FailureClassifier, FailureEvidence, ClassifiedFailure, FailureType, RecoveryStrategy
    engine = RecoveryEngine()
    classifier = FailureClassifier()
    evidence = FailureEvidence(failing_test="test_x", changed_files=["a.py"], recent_hypothesis="wrong")
    classified = classifier.classify(evidence, "wrong")
    plan = engine.get_recovery_plan(classified)
    assert plan["strategy"] == RecoveryStrategy.RETURN_TO_UNDERSTAND


# --- Integration Tests with Orchestrator ---

def test_orchestrator_has_recovery_components():
    from harness.config import HarnessConfig
    from harness.orchestrator import Orchestrator
    config = HarnessConfig(api_key="test", max_recovery_attempts=3)
    orch = Orchestrator(config)
    assert hasattr(orch, 'failure_classifier')
    assert hasattr(orch, 'recovery_engine')
    assert hasattr(orch, 'hypothesis_tracker')
    assert hasattr(orch, 'findings_store')
    assert hasattr(orch, 'recovery')  # backward compat


def test_orchestrator_hypothesis_tracker_set():
    from harness.config import HarnessConfig
    from harness.orchestrator import Orchestrator
    from harness.issue import IssueInput
    from harness.model import ModelResponse

    class MockModelAdapter:
        def __init__(self, *args, **kwargs):
            self.call_count = 0
            self.responses = [
                ModelResponse(text="", tool_calls=[{"name": "list_files", "args": {"path": ".", "recursive": True}, "call_id": "1"}]),
                ModelResponse(text="hypothesis: test hypothesis", tool_calls=[]),
            ]
        def generate(self, prompt, tools=None, max_output_tokens=2048):
            self.call_count += 1
            return self.responses[self.call_count - 1] if self.call_count <= len(self.responses) else ModelResponse(text="")
        def get_tool_schemas(self): return []

    import tempfile, os
    with tempfile.TemporaryDirectory() as tmpdir:
        import harness.orchestrator as orch_module
        original = orch_module.ModelAdapter
        orch_module.ModelAdapter = MockModelAdapter
        try:
            config = HarnessConfig(api_key="mock", repo_root=tmpdir, test_command="python3 -m pytest tests -q", max_iterations=5)
            orch = Orchestrator(config)
            orch.model = MockModelAdapter()
            issue = IssueInput.from_cli("Test")
            orch.run(issue)
            # Hypothesis should be tracked
            assert orch.hypothesis_tracker.current is not None
        finally:
            orch_module.ModelAdapter = original


# --- Targeted Test Execution Tests ---

def test_targeted_test_selection():
    """Test that targeted test can be identified from failure."""
    from harness.recovery import FailureClassifier, FailureEvidence, RecoveryEngine, ClassifiedFailure
    classifier = FailureClassifier()
    evidence = FailureEvidence(
        failing_test="test_module.py::test_specific",
        assertion="AssertionError: expected 5 got 3",
    )
    classified = classifier.classify(evidence, "hypothesis")
    assert classified.failure_type.value == "TEST_FAILURE"
    assert classified.affected_tests == ["test_module.py::test_specific"]


# --- Redundancy Tests ---

def test_redundant_discovery_detection():
    """Test that redundant discovery within same phase is detected."""
    from harness.config import HarnessConfig
    from harness.orchestrator import Orchestrator
    from harness.issue import IssueInput
    from harness.model import ModelResponse

    class MockModelAdapter:
        def __init__(self, *args, **kwargs):
            self.call_count = 0
            self.responses = [
                # DISCOVER
                ModelResponse(text="", tool_calls=[{"name": "list_files", "args": {"path": ".", "recursive": True}, "call_id": "1"}]),
                # UNDERSTAND - multiple tool calls in ONE response
                ModelResponse(text="", tool_calls=[
                    {"name": "search_code", "args": {"pattern": "def add", "path": "."}, "call_id": "2"},
                    {"name": "search_code", "args": {"pattern": "def add", "path": "."}, "call_id": "3"},  # redundant
                ]),
                # PLAN
                ModelResponse(text='{"goal": "Fix", "steps": ["Edit"], "files": ["a.py"], "verification": ["test"], "hypothesis": "hyp"}', tool_calls=[]),
                # ACT - edit
                ModelResponse(text="", tool_calls=[{"name": "edit_file", "args": {"path": "a.py", "content": "fixed"}, "call_id": "4"}]),
                # ACT - complete
                ModelResponse(text="PLAN_COMPLETE", tool_calls=[]),
            ]
        def generate(self, prompt, tools=None, max_output_tokens=2048):
            self.call_count += 1
            return self.responses[self.call_count - 1] if self.call_count <= len(self.responses) else ModelResponse(text="PLAN_COMPLETE")
        def get_tool_schemas(self): return []

    import tempfile
    with tempfile.TemporaryDirectory() as tmpdir:
        Path(tmpdir, "a.py").write_text("def add(a, b): return a - b\n")
        Path(tmpdir, "tests").mkdir()
        Path(tmpdir, "tests", "test_a.py").write_text("from a import add\ndef test_add(): assert add(2, 3) == 5\n")

        import harness.orchestrator as orch_module
        original = orch_module.ModelAdapter
        orch_module.ModelAdapter = MockModelAdapter
        try:
            config = HarnessConfig(api_key="mock", repo_root=tmpdir, test_command="python3 -m pytest tests -q", max_iterations=10)
            orch = Orchestrator(config)
            orch.model = MockModelAdapter()
            issue = IssueInput.from_cli("Fix add")
            final = orch.run(issue)
            # Check for redundant discovery event
            redundant_events = [e for e in orch.telemetry.get_events() if e.type == "recovery" and e.payload.get("reason") == "redundant_discovery_skipped"]
            assert len(redundant_events) >= 1, f"Expected redundant discovery event, got {redundant_events}"
        finally:
            import harness.orchestrator as orch_module
            orch_module.ModelAdapter = original


def test_changed_context_allows_retry():
    """Test that legitimate retry after file change is allowed."""
    from harness.config import HarnessConfig
    from harness.orchestrator import Orchestrator
    from harness.issue import IssueInput
    from harness.model import ModelResponse
    from pathlib import Path

    class MockModelAdapter:
        def __init__(self, *args, **kwargs):
            self.call_count = 0
            self.responses = [
                # DISCOVER
                ModelResponse(text="", tool_calls=[{"name": "list_files", "args": {"path": ".", "recursive": True}, "call_id": "1"}]),
                # UNDERSTAND - search + read
                ModelResponse(text="", tool_calls=[
                    {"name": "search_code", "args": {"pattern": "def add", "path": "."}, "call_id": "2"},
                    {"name": "read_file", "args": {"path": "src/calculator.py"}, "call_id": "3"}
                ]),
                # PLAN
                ModelResponse(text='{"goal": "Fix", "steps": ["Edit src/calculator.py"], "files": ["src/calculator.py"], "verification": ["test"], "hypothesis": "wrong op"}', tool_calls=[]),
                # ACT 1 - edit (still wrong)
                ModelResponse(text="", tool_calls=[{"name": "edit_file", "args": {"path": "src/calculator.py", "content": "def add(a, b): return a - b\n"}, "call_id": "3"}]),
                # ACT 1 - complete
                ModelResponse(text="PLAN_COMPLETE", tool_calls=[]),
                # VERIFY fails (no model call)
                # DIAGNOSE
                ModelResponse(text="logic failure - wrong operator", tool_calls=[]),
                # UNDERSTAND 2 - search + read
                ModelResponse(text="", tool_calls=[
                    {"name": "search_code", "args": {"pattern": "def add", "path": "."}, "call_id": "4"},
                    {"name": "read_file", "args": {"path": "src/calculator.py"}, "call_id": "5"}
                ]),
                # PLAN 2
                ModelResponse(text='{"goal": "Fix", "steps": ["Edit src/calculator.py"], "files": ["src/calculator.py"], "verification": ["test"], "hypothesis": "wrong op"}', tool_calls=[]),
                # ACT 2 - correct edit
                ModelResponse(text="", tool_calls=[{"name": "edit_file", "args": {"path": "src/calculator.py", "content": "def add(a: int, b: int) -> int:\n    return a + b\n\ndef multiply(a: int, b: int) -> int:\n    return a * b\n"}, "call_id": "5"}]),
                # ACT 2 - complete
                ModelResponse(text="PLAN_COMPLETE", tool_calls=[]),
            ]
        def generate(self, prompt, tools=None, max_output_tokens=2048):
            self.call_count += 1
            return self.responses[self.call_count - 1] if self.call_count <= len(self.responses) else ModelResponse(text="PLAN_COMPLETE")
        def get_tool_schemas(self): return []

    import tempfile, shutil, os as os_mod
    with tempfile.TemporaryDirectory() as tmpdir:
        fixture_src = "/tmp/fixture_repo"
        for item in os.listdir(fixture_src):
            s = os_mod.path.join(fixture_src, item)
            d = os_mod.path.join(tmpdir, item)
            if os_mod.path.isdir(s):
                shutil.copytree(s, d)
            else:
                shutil.copy2(s, d)

        import harness.orchestrator as orch_module
        original = orch_module.ModelAdapter
        orch_module.ModelAdapter = MockModelAdapter
        try:
            config = HarnessConfig(api_key="mock", repo_root=tmpdir, test_command="python3 -m pytest tests -q", max_iterations=20)
            orch = Orchestrator(config)
            orch.model = MockModelAdapter()
            issue = IssueInput.from_cli("Fix add")
            final = orch.run(issue)
            assert final.current_state.value == "DONE"
        finally:
            orch_module.ModelAdapter = original