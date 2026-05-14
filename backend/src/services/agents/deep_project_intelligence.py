"""Backend-only Deep Agents project intelligence pilot.

Slice 1 deliberately proves the typed orchestration contract before adding
Deep Agents as a runtime dependency. The service fails loudly on missing project
context and returns explicit source coverage gaps instead of generic synthesis.
"""

from __future__ import annotations

import os
import time
from typing import Any, Callable, Dict, Iterable, List, Optional, Sequence

from src.services.agents.deep_project_intelligence_contracts import (
    DeepExecutiveIntelligenceRequest,
    DeepExecutiveIntelligenceResponse,
    DeepOrganization,
    DeepProject,
    EvidenceItem,
    DeepProjectIntelligenceRequest,
    DeepProjectIntelligenceResponse,
    RecommendedAction,
    SourceCoverage,
    ToolTraceItem,
)


REQUIRED_SOURCE_TYPES = (
    "packet",
    "teams",
    "meetings",
    "emails",
    "documents",
    "financials",
    "schedule",
    "rfi",
    "submittal",
)

REQUIRED_EXECUTIVE_SOURCE_TYPES = (
    "executive_briefing",
    "tasks",
    "emails",
    "teams",
    "meetings",
    "documents",
    "projects",
    "financials",
    "schedule",
)

DEEP_AGENT_RUNTIME_MODE = "deep_agents"
CONTRACT_SPIKE_MODE = "contract_spike"
AI_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1"


class _SourceProbe:
    def __init__(
        self,
        source_type: str,
        table: str,
        *,
        timestamp_fields: Sequence[str],
        title_fields: Sequence[str],
        source_id_fields: Sequence[str],
        local_filter: Optional[Callable[[Dict[str, Any]], bool]] = None,
    ) -> None:
        self.source_type = source_type
        self.table = table
        self.timestamp_fields = tuple(timestamp_fields)
        self.title_fields = tuple(title_fields)
        self.source_id_fields = tuple(source_id_fields)
        self.local_filter = local_filter


def _field_text(row: Dict[str, Any], fields: Iterable[str]) -> str:
    for field in fields:
        value = row.get(field)
        if value is not None and str(value).strip():
            return str(value).strip()
    return ""


def _source_id(row: Dict[str, Any], fields: Iterable[str], fallback: str) -> str:
    value = _field_text(row, fields)
    return value or fallback


def _latest_timestamp(rows: Sequence[Dict[str, Any]], fields: Sequence[str]) -> Optional[str]:
    values = [
        str(row.get(field))
        for row in rows
        for field in fields
        if row.get(field)
    ]
    return max(values) if values else None


def _matches_any(row: Dict[str, Any], *terms: str) -> bool:
    haystack = " ".join(
        str(row.get(field) or "")
        for field in ("source", "source_system", "type", "category", "file_name", "title")
    ).lower()
    return any(term in haystack for term in terms)


SOURCE_PROBES = (
    _SourceProbe(
        "teams",
        "document_metadata",
        timestamp_fields=("source_last_modified_at", "captured_at", "date", "created_at"),
        title_fields=("title", "file_name", "summary"),
        source_id_fields=("id", "source_item_id", "fireflies_id"),
        local_filter=lambda row: _matches_any(row, "teams", "team_message", "chat"),
    ),
    _SourceProbe(
        "meetings",
        "document_metadata",
        timestamp_fields=("date", "captured_at", "created_at"),
        title_fields=("title", "summary", "file_name"),
        source_id_fields=("id", "fireflies_id"),
        local_filter=lambda row: _matches_any(row, "fireflies", "meeting", "transcript"),
    ),
    _SourceProbe(
        "emails",
        "project_emails",
        timestamp_fields=("received_at", "sent_at", "updated_at", "created_at"),
        title_fields=("subject",),
        source_id_fields=("graph_message_id", "id"),
    ),
    _SourceProbe(
        "documents",
        "project_documents",
        timestamp_fields=("source_last_modified_at", "last_synced_at", "updated_at", "created_at"),
        title_fields=("title", "file_name"),
        source_id_fields=("source_item_id", "id"),
    ),
    _SourceProbe(
        "financials",
        "acumatica_project_budgets",
        timestamp_fields=("last_modified_at", "acumatica_sync_at", "updated_at", "created_at"),
        title_fields=("description", "cost_code", "external_key"),
        source_id_fields=("external_key", "id"),
    ),
    _SourceProbe(
        "schedule",
        "schedule_tasks",
        timestamp_fields=("finish_date", "start_date", "updated_at", "created_at"),
        title_fields=("name", "wbs_code"),
        source_id_fields=("id",),
    ),
    _SourceProbe(
        "rfi",
        "rfis",
        timestamp_fields=("updated_at", "created_at", "date_initiated", "due_date"),
        title_fields=("subject", "question"),
        source_id_fields=("id", "number"),
    ),
    _SourceProbe(
        "submittal",
        "submittals",
        timestamp_fields=("updated_at", "created_at", "submission_date", "sent_date"),
        title_fields=("title", "submittal_number"),
        source_id_fields=("id", "submittal_number"),
    ),
)

