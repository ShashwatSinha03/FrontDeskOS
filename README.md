# AI Coding Harness

Autonomous coding-agent harness for the Hackathon. Target model: **Gemini 3.8 High** (configurable) or Groq models.

## Quick Start

```bash
# 1. Set API key (required)
export GEMINI_API_KEY="your-gemini-api-key"
# OR
export GROQ_API_KEY="your-groq-api-key"
export HARNESS_PROVIDER=groq

# 2. Install dependencies
make setup

# 3. Run tests to verify
make test
# 89/89 tests pass

# 4. Run harness on an issue
make run "issue description here"
```

**Or use the TUI (interactive terminal UI):**
```bash
./bin/harness-tui
```

## Overview

This is an autonomous coding-agent harness that receives a software issue, operates inside a repository, inspects the repository, reasons about the requested change, modifies implementation code, runs tests, diagnoses failures, recovers when necessary, and terminates only after verification or a controlled failure.

**Core Design Goals:**
- Correctness over token minimization
- Autonomous execution with explicit orchestration
- Explicit orchestration (model proposes, orchestrator validates)
- Evidence-driven decisions
- Bounded execution (depth, iterations, recovery budgets)
- Relevant context with deterministic compression
- Controlled tool use
- Failure recovery with bounded attempts
- Reproducibility
- Observable execution via structured telemetry

## Architecture

```
Issue
  ↓
Issue Input (CLI/env/file)
  ↓
Orchestrator
  ├── Model Adapter (Gemini/Groq)
  ├── Context Manager (V2 - sectioned, budgeted, compressed)
  ├── Tool Layer (6 tools)
  ├── Recovery Engine (7 failure types, 8 strategies)
  ├── Hypothesis Tracker
  ├── Findings Store
  └── Telemetry Logger
  ↓
Repository Changes
  ↓
Verification (deterministic, no model calls)
  ↓
DONE / FAILED
```

### Core Components

| Component | Responsibility |
|-----------|----------------|
| `HarnessConfig` | Central config, API keys from env only |
| `AgentState` + `AgentPhase` | Explicit state machine (9 phases) |
| `ModelAdapter` | Isolated provider logic (Gemini + Groq) |
| `Orchestrator` | Explicit state machine, NO model-driven transitions |
| `ContextManager` | Sectioned, budgeted, compressed context |
| `Tool Layer` | 6 tools with bounded outputs |
| `Recovery Engine` | 7 failure types, 8 strategies, budgeted |
| `HypothesisTracker` | Supporting/contradicting evidence, auto-rejection |
| `FindingsStore` | Deduplication, invalidation, relevance search |
| `TelemetryLogger` | 10 event types, correlation IDs, durations |
| `ReportingAdapter` | Organizer schema boundary |

## Autonomous Execution Loop

```
BOOT → DISCOVER → UNDERSTAND → PLAN → ACT → VERIFY → DONE
                     ↘ DIAGNOSE ↗
```

**Phases:**
1. **BOOT** → initialize, transition to DISCOVER
2. **DISCOVER** → list_files (recursive), explore repository structure
3. **UNDERSTAND** → search_code, read_file to form hypothesis
4. **PLAN** → model outputs JSON plan (goal, steps, files, verification, hypothesis)
5. **ACT** → single tool call per turn (edit_file, search_code, read_file, run_shell, run_tests)
6. **VERIFY** → deterministic test execution (NO model call)
7. **DIAGNOSE** → classify failure, update hypothesis, select recovery strategy
10. **TERMINATION** → DONE (tests pass) or FAILED (budgets exhausted)

**Key principle:** The model NEVER controls state transitions. The orchestrator validates every transition against `LEGAL_TRANSITIONS`.

## State Machine

```
BOOT → DISCOVER → UNDERSTAND → PLAN → ACT → VERIFY → DONE
                     ↘ DIAGNOSE ↗
```

**Legal Transitions** (enforced in `harness/state.py`):

