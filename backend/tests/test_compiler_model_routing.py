"""Guardrail tests for intelligence-compiler model routing / cost control.

Context (2026-06-17): source-by-source signal extraction must not run on the
frontier model. Task/risk/urgent/change-order extraction routes to the cheaper
`COMPILER_MODEL_LIGHT` tier, while rolling project-intelligence synthesis keeps
the larger `COMPILER_MODEL`. These tests pin that routing so it cannot silently
regress back to the expensive model.
"""
import importlib

from src.services.pipeline import config as config_mod
from src.services.intelligence import client as client_mod


def test_compiler_models_are_env_configurable(monkeypatch):
    monkeypatch.setenv("COMPILER_MODEL", "gpt-5.9")
    monkeypatch.setenv("COMPILER_MODEL_LIGHT", "gpt-4.1-nano")
    importlib.reload(config_mod)
    reloaded = importlib.reload(client_mod)
    try:
        assert reloaded.COMPILER_MODEL == "gpt-5.9"
        assert reloaded.COMPILER_MODEL_LIGHT == "gpt-4.1-nano"
    finally:
        monkeypatch.delenv("COMPILER_MODEL", raising=False)
        monkeypatch.delenv("COMPILER_MODEL_LIGHT", raising=False)
        importlib.reload(config_mod)
        importlib.reload(client_mod)


def test_default_models_are_a_frontier_and_a_mini_tier():
    # Project-intelligence synthesis uses the larger configured GPT-5 model.
    assert client_mod.COMPILER_MODEL == "gpt-5.4"
    # Source signal extraction must stay on a cheaper, distinct model.
    assert client_mod.COMPILER_MODEL_LIGHT != client_mod.COMPILER_MODEL
    assert "mini" in client_mod.COMPILER_MODEL_LIGHT or "nano" in client_mod.COMPILER_MODEL_LIGHT