EXECUTIVE_SOURCE_PROBES = (
    _SourceProbe(
        "executive_briefing",
        "daily_recaps",
        timestamp_fields=("recap_date", "approved_at", "sent_at", "created_at"),
        title_fields=("recap_kind", "workflow_status"),
        source_id_fields=("id",),
    ),
    _SourceProbe(
        "tasks",
        "executive_briefing_follow_ups",
        timestamp_fields=("due_date", "completed_at", "created_at", "updated_at"),
        title_fields=("title", "summary", "section"),
        source_id_fields=("id", "source_id"),
    ),
    _SourceProbe(
        "emails",
        "project_emails",
        timestamp_fields=("received_at", "sent_at", "updated_at", "created_at"),
        title_fields=("subject",),
        source_id_fields=("graph_message_id", "id"),
    ),
    _SourceProbe(
        "teams",
        "document_metadata",
        timestamp_fields=("source_last_modified_at", "captured_at", "date", "created_at"),
        title_fields=("title", "file_name", "summary"),
        source_id_fields=("id", "source_item_id", "fireflies_id"),
        local_filter=lambda row: _matches_any(row, "teams", "team_message", "chat"),
    ),
    _SourceProbe(
        "meetings",
        "document_metadata",
        timestamp_fields=("date", "captured_at", "created_at"),
        title_fields=("title", "summary", "file_name"),
        source_id_fields=("id", "fireflies_id"),
        local_filter=lambda row: _matches_any(row, "fireflies", "meeting", "transcript"),
    ),
    _SourceProbe(
        "documents",
        "project_documents",
        timestamp_fields=("source_last_modified_at", "last_synced_at", "updated_at", "created_at"),
        title_fields=("title", "file_name"),
        source_id_fields=("source_item_id", "id"),
    ),
    _SourceProbe(
        "projects",
        "projects",
        timestamp_fields=("updated_at", "created_at"),
        title_fields=("name", "project_name", "title"),
        source_id_fields=("id",),
    ),
    _SourceProbe(
        "financials",
        "acumatica_project_budgets",
        timestamp_fields=("last_modified_at", "acumatica_sync_at", "updated_at", "created_at"),
        title_fields=("description", "cost_code", "external_key"),
        source_id_fields=("external_key", "id"),
    ),
    _SourceProbe(
        "schedule",
        "schedule_tasks",
        timestamp_fields=("finish_date", "start_date", "updated_at", "created_at"),
        title_fields=("name", "wbs_code"),
        source_id_fields=("id",),
    ),
)


def _clean_project_name(project: Dict[str, Any], project_id: int) -> str:
    raw_name = project.get("name") or project.get("project_name") or project.get("title")
    name = str(raw_name or "").strip()
    return name or f"Project {project_id}"


def _get_project(store: Any, project_id: int) -> Optional[Dict[str, Any]]:
    get_project = getattr(store, "get_project", None)
    if not callable(get_project):
        return None
    project = get_project(project_id)
    return project if isinstance(project, dict) else None


def _project_lookup_failure_response(
    request: DeepProjectIntelligenceRequest,
    *,
    duration_ms: int,
    answer: str,
    notes: str,
    detail: str,
) -> DeepProjectIntelligenceResponse:
    return DeepProjectIntelligenceResponse(
        answer=answer,
        confidence="low",
        intent="project_status_risk",
        project=DeepProject(id=request.project_id, name=f"Project {request.project_id}"),
        sourcesChecked=[
            SourceCoverage(
                sourceType="project",
                status="failed",
                recordCount=0,
                latestSourceAt=None,
                notes=notes,
            )
        ],
        evidence=[],
        recommendedActions=[],
        toolTrace=[
            ToolTraceItem(
                agent="project-intelligence-orchestrator",
                tool="project_lookup",
                status="failed",
                durationMs=duration_ms,
                detail=detail,
            )
        ],
        memoryCandidates=[],
        orchestrator="deep-agents-project-intelligence",
        mode=CONTRACT_SPIKE_MODE,
    )


