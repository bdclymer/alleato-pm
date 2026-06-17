"""Utilities to ingest Fireflies markdown transcripts into Supabase."""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import sys
import unicodedata
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional
from uuid import NAMESPACE_URL, uuid4, uuid5

import requests

from ..ai_transport import get_openai_client, retry_ai_call
from ..task_assignees import TaskAssigneeResolver
from .fireflies_task_rewriter import REWRITER_PROMPT_VERSION, rewrite_action_items

# Reason: Add parent directory to Python path so supabase_helpers can be imported
# when running this script directly (not as a module). This works both when
# run directly and when imported as a module.
_parent_dir = Path(__file__).parent.parent
if str(_parent_dir) not in sys.path:
    sys.path.insert(0, str(_parent_dir))

try:  # Optional OpenAI dependency for embeddings
    from openai import OpenAI
except ImportError:  # pragma: no cover - handled in EmbeddingGenerator
    OpenAI = None  # type: ignore

from supabase_helpers import DocumentChunk, SupabaseRagStore, get_rag_write_client

TIMESTAMP_LINE = re.compile(r"^\[(?P<stamp>\d{2}:\d{2})\]\s+\*\*(?P<speaker>.+?)\*\*:\s*(?P<text>.+)$")
SECTION_PREFIX = "## "
FIREFLIES_VIEW_URL_RE = re.compile(r"fireflies\.ai\/view\/([A-Za-z0-9_-]{8,})")
logger = logging.getLogger(__name__)


@dataclass
class TranscriptSegment:
    timestamp: Optional[str]
    speaker: Optional[str]
    text: str


@dataclass
class ParsedTranscript:
    title: str
    fireflies_id: Optional[str]
    captured_at: Optional[datetime]
    attendees: List[str]
    action_items: List[str]
    overview: str
    summary: str
    transcript_segments: List[TranscriptSegment]
    raw_text: str
    # Action items paired with the owner Fireflies grouped them under, in order.
    # Each entry is {"assignee": str | None, "text": str}. Drives both the
    # assignee display in the UI and owner-aware task creation.
    action_items_structured: List[Dict[str, Optional[str]]] = None  # type: ignore[assignment]
    # Rich section fields (populated from new Fireflies markdown format)
    rich_sections: Dict[str, str] = None  # type: ignore[assignment]
    notes_topics: Dict[str, str] = None  # type: ignore[assignment]
    speakers_json: List[Dict[str, Any]] = None  # type: ignore[assignment]
    attendees_json: List[Dict[str, Any]] = None  # type: ignore[assignment]
    speaker_email_map: Dict[str, str] = None  # type: ignore[assignment]

    def __post_init__(self):
        if self.action_items_structured is None:
            self.action_items_structured = []
        if self.rich_sections is None:
            self.rich_sections = {}
        if self.notes_topics is None:
            self.notes_topics = {}
        if self.speakers_json is None:
            self.speakers_json = []
        if self.attendees_json is None:
            self.attendees_json = []
        if self.speaker_email_map is None:
            self.speaker_email_map = {}


@dataclass
class IngestionResult:
    document_id: str
    chunk_count: int
    action_item_count: int
    content_hash: str
    skipped: bool
    dry_run: bool


