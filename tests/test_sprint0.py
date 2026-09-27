import os
import sys
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


def test_imports():
    """Project imports successfully."""
    import harness
    import harness.config
    import harness.state
    import harness.model
    import harness.orchestrator
    import harness.tools
    import harness.tools.base
    import harness.context
    import harness.telemetry
    import harness.recovery
    import harness.issue


def test_config_missing_key_fails(monkeypatch):
    """Missing API key raises clear error."""
    monkeypatch.delenv("AI_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    from harness.config import HarnessConfig
    with pytest.raises(RuntimeError, match="API key not set"):
        HarnessConfig.from_env(require_key=True)


def test_config_loads_with_key(monkeypatch):
    """Config loads when key present."""
    monkeypatch.setenv("AI_API_KEY", "test-key")
    from harness.config import HarnessConfig
    cfg = HarnessConfig.from_env(require_key=True)
    assert cfg.api_key == "test-key"
    assert cfg.model_id == "gemini-3.8-high"


def test_state_machine_legal_transitions():
    """Explicit legal transitions are enforced."""
    from harness.state import AgentPhase, is_legal_transition
    assert is_legal_transition(AgentPhase.BOOT, AgentPhase.DISCOVER)
    assert is_legal_transition(AgentPhase.DISCOVER, AgentPhase.UNDERSTAND)
    assert is_legal_transition(AgentPhase.UNDERSTAND, AgentPhase.PLAN)
    assert is_legal_transition(AgentPhase.PLAN, AgentPhase.ACT)
    assert is_legal_transition(AgentPhase.ACT, AgentPhase.VERIFY)
    assert is_legal_transition(AgentPhase.VERIFY, AgentPhase.DONE)
    assert is_legal_transition(AgentPhase.DIAGNOSE, AgentPhase.DISCOVER)
    assert not is_legal_transition(AgentPhase.BOOT, AgentPhase.DONE)
    assert not is_legal_transition(AgentPhase.DONE, AgentPhase.DISCOVER)


def test_agent_state_serializes():
    """AgentState round-trips through dict."""
    from harness.state import AgentState, AgentPhase
    state = AgentState(
        issue="test issue",
        current_state=AgentPhase.PLAN,
        explored_files=["a.py"],
        findings=["found X"],
        hypothesis="h",
        plan=["step 1"],
        changed_files=["b.py"],
        test_status="passed",
        failed_approaches=["bad try"],
        iteration_count=3,
        depth=1,
    )
    d = state.to_dict()
    assert d["current_state"] == "PLAN"
    restored = AgentState.from_dict(d)
    assert restored.current_state == AgentPhase.PLAN
    assert restored.issue == "test issue"
    assert restored.iteration_count == 3
    assert restored.depth == 1


def test_telemetry_events_serialize():
    """TelemetryEvent round-trips through dict."""
    from harness.telemetry import TelemetryEvent, MODEL_CALL
    evt = TelemetryEvent(MODEL_CALL, {"prompt_len": 100})
    d = evt.to_dict()
    assert d["type"] == MODEL_CALL
    assert d["payload"]["prompt_len"] == 100
    restored = TelemetryEvent.from_dict(d)
    assert restored.type == MODEL_CALL
    assert restored.payload["prompt_len"] == 100


def test_telemetry_rejects_unknown_type():
    """Unknown event type raises."""
    from harness.telemetry import TelemetryEvent
    with pytest.raises(ValueError, match="unknown telemetry event type"):
        TelemetryEvent("not_a_real_type")


def test_tool_result_helpers():
    """ToolResult ok/fail helpers work."""
    from harness.tools import ToolResult
    ok = ToolResult.ok({"x": 1})
    assert ok.success and ok.data == {"x": 1}
    fail = ToolResult.fail("oops", exit_code=1)
    assert not fail.success and fail.error == "oops" and fail.exit_code == 1