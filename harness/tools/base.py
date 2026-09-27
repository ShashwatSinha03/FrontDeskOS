"""Concrete tool implementations with disciplined, structured outputs."""
from __future__ import annotations

import os
import re
import subprocess
import time
from pathlib import Path
from typing import Any

from harness.tools import Tool, ToolResult, ToolError


NOISE_DIRS = {".git", "__pycache__", "node_modules", ".venv", "venv", "env", "dist", "build", ".next", ".cache", "coverage", ".pytest_cache", ".mypy_cache", "target"}

# Output limits
MAX_STDOUT_CHARS = 3000
MAX_STDERR_CHARS = 3000
MAX_FILE_CONTENT_CHARS = 4000
MAX_SEARCH_MATCHES = 30
MAX_FILES_LISTED = 150


def _safe_path(base: str, path: str) -> Path:
    b = Path(base).resolve()
    p = (b / path).resolve()
    if not str(p).startswith(str(b)):
        raise ToolError(f"path escapes repo root: {path}")
    return p


def _should_skip(path: Path) -> bool:
    parts = set(path.parts)
    return bool(parts & NOISE_DIRS) or any(p.startswith(".") for p in path.parts)


def _truncate(s: str, limit: int) -> str:
    if len(s) <= limit:
        return s
    half = limit // 2
    return s[:half] + f"\n... ({len(s) - limit} chars truncated) ...\n" + s[-half:]


class ListFilesTool:
    name = "list_files"
    description = "List files in a directory, excluding noise dirs."

    def __init__(self, repo_root: str) -> None:
        self.repo_root = repo_root

    def execute(self, path: str = ".", recursive: bool = False, **_) -> ToolResult:
        start = time.time()
        try:
            root = _safe_path(self.repo_root, path)
            if not root.exists() or not root.is_dir():
                return ToolResult.fail(f"not a directory: {path}", duration_ms=(time.time() - start) * 1000)

            files = []
            if recursive:
                for f in root.rglob("*"):
                    if f.is_file() and not _should_skip(f.relative_to(root)):
                        files.append(str(f.relative_to(root)))
            else:
                for f in root.iterdir():
                    if f.is_file() and not _should_skip(f):
                        files.append(str(f.relative_to(root)))

            files = sorted(files)[:MAX_FILES_LISTED]
            return ToolResult.ok(
                summary=f"Listed {len(files)} files in {path}",
                data={"files": files, "count": len(files), "path": path, "truncated": len(files) == MAX_FILES_LISTED},
                relevant_files=files,
                duration_ms=(time.time() - start) * 1000
            )
        except Exception as e:
            return ToolResult.fail(str(e), duration_ms=(time.time() - start) * 1000)


class SearchCodeTool:
    name = "search_code"
    description = "Search for regex pattern in files, returns matches with context."

    def __init__(self, repo_root: str) -> None:
        self.repo_root = repo_root

    def execute(self, pattern: str, path: str = ".", max_results: int = MAX_SEARCH_MATCHES, **_) -> ToolResult:
        start = time.time()
        try:
            root = _safe_path(self.repo_root, path)
            if not root.exists():
                return ToolResult.fail(f"path not found: {path}", duration_ms=(time.time() - start) * 1000)

            matches = []
            files_searched = 0
            for f in root.rglob("*"):
                if not f.is_file() or _should_skip(f.relative_to(root)):
                    continue
                if f.suffix in {".pyc", ".bin", ".png", ".jpg", ".gif", ".woff", ".woff2", ".ttf", ".eot", ".ico", ".svg"}:
                    continue
                files_searched += 1
                try:
                    text = f.read_text(encoding="utf-8", errors="ignore")
                    lines = text.splitlines()
                    for i, line in enumerate(lines, 1):
                        if re.search(pattern, line):
                            lo = max(0, i - 2)
                            hi = min(len(lines), i + 2)
                            context = "\n".join(f"{ln}:{lines[ln-1]}" for ln in range(lo + 1, hi + 1))
                            matches.append({
                                "file": str(f.relative_to(root)),
                                "line": i,
                                "match": line.strip()[:200],
                                "context": context[:500],
                            })
                            if len(matches) >= max_results:
                                break
                    if len(matches) >= max_results:
                        break
                except Exception:
                    pass

            return ToolResult.ok(
                summary=f"Found {len(matches)} matches for '{pattern}' in {files_searched} files",
                data={"matches": matches, "pattern": pattern, "files_searched": files_searched, "truncated": len(matches) == max_results},
                relevant_files=[m["file"] for m in matches],
                duration_ms=(time.time() - start) * 1000
            )
        except Exception as e:
            return ToolResult.fail(str(e), duration_ms=(time.time() - start) * 1000)


