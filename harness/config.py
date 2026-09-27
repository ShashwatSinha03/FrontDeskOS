"""Central configuration. API keys from environment only."""
from __future__ import annotations

import os
from dataclasses import dataclass

DEFAULT_GEMINI_MODEL = "gemini-3.8-high"
DEFAULT_GROQ_MODEL = "qwen/qwen3.8-27b"

MISSING_KEY_MSG = "API key not set. Export GEMINI_API_KEY or GROQ_API_KEY."


@dataclass(frozen=True)
class HarnessConfig:
    api_key: str
    model_id: str = DEFAULT_GEMINI_MODEL
    provider: str = "gemini"
    repo_root: str = "."
    max_iterations: int = 10
    max_depth: int = 3
    max_recovery_attempts: int = 5
    max_context_chars: int = 60_000
    test_command: str = "python3 -m pytest tests -q"
    telemetry_path: str = "telemetry.jsonl"
    report_path: str = "report.md"

    @classmethod
    def from_env(cls, require_key: bool = True) -> "HarnessConfig":
        provider = os.environ.get("HARNESS_PROVIDER", "gemini").lower()
        
        if provider == "groq":
            api_key = os.environ.get("GROQ_API_KEY", "")
            default_model = DEFAULT_GROQ_MODEL
        else:
            api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("AI_API_KEY", "")
            default_model = DEFAULT_GEMINI_MODEL

        if require_key and not api_key:
            raise RuntimeError(MISSING_KEY_MSG)

        return cls(
            api_key=api_key,
            model_id=os.environ.get("HARNESS_MODEL_ID", default_model),
            provider=provider,
            repo_root=os.environ.get("HARNESS_REPO_ROOT", "."),
            max_iterations=int(os.environ.get("HARNESS_MAX_ITERATIONS", "10")),
            max_depth=int(os.environ.get("HARNESS_MAX_DEPTH", "3")),
            max_recovery_attempts=int(os.environ.get("HARNESS_MAX_RECOVERY_ATTEMPTS", "5")),
        )