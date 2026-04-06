#!/usr/bin/env python3
"""
verify-feature-gate.py — PreToolUse hook for verify-feature skill enforcement.

Two gates, both fail-closed (exit 2 with instructions):

GATE 1 — agent-browser blocked unless success-criteria.md exists.
  Phase 2 of the skill requires documenting expected behavior BEFORE
  testing. Without this, divergences get mislabeled as "critical bugs"
  when they're actually correct system behavior (the non-committed-cost
  false positive on 2026-04-06 was caused by this).

GATE 2 — Writing/editing report.md in verify-output/ blocked unless
videos/ contains at least one .webm recording.
  The skill requires per-flow video evidence in Phase 4. Reports without
  video evidence cannot be reviewed by the user, and the pattern of
  "wrote a report, no evidence to back it up" repeated across two
  consecutive verification runs.

Both gates inspect the tool input, find the most recently modified
verify-output session directory, and check the relevant deliverable.
If the gate condition is not met, exit 2 with a clear instruction.
"""
import sys
import json
import os


def find_active_session() -> str | None:
    """Return the most recently modified verify-output/<feature>/ dir, or None."""
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
        return None
    return max(session_dirs, key=os.path.getmtime)


def gate_1_browser_requires_criteria(command: str) -> int:
    """Block agent-browser commands until success-criteria.md exists."""
    if "agent-browser" not in command:
        return 0

    session = find_active_session()
    if not session:
        return 0  # No active session, allow

    criteria_file = os.path.join(session, "success-criteria.md")
    if os.path.exists(criteria_file):
        return 0

    feature = os.path.basename(session.rstrip("/"))
    msg = f"""BLOCKED by verify-feature-gate hook (GATE 1: criteria).

You are running agent-browser inside an active verify-feature session
({feature}), but {criteria_file} does not exist.

Phase 2 of the verify-feature skill REQUIRES you to write down the
expected behavior of every flow and field BEFORE opening the browser.
This is what stops you from labeling correct system behavior as a
"critical bug" because it didn't match your assumption.

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


def gate_2_report_requires_videos(file_path: str) -> int:
    """Block writing/editing report.md until videos/ contains at least one .webm."""
    if not file_path:
        return 0

    # Only intercept files inside verify-output/<feature>/ named report.md
    abs_path = os.path.abspath(file_path)
    if "verify-output" not in abs_path or not abs_path.endswith("report.md"):
        return 0

    # The session dir is the parent of report.md
    session = os.path.dirname(abs_path)
    videos_dir = os.path.join(session, "videos")

    has_videos = (
        os.path.isdir(videos_dir)
        and any(f.endswith(".webm") for f in os.listdir(videos_dir))
    )
    if has_videos:
        return 0

    feature = os.path.basename(session.rstrip("/"))
    msg = f"""BLOCKED by verify-feature-gate hook (GATE 2: video evidence).

You are about to write {abs_path}, but {videos_dir} contains no .webm
recordings.

Phase 4 of the verify-feature skill REQUIRES per-flow video evidence:

  agent-browser --session <S> record start <session>/videos/<flow>.webm
  ... do the flow at speed using `fill` (not `type`) ...
  agent-browser --session <S> record stop

Reports without video evidence cannot be reviewed by the user, and the
pattern of "wrote a report, no evidence to back it up" repeated across
two consecutive verification runs on this feature ({feature}).

To proceed:

1. Reopen the browser session if needed
2. For each user flow you tested, record a clean run end-to-end:
   - record start videos/<flow-slug>.webm
   - perform the flow with realistic data (use fill, not type)
   - record stop
3. Confirm at least one .webm exists in {videos_dir}
4. Then retry the report write

If a flow can ONLY be exercised via direct API/SQL (e.g., the form is
broken and you had to bypass it), record at least a 5-second video of
the result page proving the outcome — even a static screenshot of the
final state is better than no evidence.
"""
    print(msg, file=sys.stderr)
    return 2


def main() -> int:
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0

    # Bash tool: check command for agent-browser (GATE 1)
    if "command" in data:
        return gate_1_browser_requires_criteria(data.get("command", ""))

    # Write/Edit tool: check file_path for report.md (GATE 2)
    if "file_path" in data:
        return gate_2_report_requires_videos(data.get("file_path", ""))

    return 0


if __name__ == "__main__":
    sys.exit(main())