class ReadFileTool:
    name = "read_file"
    description = "Read a file's contents, optionally with line range."

    def __init__(self, repo_root: str) -> None:
        self.repo_root = repo_root

    def execute(self, path: str, start_line: int = 1, end_line: int = 0, **_) -> ToolResult:
        start = time.time()
        try:
            f = _safe_path(self.repo_root, path)
            if not f.exists() or not f.is_file():
                return ToolResult.fail(f"file not found: {path}", duration_ms=(time.time() - start) * 1000)

            text = f.read_text(encoding="utf-8", errors="replace")
            lines = text.splitlines()
            total = len(lines)

            if start_line < 1:
                start_line = 1
            if end_line == 0 or end_line > total:
                end_line = total
            if start_line > total:
                return ToolResult.fail(f"start_line {start_line} exceeds file length {total}", duration_ms=(time.time() - start) * 1000)

            selected = lines[start_line - 1:end_line]
            content = "\n".join(selected)
            content = _truncate(content, MAX_FILE_CONTENT_CHARS)

            return ToolResult.ok(
                summary=f"Read {path} lines {start_line}-{end_line} of {total}",
                data={"path": path, "content": content, "start_line": start_line, "end_line": end_line, "total_lines": total, "truncated": len(content) >= MAX_FILE_CONTENT_CHARS},
                relevant_files=[path],
                duration_ms=(time.time() - start) * 1000
            )
        except Exception as e:
            return ToolResult.fail(str(e), duration_ms=(time.time() - start) * 1000)


class EditFileTool:
    name = "edit_file"
    description = "Create or overwrite a file with new content."

    def __init__(self, repo_root: str) -> None:
        self.repo_root = repo_root

    def execute(self, path: str, content: str, **_) -> ToolResult:
        start = time.time()
        try:
            f = _safe_path(self.repo_root, path)
            f.parent.mkdir(parents=True, exist_ok=True)

            old_content = ""
            if f.exists():
                old_content = f.read_text(encoding="utf-8", errors="replace")

            f.write_text(content, encoding="utf-8")

            diff = self._diff(old_content, content)

            return ToolResult.ok(
                summary=f"{'Created' if not old_content else 'Updated'} {path} ({len(content)} bytes)",
                data={"path": path, "bytes": len(content.encode()), "diff": diff},
                relevant_files=[path],
                duration_ms=(time.time() - start) * 1000
            )
        except Exception as e:
            return ToolResult.fail(str(e), duration_ms=(time.time() - start) * 1000)

    def _diff(self, old: str, new: str) -> str:
        import difflib
        diff = list(difflib.unified_diff(old.splitlines(keepends=True), new.splitlines(keepends=True), n=3))
        diff_text = "".join(diff)
        return _truncate(diff_text, 2000)


class RunShellTool:
    name = "run_shell"
    description = "Execute a shell command with timeout."

    def __init__(self, repo_root: str, timeout: int = 60) -> None:
        self.repo_root = repo_root
        self.default_timeout = timeout

    def execute(self, command: str, timeout: int | None = None, **_) -> ToolResult:
        start = time.time()
        t = timeout or self.default_timeout
        try:
            result = subprocess.run(
                command,
                shell=True,
                cwd=self.repo_root,
                capture_output=True,
                text=True,
                timeout=t,
            )
            duration = (time.time() - start) * 1000
            stdout = _truncate(result.stdout, MAX_STDOUT_CHARS)
            stderr = _truncate(result.stderr, MAX_STDERR_CHARS)

            # Non-zero exit codes are failures (except we allow some flexibility)
            if result.returncode != 0:
                return ToolResult.fail(
                    f"Command exited {result.returncode}: {stderr[:200] or stdout[:200]}",
                    duration_ms=duration,
                    exit_code=result.returncode,
                    summary=f"Command exited {result.returncode} in {duration:.0f}ms"
                )

            return ToolResult.ok(
                summary=f"Command exited {result.returncode} in {duration:.0f}ms",
                data={"exit_code": result.returncode, "stdout": stdout, "stderr": stderr},
                exit_code=result.returncode,
                duration_ms=duration
            )
        except subprocess.TimeoutExpired:
            duration = (time.time() - start) * 1000
            return ToolResult.fail(f"timeout after {t}s", duration_ms=duration, exit_code=-1, summary=f"Command timed out after {t}s")
        except Exception as e:
            duration = (time.time() - start) * 1000
            return ToolResult.fail(str(e), duration_ms=duration, exit_code=-1)


