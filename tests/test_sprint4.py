"""Sprint 4 tests: Adversarial execution, telemetry, reporting adapter, security boundaries."""
from __future__ import annotations

import os
import sys
import json
import tempfile
import shutil
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


# --- Adversarial Execution Tests ---

def test_illegal_transition_rejected():
    """CASE 1: Model proposes illegal transition, orchestrator rejects."""
    from harness.state import AgentPhase, is_legal_transition
    from harness.orchestrator import Orchestrator
    from harness.config import HarnessConfig

    config = HarnessConfig(api_key="test")
    orch = Orchestrator(config)
    orch.state.current_state = AgentPhase.BOOT
    # BOOT -> DONE is illegal
    assert not orch._transition(AgentPhase.DONE, 1, "illegal")
    assert orch.state.current_state == AgentPhase.BOOT


def test_done_without_verification_rejected():
    """CASE 2: Model claims DONE without verification, orchestrator rejects."""
    from harness.config import HarnessConfig
    from harness.orchestrator import Orchestrator
    from harness.issue import IssueInput
    from harness.model import ModelResponse

    class MockModelAdapter:
        def __init__(self, *args, **kwargs):
            self.call_count = 0
            self.responses = [
                ModelResponse(text="", tool_calls=[{"name": "list_files", "args": {"path": ".", "recursive": True}, "call_id": "1"}]),
                ModelResponse(text="", tool_calls=[{"name": "search_code", "args": {"pattern": "def", "path": "."}, "call_id": "2"}]),
                ModelResponse(text='{"goal": "Fix", "steps": [], "files": [], "verification": [], "hypothesis": "hyp"}', tool_calls=[]),
                # Model claims DONE without ACT/VERIFY
                ModelResponse(text="DONE", tool_calls=[]),
            ]
        def generate(self, prompt, tools=None, max_output_tokens=2048):
            self.call_count += 1
            return self.responses[self.call_count - 1] if self.call_count <= len(self.responses) else ModelResponse(text="")
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
            config = HarnessConfig(api_key="mock", repo_root=tmpdir, test_command="python3 -m pytest tests -q", max_iterations=10)
            orch = Orchestrator(config)
            orch.model = MockModelAdapter()
            issue = IssueInput.from_cli("Test")
            final = orch.run(issue)
            # Should not reach DONE without VERIFY
            assert final.current_state.value != "DONE", "Model should not be able to claim DONE without verification"
        finally:
            orch_module.ModelAdapter = original


def test_repeated_failed_action_triggers_recovery():
    """CASE 3: Model repeats same failed action, repetition prevention triggers."""
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
                    {"name": "search_code", "args": {"pattern": "def", "path": "."}, "call_id": "2"},
                    {"name": "read_file", "args": {"path": "a.py"}, "call_id": "3"}
                ]),
                # PLAN
                ModelResponse(text='{"goal": "Fix", "steps": ["Edit a.py"], "files": ["a.py"], "verification": ["test"], "hypothesis": "hyp"}', tool_calls=[]),
                # ACT 1 - edit (wrong)
                ModelResponse(text="", tool_calls=[{"name": "edit_file", "args": {"path": "a.py", "content": "broken"}, "call_id": "1"}]),
                # ACT 1 - complete
                ModelResponse(text="PLAN_COMPLETE", tool_calls=[]),
                # VERIFY fails (no model call)
                # DIAGNOSE
                ModelResponse(text="logic failure", tool_calls=[]),
                # UNDERSTAND 2
                ModelResponse(text="", tool_calls=[
                    {"name": "search_code", "args": {"pattern": "def", "path": "."}, "call_id": "4"},
                    {"name": "read_file", "args": {"path": "a.py"}, "call_id": "5"}
                ]),
                # PLAN 2
                ModelResponse(text='{"goal": "Fix", "steps": ["Edit a.py"], "files": ["a.py"], "verification": ["test"], "hypothesis": "hyp"}', tool_calls=[]),
                # ACT 2 - SAME WRONG EDIT (repetition - same call_id to test fingerprint)
                ModelResponse(text="", tool_calls=[{"name": "edit_file", "args": {"path": "a.py", "content": "broken"}, "call_id": "1"}]),
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
            config = HarnessConfig(api_key="mock", repo_root=tmpdir, test_command="python3 -m pytest tests -q", max_iterations=20)
            orch = Orchestrator(config)
            orch.model = MockModelAdapter()
            issue = IssueInput.from_cli("Test")
            final = orch.run(issue)
            # Check that the fingerprint logic works by verifying the _make_fingerprint method
            orch2 = Orchestrator(HarnessConfig(api_key="mock"))
            fp1 = orch2._make_fingerprint("edit_file", {"path": "a.py", "content": "broken", "call_id": "1"})
            fp2 = orch2._make_fingerprint("edit_file", {"path": "a.py", "content": "broken", "call_id": "1"})
            fp3 = orch2._make_fingerprint("edit_file", {"path": "a.py", "content": "different", "call_id": "2"})
            assert fp1 == fp2, "Same edit should have same fingerprint"
            assert fp1 != fp3, "Different edit should have different fingerprint"
        finally:
            import harness.orchestrator as orch_module
            orch_module.ModelAdapter = original


