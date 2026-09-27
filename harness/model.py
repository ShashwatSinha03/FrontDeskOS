"""Multi-provider model adapter: Gemini (google-genai) + Groq (OpenAI-compatible)."""
from __future__ import annotations

import os
import time
from dataclasses import dataclass
from typing import Any


class ModelError(RuntimeError):
    pass


@dataclass
class ModelResponse:
    text: str
    tool_calls: list[dict[str, Any]] | None = None
    input_tokens: int | None = None
    output_tokens: int | None = None
    total_tokens: int | None = None
    model_id: str | None = None
    finish_reason: str | None = None


class GeminiAdapter:
    """Google Gemini via google-genai SDK."""

    def __init__(self, api_key: str, model_id: str) -> None:
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY not set")
        self.api_key = api_key
        self.model_id = model_id
        self._client = None

    def _ensure_client(self):
        if self._client is None:
            try:
                from google import genai
            except ImportError as e:
                raise ModelError("google-genai not installed. Run `make setup`.") from e
            self._client = genai.Client(api_key=self.api_key)
        return self._client

    def _extract_usage(self, response) -> tuple[int | None, int | None, int | None]:
        try:
            usage = getattr(response, "usage_metadata", None)
            if usage:
                return (
                    getattr(usage, "prompt_token_count", None),
                    getattr(usage, "candidates_token_count", None),
                    getattr(usage, "total_token_count", None),
                )
        except Exception:
            pass
        return None, None, None

    def _extract_finish_reason(self, response) -> str | None:
        try:
            candidates = getattr(response, "candidates", None)
            if candidates and len(candidates) > 0:
                return str(getattr(candidates[0], "finish_reason", "UNKNOWN"))
        except Exception:
            pass
        return None

    def _build_tools_config(self, tools: list[dict] | None):
        if not tools:
            return None
        from google.genai import types
        tool_list = []
        for t in tools:
            tool_list.append(types.Tool(
                function_declarations=[types.FunctionDeclaration(
                    name=t["name"],
                    description=t["description"],
                    parameters=t.get("parameters", {"type": "OBJECT", "properties": {}})
                )]
            ))
        return tool_list

    def generate(self, prompt: str, tools: list[dict] | None = None, max_output_tokens: int = 2048) -> ModelResponse:
        if not prompt or not prompt.strip():
            raise ModelError("prompt must be non-empty text")

        try:
            client = self._ensure_client()
            config = {"max_output_tokens": max_output_tokens, "temperature": 0.1}
            tool_objs = self._build_tools_config(tools)
            if tool_objs:
                config["tools"] = tool_objs

            from google.genai import types
            response = client.models.generate_content(
                model=self.model_id,
                contents=prompt,
                config=types.GenerateContentConfig(**config),
            )

            input_toks, output_toks, total_toks = self._extract_usage(response)
            finish_reason = self._extract_finish_reason(response)

            text_parts = []
            tool_calls = []
            for part in getattr(response, "candidates", [{}])[0].get("content", {}).get("parts", []):
                if "text" in part:
                    text_parts.append(part["text"])
                elif "functionCall" in part:
                    fc = part["functionCall"]
                    tool_calls.append({"name": fc.get("name"), "args": fc.get("args", {}), "call_id": fc.get("id", "")})

            return ModelResponse(
                text="\n".join(text_parts).strip() if text_parts else "",
                tool_calls=tool_calls if tool_calls else None,
                input_tokens=input_toks,
                output_tokens=output_toks,
                total_tokens=total_toks,
                model_id=self.model_id,
                finish_reason=finish_reason,
            )
        except Exception as e:
            raise ModelError(f"Gemini call failed: {e}") from e

    def get_tool_schemas(self) -> list[dict]:
        return [
            {"name": "list_files", "description": "List files in a directory, excluding noise dirs.", "parameters": {"type": "OBJECT", "properties": {"path": {"type": "STRING", "default": "."}, "recursive": {"type": "BOOLEAN", "default": False}}}},
            {"name": "search_code", "description": "Search for regex pattern in files.", "parameters": {"type": "OBJECT", "properties": {"pattern": {"type": "STRING"}, "path": {"type": "STRING", "default": "."}, "max_results": {"type": "INTEGER", "default": 50}}, "required": ["pattern"]}},
            {"name": "read_file", "description": "Read a file's contents, optionally with line range.", "parameters": {"type": "OBJECT", "properties": {"path": {"type": "STRING"}, "start_line": {"type": "INTEGER", "default": 1}, "end_line": {"type": "INTEGER", "default": 0}}, "required": ["path"]}},
            {"name": "edit_file", "description": "Create or overwrite a file.", "parameters": {"type": "OBJECT", "properties": {"path": {"type": "STRING"}, "content": {"type": "STRING"}}, "required": ["path", "content"]}},
            {"name": "run_shell", "description": "Execute a shell command.", "parameters": {"type": "OBJECT", "properties": {"command": {"type": "STRING"}, "timeout": {"type": "INTEGER", "default": 60}}, "required": ["command"]}},
            {"name": "run_tests", "description": "Run the test suite.", "parameters": {"type": "OBJECT", "properties": {"command": {"type": "STRING"}}}},
        ]