class EmbeddingGenerator:
    """Produces embeddings via OpenAI and fails loudly."""

    def __init__(self, model: str = "text-embedding-3-large") -> None:
        self.model = model
        if OpenAI is None:
            raise RuntimeError("openai package is required for Fireflies embeddings")

    def embed(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        from ..ai_transport import get_openai_client, retry_ai_call
        from ..pipeline.model_usage import (
            ModelUsageContext,
            assert_background_model_budget_available,
            record_model_usage,
        )

        truncated = [text[:8000] for text in texts]
        usage_context = ModelUsageContext(stage="indexed_for_rag", operation="fireflies_embedding_batch")
        assert_background_model_budget_available(
            stage=usage_context.stage,
            operation=usage_context.operation,
            model=self.model,
        )
        response = retry_ai_call(
            lambda: get_openai_client().embeddings.create(
                model=self.model,
                input=truncated,
                dimensions=3072,
            ),
            provider_name="OpenAI",
            operation="fireflies embedding batch",
        )
        embeddings = [item.embedding for item in response.data]
        record_model_usage(
            usage_context,
            model=self.model,
            response=response,
            input_items=len(texts),
            output_items=len(embeddings),
        )
        if len(embeddings) != len(texts):
            raise RuntimeError(f"expected {len(texts)} embeddings, got {len(embeddings)}")
        logger.info("[FirefliesIngestion] Embedded %d texts via OpenAI", len(texts))
        return embeddings


class FirefliesIngestionPipeline:
    """Convert Fireflies markdown exports into Supabase rows."""

    def __init__(self, store: SupabaseRagStore, embedding_model: str = "text-embedding-3-large") -> None:
        self.store = store
        self.embedder = EmbeddingGenerator(model=embedding_model)
        self._fireflies_api_url = "https://api.fireflies.ai/graphql"
        self._fireflies_api_key = os.getenv("FIREFLIES_API_KEY")
        self._project_assigner = None

    def _get_project_assigner(self):
        if self._project_assigner is not None:
            return self._project_assigner
        try:
            from .project_assignment import ProjectAssigner
        except Exception:
            return None
        self._project_assigner = ProjectAssigner(self.store._client)
        return self._project_assigner

    def _infer_project_id_from_context(
        self,
        title: str,
        participants: List[str],
        content: str,
        existing_project_id: Optional[int] = None,
    ) -> Optional[int]:
        assigner = self._get_project_assigner()
        if assigner is None:
            return None

        min_confidence = float(os.getenv("FIREFLIES_PROJECT_ASSIGN_MIN_CONFIDENCE", "0.8"))
        try:
            inferred_id, method, confidence = assigner.assign_project(
                meeting_title=title,
                participants=participants,
                content=content[:3000],
                existing_project_id=existing_project_id,
            )
        except Exception as exc:
            logger.warning("[FirefliesIngestion] Project inference failed: %s", exc)
            return None

        if inferred_id and (
            confidence >= min_confidence
            or (method == "title_correction" and confidence >= 0.93)
        ):
            logger.info(
                "[FirefliesIngestion] Auto-assigned project_id=%s via %s (confidence=%.2f)",
                inferred_id,
                method,
                confidence,
            )
            return int(inferred_id)
        return None

    @staticmethod
    def _build_summary_embedding_text(
        title: str,
        captured_at: Optional[datetime],
        summary: str,
    ) -> str:
        parts: List[str] = []
        if title:
            parts.append(f"Meeting: {title}")
        if captured_at:
            parts.append(f"Date: {captured_at.isoformat()}")
        if summary:
            parts.append(summary)
        return "\n".join(parts).strip()

    @staticmethod
    def _is_interview_title(title: Optional[str]) -> bool:
        return "interview" in str(title or "").lower()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def ingest_file(self, path: str | Path, project_id: Optional[int] = None, dry_run: bool = False) -> IngestionResult:
        file_path = Path(path)
        if not file_path.exists():
            raise FileNotFoundError(f"Transcript file not found: {file_path}")

        content = file_path.read_text(encoding="utf-8")
        return self.ingest_markdown_text(content, project_id=project_id, dry_run=dry_run)

    def ingest_markdown_text(
        self,
        content: str,
        project_id: Optional[int] = None,
        dry_run: bool = False,
        storage_url: Optional[str] = None,
        extra_metadata: Optional[Dict[str, Any]] = None,
    ) -> IngestionResult:
        parsed = self.parse_markdown(content)

        # Canonicalize Fireflies markdown from the API when legacy/minimal
        # files are ingested through file-based paths. This prevents stale or
        # reduced local exports from overwriting richer sections.
        if (
            parsed.fireflies_id
            and self._fireflies_api_key
            and self._is_likely_legacy_fireflies_markdown(content)
        ):
            try:
                transcript = self._fetch_transcript(parsed.fireflies_id)
                apps_outputs = self._fetch_apps_outputs(parsed.fireflies_id)
                content = self._format_transcript_markdown(transcript, apps_outputs)
                parsed = self.parse_markdown(content)
            except Exception:
                # Fall back to provided content if Fireflies API is unavailable.
                pass
        content_hash = hashlib.sha256(parsed.raw_text.encode("utf-8")).hexdigest()

        existing = self.store.find_document_by_hash(content_hash)
        # Exact-content re-ingests must short-circuit before any LLM or embedding
        # work. Fireflies sync polls the latest transcripts repeatedly; without
        # this guard the same meeting is reprocessed every run, re-burning task
        # rewrite, memory extraction, and embedding credits for unchanged content.
        if existing is not None and not dry_run:
            return IngestionResult(
                document_id=str(existing.get("id") or parsed.fireflies_id or uuid4()),
                chunk_count=0,
                action_item_count=len(parsed.action_items),
                content_hash=content_hash,
                skipped=True,
                dry_run=False,
            )
        existing_by_fireflies = self.store.find_document_by_fireflies_id(parsed.fireflies_id)
        existing_project_id = (
            project_id
            if project_id is not None
            else (existing or {}).get("project_id")
            or (existing_by_fireflies or {}).get("project_id")
        )
        inferred_project_id: Optional[int] = self._infer_project_id_from_context(
            title=parsed.title,
            participants=parsed.attendees,
            content=parsed.raw_text,
            existing_project_id=existing_project_id,
        )
        effective_project_id = (
            project_id
            if project_id is not None
            else inferred_project_id
            or (existing or {}).get("project_id")
            or (existing_by_fireflies or {}).get("project_id")
        )
        document_id = (
            (existing or {}).get("id")
            or (existing_by_fireflies or {}).get("id")
            or parsed.fireflies_id
            or str(uuid4())
        )
        skipped = existing is not None and not dry_run

        # Prepare metadata payload
        metadata = {
            "id": document_id,
            "title": parsed.title,
            "captured_at": parsed.captured_at.isoformat() if parsed.captured_at else None,
            "date": parsed.captured_at.isoformat() if parsed.captured_at else None,
            "fireflies_id": parsed.fireflies_id,
            "summary": parsed.summary or parsed.overview,
            "overview": parsed.overview or parsed.summary,
            "action_items": (
                self._format_action_items_storage(parsed.action_items_structured)
                or "\n".join(parsed.action_items)
            ),
            "content_hash": content_hash,
            "participants": ", ".join(parsed.attendees),
            "participants_array": parsed.attendees,
            "content": parsed.raw_text,
            "raw_text": parsed.raw_text,
            "project_id": effective_project_id,
            "url": storage_url,
            "source": "fireflies",
            "type": "meeting",
            "phase": "construction",
            "status": "processed",
        }
        # Merge in any extra structured metadata from the raw Fireflies transcript
        if extra_metadata:
            for key, value in extra_metadata.items():
                if value is not None:
                    metadata[key] = value

        segments = parsed.transcript_segments
        chunks = list(
            self._chunk_segments(
                document_id,
                segments,
                effective_project_id,
                title=parsed.title,
                captured_at=parsed.captured_at,
                fireflies_id=parsed.fireflies_id,
            )
        )

        if dry_run:
            return IngestionResult(
                document_id=document_id,
                chunk_count=len(chunks),
                action_item_count=len(parsed.action_items),
                content_hash=content_hash,
                skipped=skipped,
                dry_run=True,
            )

        job_id: Optional[str] = None
        try:
            job_id = self.store.start_ingestion_job(parsed.fireflies_id, content_hash)
        except Exception:
            # Existing jobs can be present for re-sync/re-ingest runs.
            job_id = None

        try:
            self.store.upsert_document_metadata(metadata)
            if self._is_interview_title(parsed.title):
                reason = (
                    'INTENTIONALLY_EXCLUDED: Meeting title contains "Interview", '
                    "so it is intentionally excluded from embedding/vectorization."
                )
                self.store.delete_chunks_for_document(document_id)
                self.store.upsert_document_metadata(
                    {
                        **metadata,
                        "status": "intentionally_excluded",
                        "embedding_status": "intentionally_excluded",
                        "processing_metadata": {
                            "embedding_exclusion": {
                                "code": "interview_title_excluded",
                                "message": reason,
                                "intentional": True,
                            }
                        },
                    }
                )
                self.store.complete_ingestion_job(job_id, status="completed")
                return IngestionResult(
                    document_id=document_id,
                    chunk_count=0,
                    action_item_count=0,
                    content_hash=content_hash,
                    skipped=True,
                    dry_run=False,
                )

            task_rows = self._build_task_rows_via_rewriter(
                metadata_id=document_id,
                meeting_title=parsed.title,
                action_items=parsed.action_items,
                project_id=effective_project_id,
                participants=parsed.attendees,
                speaker_email_map=parsed.speaker_email_map,
                source_date=parsed.captured_at,
                notes_context=parsed.raw_text,
                action_items_structured=parsed.action_items_structured,
            )
            # Replace the prior auto-generated batch only when we have a fresh
            # one — a transient empty rewriter response must not wipe existing
            # tasks. User-edited/completed tasks are preserved (see the store
            # method's status/source scoping).
            if task_rows:
                self.store.delete_open_rewriter_tasks_for_document(document_id)
                for task in task_rows:
                    self.store.upsert_task(task)
            embeddings = self.embedder.embed([chunk.text for chunk in chunks])
            for chunk, embedding in zip(chunks, embeddings):
                chunk.embedding = embedding

            summary_text = self._build_summary_embedding_text(
                parsed.title,
                parsed.captured_at,
                parsed.summary or parsed.overview,
            )
            if summary_text:
                summary_embeddings = self.embedder.embed([summary_text])
                if summary_embeddings:
                    self.store.upsert_document_metadata(
                        {
                            "id": document_id,
                            "summary_embedding": summary_embeddings[0],
                        }
                    )

            # Replace existing chunks for this document so stale chunks from prior
            # transcript formats cannot survive after a re-sync.
            self.store.delete_chunks_for_document(document_id)
            self.store.upsert_chunks(chunks)

            # NOTE: Task extraction is handled by the pipeline extractor
            # (pipeline/extractor.py → _upsert_task) which writes LLM-enriched
            # tasks to the unified `tasks` table with embeddings, assignee emails,
            # and priority inference. The old duplicate writes to `ai_tasks` and
            # `project_tasks` have been removed as part of table consolidation.

            if effective_project_id and parsed.summary:
                insight = {
                    "project_id": effective_project_id,
                    "summary": parsed.summary[:512],
                    "detail": {"source_document_id": document_id},
                    "severity": "info",
                    "source_document_ids": [document_id],
                }
                self.store.insert_insight(insight)

            # Extract team-scoped AI memories from this meeting.
            # Operational failures (network/API) are best-effort and don't block
            # ingestion. Structural code bugs (NameError/AttributeError/etc.) mean
            # memory extraction is broken for EVERY meeting, so they must surface
            # loudly instead of degrading silently — re-raise so they're caught in
            # tests/CI/monitoring rather than swallowed as a per-meeting warning.
            try:
                self._extract_meeting_memories(
                    document_id=document_id,
                    project_id=effective_project_id,
                    title=parsed.title,
                    content=parsed.raw_text,
                    action_items=parsed.action_items,
                )
            except (NameError, AttributeError, ImportError, TypeError) as bug_exc:
                logger.error(
                    "Memory extraction is structurally broken (affects all meetings): %s",
                    bug_exc,
                    exc_info=True,
                )
                raise
            except Exception as mem_exc:
                logger.warning("Memory extraction failed for %s: %s", document_id, mem_exc)

            self.store.complete_ingestion_job(job_id, status="completed")
        except Exception as exc:  # pragma: no cover - network errors
            self.store.complete_ingestion_job(job_id, status="failed", error=str(exc))
            raise

        return IngestionResult(
            document_id=document_id,
            chunk_count=len(chunks),
            action_item_count=len(parsed.action_items),
            content_hash=content_hash,
            skipped=skipped,
            dry_run=False,
        )

    @staticmethod
    def _is_likely_legacy_fireflies_markdown(markdown: str) -> bool:
        """Heuristic for reduced Fireflies exports missing richer sections."""
        text = markdown or ""
        has_fireflies_marker = ("**Fireflies ID:**" in text) or ("fireflies.ai/view/" in text)
        if not has_fireflies_marker:
            return False

        minimal_markers = ("## Summary", "## Gist", "## Short Summary", "## Keywords")
        has_minimal = all(marker in text for marker in minimal_markers)
        if not has_minimal:
            return False

        rich_markers = (
            "## Meeting Attendees",
            "## Meeting Info",
            "## Analytics",
            "## Speakers",
            "## Bullet Gist",
            "## Shorthand Bullet",
            "## Notes",
            "## Action Items",
        )
        return not any(marker in text for marker in rich_markers)

    def _extract_fireflies_rich_metadata(self, transcript: Dict[str, Any]) -> Dict[str, Any]:
        """Extract all structured fields from a raw Fireflies transcript dict.

        These fields are passed as extra_metadata to ingest_markdown_text so they
        are stored directly from the structured API response rather than being lost
        through the markdown→parse roundtrip.
        """
        summary = transcript.get("summary") or {}
        meeting_info = transcript.get("meeting_info") or {}
        analytics = transcript.get("analytics") or {}
        sentiments = analytics.get("sentiments") or {}

        # Duration: Fireflies returns duration in minutes (integer column).
        # Some transcripts arrive with duration=0 or duration=1 before full
        # processing completes. Fall back to the last sentence's end_time
        # (in seconds) when the API value is suspiciously low (< 2 minutes).
        duration_raw = transcript.get("duration")
        duration_minutes = None
        if isinstance(duration_raw, (int, float)) and duration_raw > 1:
            duration_minutes = int(round(duration_raw))
        else:
            sentences = transcript.get("sentences") or []
            if sentences:
                last_end = max(
                    (s.get("end_time") or 0) for s in sentences if isinstance(s, dict)
                )
                if isinstance(last_end, (int, float)) and last_end > 0:
                    duration_minutes = max(1, int(round(last_end / 60)))
            # If sentences gave us nothing, keep the API value (even if 0 or 1)
            if duration_minutes is None and isinstance(duration_raw, (int, float)) and duration_raw > 0:
                duration_minutes = int(round(duration_raw))

        # Keywords: may be a list or newline-separated string
        keywords_raw = summary.get("keywords") or []
        if isinstance(keywords_raw, str):
            keywords = [k.strip() for k in keywords_raw.splitlines() if k.strip()]
        elif isinstance(keywords_raw, list):
            keywords = [str(k).strip() for k in keywords_raw if k]
        else:
            keywords = []

        # Topics discussed
        topics_raw = summary.get("topics_discussed") or []
        if isinstance(topics_raw, str):
            topics = [t.strip() for t in topics_raw.splitlines() if t.strip()]
        elif isinstance(topics_raw, list):
            topics = [str(t).strip() for t in topics_raw if t]
        else:
            topics = []

        # Sentiment scores from analytics
        sentiment = None
        if sentiments:
            sentiment = {
                "positive_pct": sentiments.get("positive_pct"),
                "negative_pct": sentiments.get("negative_pct"),
                "neutral_pct": sentiments.get("neutral_pct"),
            }

        # Transcript chapters / outline
        chapters_raw = summary.get("transcript_chapters") or []
        if isinstance(chapters_raw, list):
            transcript_chapters = "\n".join(str(c) for c in chapters_raw if c)
        else:
            transcript_chapters = str(chapters_raw) if chapters_raw else None

        # Extended sections as structured JSON
        extended_sections = summary.get("extended_sections") or None

        # Speakers: combine transcript speakers with analytics speaker stats
        speakers_raw = transcript.get("speakers") or []
        speakers = speakers_raw if speakers_raw else None

        # Full analytics (minus the sentiments we already extracted to top-level)
        analytics_payload = analytics if analytics else None

        # Status from meeting_info
        summary_status = meeting_info.get("summary_status") or "processed"

        return {
            "duration_minutes": duration_minutes,
            "fireflies_link": transcript.get("transcript_url"),
            "audio": transcript.get("audio_url"),
            "video": transcript.get("video_url"),
            "meeting_link": transcript.get("meeting_link"),
            "organizer_email": transcript.get("organizer_email") or transcript.get("host_email"),
            "host_email": transcript.get("host_email"),
            "calendar_type": transcript.get("calendar_type"),
            "privacy": transcript.get("privacy"),
            "bullet_points": summary.get("bullet_gist") or summary.get("shorthand_bullet"),
            "notes": summary.get("notes"),
            "outline": summary.get("outline"),
            "meeting_type": summary.get("meeting_type"),
            "keywords": keywords if keywords else None,
            "topics_discussed": topics if topics else None,
            "transcript_chapters": transcript_chapters,
            "extended_sections": extended_sections if extended_sections else None,
            "sentiment": sentiment,
            "speakers": speakers,
            "analytics": analytics_payload,
            "meeting_attendees": transcript.get("meeting_attendees") or None,
            "meeting_attendance": transcript.get("meeting_attendance") or None,
            "channels": transcript.get("channels") or None,
            "is_silent_meeting": bool(meeting_info.get("silent_meeting")) if meeting_info.get("silent_meeting") is not None else None,
            "status": summary_status,
        }

    def sync_recent_transcripts(
        self,
        limit: int = 5,
        project_id: Optional[int] = None,
        dry_run: bool = False,
        write_markdown_dir: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Fetch recent Fireflies transcripts, generate markdown, and ingest.

        The markdown is generated from Fireflies transcript + summary schema fields,
        then passed through the native ingestion path to ensure parser compatibility.
        """
        started_at = datetime.now(timezone.utc)
        if not self._fireflies_api_key:
            self._record_fireflies_sync_run(
                started_at=started_at,
                status="failed",
                items_failed=1,
                error_message="FIREFLIES_API_KEY is required for Fireflies sync",
                metadata={"limit": limit, "dry_run": dry_run},
            )
            raise RuntimeError("FIREFLIES_API_KEY is required for Fireflies sync")

        target_limit = max(1, min(limit, 500))
        summaries = self._fetch_recent_transcript_summaries(target_limit)
        results: List[Dict[str, Any]] = []

        output_dir: Optional[Path] = None
        if write_markdown_dir:
            output_dir = Path(write_markdown_dir)
            output_dir.mkdir(parents=True, exist_ok=True)

        for item in summaries[:target_limit]:
            transcript_id = str(item.get("id") or "").strip()
            if not transcript_id:
                continue
            try:
                transcript = self._fetch_transcript(transcript_id)
                meeting_info = transcript.get("meeting_info") or {}
                summary_status = str(meeting_info.get("summary_status") or "").strip().lower()
                sentences = transcript.get("sentences") or []

                # Skip partially processed Fireflies transcripts to avoid persisting
                # reduced markdown that later lacks expected sections/fields.
                if summary_status and summary_status not in {"processed", "complete", "completed"}:
                    results.append(
                        {
                            "transcript_id": transcript_id,
                            "skipped": True,
                            "reason": f"summary_status={summary_status}",
                        }
                    )
                    continue
                if not sentences:
                    results.append(
                        {
                            "transcript_id": transcript_id,
                            "skipped": True,
                            "reason": "no_sentences",
                        }
                    )
                    continue

                apps_outputs = self._fetch_apps_outputs(transcript_id)
                markdown = self._format_transcript_markdown(transcript, apps_outputs)
                content_hash = hashlib.sha256(markdown.encode("utf-8")).hexdigest()
                existing = self.store.find_document_by_hash(content_hash)
                if existing and not dry_run:
                    results.append(
                        {
                            "transcript_id": transcript_id,
                            "title": transcript.get("title"),
                            "skipped": True,
                            "reason": "unchanged_content",
                            "document_id": existing.get("id"),
                        }
                    )
                    continue
                captured_at = self._parse_datetime(
                    transcript.get("dateString") or transcript.get("date")
                )
                storage_path = self._build_storage_path(
                    transcript.get("title") or transcript_id,
                    captured_at,
                )
                storage_url = None
                if not dry_run:
                    storage_url = self.store.upload_public_text("transcripts", storage_path, markdown)

                markdown_file = None
                if output_dir is not None:
                    markdown_file = output_dir / f"{transcript_id}.md"
                    markdown_file.write_text(markdown, encoding="utf-8")

                rich_metadata = self._extract_fireflies_rich_metadata(transcript)
                ingestion = self.ingest_markdown_text(
                    markdown,
                    project_id=project_id,
                    dry_run=dry_run,
                    storage_url=storage_url,
                    extra_metadata=rich_metadata,
                )
                results.append(
                    {
                        "transcript_id": transcript_id,
                        "title": transcript.get("title"),
                        "markdown_chars": len(markdown),
                        "markdown_path": str(markdown_file) if markdown_file else None,
                        "storage_path": storage_path,
                        "storage_url": storage_url,
                        "ingestion": ingestion.__dict__,
                    }
                )
            except Exception as exc:
                results.append(
                    {
                        "transcript_id": transcript_id,
                        "error": str(exc),
                    }
                )

        result = {
            "requested": target_limit,
            "found": len(summaries),
            "processed": len(results),
            "error_count": sum(1 for r in results if "error" in r),
            "results": results,
        }
        error_count = int(result["error_count"])
        skipped_count = sum(1 for row in results if row.get("skipped"))
        self._record_fireflies_sync_run(
            started_at=started_at,
            status="failed" if error_count == len(results) and results else "warning" if error_count else "succeeded",
            items_seen=len(summaries),
            items_synced=int(result["processed"]) - error_count - skipped_count,
            items_skipped=skipped_count,
            items_failed=error_count,
            error_message=f"{error_count} Fireflies transcripts failed" if error_count else None,
            metadata={
                "requested": target_limit,
                "found": len(summaries),
                "dry_run": dry_run,
                "project_id": project_id,
            },
        )
        return result

    def _record_fireflies_sync_run(
        self,
        *,
        started_at: datetime,
        status: str,
        items_seen: int = 0,
        items_synced: int = 0,
        items_skipped: int = 0,
        items_failed: int = 0,
        error_message: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        try:
            from src.services.health.source_sync_health import record_sync_run
        except Exception:
            try:
                from services.health.source_sync_health import record_sync_run  # type: ignore
            except Exception as exc:
                logger.warning("[FirefliesIngestion] Could not import source sync ledger: %s", exc)
                return

        try:
            record_sync_run(
                self.store._client,
                source="fireflies",
                resource_id="recent_transcripts",
                resource_name="Fireflies recent transcripts",
                stage="source_sync",
                status=status,
                started_at=started_at,
                finished_at=datetime.now(timezone.utc),
                items_seen=items_seen,
                items_synced=items_synced,
                items_skipped=items_skipped,
                items_failed=items_failed,
                error_message=error_message,
                metadata=metadata or {},
            )
        except Exception as exc:
            logger.warning("[FirefliesIngestion] Could not record source_sync_runs row: %s", exc)

    @staticmethod
    def _sanitize_storage_name(value: str) -> str:
        text = unicodedata.normalize("NFKD", str(value or "Untitled Meeting"))
        text = text.encode("ascii", "ignore").decode("ascii")
        text = re.sub(r"\s+", " ", text).strip()
        text = re.sub(r"[\\/:*?\"<>|]+", "", text)
        text = re.sub(r"[\x00-\x1f\x7f]+", "", text)
        return text[:180] or "Untitled Meeting"

    def _build_storage_path(self, title: str, captured_at: Optional[datetime]) -> str:
        date_part = (captured_at or datetime.utcnow()).date().isoformat()
        safe_title = self._sanitize_storage_name(title)
        return f"{date_part} - {safe_title}.md"

    # ------------------------------------------------------------------
    # Parsing helpers
    # ------------------------------------------------------------------
    def parse_markdown(self, markdown: str) -> ParsedTranscript:
        sections = self._split_sections(markdown)
        header_block = sections.get("header", "")
        title = self._extract_title(header_block) or "Untitled"
        fireflies_id = (
            self._extract_metadata_value(header_block, "Fireflies ID")
            or self._extract_metadata_value(header_block, "ID")
            or self._extract_fireflies_id_from_content(markdown)
        )
        captured_at = self._parse_datetime(self._extract_metadata_value(header_block, "Date"))
        attendees = self._parse_attendees(header_block, sections)
        action_items = self._parse_action_items(sections)
        action_items_structured = self._parse_action_items_structured(sections, action_items)
        overview = (
            sections.get("Summary", "")
            or sections.get("Overview", "")
            or sections.get("Short Summary", "")
        ).strip()
        summary = (
            sections.get("Summary Bullets", "")
            or sections.get("Bullet Gist", "")
            or sections.get("Short Summary", "")
            or overview
        ).strip()
        transcript_text = (
            sections.get("Transcript", "")
            or sections.get("Full Transcript", "")
        )
        transcript_segments = self._parse_transcript_segments(transcript_text)

        # Extract rich sections for embedding
        rich_sections = self._collect_rich_sections(sections)
        notes_topics = self._extract_notes_topics(sections)
        speakers_json = self._parse_speakers_json(sections)
        attendees_json = self._parse_attendees_json(sections)
        speaker_email_map = self._build_speaker_email_map(speakers_json, attendees_json)

        return ParsedTranscript(
            title=title,
            fireflies_id=fireflies_id,
            captured_at=captured_at,
            attendees=attendees,
            action_items=action_items,
            overview=overview,
            summary=summary,
            transcript_segments=transcript_segments,
            raw_text=markdown,
            action_items_structured=action_items_structured,
            rich_sections=rich_sections,
            notes_topics=notes_topics,
            speakers_json=speakers_json,
            attendees_json=attendees_json,
            speaker_email_map=speaker_email_map,
        )

    # ------------------------------------------------------------------
    # Fireflies API + markdown generation
    # ------------------------------------------------------------------
    def _fireflies_query(self, query: str, variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if not self._fireflies_api_key:
            raise RuntimeError("FIREFLIES_API_KEY is not configured")
        response = requests.post(
            self._fireflies_api_url,
            headers={
                "Authorization": f"Bearer {self._fireflies_api_key}",
                "Content-Type": "application/json",
            },
            json={"query": query, "variables": variables or {}},
            timeout=60,
        )
        response.raise_for_status()
        payload = response.json()
        errors = payload.get("errors")
        if errors:
            raise RuntimeError(f"Fireflies GraphQL error: {errors}")
        return payload.get("data") or {}

    _FIREFLIES_PAGE_SIZE = 50  # Fireflies API hard cap per request

    def _fetch_recent_transcript_summaries(self, limit: int) -> List[Dict[str, Any]]:
        query = """
        query RecentTranscripts($limit: Int, $skip: Int) {
          transcripts(limit: $limit, skip: $skip) {
            id
            title
            date
            dateString
          }
        }
        """
        results: List[Dict[str, Any]] = []
        skip = 0
        page_size = self._FIREFLIES_PAGE_SIZE
        while len(results) < limit:
            fetch_count = min(page_size, limit - len(results))
            data = self._fireflies_query(query, {"limit": fetch_count, "skip": skip})
            page = data.get("transcripts") or []
            results.extend(page)
            if len(page) < fetch_count:
                break
            skip += fetch_count
        return results

    def _fetch_transcript(self, transcript_id: str) -> Dict[str, Any]:
        query = """
        query Transcript($transcriptId: String!) {
          transcript(id: $transcriptId) {
            id
            title
            date
            dateString
            duration
            host_email
            organizer_email
            user { user_id email name }
            speakers { id name }
            transcript_url
            participants
            meeting_attendees { displayName email phoneNumber name location }
            meeting_attendance { name join_time leave_time }
            fireflies_users
            workspace_users
            audio_url
            video_url
            calendar_id
            cal_id
            calendar_type
            meeting_link
            is_live
            summary {
              action_items
              keywords
              outline
              overview
              shorthand_bullet
              notes
              gist
              bullet_gist
              short_summary
              short_overview
              meeting_type
              topics_discussed
              transcript_chapters
              extended_sections { title content }
            }
            meeting_info { silent_meeting summary_status fred_joined }
            analytics {
              sentiments { negative_pct neutral_pct positive_pct }
              categories { questions date_times metrics tasks }
              speakers {
                speaker_id
                name
                duration
                word_count
                longest_monologue
                monologues_count
                filler_words
                questions
                duration_pct
                words_per_minute
              }
            }
            channels {
              id
              title
              is_private
              created_at
              updated_at
              created_by
              members { user_id email name }
            }
            shared_with { email name photo_url expires_at }
            sentences {
              index
              speaker_name
              speaker_id
              text
              raw_text
              start_time
              end_time
              ai_filters {
                task
                pricing
                metric
                question
                date_and_time
                text_cleanup
                sentiment
              }
            }
            privacy
          }
        }
        """
        data = self._fireflies_query(query, {"transcriptId": transcript_id})
        transcript = data.get("transcript")
        if not transcript:
            raise RuntimeError(f"Transcript not found in Fireflies: {transcript_id}")
        return transcript

    def _fetch_apps_outputs(self, transcript_id: str) -> List[Dict[str, Any]]:
        query = """
        query Apps($transcriptId: String!, $limit: Float, $skip: Float) {
          apps(transcript_id: $transcriptId, limit: $limit, skip: $skip) {
            outputs {
              transcript_id
              user_id
              app_id
              created_at
              title
              prompt
              response
            }
          }
        }
        """
        page_size = 10  # Fireflies docs: max 10 app outputs per request.
        skip = 0
        all_outputs: List[Dict[str, Any]] = []
        try:
            while True:
                data = self._fireflies_query(
                    query,
                    {
                        "transcriptId": transcript_id,
                        "limit": page_size,
                        "skip": skip,
                    },
                )
                batch = (data.get("apps") or {}).get("outputs") or []
                if not batch:
                    break
                all_outputs.extend(batch)
                if len(batch) < page_size:
                    break
                skip += page_size
            return all_outputs
        except Exception:
            return []

    def _format_transcript_markdown(
        self,
        transcript: Dict[str, Any],
        apps_outputs: List[Dict[str, Any]],
    ) -> str:
        lines: List[str] = [f"# {transcript.get('title') or 'Untitled Meeting'}", ""]

        iso_date = self._normalize_datetime_to_iso(
            transcript.get("dateString") or transcript.get("date")
        )
        if iso_date:
            lines.append(f"**Date:** {iso_date}")

        duration = transcript.get("duration")
        if isinstance(duration, (int, float)):
            # Fall back to sentence-derived duration when the API value is < 2 min
            if duration <= 1:
                sentences = transcript.get("sentences") or []
                if sentences:
                    last_end = max(
                        (s.get("end_time") or 0) for s in sentences if isinstance(s, dict)
                    )
                    if isinstance(last_end, (int, float)) and last_end > 0:
                        duration = last_end / 60
            lines.append(f"**Duration:** {round(float(duration))} minutes")
        if transcript.get("organizer_email"):
            lines.append(f"**Organizer Email:** {transcript['organizer_email']}")
        if transcript.get("host_email"):
            lines.append(f"**Host Email:** {transcript['host_email']}")

        participants = transcript.get("participants") or []
        if participants:
            lines.append(f"**Participants:** {', '.join(str(p) for p in participants)}")
        fireflies_users = transcript.get("fireflies_users") or []
        if fireflies_users:
            lines.append(f"**Fireflies Users:** {', '.join(str(p) for p in fireflies_users)}")
        workspace_users = transcript.get("workspace_users") or []
        if workspace_users:
            lines.append(f"**Workspace Users:** {', '.join(str(p) for p in workspace_users)}")

        if transcript.get("transcript_url"):
            lines.append(f"**Fireflies Link:** {transcript['transcript_url']}")
        if transcript.get("audio_url"):
            lines.append(f"**Audio:** {transcript['audio_url']}")
        if transcript.get("video_url"):
            lines.append(f"**Video:** {transcript['video_url']}")
        if transcript.get("meeting_link"):
            lines.append(f"**Meeting Link:** {transcript['meeting_link']}")
        if transcript.get("calendar_type"):
            lines.append(f"**Calendar Type:** {transcript['calendar_type']}")
        if transcript.get("calendar_id"):
            lines.append(f"**Calendar ID:** {transcript['calendar_id']}")
        if transcript.get("cal_id"):
            lines.append(f"**Cal ID:** {transcript['cal_id']}")
        if transcript.get("is_live") is not None:
            lines.append(f"**Is Live:** {str(bool(transcript['is_live'])).lower()}")
        if transcript.get("privacy"):
            lines.append(f"**Privacy:** {transcript['privacy']}")
        lines.append(f"**Fireflies ID:** {transcript.get('id')}")
        lines.append("")

        summary = transcript.get("summary") or {}
        self._append_text_section(lines, "Summary", summary.get("overview"))
        self._append_text_section(lines, "Short Summary", summary.get("short_summary"))
        self._append_text_section(lines, "Short Overview", summary.get("short_overview"))
        self._append_text_section(lines, "Gist", summary.get("gist"))
        self._append_text_section(lines, "Bullet Gist", summary.get("bullet_gist"))
        self._append_text_section(lines, "Shorthand Bullet", summary.get("shorthand_bullet"))
        self._append_text_section(lines, "Outline", summary.get("outline"))
        self._append_text_section(lines, "Notes", summary.get("notes"))
        self._append_text_section(lines, "Meeting Type", summary.get("meeting_type"))
        self._append_list_section(lines, "Keywords", summary.get("keywords"))
        self._append_list_section(lines, "Topics Discussed", summary.get("topics_discussed"))
        self._append_list_section(lines, "Transcript Chapters", summary.get("transcript_chapters"))
        self._append_action_items_section(lines, summary.get("action_items"))
        self._append_json_section(lines, "Extended Sections", summary.get("extended_sections"))

        self._append_json_section(lines, "User", transcript.get("user"))
        self._append_json_section(lines, "Speakers", transcript.get("speakers"))
        self._append_json_section(lines, "Meeting Attendees", transcript.get("meeting_attendees"))
        self._append_json_section(lines, "Meeting Attendance", transcript.get("meeting_attendance"))
        self._append_json_section(lines, "Meeting Info", transcript.get("meeting_info"))
        self._append_json_section(lines, "Analytics", transcript.get("analytics"))
        self._append_json_section(lines, "Channels", transcript.get("channels"))
        self._append_json_section(lines, "Shared With", transcript.get("shared_with"))
        self._append_json_section(lines, "Apps Preview", apps_outputs)

        sentences = transcript.get("sentences") or []
        if sentences:
            lines.append("## Transcript")
            lines.append("")
            for sentence in sentences:
                speaker = (sentence or {}).get("speaker_name") or "Unknown"
                text = ((sentence or {}).get("text") or "").strip()
                if not text:
                    continue
                stamp = self._seconds_to_mmss((sentence or {}).get("start_time"))
                ai_filters = (sentence or {}).get("ai_filters") or {}
                tags = [k for k, v in ai_filters.items() if v and k != "text_cleanup" and k != "sentiment"]
                tag_str = f" [{', '.join(tags)}]" if tags else ""
                lines.append(f"[{stamp}] **{speaker}**: {text}{tag_str}")

            # Append AI filters summary as structured data for downstream extraction
            ai_filter_sentences = [
                s for s in sentences
                if s and (s.get("ai_filters") or {})
                and any(v for k, v in (s.get("ai_filters") or {}).items() if k not in ("text_cleanup", "sentiment"))
            ]
            if ai_filter_sentences:
                self._append_json_section(lines, "AI Sentence Filters", [
                    {
                        "index": s.get("index"),
                        "speaker": s.get("speaker_name"),
                        "text": (s.get("text") or "")[:200],
                        "filters": {k: v for k, v in (s.get("ai_filters") or {}).items() if v},
                    }
                    for s in ai_filter_sentences
                ])

        return "\n".join(lines).strip() + "\n"

    @staticmethod
    def _split_sections(markdown: str) -> Dict[str, str]:
        sections: Dict[str, str] = {"header": ""}
        current = "header"
        buffer: List[str] = []
        for line in markdown.splitlines():
            if line.startswith(SECTION_PREFIX):
                sections[current] = "\n".join(buffer).strip()
                current = line[len(SECTION_PREFIX) :].strip()
                buffer = []
            else:
                buffer.append(line)
        sections[current] = "\n".join(buffer).strip()
        return sections

    @staticmethod
    def _extract_title(header_block: str) -> Optional[str]:
        for line in header_block.splitlines():
            if line.startswith("# "):
                return line[2:].strip()
        return None

    @staticmethod
    def _extract_metadata_value(header_block: str, label: str) -> Optional[str]:
        # Match **Label:** value, stopping at the next **Key:** marker or end of string.
        # This handles single-line headers where all metadata is on one line.
        pattern = rf"\*\*{label}:\*\*\s*(.+?)(?=\s+\*\*\w[\w\s]*?:\*\*|$)"
        match = re.search(pattern, header_block)
        return match.group(1).strip() if match else None

    @staticmethod
    def _extract_fireflies_id_from_content(content: str) -> Optional[str]:
        id_match = re.search(r"\*\*Fireflies ID:\*\*\s*([A-Za-z0-9_-]{8,})", content, flags=re.IGNORECASE)
        if id_match:
            return id_match.group(1).strip()
        url_match = FIREFLIES_VIEW_URL_RE.search(content)
        if url_match:
            return url_match.group(1).strip()
        return None

    @staticmethod
    def _parse_datetime(raw: Optional[str]) -> Optional[datetime]:
        if not raw:
            return None
        try:
            return datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError:
            pass
        if raw.strip().isdigit():
            try:
                epoch = int(raw.strip())
                if epoch > 10_000_000_000:
                    epoch = epoch / 1000  # epoch ms
                return datetime.utcfromtimestamp(epoch)
            except Exception:
                pass
        for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d%H:%M", "%Y-%m-%d"):
            try:
                return datetime.strptime(raw.strip(), fmt)
            except ValueError:
                continue
        return None

    def _parse_attendees(self, header_block: str, sections: Dict[str, str]) -> List[str]:
        attendees = self._parse_bullets(sections.get("Attendees", "")) or self._parse_bullets(
            sections.get("Participants", "")
        )
        if attendees:
            return attendees
        participants_raw = self._extract_metadata_value(header_block, "Participants")
        if not participants_raw:
            return []
        values = [v.strip() for v in participants_raw.split(",")]
        return [v for v in values if v]

    def _parse_action_items(self, sections: Dict[str, str]) -> List[str]:
        # Try canonical section first, then alternative names used by Fireflies Apps.
        for section_name in ("Action Items", "Major Action Items", "Outstanding Tasks"):
            block = sections.get(section_name, "")
            if not block:
                continue
            items = self._parse_bullets(block)
            if items:
                return items
            normalized = self._normalize_action_items(block)
            if normalized:
                return normalized
        return []

    def _parse_action_items_structured(
        self,
        sections: Dict[str, str],
        flat_items: List[str],
    ) -> List[Dict[str, Optional[str]]]:
        """Return ordered ``[{assignee, text}]`` pairs for the action items.

        Reads the same section the flat parser uses, preserving the ``**Owner**``
        grouping. If the grouped parse can't recover the same items (e.g. legacy
        inline format), fall back to owner-less pairs so callers still get every
        item.
        """
        for section_name in ("Action Items", "Major Action Items", "Outstanding Tasks"):
            block = sections.get(section_name, "")
            if not block:
                continue
            structured = self._parse_grouped_action_items(block)
            if structured:
                if len(structured) == len(flat_items):
                    return structured
                return [{"assignee": None, "text": text} for text in flat_items]
        return [{"assignee": None, "text": text} for text in flat_items]

    @staticmethod
    def _parse_bullets(block: str) -> List[str]:
        items: List[str] = []
        for line in block.splitlines():
            stripped = line.strip()
            if re.match(r"^[-*•]\s+", stripped):
                items.append(re.sub(r"^[-*•]\s+", "", stripped).strip())
            elif re.match(r"^\d+\.\s+", stripped):
                items.append(re.sub(r"^\d+\.\s+", "", stripped).strip())

        # Handle inline bullets: all items on one line separated by " - "
        # e.g. "- item1 (29:49) - item2 (08:36) - item3 (30:23)"
        if len(items) == 1 and " - " in items[0]:
            # Split on " - " preceded by a timestamp like (MM:SS)
            parts = re.split(r"(?<=\(\d{2}:\d{2}\))\s+-\s+", items[0])
            if len(parts) > 1:
                items = [p.strip() for p in parts if p.strip()]

        return items

    @staticmethod
    def _parse_transcript_segments(block: str) -> List[TranscriptSegment]:
        segments: List[TranscriptSegment] = []
        for line in block.splitlines():
            stripped = line.strip()
            if not stripped:
                continue
            match = TIMESTAMP_LINE.match(stripped)
            if match:
                segments.append(
                    TranscriptSegment(
                        timestamp=match.group("stamp"),
                        speaker=match.group("speaker"),
                        text=match.group("text"),
                    )
                )
            else:
                if segments:
                    segments[-1].text += f" {stripped}"
                else:
                    segments.append(TranscriptSegment(None, None, stripped))
        return segments

    # ------------------------------------------------------------------
    # Rich section extraction (new Fireflies markdown format)
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_notes_topics(sections: Dict[str, str]) -> Dict[str, str]:
        """Extract Notes sub-headings from parsed sections.

        The ``_split_sections()`` method splits on ``## `` so Notes sub-headings
        like ``## **Change Order and Contract Clarifications**`` become top-level
        keys with ``**`` markers.  This groups them as notes topics.
        """
        topics: Dict[str, str] = {}
        for key, value in sections.items():
            stripped = key.strip()
            if stripped.startswith("**") and stripped.endswith("**"):
                topic_name = stripped.strip("*").strip()
                if topic_name and value.strip():
                    topics[topic_name] = value.strip()
        return topics

    @staticmethod
    def _parse_json_section(sections: Dict[str, str], section_name: str) -> Any:
        """Parse a JSON code-block section into a Python object."""
        raw = sections.get(section_name, "")
        if not raw:
            return None
        # Strip markdown code fences
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            # Handle case where JSON is on the same line as the fence:
            #   ```json [{ "id": 0 }, ...]```
            # Or multi-line:
            #   ```json
            #   [{ "id": 0 }]
            #   ```
            first_line_end = cleaned.find("\n")
            if first_line_end == -1:
                # Everything is on one line: ```json [...]```
                first_line = cleaned
            else:
                first_line = cleaned[:first_line_end]

            # Check if JSON content starts on the first line (after ```json)
            fence_stripped = re.sub(r"^```\w*\s*", "", first_line).strip()
            if fence_stripped and (fence_stripped.startswith("{") or fence_stripped.startswith("[")):
                # JSON is inline with the fence — extract it
                # Remove trailing ``` if present
                cleaned = re.sub(r"^```\w*\s*", "", cleaned)
                cleaned = re.sub(r"\s*```\s*$", "", cleaned).strip()
            else:
                # Standard multi-line code block
                lines = cleaned.split("\n")
                lines = [l for l in lines if not l.strip().startswith("```")]
                cleaned = "\n".join(lines).strip()
        if not cleaned:
            return None
        try:
            return json.loads(cleaned)
        except (json.JSONDecodeError, ValueError):
            return None

    @staticmethod
    def _parse_speakers_json(sections: Dict[str, str]) -> List[Dict[str, Any]]:
        """Extract the Speakers JSON section."""
        data = FirefliesIngestionPipeline._parse_json_section(sections, "Speakers")
        if isinstance(data, list):
            return data
        return []

    @staticmethod
    def _parse_attendees_json(sections: Dict[str, str]) -> List[Dict[str, Any]]:
        """Extract the Meeting Attendees JSON section."""
        data = FirefliesIngestionPipeline._parse_json_section(sections, "Meeting Attendees")
        if isinstance(data, list):
            return data
        return []

    @staticmethod
    def _build_speaker_email_map(
        speakers: List[Dict[str, Any]],
        attendees: List[Dict[str, Any]],
    ) -> Dict[str, str]:
        """Heuristically match speaker names to attendee emails.

        Strategy:
        1. Exact displayName match
        2. Email prefix (before @) matches first name (case-insensitive)
        3. Name substring match (speaker last name appears in displayName)
        """
        mapping: Dict[str, str] = {}
        if not speakers or not attendees:
            return mapping

        # Build lookup from attendees
        attendee_emails: List[Dict[str, str]] = []
        for att in attendees:
            display = (att.get("displayName") or att.get("name") or "").strip()
            email = (att.get("email") or "").strip()
            if email:
                attendee_emails.append({"display": display, "email": email})

        for spk in speakers:
            speaker_name = (
                spk.get("speakerName") or spk.get("name") or ""
            ).strip()
            if not speaker_name:
                continue

            speaker_lower = speaker_name.lower()
            speaker_parts = speaker_lower.split()

            # 1. Exact match on displayName
            for att in attendee_emails:
                if att["display"].lower() == speaker_lower:
                    mapping[speaker_name] = att["email"]
                    break
            if speaker_name in mapping:
                continue

            # 2. Email prefix match
            for att in attendee_emails:
                prefix = att["email"].split("@")[0].lower()
                # Check if first name matches prefix start
                if speaker_parts and prefix.startswith(speaker_parts[0]):
                    mapping[speaker_name] = att["email"]
                    break
            if speaker_name in mapping:
                continue

            # 3. Last name substring match
            if len(speaker_parts) >= 2:
                last_name = speaker_parts[-1]
                for att in attendee_emails:
                    if last_name in att["display"].lower() or last_name in att["email"].lower():
                        mapping[speaker_name] = att["email"]
                        break

        return mapping

    @staticmethod
    def _collect_rich_sections(sections: Dict[str, str]) -> Dict[str, str]:
        """Collect non-transcript, non-JSON rich text sections for embedding."""
        # These are high-value sections that contain structured summaries
        section_keys = [
            "Summary", "Short Summary", "Short Overview", "Gist",
            "Bullet Gist", "Shorthand Bullet", "Outline", "Notes",
            "Action Items", "Meeting Type", "Keywords", "Topics Discussed",
        ]
        rich: Dict[str, str] = {}
        for key in section_keys:
            content = sections.get(key, "").strip()
            if content:
                rich[key] = content
        return rich

    # ------------------------------------------------------------------
    # Chunk and payload builders
    # ------------------------------------------------------------------
    def _chunk_segments(
        self,
        document_id: str,
        segments: List[TranscriptSegment],
        project_id: Optional[int],
        chunk_size: int = 12,
        overlap: int = 2,
        *,
        title: Optional[str] = None,
        captured_at: Optional[datetime] = None,
        fireflies_id: Optional[str] = None,
    ) -> Iterable[DocumentChunk]:
        if not segments:
            return []
        window: List[TranscriptSegment] = []
        index = 0
        for segment in segments:
            window.append(segment)
            if len(window) >= chunk_size:
                yield self._build_chunk(
                    document_id,
                    index,
                    window,
                    project_id,
                    title=title,
                    captured_at=captured_at,
                    fireflies_id=fireflies_id,
                )
                index += 1
                window = window[-overlap:]
        if window:
            yield self._build_chunk(
                document_id,
                index,
                window,
                project_id,
                title=title,
                captured_at=captured_at,
                fireflies_id=fireflies_id,
            )

    @staticmethod
    def _build_chunk(
        document_id: str,
        index: int,
        segments: List[TranscriptSegment],
        project_id: Optional[int],
        *,
        title: Optional[str] = None,
        captured_at: Optional[datetime] = None,
        fireflies_id: Optional[str] = None,
    ) -> DocumentChunk:
        lines = [f"[{seg.timestamp or '??:??'}] {seg.speaker or 'Unknown'}: {seg.text}" for seg in segments]
        text = "\n".join(lines)
        # `file_date` is sourced from the per-transcript `captured_at` to avoid the
        # known recurring-meeting bug where a series-level date sticks across
        # occurrences. Match the canonical embedder.py chunk metadata shape so
        # downstream RAG filters (title, file_date) work uniformly across the
        # transcript and summary paths.
        captured_at_iso = captured_at.isoformat() if captured_at else None
        metadata = {
            "chunk_index": index,
            "speakers": sorted({seg.speaker or "Unknown" for seg in segments}),
            "start_timestamp": segments[0].timestamp,
            "end_timestamp": segments[-1].timestamp,
            "project_id": project_id,
            "title": title,
            "captured_at": captured_at_iso,
            "file_date": captured_at_iso,
            "fireflies_id": fireflies_id,
        }
        return DocumentChunk(
            document_id=document_id,
            chunk_index=index,
            chunk_id=f"{document_id}-{index}",
            text=text,
            metadata=metadata,
            content_hash=hashlib.sha256(text.encode("utf-8")).hexdigest(),
            source_type="meeting_transcript",
        )

    @staticmethod
    def _seconds_to_mmss(value: Any) -> str:
        if isinstance(value, (int, float)):
            total = max(0, int(value))
            return f"{total // 60:02d}:{total % 60:02d}"
        return "00:00"

    @staticmethod
    def _normalize_datetime_to_iso(value: Any) -> Optional[str]:
        if value is None:
            return None
        if isinstance(value, (int, float)):
            epoch = float(value)
            if epoch > 10_000_000_000:
                epoch = epoch / 1000
            try:
                return datetime.utcfromtimestamp(epoch).isoformat() + "Z"
            except Exception:
                return None
        text = str(value).strip()
        if not text:
            return None
        try:
            return datetime.fromisoformat(text.replace("Z", "+00:00")).isoformat()
        except ValueError:
            return None

    @staticmethod
    def _normalize_action_items(value: Any) -> List[str]:
        if value is None:
            return []
        # Fireflies sometimes returns {} (empty dict) instead of [] — treat as empty.
        if isinstance(value, dict):
            return []
        if isinstance(value, list):
            items = [str(v).strip() for v in value if str(v).strip()]
            return items
        text = str(value)
        items: List[str] = []
        for raw_line in text.splitlines():
            line = raw_line.strip()
            if not line:
                continue
            if line.startswith("**") and line.endswith("**"):
                continue
            line = re.sub(r"^[-*•]\s+", "", line)
            line = re.sub(r"^\d+\.\s+", "", line)
            line = line.strip()
            if line:
                items.append(line)
        return items

    @staticmethod
    def _parse_grouped_action_items(value: Any) -> List[Dict[str, Optional[str]]]:
        """Parse Fireflies action items into ``[{"assignee", "text"}]`` pairs.

        Fireflies groups action items under bold ``**Owner Name**`` headers and
        lists each owner's items on the lines beneath. Preserving that owner is
        what lets the UI show who an item is assigned to and lets the task
        rewriter assign the right person — stripping the headers (the old
        behavior) destroyed both. Items that appear before any header (or when
        Fireflies omits headers) carry ``assignee = None``.
        """
        if value is None or isinstance(value, dict):
            return []

        if isinstance(value, list):
            return [
                {"assignee": None, "text": str(v).strip()}
                for v in value
                if str(v).strip()
            ]

        pairs: List[Dict[str, Optional[str]]] = []
        current_assignee: Optional[str] = None
        for raw_line in str(value).splitlines():
            line = raw_line.strip()
            if not line:
                continue
            if line.startswith("**") and line.endswith("**"):
                current_assignee = line.strip("*").strip() or None
                continue
            line = re.sub(r"^[-*•]\s+", "", line)
            line = re.sub(r"^\d+\.\s+", "", line)
            line = line.strip()
            if line:
                pairs.append({"assignee": current_assignee, "text": line})
        return pairs

    @staticmethod
    def _normalize_person_text(value: str) -> str:
        normalized = unicodedata.normalize("NFKD", value or "")
        ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
        ascii_text = ascii_text.lower().replace("'", " ")
        ascii_text = re.sub(r"[^a-z0-9]+", " ", ascii_text)
        return re.sub(r"\s+", " ", ascii_text).strip()

    @staticmethod
    def _strip_action_item_timestamp(value: str) -> str:
        return re.sub(r"\s*\(\d{2}:\d{2}\)\s*$", "", value or "").strip()

    @classmethod
    def _build_people_lookup(
        cls,
        speaker_email_map: Optional[Dict[str, str]],
        speakers_json: Optional[List[Dict[str, Any]]],
        attendees_json: Optional[List[Dict[str, Any]]],
    ) -> List[Dict[str, Optional[str]]]:
        people: List[Dict[str, Optional[str]]] = []
        seen: set[tuple[str, str]] = set()

        def add_person(name: str, email: Optional[str]) -> None:
            clean_name = (name or "").strip()
            clean_email = (email or "").strip() or None
            if not clean_name:
                return
            key = (clean_name.lower(), (clean_email or "").lower())
            if key in seen:
                return
            seen.add(key)
            people.append({"name": clean_name, "email": clean_email})

        for name, email in (speaker_email_map or {}).items():
            add_person(name, email)

        for speaker in speakers_json or []:
            speaker_name = str(speaker.get("speakerName") or speaker.get("name") or "").strip()
            if not speaker_name:
                continue
            add_person(speaker_name, (speaker_email_map or {}).get(speaker_name))

        for attendee in attendees_json or []:
            attendee_name = str(attendee.get("displayName") or attendee.get("name") or "").strip()
            attendee_email = str(attendee.get("email") or "").strip() or None
            if attendee_name:
                add_person(attendee_name, attendee_email)

        return people

    @classmethod
    def _resolve_action_item_assignee(
        cls,
        action_item: str,
        speaker_email_map: Optional[Dict[str, str]],
        speakers_json: Optional[List[Dict[str, Any]]],
        attendees_json: Optional[List[Dict[str, Any]]],
    ) -> tuple[Optional[str], Optional[str]]:
        people = cls._build_people_lookup(speaker_email_map, speakers_json, attendees_json)
        normalized_text = cls._normalize_person_text(action_item)

        def resolve_candidate_name(candidate_name: str) -> tuple[Optional[str], Optional[str]]:
            normalized_candidate = cls._normalize_person_text(candidate_name)
            for person in people:
                normalized_name = cls._normalize_person_text(person["name"] or "")
                aliases = {normalized_name}
                name_parts = normalized_name.split()
                if name_parts:
                    aliases.add(name_parts[0])
                if normalized_candidate in aliases:
                    return person["name"], person["email"]
            return candidate_name, None

        for pattern in (
            r"^\s*(?:follow up with|coordinate with|contact|ask|tell|have|support|add)\s+([A-Z][A-Za-z']+)",
        ):
            match = re.search(pattern, action_item, flags=re.IGNORECASE)
            if match:
                return resolve_candidate_name(match.group(1).strip())

        best_match: Optional[tuple[int, int, Dict[str, Optional[str]]]] = None
        for person in people:
            name = person["name"] or ""
            normalized_name = cls._normalize_person_text(name)
            if not normalized_name:
                continue

            aliases = {normalized_name}
            name_parts = normalized_name.split()
            if name_parts:
                aliases.add(name_parts[0])

            for alias in aliases:
                if not alias:
                    continue
                pattern = rf"\b{re.escape(alias)}\b"
                match = re.search(pattern, normalized_text)
                if not match:
                    continue
                prefix_words = normalized_text[: match.start()].split()
                if prefix_words[-1:] in (["copy"], ["cc"]):
                    continue
                score = len(alias.split()) * 10 + len(alias)
                candidate = (match.start(), -score, person)
                if best_match is None or candidate < best_match:
                    best_match = candidate

        if best_match:
            person = best_match[2]
            return person["name"], person["email"]

        leading_match = re.match(
            r"^\s*([A-Z][A-Za-z']+(?:\s+[A-Z][A-Za-z']+)?)\s+to\b",
            action_item,
        )
        if leading_match:
            candidate_name = leading_match.group(1).strip()
            if cls._normalize_person_text(candidate_name.split()[0]) not in {
                "contact",
                "follow",
                "coordinate",
                "review",
                "provide",
                "monitor",
                "support",
                "add",
                "take",
                "perform",
                "adjust",
                "export",
            }:
                return candidate_name, None

        with_match = re.search(r"\b(?:with|contact|ask|tell|have)\s+([A-Z][A-Za-z']+)\b", action_item)
        if with_match:
            return resolve_candidate_name(with_match.group(1).strip())

        return None, None

    @staticmethod
    def _infer_action_item_priority(action_item: str) -> str:
        text = (action_item or "").lower()
        urgent_markers = ("urgent", "immediately", "asap", "today", "tomorrow", "end of day")
        high_markers = ("priority", "by end of week", "deadline", "due")
        if any(marker in text for marker in urgent_markers):
            return "high"
        if any(marker in text for marker in high_markers):
            return "medium"
        return "medium"

    @staticmethod
    def _coerce_source_date(value: Optional[datetime | str]) -> Optional[datetime]:
        if value is None:
            return None
        if isinstance(value, datetime):
            parsed = value
        else:
            raw = str(value).strip()
            if not raw:
                return None
            try:
                parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            except ValueError:
                return None
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)

    @staticmethod
    def _next_weekday(source_date: datetime, weekday: int) -> datetime:
        days_ahead = (weekday - source_date.weekday()) % 7
        if days_ahead == 0:
            days_ahead = 7
        return source_date + timedelta(days=days_ahead)

    @classmethod
    def _infer_action_item_due_date(
        cls,
        action_item: str,
        source_date: Optional[datetime | str],
    ) -> Optional[str]:
        source_dt = cls._coerce_source_date(source_date)
        if not source_dt:
            return None

        text = (action_item or "").lower()
        if re.search(r"\btoday\b", text):
            return source_dt.date().isoformat()
        if re.search(r"\btomorrow\b", text):
            return (source_dt + timedelta(days=1)).date().isoformat()
        if re.search(r"\basap\b|as soon as possible", text):
            return (source_dt + timedelta(days=2)).date().isoformat()
        if re.search(r"\bend of (the )?week\b", text):
            friday = source_dt + timedelta(days=(4 - source_dt.weekday()) % 7)
            return friday.date().isoformat()

        month_match = re.search(
            r"\b(?:by|before|on|due|no later than)?\s*"
            r"(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|"
            r"jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)"
            r"\s+(\d{1,2})(?:st|nd|rd|th)?\b",
            text,
        )
        if month_match:
            month_lookup = {
                "jan": 1,
                "feb": 2,
                "mar": 3,
                "apr": 4,
                "may": 5,
                "jun": 6,
                "jul": 7,
                "aug": 8,
                "sep": 9,
                "oct": 10,
                "nov": 11,
                "dec": 12,
            }
            month = month_lookup[month_match.group(1)[:3]]
            day = int(month_match.group(2))
            year = source_dt.year
            try:
                candidate = datetime(year, month, day, tzinfo=timezone.utc)
            except ValueError:
                return None
            if candidate.date() < source_dt.date():
                try:
                    candidate = datetime(year + 1, month, day, tzinfo=timezone.utc)
                except ValueError:
                    return None
            return candidate.date().isoformat()

        weekday_lookup = {
            "monday": 0,
            "tuesday": 1,
            "wednesday": 2,
            "thursday": 3,
            "friday": 4,
            "saturday": 5,
            "sunday": 6,
        }
        weekday_match = re.search(
            r"\b(?:by|before|on|this|next)?\s*"
            r"(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
            text,
        )
        if weekday_match:
            return cls._next_weekday(source_dt, weekday_lookup[weekday_match.group(1)]).date().isoformat()

        return None

    # Patterns for low-value scheduling/admin noise that should not become tasks
    _LOW_VALUE_TASK_RE: re.Pattern = re.compile(
        r"""
        schedule\s+(a\s+)?(follow.?up|meeting|call|sync|standup|check.in)|
        send\s+(a\s+)?(meeting|calendar)\s+(invite|request|link|notification)|
        set\s+up\s+(a\s+)?(meeting|call|sync|zoom|teams\s+meeting)|
        find\s+a\s+time\s+(to\s+(meet|talk|connect|discuss))?|
        book\s+(a\s+)?(meeting|call|room|conference)|
        create\s+(a\s+)?calendar\s+(event|invite|block)|
        send\s+meeting\s+(request|invite|link)|
        add\s+(it\s+)?to\s+(the\s+)?(calendar|agenda)|
        block\s+(time|calendar)\s+for
        """,
        re.IGNORECASE | re.VERBOSE,
    )

    @classmethod
    def _is_low_value_task(cls, description: str) -> bool:
        """Return True for scheduling noise that shouldn't become tracked tasks."""
        return bool(cls._LOW_VALUE_TASK_RE.search(description or ""))

    def _build_task_rows_via_rewriter(
        self,
        *,
        metadata_id: str,
        meeting_title: str,
        action_items: List[str],
        project_id: Optional[int],
        participants: List[str],
        speaker_email_map: Optional[Dict[str, str]] = None,
        source_date: Optional[datetime | str] = None,
        notes_context: str = "",
        action_items_structured: Optional[List[Dict[str, Optional[str]]]] = None,
    ) -> List[Dict[str, Any]]:
        """LLM-rewritten task rows. Replaces the old regex-based extraction.

        Each Fireflies action-item line is rewritten into an imperative task
        (≤10-word title + description). When ``action_items_structured`` carries
        the owner Fireflies grouped the item under, that owner is handed to the
        rewriter as the proposed doer — without it the rewriter sees nameless
        imperatives, can't pick an owner, and drops every item (the bug that left
        the tasks table nearly empty). Owners that don't resolve to an internal
        Alleato employee are still dropped — those actions show up elsewhere as
        project intelligence, not as tracked tasks.
        """
        # Pair each action item with the Fireflies owner, preserving alignment
        # through the same cleaning the items go through.
        if action_items_structured:
            raw_pairs = [
                (str(pair.get("text") or ""), pair.get("assignee"))
                for pair in action_items_structured
            ]
        else:
            raw_pairs = [(item, None) for item in action_items]

        cleaned_pairs: List[tuple[str, Optional[str]]] = []
        for text, owner in raw_pairs:
            stripped = self._strip_action_item_timestamp(text)
            if not stripped or not stripped.strip():
                continue
            if self._is_low_value_task(stripped):
                continue
            cleaned_pairs.append((stripped, owner))
        if not cleaned_pairs:
            return []
        cleaned_items = [text for text, _ in cleaned_pairs]
        cleaned_owners = [owner for _, owner in cleaned_pairs]

        source_date_iso: Optional[str] = None
        if isinstance(source_date, datetime):
            source_date_iso = source_date.date().isoformat()
        elif isinstance(source_date, str):
            try:
                source_date_iso = datetime.fromisoformat(source_date.replace("Z", "+00:00")).date().isoformat()
            except ValueError:
                source_date_iso = None

        rewritten = rewrite_action_items(
            meeting_title=meeting_title,
            action_items=cleaned_items,
            participants=participants or [],
            speaker_email_map=speaker_email_map or {},
            source_date=source_date_iso,
            notes_context=notes_context or "",
            item_owners=cleaned_owners,
        )
        if not rewritten:
            return []

        resolver = TaskAssigneeResolver(self.store._client)
        rows: List[Dict[str, Any]] = []
        seen_descriptions: set[str] = set()

        for task in rewritten:
            resolved = resolver.resolve(task.assignee_name, task.assignee_email)
            if not resolved.is_employee:
                logger.info(
                    "[FirefliesRewriter] Dropping non-employee owner: %r (person_type=%r) title=%r",
                    task.assignee_name,
                    resolved.person_type,
                    task.title,
                )
                continue

            dedupe_key = (task.description or task.title or "").lower().strip()
            if not dedupe_key or dedupe_key in seen_descriptions:
                continue
            seen_descriptions.add(dedupe_key)

            row: Dict[str, Any] = {
                "metadata_id": metadata_id,
                "title": task.title,
                "description": task.description or task.title,
                "assignee_name": resolved.name or task.assignee_name,
                "assignee_person_id": resolved.person_id,
                "due_date": task.due_date,
                "priority": task.priority or "medium",
                "status": "open",
                "source_system": "fireflies",
                "project_id": project_id,
                "project_ids": [project_id] if project_id is not None else [],
                "extraction_source": "fireflies_rewriter",
                "extraction_model": "gpt-5.5",
                "extraction_prompt_version": REWRITER_PROMPT_VERSION,
                "assigned_by": task.assigned_by,
                "extraction_metadata": {
                    "assignee_resolution_method": resolved.method,
                    "assignee_resolution_confidence": resolved.confidence,
                    "assignee_person_type": resolved.person_type,
                    "rewriter_confidence": task.confidence,
                    "source_action_item": task.source_action_item,
                },
            }
            email = resolved.email or task.assignee_email
            if email:
                row["assignee_email"] = email
            rows.append(row)

        return rows

    @classmethod
    def _build_task_rows_from_action_items(
        cls,
        metadata_id: str,
        action_items: List[str],
        project_id: Optional[int],
        speaker_email_map: Optional[Dict[str, str]] = None,
        speakers_json: Optional[List[Dict[str, Any]]] = None,
        attendees_json: Optional[List[Dict[str, Any]]] = None,
        source_date: Optional[datetime | str] = None,
    ) -> List[Dict[str, Any]]:
        rows: List[Dict[str, Any]] = []
        seen_descriptions: set[str] = set()
        for item in action_items:
            description = cls._strip_action_item_timestamp(item)
            if not description:
                continue
            # Skip low-value scheduling/admin noise
            if cls._is_low_value_task(description):
                continue
            dedupe_key = description.lower()
            if dedupe_key in seen_descriptions:
                continue
            seen_descriptions.add(dedupe_key)
            assignee_name, assignee_email = cls._resolve_action_item_assignee(
                action_item=description,
                speaker_email_map=speaker_email_map,
                speakers_json=speakers_json,
                attendees_json=attendees_json,
            )
            # Don't persist placeholder @example.com emails — store None instead
            if assignee_email and "example.com" in assignee_email:
                assignee_email = None
            row: Dict[str, Any] = {
                "metadata_id": metadata_id,
                "description": description,
                "assignee_name": assignee_name,
                "due_date": cls._infer_action_item_due_date(description, source_date),
                "priority": cls._infer_action_item_priority(description),
                "status": "open",
                "source_system": "fireflies",
                "project_id": project_id,
                "project_ids": [project_id] if project_id is not None else [],
            }
            if assignee_email:
                row["assignee_email"] = assignee_email
            rows.append(row)
        return rows

    @staticmethod
    def _append_text_section(lines: List[str], title: str, value: Any) -> None:
        text = str(value).strip() if value is not None else ""
        if not text:
            return
        lines.append(f"## {title}")
        lines.append(text)
        lines.append("")

    @staticmethod
    def _append_list_section(lines: List[str], title: str, value: Any) -> None:
        items: List[str]
        if isinstance(value, list):
            items = [str(v).strip() for v in value if str(v).strip()]
        elif isinstance(value, str):
            items = [s.strip() for s in re.split(r"[,\n]", value) if s.strip()]
        else:
            return
        if not items:
            return
        lines.append(f"## {title}")
        for item in items:
            lines.append(f"- {item}")
        lines.append("")

    @classmethod
    def _append_action_items_section(cls, lines: List[str], value: Any) -> None:
        """Write the Action Items section preserving the ``**Owner**`` grouping."""
        pairs = cls._parse_grouped_action_items(value)
        if not pairs:
            return
        lines.append("## Action Items")
        current_assignee = "__unset__"
        for pair in pairs:
            assignee = pair.get("assignee")
            if assignee != current_assignee:
                if assignee:
                    lines.append(f"**{assignee}**")
                current_assignee = assignee
            lines.append(f"- {pair['text']}")
        lines.append("")

    @staticmethod
    def _format_action_items_storage(pairs: List[Dict[str, Optional[str]]]) -> str:
        """Serialize ``[{assignee, text}]`` to grouped markdown for storage.

        Stored in ``document_metadata.action_items`` so the meeting detail UI can
        render each item under its owner. Falls back to a flat list when no
        owners are present (older transcripts / Fireflies omitted headers).
        """
        out: List[str] = []
        current_assignee = "__unset__"
        for pair in pairs:
            assignee = pair.get("assignee")
            if assignee != current_assignee:
                if assignee:
                    out.append(f"**{assignee}**")
                current_assignee = assignee
            out.append(f"- {pair['text']}")
        return "\n".join(out)

    @staticmethod
    def _append_json_section(lines: List[str], title: str, value: Any) -> None:
        if value is None:
            return
        if isinstance(value, (list, dict)) and not value:
            return
        lines.append(f"## {title}")
        lines.append("```json")
        lines.append(json.dumps(value, indent=2))
        lines.append("```")
        lines.append("")

    # -------------------------------------------------------------------------
    # Meeting-triggered memory extraction
    # -------------------------------------------------------------------------

    def _extract_meeting_memories(
        self,
        document_id: str,
        project_id: Optional[int],
        title: str,
        content: str,
        action_items: List[str],
    ) -> None:
        """Extract team-scoped AI memories from an ingested meeting transcript.

        Uses GPT-4.1-nano to identify facts, lessons, and commitments from the
        meeting. Stores them directly in ai_memories with visibility='team' so
        they are injected for all users, not just the one who triggered ingestion.

        Commitment memories are stored with project linkage so they also surface
        as ai_insights action items via the TypeScript bridge.
        """
        if OpenAI is None:
            logger.debug("OpenAI not available, skipping memory extraction")
            return

        if not os.getenv("OPENAI_API_KEY"):
            raise RuntimeError(
                "OPENAI_API_KEY is required for meeting memory extraction"
            )

        # Build a compact transcript excerpt (first 4,000 chars)
        excerpt = content[:4000]

        # Build action items summary
        action_summary = ""
        if action_items:
            action_summary = "\n\nAction items identified:\n" + "\n".join(
                f"- {item}" for item in action_items[:20]
            )

        prompt = (
            f"Meeting: {title}\n\n"
            f"Transcript excerpt:\n{excerpt}"
            f"{action_summary}\n\n"
            "Extract durable team memories from this meeting. Return a JSON array. "
            "Each object: {\"type\": \"fact\"|\"lesson\"|\"commitment\", "
            "\"content\": \"1-2 sentence memory\", "
            "\"importance\": 0.1-1.0, \"confidence\": 0.1-1.0}\n"
            "Types:\n"
            "- fact: objective facts about projects, people, decisions made\n"
            "- lesson: patterns or institutional knowledge worth remembering\n"
            "- commitment: specific commitments with owner + deadline\n"
            "Rules: be specific (include names, numbers, dates). Max 5 memories. "
            "Return [] if nothing meaningful. Return ONLY valid JSON array."
        )

        client = get_openai_client()
        response = retry_ai_call(
            lambda: client.chat.completions.create(
                model="gpt-4.1-nano",
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
                max_tokens=512,
            ),
            provider_name="OpenAI",
            operation="meeting memory extraction chat",
        )

        raw = (response.choices[0].message.content or "").strip()
        raw = raw.lstrip("```json").lstrip("```").rstrip("```").strip()

        try:
            memories = json.loads(raw)
            if not isinstance(memories, list):
                return
        except (json.JSONDecodeError, ValueError):
            return

        if not memories:
            return

        valid = [
            m for m in memories
            if isinstance(m, dict)
            and m.get("content", "").strip()
            and m.get("type") in ("fact", "lesson", "commitment")
            and float(m.get("importance", 0)) >= 0.3
        ]
        if not valid:
            return

        supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not supabase_url or not supabase_key:
            logger.warning("Supabase env vars not set, cannot store meeting memories")
            return

        import urllib.request

        for mem in valid:
            # DO NOT write embedding to PM APP ai_memories.embedding — HNSW index OOMs under concurrent inserts.
            # Instead: insert text-only to PM APP, then sync embedding to AI DB document_chunks.
            content_text = mem["content"].strip()
            payload = json.dumps({
                "user_id": "00000000-0000-0000-0000-000000000001",
                "type": mem["type"],
                "content": content_text,
                "project_id": project_id,
                "meeting_id": document_id,
                "confidence": float(mem.get("confidence", 0.85)),
                "importance": float(mem.get("importance", 0.5)),
                "source": "meeting_ingest",
                "visibility": "team",
            }).encode("utf-8")

            req = urllib.request.Request(
                f"{supabase_url}/rest/v1/ai_memories",
                data=payload,
                headers={
                    "Content-Type": "application/json",
                    "apikey": supabase_key,
                    "Authorization": f"Bearer {supabase_key}",
                    "Prefer": "return=representation",
                },
                method="POST",
            )
            memory_id: Optional[str] = None
            try:
                with urllib.request.urlopen(req, timeout=10) as resp:
                    if resp.status in (200, 201):
                        body = json.loads(resp.read().decode("utf-8"))
                        rows = body if isinstance(body, list) else [body]
                        if rows and rows[0].get("id"):
                            memory_id = rows[0]["id"]
                    else:
                        logger.warning("Memory insert returned %d", resp.status)
            except Exception as e:
                logger.warning("Failed to insert meeting memory: %s", e)

            # Sync embedding to AI Database document_chunks for semantic search
            if memory_id:
                try:
                    embed_text = f"ai_memory: {content_text}"
                    vecs = self.embedder.embed([embed_text])
                    if vecs:
                        rag_client = get_rag_write_client()
                        rag_client.table("document_chunks").upsert(
                            {
                                "chunk_id": f"ai_memory_{memory_id}",
                                "document_id": memory_id,
                                "chunk_index": 0,
                                "text": embed_text,
                                "source_type": "ai_memory",
                                "embedding": json.dumps(vecs[0]),
                                "metadata": {
                                    "type": mem["type"],
                                    "project_id": project_id,
                                    "meeting_id": document_id,
                                    "source": "meeting_ingest",
                                },
                            },
                            on_conflict="chunk_id",
                        ).execute()
                except Exception as e:
                    logger.warning("Failed to sync memory embedding to AI DB: %s", e)


if __name__ == "__main__":
    # Reason: Provide feedback when script is run directly to confirm imports work
    print("✓ fireflies_pipeline.py loaded successfully!")
    print(f"✓ FirefliesIngestionPipeline class available")
    print(f"✓ DocumentChunk class available")
    print(f"✓ EmbeddingGenerator class available")
    print("\nThis module is a library. To use it:")
    print("  from ingestion.fireflies_pipeline import FirefliesIngestionPipeline")
    print("\nOr run one of the ingestion scripts:")
    print("  python ingest_fireflies_transcripts.py")
    print("  python ingest_fireflies_no_embeddings.py")
