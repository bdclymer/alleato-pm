"""
Daily digest service — generates aggregated daily executive briefings.

Refactored from backend/scripts/generate_daily_recap.py into a reusable
service module that can be called from the scheduler or API endpoints.
"""
from __future__ import annotations

import json
import logging
import os
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from openai import OpenAI

from .pipeline.config import MODEL_DAILY_BRIEF, MODEL_SIGNAL_EXTRACTION
from .pipeline.model_usage import (
    ModelUsageContext,
    assert_background_model_budget_available,
    record_model_usage,
)
from .supabase_helpers import get_rag_read_client, get_supabase_client

logger = logging.getLogger(__name__)

LEGACY_DISABLED_MESSAGE = (
    "Legacy daily digest is disabled. Executive Daily Brief generation must run "
    "through frontend/scripts/run-executive-daily-brief.ts and the AI Ops gateway ledger."
)

EXTRACTION_PROMPT = """You are an AI Chief of Staff analyzing a construction \
project meeting transcript.

Extract the following information. Be specific and quote relevant details.

Return a JSON object with these fields:
{{
    "risks": [
        {{"description": "...", "severity": "high|medium|low", \
"impact": "what could happen if not addressed"}}
    ],
    "decisions": [
        {{"description": "what was decided", "rationale": "why, if mentioned"}}
    ],
    "blockers": [
        {{"description": "what is blocked", "waiting_on": "who/what", \
"deadline": "if mentioned"}}
    ],
    "commitments": [
        {{"person": "who committed", "action": "what they'll do", \
"due": "when, if mentioned"}}
    ],
    "wins": [
        {{"description": "positive progress or achievement"}}
    ],
    "client_sentiment": "positive|neutral|concerned|negative|not_mentioned",
    "schedule_status": "ahead|on_track|at_risk|behind|not_discussed",
    "key_topics": ["topic1", "topic2", "topic3"],
    "summary": "2-3 sentence summary of the meeting"
}}

If a category has no items, use an empty array [].
Be conservative - only extract items that are clearly stated, don't infer.

PROJECT: {project_name}
MEETING: {meeting_title}
DATE: {meeting_date}

TRANSCRIPT:
{transcript}

Return only valid JSON, no other text:"""

RECAP_PROMPT = """You are an AI Chief of Staff generating a daily executive \
briefing for a construction company owner.

Based on the extracted meeting data below, generate a daily recap:

DAILY PROJECT PULSE - {date}
Meetings: {meeting_count} across {project_count} projects

Include these sections:
- NEEDS YOUR ATTENTION: High severity risks or urgent blockers by project
- WATCHING: Medium severity items to monitor
- PROGRESS & WINS: Positive milestones and completions
- COMMITMENTS MADE TODAY: Person → Action by Date
- OPEN QUESTIONS: Unresolved items

MEETING DATA:
{meeting_data}

Be concise but specific. Use actual names and details:"""


def _openai_client() -> OpenAI:
    import os
    return OpenAI(api_key=os.environ["OPENAI_API_KEY"])


def _supports_custom_temperature(model: str) -> bool:
    normalized = (model or "").lower().split("/", 1)[-1]
    return not (
        normalized.startswith("gpt-5")
        or normalized.startswith("o1")
        or normalized.startswith("o3")
        or normalized.startswith("o4")
    )


def _chat_kwargs(*, model: str, temperature: float) -> Dict[str, Any]:
    kwargs: Dict[str, Any] = {"model": model}
    if _supports_custom_temperature(model):
        kwargs["temperature"] = temperature
    return kwargs


def get_meetings_for_date_range(
    start_date: str, end_date: str
) -> List[Dict[str, Any]]:
    """Fetch meetings within a date range with project info."""
    client = get_supabase_client()
    result = (
        client.table("document_metadata")
        .select("id, title, date, summary, overview, project_id")
        .gte("date", start_date)
        .lte("date", end_date)
        .order("date", desc=True)
        .execute()
    )
    meetings = result.data or []
    if meetings:
        rag_rows = (
            get_rag_read_client()
            .table("rag_document_metadata")
            .select("id,content,raw_text,summary,overview")
            .in_("id", [meeting["id"] for meeting in meetings if meeting.get("id")])
            .execute()
            .data
            or []
        )
        rag_by_id = {row.get("id"): row for row in rag_rows}
        meetings = [
            {
                **meeting,
                "content": (rag_by_id.get(meeting.get("id")) or {}).get("content")
                or (rag_by_id.get(meeting.get("id")) or {}).get("raw_text"),
                "summary": (rag_by_id.get(meeting.get("id")) or {}).get("summary") or meeting.get("summary"),
                "overview": (rag_by_id.get(meeting.get("id")) or {}).get("overview") or meeting.get("overview"),
            }
            for meeting in meetings
        ]

    project_ids = list(set(
        m.get("project_id") for m in meetings if m.get("project_id")
    ))
    project_names: Dict[int, str] = {}
    if project_ids:
        proj_resp = (
            client.table("projects")
            .select("id, name")
            .in_("id", project_ids)
            .execute()
        )
        project_names = {
            p["id"]: p["name"] for p in (proj_resp.data or [])
        }

    for meeting in meetings:
        meeting["project_name"] = project_names.get(
            meeting.get("project_id"), "Unknown Project"
        )
    return meetings


