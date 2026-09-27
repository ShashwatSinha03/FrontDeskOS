"""Context Engine V2 - structured sections, budgets, compression, metadata."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from harness.state import AgentState
from harness.tools import ToolResult


# Section budgets (chars) - must sum <= MAX_CONTEXT_CHARS
SECTION_BUDGETS = {
    "issue": 2_000,
    "repo_summary": 3_000,
    "hypothesis": 1_000,
    "plan": 2_000,
    "changed_files": 1_500,
    "failed_approaches": 1_500,
    "latest_tool_result": 8_000,
    "latest_test_result": 5_000,
    "state_metadata": 1_000,
}

MAX_CONTEXT_CHARS = 60_000
assert sum(SECTION_BUDGETS.values()) <= MAX_CONTEXT_CHARS


@dataclass
class ContextSection:
    name: str
    content: str
    budget: int
    priority: int  # lower = higher priority (always included)
    compressed: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "chars": len(self.content),
            "budget": self.budget,
            "priority": self.priority,
            "compressed": self.compressed,
        }


@dataclass
class ContextMetadata:
    total_chars: int
    sections: list[dict[str, Any]]
    truncated: bool
    compression_applied: bool
    depth: int
    iteration: int
    remaining_iteration_budget: int


class ContextManager:
    """Builds structured, budgeted context with compression."""

    def __init__(self, max_chars: int = MAX_CONTEXT_CHARS) -> None:
        self.max_chars = max_chars
        self._section_budgets = dict(SECTION_BUDGETS)

    def build_model_context(
        self,
        state: AgentState,
        latest_tool_result: ToolResult | None = None,
        latest_test_result: ToolResult | None = None,
    ) -> tuple[str, ContextMetadata]:
        """Build context with sections, budgets, and metadata."""
        sections = self._build_sections(state, latest_tool_result, latest_test_result)
        full_context, truncated, compressed = self._apply_budgets(sections)
        metadata = ContextMetadata(
            total_chars=len(full_context),
            sections=[s.to_dict() for s in sections],
            truncated=truncated,
            compression_applied=compressed,
            depth=state.depth,
            iteration=state.iteration_count,
            remaining_iteration_budget=max(0, state.max_depth - state.depth),
        )
        return full_context, metadata

    def _build_sections(
        self,
        state: AgentState,
        latest_tool_result: ToolResult | None,
        latest_test_result: ToolResult | None,
    ) -> list[ContextSection]:
        sections = []

        # 1. Issue (always, high priority)
        sections.append(ContextSection(
            name="issue",
            content=f"## Issue\n{state.issue}",
            budget=self._section_budgets["issue"],
            priority=1,
        ))

        # 2. Repository Summary
        repo_content = self._build_repo_summary(state)
        sections.append(ContextSection(
            name="repo_summary",
            content=repo_content,
            budget=self._section_budgets["repo_summary"],
            priority=2,
        ))

        # 3. Current Hypothesis
        if state.hypothesis:
            sections.append(ContextSection(
                name="hypothesis",
                content=f"## Hypothesis\n{state.hypothesis}",
                budget=self._section_budgets["hypothesis"],
                priority=2,
            ))

        # 4. Current Plan
        if state.plan:
            plan_content = "## Plan\n" + "\n".join(f"  {i+1}. {s}" for i, s in enumerate(state.plan))
            sections.append(ContextSection(
                name="plan",
                content=plan_content,
                budget=self._section_budgets["plan"],
                priority=2,
            ))

        # 5. Changed Files
        if state.changed_files:
            sections.append(ContextSection(
                name="changed_files",
                content="## Changed Files\n" + "\n".join(f"  {f}" for f in state.changed_files),
                budget=self._section_budgets["changed_files"],
                priority=3,
            ))

        # 6. Failed Approaches (recent only)
        if state.failed_approaches:
            recent = state.failed_approaches[-5:]
            content = "## Failed Approaches (avoid repeating)\n" + "\n".join(f"  {i+1}. {fa}" for i, fa in enumerate(recent))
            sections.append(ContextSection(
                name="failed_approaches",
                content=content,
                budget=self._section_budgets["failed_approaches"],
                priority=3,
            ))

        # 7. Latest Tool Result
        if latest_tool_result:
            tool_content = self._format_tool_result(latest_tool_result)
            sections.append(ContextSection(
                name="latest_tool_result",
                content=tool_content,
                budget=self._section_budgets["latest_tool_result"],
                priority=1,
            ))

        # 8. Latest Test Result
        if latest_test_result:
            test_content = self._format_test_result(latest_test_result)
            sections.append(ContextSection(
                name="latest_test_result",
                content=test_content,
                budget=self._section_budgets["latest_test_result"],
                priority=1,
            ))

        # 9. State Metadata
        meta_content = self._build_state_metadata(state)
        sections.append(ContextSection(
            name="state_metadata",
            content=meta_content,
            budget=self._section_budgets["state_metadata"],
            priority=2,
        ))

        return sections

    def _build_repo_summary(self, state: AgentState) -> str:
        parts = [f"## Repository\nRoot: {state.repo_root}"]
        if state.explored_files:
            parts.append(f"Explored: {len(state.explored_files)} files")
            dirs = {}
            for f in state.explored_files[:50]:
                d = f.split("/")[0] if "/" in f else "."
                dirs[d] = dirs.get(d, 0) + 1
            parts.append("Structure: " + ", ".join(f"{d}({c})" for d, c in sorted(dirs.items())[:15]))
        return "\n".join(parts)

    def _format_tool_result(self, result: ToolResult) -> str:
        parts = ["## Latest Tool Result"]
        if result.success:
            parts.append(f"SUCCESS: {result.summary}")
            if result.data:
                data_str = self._compress_data(result.data, getattr(result, 'tool_name', "tool"))
                parts.append(data_str)
        else:
            parts.append(f"FAILURE: {result.error or result.summary}")
        if result.relevant_files:
            parts.append(f"Relevant files: {', '.join(result.relevant_files[:10])}")
        return "\n".join(parts)

    def _format_test_result(self, result: ToolResult) -> str:
        parts = ["## Latest Test Result"]
        if result.success:
            passed = result.data.get("passed", False) if result.data else False
            parts.append(f"Tests: {'PASSED' if passed else 'FAILED'}")
            if result.data and result.data.get("failures"):
                failures = result.data["failures"][:5]
                for f in failures:
                    parts.append(f"  FAIL: {f.get('test', 'unknown')}: {f.get('error', '')[:200]}")
        else:
            parts.append(f"Test execution failed: {result.error or result.summary}")
        return "\n".join(parts)

    def _build_state_metadata(self, state: AgentState) -> str:
        return "\n".join([
            "## State",
            f"Phase: {state.current_state.value}",
            f"Depth: {state.depth}/{state.max_depth}",
            f"Iteration: {state.iteration_count}",
            f"Test Status: {state.test_status}",
        ])

    def _compress_data(self, data: Any, tool_name: str) -> str:
        if isinstance(data, dict):
            if tool_name == "list_files":
                files = data.get("files", [])
                count = data.get("count", len(files))
                if count > 30:
                    return f"Files ({count}): {', '.join(files[:30])} ... (+{count-30} more)"
                return f"Files ({count}): {', '.join(files)}"
            elif tool_name == "search_code":
                matches = data.get("matches", [])
                if len(matches) > 10:
                    lines = [f"  {m['file']}:{m['line']} - {m['match'][:80]}" for m in matches[:10]]
                    return f"Matches ({len(matches)}):\n" + "\n".join(lines) + f"\n  ... (+{len(matches)-10} more)"
                return "Matches:\n" + "\n".join(f"  {m['file']}:{m['line']} - {m['match'][:80]}" for m in matches)
            elif tool_name == "read_file":
                content = data.get("content", "")
                if len(content) > 2000:
                    return content[:2000] + "\n... (truncated)"
                return content
            elif tool_name == "run_shell":
                stdout = data.get("stdout", "")
                stderr = data.get("stderr", "")
                out = []
                if stdout:
                    out.append(f"stdout:\n{stdout[-3000:]}")
                if stderr:
                    out.append(f"stderr:\n{stderr[-3000:]}")
                return "\n".join(out) if out else "(no output)"
            elif tool_name == "run_tests":
                return self._format_test_result(ToolResult(**data)) if isinstance(data, dict) else str(data)
        return str(data)[:3000]

    def _apply_budgets(self, sections: list[ContextSection]) -> tuple[str, bool, bool]:
        compressed_any = False
        for section in sections:
            if len(section.content) > section.budget:
                section.content = self._compress_section(section)
                section.compressed = True
                compressed_any = True

        total = sum(len(s.content) for s in sections)
        if total > self.max_chars:
            sections.sort(key=lambda s: s.priority)
            remaining = self.max_chars
            for section in sections:
                if remaining <= 0:
                    section.content = ""
                    section.compressed = True
                    compressed_any = True
                elif len(section.content) > remaining:
                    section.content = section.content[:remaining] + "\n... (budget truncated)"
                    section.compressed = True
                    compressed_any = True
                    remaining = 0
                else:
                    remaining -= len(section.content)

        full = "\n\n".join(s.content for s in sections if s.content)
        truncated = len(full) >= self.max_chars * 0.95
        return full, truncated, compressed_any

    def _compress_section(self, section: ContextSection) -> str:
        content = section.content
        budget = section.budget

        if section.name == "repo_summary":
            lines = content.split("\n")
            keep = [l for l in lines if not l.startswith("  ")]
            return "\n".join(keep)[:budget]

        elif section.name == "failed_approaches":
            lines = content.split("\n")
            if len(lines) > 4:
                return "\n".join(lines[:1] + lines[-3:])[:budget]
            return content[:budget]

        elif section.name == "latest_tool_result" or section.name == "latest_test_result":
            if len(content) > budget:
                half = budget // 2
                return content[:half] + "\n... (compressed) ...\n" + content[-half:]
            return content[:budget]

        return content[:budget]


def build_model_context(
    state: AgentState,
    latest_tool_result: ToolResult | None = None,
    latest_test_result: ToolResult | None = None,
    max_chars: int = MAX_CONTEXT_CHARS,
) -> tuple[str, ContextMetadata]:
    mgr = ContextManager(max_chars)
    return mgr.build_model_context(state, latest_tool_result, latest_test_result)