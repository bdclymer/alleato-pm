"""Guardrails for Alleato AI prompt composition."""

from __future__ import annotations

from src.services.agents.alleato_ai_tools.prompts import ORCHESTRATOR_PROMPT


def test_orchestrator_prompt_includes_identity_soul_user_context_and_workflow():
    assert "# Identity" in ORCHESTRATOR_PROMPT
    assert "# Soul" in ORCHESTRATOR_PROMPT
    assert "# User And Team Context" in ORCHESTRATOR_PROMPT
    assert "# How you work" in ORCHESTRATOR_PROMPT


def test_orchestrator_prompt_keeps_brandon_first_user_context():
    assert "The primary human context for now is Brandon." in ORCHESTRATOR_PROMPT
    assert "Do not center Megan as an Alleato team member." in ORCHESTRATOR_PROMPT
    assert "When Brandon is the user, speak as a trusted right hand" in ORCHESTRATOR_PROMPT
