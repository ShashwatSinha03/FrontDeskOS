"""Sprint 1 tests: tool dispatch, model action parsing, context, recovery, telemetry."""
from __future__ import annotations

import os
import sys
import json
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


# --- Tool Tests ---

def test_list_files_tool(tmp_path):
    from harness.tools.base import ListFilesTool
    (tmp_path / "a.py").write_text("print(1)")
    (tmp_path / "b.py").write_text("print(2)")
    (tmp_path / ".git").mkdir()
    (tmp_path / ".git" / "config").write_text("")
    (tmp_path / "__pycache__").mkdir()
    (tmp_path / "__pycache__" / "x.pyc").write_text("")

    tool = ListFilesTool(str(tmp_path))
    result = tool.execute(path=".", recursive=True)

    assert result.success
    assert "a.py" in result.data["files"]
    assert "b.py" in result.data["files"]
    assert not any(".git" in f for f in result.data["files"])
    assert not any("__pycache__" in f for f in result.data["files"])


def test_search_code_tool(tmp_path):
    from harness.tools.base import SearchCodeTool
    (tmp_path / "main.py").write_text("def foo():\n    return 42\n\ndef bar():\n    return foo()")
    tool = SearchCodeTool(str(tmp_path))
    result = tool.execute(pattern=r"def foo", path=".")

    assert result.success
    assert len(result.data["matches"]) == 1
    assert result.data["matches"][0]["file"] == "main.py"
    assert result.data["matches"][0]["line"] == 1


def test_read_file_tool(tmp_path):
    from harness.tools.base import ReadFileTool
    (tmp_path / "test.py").write_text("line1\nline2\nline3\nline4\nline5")
    tool = ReadFileTool(str(tmp_path))

    result = tool.execute(path="test.py", start_line=2, end_line=4)
    assert result.success
    assert result.data["content"] == "line2\nline3\nline4"
    assert result.data["start_line"] == 2
    assert result.data["end_line"] == 4


def test_edit_file_tool(tmp_path):
    from harness.tools.base import EditFileTool
    tool = EditFileTool(str(tmp_path))

    result = tool.execute(path="new.py", content="print('hello')")
    assert result.success
    assert (tmp_path / "new.py").read_text() == "print('hello')"
    assert "diff" in result.data


def test_run_shell_tool(tmp_path):
    from harness.tools.base import RunShellTool
    tool = RunShellTool(str(tmp_path))

    result = tool.execute(command="echo hello")
    assert result.success
    assert result.data["exit_code"] == 0
    assert "hello" in result.data["stdout"]


def test_run_tests_tool(tmp_path):
    from harness.tools.base import RunTestsTool
    tool = RunTestsTool(str(tmp_path), test_command="echo 'no tests'")
    result = tool.execute()
    assert result.success
    assert result.data["exit_code"] == 0


# --- Context Manager Tests ---

def test_context_manager_basic():
    from harness.context import ContextManager, build_model_context
    from harness.state import AgentState, AgentPhase

    ctx = ContextManager(max_chars=1000)
    state = AgentState(
        issue="Test issue",
        current_state=AgentPhase.ACT,
        repo_root="/tmp",
        explored_files=["a.py", "b.py"],
        hypothesis="Test hypothesis",
        plan=["step 1", "step 2"],
        changed_files=["a.py"],
        test_status="not_run",
        iteration_count=1
    )

    context_str, meta = build_model_context(state)
    assert "Test issue" in context_str
    assert "Test hypothesis" in context_str
    assert "step 1" in context_str
    assert "a.py" in context_str
    assert meta.total_chars > 0


def test_context_manager_with_tool_result():
    from harness.context import ContextManager, build_model_context
    from harness.state import AgentState, AgentPhase
    from harness.tools import ToolResult

    ctx = ContextManager()
    state = AgentState(issue="Test", current_state=AgentPhase.ACT)
    result = ToolResult.ok("File read", data={"path": "a.py", "content": "def foo():"}, relevant_files=["a.py"])

    context_str, meta = build_model_context(state, latest_tool_result=result)
    assert "Latest Tool Result" in context_str
    assert "SUCCESS" in context_str
    assert "def foo()" in context_str


def test_context_manager_truncation():
    from harness.context import ContextManager, build_model_context
    from harness.state import AgentState, AgentPhase

    # Use a budget that allows truncation but keeps required sections
    ctx = ContextManager(max_chars=3000)
    state = AgentState(issue="x" * 5000, current_state=AgentPhase.ACT)
    context_str, meta = build_model_context(state)
    assert len(context_str) <= 3000
    assert meta.truncated or meta.compression_applied


