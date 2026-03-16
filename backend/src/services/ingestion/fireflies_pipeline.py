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
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional
from uuid import NAMESPACE_URL, uuid4, uuid5

import requests

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

from supabase_helpers import DocumentChunk, SupabaseRagStore

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
    # Rich section fields (populated from new Fireflies markdown format)
    rich_sections: Dict[str, str] = None  # type: ignore[assignment]
    notes_topics: Dict[str, str] = None  # type: ignore[assignment]
    speakers_json: List[Dict[str, Any]] = None  # type: ignore[assignment]
    attendees_json: List[Dict[str, Any]] = None  # type: ignore[assignment]
    speaker_email_map: Dict[str, str] = None  # type: ignore[assignment]

    def __post_init__(self):
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
    """Produces embeddings using OpenAI when available, otherwise hashed vectors."""

    def __init__(self, model: str = "text-embedding-3-small") -> None:
        self.model = model
        self._client = None
        if os.getenv("OPENAI_API_KEY") and OpenAI is not None:
            self._client = OpenAI()

    def embed(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        if self._client is None:
            return [self._hash_embedding(text) for text in texts]
        response = self._client.embeddings.create(model=self.model, input=texts)
        return [item.embedding for item in response.data]

    @staticmethod
    def _hash_embedding(text: str, dim: int = 64) -> List[float]:
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        floats: List[float] = []
        for i in range(dim):
            byte = digest[i % len(digest)]
            floats.append((byte - 128) / 128.0)
        return floats


class FirefliesIngestionPipeline:
    """Convert Fireflies markdown exports into Supabase rows."""

    def __init__(self, store: SupabaseRagStore, embedding_model: str = "text-embedding-3-small") -> None:
        self.store = store
        self.embedder = EmbeddingGenerator(model=embedding_model)
        self._fireflies_api_url = "https://api.fireflies.ai/graphql"
        self._fireflies_api_key = os.getenv("FIREFLIES_API_KEY")
        self._project_assigner = None

    def _get_project_assigner(self):
        if self._project_assigner is not None:
            return self._project_assigner
        try:
            from ..alleato_agent_workflow.tools.project_assignment import ProjectAssigner
        except Exception:
            return None
        self._project_assigner = ProjectAssigner(self.store._client)
        return self._project_assigner

    def _infer_project_id_from_context(
        self,
        title: str,
        participants: List[str],
        content: str,
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
                existing_project_id=None,
            )
        except Exception as exc:
            logger.warning("[FirefliesIngestion] Project inference failed: %s", exc)
            return None

        if inferred_id and confidence >= min_confidence:
            logger.info(
                "[FirefliesIngestion] Auto-assigned project_id=%s via %s (confidence=%.2f)",
                inferred_id,
                method,
                confidence,
            )
            return int(inferred_id)
        return None

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
        existing_by_fireflies = self.store.find_document_by_fireflies_id(parsed.fireflies_id)
        inferred_project_id: Optional[int] = None
        if project_id is None and (existing or {}).get("project_id") is None and (existing_by_fireflies or {}).get("project_id") is None:
            inferred_project_id = self._infer_project_id_from_context(
                title=parsed.title,
                participants=parsed.attendees,
                content=parsed.raw_text,
            )
        effective_project_id = (
            project_id
            if project_id is not None
            else (existing or {}).get("project_id")
            or (existing_by_fireflies or {}).get("project_id")
            or inferred_project_id
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
            "fireflies_id": parsed.fireflies_id,
            "summary": parsed.summary or parsed.overview,
            "overview": parsed.overview or parsed.summary,
            "action_items": "\n".join(parsed.action_items),
            "content_hash": content_hash,
            "participants": ", ".join(parsed.attendees),
            "participants_array": parsed.attendees,
            "content": parsed.raw_text,
            "raw_text": parsed.raw_text,
            "project_id": effective_project_id,
            "url": storage_url,
        }

        segments = parsed.transcript_segments
        chunks = list(self._chunk_segments(document_id, segments, effective_project_id))

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
            for task in self._build_task_rows_from_action_items(
                metadata_id=document_id,
                action_items=parsed.action_items,
                project_id=effective_project_id,
                speaker_email_map=parsed.speaker_email_map,
                speakers_json=parsed.speakers_json,
                attendees_json=parsed.attendees_json,
            ):
                self.store.upsert_task(task)
            embeddings = self.embedder.embed([chunk.text for chunk in chunks])
            for chunk, embedding in zip(chunks, embeddings):
                chunk.embedding = embedding
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
            # Runs best-effort: failures don't block ingestion.
            try:
                self._extract_meeting_memories(
                    document_id=document_id,
                    project_id=effective_project_id,
                    title=parsed.title,
                    content=parsed.raw_text,
                    action_items=parsed.action_items,
                )
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
        if not self._fireflies_api_key:
            raise RuntimeError("FIREFLIES_API_KEY is required for Fireflies sync")

        target_limit = max(1, min(limit, 100))
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

                ingestion = self.ingest_markdown_text(
                    markdown,
                    project_id=project_id,
                    dry_run=dry_run,
                    storage_url=storage_url,
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

        return {
            "requested": target_limit,
            "found": len(summaries),
            "processed": len(results),
            "error_count": sum(1 for r in results if "error" in r),
            "results": results,
        }

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
        data = self._fireflies_query(query, {"limit": limit, "skip": 0})
        return data.get("transcripts") or []

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
        self._append_list_section(
            lines,
            "Action Items",
            self._normalize_action_items(summary.get("action_items")),
        )
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
        block = sections.get("Action Items", "")
        items = self._parse_bullets(block)
        if items:
            return items
        return self._normalize_action_items(block)

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
    ) -> Iterable[DocumentChunk]:
        if not segments:
            return []
        window: List[TranscriptSegment] = []
        index = 0
        for segment in segments:
            window.append(segment)
            if len(window) >= chunk_size:
                yield self._build_chunk(document_id, index, window, project_id)
                index += 1
                window = window[-overlap:]
        if window:
            yield self._build_chunk(document_id, index, window, project_id)

    @staticmethod
    def _build_chunk(
        document_id: str,
        index: int,
        segments: List[TranscriptSegment],
        project_id: Optional[int],
    ) -> DocumentChunk:
        lines = [f"[{seg.timestamp or '??:??'}] {seg.speaker or 'Unknown'}: {seg.text}" for seg in segments]
        text = "\n".join(lines)
        metadata = {
            "chunk_index": index,
            "speakers": sorted({seg.speaker or "Unknown" for seg in segments}),
            "start_timestamp": segments[0].timestamp,
            "end_timestamp": segments[-1].timestamp,
            "project_id": project_id,
        }
        return DocumentChunk(
            document_id=document_id,
            chunk_index=index,
            chunk_id=f"{document_id}-{index}",
            text=text,
            metadata=metadata,
            content_hash=hashlib.sha256(text.encode("utf-8")).hexdigest(),
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

    @classmethod
    def _build_task_rows_from_action_items(
        cls,
        metadata_id: str,
        action_items: List[str],
        project_id: Optional[int],
        speaker_email_map: Optional[Dict[str, str]] = None,
        speakers_json: Optional[List[Dict[str, Any]]] = None,
        attendees_json: Optional[List[Dict[str, Any]]] = None,
    ) -> List[Dict[str, Any]]:
        rows: List[Dict[str, Any]] = []
        seen_descriptions: set[str] = set()
        for item in action_items:
            description = cls._strip_action_item_timestamp(item)
            if not description:
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
            row: Dict[str, Any] = {
                "metadata_id": metadata_id,
                "description": description,
                "assignee_name": assignee_name,
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

        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return

        client = OpenAI(api_key=api_key)

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

        response = client.chat.completions.create(
            model="gpt-4.1-nano",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=512,
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

        # Embed all memories in one batch
        valid = [
            m for m in memories
            if isinstance(m, dict)
            and m.get("content", "").strip()
            and m.get("type") in ("fact", "lesson", "commitment")
            and float(m.get("importance", 0)) >= 0.3
        ]
        if not valid:
            return

        texts = [m["content"][:500] for m in valid]
        embeddings_resp = client.embeddings.create(
            model="text-embedding-3-small",
            input=texts,
        )
        embeddings = [e.embedding for e in embeddings_resp.data]

        supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not supabase_url or not supabase_key:
            logger.warning("Supabase env vars not set, cannot store meeting memories")
            return

        import urllib.request

        for mem, embedding in zip(valid, embeddings):
            # Use a deterministic system user_id for team memories (nil UUID)
            # Team memories have visibility='team' so they're shared across all users.
            # We use the Supabase service role key for direct insert.
            payload = json.dumps({
                "user_id": "00000000-0000-0000-0000-000000000001",  # system/team user
                "type": mem["type"],
                "content": mem["content"].strip(),
                "embedding": json.dumps(embedding),
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
                    "Prefer": "return=minimal",
                },
                method="POST",
            )
            try:
                with urllib.request.urlopen(req, timeout=10) as resp:
                    if resp.status not in (200, 201):
                        logger.warning("Memory insert returned %d", resp.status)
            except Exception as e:
                logger.warning("Failed to insert meeting memory: %s", e)


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
