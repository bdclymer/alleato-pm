"""Backend-owned project operating summary packet refresh.

This module is the Render/FastAPI production path for compiling a project
operating summary into the packet-first intelligence tables.
"""

from __future__ import annotations

import json
import os
import re
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from ..ai_transport import get_openai_client

COMPILER_VERSION = "project-operating-summary-v1"
PACKET_VERSION = "project_operating_summary_v1"
MAX_SOURCES = 96
MAX_SOURCE_TEXT_CHARS = 1600
DEFAULT_LOOKBACK_DAYS = int(os.getenv("PROJECT_OPERATING_SUMMARY_LOOKBACK_DAYS", "180"))

CATEGORY_LABELS = {
    "project_detail": "Project Details",
    "meeting": "Meetings",
    "email": "Emails",
    "teams": "Teams",
    "document": "Documents",
    "acumatica": "Acumatica",
    "rfi": "RFIs",
    "submittal": "Submittals",
    "drawing": "Drawings",
    "specification": "Specifications",
    "daily_report": "Daily Reports",
    "task": "Tasks",
    "risk": "Risks",
}

SOURCE_CATEGORY_PRIORITY = {
    "project_detail": -1,
    "meeting": 0,
    "teams": 1,
    "email": 2,
    "task": 3,
    "risk": 3,
    "rfi": 3,
    "submittal": 3,
    "drawing": 3,
    "specification": 3,
    "daily_report": 3,
    "acumatica": 3,
    "document": 4,
}

SOURCE_QUALITY_LABELS = {
    "strategic_synthesis",
    "clean_source",
    "raw_dump",
    "metadata_only",
    "stale_or_failed",
}

DOCUMENT_INTELLIGENCE_CATEGORIES = {
    "document",
    "drawing",
    "specification",
    "rfi",
    "submittal",
    "daily_report",
}

OBLIGATION_KEYWORDS = (
    "approval",
    "approve",
    "approved",
    "submit",
    "submittal",
    "due",
    "deadline",
    "permit",
    "inspection",
    "certificate",
    "insurance",
    "warranty",
    "closeout",
    "retainage",
    "must",
    "required",
    "shall",
)

CONFLICT_KEYWORDS = (
    "conflict",
    "conflicting",
    "discrepancy",
    "mismatch",
    "revise",
    "revised",
    "superseded",
    "void",
    "outdated",
    "wrong",
)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _single_row(response: Any) -> Optional[Dict[str, Any]]:
    data = getattr(response, "data", None) or []
    return data[0] if data else None


def _rows(response: Any) -> List[Dict[str, Any]]:
    return getattr(response, "data", None) or []


def _execute(query: Any, *, operation: str, attempts: int = 3) -> Any:
    last_error: Optional[Exception] = None
    for attempt in range(attempts):
        try:
            return query.execute()
        except Exception as exc:
            last_error = exc
            message = str(exc).lower()
            retryable = (
                "522" in message
                or "521" in message
                or "connection timed out" in message
                or "cloudflare" in message
                or "timeout" in message
            )
            if not retryable or attempt == attempts - 1:
                raise
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"{operation} failed") from last_error


def _compact(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, str):
        text = value.strip()
        return text or None
    if isinstance(value, (int, float, bool)):
        return str(value)
    return json.dumps(value, default=str)


def _join_fields(fields: List[tuple[str, Any]]) -> str:
    parts = []
    for label, value in fields:
        text = _compact(value)
        if text:
            parts.append(f"{label}: {text}")
    return ". ".join(parts)


def _safe_date(*values: Any) -> Optional[str]:
    for value in values:
        text = _compact(value)
        if text:
            return text
    return None


def _parse_source_datetime(value: Any) -> Optional[datetime]:
    text = _compact(value)
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def _source_timestamp(source: Dict[str, Any]) -> Optional[datetime]:
    return _parse_source_datetime(source.get("capturedAt"))


def _truncate(value: str, max_length: int) -> str:
    text = re.sub(r"\s+", " ", value or "").strip()
    if len(text) <= max_length:
        return text
    return f"{text[: max_length - 3].rstrip()}..."


def _normalized_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip().lower()


def _compact_words(value: Any, *, max_words: int = 28) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    if not text:
        return ""
    words = text.split(" ")
    if len(words) <= max_words:
        return text
    return " ".join(words[:max_words]).rstrip(" ,.;:") + "..."


def _looks_metadata_only(text: str) -> bool:
    normalized = _normalized_text(text)
    if len(normalized) < 60:
        return True

    field_tokens = [
        "title:",
        "type:",
        "category:",
        "source:",
        "date:",
        "from:",
        "to:",
        "participants:",
        "duration:",
        "organizer email:",
    ]
    field_count = sum(1 for token in field_tokens if token in normalized)
    has_body_signal = any(
        token in normalized
        for token in (
            "summary:",
            "notes:",
            "action items:",
            "decisions:",
            "key topics:",
            "question:",
            "description:",
            "work performed:",
        )
    )
    if field_count >= 4 and not has_body_signal and len(normalized) < 160:
        return True

    return (
        normalized.startswith("subject:")
        and " from:" in normalized
        and " to:" in normalized
        and len(normalized) < 160
    )


def _looks_raw_dump(text: str) -> bool:
    normalized = _normalized_text(text)
    email_count = len(re.findall(r"[\w.+-]+@[\w.-]+\.[a-z]{2,}", normalized))
    date_count = len(
        re.findall(
            r"\b(?:mon|tue|wed|thu|fri|sat|sun)\b|\b\d{1,2}/\d{1,2}/\d{2,4}\b",
            normalized,
        )
    )
    return (
        normalized.startswith("subject:")
        or (" subject:" in normalized and " from:" in normalized and " to:" in normalized)
        or (" duration:" in normalized and " participants:" in normalized)
        or "[message:" in normalized
        or email_count >= 4
        or date_count >= 8
    )


