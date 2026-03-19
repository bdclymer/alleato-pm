"""
Microsoft Teams Message Ingestion
Fetches channel messages/threads and direct messages (chats) from Teams via Microsoft Graph API.
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


# ─────────────────────────────────────────────────────────────────────────────
# Direct Messages (Chats)
# Uses /users/{user}/chats and /chats/{chatId}/messages/delta
# Requires: Chat.Read.All (application permission)
# Optional: ChatMember.Read.All for member names (graceful fallback if absent)
# ─────────────────────────────────────────────────────────────────────────────

def _chat_display_name(chat: dict) -> tuple[str, list[str]]:
    """
    Build a human-readable label for a chat and return (display_name, [member_names]).
    Falls back gracefully if members weren't expanded.
    """
    members_raw = chat.get("members") or []
    member_names = [
        m.get("displayName", "").strip()
        for m in members_raw
        if isinstance(m, dict) and m.get("displayName")
    ]

    topic = (chat.get("topic") or "").strip()
    chat_type = chat.get("chatType", "")

    if topic:
        display = topic
    elif chat_type == "oneOnOne" and len(member_names) >= 2:
        display = " ↔ ".join(member_names[:2])
    elif member_names:
        display = ", ".join(member_names[:4])
        if len(member_names) > 4:
            display += f" +{len(member_names) - 4}"
    else:
        display = chat.get("id", "Unknown")[:12]

    return display, member_names


def get_user_chats(user_email: str) -> list[dict]:
    """
    List all oneOnOne and group chats for a user.
    Returns list of dicts with keys: id, chatType, display_name, member_names.
    Requires Chat.Read.All. Member names require ChatMember.Read.All (optional).
    """
    graph = get_graph_client()
    chats = []

    # Try with member expansion first; fall back without it if forbidden
    for params in [
        {"$select": "id,chatType,topic", "$expand": "members($select=displayName,email)"},
        {"$select": "id,chatType,topic"},
    ]:
        try:
            raw = graph.get_all_pages(f"/users/{user_email}/chats", params=params)
            for c in raw:
                if c.get("chatType") not in ("oneOnOne", "group"):
                    continue
                display, members = _chat_display_name(c)
                chats.append({
                    "id": c["id"],
                    "chatType": c.get("chatType"),
                    "display_name": display,
                    "member_names": members,
                })
            logger.info(f"[Teams DM] Found {len(chats)} chats for {user_email}")
            return chats
        except Exception as e:
            if "members" in params.get("$expand", "") and any(code in str(e) for code in ("400", "403", "Forbidden", "Bad Request")):
                logger.warning(f"[Teams DM] Member expansion not supported — retrying without it")
                continue
            logger.error(f"[Teams DM] Failed to list chats for {user_email}: {e}")
            raise

    return chats


def _process_chat_message(
    supabase_client,
    msg: dict,
    chat_id: str,
    chat_display_name: str,
    chat_members: list[str],
) -> None:
    """Store a single Teams DM message. Raises _AlreadyIngested to skip."""
    if not msg or "@removed" in msg:
        raise _AlreadyIngested()
    if msg.get("messageType") != "message":
        raise _AlreadyIngested()

    msg_id = msg.get("id", "")
    if not msg_id:
        raise _AlreadyIngested()

    body = _strip_html((msg.get("body") or {}).get("content", ""))
    if len(body) < MIN_MESSAGE_CHARS:
        raise _AlreadyIngested()

    doc_id = f"teamsdm_{msg_id}"

    existing = supabase_client.from_("document_metadata").select("id").eq("id", doc_id).execute()
    if existing and existing.data:
        raise _AlreadyIngested()

    sender_field = msg.get("from") or {}
    user_field = sender_field.get("user") or {}
    sender_name = user_field.get("displayName", "Unknown") if isinstance(user_field, dict) else "Unknown"
    created = msg.get("createdDateTime", datetime.now(timezone.utc).isoformat())

    text = f"[Teams Direct Message: {chat_display_name}]\n\n[{created[:10]}] {sender_name}: {body}"

    storage_path = f"teams/chats/{chat_id}/{msg_id}.txt"
    try:
        supabase_client.storage.from_("documents").upload(
            storage_path,
            text.encode("utf-8"),
            {"content-type": "text/plain", "upsert": "true"},
        )
    except Exception as e:
        logger.warning(f"[Teams DM] Storage upload failed for {msg_id}: {e}")
        raise

    supabase_client.from_("document_metadata").insert({
        "id": doc_id,
        "title": f"Teams DM: {chat_display_name}",
        "source": "microsoft_graph",
        "category": "teams_message",  # same category → picked up by searchTeamsMessages tool
        "type": "teams_dm",
        "content": text,
        "date": created[:10] if created else None,
        "participants": chat_members or [sender_name],
        "status": "raw_ingested",
        "tags": ["teams", "direct_message", chat_display_name.lower()],
    }).execute()


def sync_teams_chat(
    supabase_client,
    chat_id: str,
    chat_display_name: str,
    chat_members: list[str],
    delta_token: Optional[str] = None,
) -> tuple[int, str]:
    """
    Sync messages from a Teams chat (DM or group chat).
    Uses /chats/{chatId}/messages/delta for incremental sync.
    Returns (count_synced, new_delta_token).
    """
    graph = get_graph_client()
    if not graph.is_configured():
        return 0, delta_token or ""

    delta_path = f"/chats/{chat_id}/messages/delta"
    try:
        items, new_delta_token = graph.get_delta(delta_path, delta_token)
    except Exception as e:
        logger.error(f"[Teams DM] Delta query failed for chat {chat_display_name}: {e}")
        # Re-raise so the caller retains the existing delta token and can record
        # the failure — returning "" would silently overwrite valid sync state.
        raise

    synced = 0
    for msg in items:
        try:
            _process_chat_message(supabase_client, msg, chat_id, chat_display_name, chat_members)
            synced += 1
        except _AlreadyIngested:
            pass
        except Exception as e:
            logger.warning(f"[Teams DM] Skipping message {msg.get('id')}: {e}")

    if synced:
        logger.info(f"[Teams DM] Synced {synced} messages from '{chat_display_name}'")
    return synced, new_delta_token
