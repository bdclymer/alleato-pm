"""Microsoft Teams meeting transcript + recording sync (native, via Microsoft Graph).

This is the Fireflies replacement for Teams meetings. Teams transcribes and records
meetings natively; Microsoft Graph exposes both the transcript (WebVTT) and the
recording (MP4) tenant-wide. This module:

  1. Enumerates new transcripts via ``/communications/onlineMeetings/getAllTranscripts``
     (and recordings via ``getAllRecordings``), watermarked by ``createdDateTime``.
  2. Fetches the VTT content, parses it into speaker/timestamp/text cues, and renders
     it into the *Fireflies markdown dialect* the existing parser already understands.
  3. Feeds it through the SAME ingestion seam Fireflies uses
     (``FirefliesIngestionPipeline.ingest_markdown_text`` → ``run_full_pipeline``), so
     segmentation, embedding, action-item extraction, and intelligence all run unchanged.
  4. Downloads the MP4 recording and attaches it to the meeting row.

Distinguished from Fireflies rows by ``source='teams_graph'`` / ``transcript_source='teams_graph'``.
The deterministic document id (``teamsmtg_<hash>``) makes re-syncs idempotent.

REQUIRES (external, admin-only — see docs/architecture/AI-RAG-ARCHITECTURE.md):
  - Azure AD application permissions: OnlineMeetingTranscript.Read.All,
    OnlineMeetingRecording.Read.All, OnlineMeetings.Read.All (+ admin consent).
  - A Teams application access policy granting the app id (New-CsApplicationAccessPolicy
    + Grant-CsApplicationAccessPolicy). Without it, transcript/recording reads return 403.
"""

from __future__ import annotations

import hashlib
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from .client import get_graph_client
from ...supabase_helpers import (
    SupabaseRagStore,
    get_supabase_client,
    storage_upload_with_retry,
)

logger = logging.getLogger(__name__)

# Tenant-wide meeting artifact endpoints (v1.0). These are OData functions, not
# delta-capable collections, so we page with @odata.nextLink and filter new items
# client-side by createdDateTime (the same incremental approach the Teams DM path uses).
GET_ALL_TRANSCRIPTS_PATH = "/communications/onlineMeetings/getAllTranscripts"
GET_ALL_RECORDINGS_PATH = "/communications/onlineMeetings/getAllRecordings"

RECORDING_BUCKET = os.environ.get("TEAMS_MEETING_RECORDING_BUCKET", "meeting-recordings")
TRANSCRIPT_BUCKET = os.environ.get("TEAMS_MEETING_TRANSCRIPT_BUCKET", "transcripts")

# Cross-source dedup window: a Teams meeting whose start is within this many minutes
# of an existing meeting row (with high attendee overlap) is treated as the same meeting.
DEDUP_WINDOW_MINUTES = int(os.environ.get("TEAMS_MEETING_DEDUP_WINDOW_MINUTES", "10"))
DEDUP_PREFER = os.environ.get("TEAMS_MEETING_DEDUP_PREFER", "fireflies").strip().lower()


class MeetingAccessPolicyError(Exception):
    """Raised on HTTP 403 reading meeting transcripts/recordings.

    Almost always means the Teams application access policy is missing or the
    OnlineMeeting*.Read.All application permissions were not admin-consented.
    """


# ───────────────────────── VTT parsing ──────────────────────────────────────

_VTT_TIME_RE = re.compile(
    r"(?P<sh>\d{2}):(?P<sm>\d{2}):(?P<ss>\d{2})[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}"
)
_VTT_VOICE_OPEN_RE = re.compile(r"<v\s+([^>]+)>", re.IGNORECASE)
_VTT_TAG_RE = re.compile(r"</?[^>]+>")


def _seconds_to_stamp(total_seconds: int) -> str:
    """Render seconds as ``MM:SS`` (minutes may exceed 99 for long meetings).

    The transcript-line regex in fireflies_pipeline accepts ``\\d{2,}:\\d{2}``, so a
    3-digit minute count (e.g. ``125:30``) parses correctly.
    """
    minutes, seconds = divmod(max(0, int(total_seconds)), 60)
    return f"{minutes:02d}:{seconds:02d}"