def _missing_sources() -> List[SourceCoverage]:
    return [
        SourceCoverage(
            sourceType=source_type,
            status="missing",
            recordCount=0,
            latestSourceAt=None,
            notes=(
                "Slice 1 contract spike has not wired this read tool yet; "
                "future slices must return checked, stale, missing, or failed."
            ),
        )
        for source_type in REQUIRED_SOURCE_TYPES
    ]


def _store_client(store: Any) -> Optional[Any]:
    client = getattr(store, "_client", None) or getattr(store, "client", None)
    return client if callable(getattr(client, "table", None)) else None


def _response_rows(response: Any) -> List[Dict[str, Any]]:
    data = getattr(response, "data", None)
    return data if isinstance(data, list) else []


def _query_project_rows(
    client: Any,
    table: str,
    project_id: int,
    *,
    limit: int = 100,
    order_by: Optional[str] = None,
) -> List[Dict[str, Any]]:
    query = client.table(table).select("*").eq("project_id", project_id).limit(limit)
    if order_by and hasattr(query, "order"):
        query = query.order(order_by, desc=True)
    return _response_rows(query.execute())


def _query_recent_rows(
    client: Any,
    table: str,
    *,
    limit: int = 100,
    order_by: Optional[str] = None,
) -> List[Dict[str, Any]]:
    query = client.table(table).select("*").limit(limit)
    if order_by and hasattr(query, "order"):
        query = query.order(order_by, desc=True)
    return _response_rows(query.execute())


def _source_coverage_from_rows(
    probe: _SourceProbe,
    rows: List[Dict[str, Any]],
) -> SourceCoverage:
    latest = _latest_timestamp(rows, probe.timestamp_fields)
    return SourceCoverage(
        sourceType=probe.source_type,
        status="checked" if rows else "missing",
        recordCount=len(rows),
        latestSourceAt=latest,
        notes=(
            f"Read-only probe found {len(rows)} {probe.source_type} row(s) "
            f"from `{probe.table}`."
            if rows
            else f"No {probe.source_type} rows found in `{probe.table}` for this project."
        ),
    )


def _evidence_from_rows(
    probe: _SourceProbe,
    rows: Sequence[Dict[str, Any]],
) -> List[EvidenceItem]:
    evidence: List[EvidenceItem] = []
    for index, row in enumerate(rows[:2]):
        title = _field_text(row, probe.title_fields) or f"{probe.source_type.title()} source"
        excerpt = _field_text(row, ("summary", "overview", "description", "question", "content", "body_text"))
        evidence.append(
            EvidenceItem(
                sourceType=probe.source_type,
                sourceId=_source_id(row, probe.source_id_fields, f"{probe.source_type}-{index}"),
                title=title,
                excerpt=excerpt[:500] if excerpt else f"Read-only {probe.source_type} source row.",
                occurredAt=_latest_timestamp([row], probe.timestamp_fields),
                confidence="medium",
            )
        )
    return evidence


def _packet_coverage(client: Any, project_id: int) -> tuple[SourceCoverage, List[EvidenceItem], ToolTraceItem]:
    started = time.perf_counter()
    try:
        target_rows = _query_project_rows(
            client,
            "intelligence_targets",
            project_id,
            limit=10,
            order_by="updated_at",
        )
        target_ids = [row.get("id") for row in target_rows if row.get("id")]
        packet_rows: List[Dict[str, Any]] = []
        if target_ids:
            packet_rows = _response_rows(
                client.table("intelligence_packets")
                .select("*")
                .in_("target_id", target_ids)
                .order("generated_at", desc=True)
                .limit(25)
                .execute()
            )
        latest = _latest_timestamp(packet_rows, ("generated_at", "created_at", "covered_end_at"))
        coverage = SourceCoverage(
            sourceType="packet",
            status="checked" if packet_rows else "missing",
            recordCount=len(packet_rows),
            latestSourceAt=latest,
            notes=(
                f"Found {len(packet_rows)} current intelligence packet row(s) "
                f"across {len(target_ids)} target(s)."
                if packet_rows
                else f"No intelligence packet rows found across {len(target_ids)} target(s)."
            ),
        )
        evidence = [
            EvidenceItem(
                sourceType="packet",
                sourceId=str(row.get("id") or f"packet-{index}"),
                title=str(row.get("packet_type") or "Project intelligence packet"),
                excerpt=str(row.get("executive_summary") or row.get("strategic_read") or "")[:500]
                or "Stored project intelligence packet.",
                occurredAt=str(row.get("generated_at") or row.get("created_at") or ""),
                confidence="medium",
            )
            for index, row in enumerate(packet_rows[:2])
        ]
        trace = ToolTraceItem(
            agent="project-intelligence-orchestrator",
            tool="packet_reader",
            status="success",
            durationMs=max(0, int((time.perf_counter() - started) * 1000)),
            detail=coverage.notes,
        )
        return coverage, evidence, trace
    except Exception as exc:
        coverage = SourceCoverage(
            sourceType="packet",
            status="failed",
            recordCount=0,
            latestSourceAt=None,
            notes=f"Packet read-only probe failed: {exc}",
        )
        trace = ToolTraceItem(
            agent="project-intelligence-orchestrator",
            tool="packet_reader",
            status="failed",
            durationMs=max(0, int((time.perf_counter() - started) * 1000)),
            detail=str(exc),
        )
        return coverage, [], trace


