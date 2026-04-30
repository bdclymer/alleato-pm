"""
OpenAI helpers for the ingestion pipeline.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, List, Optional

from openai import OpenAI

from .models import DecisionItem, MeetingSegment, OpportunityItem, RiskItem, StructuredData, TaskItem

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "text-embedding-3-large"
EMBEDDING_DIMENSIONS = 3072  # text-embedding-3-large native dimensions
CHAT_MODEL = "gpt-4o-mini"
SEGMENT_TRANSCRIPT_MAX_CHARS = int(os.getenv("SEGMENT_TRANSCRIPT_MAX_CHARS", "0"))


def _provider_configs() -> List[Dict[str, str]]:
    providers: List[Dict[str, str]] = []
    gateway_key = os.getenv("AI_GATEWAY_API_KEY")
    if gateway_key:
        providers.append(
            {
                "name": "AI Gateway",
                "api_key": gateway_key,
                "base_url": "https://ai-gateway.vercel.sh/v1",
                "model_prefix": "openai/",
            }
        )
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        providers.append(
            {
                "name": "OpenAI direct",
                "api_key": openai_key,
                "base_url": "",
                "model_prefix": "",
            }
        )
    if not providers:
        raise RuntimeError("AI_GATEWAY_API_KEY or OPENAI_API_KEY is required for LLM calls")
    return providers


def _client(provider: Dict[str, str]) -> OpenAI:
    kwargs: Dict[str, str] = {"api_key": provider["api_key"]}
    if provider.get("base_url"):
        kwargs["base_url"] = provider["base_url"]
    return OpenAI(**kwargs)


def _model_for_provider(model: str, provider: Dict[str, str]) -> str:
    prefix = provider.get("model_prefix", "")
    if prefix and not model.startswith(prefix):
        return f"{prefix}{model}"
    return model


# ---------------------------------------------------------------------------
# Embeddings
# ---------------------------------------------------------------------------

def batch_embed(texts: List[str], model: str = EMBEDDING_MODEL) -> List[List[float]]:
    """Embed a batch of texts. Returns a list of embedding vectors."""
    if not texts:
        return []
    truncated = [t[:8000] for t in texts]
    logger.info("[LLM] Embedding %d texts with %s (dimensions=%d)", len(texts), model, EMBEDDING_DIMENSIONS)
    errors: List[str] = []
    for provider in _provider_configs():
        try:
            response = _client(provider).embeddings.create(
                model=_model_for_provider(model, provider),
                input=truncated,
                dimensions=EMBEDDING_DIMENSIONS,
            )
            embeddings = [item.embedding for item in response.data]
            if len(embeddings) != len(texts):
                raise RuntimeError(f"expected {len(texts)} embeddings, got {len(embeddings)}")
            logger.info("[LLM] Embedded %d texts via %s", len(texts), provider["name"])
            return embeddings
        except Exception as exc:
            message = f"{provider['name']}: {exc}"
            logger.error("[LLM] Embedding provider failed: %s", message)
            errors.append(message)
    raise RuntimeError("Embedding failed across all providers: " + " | ".join(errors))


# ---------------------------------------------------------------------------
# Chat completions
# ---------------------------------------------------------------------------

def _call_llm(prompt: str, json_mode: bool = False, max_tokens: Optional[int] = None) -> str:
    kwargs: Dict[str, Any] = {
        "model": CHAT_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
    }
    if max_tokens:
        kwargs["max_tokens"] = max_tokens

    logger.info("[LLM] Calling %s (json=%s)", CHAT_MODEL, json_mode)
    errors: List[str] = []
    for provider in _provider_configs():
        try:
            provider_kwargs = dict(kwargs)
            provider_kwargs["model"] = _model_for_provider(CHAT_MODEL, provider)
            if json_mode and provider["name"] != "AI Gateway":
                provider_kwargs["response_format"] = {"type": "json_object"}
            response = _client(provider).chat.completions.create(**provider_kwargs)
            return response.choices[0].message.content or ""
        except Exception as exc:
            message = f"{provider['name']}: {exc}"
            logger.error("[LLM] Chat provider failed: %s", message)
            errors.append(message)
    raise RuntimeError("Chat completion failed across all providers: " + " | ".join(errors))


# ---------------------------------------------------------------------------
# Meeting summary
# ---------------------------------------------------------------------------

def generate_meeting_summary(transcript_excerpt: str, title: str, existing_summary: str = "") -> str:
    prompt = f"""Generate a comprehensive executive summary of this meeting.

Meeting: {title}
{f"Existing Summary: {existing_summary}" if existing_summary else ""}

Transcript excerpt:
{transcript_excerpt[:12000]}