def extract_meeting_signals(meeting: Dict[str, Any]) -> Dict[str, Any]:
    """Use AI to extract risks, decisions, blockers, etc. from a meeting."""
    content = (
        meeting.get("overview")
        or meeting.get("content")
        or meeting.get("summary")
        or ""
    )
    if not content or len(content) < 50:
        return _empty_signals(meeting)

    if len(content) > 15000:
        content = content[:15000] + "\n[... truncated ...]"

    prompt = EXTRACTION_PROMPT.format(
        project_name=meeting.get("project_name", "Unknown"),
        meeting_title=meeting.get("title", "Untitled Meeting"),
        meeting_date=meeting.get("date", "Unknown date"),
        transcript=content,
    )

    usage_context = ModelUsageContext(
        stage="signals_extracted",
        operation="daily_digest_meeting_signal_extraction",
        source_system="fireflies",
        source_item_id=str(meeting.get("id") or "") or None,
        project_id=meeting.get("project_id"),
    )
    assert_background_model_budget_available(
        stage=usage_context.stage,
        operation=usage_context.operation,
        model=MODEL_SIGNAL_EXTRACTION,
    )
    response = _openai_client().chat.completions.create(
        **_chat_kwargs(model=MODEL_SIGNAL_EXTRACTION, temperature=0.3),
        messages=[
            {"role": "system", "content": "Extract meeting signals. Return valid JSON only."},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
    )
    record_model_usage(usage_context, model=MODEL_SIGNAL_EXTRACTION, response=response)

    try:
        result = json.loads(response.choices[0].message.content)
        result.update(_meeting_context(meeting))
        return result
    except json.JSONDecodeError:
        return _empty_signals(meeting)


def generate_recap(
    date_str: str, meeting_signals: List[Dict[str, Any]]
) -> str:
    """Generate the formatted daily recap from extracted meeting signals."""
    if not meeting_signals:
        return f"DAILY PROJECT PULSE - {date_str}\nNo meetings recorded."

    project_names = list(set(
        m.get("project_name", "Unknown") for m in meeting_signals
    ))
    meeting_data = json.dumps(meeting_signals, indent=2, default=str)

    prompt = RECAP_PROMPT.format(
        date=date_str,
        meeting_count=len(meeting_signals),
        project_count=len(project_names),
        meeting_data=meeting_data,
    )

    usage_context = ModelUsageContext(
        stage="daily_brief",
        operation="generate_daily_digest_recap",
        metadata={"date": date_str, "meeting_count": len(meeting_signals)},
    )
    assert_background_model_budget_available(
        stage=usage_context.stage,
        operation=usage_context.operation,
        model=MODEL_DAILY_BRIEF,
    )
    response = _openai_client().chat.completions.create(
        **_chat_kwargs(model=MODEL_DAILY_BRIEF, temperature=0.5),
        messages=[
            {"role": "system", "content": "Generate a concise daily briefing."},
            {"role": "user", "content": prompt},
        ],
    )
    record_model_usage(usage_context, model=MODEL_DAILY_BRIEF, response=response)
    return response.choices[0].message.content or ""


def generate_recap_html(recap_text: str) -> str:
    """Convert plain text recap to styled HTML."""
    import html
    escaped = html.escape(recap_text)
    return (
        '<div style="font-family: monospace; font-size: 14px; '
        'line-height: 1.5; color: #333; max-width: 800px; margin: 0 auto;">'
        f'<pre style="white-space: pre-wrap; word-wrap: break-word;">'
        f'{escaped}</pre></div>'
    )


def save_daily_recap(
    recap_date: str,
    date_range_start: str,
    date_range_end: str,
    recap_text: str,
    recap_html: str,
    meetings: List[Dict[str, Any]],
    meeting_signals: List[Dict[str, Any]],
    generation_time: float,
) -> Optional[str]:
    """Save the recap to the daily_recaps table. Returns the record ID."""
    client = get_supabase_client()

    all_risks, all_decisions, all_blockers = [], [], []
    all_commitments, all_wins = [], []
    for signal in meeting_signals:
        ctx = _meeting_context_from_signal(signal)
        for r in signal.get("risks", []):
            all_risks.append({**r, **ctx})
        for d in signal.get("decisions", []):
            all_decisions.append({**d, **ctx})
        for b in signal.get("blockers", []):
            all_blockers.append({**b, **ctx})
        for c in signal.get("commitments", []):
            all_commitments.append({**c, **ctx})
        for w in signal.get("wins", []):
            all_wins.append({**w, **ctx})

    meetings_analyzed = [
        {
            "id": m.get("id"),
            "title": m.get("title"),
            "project_id": m.get("project_id"),
            "project_name": m.get("project_name"),
        }
        for m in meetings
    ]

    project_names = list(set(
        m.get("project_name", "Unknown") for m in meeting_signals
    ))

    record = {
        "recap_date": recap_date,
        "date_range_start": date_range_start,
        "date_range_end": date_range_end,
        "recap_text": recap_text,
        "recap_html": recap_html,
        "meeting_count": len(meetings),
        "project_count": len(project_names),
        "meetings_analyzed": meetings_analyzed,
        "risks": all_risks,
        "decisions": all_decisions,
        "blockers": all_blockers,
        "commitments": all_commitments,
        "wins": all_wins,
        "generation_time_seconds": generation_time,
        "model_used": MODEL_DAILY_BRIEF,
    }

    try:
        result = client.table("daily_recaps").insert(record).execute()
        if result.data:
            return result.data[0].get("id")
    except Exception as e:
        logger.error("Failed to save daily recap: %s", e)
    return None


def run_daily_digest(
    date_str: Optional[str] = None, days: int = 1
) -> Dict[str, Any]:
    """
    Generate a complete daily digest for the given date range.

    Returns dict with recap_id, meeting_count, and recap_text.
    """
    if os.getenv("LEGACY_DAILY_DIGEST_ENABLED", "false").lower() != "true":
        logger.warning("[DailyDigest] %s", LEGACY_DISABLED_MESSAGE)
        return {
            "status": "disabled",
            "reason": "legacy_daily_digest_disabled",
            "message": LEGACY_DISABLED_MESSAGE,
            "canonical_runner": "frontend/scripts/run-executive-daily-brief.ts",
        }

    start_time = time.time()

    if date_str:
        end_date = datetime.strptime(date_str, "%Y-%m-%d")
    else:
        end_date = datetime.now()

    start_date = end_date - timedelta(days=days - 1)
    start_str = start_date.strftime("%Y-%m-%d")
    end_str = end_date.strftime("%Y-%m-%d")
    date_display = end_date.strftime("%B %d, %Y")

    logger.info("[DailyDigest] Generating for %s to %s", start_str, end_str)

    meetings = get_meetings_for_date_range(start_str, end_str + "T23:59:59")
    logger.info("[DailyDigest] Found %d meetings", len(meetings))

    meeting_signals = []
    for meeting in meetings:
        signals = extract_meeting_signals(meeting)
        meeting_signals.append(signals)

    recap_text = generate_recap(date_display, meeting_signals)
    recap_html = generate_recap_html(recap_text)

    elapsed = round(time.time() - start_time, 2)

    recap_id = save_daily_recap(
        recap_date=end_str,
        date_range_start=start_str,
        date_range_end=end_str,
        recap_text=recap_text,
        recap_html=recap_html,
        meetings=meetings,
        meeting_signals=meeting_signals,
        generation_time=elapsed,
    )

    logger.info(
        "[DailyDigest] Done in %.2fs — %d meetings, recap_id=%s",
        elapsed, len(meetings), recap_id,
    )

    return {
        "recap_id": recap_id,
        "meeting_count": len(meetings),
        "recap_text": recap_text,
        "generation_time": elapsed,
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _empty_signals(meeting: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "risks": [], "decisions": [], "blockers": [],
        "commitments": [], "wins": [],
        "client_sentiment": "not_mentioned",
        "schedule_status": "not_discussed",
        "key_topics": [],
        "summary": "No transcript content available",
        **_meeting_context(meeting),
    }


def _meeting_context(meeting: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "project_name": meeting.get("project_name"),
        "project_id": meeting.get("project_id"),
        "meeting_title": meeting.get("title"),
        "meeting_date": meeting.get("date"),
        "meeting_id": meeting.get("id"),
    }


def _meeting_context_from_signal(signal: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "project_name": signal.get("project_name"),
        "project_id": signal.get("project_id"),
        "meeting_title": signal.get("meeting_title"),
        "meeting_id": signal.get("meeting_id"),
    }
