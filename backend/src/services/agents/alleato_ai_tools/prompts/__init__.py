"""Prompt composition.

Prompts are authored as plain markdown files in this directory so they can be edited
without touching Python and reviewed as small, focused diffs. This module loads and
composes them into the constants the rest of the codebase imports:

- `ORCHESTRATOR_PROMPT` = identity.md + soul.md + orchestrator.md
- `FINANCIAL_ANALYST_PROMPT` = financial_analyst.md + _subagent_output_rule.md
- `SCHEDULE_ANALYST_PROMPT`  = schedule_analyst.md  + _subagent_output_rule.md
- `RISK_ANALYST_PROMPT`      = risk_analyst.md      + _subagent_output_rule.md
- `COMMUNICATIONS_ANALYST_PROMPT` = communications_analyst.md + _subagent_output_rule.md

Editing rules:
- Tweak voice → edit `soul.md`.
- Tweak who-the-agent-is → edit `identity.md`.
- Tweak routing / answer contract / tool ladder → edit `orchestrator.md`.
- Tweak the structured-packet contract every sub-agent honors → edit `_subagent_output_rule.md`.
- Tweak a single sub-agent's domain knowledge → edit that one `<name>_analyst.md`.

The C-suite framing from alleato-pm was deliberately dropped — sub-agents are organized
by investigation domain, not executive title. See HANDOFF.md § "What's reusable from
alleato-pm" for the rationale.
"""

from __future__ import annotations

from pathlib import Path

_HERE = Path(__file__).parent


def _read(name: str) -> str:
    return (_HERE / name).read_text(encoding="utf-8").strip()


def _compose(*parts: str) -> str:
    return "\n\n".join(p for p in parts if p)


_IDENTITY = _read("identity.md")
_SOUL = _read("soul.md")
_ORCHESTRATOR_BODY = _read("orchestrator.md")
_SUBAGENT_OUTPUT_RULE = _read("_subagent_output_rule.md")


ORCHESTRATOR_PROMPT = _compose(_IDENTITY, _SOUL, _ORCHESTRATOR_BODY)

FINANCIAL_ANALYST_PROMPT = _compose(_read("financial_analyst.md"), _SUBAGENT_OUTPUT_RULE)
SCHEDULE_ANALYST_PROMPT = _compose(_read("schedule_analyst.md"), _SUBAGENT_OUTPUT_RULE)
RISK_ANALYST_PROMPT = _compose(_read("risk_analyst.md"), _SUBAGENT_OUTPUT_RULE)
COMMUNICATIONS_ANALYST_PROMPT = _compose(
    _read("communications_analyst.md"), _SUBAGENT_OUTPUT_RULE
)


__all__ = [
    "ORCHESTRATOR_PROMPT",
    "FINANCIAL_ANALYST_PROMPT",
    "SCHEDULE_ANALYST_PROMPT",
    "RISK_ANALYST_PROMPT",
    "COMMUNICATIONS_ANALYST_PROMPT",
]
