"""Issue ingestion abstraction - replaceable input layer."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class IssueInput:
    issue: str
    metadata: dict | None = None

    @classmethod
    def from_cli(cls, issue: str) -> "IssueInput":
        return cls(issue=issue, metadata={"source": "cli"})

    @classmethod
    def from_env(cls) -> "IssueInput | None":
        import os
        issue = os.environ.get("HARNESS_ISSUE")
        if issue:
            return cls(issue=issue, metadata={"source": "env"})
        return None

    @classmethod
    def from_file(cls, path: str) -> "IssueInput | None":
        try:
            with open(path) as f:
                content = f.read().strip()
            if content:
                return cls(issue=content, metadata={"source": "file", "path": path})
        except Exception:
            pass
        return None

    @classmethod
    def load(cls, cli_issue: str | None = None) -> "IssueInput":
        if cli_issue:
            return cls.from_cli(cli_issue)
        if env_issue := cls.from_env():
            return env_issue
        if file_issue := cls.from_file("issue.txt"):
            return file_issue
        return cls(issue="No issue provided", metadata={"source": "none"})