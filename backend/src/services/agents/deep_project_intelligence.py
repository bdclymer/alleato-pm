"""Backend-only Deep Agents project intelligence pilot.

Slice 1 deliberately proves the typed orchestration contract before adding
Deep Agents as a runtime dependency. The service fails loudly on missing project
context and returns explicit source coverage gaps instead of generic synthesis.
"""

from __future__ import annotations

import time
from typing import Any, Dict, List, Optional

from src.services.agents.deep_project_intelligence_contracts import (
    DeepProject,
    DeepProjectIntelligenceRequest,
    DeepProjectIntelligenceResponse,
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

    return DeepProjectIntelligenceResponse(
        answer=(
            f"Deep Agents project intelligence is contract-ready for {project.name}, "
            "but source tools are not wired in this Slice 1 spike. I am returning "
            "explicit missing-source coverage instead of a generic status answer."
        ),
        confidence="low",
        intent="project_status_risk",
        project=project,
        sourcesChecked=sources,
        evidence=[],
        recommendedActions=[
            {
                "label": "Wire read-only source tools before user-facing rollout",
                "ownerRole": "AI/backend",
                "reason": (
                    "The endpoint contract is live, but packet, Teams, meetings, "
                    "financial, and project-control tools must produce checked or "
                    "stale coverage before synthesis can be trusted."
                ),
                "sourceId": None,
            }
        ],
        toolTrace=[
            ToolTraceItem(
                agent="project-intelligence-orchestrator",
                tool="project_lookup",
                status="success",
                durationMs=duration_ms,
                detail="Resolved project row before contract-spike response.",
            ),
            ToolTraceItem(
                agent="project-intelligence-orchestrator",
                tool="source_tool_inventory",
                status="skipped",
                durationMs=0,
                detail="Slice 1 intentionally stops before Deep Agents/source-tool execution.",
            ),
        ],
        memoryCandidates=[],
        orchestrator="deep-agents-project-intelligence",
        mode="contract_spike",
    )