def parse_vtt(vtt_text: str) -> List[Tuple[str, Optional[str], str]]:
    """Parse WebVTT into ``[(MM:SS, speaker, text)]`` cues.

    Handles Teams' ``<v Speaker Name>text</v>`` voice tags, cue identifiers, and
    multi-line cue text. Cues without a voice tag yield ``speaker=None``.
    """
    cues: List[Tuple[str, Optional[str], str]] = []
    if not vtt_text:
        return cues

    # Split into blocks on blank lines; tolerate \r\n.
    blocks = re.split(r"\r?\n\s*\r?\n", vtt_text.strip())
    for block in blocks:
        lines = [ln for ln in block.splitlines() if ln.strip()]
        if not lines:
            continue
        ts_idx = next((i for i, ln in enumerate(lines) if "-->" in ln), None)
        if ts_idx is None:
            continue  # header ("WEBVTT") / NOTE blocks
        match = _VTT_TIME_RE.search(lines[ts_idx])
        if not match:
            continue
        start_seconds = (
            int(match.group("sh")) * 3600
            + int(match.group("sm")) * 60
            + int(match.group("ss"))
        )
        raw_text = " ".join(lines[ts_idx + 1 :]).strip()
        if not raw_text:
            continue
        speaker = None
        voice = _VTT_VOICE_OPEN_RE.search(raw_text)
        if voice:
            speaker = voice.group(1).strip()
        text = _VTT_TAG_RE.sub("", raw_text).strip()
        if not text:
            continue
        cues.append((_seconds_to_stamp(start_seconds), speaker, text))
    return cues


def build_meeting_markdown(
    *,
    title: str,
    date_iso: Optional[str],
    meeting_doc_key: str,
    attendees: List[str],
    cues: List[Tuple[str, Optional[str], str]],
    organizer_email: Optional[str] = None,
) -> str:
    """Render parsed cues into the Fireflies markdown dialect ``parse_markdown`` reads.

    The ``**ID:**`` line drives the deterministic document id (parsed as the
    fireflies_id slot → ``document_id``), keeping the meeting row and its chunks on
    the same id across re-syncs.
    """
    lines: List[str] = [f"# {title or 'Teams Meeting'}", ""]
    if date_iso:
        lines.append(f"**Date:** {date_iso}")
    if organizer_email:
        lines.append(f"**Organizer Email:** {organizer_email}")
    if attendees:
        lines.append(f"**Participants:** {', '.join(attendees)}")
    lines.append(f"**ID:** {meeting_doc_key}")
    lines.append("")
    lines.append("## Transcript")
    lines.append("")
    for stamp, speaker, text in cues:
        lines.append(f"[{stamp}] **{speaker or 'Unknown'}**: {text}")
    return "\n".join(lines).strip() + "\n"


# ───────────────────────── identity / keys ──────────────────────────────────

def _meeting_doc_key(graph_meeting_id: str) -> str:
    digest = hashlib.sha256(graph_meeting_id.encode("utf-8")).hexdigest()[:16]
    return f"teamsmtg_{digest}"


def _organizer_user_id(entry: Dict[str, Any]) -> Optional[str]:
    organizer = entry.get("meetingOrganizer") or {}
    user = organizer.get("user") or {}
    return user.get("id") or organizer.get("id")


# Module-level TTL-free cache for organizer display-name/email lookups within a run.
_organizer_cache: Dict[str, Dict[str, Optional[str]]] = {}


def _resolve_organizer(graph, organizer_id: Optional[str]) -> Dict[str, Optional[str]]:
    if not organizer_id:
        return {"displayName": None, "mail": None}
    if organizer_id in _organizer_cache:
        return _organizer_cache[organizer_id]
    info: Dict[str, Optional[str]] = {"displayName": None, "mail": None}
    try:
        data = graph.get(f"/users/{organizer_id}", params={"$select": "displayName,mail,userPrincipalName"})
        info = {
            "displayName": data.get("displayName"),
            "mail": data.get("mail") or data.get("userPrincipalName"),
        }
    except Exception as exc:  # noqa: BLE001 - best-effort enrichment
        logger.warning("[TeamsMeetings] Could not resolve organizer %s: %s", organizer_id, exc)
    _organizer_cache[organizer_id] = info
    return info