def _source_probe_coverage(
    client: Any,
    project_id: int,
    probe: _SourceProbe,
) -> tuple[SourceCoverage, List[EvidenceItem], ToolTraceItem]:
    started = time.perf_counter()
    try:
        rows = _query_project_rows(
            client,
            probe.table,
            project_id,
            limit=100,
            order_by=probe.timestamp_fields[0] if probe.timestamp_fields else None,
        )
        if probe.local_filter:
            rows = [row for row in rows if probe.local_filter(row)]
        coverage = _source_coverage_from_rows(probe, rows)
        trace = ToolTraceItem(
            agent="project-intelligence-orchestrator",
            tool=f"{probe.source_type}_reader",
            status="success",
            durationMs=max(0, int((time.perf_counter() - started) * 1000)),
            detail=coverage.notes,
        )
        return coverage, _evidence_from_rows(probe, rows), trace
    except Exception as exc:
        coverage = SourceCoverage(
            sourceType=probe.source_type,
            status="failed",
            recordCount=0,
            latestSourceAt=None,
            notes=f"{probe.source_type} read-only probe failed: {exc}",
        )
        trace = ToolTraceItem(
            agent="project-intelligence-orchestrator",
            tool=f"{probe.source_type}_reader",
            status="failed",
            durationMs=max(0, int((time.perf_counter() - started) * 1000)),
            detail=str(exc),
        )
        return coverage, [], trace


def _executive_source_probe_coverage(
    client: Any,
    probe: _SourceProbe,
) -> tuple[SourceCoverage, List[EvidenceItem], ToolTraceItem]:
    started = time.perf_counter()
    try:
        rows = _query_recent_rows(
            client,
            probe.table,
            limit=100,
            order_by=probe.timestamp_fields[0] if probe.timestamp_fields else None,
        )
        if probe.local_filter:
            rows = [row for row in rows if probe.local_filter(row)]
        coverage = _source_coverage_from_rows(probe, rows)
        coverage.notes = (
            f"Read-only executive probe found {len(rows)} {probe.source_type} row(s) "
            f"from `{probe.table}`."
            if rows
            else f"No {probe.source_type} rows found in `{probe.table}` for the executive briefing."
        )
        trace = ToolTraceItem(
            agent="executive-intelligence-orchestrator",
            tool=f"{probe.source_type}_reader",
            status="success",
            durationMs=max(0, int((time.perf_counter() - started) * 1000)),
            detail=coverage.notes,
        )
        return coverage, _evidence_from_rows(probe, rows), trace
    except Exception as exc:
        coverage = SourceCoverage(
            sourceType=probe.source_type,
            status="failed",
            recordCount=0,
            latestSourceAt=None,
            notes=f"{probe.source_type} executive read-only probe failed: {exc}",
        )
        trace = ToolTraceItem(
            agent="executive-intelligence-orchestrator",
            tool=f"{probe.source_type}_reader",
            status="failed",
            durationMs=max(0, int((time.perf_counter() - started) * 1000)),
            detail=str(exc),
        )
        return coverage, [], trace


