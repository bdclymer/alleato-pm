"""
OpenAI helpers for the ingestion pipeline.
Ported from backend/src/workers/shared/openai.ts.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, List, Optional

from openai import OpenAI

from .models import DecisionItem, MeetingSegment, OpportunityItem, RiskItem, StructuredData, TaskItem

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "text-embedding-3-small"
CHAT_MODEL = "gpt-4o-mini"


def _client() -> OpenAI:
    return OpenAI(api_key=os.environ["OPENAI_API_KEY"])


# ---------------------------------------------------------------------------
# Embeddings
# ---------------------------------------------------------------------------

def batch_embed(texts: List[str], model: str = EMBEDDING_MODEL) -> List[List[float]]:
    """Embed a batch of texts. Returns a list of embedding vectors."""
    if not texts:
        return []
    truncated = [t[:8000] for t in texts]
    logger.info("[LLM] Embedding %d texts with %s", len(texts), model)
    response = _client().embeddings.create(model=model, input=truncated)
    return [item.embedding for item in response.data]


# ---------------------------------------------------------------------------
# Chat completions
# ---------------------------------------------------------------------------

def _call_llm(prompt: str, json_mode: bool = False, max_tokens: Optional[int] = None) -> str:
    kwargs: Dict[str, Any] = {
        "model": CHAT_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    if max_tokens:
        kwargs["max_tokens"] = max_tokens

    logger.info("[LLM] Calling %s (json=%s)", CHAT_MODEL, json_mode)
    response = _client().chat.completions.create(**kwargs)
    return response.choices[0].message.content or ""


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

def segment_transcript(formatted_transcript: str, title: str) -> List[Dict[str, Any]]:
    """Returns a list of segment dicts with title/start_index/end_index/summary/decisions/risks/tasks."""
    prompt = f"""Analyze this meeting transcript and identify distinct semantic segments (topic changes, agenda items, discussion phases).

Meeting: {title}

Transcript (each line prefixed with [index]):
{formatted_transcript[:15000]}

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
) -> StructuredData:
    prompt = f"""Analyze and normalize these meeting extractions. Deduplicate, add context, and identify opportunities.

Meeting: {title}
Date: {date or "Unknown"}
Participants: {", ".join(participants)}

Raw Decisions: {json.dumps(raw_decisions)}
Raw Risks: {json.dumps(raw_risks)}
Raw Tasks: {json.dumps(raw_tasks)}

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
    {{"description": "Task description", "assignee": "Person name or null", "dueDate": "YYYY-MM-DD or null", "priority": "low|medium|high|urgent"}}
  ],
  "opportunities": [
    {{"description": "Opportunity description", "type": "efficiency|revenue|relationship|innovation", "owner": "Person or null"}}
  ]
}}

Guidelines:
- Deduplicate similar items
- Infer owners from context when possible
- Convert vague items to specific actionable descriptions
- Identify implied opportunities from discussion"""

    raw = _call_llm(prompt, json_mode=True)
    data = json.loads(raw)

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
    tasks = [
        TaskItem(
            description=t.get("description", ""),
            assignee=t.get("assignee"),
            due_date=_parse_date(t.get("dueDate")),
            priority=t.get("priority"),
        )
        for t in data.get("tasks", [])
        if t.get("description")
    ]
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
    except Exception:
        return None
