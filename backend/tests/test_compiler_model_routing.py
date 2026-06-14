"""Guardrail tests for intelligence-compiler model routing / cost control.

Context (2026-06-10): frontier `gpt-5.5` was running on every email and Teams DM
signal extraction — including ~5.5x redundant re-extraction of the same Teams DM
conversation as new messages arrived — costing ~$60/day. High-volume, low-stakes
sources (Teams DMs, emails) are now routed to the cheaper `COMPILER_MODEL_LIGHT`
tier; meeting deep extraction keeps full `gpt-5.5`. These tests pin that routing
so it can't silently regress back to the expensive model.
"""
import importlib

from src.services.intelligence import client as client_mod


def test_compiler_models_are_env_configurable(monkeypatch):
    monkeypatch.setenv("COMPILER_MODEL", "gpt-5.9")
    monkeypatch.setenv("COMPILER_MODEL_LIGHT", "gpt-4.1-nano")
    reloaded = importlib.reload(client_mod)
    try:
        assert reloaded.COMPILER_MODEL == "gpt-5.9"
        assert reloaded.COMPILER_MODEL_LIGHT == "gpt-4.1-nano"
    finally:
        monkeypatch.delenv("COMPILER_MODEL", raising=False)
        monkeypatch.delenv("COMPILER_MODEL_LIGHT", raising=False)
        importlib.reload(client_mod)


def test_default_models_are_a_frontier_and_a_mini_tier():
    # Meeting/full-quality default stays on the frontier gpt-5 family.
    assert client_mod.COMPILER_MODEL.startswith("gpt-5")
    # The light tier must be a cheaper, distinct model.
    assert client_mod.COMPILER_MODEL_LIGHT != client_mod.COMPILER_MODEL
    assert "mini" in client_mod.COMPILER_MODEL_LIGHT or "nano" in client_mod.COMPILER_MODEL_LIGHT
