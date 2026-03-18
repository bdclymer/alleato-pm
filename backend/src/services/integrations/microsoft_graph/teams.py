"""
Microsoft Teams Channel Message Ingestion
Fetches channel messages and threads from Teams via Microsoft Graph API.
"""
import logging
import re
from datetime import datetime, timezone
from typing import Optional

from .client import get_graph_client

logger = logging.getLogger(__name__)

MIN_MESSAGE_CHARS = 20


def _strip_html(text: str) -> str:
    text = re.sub(r'<[^>]+>', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


def _format_thread_as_text(thread_messages: list[dict], channel_name: str, team_name: str) -> str:
    """Format a Teams thread (root message + replies) as plain text."""
    lines = [f"[Teams Channel: {team_name} / {channel_name}]", ""]
    for msg in thread_messages:
        if not msg:  # Skip None/deleted messages
            continue
        sender = msg.get("from", {}) or {}
        user = sender.get("user", {}) or {}
        name = user.get("displayName", "Unknown")
        created = msg.get("createdDateTime", "")[:10]
        body = _strip_html((msg.get("body") or {}).get("content", ""))
        if body:
            lines.append(f"[{created}] {name}: {body}")
    return "\n".join(lines)


def sync_teams_channel(
    supabase_client,
    team_id: str,
    team_name: str,
    channel_id: str,
    channel_name: str,
    delta_token: Optional[str] = None,
) -> tuple[int, str]:
    """
    Sync messages from a Teams channel. Returns (count_synced, new_delta_token).
    """
    graph = get_graph_client()
    if not graph.is_configured():
        logger.warning("[Teams] Microsoft Graph not configured — skipping")
        return 0, delta_token or ""

    delta_path = f"/teams/{team_id}/channels/{channel_id}/messages/delta"

    try:
        items, new_delta_token = graph.get_delta(delta_path, delta_token)
    except Exception as e:
        logger.error(f"[Teams] Delta query failed for {team_name}/{channel_name}: {e}")
        # Clear delta token on error so next sync retries from scratch
        return 0, ""

    synced = 0
    for msg in items:
        try:
            _process_teams_message(supabase_client, graph, msg, team_id, team_name, channel_id, channel_name)
            synced += 1
        except _AlreadyIngested:
            pass
        except Exception as e:
            logger.warning(f"[Teams] Skipping message due to error: {e}", exc_info=True)

    logger.info(f"[Teams] Synced {synced} threads from {team_name}/{channel_name}")
    return synced, new_delta_token


class _AlreadyIngested(Exception):
    pass


def _process_teams_message(supabase_client, graph, msg, team_id, team_name, channel_id, channel_name):
    """Process a single Teams message. Raises _AlreadyIngested if already in DB, or other exceptions on error."""
    if not msg:
        raise _AlreadyIngested()
    if "@removed" in msg:
        raise _AlreadyIngested()

    # Only process root messages (messageType == message, not replies or system msgs)
    if msg.get("messageType") != "message":
        raise _AlreadyIngested()

    msg_id = msg.get("id", "")
    if not msg_id:
        raise _AlreadyIngested()

    # Fetch replies to build the full thread
    thread_messages = [msg]
    try:
        replies = graph.get_all_pages(
            f"/teams/{team_id}/channels/{channel_id}/messages/{msg_id}/replies"
        )
        thread_messages.extend(r for r in replies if r)
    except Exception:
        pass  # Proceed with just the root message

    thread_text = _format_thread_as_text(thread_messages, channel_name, team_name)
    if len(thread_text) < MIN_MESSAGE_CHARS:
        raise _AlreadyIngested()

    doc_id = f"teams_{msg_id}"

    # Check if already ingested
    existing = supabase_client.from_("document_metadata").select("id").eq("id", doc_id).execute()
    if existing and existing.data:
        raise _AlreadyIngested()

    # Upload to storage
    storage_path = f"teams/{team_id}/{channel_id}/{msg_id}.txt"
    try:
        supabase_client.storage.from_("documents").upload(
            storage_path,
            thread_text.encode("utf-8"),
            {"content-type": "text/plain", "upsert": "true"},
        )
    except Exception as e:
        logger.warning(f"[Teams] Storage upload failed for {msg_id}: {e}")
        raise

    created = msg.get("createdDateTime", datetime.now(timezone.utc).isoformat())
    from_field = msg.get("from")
    sender = (from_field if isinstance(from_field, dict) else {}).get("user") or {}
    sender_name = sender.get("displayName", "Unknown") if isinstance(sender, dict) else "Unknown"

    supabase_client.from_("document_metadata").insert({
        "id": doc_id,
        "title": f"Teams: {team_name} / {channel_name}",
        "source": "microsoft_graph",
        "category": "teams_message",
        "type": "teams_message",
        "content": thread_text,
        "date": created[:10] if created else None,
        "participants": [sender_name],
        "status": "raw_ingested",
        "tags": ["teams", team_name.lower(), channel_name.lower()],
    }).execute()


def get_all_teams_and_channels(supabase_client) -> list[dict]:
    """
    Enumerate all teams and channels accessible to the app.
    Returns list of {team_id, team_name, channel_id, channel_name}.
    """
    graph = get_graph_client()
    channels = []
    try:
        teams = graph.get_all_pages("/teams")
        for team in teams:
            team_id = team["id"]
            team_name = team.get("displayName", team_id)
            try:
                team_channels = graph.get_all_pages(f"/teams/{team_id}/channels")
                for ch in team_channels:
                    channels.append({
                        "team_id": team_id,
                        "team_name": team_name,
                        "channel_id": ch["id"],
                        "channel_name": ch.get("displayName", ch["id"]),
                    })
            except Exception as e:
                logger.warning(f"[Teams] Failed to get channels for {team_name}: {e}")
    except Exception as e:
        logger.error(f"[Teams] Failed to enumerate teams: {e}")
    return channels