def _resolve_meeting_metadata(
    graph, organizer_id: Optional[str], graph_meeting_id: str
) -> Dict[str, Any]:
    """Resolve subject / participants / start / duration for a meeting.

    Primary: GET /users/{organizerId}/onlineMeetings/{meetingId}. Falls back to a
    minimal organizer-only record (tagged unresolved) so a transcript is never dropped
    just because its metadata could not be resolved.
    """
    organizer = _resolve_organizer(graph, organizer_id)
    result: Dict[str, Any] = {
        "title": None,
        "attendees": [],
        "start": None,
        "end": None,
        "organizer_email": organizer.get("mail"),
        "resolved": False,
    }
    if organizer_id:
        try:
            meeting = graph.get(f"/users/{organizer_id}/onlineMeetings/{graph_meeting_id}")
            result["title"] = meeting.get("subject")
            result["start"] = meeting.get("startDateTime")
            result["end"] = meeting.get("endDateTime")
            participants = meeting.get("participants") or {}
            names: List[str] = []
            org_part = participants.get("organizer") or {}
            for entry in [org_part, *(participants.get("attendees") or [])]:
                identity = (entry.get("identity") or {}).get("user") or {}
                name = identity.get("displayName") or entry.get("upn")
                if name and name not in names:
                    names.append(name)
            result["attendees"] = names
            result["resolved"] = True
        except Exception as exc:  # noqa: BLE001
            logger.info(
                "[TeamsMeetings] onlineMeeting metadata unresolved for %s: %s",
                graph_meeting_id,
                exc,
            )
    # Fallbacks
    if not result["attendees"] and organizer.get("displayName"):
        result["attendees"] = [organizer["displayName"]]
    return result