| From | Allowed To |
|------|------------|
| BOOT | DISCOVER, FAILED |
| DISCOVER | UNDERSTAND, DIAGNOSE, FAILED |
| UNDERSTAND | PLAN, DIAGNOSE, FAILED |
| PLAN | ACT, DIAGNOSE, FAILED |
| ACT | VERIFY, DIAGNOSE, FAILED |
| VERIFY | DONE, DIAGNOSE, FAILED |
| DIAGNOSE | DISCOVER, UNDERSTAND, PLAN, ACT, DONE, FAILED |
| DONE | (terminal) |
| FAILED | (terminal) |

**Orchestrator controls all transitions.** Model generates text/tool calls; orchestrator validates and transitions.

## AgentState (Serializable)

```python
@dataclass
class AgentState:
    issue: str = ""
    current_state: AgentPhase = AgentPhase.BOOT
    repo_root: str = "."
    explored_files: list[str] = []
    findings: list[str] = []
    hypothesis: str = ""
    plan: list[str] = []
    changed_files: list[str] = []
    test_status: str = "not_run"
    failed_approaches: list[str] = []
    iteration_count: int = 0
    depth: int = 0
    max_depth: int = 3
```

## Context Engine V2

**Structured Sections with Budgets** (sum ≤ 60,000 chars):

| Section | Budget | Priority | Description |
|---------|--------|----------|-------------|
| issue | 2,000 | 1 | Issue text |
| repo_summary | 3,000 | 2 | Repository structure |
| hypothesis | 1,000 | 2 | Current hypothesis |
| plan | 2,000 | 2 | Current plan steps |
| changed_files | 1,500 | 3 | Modified files |
| failed_approaches | 1,500 | 3 | Recent failures (last 5) |
| latest_tool_result | 8,000 | 1 | Latest tool output |
| latest_test_result | 5,000 | 1 | Latest test output |
| state_metadata | 1,000 | 2 | Phase, depth, iteration, test status |

**Compression:** Deterministic per-section truncation preserving critical evidence (issue, hypothesis, plan, changed files, active failure).

## Tool Layer

**6 Tools** (all return structured `ToolResult` with bounded output):

| Tool | Purpose | Output Limits |
|------|---------|---------------|
| `list_files` | Directory listing (excludes noise dirs) | 150 files max |
| `search_code` | Regex search with context | 30 matches, 500 chars context |
| `read_file` | File read with line range | 4,000 chars |
| `edit_file` | Create/overwrite file | 2,000 char diff |
| `run_shell` | Shell command with timeout | stdout/stderr 3K chars |
| `run_tests` | Run test suite | 15 failures max |

**ToolResult** - structured: `success`, `summary`, `data`, `error`, `duration_ms`, `relevant_files`, `exit_code`

**Safety:** Path traversal prevention via `_safe_path()`, bounded outputs, non-zero exit codes = failures.

## Recovery & Failure Handling

**7 Failure Types:**

| Type | Trigger | Strategy |
|------|---------|----------|
| `LOGIC_FAILURE` | Runtime errors (TypeError, etc.) | REVISE_HYPOTHESIS |
| `BAD_EDIT` | Syntax/import errors from edit | INSPECT_AND_CORRECT |
| `WRONG_ASSUMPTION` | Hypothesis contradicted by evidence | RETURN_TO_UNDERSTAND |
| `TOOL_FAILURE` | Tool execution fails | VALIDATE_AND_RETRY_TOOL |
| `ENVIRONMENT_FAILURE` | Command not found (exit 127) | INSPECT_ENVIRONMENT |
| `TEST_FAILURE` | Assertion failure in tests | TARGETED_TEST_FIX |
| `UNKNOWN_FAILURE` | Unclassified | GATHER_EVIDENCE |

