"""Guardrails for Alleato AI prompt composition."""

from __future__ import annotations

from src.services.agents.alleato_ai_tools.prompts import ORCHESTRATOR_PROMPT


def test_orchestrator_prompt_composes_context_in_expected_order():
    identity_index = ORCHESTRATOR_PROMPT.index("# Identity")
    soul_index = ORCHESTRATOR_PROMPT.index("# Soul")
    user_index = ORCHESTRATOR_PROMPT.index("# User And Team Context")
    workflow_index = ORCHESTRATOR_PROMPT.index("# How you work")

    assert identity_index < soul_index < user_index < workflow_index


def test_orchestrator_prompt_includes_identity_soul_user_context_and_workflow():
    assert "# Identity" in ORCHESTRATOR_PROMPT
    assert "# Soul" in ORCHESTRATOR_PROMPT
    assert "# User And Team Context" in ORCHESTRATOR_PROMPT
    assert "# How you work" in ORCHESTRATOR_PROMPT


def test_orchestrator_prompt_keeps_brandon_first_user_context():
    assert "The primary human context for now is Brandon." in ORCHESTRATOR_PROMPT
    assert "Do not center Megan as an Alleato team member." in ORCHESTRATOR_PROMPT
    assert "When Brandon is the user, speak as a trusted right hand" in ORCHESTRATOR_PROMPT


def test_orchestrator_prompt_calibrates_direct_without_woo_woo_voice():
    assert "Your intensity should match the moment" in ORCHESTRATOR_PROMPT
    assert "Do not confuse spirituality with spiritual vocabulary." in ORCHESTRATOR_PROMPT
    assert "The deeper philosophy should show up as courage, service, discipline" in ORCHESTRATOR_PROMPT
    assert "Do not talk like a spiritual coach." in ORCHESTRATOR_PROMPT


def test_orchestrator_prompt_encodes_brandon_decision_pattern():
    assert "assume he is trying to make a decision or reduce risk" in ORCHESTRATOR_PROMPT
    assert "The read: what is actually going on." in ORCHESTRATOR_PROMPT
    assert "The move: who should do what next." in ORCHESTRATOR_PROMPT


def test_orchestrator_prompt_preserves_final_response_filter_and_profile_expansion_rules():
    assert "Before answering, run the response through this filter" in ORCHESTRATOR_PROMPT
    assert "If something is failing, did it fail loudly enough for the team to act?" in ORCHESTRATOR_PROMPT
    assert "This file should grow from lived context, not assumptions." in ORCHESTRATOR_PROMPT
    assert "Add future team profiles only when there is enough evidence" in ORCHESTRATOR_PROMPT


def test_orchestrator_prompt_preserves_anti_drift_contract():
    assert "The agent should never slowly slide back into generic assistant behavior." in ORCHESTRATOR_PROMPT
    assert "clear read, real evidence, practical implication, next move" in ORCHESTRATOR_PROMPT
    assert "Most of his questions should be treated as decision-support requests." in ORCHESTRATOR_PROMPT


def test_orchestrator_prompt_excludes_performative_spiritual_jargon():
    forbidden_terms = [
        "higher vibration",
        "manifest",
        "manifestation",
        "abundance mindset",
        "divine masculine",
        "sacred business",
        "soul-led",
        "healing journey",
    ]
    prompt = ORCHESTRATOR_PROMPT.lower()

    for term in forbidden_terms:
        assert term not in prompt
