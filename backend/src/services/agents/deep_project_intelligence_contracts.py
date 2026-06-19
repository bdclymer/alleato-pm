"""Contracts for the Deep Agents project intelligence pilot."""

from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


Confidence = Literal["high", "medium", "low"]
ProjectStatusIntent = Literal["project_status_risk"]
ExecutiveBriefingIntent = Literal["business_briefing"]
SourceStatus = Literal["checked", "missing", "stale", "failed"]
ToolStatus = Literal["success", "failed", "skipped"]
MemoryScope = Literal["user", "project", "organization"]


class DeepProjectIntelligenceRequest(BaseModel):
    user_id: str = Field(..., min_length=1, alias="userId")
    project_id: int = Field(..., ge=1, alias="projectId")
    session_id: Optional[str] = Field(default=None, alias="sessionId")
    question: str = Field(..., min_length=1)
    approved_skill_context: Optional[str] = Field(default=None, alias="approvedSkillContext")
    mode: ProjectStatusIntent = "project_status_risk"

    model_config = {"populate_by_name": True}

    @field_validator("question")
    @classmethod
    def question_must_not_be_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("question must not be blank")
        return stripped


class DeepExecutiveIntelligenceRequest(BaseModel):
    user_id: str = Field(..., min_length=1, alias="userId")
    session_id: Optional[str] = Field(default=None, alias="sessionId")
    question: str = Field(..., min_length=1)
    approved_skill_context: Optional[str] = Field(default=None, alias="approvedSkillContext")
    mode: ExecutiveBriefingIntent = "business_briefing"

    model_config = {"populate_by_name": True}

    @field_validator("question")
    @classmethod
    def question_must_not_be_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("question must not be blank")
        return stripped


class DeepProject(BaseModel):
    id: int
    name: str


class DeepOrganization(BaseModel):
    name: str


class SourceCoverage(BaseModel):
    source_type: str = Field(..., alias="sourceType")
    status: SourceStatus
    record_count: int = Field(..., ge=0, alias="recordCount")
    latest_source_at: Optional[str] = Field(default=None, alias="latestSourceAt")
    notes: str

    model_config = {"populate_by_name": True}


class EvidenceItem(BaseModel):
    source_type: str = Field(..., alias="sourceType")
    source_id: str = Field(..., alias="sourceId")
    title: str
    excerpt: str
    occurred_at: Optional[str] = Field(default=None, alias="occurredAt")
    confidence: Confidence

    model_config = {"populate_by_name": True}


class RecommendedAction(BaseModel):
    label: str
    owner_role: str = Field(..., alias="ownerRole")
    reason: str
    source_id: Optional[str] = Field(default=None, alias="sourceId")

    model_config = {"populate_by_name": True}


class ToolTraceItem(BaseModel):
    agent: str
    tool: str
    status: ToolStatus
    duration_ms: int = Field(..., ge=0, alias="durationMs")
    detail: Optional[str] = None

    model_config = {"populate_by_name": True}


class MemoryCandidate(BaseModel):
    scope: MemoryScope
    fact: str
    requires_approval: bool = Field(..., alias="requiresApproval")

    model_config = {"populate_by_name": True}


class DeepProjectIntelligenceResponse(BaseModel):
    answer: str
    confidence: Confidence
    intent: ProjectStatusIntent
    project: DeepProject
    sources_checked: List[SourceCoverage] = Field(..., alias="sourcesChecked")
    evidence: List[EvidenceItem]
    recommended_actions: List[RecommendedAction] = Field(..., alias="recommendedActions")
    tool_trace: List[ToolTraceItem] = Field(..., alias="toolTrace")
    memory_candidates: List[MemoryCandidate] = Field(..., alias="memoryCandidates")
    approved_skill_context: Optional[str] = Field(default=None, alias="approvedSkillContext")
    orchestrator: str
    mode: Literal["contract_spike", "deep_agents"]

    model_config = {"populate_by_name": True}


class DeepExecutiveIntelligenceResponse(BaseModel):
    answer: str
    confidence: Confidence
    intent: ExecutiveBriefingIntent
    organization: DeepOrganization
    sources_checked: List[SourceCoverage] = Field(..., alias="sourcesChecked")
    evidence: List[EvidenceItem]
    recommended_actions: List[RecommendedAction] = Field(..., alias="recommendedActions")
    tool_trace: List[ToolTraceItem] = Field(..., alias="toolTrace")
    memory_candidates: List[MemoryCandidate] = Field(..., alias="memoryCandidates")
    approved_skill_context: Optional[str] = Field(default=None, alias="approvedSkillContext")
    orchestrator: str
    mode: Literal["contract_spike", "deep_agents"]

    model_config = {"populate_by_name": True}