def _source_quality(category: str, text: str, captured_at: Optional[str]) -> Dict[str, Any]:
    parsed_at = _parse_source_datetime(captured_at)
    is_stale = False
    if parsed_at:
        is_stale = parsed_at < datetime.now(timezone.utc) - timedelta(days=DEFAULT_LOOKBACK_DAYS)

    if is_stale:
        label = "stale_or_failed"
        score = 0.15
        reason = f"Source is older than the {DEFAULT_LOOKBACK_DAYS}-day default operating lookback."
    elif category in {"task", "risk", "rfi", "submittal", "drawing", "specification", "daily_report", "acumatica", "project_detail"}:
        label = "clean_source"
        score = 0.8
        reason = "Structured project record with typed fields."
    elif _looks_metadata_only(text):
        label = "metadata_only"
        score = 0.2
        reason = "Source text contains mostly headers or record metadata."
    elif _looks_raw_dump(text):
        label = "raw_dump"
        score = 0.45
        reason = "Source text appears to be a raw transcript, email thread, or message dump."
    else:
        label = "clean_source"
        score = 0.7
        reason = "Source contains usable body text or summary fields."

    return {"label": label, "score": score, "reason": reason}


def _source_type_for_category(category: str) -> str:
    return {
        "project_detail": "other",
        "meeting": "meeting",
        "email": "email",
        "teams": "teams",
        "document": "document",
        "acumatica": "acumatica",
        "rfi": "rfi",
        "submittal": "submittal",
        "drawing": "drawing",
        "specification": "specification",
        "daily_report": "daily_report",
        "task": "task",
        "risk": "risk",
    }.get(category, "other")


def _document_category(row: Dict[str, Any]) -> str:
    value = " ".join(
        str(row.get(key) or "")
        for key in ("source_system", "source", "category", "type")
    ).lower()
    if "fireflies" in value or "meeting" in value or "transcript" in value:
        return "meeting"
    if "outlook" in value or "email" in value:
        return "email"
    if "teams" in value or "message" in value or "chat" in value:
        return "teams"
    if "drawing" in value or "plan" in value:
        return "drawing"
    if "spec" in value:
        return "specification"
    return "document"


def _make_source(
    *,
    category: str,
    source_id: str,
    record_id: str,
    title: Optional[str],
    project_name: Optional[str],
    text: str,
    captured_at: Optional[str] = None,
    source_url: Optional[str] = None,
) -> Dict[str, Any]:
    truncated_text = _truncate(text, MAX_SOURCE_TEXT_CHARS)
    return {
        "id": source_id,
        "type": _source_type_for_category(category),
        "category": category,
        "recordId": record_id,
        "title": title,
        "projectName": project_name,
        "text": truncated_text,
        "capturedAt": captured_at,
        "sourceUrl": source_url,
        "sourceQuality": _source_quality(category, truncated_text, captured_at),
    }


def _fetch_optional_rows(query: Any) -> List[Dict[str, Any]]:
    try:
        return _rows(_execute(query, operation="fetch optional operating sources"))
    except Exception:
        return []


def _select_operating_sources(sources: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=DEFAULT_LOOKBACK_DAYS)
    selected_pool = []
    for source in sources:
        if source.get("category") == "project_detail":
            selected_pool.append(source)
            continue
        captured_at = _source_timestamp(source)
        if captured_at and captured_at < cutoff:
            continue
        selected_pool.append(source)

    def sort_key(source: Dict[str, Any]) -> tuple[int, float, float, str]:
        captured_at = _source_timestamp(source)
        timestamp = captured_at.timestamp() if captured_at else 0.0
        quality = source.get("sourceQuality") if isinstance(source.get("sourceQuality"), dict) else {}
        score = float(quality.get("score") or 0)
        return (
            SOURCE_CATEGORY_PRIORITY.get(str(source.get("category")), 99),
            -timestamp,
            -score,
            str(source.get("title") or source.get("id") or ""),
        )

    return sorted(selected_pool, key=sort_key)[:MAX_SOURCES]


def _document_kind_label(category: str) -> str:
    return CATEGORY_LABELS.get(category, category.replace("_", " ").title())


def _document_evidence_pointer(source: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "sourceId": source.get("id"),
        "recordId": source.get("recordId"),
        "category": source.get("category"),
        "title": source.get("title") or source.get("recordId"),
        "capturedAt": source.get("capturedAt"),
        "sourceUrl": source.get("sourceUrl"),
    }


def _document_project_impact(source: Dict[str, Any]) -> str:
    category = str(source.get("category") or "document")
    text = _normalized_text(" ".join([str(source.get("title") or ""), str(source.get("text") or "")]))
    if category == "drawing":
        return "Drawing/revision context can affect scope coordination, field install sequence, and change exposure."
    if category == "specification":
        return "Specification context can affect required materials, submittals, inspections, and scope compliance."
    if category == "rfi":
        return "RFI context can affect owner/architect decisions, change entitlement, and schedule release."
    if category == "submittal":
        return "Submittal context can affect procurement release, approval flow, and schedule risk."
    if category == "daily_report":
        return "Daily-report context can affect field progress, delay support, and issue documentation."
    if any(token in text for token in ("cost", "budget", "invoice", "pay app", "payment", "change order")):
        return "Financial document context can affect exposure, billing, payment timing, and margin protection."
    if any(token in text for token in ("permit", "inspection", "certificate", "insurance", "warranty", "closeout")):
        return "Compliance/closeout document context can affect approvals, turnover, and owner acceptance."
    return "Document context can affect source-of-truth confidence and follow-up priority."


