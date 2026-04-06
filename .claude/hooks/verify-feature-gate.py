#!/usr/bin/env python3
"""
verify-feature-gate.py — PreToolUse hook for Bash commands.

Blocks `agent-browser` invocations when a verify-feature session is in
progress (i.e., a verify-output/<feature>/ directory exists) but the
required success-criteria.md file has not been written yet.

This enforces Phase 2 of the verify-feature skill: define expected
behavior BEFORE opening the browser, so that any divergence found during
testing can be measured against documented intent rather than guessed at.

The hook fails closed: if the criteria file is missing, exit 2 with a
clear instruction telling the agent what to write and where.
"""
import sys
import json
import os
import glob


def main() -> int:
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0

    command = data.get("command", "")
    if "agent-browser" not in command:
        return 0

    # Find verify-output session directories (relative to cwd or repo root)
    candidate_roots = [
        "verify-output",
        "/Users/meganharrison/Documents/alleato-pm/verify-output",
    ]
    session_dirs: list[str] = []
    for root in candidate_roots:
        if os.path.isdir(root):
            for entry in os.listdir(root):
                full = os.path.join(root, entry)
                if os.path.isdir(full):
                    session_dirs.append(full)

    if not session_dirs:
        # No verify session active — agent-browser is being used for
        # something else. Allow.
        return 0

    # Find the most recently modified session dir — that's the active one
    latest = max(session_dirs, key=os.path.getmtime)
    criteria_file = os.path.join(latest, "success-criteria.md")

    if os.path.exists(criteria_file):
        return 0

    feature = os.path.basename(latest.rstrip("/"))
    msg = f"""BLOCKED by verify-feature-gate hook.

You are running agent-browser inside an active verify-feature session
({feature}), but {criteria_file} does not exist.

Phase 2 of the verify-feature skill REQUIRES you to write down the
expected behavior of every flow and field BEFORE opening the browser.
This is what stops you from labeling correct system behavior as a
\"critical bug\" because it didn't match your assumption.

To proceed:

1. Write {criteria_file} containing, for each flow and sub-feature:
   - Action: what the user does
   - Expected outcome: specific observable result
   - For each form field: input vs derived/calculated, source of truth,
     whether the field is editable, what the saved DB value should be
   - DB check: SQL that verifies every field
   - Quality bar: what distinguishes pass from fail

2. If you don't know the intended behavior, spawn a research agent to
   document it from the codebase, Procore manifests, or PRPs FIRST.
   Do not guess.

3. Only after the file exists, retry the agent-browser command.

Skipping this step on 2026-04-06 produced false-positive bug reports
about non-committed cost (it's a derived field, not user input) — the
exact failure mode this gate prevents.
"""
    print(msg, file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