**Recovery Strategies (8):**
1. `INSPECT_AND_CORRECT` → ACT
2. `REVISE_HYPOTHESIS` → UNDERSTAND
3. `RETURN_TO_UNDERSTAND` → UNDERSTAND
4. `VALIDATE_AND_RETRY_TOOL` → ACT
5. `INSPECT_ENVIRONMENT` → ACT
6. `TARGETED_TEST_FIX` → ACT
7. `GATHER_EVIDENCE` → UNDERSTAND
8. `EXHAUSTED` → FAILED

**Recovery Budget:** Configurable `max_recovery_attempts` (default 5). Exhausted → FAILED.

**Hypothesis Tracking:** Supporting/contradicting evidence, auto-rejection on 2+ contradictions, explicit reject/confirm, history of rejected hypotheses.

**Findings Store:** Deduplication with confidence upgrade, invalidation on file edit, relevance search.

## Execution Limits

| Limit | Default | Enforcement |
|-------|---------|-------------|
| `max_iterations` | 10 | Loop counter + iteration_budget_exhausted |
| `max_depth` | 3 | Incremented on DIAGNOSE→UNDERSTAND/DISCOVER |
| `max_recovery_attempts` | 5 | Tracked per run, exhaustion → FAILED |
| `max_context_chars` | 60,000 | Section budgets + compression |
| `max_recovery_attempts` | 5 | Per-run budget |

**Termination Reasons:**
- `tests_passed` → DONE
- `max_depth_exceeded` → FAILED
- `recovery_budget_exhausted` → FAILED
- `iteration_budget_exhausted` → FAILED
- `unrecoverable_failure` → FAILED

## Model Integration

**Supported Providers:**
- **Gemini (default)** - `google-genai` SDK, native function calling
- **Groq** - OpenAI-compatible API, function calling

**Configuration:** `HARNESS_PROVIDER` (`gemini`/`groq`), `HARNESS_MODEL_ID`, `HARNESS_PROVIDER` env vars.

**ModelAdapter** isolates all provider SDK logic. Orchestrator never imports provider SDKs directly.

**Function Calling:** Native for both providers. Tools passed as schemas.

**Model Calls:** Only in DISCOVER, UNDERSTAND, PLAN, ACT, DIAGNOSE. **NEVER in VERIFY** (deterministic).

## Telemetry

**10 Event Types** (JSONL, `telemetry.jsonl`):
- `model_call` - tokens, finish_reason, tool_calls, depth, iteration
- `tool_call` - tool, args, success, duration_ms, relevant_files
- `state_transition` - from, to, turn, reason, depth, iteration
- `context_update` - chars, sections, truncated, compression
- `test_execution` - command, passed, failures, duration
- `error` - message, turn, depth
- `recovery` - reason, failure_type, strategy, confidence
- `termination` - final_state, total_turns, depth, iteration, recovery_attempts
- `compression` - section, chars, budget
- `execution_summary` - aggregate metrics

**Execution Summary** (`report_summary.json`):
- Token counts (input/output/total), model calls by phase
- Tool calls by type, state transitions, test counts
- Recovery attempts, types, errors
- Context sizes by phase, compression events
- Redundant actions skipped, repeated actions detected

## Reporting

**Outputs:**
1. `telemetry.jsonl` - JSONL event stream (repo root)
2. `report_summary.json` - Machine-readable summary (repo root)
3. `report.md` - Human-readable markdown (repo root)

**ReportingAdapter** (`harness/reporting.py`): Maps internal summary to organizer canonical schema (placeholder until organizer schema provided).

## Security / Trust Boundaries

| Protection | Implementation |
|------------|----------------|
| Path traversal | `_safe_path()` resolves and checks prefix |
| Tool validation | All tools validate inputs, bound outputs |
| Test protection | Tests never modified by tools |
| API keys | Env-only, never in telemetry |
| Model cannot | Directly force DONE/FAILED, change limits, bypass verification |
| Path safety | Tools validate paths via `_safe_path()` |
| No secrets in telemetry | API keys never logged |