Write a 3-5 paragraph summary covering:
1. Meeting purpose and key participants
2. Main topics discussed
3. Key decisions and outcomes
4. Action items and next steps
5. Any risks or concerns raised

Be specific and include names, dates, and concrete details where mentioned."""

    return _call_llm(prompt)


# ---------------------------------------------------------------------------
# Transcript segmentation
# ---------------------------------------------------------------------------

def segment_transcript(
    formatted_transcript: str,
    title: str,
    max_chars: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Returns a list of segment dicts with title/start_index/end_index/summary/decisions/risks/tasks."""
    effective_max_chars = max_chars
    if effective_max_chars is None and SEGMENT_TRANSCRIPT_MAX_CHARS > 0:
        effective_max_chars = SEGMENT_TRANSCRIPT_MAX_CHARS

    transcript_for_prompt = formatted_transcript
    if (
        effective_max_chars is not None
        and len(formatted_transcript) > effective_max_chars
    ):
        logger.warning(
            "[LLM] segment_transcript input truncated from %d to %d chars",
            len(formatted_transcript),
            effective_max_chars,
        )
        transcript_for_prompt = formatted_transcript[:effective_max_chars]

    prompt = f"""Analyze this meeting transcript and identify distinct semantic segments (topic changes, agenda items, discussion phases).

Meeting: {title}

Transcript (each line prefixed with [index]):
{transcript_for_prompt}

Return JSON array of segments. Each segment should capture a coherent topic or discussion phase.

Required format:
{{
  "segments": [
    {{
      "title": "Brief descriptive title for this segment",
      "start_index": 0,
      "end_index": 15,
      "summary": "2-3 sentence summary of what was discussed",
      "decisions": ["Any decisions made in this segment"],
      "risks": ["Any risks or concerns raised"],
      "tasks": ["Any action items or tasks assigned"]
    }}
  ]
}}

Guidelines:
- Segments should be 10-50 lines typically
- Every line must belong to exactly one segment
- Capture natural topic transitions
- Include opening/closing segments if present
- Extract decisions, risks, tasks mentioned in each segment"""

    raw = _call_llm(prompt, json_mode=True)
    parsed = json.loads(raw)
    return parsed.get("segments", [])


# ---------------------------------------------------------------------------
# Structured data extraction
# ---------------------------------------------------------------------------

def extract_structured_data(
    title: str,
    date: Optional[str],
    participants: List[str],
    summary: str,
    raw_decisions: List[str],
    raw_risks: List[str],
    raw_tasks: List[str],
    notes_context: str = "",
    speaker_email_map: Optional[Dict[str, str]] = None,
) -> StructuredData:
    # Build speaker email mapping context for the prompt
    email_map_text = ""
    if speaker_email_map:
        mappings = [f"  {name} → {email}" for name, email in speaker_email_map.items()]
        email_map_text = f"\n\nSpeaker Email Mapping (use for assignee_email):\n" + "\n".join(mappings)

    notes_text = ""
    if notes_context:
        notes_text = f"\n\nAdditional Notes & Action Items from Meeting:\n{notes_context[:6000]}"

    prompt = f"""Analyze and normalize these meeting extractions. Deduplicate, add context, and identify opportunities.

Meeting: {title}
Date: {date or "Unknown"}
Participants: {", ".join(participants)}{email_map_text}

Raw Decisions: {json.dumps(raw_decisions)}
Raw Risks: {json.dumps(raw_risks)}
Raw Tasks: {json.dumps(raw_tasks)}{notes_text}

Meeting Summary: {summary[:2000]}

Return JSON with normalized, deduplicated entries:
{{
  "decisions": [
    {{"description": "Clear description", "rationale": "Why decided", "owner": "Person name or null"}}
  ],
  "risks": [
    {{"description": "Risk description", "category": "schedule|budget|resource|technical|external", "likelihood": "low|medium|high", "impact": "low|medium|high", "owner": "Person or null"}}
  ],
  "tasks": [
    {{"description": "Task description", "assignee": "Person name or null", "assigneeEmail": "email@example.com or null", "dueDate": "YYYY-MM-DD or null", "priority": "low|medium|high|urgent"}}
  ],
  "opportunities": [
    {{"description": "Opportunity description", "type": "efficiency|revenue|relationship|innovation", "owner": "Person or null"}}
  ]
}}

Guidelines:
- Deduplicate similar items across all sources (raw tasks AND the Notes/Action Items above)
- Extract tasks from BOTH the raw tasks AND the Notes/Action Items sections — do not miss any
- Infer owners from context when possible
- Convert vague items to specific actionable descriptions
- Map assignee names to emails using the Speaker Email Mapping above when available
- Priority rules:
  * "urgent" if health, safety, inspection, compliance, or hard deadline mentioned
  * "high" if financial impact > $10k or blocking other work
  * "medium" for standard follow-ups and action items
  * "low" for nice-to-haves and optional follow-ups
- Due date rules:
  * Calculate relative dates from the meeting date ({date or "Unknown"})
  * "by Friday" → next Friday from meeting date
  * "next week" → Monday of following week
  * "end of month" → last day of meeting month
  * "ASAP" → meeting date + 2 business days
  * If no date mentioned, leave as null
- Identify implied opportunities from discussion"""

    raw = _call_llm(prompt, json_mode=True)
    try:
        data = json.loads(raw)
    except Exception as exc:
        logger.warning("[LLM] Structured extraction returned non-JSON; continuing without extracted items: %s", exc)
        return StructuredData()

    # Resolve emails from map if LLM didn't set them
    _email_map = speaker_email_map or {}

    decisions = [
        DecisionItem(
            description=d.get("description", ""),
            rationale=d.get("rationale"),
            owner=d.get("owner"),
        )
        for d in data.get("decisions", [])
        if d.get("description")
    ]
    risks = [
        RiskItem(
            description=r.get("description", ""),
            category=r.get("category"),
            likelihood=r.get("likelihood"),
            impact=r.get("impact"),
            owner=r.get("owner"),
        )
        for r in data.get("risks", [])
        if r.get("description")
    ]
    tasks = []
    for t in data.get("tasks", []):
        if not t.get("description"):
            continue
        assignee = t.get("assignee")
        assignee_email = t.get("assigneeEmail")
        # Fallback: resolve email from map if LLM didn't provide one
        if not assignee_email and assignee and assignee in _email_map:
            assignee_email = _email_map[assignee]
        tasks.append(
            TaskItem(
                description=t.get("description", ""),
                assignee=assignee,
                assignee_email=assignee_email,
                due_date=_parse_date(t.get("dueDate")),
                priority=t.get("priority"),
            )
        )
    opportunities = [
        OpportunityItem(
            description=o.get("description", ""),
            type=o.get("type"),
            owner=o.get("owner"),
        )
        for o in data.get("opportunities", [])
        if o.get("description")
    ]

    return StructuredData(decisions=decisions, risks=risks, tasks=tasks, opportunities=opportunities)