# --- Recovery Manager Tests ---

def test_recovery_records_attempts():
    from harness.recovery import RecoveryManager

    rm = RecoveryManager()
    rm.record("ACT", "hypothesis", "edit_file", "edit_file", {"path": "a.py"}, "error", "summary")
    assert len(rm.failed_attempts) == 1
    assert rm.failed_attempts[0].tool == "edit_file"


def test_recovery_force_understand():
    from harness.recovery import RecoveryManager

    rm = RecoveryManager(max_same_approach=2)
    for _ in range(2):
        rm.record("ACT", "hyp", "edit_file", "edit_file", {"path": "a.py"}, "err", "sum")
    assert rm.should_force_understand()


def test_recovery_classify_failure():
    from harness.recovery import RecoveryManager
    from harness.tools import ToolResult
    from harness.state import AgentState

    rm = RecoveryManager()
    state = AgentState()

    # Test logic failure (TypeError, etc.)
    result = ToolResult.ok("failed", data={"passed": False, "failures": [{"test": "test_x", "error": "TypeError: unsupported operand"}]})
    ftype, hyp = rm.classify_failure(result, state)
    assert ftype == "LOGIC_FAILURE"

    # Test bad edit
    result = ToolResult.ok("failed", data={"passed": False, "failures": [{"test": "test_x", "error": "SyntaxError: invalid syntax"}]})
    ftype, hyp = rm.classify_failure(result, state)
    assert ftype == "BAD_EDIT"

    # Test assertion failure (new classification)
    result = ToolResult.ok("failed", data={"passed": False, "failures": [{"test": "test_x", "error": "AssertionError: expected 1 got 2"}]})
    ftype, hyp = rm.classify_failure(result, state)
    assert ftype == "TEST_FAILURE"


# --- State Machine Tests ---

def test_illegal_transition_rejected():
    from harness.state import AgentPhase, is_legal_transition
    from harness.orchestrator import Orchestrator
    from harness.config import HarnessConfig

    os.environ["AI_API_KEY"] = "test"
    config = HarnessConfig.from_env()
    orch = Orchestrator(config)

    orch.state.current_state = AgentPhase.BOOT
    assert not orch._transition(AgentPhase.DONE, 1, "test_reason")
    assert orch.state.current_state == AgentPhase.BOOT


# --- Telemetry Tests ---

def test_telemetry_emission():
    from harness.telemetry import TelemetryLogger, MODEL_CALL

    tl = TelemetryLogger()
    tl.set_turn(1)
    tl.set_state("DISCOVER")
    tl.emit(MODEL_CALL, {"phase": "DISCOVER", "tokens": 100})

    events = tl.get_events()
    assert len(events) == 1
    assert events[0].type == MODEL_CALL
    assert events[0].turn == 1
    assert events[0].state == "DISCOVER"


def test_telemetry_jsonl():
    from harness.telemetry import TelemetryLogger, TOOL_CALL

    tl = TelemetryLogger()
    tl.emit(TOOL_CALL, {"tool": "list_files", "success": True})
    jsonl = tl.to_jsonl()
    data = json.loads(jsonl.strip())
    assert data["type"] == TOOL_CALL
    assert data["payload"]["tool"] == "list_files"


# --- Issue Input Tests ---

def test_issue_input_cli():
    from harness.issue import IssueInput
    issue = IssueInput.from_cli("fix the bug")
    assert issue.issue == "fix the bug"
    assert issue.metadata["source"] == "cli"


def test_issue_input_load_priority():
    from harness.issue import IssueInput
    import os

    os.environ["HARNESS_ISSUE"] = "from env"
    issue = IssueInput.load(cli_issue="from cli")
    assert issue.issue == "from cli"

    del os.environ["HARNESS_ISSUE"]
    issue = IssueInput.load(cli_issue=None)
    assert issue.metadata["source"] == "none"


# --- Orchestrator Integration Tests ---

def test_orchestrator_initialization():
    from harness.config import HarnessConfig
    from harness.orchestrator import Orchestrator

    os.environ["AI_API_KEY"] = "test"
    config = HarnessConfig.from_env()
    orch = Orchestrator(config)

    assert orch.state.current_state.value == "BOOT"
    assert len(orch.tools) == 6
    assert "list_files" in orch.tools


# --- ToolResult backward compat ---

def test_toolresult_backward_compat():
    from harness.tools import ToolResult

    ok = ToolResult.ok({"x": 1})
    assert ok.success
    assert ok.data == {"x": 1}

    ok2 = ToolResult.ok("summary", {"x": 1})
    assert ok2.success
    assert ok2.summary == "summary"
    assert ok2.data == {"x": 1}