**Trust Model:** Model proposes → Orchestrator validates → Tools execute → Tests verify.

## Project Structure

```
harness/
├── __init__.py          # exports: HarnessConfig, AgentState, AgentPhase, Orchestrator, ReportingAdapter, OrganizerReport, create_organizer_report
├── __main__.py          # entry point for `python -m harness`
├── config.py            # HarnessConfig (env-only, frozen dataclass)
├── state.py             # AgentState, AgentPhase, LEGAL_TRANSITIONS
├── model.py             # ModelAdapter (Gemini + Groq), ModelResponse
├── orchestrator.py      # Orchestrator (state machine, recovery, context, telemetry)
├── main.py              # CLI entry (make run)
├── issue.py             # IssueInput (CLI/env/file)
├── tools/
│   ├── __init__.py      # Tool protocol, ToolResult, ToolError
│   └── base.py          # 6 tool implementations
├── context/
│   └── __init__.py      # ContextManager V2 (sections, budgets, compression)
├── telemetry/
│   └── __init__.py      # TelemetryEvent, TelemetryLogger (10 event types)
├── recovery/
│   └── __init__.py      # FailureClassifier, RecoveryEngine, HypothesisTracker, FindingsStore
├── reporting.py         # ReportingAdapter, OrganizerReport
└── bin/
    └── harness-tui      # Interactive TUI (Node.js)

tests/
├── test_sprint0.py      # 8 tests (imports, config, state, telemetry, tools)
├── test_sprint1.py      # 19 tests (tools, context, recovery, telemetry, issue, orchestrator)
├── test_sprint2.py      # 17 tests (depth, context V2, repetition, model discipline)
├── test_sprint3.py      # 27 tests (failure classification, hypothesis, findings, recovery)
└── test_sprint4.py      # 18 tests (adversarial, telemetry, reporting, security)

fixtures/
├── case_a_simple_bug_fix/
├── case_b_multi_file_change/
├── case_c_wrong_location/
├── case_d_behavioral_change/
├── case_e_regression_risk/
├── case_f_test_driven/
├── case_g_tool_failure/
├── case_h_wrong_hypothesis/
├── case_i_large_repo/
└── case_j_noop/

evaluation_runner.py      # Internal evaluation runner
```

## Requirements

- **Python 3.11+**
- `google-genai>=2.25.0` (Gemini)
- `pytest>=8.0.0`
- `openai>=1.0.0` (Groq adapter)
- **Node.js 18+** (for TUI)

## Configuration

| Env Var | Purpose | Default |
|---------|---------|---------|
| `GEMINI_API_KEY` | Google Gemini API key | required for gemini |
| `GROQ_API_KEY` | Groq API key | required for groq |
| `HARNESS_PROVIDER` | Provider selection | `gemini` |
| `HARNESS_MODEL_ID` | Override model ID | `gemini-3.8-high` / `qwen/qwen3.8-27b` |
| `HARNESS_MAX_ITERATIONS` | Max iterations | `10` |
| `HARNESS_MAX_DEPTH` | Max delegation depth | `3` |
| `HARNESS_MAX_RECOVERY_ATTEMPTS` | Max recovery attempts | `5` |
| `HARNESS_REPO_ROOT` | Repository root | `.` |
| `OPENAI_API_KEY` | OpenAI-compatible API key | required for openai-compatible |
| `HARNESS_BASE_URL` | Base URL for OpenAI-compatible | - |
| `OPENAI_BASE_URL` | Base URL for OpenAI-compatible | - |

## Running the Harness

### Standard Evaluation Interface

```bash
export GEMINI_API_KEY="your-gemini-api-key"
# OR
export GROQ_API_KEY="your-groq-api-key"
export HARNESS_PROVIDER=groq

make setup    # installs dependencies
make test     # runs local unit tests (89 tests)
make run "issue description here"  # launches harness on an issue
```