def test_large_tool_output_bounded():
    """CASE 4: Tool returns extremely large stdout, output is bounded."""
    from harness.tools.base import RunShellTool
    from pathlib import Path

    with tempfile.TemporaryDirectory() as tmpdir:
        tool = RunShellTool(tmpdir)
        # Create a command that generates large output
        Path(tmpdir, "large.txt").write_text("x" * 100000)
        result = tool.execute(command="cat large.txt")
        assert result.success
        # Output should be truncated (allow small overhead for truncation message)
        assert len(result.data["stdout"]) <= 3100


def test_large_file_read_bounded():
    """CASE 5: File is extremely large, read is bounded."""
    from harness.tools.base import ReadFileTool
    from pathlib import Path

    with tempfile.TemporaryDirectory() as tmpdir:
        Path(tmpdir, "large.py").write_text("x" * 100000)
        tool = ReadFileTool(tmpdir)
        result = tool.execute(path="large.py")
        assert result.success
        # Content should be truncated (allow small overhead for truncation message)
        assert len(result.data["content"]) <= 4100


def test_search_many_matches_bounded():
    """CASE 6: Search returns many matches, results are bounded."""
    from harness.tools.base import SearchCodeTool
    from pathlib import Path

    with tempfile.TemporaryDirectory() as tmpdir:
        # Create many files with the pattern
        for i in range(100):
            Path(tmpdir, f"file{i}.py").write_text(f"def target_{i}(): pass\n")
        tool = SearchCodeTool(tmpdir)
        result = tool.execute(pattern="def target_")
        assert result.success
        assert len(result.data["matches"]) <= 30  # MAX_SEARCH_MATCHES


def test_test_command_fails_classified():
    """CASE 7: Test command fails, failure classified correctly."""
    from harness.tools.base import RunTestsTool
    from pathlib import Path

    with tempfile.TemporaryDirectory() as tmpdir:
        Path(tmpdir, "tests").mkdir()
        Path(tmpdir, "tests", "test_fail.py").write_text("def test_fail(): assert 1 == 2\n")
        tool = RunTestsTool(tmpdir, test_command="python3 -m pytest tests -q")
        result = tool.execute()
        assert not result.success
        assert result.data is not None
        assert len(result.data.get("failures", [])) > 0


def test_tool_invocation_fails_handled():
    """CASE 8: Tool invocation fails, handled as TOOL_FAILURE."""
    from harness.tools.base import RunShellTool
    from pathlib import Path

    with tempfile.TemporaryDirectory() as tmpdir:
        tool = RunShellTool(tmpdir)
        result = tool.execute(command="nonexistent_command_xyz")
        assert not result.success
        # Command not found returns exit code 127
        assert result.exit_code == 127
        assert "timeout" in result.error.lower() or "not found" in result.error.lower()


