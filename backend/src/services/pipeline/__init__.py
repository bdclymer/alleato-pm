"""
RAG ingestion pipeline — pure Python, runs inside the FastAPI backend.

Stages:
  1. parser.py     — parse Fireflies markdown, LLM semantic segmentation
  2. embedder.py   — chunk + embed with OpenAI text-embedding-3-small
  3. extractor.py  — LLM structured extraction (decisions/risks/tasks/opportunities)

Entry point:
  orchestrator.run_full_pipeline(metadata_id)
"""

from .orchestrator import run_full_pipeline
from .parser import run_parser
from .embedder import run_embedder
from .extractor import run_extractor

__all__ = ["run_full_pipeline", "run_parser", "run_embedder", "run_extractor"]
