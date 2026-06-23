"""
Shared constants for the ingestion pipeline.

Single source of truth for chunking targets, embedding config, and model
routing. Update here to change behavior across embedder + LLM helpers.
"""

from __future__ import annotations

import os


def _env_first(*names: str, default: str) -> str:
    for name in names:
        value = os.getenv(name)
        if value:
            return value
    return default


def _bare_openai_model_id(value: str) -> str:
    return value.removeprefix("openai:")


# Chunking — transcript segments (meeting transcripts, ~750 tokens per chunk)
CHUNK_TARGET_CHARS: int = 3_000
CHUNK_OVERLAP_CHARS: int = 500

# Embedding model — must match the vector column dimensions in document_chunks
EMBEDDING_MODEL: str = "text-embedding-3-large"
EMBEDDING_DIMENSIONS: int = 3_072  # native dimensions for text-embedding-3-large

# Pipeline model routing. Backward-compatible legacy env names remain supported
# so Render can roll forward without requiring an immediate env migration.
MODEL_PROJECT_ASSIGNMENT: str = _env_first(
    "PIPELINE_MODEL_PROJECT_ASSIGNMENT",
    default="gpt-5.4-nano",
)
MODEL_TEXT_CLEANUP: str = _env_first(
    "PIPELINE_MODEL_TEXT_CLEANUP",
    default="gpt-5.4-nano",
)
MODEL_SIGNAL_EXTRACTION_TARGET: str = _env_first(
    "PIPELINE_MODEL_SIGNAL_EXTRACTION_TARGET",
    default="gpt-5.4-mini",
)
MODEL_SIGNAL_EXTRACTION: str = _env_first(
    "PIPELINE_MODEL_SIGNAL_EXTRACTION",
    "COMPILER_MODEL_LIGHT",
    default="gpt-5.4-mini",
)
MODEL_PROJECT_INTELLIGENCE: str = _env_first(
    "PIPELINE_MODEL_PROJECT_INTELLIGENCE",
    "COMPILER_MODEL",
    default="gpt-5.4",
)
MODEL_BRANDON_EMAIL: str = _bare_openai_model_id(
    _env_first(
        "PIPELINE_MODEL_BRANDON_EMAIL",
        "DEEP_AGENTS_MICROSOFT_EXECUTIVE_ASSISTANT_MODEL",
        default="gpt-5.5",
    )
)
MODEL_DAILY_BRIEF: str = _env_first(
    "PIPELINE_MODEL_DAILY_BRIEF",
    default="gpt-5.5",
)
MODEL_ASSISTANT: str = _env_first(
    "PIPELINE_MODEL_ASSISTANT",
    default="gpt-5.5",
)