def _collect_source_coverage(
    store: Any,
    project_id: int,
) -> tuple[List[SourceCoverage], List[EvidenceItem], List[ToolTraceItem]]:
    client = _store_client(store)
    if client is None:
        return _missing_sources(), [], [
            ToolTraceItem(
                agent="project-intelligence-orchestrator",
                tool="source_client",
                status="skipped",
                durationMs=0,
                detail="No Supabase client was available on the injected store.",
            )
        ]

    sources: List[SourceCoverage] = []
    evidence: List[EvidenceItem] = []
    traces: List[ToolTraceItem] = []

    packet_coverage, packet_evidence, packet_trace = _packet_coverage(client, project_id)
    sources.append(packet_coverage)
    evidence.extend(packet_evidence)
    traces.append(packet_trace)

    for probe in SOURCE_PROBES:
        coverage, probe_evidence, trace = _source_probe_coverage(client, project_id, probe)
        sources.append(coverage)
        evidence.extend(probe_evidence)
        traces.append(trace)

    return sources, evidence[:12], traces


def _missing_executive_sources() -> List[SourceCoverage]:
    return [
        SourceCoverage(
            sourceType=source_type,
            status="missing",
            recordCount=0,
            latestSourceAt=None,
            notes="No Supabase client was available to run the executive source probe.",
        )
        for source_type in REQUIRED_EXECUTIVE_SOURCE_TYPES
    ]


def _collect_executive_source_coverage(
    store: Any,
) -> tuple[List[SourceCoverage], List[EvidenceItem], List[ToolTraceItem]]:
    client = _store_client(store)
    if client is None:
        return _missing_executive_sources(), [], [
            ToolTraceItem(
                agent="executive-intelligence-orchestrator",
                tool="source_client",
                status="skipped",
                durationMs=0,
                detail="No Supabase client was available on the injected store.",
            )
        ]

    sources: List[SourceCoverage] = []
    evidence: List[EvidenceItem] = []
    traces: List[ToolTraceItem] = []

    for probe in EXECUTIVE_SOURCE_PROBES:
        coverage, probe_evidence, trace = _executive_source_probe_coverage(client, probe)
        sources.append(coverage)
        evidence.extend(probe_evidence)
        traces.append(trace)

    return sources, evidence[:16], traces


def _recommended_actions(sources: Sequence[SourceCoverage]) -> List[RecommendedAction]:
    failed = [source.source_type for source in sources if source.status == "failed"]
    missing = [source.source_type for source in sources if source.status == "missing"]
    if failed:
        return [
            RecommendedAction(
                label="Fix failed source probes before synthesis",
                ownerRole="AI/backend",
                reason=f"These read-only source probes failed: {', '.join(failed)}.",
                sourceId=None,
            )
        ]
    if missing:
        return [
            RecommendedAction(
                label="Wire or backfill missing source categories",
                ownerRole="AI/backend",
                reason=f"These source categories have no project rows yet: {', '.join(missing)}.",
                sourceId=None,
            )
        ]
    return [
        RecommendedAction(
            label="Add Deep Agents synthesis on top of checked sources",
            ownerRole="AI/backend",
            reason="All required source probes returned project rows.",
            sourceId=None,
        )
    ]


def _recommended_executive_actions(sources: Sequence[SourceCoverage]) -> List[RecommendedAction]:
    failed = [source.source_type for source in sources if source.status == "failed"]
    missing = [source.source_type for source in sources if source.status == "missing"]
    if failed:
        return [
            RecommendedAction(
                label="Fix failed executive source probes before synthesis",
                ownerRole="AI/backend",
                reason=f"These executive source probes failed: {', '.join(failed)}.",
                sourceId=None,
            )
        ]
    if missing:
        return [
            RecommendedAction(
                label="Backfill missing executive source categories",
                ownerRole="Operations",
                reason=f"These source categories have no rows for the business briefing: {', '.join(missing)}.",
                sourceId=None,
            )
        ]
    return [
        RecommendedAction(
            label="Use executive Deep Agents packet for business-wide chat answers",
            ownerRole="AI/product",
            reason="All required executive source probes returned rows.",
            sourceId=None,
        )
    ]


def _deep_agent_prompt(
    request: DeepProjectIntelligenceRequest,
    project: DeepProject,
    sources: Sequence[SourceCoverage],
    evidence: Sequence[EvidenceItem],
) -> str:
    source_lines = [
        (
            f"- {source.source_type}: status={source.status}, "
            f"records={source.record_count}, latest={source.latest_source_at or 'unknown'}"
        )
        for source in sources
    ]
    evidence_lines = [
        (
            f"- [{item.source_type}] {item.title} "
            f"(id={item.source_id}, occurred={item.occurred_at or 'unknown'}): {item.excerpt}"
        )
        for item in evidence[:8]
    ]
    return "\n".join(
        [
            f"Question: {request.question}",
            f"Project: {project.name} (id={project.id})",
            "",
            "Source coverage:",
            *source_lines,
            "",
            "Evidence snippets:",
            *(evidence_lines or ["- No source evidence rows were available."]),
            "",
            "Write a concise project-status/risk synthesis for an internal construction operator.",
            "Do not claim checked sources are available when source coverage says missing or failed.",
            "Do not mention RAG, embeddings, or implementation internals.",
        ]
    )