def _document_obligation(source: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    text = " ".join([str(source.get("title") or ""), str(source.get("text") or "")])
    normalized = _normalized_text(text)
    if not any(keyword in normalized for keyword in OBLIGATION_KEYWORDS):
        return None
    return {
        "title": _compact_words(source.get("title") or source.get("recordId"), max_words=12),
        "obligation": _compact_words(source.get("text"), max_words=34),
        "projectImpact": _document_project_impact(source),
        "sourceIds": [source["id"]],
        "evidence": [_document_evidence_pointer(source)],
    }


def _document_conflict(source: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    text = " ".join([str(source.get("title") or ""), str(source.get("text") or "")])
    normalized = _normalized_text(text)
    if not any(keyword in normalized for keyword in CONFLICT_KEYWORDS):
        return None
    return {
        "title": _compact_words(source.get("title") or source.get("recordId"), max_words=12),
        "conflictSignal": _compact_words(source.get("text"), max_words=34),
        "projectImpact": _document_project_impact(source),
        "sourceIds": [source["id"]],
        "evidence": [_document_evidence_pointer(source)],
    }


def _build_document_intelligence(sources: List[Dict[str, Any]]) -> Dict[str, Any]:
    document_sources = [
        source
        for source in sources
        if source.get("category") in DOCUMENT_INTELLIGENCE_CATEGORIES
    ]

    def latest_key(source: Dict[str, Any]) -> tuple[float, str]:
        captured_at = _source_timestamp(source)
        timestamp = captured_at.timestamp() if captured_at else 0.0
        return (-timestamp, str(source.get("title") or source.get("id") or ""))

    sorted_docs = sorted(document_sources, key=latest_key)
    latest_by_category: List[Dict[str, Any]] = []
    for category in sorted(
        DOCUMENT_INTELLIGENCE_CATEGORIES,
        key=lambda value: (SOURCE_CATEGORY_PRIORITY.get(value, 99), value),
    ):
        rows = [source for source in sorted_docs if source.get("category") == category]
        if not rows:
            continue
        latest = rows[0]
        latest_by_category.append(
            {
                "category": category,
                "label": _document_kind_label(category),
                "availableCount": len(rows),
                "latest": _document_evidence_pointer(latest),
                "projectImpact": _document_project_impact(latest),
            }
        )

    duplicate_groups: Dict[str, List[Dict[str, Any]]] = {}
    for source in document_sources:
        title_key = _normalized_text(source.get("title") or source.get("recordId"))
        if not title_key:
            continue
        group_key = f"{source.get('category')}:{title_key}"
        duplicate_groups.setdefault(group_key, []).append(source)

    revision_signals = []
    for rows in duplicate_groups.values():
        if len(rows) < 2:
            continue
        ordered = sorted(rows, key=latest_key)
        revision_signals.append(
            {
                "title": ordered[0].get("title") or ordered[0].get("recordId"),
                "category": ordered[0].get("category"),
                "latest": _document_evidence_pointer(ordered[0]),
                "priorCount": len(ordered) - 1,
                "priorEvidence": [_document_evidence_pointer(source) for source in ordered[1:4]],
            }
        )

    obligations = [
        item
        for item in (_document_obligation(source) for source in sorted_docs)
        if item
    ][:12]
    conflicts = [
        item
        for item in (_document_conflict(source) for source in sorted_docs)
        if item
    ][:12]

    missing_categories = [
        {
            "category": category,
            "label": _document_kind_label(category),
            "reason": "No selected operating-summary source capsule was available for this document category.",
        }
        for category in sorted(DOCUMENT_INTELLIGENCE_CATEGORIES)
        if not any(source.get("category") == category for source in document_sources)
    ]

    return {
        "schema": "project_document_intelligence_v1",
        "documentSourceCount": len(document_sources),
        "latestByCategory": latest_by_category,
        "revisionSignals": revision_signals[:12],
        "conflictSignals": conflicts,
        "obligations": obligations,
        "projectImpact": [
            {
                "category": row["category"],
                "label": row["label"],
                "impact": row["projectImpact"],
                "sourceIds": [row["latest"]["sourceId"]],
            }
            for row in latest_by_category
        ],
        "evidencePointers": [_document_evidence_pointer(source) for source in sorted_docs[:24]],
        "missingCategories": missing_categories,
    }


def _quality_counts(sources: List[Dict[str, Any]]) -> Dict[str, int]:
    counts = {label: 0 for label in sorted(SOURCE_QUALITY_LABELS)}
    for source in sources:
        quality = source.get("sourceQuality") if isinstance(source.get("sourceQuality"), dict) else {}
        label = quality.get("label") if quality.get("label") in SOURCE_QUALITY_LABELS else "metadata_only"
        counts[label] = counts.get(label, 0) + 1
    return counts


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "untitled"


def ensure_operating_target(supabase: Any, project_id: int) -> Dict[str, Any]:
    existing = _single_row(
        _execute(
            supabase.table("intelligence_targets")
            .select("*")
            .eq("target_type", "client_project")
            .eq("project_id", int(project_id))
            .limit(1),
            operation="load operating summary target",
        )
    )
    if existing:
        return existing

    project = _single_row(
        _execute(
            supabase.table("projects")
            .select("id,name,project_number,aliases")
            .eq("id", int(project_id))
            .limit(1),
            operation="load project for operating summary target",
        )
    )
    if not project:
        raise ValueError(f"projects row not found: {project_id}")

    name = project.get("name") or f"Project {project_id}"
    slug = _slugify(" ".join(str(part) for part in [project.get("project_number"), name] if part))
    payload = {
        "target_type": "client_project",
        "name": name,
        "slug": slug,
        "status": "active",
        "project_id": int(project_id),
        "metadata": {
            "created_by": "project_operating_summary",
            "compiler_version": COMPILER_VERSION,
        },
    }
    return _single_row(
        _execute(
            supabase.table("intelligence_targets").insert(payload),
            operation="create operating summary target",
        )
    ) or payload


def build_project_operating_sources(supabase: Any, project_id: int) -> Dict[str, Any]:
    project = _single_row(
        _execute(
            supabase.table("projects")
            .select(
                "id,name,project_number,phase,stage,summary,summary_updated_at,"
                "created_at,health_status,completion_percentage,budget,budget_used,erp_system,"
                "erp_sync_status,erp_last_job_cost_sync,erp_last_direct_cost_sync,"
                "acumatica_project_id,work_scope,project_sector,delivery_method"
            )
            .eq("id", int(project_id))
            .limit(1),
            operation="load project operating source",
        )
    )
    if not project:
        raise ValueError(f"projects row not found: {project_id}")

    project_name = project.get("name")
    docs = _fetch_optional_rows(
        supabase.table("document_metadata")
        .select(
            "id,title,type,category,source,source_system,date,captured_at,summary,overview,"
            "notes,action_items,decisions,key_topics,topics_discussed,source_web_url,url"
        )
        .eq("project_id", int(project_id))
        .order("date", desc=True)
        .limit(500)
    )
    tasks = _fetch_optional_rows(
        supabase.table("tasks")
        .select(
            "id,title,description,status,priority,due_date,created_at,updated_at,"
            "extraction_source,source_system,metadata_id,source_chunk_id"
        )
        .eq("project_id", int(project_id))
        .order("updated_at", desc=True)
        .limit(30)
    )
    schedule_tasks = _fetch_optional_rows(
        supabase.table("schedule_tasks")
        .select("id,name,status,priority,start_date,finish_date,updated_at,created_at")
        .eq("project_id", int(project_id))
        .order("updated_at", desc=True)
        .limit(30)
    )
    rfis = _fetch_optional_rows(
        supabase.table("rfis")
        .select("id,number,subject,status,question,due_date,ball_in_court,cost_impact,schedule_impact,updated_at,created_at")
        .eq("project_id", int(project_id))
        .order("updated_at", desc=True)
        .limit(20)
    )
    submittals = _fetch_optional_rows(
        supabase.table("submittals")
        .select("id,submittal_number,title,status,description,final_due_date,ball_in_court,updated_at,created_at")
        .eq("project_id", int(project_id))
        .order("updated_at", desc=True)
        .limit(20)
    )
    drawings = _fetch_optional_rows(
        supabase.table("drawings")
        .select("id,number,title,status,drawing_date,revision_date,created_at,updated_at")
        .eq("project_id", int(project_id))
        .order("updated_at", desc=True)
        .limit(20)
    )
    specifications = _fetch_optional_rows(
        supabase.table("specifications")
        .select("id,number,title,status,description,created_at,updated_at")
        .eq("project_id", int(project_id))
        .order("updated_at", desc=True)
        .limit(20)
    )
    daily_logs = _fetch_optional_rows(
        supabase.table("daily_logs")
        .select("id,log_date,weather,work_performed,notes,created_at,updated_at")
        .eq("project_id", int(project_id))
        .order("log_date", desc=True)
        .limit(20)
    )

    sources = [
        _make_source(
            category="project_detail",
            source_id=f"project:{project['id']}",
            record_id=str(project["id"]),
            title=project_name,
            project_name=project_name,
            captured_at=_safe_date(
                project.get("erp_last_job_cost_sync"),
                project.get("erp_last_direct_cost_sync"),
                project.get("summary_updated_at"),
                project.get("created_at"),
            ),
            text=_join_fields(
                [
                    ("Project", project.get("name")),
                    ("Project number", project.get("project_number")),
                    ("Phase", project.get("stage") or project.get("phase")),
                    ("Summary", project.get("summary")),
                    ("Health", project.get("health_status")),
                    ("Budget", project.get("budget")),
                    ("Budget used", project.get("budget_used")),
                    ("ERP sync status", project.get("erp_sync_status")),
                    ("Work scope", project.get("work_scope")),
                ]
            ),
        )
    ]

    for row in docs:
        category = _document_category(row)
        sources.append(
            _make_source(
                category=category,
                source_id=f"document_metadata:{row['id']}",
                record_id=str(row["id"]),
                title=row.get("title"),
                project_name=project_name,
                captured_at=_safe_date(row.get("date"), row.get("captured_at")),
                source_url=row.get("source_web_url") or row.get("url"),
                text=_join_fields(
                    [
                        ("Title", row.get("title")),
                        ("Type", row.get("type")),
                        ("Category", row.get("category")),
                        ("Source", row.get("source_system") or row.get("source")),
                        ("Date", row.get("date") or row.get("captured_at")),
                        ("Summary", row.get("summary") or row.get("overview")),
                        ("Notes", row.get("notes")),
                        ("Action items", row.get("action_items")),
                        ("Decisions", row.get("decisions")),
                        ("Key topics", row.get("key_topics") or row.get("topics_discussed")),
                    ]
                ),
            )
        )

    for row in tasks:
        sources.append(
            _make_source(
                category="task",
                source_id=f"task:{row['id']}",
                record_id=str(row["id"]),
                title=row.get("title"),
                project_name=project_name,
                captured_at=_safe_date(row.get("updated_at"), row.get("created_at")),
                text=_join_fields(
                    [
                        ("Task", row.get("title")),
                        ("Description", row.get("description")),
                        ("Status", row.get("status")),
                        ("Priority", row.get("priority")),
                        ("Due date", row.get("due_date")),
                        ("Source", row.get("extraction_source") or row.get("source_system")),
                    ]
                ),
            )
        )

    for row in schedule_tasks:
        title = row.get("name")
        sources.append(
            _make_source(
                category="task",
                source_id=f"schedule_task:{row['id']}",
                record_id=str(row["id"]),
                title=title,
                project_name=project_name,
                captured_at=_safe_date(row.get("updated_at"), row.get("created_at")),
                text=_join_fields(
                    [
                        ("Schedule task", title),
                        ("Status", row.get("status")),
                        ("Priority", row.get("priority")),
                        ("Start", row.get("start_date")),
                        ("Finish", row.get("finish_date")),
                    ]
                ),
            )
        )

    for category, rows, id_prefix, title_keys in [
        ("rfi", rfis, "rfi", ("subject", "number")),
        ("submittal", submittals, "submittal", ("title", "submittal_number")),
        ("drawing", drawings, "drawing", ("title", "number")),
        ("specification", specifications, "specification", ("title", "number")),
        ("daily_report", daily_logs, "daily_log", ("log_date", "id")),
    ]:
        for row in rows:
            title = next((row.get(key) for key in title_keys if row.get(key)), str(row.get("id")))
            sources.append(
                _make_source(
                    category=category,
                    source_id=f"{id_prefix}:{row['id']}",
                    record_id=str(row["id"]),
                    title=str(title),
                    project_name=project_name,
                    captured_at=_safe_date(row.get("updated_at"), row.get("created_at"), row.get("log_date")),
                    text=_join_fields([(key.replace("_", " ").title(), value) for key, value in row.items()]),
                )
            )

    all_sources = sources
    sources = _select_operating_sources(all_sources)
    document_intelligence = _build_document_intelligence(sources)
    coverage = []
    for category, label in CATEGORY_LABELS.items():
        all_category_sources = [source for source in all_sources if source["category"] == category]
        category_sources = [source for source in sources if source["category"] == category]
        coverage.append(
            {
                "category": category,
                "label": label,
                "availableCount": len(all_category_sources),
                "sourceCount": len(category_sources),
                "inPacketCount": len(category_sources),
                "latestAt": sorted([s["capturedAt"] for s in category_sources if s.get("capturedAt")])[-1]
                if any(s.get("capturedAt") for s in category_sources)
                else None,
                "sampleTitles": [s.get("title") or s["recordId"] for s in category_sources[:3]],
                "tableNames": [],
            }
        )

    return {
        "projectId": int(project_id),
        "projectName": project_name,
        "generatedAt": _utc_now(),
        "sources": sources,
        "coverage": coverage,
        "documentIntelligence": document_intelligence,
        "missingCategories": [row for row in coverage if row["availableCount"] == 0],
    }


def _provider_client() -> tuple:
    return get_openai_client(), ""


def _source_digest(sources: List[Dict[str, Any]]) -> str:
    parts = []
    for index, source in enumerate(sources, start=1):
        quality = source.get("sourceQuality") if isinstance(source.get("sourceQuality"), dict) else {}
        parts.append(
            "\n".join(
                [
                    f"Source {index}",
                    f"id: {source['id']}",
                    f"type: {source['type']}",
                    f"category: {source['category']}",
                    f"source_quality: {quality.get('label') or 'unknown'}",
                    f"source_quality_reason: {quality.get('reason') or ''}",
                    f"title: {source.get('title') or ''}",
                    f"captured_at: {source.get('capturedAt') or ''}",
                    "text:",
                    source.get("text") or "",
                ]
            )
        )
    return "\n\n---\n\n".join(parts)


def _source_aliases(index: int) -> List[str]:
    aliases = [f"S{index:03d}", f"S{index:02d}", f"S{index}"]
    return list(dict.fromkeys(aliases))


def generate_operating_summary(source_set: Dict[str, Any], *, model: Optional[str] = None) -> Dict[str, Any]:
    client, prefix = _provider_client()
    raw_model = model or os.getenv("OPERATING_SUMMARY_MODEL", "gpt-5.4-mini")
    model_name = raw_model if raw_model.startswith(prefix) else f"{prefix}{raw_model}"
    sources = source_set["sources"]
    alias_to_source_id = {}
    for index, source in enumerate(sources, start=1):
        for alias in _source_aliases(index):
            alias_to_source_id[alias] = source["id"]
    aliased_sources = [
        {**source, "id": alias}
        for alias, source in zip([f"S{index:03d}" for index in range(1, len(sources) + 1)], sources)
    ]
    source_ids = [f"S{index:03d}" for index in range(1, len(sources) + 1)]
    prompt = {
        "focus": "project_operating_summary",
        "projectName": source_set.get("projectName"),
        "availableSourceIds": source_ids,
        "requiredJsonShape": {
            "headline": "string",
            "context": "string",
            "confidence": "low|medium|high",
            "currentExecutiveRead": "string",
            "timeline": [{"title": "string", "sourceIds": ["one or more availableSourceIds"]}],
            "whatChanged": [{"title": "string", "impact": "string", "sourceIds": ["one or more availableSourceIds"]}],
            "recentChanges": [{"title": "string", "sourceIds": ["one or more availableSourceIds"]}],
            "risks": [{"title": "string", "severity": "low|medium|high|critical", "recommendedAction": "string", "sourceIds": ["one or more availableSourceIds"]}],
            "openDecisions": [{"title": "string", "owner": "string|null", "neededBy": "string|null", "sourceIds": ["one or more availableSourceIds"]}],
            "financialPosition": {"summary": "string", "sourceIds": ["one or more availableSourceIds"]},
            "moneyImpact": {"summary": "string", "sourceIds": ["one or more availableSourceIds"]},
            "scheduleAndProcurement": {"summary": "string", "sourceIds": ["one or more availableSourceIds"]},
            "projectControls": {"tasks": [{"title": "string", "sourceIds": ["one or more availableSourceIds"]}]},
            "promisesMade": [{"title": "string", "owner": "string|null", "dueDate": "string|null", "sourceIds": ["one or more availableSourceIds"]}],
            "openQuestions": [{"title": "string", "sourceIds": ["one or more availableSourceIds"]}],
            "recommendedActions": [{"title": "string", "priority": "low|medium|high|critical", "reason": "string", "sourceIds": ["one or more availableSourceIds"]}],
            "recommendedFocus": [{"title": "string", "sourceIds": ["one or more availableSourceIds"]}],
            "evidenceQuality": {
                "cleanSynthesisCount": "number",
                "rawDumpCount": "number",
                "metadataOnlyCount": "number",
                "notes": ["string"],
            },
            "dataGaps": ["string"],
        },
        "sources": _source_digest(aliased_sources),
    }
    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {
                "role": "system",
                "content": (
                    "Return only valid JSON. Use only the provided source IDs. "
                    "Do not cite raw Outlook IDs, task IDs, or any ID not in availableSourceIds. "
                    "Prioritize source_quality=clean_source and recent meeting/Teams sources. "
                    "Treat source_quality=raw_dump as evidence that must be synthesized, not copied. "
                    "Do not copy email headers, transcript dumps, signatures, or metadata into the report. "
                    "Treat source_quality=metadata_only as weak evidence and call it out in evidenceQuality/dataGaps."
                ),
            },
            {"role": "user", "content": json.dumps(prompt)},
        ],
        timeout=int(os.getenv("OPERATING_SUMMARY_TIMEOUT_SECONDS", "90")),
    )
    raw = (response.choices[0].message.content or "").strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    summary = json.loads(raw)
    known = set(alias_to_source_id.keys()) | {source["id"] for source in sources}
    cited = set()

    def collect(value: Any) -> None:
        if isinstance(value, dict):
            ids = value.get("sourceIds")
            if isinstance(ids, list):
                cited.update(str(item) for item in ids)
            for nested in value.values():
                collect(nested)
        elif isinstance(value, list):
            for nested in value:
                collect(nested)

    collect(summary)
    unknown = sorted(cited - known)
    if unknown:
        raise ValueError(f"Operating summary cited unknown source IDs: {', '.join(unknown[:10])}")

    def remap(value: Any) -> None:
        if isinstance(value, dict):
            ids = value.get("sourceIds")
            if isinstance(ids, list):
                value["sourceIds"] = [alias_to_source_id.get(str(item), str(item)) for item in ids]
            for nested in value.values():
                remap(nested)
        elif isinstance(value, list):
            for nested in value:
                remap(nested)

    remap(summary)
    summary["schema"] = "project_operating_summary_v1"
    summary["model"] = model_name
    summary["sourceCount"] = len(sources)
    summary["sourceIds"] = [source["id"] for source in sources]
    summary["sourceQualityCounts"] = _quality_counts(sources)
    _assert_summary_quality(summary)
    return summary


