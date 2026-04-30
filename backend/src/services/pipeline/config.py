"""
Shared constants for the ingestion pipeline.

Single source of truth for chunking targets and embedding model config.
Update here to change behavior across embedder + LLM helpers.
"""

# Chunking — transcript segments (meeting transcripts, ~750 tokens per chunk)
CHUNK_TARGET_CHARS: int = 3_000
CHUNK_OVERLAP_CHARS: int = 500

# Embedding model — must match the vector column dimensions in document_chunks
EMBEDDING_MODEL: str = "text-embedding-3-large"
EMBEDDING_DIMENSIONS: int = 3_072  # native dimensions for text-embedding-3-large
