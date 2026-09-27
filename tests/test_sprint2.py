"""Sprint 2 tests: depth control, context engine, repetition prevention, orchestration discipline."""
from __future__ import annotations

import os
import sys
import tempfile
import shutil
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


# --- Depth Tests ---

def test_depth_tracking_in_state():
    from harness.state import AgentState
    state = AgentState(max_depth=3)
    assert state.depth == 0
    assert state.max_depth == 3
    state.depth = 1
    assert state.depth == 1


def test_depth_in_telemetry():
    from harness.telemetry import TelemetryLogger, STATE_TRANSITION
    tl = TelemetryLogger()
    tl.emit(STATE_TRANSITION, {"from": "ACT", "to": "DIAGNOSE", "turn": 1, "reason": "test_failed", "depth": 1, "iteration": 5})
    events = tl.get_events()
    assert events[0].payload["depth"] == 1


def test_orchestrator_initializes_depth():
    from harness.config import HarnessConfig
    from harness.orchestrator import Orchestrator

    config = HarnessConfig(api_key="test", max_depth=2)
    orch = Orchestrator(config)
    assert orch.state.depth == 0
    assert orch.state.max_depth == 2


def test_max_depth_enforcement():
    """Test that max_depth limit is enforced when depth is exceeded."""
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
                # UNDERSTAND
                ModelResponse(text="", tool_calls=[{"name": "search_code", "args": {"pattern": "def", "path": "."}, "call_id": "2"}]),
                # PLAN
                ModelResponse(text='{"goal": "Fix", "steps": ["Edit"], "files": ["a.py"], "verification": ["test"], "hypothesis": "hyp"}', tool_calls=[]),
                # ACT - edit
                ModelResponse(text="", tool_calls=[{"name": "edit_file", "args": {"path": "a.py", "content": "def add(a, b): return a + b\n"}, "call_id": "3"}]),
                # ACT - complete
                ModelResponse(text="PLAN_COMPLETE", tool_calls=[]),
            ]
        def generate(self, prompt, tools=None, max_output_tokens=2048):
            self.call_count += 1
            return self.responses[self.call_count - 1] if self.call_count <= len(self.responses) else ModelResponse(text="PLAN_COMPLETE")
        def get_tool_schemas(self): return []

    import tempfile
    with tempfile.TemporaryDirectory() as tmpdir:
        Path(tmpdir, "a.py").write_text("def add(a, b): return a + b\n")
        Path(tmpdir, "tests").mkdir()
        Path(tmpdir, "tests", "test_a.py").write_text("from a import add\ndef test_add(): assert add(2, 3) == 5\n")

        import harness.orchestrator as orch_module
        original = orch_module.ModelAdapter
        orch_module.ModelAdapter = MockModelAdapter
        try:
            config = HarnessConfig(api_key="mock", repo_root=tmpdir, test_command="python3 -m pytest tests -q", max_iterations=10, max_depth=1)
            orch = Orchestrator(config)
            orch.model = MockModelAdapter()
            # Manually set depth to max_depth to test enforcement
            orch.state.depth = 1
            issue = IssueInput.from_cli("Test")
            final = orch.run(issue)
            assert final.current_state.value == "FAILED", f"Expected FAILED, got {final.current_state.value}"
            events = orch.telemetry.get_events()
            depth_errors = [e for e in events if e.type == "error" and "max depth" in e.payload.get("message", "")]
            assert len(depth_errors) > 0, f"No max depth error found in events: {[e.payload for e in events if e.type == 'error']}"
        finally:
            orch_module.ModelAdapter = original


# --- Context Engine V2 Tests ---

def test_context_sections_present():
    from harness.context import build_model_context
    from harness.state import AgentState, AgentPhase
    from harness.tools import ToolResult

    state = AgentState(
        issue="Test issue",
        current_state=AgentPhase.ACT,
        repo_root="/tmp",
        explored_files=["a.py", "b.py"],
        hypothesis="Test hypothesis",
        plan=["step 1", "step 2"],
        changed_files=["a.py"],
        test_status="not_run",
        iteration_count=1,
        depth=1,
    )
    tool_result = ToolResult.ok("Read file", data={"path": "a.py", "content": "def foo():"}, relevant_files=["a.py"])
    ctx_str, meta = build_model_context(state, latest_tool_result=tool_result)
    assert "Issue" in ctx_str
    assert "Repository" in ctx_str
    assert "Hypothesis" in ctx_str
    assert "Plan" in ctx_str
    assert "Changed Files" in ctx_str
    assert "Latest Tool Result" in ctx_str
    assert "State" in ctx_str
    assert meta.total_chars == len(ctx_str)
    assert len(meta.sections) > 0


def test_context_budget_enforced():
    from harness.context import build_model_context
    from harness.state import AgentState, AgentPhase

    # Use a budget that allows truncation but keeps required sections
    state = AgentState(issue="x" * 5000, current_state=AgentPhase.ACT, repo_root="/tmp")
    ctx_str, meta = build_model_context(state, max_chars=2000)
    assert len(ctx_str) <= 2000
    assert meta.truncated or meta.compression_applied


def test_context_metadata_includes_depth_iteration():
    from harness.context import build_model_context
    from harness.state import AgentState, AgentPhase
    state = AgentState(issue="Test", current_state=AgentPhase.ACT, depth=2, iteration_count=5, max_depth=3)
    _, meta = build_model_context(state)
    assert meta.depth == 2
    assert meta.iteration == 5
    assert meta.remaining_iteration_budget == 1