def _parse_iso(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _duration_minutes(start: Optional[str], end: Optional[str]) -> Optional[int]:
    start_dt, end_dt = _parse_iso(start), _parse_iso(end)
    if start_dt and end_dt and end_dt > start_dt:
        return max(1, int(round((end_dt - start_dt).total_seconds() / 60)))
    return None


# ───────────────────────── cross-source dedup ───────────────────────────────

def _find_existing_meeting_by_window(
    store: SupabaseRagStore, start_iso: Optional[str], attendees: List[str]
) -> Optional[Dict[str, Any]]:
    """Find an existing meeting row within ±DEDUP_WINDOW_MINUTES with attendee overlap.

    Used so a meeting already captured by Fireflies is not duplicated by Teams-Graph
    during the parallel-run rollout.
    """
    start_dt = _parse_iso(start_iso)
    if not start_dt:
        return None
    from datetime import timedelta

    low = (start_dt - timedelta(minutes=DEDUP_WINDOW_MINUTES)).isoformat()
    high = (start_dt + timedelta(minutes=DEDUP_WINDOW_MINUTES)).isoformat()
    try:
        resp = (
            store._client.table("document_metadata")
            .select("id, source, participants, participants_array, date")
            .eq("type", "meeting")
            .is_("deleted_at", "null")
            .gte("date", low)
            .lte("date", high)
            .limit(10)
            .execute()
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("[TeamsMeetings] Dedup window query failed: %s", exc)
        return None

    candidate_names = {a.strip().lower() for a in attendees if a and a.strip()}
    for row in resp.data or []:
        row_names = set()
        for name in row.get("participants_array") or []:
            if name:
                row_names.add(str(name).strip().lower())
        if not row_names and row.get("participants"):
            row_names = {
                p.strip().lower()
                for p in str(row["participants"]).replace("{", "").replace("}", "").replace('"', "").split(",")
                if p.strip()
            }
        if not candidate_names or not row_names:
            # No reliable attendee signal — match on the time window alone.
            return row
        overlap = len(candidate_names & row_names)
        if overlap >= max(1, int(len(candidate_names) * 0.5)):
            return row
    return None


# ───────────────────────── transcript ingest ────────────────────────────────

def _process_transcript(graph, store: SupabaseRagStore, entry: Dict[str, Any]) -> str:
    """Ingest one transcript entry. Returns a short status string for logging."""
    graph_meeting_id = entry.get("meetingId") or ""
    content_url = entry.get("transcriptContentUrl")
    if not graph_meeting_id or not content_url:
        return "skipped_incomplete"

    doc_key = _meeting_doc_key(graph_meeting_id)
    organizer_id = _organizer_user_id(entry)
    meta = _resolve_meeting_metadata(graph, organizer_id, graph_meeting_id)

    # Cross-source dedup: if Fireflies already covers this meeting, don't create a
    # second row (the recording pass will still attach the MP4 to the existing row).
    if DEDUP_PREFER == "fireflies":
        existing = _find_existing_meeting_by_window(store, meta.get("start"), meta.get("attendees"))
        if existing and (existing.get("source") or "").lower() == "fireflies":
            logger.info(
                "[TeamsMeetings] Meeting %s already captured by Fireflies (%s); skipping transcript ingest",
                graph_meeting_id,
                existing.get("id"),
            )
            return "skipped_dedup_fireflies"

    # Fetch VTT content (403 here ⇒ missing access policy / consent).
    try:
        sep = "&" if "?" in content_url else "?"
        vtt_bytes = graph.download_bytes(f"{content_url}{sep}$format=text/vtt")
    except Exception as exc:  # noqa: BLE001
        if "403" in str(exc):
            raise MeetingAccessPolicyError(str(exc)) from exc
        raise
    vtt_text = vtt_bytes.decode("utf-8", errors="replace")
    cues = parse_vtt(vtt_text)
    if not cues:
        return "skipped_empty_transcript"

    created = entry.get("createdDateTime")
    date_iso = meta.get("start") or created
    title = meta.get("title") or f"Teams Meeting {(date_iso or '')[:10]}".strip()

    markdown = build_meeting_markdown(
        title=title,
        date_iso=date_iso,
        meeting_doc_key=doc_key,
        attendees=meta.get("attendees") or [],
        cues=cues,
        organizer_email=meta.get("organizer_email"),
    )

    # Persist the raw VTT to storage for provenance / re-parsing.
    storage_url: Optional[str] = None
    try:
        storage_url = store.upload_public_text(
            TRANSCRIPT_BUCKET,
            f"teams-meetings/{doc_key}/transcript.vtt",
            vtt_text,
            content_type="text/vtt; charset=utf-8",
        )
    except Exception as exc:  # noqa: BLE001 - storage is best-effort
        logger.warning("[TeamsMeetings] VTT storage upload failed for %s: %s", doc_key, exc)

    extra_metadata: Dict[str, Any] = {
        "source": "teams_graph",
        "category": "meeting",
        "transcript_source": "teams_graph",
        "teams_meeting_id": graph_meeting_id,
        "duration_minutes": _duration_minutes(meta.get("start"), meta.get("end")),
        "fireflies_link": None,  # never a Fireflies row
    }
    if not meta.get("resolved"):
        extra_metadata["tags"] = "teams,meeting,unresolved_metadata"

    # Reuse the proven Fireflies ingest seam, then run the full pipeline.
    from ...ingestion.fireflies_pipeline import FirefliesIngestionPipeline
    from ...pipeline.orchestrator import run_full_pipeline

    pipeline = FirefliesIngestionPipeline(store=store)
    result = pipeline.ingest_markdown_text(
        markdown,
        storage_url=storage_url,
        extra_metadata=extra_metadata,
    )
    if result.skipped:
        return "skipped_unchanged"
    run_full_pipeline(result.document_id)
    return "ingested"


def sync_meeting_transcripts(
    supabase, since_iso: Optional[str]
) -> Tuple[int, str]:
    """Enumerate + ingest new Teams meeting transcripts.

    ``since_iso`` is the watermark (max createdDateTime previously seen). Returns
    ``(ingested_count, new_watermark_iso)``. Mirrors the timestamp-incremental shape
    of the Teams DM sync (``graph_sync_state.delta_token`` holds an ISO watermark).
    """
    graph = get_graph_client()
    store = SupabaseRagStore(client=get_supabase_client())

    entries = graph.get_all_pages(GET_ALL_TRANSCRIPTS_PATH)
    watermark = since_iso or ""
    ingested = 0
    seen = 0
    for entry in entries:
        created = entry.get("createdDateTime") or ""
        if since_iso and created and created <= since_iso:
            continue  # already processed in a prior run
        seen += 1
        try:
            status = _process_transcript(graph, store, entry)
            if status == "ingested":
                ingested += 1
        except MeetingAccessPolicyError:
            raise
        except Exception as exc:  # noqa: BLE001 - one bad transcript must not abort the run
            logger.error(
                "[TeamsMeetings] Failed to process transcript for meeting %s: %s",
                entry.get("meetingId"),
                exc,
                exc_info=True,
            )
        if created and created > watermark:
            watermark = created
    logger.info("[TeamsMeetings] Transcripts: %d new seen, %d ingested", seen, ingested)
    return ingested, watermark


# ───────────────────────── recording attach ─────────────────────────────────

def _process_recording(graph, store: SupabaseRagStore, entry: Dict[str, Any]) -> str:
    graph_meeting_id = entry.get("meetingId") or ""
    content_url = entry.get("recordingContentUrl")
    if not graph_meeting_id or not content_url:
        return "skipped_incomplete"

    doc_key = _meeting_doc_key(graph_meeting_id)

    # Find the meeting row this recording belongs to: the transcript-created row by id,
    # else a Fireflies row matched by time window, else a minimal stub keyed by doc_key.
    target_id = doc_key
    try:
        existing = store._client.table("document_metadata").select("id").eq("id", doc_key).limit(1).execute()
        if not (existing.data or []):
            organizer_id = _organizer_user_id(entry)
            meta = _resolve_meeting_metadata(graph, organizer_id, graph_meeting_id)
            matched = _find_existing_meeting_by_window(store, meta.get("start"), meta.get("attendees"))
            if matched:
                target_id = matched["id"]
            else:
                # Stub so the recording isn't lost; a later transcript sync fills content.
                store.upsert_document_metadata(
                    {
                        "id": doc_key,
                        "type": "meeting",
                        "category": "meeting",
                        "source": "teams_graph",
                        "transcript_source": "teams_graph",
                        "teams_meeting_id": graph_meeting_id,
                        "title": meta.get("title") or f"Teams Meeting {(meta.get('start') or '')[:10]}".strip(),
                        "date": meta.get("start") or entry.get("createdDateTime"),
                        "status": "recording_only",
                    }
                )
    except Exception as exc:  # noqa: BLE001
        logger.warning("[TeamsMeetings] Recording target lookup failed for %s: %s", doc_key, exc)

    try:
        sep = "&" if "?" in content_url else "?"
        mp4_bytes = graph.download_bytes(f"{content_url}{sep}$format=mp4")
    except Exception as exc:  # noqa: BLE001
        if "403" in str(exc):
            raise MeetingAccessPolicyError(str(exc)) from exc
        raise

    storage_path = f"teams-meetings/{doc_key}/recording.mp4"
    try:
        storage_upload_with_retry(
            store._client.storage.from_(RECORDING_BUCKET),
            storage_path,
            mp4_bytes,
            {"content-type": "video/mp4", "upsert": "true"},
        )
    except Exception as exc:  # noqa: BLE001 - recording is value-add, never fatal
        logger.warning("[TeamsMeetings] Recording upload failed for %s: %s", doc_key, exc)
        return "skipped_storage_failed"

    store.upsert_document_metadata(
        {
            "id": target_id,
            "recording_storage_path": f"{RECORDING_BUCKET}/{storage_path}",
        }
    )
    return "attached"


def sync_meeting_recordings(supabase, since_iso: Optional[str]) -> Tuple[int, str]:
    """Enumerate + attach new Teams meeting recordings. Returns (count, new_watermark)."""
    graph = get_graph_client()
    store = SupabaseRagStore(client=get_supabase_client())

    entries = graph.get_all_pages(GET_ALL_RECORDINGS_PATH)
    watermark = since_iso or ""
    attached = 0
    for entry in entries:
        created = entry.get("createdDateTime") or ""
        if since_iso and created and created <= since_iso:
            continue
        try:
            if _process_recording(graph, store, entry) == "attached":
                attached += 1
        except MeetingAccessPolicyError:
            raise
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "[TeamsMeetings] Failed to process recording for meeting %s: %s",
                entry.get("meetingId"),
                exc,
                exc_info=True,
            )
        if created and created > watermark:
            watermark = created
    logger.info("[TeamsMeetings] Recordings: %d attached", attached)
    return attached, watermark
