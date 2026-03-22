"""
═══════════════════════════════════════════════════════════════════════════
EMBEDDINGS - Vector Generation for Semantic Search
═══════════════════════════════════════════════════════════════════════════

ROLE: Converts text queries into 1536-dimensional vectors for pgvector similarity search

CONTROLS:
- get_query_embedding_async() → Generates embedding for a user query using OpenAI

MODEL: text-embedding-3-large (1536 dimensions, truncated from native 3072)
- Same model used during document ingestion for consistency
- Using full 3072 dimensions for maximum quality
- Async implementation for non-blocking API calls

FLOW:
1. Receives text query from vector_search tools
2. Calls OpenAI embeddings API asynchronously
3. Returns float array of 1536 dimensions
4. Vector used in Supabase RPC functions (search_document_chunks, search_all_knowledge)

USED BY:
- vector_search.py (all search functions call this before RPC queries)
- Ensures query embeddings match document embeddings in database

ERROR HANDLING: Returns empty list [] on failure (caught by vector_search tools)

═══════════════════════════════════════════════════════════════════════════
"""

import os
from typing import List
from openai import AsyncOpenAI


async def get_query_embedding_async(query: str) -> List[float]:
    """
    Generate embedding for a search query using OpenAI (async).

    Args:
        query: The text to generate an embedding for.

    Returns:
        List of floats representing the 1536-dimensional embedding vector.
        Returns empty list on error.
    """
    try:
        client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        response = await client.embeddings.create(
            model="text-embedding-3-large",
            input=query,
            dimensions=3072,
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return []


def create_embedding_text(segment: dict) -> str:
    """
    Create the text to embed from a segment's data.

    Args:
        segment: Dictionary containing segment data with 'title' and 'summary' keys.

    Returns:
        Formatted text string for embedding.
    """
    parts = []

    if segment.get('title'):
        parts.append(f"Topic: {segment['title']}")

    if segment.get('summary'):
        parts.append(segment['summary'])

    return "\n".join(parts)