def _assert_summary_quality(summary: Dict[str, Any]) -> None:
    text = " ".join(
        str(value or "")
        for value in [
            summary.get("headline"),
            summary.get("context"),
            summary.get("currentExecutiveRead"),
        ]
    )
    normalized = _normalized_text(text)
    if not summary.get("headline") or not summary.get("currentExecutiveRead"):
        raise ValueError("Operating summary model returned an incomplete strategic report.")
    if _looks_raw_dump(normalized) or _looks_metadata_only(normalized):
        raise ValueError("Operating summary model returned raw source text or metadata instead of synthesis.")


def _find_source(sources: Dict[str, Dict[str, Any]], source_id: str) -> Optional[Dict[str, Any]]:
    return sources.get(source_id)


def _document_intelligence_card(source_set: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    document_intelligence = source_set.get("documentIntelligence") or {}
    if not isinstance(document_intelligence, dict):
        return None
    source_ids = [
        str(pointer.get("sourceId"))
        for pointer in document_intelligence.get("evidencePointers") or []
        if pointer.get("sourceId")
    ]
    if not source_ids:
        return None

    latest = document_intelligence.get("latestByCategory") or []
    obligations = document_intelligence.get("obligations") or []
    conflicts = document_intelligence.get("conflictSignals") or []
    latest_labels = [
        f"{item.get('label')}: {(item.get('latest') or {}).get('title') or 'latest source'}"
        for item in latest[:4]
        if isinstance(item, dict)
    ]
    summary_parts = []
    if latest_labels:
        summary_parts.append("Latest document signals: " + "; ".join(latest_labels))
    if obligations:
        summary_parts.append(f"{len(obligations)} obligation/compliance signals need PM awareness.")
    if conflicts:
        summary_parts.append(f"{len(conflicts)} conflict/revision signals need verification.")
    if not summary_parts:
        summary_parts.append("Document intelligence has source pointers, but no obligation or conflict signals were detected.")

    return {
        "key": "operating-document-intelligence",
        "section": "documents",
        "rank": 9,
        "type": "requirement",
        "title": "Document intelligence",
        "summary": " ".join(summary_parts),
        "why": "Gives the assistant a project-document baseline before it drills into exact specs, drawings, RFIs, submittals, or source clauses.",
        "nextAction": (
            "Verify document conflicts and obligations against exact source passages before acting."
            if conflicts or obligations
            else "Use document RAG for exact clauses or attachments when needed."
        ),
        "sourceIds": source_ids[:16],
    }


def _card_defs(summary: Dict[str, Any], source_set: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    controls = summary.get("projectControls") or {}
    what_changed = summary.get("whatChanged") or summary.get("recentChanges") or []
    risks = summary.get("risks") or []
    open_decisions = summary.get("openDecisions") or summary.get("openQuestions") or []
    money_impact = summary.get("moneyImpact") or summary.get("financialPosition") or {}
    promises_made = summary.get("promisesMade") or []
    recommended_actions = summary.get("recommendedActions") or summary.get("recommendedFocus") or []
    cards = [
        {
            "key": "operating-current-read",
            "section": "current_state",
            "rank": 1,
            "type": "project_update",
            "title": summary.get("headline") or "Current project operating read",
            "summary": summary.get("currentExecutiveRead") or summary.get("context") or "",
            "why": summary.get("context"),
            "nextAction": (recommended_actions[0] or {}).get("title") if recommended_actions else None,
            "sourceIds": summary.get("sourceIds", [])[:8],
        },
        {
            "key": "operating-what-changed",
            "section": "timeline",
            "rank": 2,
            "type": "change_management",
            "title": "What changed",
            "summary": " ".join(
                f"{item.get('title', '')}: {item.get('impact', '')}".strip(": ")
                for item in what_changed
            )
            or "No recent changes were explicit.",
            "why": "Keeps project-status answers grounded in the recent change trail.",
            "nextAction": "Validate changed scope, schedule, and budget assumptions against the current project plan."
            if what_changed
            else None,
            "sourceIds": list({sid for item in what_changed for sid in item.get("sourceIds", [])})[:12],
        },
        {
            "key": "operating-risks",
            "section": "risks",
            "rank": 3,
            "type": "risk",
            "title": "Risks and exposure",
            "summary": " ".join(
                f"{item.get('title', '')}: {item.get('recommendedAction', '')}".strip(": ")
                for item in risks
            )
            or "No risks were explicit.",
            "why": "Separates strategic risk from raw source activity.",
            "nextAction": (risks[0] or {}).get("recommendedAction") if risks else None,
            "sourceIds": list({sid for item in risks for sid in item.get("sourceIds", [])})[:12],
        },
        {
            "key": "operating-open-decisions",
            "section": "decisions",
            "rank": 4,
            "type": "decision",
            "title": "Open decisions",
            "summary": " ".join(item.get("title", "") for item in open_decisions) or "No open decisions were explicit.",
            "why": "Shows unresolved decisions before they become schedule or money risk.",
            "nextAction": f"Resolve: {(open_decisions[0] or {}).get('title')}"
            if open_decisions
            else None,
            "sourceIds": list({sid for item in open_decisions for sid in item.get("sourceIds", [])})[:12],
        },
        {
            "key": "operating-financial-position",
            "section": "financials",
            "rank": 5,
            "type": "financial_exposure",
            "title": "Money impact",
            "summary": money_impact.get("summary") or "",
            "why": "Financial claims must disclose coverage and gaps.",
            "nextAction": next(
                (
                    item.get("title")
                    for item in recommended_actions
                    if "budget" in _normalized_text(item.get("title") or item.get("reason") or "")
                    or "cost" in _normalized_text(item.get("title") or item.get("reason") or "")
                    or "estimate" in _normalized_text(item.get("title") or item.get("reason") or "")
                ),
                None,
            ),
            "sourceIds": money_impact.get("sourceIds", [])[:12],
        },
        {
            "key": "operating-promises-made",
            "section": "commitments",
            "rank": 6,
            "type": "task",
            "title": "Promises made",
            "summary": " ".join(item.get("title", "") for item in promises_made) or "No promises were explicit.",
            "why": "Captures commitments made in meetings, Teams, and email before they disappear into raw comms.",
            "nextAction": "Confirm each promise has an owner, due date, and current status."
            if promises_made
            else None,
            "sourceIds": list({sid for item in promises_made for sid in item.get("sourceIds", [])})[:12],
        },
        {
            "key": "operating-recommended-actions",
            "section": "next_actions",
            "rank": 7,
            "type": "open_question",
            "title": "Recommended actions",
            "summary": " ".join(
                f"{item.get('title', '')}: {item.get('reason', '')}".strip(": ")
                for item in recommended_actions
            )
            or "No recommended actions were explicit.",
            "why": "Sets the next-action baseline for the assistant.",
            "nextAction": (recommended_actions[0] or {}).get("title") if recommended_actions else None,
            "sourceIds": list({sid for item in recommended_actions for sid in item.get("sourceIds", [])})[:12],
        },
        {
            "key": "operating-project-controls",
            "section": "controls",
            "rank": 8,
            "type": "task",
            "title": "Project controls and tasks",
            "summary": " ".join(item.get("title", "") for item in controls.get("tasks", [])) or "No task/control items were explicit.",
            "why": "Links available task/control records into the current packet.",
            "nextAction": (controls.get("tasks", [{}])[0] or {}).get("title")
            if controls.get("tasks")
            else None,
            "sourceIds": list({sid for item in controls.get("tasks", []) for sid in item.get("sourceIds", [])})[:12],
        },
        {
            "key": "operating-schedule-procurement",
            "section": "schedule",
            "rank": 10,
            "type": "schedule_risk",
            "title": "Schedule and procurement",
            "summary": (summary.get("scheduleAndProcurement") or {}).get("summary") or "",
            "why": "Schedule and procurement claims must be tied to source evidence.",
            "nextAction": next(
                (
                    item.get("title")
                    for item in recommended_actions
                    if "schedule" in _normalized_text(item.get("title") or item.get("reason") or "")
                    or "permit" in _normalized_text(item.get("title") or item.get("reason") or "")
                    or "approval" in _normalized_text(item.get("title") or item.get("reason") or "")
                ),
                None,
            ),
            "sourceIds": (summary.get("scheduleAndProcurement") or {}).get("sourceIds", [])[:12],
        },
    ]
    document_card = _document_intelligence_card(source_set or {})
    if document_card:
        cards.append(document_card)
    return [card for card in cards if card["sourceIds"]]


def _source_coverage_card(source_set: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    sources = source_set.get("sources") or []
    selected: List[str] = []
    seen_categories = set()

    for source in sources:
        category = source.get("category")
        source_id = source.get("id")
        if not category or not source_id or category in seen_categories:
            continue
        selected.append(source_id)
        seen_categories.add(category)

    if not selected:
        return None

    covered_labels = [
        row.get("label") or row.get("category")
        for row in source_set.get("coverage") or []
        if row.get("availableCount", 0) > 0
    ]

    return {
        "key": "operating-source-coverage",
        "section": "source_coverage",
        "rank": 10,
        "type": "project_update",
        "title": "Available project source coverage",
        "summary": (
            "Project intelligence has available source records across: "
            f"{', '.join(str(label) for label in covered_labels) if covered_labels else 'available source categories'}."
        ),
        "why": "Keeps the packet audit truthful even when the summary model does not cite every available source category.",
        "nextAction": "Use source coverage only as audit context; rely on the strategic report for recommendations.",
        "sourceIds": selected[:16],
    }


def refresh_project_operating_packet(
    supabase: Any,
    project_id: int,
    *,
    model: Optional[str] = None,
) -> Dict[str, Any]:
    target = ensure_operating_target(supabase, int(project_id))
    source_set = build_project_operating_sources(supabase, int(project_id))
    summary = generate_operating_summary(source_set, model=model)
    generated_at = _utc_now()
    source_by_id = {source["id"]: source for source in source_set["sources"]}
    latest_dates = sorted(s["capturedAt"] for s in source_set["sources"] if s.get("capturedAt"))
    confidence = summary.get("confidence") if summary.get("confidence") in {"low", "medium", "high"} else "medium"
    cards = _card_defs(summary, source_set)
    coverage_card = _source_coverage_card(source_set)
    if coverage_card:
        cards.append(coverage_card)
    linked_evidence_count = sum(len(card["sourceIds"]) for card in cards)
    source_quality_counts = _quality_counts(source_set["sources"])
    recommended_actions = summary.get("recommendedActions") or summary.get("recommendedFocus") or []
    risks = summary.get("risks") or []
    what_changed = summary.get("whatChanged") or summary.get("recentChanges") or []
    open_decisions = summary.get("openDecisions") or summary.get("openQuestions") or []
    promises_made = summary.get("promisesMade") or []

    source_coverage = {
        "freshnessStatus": "fresh",
        "operatingSummaryGeneratedAt": generated_at,
        "operatingSummarySourceCount": len(source_set["sources"]),
        "operatingSummarySelectedSourceCount": len(source_set["sources"]),
        "categoryCoverage": source_set["coverage"],
        "documentIntelligence": source_set.get("documentIntelligence") or {},
        "latestSourceAt": latest_dates[-1] if latest_dates else None,
        "linkedEvidenceCount": linked_evidence_count,
        "sourceQualityCounts": source_quality_counts,
        "evidenceQuality": summary.get("evidenceQuality") or {},
        "qualityGate": {
            "status": "passed",
            "reason": "Operating summary passed raw-source and metadata-only synthesis checks.",
        },
        "gaps": list(summary.get("dataGaps") or []),
    }
    payload = {
        "target_id": target["id"],
        "packet_type": "current",
        "packet_version": PACKET_VERSION,
        "generated_at": generated_at,
        "covered_start_at": latest_dates[0] if latest_dates else None,
        "covered_end_at": latest_dates[-1] if latest_dates else None,
        "freshness_status": "fresh",
        "executive_summary": _truncate(summary.get("headline") or "Project operating summary", 1000),
        "current_status": _truncate(summary.get("currentExecutiveRead") or summary.get("context") or "", 2000),
        "strategic_read": _truncate(
            " ".join(
                [
                    summary.get("context") or "",
                    "What changed: " + "; ".join(item.get("title", "") for item in what_changed[:4]) if what_changed else "",
                    "Risks: " + "; ".join(item.get("title", "") for item in risks[:4]) if risks else "",
                ]
            ),
            1600,
        ),
        "why_it_matters": _truncate(
            " ".join(item.get("title", "") for item in recommended_actions[:5]) or summary.get("context") or "",
            1600,
        ),
        "recommended_next_moves": [item.get("title") for item in recommended_actions if item.get("title")][:8],
        "confidence_summary": {
            "overall": confidence,
            "status": confidence,
            "financialExposure": confidence if (summary.get("financialPosition") or {}).get("summary") else "low",
            "changeManagement": confidence if what_changed else "low",
            "followUps": confidence if recommended_actions or promises_made else "low",
            "reason": f"Structured operating summary generated from {len(source_set['sources'])} source capsules.",
        },
        "source_coverage": source_coverage,
        "review_queue_count": len(summary.get("dataGaps") or []),
        "stale_item_count": 0,
        "packet_json": {
            "schema": "project_operating_packet_v1",
            "target": {"id": target["id"], "projectId": int(project_id), "name": source_set.get("projectName")},
            "generatedAt": generated_at,
            "sourceSet": source_set,
            "summary": summary,
            "strategicReport": {
                "whatChanged": what_changed,
                "risks": risks,
                "openDecisions": open_decisions,
                "moneyImpact": summary.get("moneyImpact") or summary.get("financialPosition") or {},
                "promisesMade": promises_made,
                "recommendedActions": recommended_actions,
                "documentIntelligence": source_set.get("documentIntelligence") or {},
                "evidenceQuality": summary.get("evidenceQuality") or {},
            },
        },
        "compiler_version": COMPILER_VERSION,
    }
    existing_packet = _single_row(
        supabase.table("intelligence_packets")
        .select("id")
        .eq("target_id", target["id"])
        .eq("packet_type", "current")
        .limit(1)
        .execute()
    )
    if existing_packet:
        packet = _single_row(
            supabase.table("intelligence_packets")
            .update(payload)
            .eq("id", existing_packet["id"])
            .execute()
        ) or {**existing_packet, **payload}
    else:
        packet = _single_row(supabase.table("intelligence_packets").insert(payload).execute()) or payload

    inserted_cards = []
    for card in cards:
        card_sources = [_find_source(source_by_id, sid) for sid in card["sourceIds"]]
        card_sources = [source for source in card_sources if source]
        first_source = card_sources[0] if card_sources else None
        card_payload = {
            "primary_target_id": target["id"],
            "title": _truncate(card["title"], 180),
            "card_type": card["type"],
            "summary": _truncate(card["summary"], 1600),
            "why_it_matters": _truncate(card["why"] or "", 1000),
            "current_status": "open",
            "confidence": confidence,
            "attribution_status": "approved" if confidence != "low" else "needs_review",
            "next_action": _truncate(card.get("nextAction") or "", 600) or None,
            "first_seen_at": (first_source or {}).get("capturedAt") or generated_at,
            "last_seen_at": latest_dates[-1] if latest_dates else generated_at,
            "stale_after": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "source_count": len(card_sources),
            "compiler_version": COMPILER_VERSION,
            "metadata": {
                "key": card["key"],
                "sourceIds": card["sourceIds"],
                "generatedFrom": "project_operating_summary",
                "operatingSummaryGeneratedAt": generated_at,
            },
        }
        inserted_card = _single_row(supabase.table("insight_cards").insert(card_payload).execute())
        if not inserted_card:
            raise RuntimeError(f"Failed to create operating summary card {card['key']}")
        inserted_cards.append({**inserted_card, "_section": card["section"], "_rank": card["rank"], "_sources": card_sources})
        supabase.table("insight_card_targets").insert(
            {
                "insight_card_id": inserted_card["id"],
                "target_id": target["id"],
                "relationship": "primary",
                "confidence": confidence,
                "attribution_status": "approved" if confidence != "low" else "needs_review",
                "matched_terms": [source_set.get("projectName") or f"project {project_id}"],
                "reason": "Generated from structured project operating summary refresh.",
            }
        ).execute()
        evidence_rows = []
        for source in card_sources:
            evidence_rows.append(
                {
                    "insight_card_id": inserted_card["id"],
                    "source_document_id": source["recordId"] if source["category"] in {"meeting", "email", "teams", "document"} else None,
                    "source_message_id": source["id"],
                    "source_type": source["type"],
                    "source_title": source.get("title") or source["recordId"],
                    "source_occurred_at": source.get("capturedAt"),
                    "participants": [],
                    "excerpt": _truncate(source.get("text") or "", 700),
                    "summary": _truncate(card["summary"], 700),
                    "relevance_reason": f"Supports {card['title']}.",
                    "evidence_role": "operating_summary_source",
                    "confidence": confidence,
                }
            )
        if evidence_rows:
            supabase.table("insight_card_evidence").insert(evidence_rows).execute()

    supabase.table("intelligence_packet_cards").delete().eq("packet_id", packet["id"]).execute()
    if inserted_cards:
        supabase.table("intelligence_packet_cards").insert(
            [
                {
                    "packet_id": packet["id"],
                    "insight_card_id": card["id"],
                    "section": card["_section"],
                    "rank": card["_rank"],
                    "included_reason": "Generated from structured project operating summary refresh.",
                }
                for card in inserted_cards
            ]
        ).execute()

    return {
        "status": "refreshed",
        "target_id": target["id"],
        "project_id": int(project_id),
        "packet_id": packet["id"],
        "card_count": len(inserted_cards),
        "linked_evidence_count": linked_evidence_count,
        "available_sources": len(source_set["sources"]),
        "task_source_count": len([source for source in source_set["sources"] if source["category"] == "task"]),
        "compiler_version": COMPILER_VERSION,
        "packet_version": PACKET_VERSION,
        "headline": summary.get("headline"),
        "confidence": confidence,
    }
