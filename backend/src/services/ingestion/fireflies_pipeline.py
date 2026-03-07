"""Utilities to ingest Fireflies markdown transcripts into Supabase."""

from __future__ import annotations

import hashlib
import json
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
        content_hash = hashlib.sha256(parsed.raw_text.encode("utf-8")).hexdigest()

        existing = self.store.find_document_by_hash(content_hash)
        existing_by_fireflies = self.store.find_document_by_fireflies_id(parsed.fireflies_id)
        effective_project_id = (
            project_id
            if project_id is not None
            else (existing or {}).get("project_id")
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
            "fireflies_id": parsed.fireflies_id,
            "summary": parsed.summary or parsed.overview,
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
            embeddings = self.embedder.embed([chunk.text for chunk in chunks])
            for chunk, embedding in zip(chunks, embeddings):
                chunk.embedding = embedding
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
                    storage_url = self.store.upload_public_text("meetings", storage_path, markdown)

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
            sentences { speaker_name text start_time end_time }
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
        query Apps($transcriptId: String!, $limit: Float) {
          apps(transcript_id: $transcriptId, limit: $limit) {
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
        try:
            data = self._fireflies_query(query, {"transcriptId": transcript_id, "limit": 5})
            return (data.get("apps") or {}).get("outputs") or []
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
                lines.append(f"[{stamp}] **{speaker}**: {text}")

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
