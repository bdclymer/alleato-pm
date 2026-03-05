"""
RAG ingestion pipeline — pure Python, runs inside the FastAPI backend.

Stages:
  1a. parser.py          — parse Fireflies markdown, LLM semantic segmentation
  1b. document_parser.py — parse PDF/DOCX/text documents, LLM semantic segmentation
  2.  embedder.py        — chunk + embed with OpenAI text-embedding-3-small
  3.  extractor.py       — LLM structured extraction (decisions/risks/tasks/opportunities)

Entry point:
  orchestrator.run_full_pipeline(metadata_id)
  (automatically detects meeting vs document and routes to 1a or 1b)
"""

from .orchestrator import run_full_pipeline
from .parser import run_parser
from .document_parser import run_document_parser
from .embedder import run_embedder
from .extractor import run_extractor

__all__ = [
    "run_full_pipeline",
    "run_parser",
    "run_document_parser",
    "run_embedder",
    "run_extractor",
]