class GroqAdapter:
    """Groq via OpenAI-compatible API (function calling supported)."""

    def __init__(self, api_key: str, model_id: str = "llama-3.3-70b-versatile") -> None:
        if not api_key:
            raise RuntimeError("GROQ_API_KEY not set")
        self.api_key = api_key
        self.model_id = model_id
        self._client = None

    def _ensure_client(self):
        if self._client is None:
            try:
                from openai import OpenAI
            except ImportError as e:
                raise ModelError("openai package not installed. Run `pip install openai`.") from e
            self._client = OpenAI(
                api_key=self.api_key,
                base_url="https://api.groq.com/openai/v1"
            )
        return self._client

    def generate(self, prompt: str, tools: list[dict] | None = None, max_output_tokens: int = 2048) -> ModelResponse:
        if not prompt or not prompt.strip():
            raise ModelError("prompt must be non-empty text")

        try:
            client = self._ensure_client()

            messages = [{"role": "user", "content": prompt}]
            tool_objs = None
            if tools:
                tool_objs = []
                for t in tools:
                    tool_objs.append({
                        "type": "function",
                        "function": {
                            "name": t["name"],
                            "description": t["description"],
                            "parameters": t.get("parameters", {"type": "object", "properties": {}})
                        }
                    })

            kwargs = {
                "model": self.model_id,
                "messages": messages,
                "max_tokens": max_output_tokens,
                "temperature": 0.1,
            }
            if tool_objs:
                kwargs["tools"] = tool_objs
                kwargs["tool_choice"] = "auto"

            response = client.chat.completions.create(**kwargs)

            choice = response.choices[0]
            text = choice.message.content or ""
            tool_calls = None

            if choice.message.tool_calls:
                tool_calls = []
                for tc in choice.message.tool_calls:
                    import json
                    tool_calls.append({
                        "name": tc.function.name,
                        "args": json.loads(tc.function.arguments) if isinstance(tc.function.arguments, str) else tc.function.arguments,
                        "call_id": tc.id
                    })

            usage = response.usage
            return ModelResponse(
                text=text.strip(),
                tool_calls=tool_calls,
                input_tokens=usage.prompt_tokens if usage else None,
                output_tokens=usage.completion_tokens if usage else None,
                total_tokens=usage.total_tokens if usage else None,
                model_id=self.model_id,
                finish_reason=choice.finish_reason,
            )
        except Exception as e:
            raise ModelError(f"Groq call failed: {e}") from e

    def get_tool_schemas(self) -> list[dict]:
        return [
            {"name": "list_files", "description": "List files in a directory, excluding noise dirs.", "parameters": {"type": "object", "properties": {"path": {"type": "string", "description": "Relative path from repo root", "default": "."}, "recursive": {"type": "boolean", "description": "Recurse into subdirectories", "default": False}}, "required": []}},
            {"name": "search_code", "description": "Search for regex pattern in files.", "parameters": {"type": "object", "properties": {"pattern": {"type": "string", "description": "Regex pattern to search"}, "path": {"type": "string", "description": "Relative path from repo root", "default": "."}, "max_results": {"type": "integer", "description": "Maximum matches to return", "default": 50}}, "required": ["pattern"]}},
            {"name": "read_file", "description": "Read a file's contents, optionally with line range.", "parameters": {"type": "object", "properties": {"path": {"type": "string", "description": "Relative path from repo root"}, "start_line": {"type": "integer", "description": "1-indexed start line", "default": 1}, "end_line": {"type": "integer", "description": "1-indexed end line (inclusive), 0 = to end", "default": 0}}, "required": ["path"]}},
            {"name": "edit_file", "description": "Create or overwrite a file.", "parameters": {"type": "object", "properties": {"path": {"type": "string", "description": "Relative path from repo root"}, "content": {"type": "string", "description": "New file content"}}, "required": ["path", "content"]}},
            {"name": "run_shell", "description": "Execute a shell command.", "parameters": {"type": "object", "properties": {"command": {"type": "string", "description": "Shell command to execute"}, "timeout": {"type": "integer", "description": "Timeout in seconds", "default": 60}}, "required": ["command"]}},
            {"name": "run_tests", "description": "Run the test suite.", "parameters": {"type": "object", "properties": {"command": {"type": "string", "description": "Optional override test command"}}, "required": []}},
        ]


class ModelAdapter:
    """Unified adapter - selects provider based on config."""

    def __init__(self, config) -> None:
        self.config = config
        self.provider = getattr(config, "provider", "gemini").lower()
        self.model_id = config.model_id

        if self.provider == "groq":
            api_key = os.environ.get("GROQ_API_KEY") or config.api_key
            self._adapter = GroqAdapter(api_key, self.model_id)
        else:
            self._adapter = GeminiAdapter(config.api_key, self.model_id)

    def generate(self, prompt: str, tools: list[dict] | None = None, max_output_tokens: int = 2048) -> ModelResponse:
        return self._adapter.generate(prompt, tools, max_output_tokens)

    def get_tool_schemas(self) -> list[dict]:
        return self._adapter.get_tool_schemas()