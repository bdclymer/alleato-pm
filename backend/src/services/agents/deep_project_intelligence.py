"""Backend-only Deep Agents project intelligence pilot.

Slice 1 deliberately proves the typed orchestration contract before adding
Deep Agents as a runtime dependency. The service fails loudly on missing project
context and returns explicit source coverage gaps instead of generic synthesis.
"""

from __future__ import annotations

import time
from typing import Any, Callable, Dict, Iterable, List, Optional, Sequence

from src.services.agents.deep_project_intelligence_contracts import (
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


def build_project_status_contract_spike(
    request: DeepProjectIntelligenceRequest,
    store: Any,
) -> DeepProjectIntelligenceResponse:
    """Return a typed project-status packet with explicit source gaps."""

    started = time.perf_counter()
    project_row = _get_project(store, request.project_id)
    duration_ms = max(0, int((time.perf_counter() - started) * 1000))

    if project_row is None:
        return DeepProjectIntelligenceResponse(
            answer=(
                f"I could not resolve project {request.project_id}, so I did not run "
                "project intelligence synthesis."
            ),
            confidence="low",
            intent="project_status_risk",
            project=DeepProject(id=request.project_id, name=f"Project {request.project_id}"),
            sourcesChecked=[
                SourceCoverage(
                    sourceType="project",
                    status="failed",
                    recordCount=0,
                    latestSourceAt=None,
                    notes="Project lookup returned no row; synthesis is blocked.",
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
                    detail="Project lookup returned no row.",
                )
            ],
            memoryCandidates=[],
            orchestrator="deep-agents-project-intelligence",
            mode="contract_spike",
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

    return DeepProjectIntelligenceResponse(
        answer=(
            f"Deep Agents project intelligence checked {checked_count} source "
            f"categor{'y' if checked_count == 1 else 'ies'} for {project.name}. "
            f"{missing_count} source categories are missing and {failed_count} failed. "
            "This endpoint is still backend-only; it returns coverage and evidence "
            "for the future orchestrator instead of loose chat synthesis."
        ),
        confidence=confidence,
        intent="project_status_risk",
        project=project,
        sourcesChecked=sources,
        evidence=evidence,
        recommendedActions=_recommended_actions(sources),
        toolTrace=[
            ToolTraceItem(
                agent="project-intelligence-orchestrator",
                tool="project_lookup",
                status="success",
                durationMs=duration_ms,
                detail="Resolved project row before contract-spike response.",
            ),
            *source_traces,
        ],
        memoryCandidates=[],
        orchestrator="deep-agents-project-intelligence",
        mode="contract_spike",
    )