def _deep_agent_executive_prompt(
    request: DeepExecutiveIntelligenceRequest,
    organization: DeepOrganization,
    sources: Sequence[SourceCoverage],
    evidence: Sequence[EvidenceItem],
) -> str:
    source_lines = [
        (
            f"- {source.source_type}: status={source.status}, "
            f"records={source.record_count}, latest={source.latest_source_at or 'unknown'}"
        )
        for source in sources
    ]
    evidence_lines = [
        (
            f"- [{item.source_type}] {item.title} "
            f"(id={item.source_id}, occurred={item.occurred_at or 'unknown'}): {item.excerpt}"
        )
        for item in evidence[:10]
    ]
    return "\n".join(
        [
            f"Question: {request.question}",
            f"Organization: {organization.name}",
            "",
            "Executive source coverage:",
            *source_lines,
            "",
            "Evidence snippets:",
            *(evidence_lines or ["- No source evidence rows were available."]),
            "",
            "Write a concise business-wide executive synthesis for a construction operator.",
            "Prioritize today's meetings, urgent inbox/team follow-ups, important tasks, operational risks, and process recommendations when the evidence supports them.",
            "Do not claim checked sources are available when source coverage says missing or failed.",
            "Do not send emails, create invites, mutate tasks, or imply write actions were completed.",
            "Do not mention RAG, embeddings, or implementation internals.",
        ]
    )


def _extract_agent_text(result: Any) -> str:
    if isinstance(result, dict):
        messages = result.get("messages")
        if isinstance(messages, list) and messages:
            last = messages[-1]
            content = getattr(last, "content", None)
            if content is None and isinstance(last, dict):
                content = last.get("content")
            if isinstance(content, str):
                return content.strip()
        for key in ("output", "content", "text"):
            value = result.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    content = getattr(result, "content", None)
    if isinstance(content, str):
        return content.strip()
    return str(result or "").strip()


def _openai_model_name(model: str, *, gateway: bool) -> str:
    normalized = model.strip()
    if normalized.startswith("openai:"):
        normalized = normalized.split(":", 1)[1]
    if gateway:
        return normalized if normalized.startswith("openai/") else f"openai/{normalized}"
    return normalized.split("/", 1)[1] if normalized.startswith("openai/") else normalized


