"""Contextual Retrieval — build document-level context for each chunk.

Anthropic's [Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval)
technique, ported to OpenAI models. Two flavors:

1. **Template header** — deterministic, free, prepended to every chunk. Uses
   the metadata that's already on the chunk row.
2. **LLM-generated context** — calls `gpt-4.1-nano` with the full source
   document up front (so OpenAI's automatic prompt caching keeps it hot across
   all chunks of the document) and asks for a 50-100 token blurb that situates
   the chunk in the document.

The pilot backfill in `scripts/backfill_contextual_embeddings.py` uses these
helpers. Once the technique is validated, wire `build_contextualized_text` into
`embedder.py` between `_chunk_segment` and `batch_embed`.

Cost characteristics (`gpt-4.1-nano`, automatic prompt caching, late 2026):
- input: $0.10 / 1M tokens
- cached input: $0.025 / 1M tokens (75% off)
- output: $0.40 / 1M tokens
Cache requires the prefix to be ≥1024 tokens, so emails / short docs don't
benefit — but their input cost is also tiny.
"""

from __future__ import annotations

import logging
import os
from typing import Iterable

from openai import OpenAI

from ..ai_transport import retry_ai_call

logger = logging.getLogger(__name__)

CONTEXT_MODEL = os.getenv("CONTEXTUAL_RETRIEVAL_MODEL", "gpt-4.1-nano")
CONTEXT_MAX_OUTPUT_TOKENS = 120

# Source types where the LLM-generated context adds the most lift. Meeting
# summaries / segment summaries / sections already encode document context by
# construction — skip the LLM for those (template-only is enough).
LLM_CONTEXT_SOURCE_TYPES: frozenset[str] = frozenset(
    {
        "meeting_transcript",
        "email",
        "teams_dm",
        "teams_channel",
        "onedrive_document",
        "document",
    }
)

_CONTEXT_PROMPT = """\
<document>
{document_text}
</document>

Here is the chunk we want to situate within the whole document:
<chunk>
{chunk_text}
</chunk>

Give a short (50-100 token) succinct context to situate this chunk within the
overall document for the purposes of improving search retrieval of the chunk.
Mention specific entities (project name, vendor, RFI/PO numbers, decisions,
participants) referenced in the chunk or the surrounding document context.
Answer only with the succinct context — no preamble, no quotes, no bullet points.
"""


def build_template_header(
    *,
    title: str | None,
    file_date: str | None,
    project_id: int | str | None,
    source_type: str | None,
    participants: Iterable[str] | None = None,
    extra: dict[str, str] | None = None,
) -> str:
    """Build the deterministic context header from existing chunk metadata.

    Returns an empty string when no useful metadata exists, so callers can
    safely concatenate without a separator branch.
    """
    lines: list[str] = []
    if title:
        lines.append(f"Document: {title}")
    if file_date:
        lines.append(f"Date: {str(file_date)[:10]}")
    if project_id not in (None, "", 0):
        lines.append(f"Project: {project_id}")
    if source_type:
        lines.append(f"Source: {source_type}")
    if participants:
        # Cap to keep header bounded; participants can be very long for big channels
        names = [p for p in participants if p][:8]
        if names:
            lines.append("Participants: " + ", ".join(names))
    for k, v in (extra or {}).items():
        if v:
            lines.append(f"{k}: {v}")
    if not lines:
        return ""
    return "[" + "]\n[".join(lines) + "]"


_openai_client: OpenAI | None = None


def _client() -> OpenAI:
    global _openai_client
    if _openai_client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError(
                "OPENAI_API_KEY is required for LLM-generated context. "
                "Set it or pass --no-llm to the backfill script."
            )
        _openai_client = OpenAI(api_key=api_key)
    return _openai_client


def generate_llm_context(
    *,
    document_text: str,
    chunk_text: str,
    model: str = CONTEXT_MODEL,
) -> tuple[str, dict[str, int]]:
    """Generate a 50-100 token contextual blurb for the chunk.

    Document text is placed first in the prompt so OpenAI's automatic prompt
    cache keys off it. Run all chunks of one document back-to-back to keep the
    cache warm (TTL ~5-10 min).

    Returns (context_text, usage_dict). usage_dict has 'prompt_tokens',
    'completion_tokens', 'cached_tokens' (0 if not reported).
    """
    prompt = _CONTEXT_PROMPT.format(
        document_text=document_text[:120_000],  # cap to stay well under model context
        chunk_text=chunk_text[:8_000],
    )

    def _call():
        return _client().chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=CONTEXT_MAX_OUTPUT_TOKENS,
        )

    response = retry_ai_call(
        _call,
        provider_name="OpenAI",
        operation="contextual retrieval context generation",
    )
    text = (response.choices[0].message.content or "").strip()

    usage = {
        "prompt_tokens": getattr(response.usage, "prompt_tokens", 0) or 0,
        "completion_tokens": getattr(response.usage, "completion_tokens", 0) or 0,
        "cached_tokens": 0,
    }
    details = getattr(response.usage, "prompt_tokens_details", None)
    if details is not None:
        usage["cached_tokens"] = getattr(details, "cached_tokens", 0) or 0

    return text, usage


def build_contextualized_text(
    *,
    chunk_text: str,
    template_header: str,
    llm_context: str | None = None,
) -> str:
    """Compose the final text that gets embedded.

    Layout (any empty section is omitted):
        {template_header}

        Context: {llm_context}

        {chunk_text}
    """
    parts: list[str] = []
    if template_header:
        parts.append(template_header)
    if llm_context:
        parts.append(f"Context: {llm_context}")
    parts.append(chunk_text)
    return "\n\n".join(parts)