def test_active_failure_retained_in_context():
    from harness.context import build_model_context
    from harness.state import AgentState, AgentPhase
    from harness.tools import ToolResult

    state = AgentState(issue="Test", current_state=AgentPhase.DIAGNOSE)
    fail_result = ToolResult.fail("AssertionError: expected 5 got 3", exit_code=1)
    ctx_str, _ = build_model_context(state, latest_test_result=fail_result)
    assert "FAILURE" in ctx_str or "AssertionError" in ctx_str


def test_changed_files_retained():
    from harness.context import build_model_context
    from harness.state import AgentState, AgentPhase
    state = AgentState(issue="Test", current_state=AgentPhase.ACT, changed_files=["src/main.py", "tests/test_main.py"])
    ctx_str, _ = build_model_context(state)
    assert "src/main.py" in ctx_str
    assert "tests/test_main.py" in ctx_str


# --- Repetition Prevention Tests ---

def test_action_fingerprint_creation():
    from harness.orchestrator import Orchestrator
    from harness.config import HarnessConfig
    os.environ["AI_API_KEY"] = "test"
    config = HarnessConfig.from_env()
    orch = Orchestrator(config)
    fp1 = orch._make_fingerprint("edit_file", {"path": "a.py", "content": "def foo():"})
    fp2 = orch._make_fingerprint("edit_file", {"path": "a.py", "content": "def foo():"})
    fp3 = orch._make_fingerprint("edit_file", {"path": "b.py", "content": "def foo():"})
    assert fp1 == fp2
    assert fp1 != fp3


def test_repeated_action_detected():
    from harness.orchestrator import Orchestrator
    from harness.config import HarnessConfig
    config = HarnessConfig(api_key="test")
    orch = Orchestrator(config)
    fp = "edit_file|path=a.py|content=def foo():"
    orch._action_fingerprints.append(fp)
    orch._action_fingerprints.append(fp)
    assert orch._should_force_reconsideration()


def test_legitimate_retry_allowed():
    from harness.orchestrator import Orchestrator
    from harness.config import HarnessConfig
    config = HarnessConfig(api_key="test")
    orch = Orchestrator(config)
    fp1 = "edit_file|path=a.py|content=v1"
    fp2 = "edit_file|path=a.py|content=v2"
    orch._action_fingerprints.append(fp1)
    orch._action_fingerprints.append(fp2)
    assert not orch._should_force_reconsideration()


# --- Model Call Discipline Tests ---

def test_verify_phase_does_not_call_model():
    """Test that VERIFY phase runs tests without calling the model."""
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
                # UNDERSTAND
                ModelResponse(text="", tool_calls=[{"name": "search_code", "args": {"pattern": "def add", "path": "."}, "call_id": "2"}]),
                # PLAN
                ModelResponse(text='{"goal": "Fix", "steps": ["Edit"], "files": ["a.py"], "verification": ["test"], "hypothesis": "hyp"}', tool_calls=[]),
                # ACT - edit
                ModelResponse(text="", tool_calls=[{"name": "edit_file", "args": {"path": "a.py", "content": "def add(a, b): return a + b\n"}, "call_id": "3"}]),
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
            model_calls = [e for e in orch.telemetry.get_events() if e.type == "model_call"]
            verify_calls = [e for e in model_calls if e.payload.get("phase") == "VERIFY"]
            assert len(verify_calls) == 0, f"VERIFY phase should not call model, but got {len(verify_calls)} calls"
        finally:
            orch_module.ModelAdapter = original


def test_illegal_transition_rejected_without_model():
    from harness.state import AgentPhase, is_legal_transition
    from harness.orchestrator import Orchestrator
    from harness.config import HarnessConfig
    os.environ["AI_API_KEY"] = "test"
    config = HarnessConfig.from_env()
    orch = Orchestrator(config)
    orch.state.current_state = AgentPhase.BOOT
    result = orch._transition(AgentPhase.DONE, 1, "illegal_attempt")
    assert not result
    assert orch.state.current_state == AgentPhase.BOOT


# --- Regression ---

def test_sprint0_config_loads():
    from harness.config import HarnessConfig
    os.environ["AI_API_KEY"] = "test"
    cfg = HarnessConfig.from_env()
    assert cfg.api_key == "test"


def test_sprint0_state_serialization():
    from harness.state import AgentState, AgentPhase
    state = AgentState(issue="test", current_state=AgentPhase.PLAN, iteration_count=3, depth=1)
    d = state.to_dict()
    restored = AgentState.from_dict(d)
    assert restored.current_state == AgentPhase.PLAN
    assert restored.iteration_count == 3
    assert restored.depth == 1


def test_sprint1_tools_work():
    from harness.tools.base import ListFilesTool, ReadFileTool
    import tempfile
    from pathlib import Path
    with tempfile.TemporaryDirectory() as tmpdir:
        (Path(tmpdir) / "test.py").write_text("print('hello')")
        list_tool = ListFilesTool(tmpdir)
        result = list_tool.execute(path=".", recursive=True)
        assert result.success
        read_tool = ReadFileTool(tmpdir)
        result = read_tool.execute(path="test.py")
        assert result.success
        assert "print('hello')" in result.data["content"]