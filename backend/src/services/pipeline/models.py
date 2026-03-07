"""Shared dataclasses for the RAG ingestion pipeline."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class TranscriptLine:
    index: int
    timestamp: str
    speaker: str
    text: str


@dataclass
class ParsedMeeting:
    title: str
    started_at: Optional[str]
    participants: List[str]
    transcript_lines: List[TranscriptLine]
    fireflies_summary: str  # raw summary from Fireflies header


@dataclass
class MeetingSegment:
    segment_index: int
    title: str
    start_index: int
    end_index: int
    summary: str
    decisions: List[str]
    risks: List[str]
    tasks: List[str]
    summary_embedding: Optional[List[float]] = None


@dataclass
class DocumentChunk:
    content: str
    chunk_index: int
    segment_index: int
    doc_type: str  # "chunk" | "segment_summary" | "meeting_summary"
    content_hash: str
    embedding: Optional[List[float]] = None


@dataclass
class StructuredItem:
    description: str
    embedding: Optional[List[float]] = None


@dataclass
class DecisionItem(StructuredItem):
    rationale: Optional[str] = None
    owner: Optional[str] = None


@dataclass
class RiskItem(StructuredItem):
    category: Optional[str] = None
    likelihood: Optional[str] = None
    impact: Optional[str] = None
    owner: Optional[str] = None


@dataclass
class TaskItem(StructuredItem):
    assignee: Optional[str] = None
    assignee_email: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = None


@dataclass
class OpportunityItem(StructuredItem):
    type: Optional[str] = None
    owner: Optional[str] = None


@dataclass
class StructuredData:
    decisions: List[DecisionItem] = field(default_factory=list)
    risks: List[RiskItem] = field(default_factory=list)
    tasks: List[TaskItem] = field(default_factory=list)
    opportunities: List[OpportunityItem] = field(default_factory=list)
