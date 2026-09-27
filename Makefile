.PHONY: setup run test clean tui

# Python and pip
PYTHON := python3
PIP := $(PYTHON) -m pip

setup:
	PIP_BREAK_SYSTEM_PACKAGES=1 $(PIP) install --upgrade pip
	PIP_BREAK_SYSTEM_PACKAGES=1 $(PIP) install -r requirements.txt

# Standard CLI run
run:
	@if [ -z "$$GEMINI_API_KEY" ] && [ -z "$$GROQ_API_KEY" ] && [ -z "$$AI_API_KEY" ]; then \
		echo "ERROR: No API key set. Export one of: GEMINI_API_KEY, GROQ_API_KEY, or AI_API_KEY"; \
		exit 1; \
	fi
	$(PYTHON) -m harness "$(filter-out $@,$(MAKECMDGOALS))"

# Allow passing issue as argument: make run "my issue"
%:
	@:

# TUI (interactive terminal UI)
tui:
	@if [ -z "$$GEMINI_API_KEY" ] && [ -z "$$GROQ_API_KEY" ] && [ -z "$$AI_API_KEY" ]; then \
		echo "WARNING: No API key set. You can enter it interactively in the TUI."; \
	fi
	./harness/bin/harness-tui

test:
	$(PYTHON) -m pytest tests -q

clean:
	rm -f telemetry.jsonl report.md report_summary.json
	rm -rf __pycache__ harness/__pycache__ harness/tools/__pycache__ harness/telemetry/__pycache__ harness/recovery/__pycache__ harness/context/__pycache__ tests/__pycache__
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete
	find . -name "*.pyo" -delete