def _resolve_deep_agents_model(model: Any) -> Any:
    if not isinstance(model, str):
        return model

    gateway_key = os.getenv("AI_GATEWAY_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    if gateway_key:
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(
            model=_openai_model_name(model, gateway=True),
            api_key=gateway_key,
            base_url=AI_GATEWAY_BASE_URL,
            timeout=45,
            max_retries=1,
        )
    if openai_key:
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(
            model=_openai_model_name(model, gateway=False),
            api_key=openai_key,
            timeout=45,
            max_retries=1,
        )
    return model


def _run_deep_agents_runtime(
    request: DeepProjectIntelligenceRequest,
    project: DeepProject,
    sources: Sequence[SourceCoverage],
    evidence: Sequence[EvidenceItem],
    *,
    create_agent: Optional[Callable[..., Any]] = None,
    model: str = "openai:gpt-5.4-mini",
) -> tuple[Optional[str], ToolTraceItem]:
    started = time.perf_counter()
    try:
        if create_agent is None:
            from deepagents import create_deep_agent as create_agent
            model = _resolve_deep_agents_model(model)

        def source_coverage() -> str:
            """Return source coverage already collected by Alleato read-only probes."""
            return "\n".join(
                f"{source.source_type}: {source.status}, records={source.record_count}, latest={source.latest_source_at}"
                for source in sources
            )

        agent = create_agent(
            model=model,
            tools=[source_coverage],
            system_prompt=(
                "You are an Alleato project intelligence orchestrator. Use the "
                "provided coverage and evidence as the only factual basis. "
                "If sources are missing, say so plainly."
            ),
        )
        result = agent.invoke(
            {"messages": [{"role": "user", "content": _deep_agent_prompt(request, project, sources, evidence)}]}
        )
        text = _extract_agent_text(result)
        if not text:
            raise RuntimeError("Deep Agents runtime returned an empty response.")
        return text, ToolTraceItem(
            agent="project-intelligence-orchestrator",
            tool="deepagents_runtime",
            status="success",
            durationMs=max(0, int((time.perf_counter() - started) * 1000)),
            detail="Deep Agents runtime produced a synthesis from checked source coverage.",
        )
    except Exception as exc:
        return None, ToolTraceItem(
            agent="project-intelligence-orchestrator",
            tool="deepagents_runtime",
            status="failed",
            durationMs=max(0, int((time.perf_counter() - started) * 1000)),
            detail=str(exc),
        )


def _run_deep_agents_executive_runtime(
    request: DeepExecutiveIntelligenceRequest,
    organization: DeepOrganization,
    sources: Sequence[SourceCoverage],
    evidence: Sequence[EvidenceItem],
    *,
    create_agent: Optional[Callable[..., Any]] = None,
    model: str = "openai:gpt-5.4-mini",
) -> tuple[Optional[str], ToolTraceItem]:
    started = time.perf_counter()
    try:
        if create_agent is None:
            from deepagents import create_deep_agent as create_agent
            model = _resolve_deep_agents_model(model)

        def source_coverage() -> str:
            """Return executive source coverage already collected by Alleato read-only probes."""
            return "\n".join(
                f"{source.source_type}: {source.status}, records={source.record_count}, latest={source.latest_source_at}"
                for source in sources
            )

        agent = create_agent(
            model=model,
            tools=[source_coverage],
            system_prompt=(
                "You are an Alleato executive intelligence orchestrator. Use the "
                "provided coverage and evidence as the only factual basis. "
                "If sources are missing, stale, or failed, say so plainly. "
                "Never claim an email, invite, task, or project mutation was completed."
            ),
        )
        result = agent.invoke(
            {"messages": [{"role": "user", "content": _deep_agent_executive_prompt(request, organization, sources, evidence)}]}
        )
        text = _extract_agent_text(result)
        if not text:
            raise RuntimeError("Deep Agents runtime returned an empty executive response.")
        return text, ToolTraceItem(
            agent="executive-intelligence-orchestrator",
            tool="deepagents_runtime",
            status="success",
            durationMs=max(0, int((time.perf_counter() - started) * 1000)),
            detail="Deep Agents runtime produced an executive synthesis from checked source coverage.",
        )
    except Exception as exc:
        return None, ToolTraceItem(
            agent="executive-intelligence-orchestrator",
            tool="deepagents_runtime",
            status="failed",
            durationMs=max(0, int((time.perf_counter() - started) * 1000)),
            detail=str(exc),
        )


def build_project_status_contract_spike(
    request: DeepProjectIntelligenceRequest,
    store: Any,
    *,
    runtime: str = CONTRACT_SPIKE_MODE,
    create_agent: Optional[Callable[..., Any]] = None,
    model: str = "openai:gpt-5.4-mini",
) -> DeepProjectIntelligenceResponse:
    """Return a typed project-status packet with explicit source gaps."""

    started = time.perf_counter()
    try:
        project_row = _get_project(store, request.project_id)
    except Exception as exc:
        duration_ms = max(0, int((time.perf_counter() - started) * 1000))
        detail = f"Project lookup failed: {exc}"
        return _project_lookup_failure_response(
            request,
            duration_ms=duration_ms,
            answer=(
                f"I could not verify project {request.project_id} because the "
                f"project lookup failed: {exc}"
            ),
            notes=detail,
            detail=detail,
        )

    duration_ms = max(0, int((time.perf_counter() - started) * 1000))

    if project_row is None:
        return _project_lookup_failure_response(
            request,
            duration_ms=duration_ms,
            answer=(
                f"I could not resolve project {request.project_id}, so I did not run "
                "project intelligence synthesis."
            ),
            notes="Project lookup returned no row; synthesis is blocked.",
            detail="Project lookup returned no row.",
        )

    project = DeepProject(
        id=request.project_id,
        name=_clean_project_name(project_row, request.project_id),
    )
    sources = _missing_sources()
    source_traces: List[ToolTraceItem] = [
        ToolTraceItem(
            agent="project-intelligence-orchestrator",
            tool="source_tool_inventory",
            status="skipped",
            durationMs=0,
            detail="No read-only source probes were executed.",
        )
    ]
    evidence: List[EvidenceItem] = []
    sources, evidence, source_traces = _collect_source_coverage(store, request.project_id)
    checked_count = sum(1 for source in sources if source.status == "checked")
    failed_count = sum(1 for source in sources if source.status == "failed")
    missing_count = sum(1 for source in sources if source.status == "missing")
    confidence = "medium" if checked_count and failed_count == 0 else "low"
    runtime_answer: Optional[str] = None
    runtime_trace: Optional[ToolTraceItem] = None
    mode = CONTRACT_SPIKE_MODE

    if runtime == DEEP_AGENT_RUNTIME_MODE:
        runtime_answer, runtime_trace = _run_deep_agents_runtime(
            request,
            project,
            sources,
            evidence,
            create_agent=create_agent,
            model=model,
        )
        if runtime_answer:
            mode = DEEP_AGENT_RUNTIME_MODE
            confidence = "high" if checked_count == len(REQUIRED_SOURCE_TYPES) and failed_count == 0 else confidence

    answer = (
        runtime_answer
        or (
            f"Deep Agents project intelligence checked {checked_count} source "
            f"categor{'y' if checked_count == 1 else 'ies'} for {project.name}. "
            f"{missing_count} source categories are missing and {failed_count} failed. "
            "This endpoint is still backend-only; it returns coverage and evidence "
            "for the future orchestrator instead of loose chat synthesis."
        )
    )
    trace = [
        ToolTraceItem(
            agent="project-intelligence-orchestrator",
            tool="project_lookup",
            status="success",
            durationMs=duration_ms,
            detail="Resolved project row before contract-spike response.",
        ),
        *source_traces,
    ]
    if runtime_trace:
        trace.append(runtime_trace)

    return DeepProjectIntelligenceResponse(
        answer=answer,
        confidence=confidence,
        intent="project_status_risk",
        project=project,
        sourcesChecked=sources,
        evidence=evidence,
        recommendedActions=_recommended_actions(sources),
        toolTrace=trace,
        memoryCandidates=[],
        orchestrator="deep-agents-project-intelligence",
        mode=mode,
    )


def build_executive_briefing_contract_spike(
    request: DeepExecutiveIntelligenceRequest,
    store: Any,
    *,
    runtime: str = CONTRACT_SPIKE_MODE,
    create_agent: Optional[Callable[..., Any]] = None,
    model: str = "openai:gpt-5.4-mini",
) -> DeepExecutiveIntelligenceResponse:
    """Return a typed business-wide packet with explicit source coverage."""

    organization = DeepOrganization(name=os.getenv("DEEP_AGENTS_ORGANIZATION_NAME", "Alleato"))
    sources, evidence, source_traces = _collect_executive_source_coverage(store)
    checked_count = sum(1 for source in sources if source.status == "checked")
    failed_count = sum(1 for source in sources if source.status == "failed")
    missing_count = sum(1 for source in sources if source.status == "missing")
    confidence = "medium" if checked_count and failed_count == 0 else "low"
    runtime_answer: Optional[str] = None
    runtime_trace: Optional[ToolTraceItem] = None
    mode = CONTRACT_SPIKE_MODE

    if runtime == DEEP_AGENT_RUNTIME_MODE:
        runtime_answer, runtime_trace = _run_deep_agents_executive_runtime(
            request,
            organization,
            sources,
            evidence,
            create_agent=create_agent,
            model=model,
        )
        if runtime_answer:
            mode = DEEP_AGENT_RUNTIME_MODE
            confidence = "high" if checked_count == len(REQUIRED_EXECUTIVE_SOURCE_TYPES) and failed_count == 0 else confidence

    answer = (
        runtime_answer
        or (
            f"Deep Agents executive intelligence checked {checked_count} source "
            f"categor{'y' if checked_count == 1 else 'ies'} for {organization.name}. "
            f"{missing_count} source categories are missing and {failed_count} failed. "
            "The packet returns source coverage and evidence for business-wide chat synthesis."
        )
    )

    trace = list(source_traces)
    if runtime_trace:
        trace.append(runtime_trace)

    return DeepExecutiveIntelligenceResponse(
        answer=answer,
        confidence=confidence,
        intent="business_briefing",
        organization=organization,
        sourcesChecked=sources,
        evidence=evidence,
        recommendedActions=_recommended_executive_actions(sources),
        toolTrace=trace,
        memoryCandidates=[],
        orchestrator="deep-agents-executive-intelligence",
        mode=mode,
    )