# ---------------------------------------------------------------------------
# Meeting digest
# ---------------------------------------------------------------------------

def generate_meeting_digest(
    title: str,
    date: Optional[str],
    participants: List[str],
    summary: str,
    decisions: List[Dict[str, Any]],
    risks: List[Dict[str, Any]],
    tasks: List[Dict[str, Any]],
    opportunities: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Generate an executive post-meeting digest from structured data."""
    prompt = f"""Generate a concise executive digest for this meeting.

Meeting: {title}
Date: {date or "Unknown"}
Participants: {", ".join(participants)}

Summary: {summary[:2000]}

Decisions Made: {json.dumps(decisions[:20], default=str)}
Risks Identified: {json.dumps(risks[:20], default=str)}
Action Items: {json.dumps(tasks[:20], default=str)}
Opportunities: {json.dumps(opportunities[:10], default=str)}

Return JSON with:
{{
  "digest_text": "A 3-5 paragraph executive briefing covering what happened, \
what was decided, what needs attention, and what's next. Write for a busy \
executive who missed the meeting.",
  "decisions_summary": [
    {{"decision": "What was decided", "owner": "Who owns it", "impact": "Why it matters"}}
  ],
  "action_items_summary": [
    {{"action": "What needs to happen", "assignee": "Who", "due": "When if known"}}
  ],
  "risks_summary": [
    {{"risk": "What could go wrong", "severity": "high|medium|low", "mitigation": "Suggested action"}}
  ],
  "opportunities_summary": [
    {{"opportunity": "What could be leveraged", "type": "efficiency|revenue|relationship"}}
  ],
  "follow_ups": [
    {{"item": "What needs follow-up before next meeting", "owner": "Who should drive it"}}
  ],
  "key_takeaways": ["Top 3-5 bullet points a PM must know from this meeting"]
}}

Be specific. Use actual names and details from the meeting data."""

    raw = _call_llm(prompt, json_mode=True)
    return json.loads(raw)


def _parse_date(raw: Optional[str]) -> Optional[str]:
    """Return a valid YYYY-MM-DD string or None."""
    if not raw:
        return None
    import re
    from datetime import datetime
    if re.match(r"^\d{4}-\d{2}-\d{2}$", raw):
        try:
            datetime.strptime(raw, "%Y-%m-%d")
            return raw
        except ValueError:
            pass
    try:
        return datetime.fromisoformat(raw).strftime("%Y-%m-%d")
    except (ValueError, OverflowError):
        return None