class RunTestsTool:
    name = "run_tests"
    description = "Run the repository's test suite."

    def __init__(self, repo_root: str, test_command: str = "python3 -m pytest tests -q") -> None:
        self.repo_root = repo_root
        self.default_command = test_command

    def execute(self, command: str | None = None, **_) -> ToolResult:
        start = time.time()
        cmd = command or self.default_command
        try:
            result = subprocess.run(
                cmd,
                shell=True,
                cwd=self.repo_root,
                capture_output=True,
                text=True,
                timeout=180,
            )
            duration = (time.time() - start) * 1000
            stdout = _truncate(result.stdout, MAX_STDOUT_CHARS)
            stderr = _truncate(result.stderr, MAX_STDERR_CHARS)

            passed = result.returncode == 0
            failures = self._parse_failures(stdout + "\n" + stderr)

            if not passed:
                return ToolResult.fail(
                    f"Tests failed ({len(failures)} failures) in {duration:.0f}ms",
                    duration_ms=duration,
                    exit_code=result.returncode,
                    summary=f"Tests FAILED ({len(failures)} failures) in {duration:.0f}ms",
                    data={
                        "passed": passed,
                        "exit_code": result.returncode,
                        "stdout": stdout,
                        "stderr": stderr,
                        "failures": failures
                    }
                )

            return ToolResult.ok(
                summary=f"Tests PASSED ({len(failures)} failures) in {duration:.0f}ms",
                data={
                    "passed": passed,
                    "exit_code": result.returncode,
                    "stdout": stdout,
                    "stderr": stderr,
                    "failures": failures
                },
                exit_code=result.returncode,
                duration_ms=duration
            )
        except subprocess.TimeoutExpired:
            duration = (time.time() - start) * 1000
            return ToolResult.fail("test timeout after 180s", duration_ms=duration, exit_code=-1, summary="Tests timed out")
        except Exception as e:
            duration = (time.time() - start) * 1000
            return ToolResult.fail(str(e), duration_ms=duration, exit_code=-1)

    def _parse_failures(self, output: str) -> list[dict]:
        failures = []
        lines = output.splitlines()
        current_test = None
        for i, line in enumerate(lines):
            # Match pytest failure lines: "FAILED tests/test_fail.py::test_fail - assert 1 == 2"
            if "FAILED " in line and "::" in line:
                parts = line.split("FAILED")
                if len(parts) > 1:
                    test_path = parts[1].strip().split()[0]
                    current_test = test_path
                    # Extract the assertion error from the same line if present
                    if " - " in line:
                        error_part = line.split(" - ", 1)[1]
                        failures.append({
                            "test": current_test,
                            "error": error_part.strip()[:300],
                            "traceback": line[:2000],
                        })
                        current_test = None
            # Also check for AssertionError in subsequent lines (for multi-line tracebacks)
            if "AssertionError" in line and current_test:
                failures.append({
                    "test": current_test,
                    "error": line.strip()[:300],
                    "traceback": "\n".join(lines[max(0, i-5):i+10])[:2000],
                })
                current_test = None
        return failures[:15]


def create_toolkit(repo_root: str, test_command: str) -> dict[str, Tool]:
    return {
        "list_files": ListFilesTool(repo_root),
        "search_code": SearchCodeTool(repo_root),
        "read_file": ReadFileTool(repo_root),
        "edit_file": EditFileTool(repo_root),
        "run_shell": RunShellTool(repo_root),
        "run_tests": RunTestsTool(repo_root, test_command),
    }