**Issue Input Methods (priority order):**
1. CLI argument: `make run "issue description"`
2. Environment: `HARNESS_ISSUE=...`
3. File: `issue.txt` in repo root
4. Fallback: "No issue provided"

### TUI (Interactive Terminal UI)

```bash
# Run TUI - prompts for all configuration interactively
./bin/harness-tui
```

**TUI Features:**
- Provider selection (Gemini / Groq / OpenAI-compatible)
- API key input (uses env vars if available)
- Model ID configuration
- Base URL for OpenAI-compatible providers
- Execution limits (iterations, depth, recovery)
- Test command customization
- Issue description input
- Configuration summary with confirmation

### Local Development

```bash
make setup   # installs dependencies
make test    # runs 89 unit tests
make run "issue description"  # runs harness on issue
make clean   # removes telemetry.jsonl, report.md, __pycache__
```

## Testing

```bash
make test
# 89 tests passed
# test_sprint0.py:  8 tests (config, state, telemetry, tools)
# test_sprint1.py:  19 tests (tools, context, recovery, telemetry, issue, orchestrator)
# test_sprint2.py:  17 tests (depth, context V2, repetition, model discipline)
# test_sprint3.py:  27 tests (failure classification, hypothesis, findings, recovery)
# test_sprint4.py:  18 tests (adversarial, telemetry, reporting, security)
```

**Total: 89 tests passing**

## Evaluation Fixtures (10 Cases)

| Case | Type | Expected Files | Recovery |
|------|------|----------------|----------|
| A | Simple Bug Fix | `src/calculator.py` | No |
| B | Multi-File Change | `src/order.py` | No |
| C | Wrong Location | `src/transformer.py` | Yes |
| D | Behavioral Change | `src/config.py`, `src/service.py` | No |
| E | Regression Risk | `src/payments.py` | Yes |
| F | Test-Driven Debugging | `src/analyzer.py` | Yes |
| G | Tool Failure | `src/service.py` | Yes |
| H | Wrong Hypothesis | `src/bonus.py` | Yes |
| I | Large Repository | `src/core/order_processor.py` | No |
| J | No-Op | (none) | No |

Each fixture includes: issue, expected changed files, test command, forbidden modifications, recovery expectation.

## Design Decisions & Tradeoffs

| Decision | Rationale |
|----------|-----------|
| Explicit orchestrator control | Prevents model from bypassing safety limits |
| Deterministic verification | Tests are ground truth; model cannot claim success |
| Compact context | Prevents context window overflow; preserves relevant signal |
| Bounded execution | Separate limits prevent infinite loops on different dimensions |
| Findings + hypothesis tracking | Prevents circular reasoning; enables recovery |
| Single-process | Avoids distributed systems complexity; deterministic |
| Provider abstraction | Swappable models; SDK logic isolated |
| Structured tools | Bounded output prevents context flooding; deterministic parsing |

## Technical Limitations

- Organizer issue-delivery mechanism depends on evaluation environment
- Organizer reporting schema adapter requires final canonical schema when available
- Token metadata unavailable for some providers (marked unavailable, never fabricated)
- Model behavior is nondeterministic
- External repository environments may vary (Python version, dependencies)

## Submission / Evaluation Notes

**Evaluator Flow:**
```bash
export GEMINI_API_KEY="..."  # or GROQ_API_KEY
make setup    # installs deps
make test     # 89 tests pass
make run "issue description"  # launches harness
```

Or use the TUI:
```bash
export GEMINI_API_KEY="..."
./bin/harness-tui
```

- API keys from environment only (never hardcoded)
- No test modifications by harness
- Telemetry produced at `telemetry.jsonl`
- Summary at `report_summary.json`, report at `report.md`
- No secrets committed
- No test manipulation
- No verification bypass

## Final Validation

```bash
make clean
make setup
make test      # 89/89 pass
make run "issue"  # requires valid API key
```

**Test Result:** 89/89 tests pass.

No concrete blockers. Ready for evaluation.