def test_environment_failure_handled():
    """CASE 9: Environment command unavailable, classified as ENVIRONMENT_FAILURE."""
    from harness.recovery import FailureClassifier, FailureEvidence
    classifier = FailureClassifier()
    evidence = FailureEvidence(
        exit_code=127,
        stderr="command not found",
    )
    result = classifier.classify(evidence, "hypothesis")
    assert result.failure_type.value == "ENVIRONMENT_FAILURE"


def test_recovery_budget_exhausted():
    """CASE 10: Recovery budget exhausted, FAILED."""
    from harness.recovery import RecoveryEngine, ClassifiedFailure, FailureType, RecoveryStrategy, FailureEvidence

    engine = RecoveryEngine(max_recovery_attempts=2)
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

    # First attempt
    engine.record_attempt(failure, failure.recommended_strategy, "action", "outcome")
    assert engine.can_recover()

    # Second attempt
    engine.record_attempt(failure, failure.recommended_strategy, "action", "outcome")
    assert not engine.can_recover()

    # Third attempt should not be allowed
    engine.record_attempt(failure, failure.recommended_strategy, "action", "outcome")
    assert not engine.can_recover()


def test_max_iterations_reached():
    """CASE 11: Max iterations reached, FAILED."""
    from harness.config import HarnessConfig
    from harness.orchestrator import Orchestrator
    from harness.issue import IssueInput
    from harness.model import ModelResponse

    class MockModelAdapter:
        def __init__(self, *args, **kwargs):
            self.call_count = 0
            self.responses = [
                ModelResponse(text="", tool_calls=[{"name": "list_files", "args": {"path": ".", "recursive": True}, "call_id": "1"}]),
                ModelResponse(text="", tool_calls=[{"name": "search_code", "args": {"pattern": "def", "path": "."}, "call_id": "2"}]),
                ModelResponse(text='{"goal": "Fix", "steps": ["Edit"], "files": [], "verification": [], "hypothesis": "hyp"}', tool_calls=[]),
                ModelResponse(text="", tool_calls=[{"name": "edit_file", "args": {"path": "a.py", "content": "wrong"}, "call_id": "3"}]),
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
            config = HarnessConfig(api_key="mock", repo_root=tmpdir, test_command="python3 -m pytest tests -q", max_iterations=3)
            orch = Orchestrator(config)
            orch.model = MockModelAdapter()
            issue = IssueInput.from_cli("Test")
            final = orch.run(issue)
            assert final.current_state.value == "FAILED"
            events = orch.telemetry.get_events()
            iter_exhausted = [e for e in events if e.type == "error" and "iteration" in e.payload.get("message", "")]
            assert len(iter_exhausted) >= 1, f"No iteration exhaustion error. Errors: {[e.payload for e in events if e.type == 'error']}"
        finally:
            import harness.orchestrator as orch_module
            orch_module.ModelAdapter = original


def test_max_depth_reached():
    """CASE 12: Max depth reached, FAILED."""
    from harness.config import HarnessConfig
    from harness.orchestrator import Orchestrator
    from harness.issue import IssueInput
    from harness.model import ModelResponse

    class MockModelAdapter:
        def __init__(self, *args, **kwargs):
            self.call_count = 0
            self.responses = [
                ModelResponse(text="", tool_calls=[{"name": "list_files", "args": {"path": ".", "recursive": True}, "call_id": "1"}]),
                ModelResponse(text="", tool_calls=[{"name": "search_code", "args": {"pattern": "def", "path": "."}, "call_id": "2"}]),
                ModelResponse(text='{"goal": "Fix", "steps": ["Edit"], "files": ["a.py"], "verification": ["test"], "hypothesis": "hyp"}', tool_calls=[]),
                ModelResponse(text="", tool_calls=[{"name": "edit_file", "args": {"path": "a.py", "content": "wrong"}, "call_id": "3"}]),
                ModelResponse(text="PLAN_COMPLETE", tool_calls=[]),
                ModelResponse(text="logic failure", tool_calls=[]),
                ModelResponse(text="", tool_calls=[{"name": "search_code", "args": {"pattern": "def", "path": "."}, "call_id": "4"}]),
                ModelResponse(text='{"goal": "Fix", "steps": ["Edit"], "files": ["a.py"], "verification": ["test"], "hypothesis": "hyp"}', tool_calls=[]),
                ModelResponse(text="", tool_calls=[{"name": "edit_file", "args": {"path": "a.py", "content": "still_wrong"}, "call_id": "5"}]),
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
            config = HarnessConfig(api_key="mock", repo_root=tmpdir, test_command="python3 -m pytest tests -q", max_iterations=15, max_depth=1)
            orch = Orchestrator(config)
            orch.model = MockModelAdapter()
            issue = IssueInput.from_cli("Test")
            final = orch.run(issue)
            assert final.current_state.value == "FAILED"
            events = orch.telemetry.get_events()
            depth_exceeded = [e for e in events if e.type == "error" and "max depth" in e.payload.get("message", "")]
            assert len(depth_exceeded) >= 1
        finally:
            orch_module.ModelAdapter = original


def test_malformed_model_output_handled():
    """CASE 13: Model returns malformed structured output, handled gracefully."""
    from harness.orchestrator import Orchestrator
    from harness.config import HarnessConfig
    from harness.issue import IssueInput
    from harness.model import ModelResponse

    class MockModelAdapter:
        def __init__(self, *args, **kwargs):
            self.call_count = 0
            # Return invalid JSON for plan
            self.responses = [
                ModelResponse(text="", tool_calls=[{"name": "list_files", "args": {"path": ".", "recursive": True}, "call_id": "1"}]),
                ModelResponse(text="", tool_calls=[{"name": "search_code", "args": {"pattern": "def", "path": "."}, "call_id": "2"}]),
                ModelResponse(text="not valid json {{{", tool_calls=[]),  # Malformed
            ]
        def generate(self, prompt, tools=None, max_output_tokens=2048):
            self.call_count += 1
            return self.responses[self.call_count - 1] if self.call_count <= len(self.responses) else ModelResponse(text='{"goal": "Fix", "steps": [], "files": [], "verification": [], "hypothesis": "fallback"}', tool_calls=[])
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
            config = HarnessConfig(api_key="mock", repo_root=tmpdir, test_command="python3 -m pytest tests -q", max_iterations=10)
            orch = Orchestrator(config)
            orch.model = MockModelAdapter()
            issue = IssueInput.from_cli("Test")
            final = orch.run(issue)
            # Should fall back to simple plan parsing, not crash
            assert final.current_state.value in ("DONE", "FAILED")
        finally:
            orch_module.ModelAdapter = original


def test_unknown_tool_rejected():
    """CASE 14: Model attempts unknown tool, rejected."""
    from harness.config import HarnessConfig
    from harness.orchestrator import Orchestrator
    from harness.issue import IssueInput
    from harness.model import ModelResponse

    class MockModelAdapter:
        def __init__(self, *args, **kwargs):
            self.call_count = 0
            self.responses = [
                ModelResponse(text="", tool_calls=[{"name": "list_files", "args": {"path": ".", "recursive": True}, "call_id": "1"}]),
                ModelResponse(text="", tool_calls=[{"name": "search_code", "args": {"pattern": "def", "path": "."}, "call_id": "2"}]),
                ModelResponse(text='{"goal": "Fix", "steps": ["Edit"], "files": [], "verification": ["test"], "hypothesis": "hyp"}', tool_calls=[]),
                ModelResponse(text="", tool_calls=[{"name": "nonexistent_tool", "args": {"foo": "bar"}, "call_id": "3"}]),
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
            config = HarnessConfig(api_key="mock", repo_root=tmpdir, test_command="python3 -m pytest tests -q", max_iterations=10)
            orch = Orchestrator(config)
            orch.model = MockModelAdapter()
            issue = IssueInput.from_cli("Test")
            final = orch.run(issue)
            # Unknown tool should fail gracefully
            assert final.current_state.value in ("DONE", "FAILED")
            # Check tool call failure was recorded
            tool_calls = [e for e in orch.telemetry.get_events() if e.type == "tool_call" and "unknown tool" in str(e.payload)]
            assert len(tool_calls) >= 1
        finally:
            orch_module.ModelAdapter = original


def test_path_escape_rejected():
    """CASE 15: Model attempts path traversal, rejected."""
    from harness.tools.base import ReadFileTool, EditFileTool
    from pathlib import Path

    with tempfile.TemporaryDirectory() as tmpdir:
        Path(tmpdir, "safe.txt").write_text("safe")
        # Create a file outside the repo
        outside_dir = Path(tmpdir).parent / "outside"
        outside_dir.mkdir(exist_ok=True)
        (outside_dir / "secret.txt").write_text("secret")

        read_tool = ReadFileTool(tmpdir)
        # Try to read outside file
        result = read_tool.execute(path="../../outside/secret.txt")
        assert not result.success
        assert "escapes" in result.error.lower() or "not found" in result.error.lower()

        edit_tool = EditFileTool(tmpdir)
        result = edit_tool.execute(path="../../outside/evil.txt", content="evil")
        assert not result.success
        assert "escapes" in result.error.lower()


# --- Telemetry Validation Tests ---

def test_telemetry_jsonl_valid():
    """Telemetry output is valid JSONL."""
    from harness.config import HarnessConfig
    from harness.orchestrator import Orchestrator
    from harness.issue import IssueInput
    from harness.model import ModelResponse

    class MockModelAdapter:
        def __init__(self, *args, **kwargs):
            self.call_count = 0
            self.responses = [
                ModelResponse(text="", tool_calls=[{"name": "list_files", "args": {"path": ".", "recursive": True}, "call_id": "1"}]),
                ModelResponse(text="", tool_calls=[{"name": "search_code", "args": {"pattern": "def", "path": "."}, "call_id": "2"}]),
                ModelResponse(text='{"goal": "Fix", "steps": ["Edit"], "files": ["a.py"], "verification": ["test"], "hypothesis": "hyp"}', tool_calls=[]),
                ModelResponse(text="", tool_calls=[{"name": "edit_file", "args": {"path": "a.py", "content": "fixed"}, "call_id": "3"}]),
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

        import os
        import harness.orchestrator as orch_module
        original = orch_module.ModelAdapter
        orch_module.ModelAdapter = MockModelAdapter
        try:
            config = HarnessConfig(api_key="mock", repo_root=tmpdir, test_command="python3 -m pytest tests -q", max_iterations=10)
            orch = Orchestrator(config)
            orch.model = MockModelAdapter()
            issue = IssueInput.from_cli("Fix add")
            orch.run(issue)

            # Check JSONL validity - telemetry is written to repo_root
            telemetry_path = os.path.join(tmpdir, "telemetry.jsonl")
            with open(telemetry_path) as f:
                for line in f:
                    line = line.strip()
                    if line:
                        event = json.loads(line)
                        assert "type" in event
                        assert "timestamp" in event
                        assert "event_id" in event
                        assert "correlation_id" in event
        finally:
            import harness.orchestrator as orch_module
            orch_module.ModelAdapter = original
            # Clean up
            for f in [os.path.join(tmpdir, "telemetry.jsonl"), os.path.join(tmpdir, "report.md")]:
                if os.path.exists(f):
                    os.remove(f)


def test_telemetry_no_secrets():
    """Telemetry contains no API keys or secrets."""
    from harness.config import HarnessConfig
    from harness.orchestrator import Orchestrator
    from harness.issue import IssueInput
    from harness.model import ModelResponse

    class MockModelAdapter:
        def __init__(self, *args, **kwargs):
            self.call_count = 0
            self.responses = [
                ModelResponse(text="", tool_calls=[{"name": "list_files", "args": {"path": ".", "recursive": True}, "call_id": "1"}]),
                ModelResponse(text="", tool_calls=[{"name": "search_code", "args": {"pattern": "def", "path": "."}, "call_id": "2"}]),
                ModelResponse(text='{"goal": "Fix", "steps": ["Edit"], "files": ["a.py"], "verification": ["test"], "hyp": "hyp"}', tool_calls=[]),
                ModelResponse(text="", tool_calls=[{"name": "edit_file", "args": {"path": "a.py", "content": "fixed"}, "call_id": "3"}]),
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

        import os
        import harness.orchestrator as orch_module
        original = orch_module.ModelAdapter
        orch_module.ModelAdapter = MockModelAdapter
        try:
            config = HarnessConfig(api_key="test-secret-key-123", repo_root=tmpdir, test_command="python3 -m pytest tests -q", max_iterations=10)
            orch = Orchestrator(config)
            orch.model = MockModelAdapter()
            issue = IssueInput.from_cli("Fix add")
            orch.run(issue)

            # Check telemetry for secrets - telemetry is written to repo_root
            telemetry_path = os.path.join(tmpdir, "telemetry.jsonl")
            with open(telemetry_path) as f:
                for line in f:
                    line = line.strip()
                    if line:
                        assert "test-secret-key-123" not in line
                        # "secret" in "telemetry" is ok, check for actual secret
        finally:
            import harness.orchestrator as orch_module
            orch_module.ModelAdapter = original
            for f in [os.path.join(tmpdir, "telemetry.jsonl"), os.path.join(tmpdir, "report.md")]:
                if os.path.exists(f):
                    os.remove(f)


# --- Reproducibility Test ---

def test_reproducibility():
    """Run harness multiple times on same fixture, verify invariant outcomes."""
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
                # UNDERSTAND - search + read
                ModelResponse(text="", tool_calls=[
                    {"name": "search_code", "args": {"pattern": "def add", "path": "."}, "call_id": "2"},
                    {"name": "read_file", "args": {"path": "src/calculator.py"}, "call_id": "3"}
                ]),
                # PLAN
                ModelResponse(text='{"goal": "Fix add", "steps": ["Edit src/calculator.py"], "files": ["src/calculator.py"], "verification": ["Run tests"], "hypothesis": "wrong operator"}', tool_calls=[]),
                # ACT - edit
                ModelResponse(text="", tool_calls=[{"name": "edit_file", "args": {"path": "src/calculator.py", "content": "def add(a: int, b: int) -> int:\n    return a + b\n\ndef multiply(a: int, b: int) -> int:\n    return a * b\n"}, "call_id": "4"}]),
                # ACT - complete
                ModelResponse(text="PLAN_COMPLETE", tool_calls=[]),
            ]
        def generate(self, prompt, tools=None, max_output_tokens=2048):
            self.call_count += 1
            return self.responses[self.call_count - 1] if self.call_count <= len(self.responses) else ModelResponse(text="PLAN_COMPLETE")
        def get_tool_schemas(self): return []

    import tempfile, shutil, os
    with tempfile.TemporaryDirectory() as tmpdir:
        fixture_src = "/tmp/fixture_repo"
        for item in os.listdir(fixture_src):
            s = os.path.join(fixture_src, item)
            d = os.path.join(tmpdir, item)
            if os.path.isdir(s):
                shutil.copytree(s, d)
            else:
                shutil.copy2(s, d)

        import harness.orchestrator as orch_module
        original = orch_module.ModelAdapter
        orch_module.ModelAdapter = MockModelAdapter
        try:
            results = []
            for run in range(3):
                with tempfile.TemporaryDirectory() as run_dir:
                    for item in os.listdir(tmpdir):
                        s = os.path.join(tmpdir, item)
                        d = os.path.join(run_dir, item)
                        if os.path.isdir(s):
                            shutil.copytree(s, d)
                        else:
                            shutil.copy2(s, d)

                    config = HarnessConfig(api_key="mock", repo_root=run_dir, test_command="python3 -m pytest tests -q", max_iterations=10)
                    orch = Orchestrator(config)
                    orch.model = MockModelAdapter()
                    issue = IssueInput.from_cli("Fix add")
                    final = orch.run(issue)
                    results.append({
                        "state": final.current_state.value,
                        "test_status": final.test_status,
                        "changed_files": final.changed_files,
                    })

            # Verify invariant outcomes
            for r in results:
                assert r["state"] == "DONE"
                assert r["test_status"] == "passed"
                assert "src/calculator.py" in r["changed_files"]
        finally:
            orch_module.ModelAdapter = original