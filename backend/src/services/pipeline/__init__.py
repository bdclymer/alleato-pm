"""
RAG ingestion pipeline — pure Python, runs inside the FastAPI backend.

Stages:
  1a. parser.py          — parse Fireflies markdown, LLM semantic segmentation
  1b. document_parser.py — parse PDF/DOCX/text documents, LLM semantic segmentation
  1c. financial_parser.py — parse CSV/XLS(X) docs to structured rows + sections
  2.  embedder.py        — chunk + embed with OpenAI text-embedding-3-large
  3.  extractor.py       — LLM structured extraction (decisions/risks/tasks/opportunities)

Entry point:
  orchestrator.run_full_pipeline(metadata_id)
  (automatically detects meeting vs document and routes to 1a or 1b)
"""

__all__ = [
    "run_full_pipeline",
    "run_parser",
    "run_document_parser",
    "run_financial_parser",
    "run_embedder",
    "run_extractor",
]


def __getattr__(name):
    """Lazy pipeline exports avoid circular imports during backend startup."""
    if name == "run_full_pipeline":
        from .orchestrator import run_full_pipeline

        return run_full_pipeline
    if name == "run_parser":
        from .parser import run_parser

        return run_parser
    if name == "run_document_parser":
        from .document_parser import run_document_parser

        return run_document_parser
    if name == "run_financial_parser":
        from .financial_parser import run_financial_parser

        return run_financial_parser
    if name == "run_embedder":
        from .embedder import run_embedder

        return run_embedder
    if name == "run_extractor":
        from .extractor import run_extractor

        return run_extractor
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
