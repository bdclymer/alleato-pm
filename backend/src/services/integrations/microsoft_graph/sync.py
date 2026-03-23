"""
Microsoft Graph Sync Orchestrator
Coordinates sync of all three sources: Outlook, Teams, OneDrive.
Saves delta tokens between runs for incremental sync.
"""
import logging
import os
from datetime import datetime, timezone
from typing import Optional

from supabase import Client

from .outlook import sync_outlook_emails
from .teams import sync_teams_channel, get_all_teams_and_channels, get_user_chats, sync_teams_chat
from .onedrive import sync_onedrive_folder, sync_sharepoint_folder
from .client import get_graph_client
from .embed import embed_pending_graph_documents

logger = logging.getLogger(__name__)


def _get_delta_token(supabase: Client, source: str, resource_id: str) -> Optional[str]:
    """Fetch saved delta token for a source/resource pair."""
    try:
        result = (
            supabase.from_("graph_sync_state")
            .select("delta_token")
            .eq("source", source)
            .eq("resource_id", resource_id)
            .limit(1)
            .execute()
        )
        rows = result.data or []
        return rows[0].get("delta_token") if rows else None
    except Exception:
        return None


def _save_sync_state(
    supabase: Client,
    source: str,
    resource_id: str,
    resource_name: str,
    delta_token: str,
    items_synced: int,
    status: str = "success",
    error: Optional[str] = None,
) -> None:
    """Upsert sync state after a run."""
    supabase.from_("graph_sync_state").upsert({
        "source": source,
        "resource_id": resource_id,
        "resource_name": resource_name,
        "delta_token": delta_token,
        "last_sync_at": datetime.now(timezone.utc).isoformat(),
        "sync_status": status,
        "error_message": error,
        "items_synced": items_synced,
    }, on_conflict="source,resource_id").execute()


def _get_active_project_keywords(supabase: Client) -> list[str]:
    """Return names of active projects for email filtering."""
    result = (
        supabase.from_("projects")
        .select("name, aliases")
        .eq("archived", False)
        .execute()
    )
    keywords = []
    for p in (result.data or []):
        if p.get("name"):
            keywords.append(p["name"])
        for alias in (p.get("aliases") or []):
            if alias:
                keywords.append(alias)
    return keywords


def run_graph_sync(supabase: Client) -> dict:
    """
    Run a full Microsoft Graph sync for all configured sources.
    Called by the scheduler or the /api/graph/sync endpoint.

    Returns a summary dict with counts per source.
    """
    graph = get_graph_client()
    if not graph.is_configured():
        logger.info("[GraphSync] Microsoft Graph credentials not set — skipping")
        return {"status": "skipped", "reason": "not_configured"}

    summary: dict = {"outlook": 0, "teams": 0, "teams_dm": 0, "onedrive": 0, "errors": []}

    # ── Outlook ──────────────────────────────────────────────────────────────
    sync_emails = os.environ.get("GRAPH_SYNC_OUTLOOK", "true").lower() == "true"
    if sync_emails:
        user_emails = [
            e.strip()
            for e in os.environ.get("MICROSOFT_SYNC_USERS", "").split(",")
            if e.strip()
        ]
        project_keywords = _get_active_project_keywords(supabase)

        since_date = os.environ.get("OUTLOOK_SYNC_SINCE") or None  # e.g. "2024-01-01"

        for user_email in user_emails:
            try:
                token = _get_delta_token(supabase, "outlook_email", user_email)
                # Only apply since_date on initial full sync (no existing token)
                effective_since = since_date if not token else None
                count, new_token = sync_outlook_emails(supabase, user_email, project_keywords, token, effective_since)
                _save_sync_state(supabase, "outlook_email", user_email, f"Outlook: {user_email}", new_token, count)
                summary["outlook"] += count
            except Exception as e:
                err = f"Outlook sync failed for {user_email}: {e}"
                logger.error(f"[GraphSync] {err}")
                summary["errors"].append(err)
                _save_sync_state(supabase, "outlook_email", user_email, f"Outlook: {user_email}", "", 0, "error", str(e))

    # ── Teams ─────────────────────────────────────────────────────────────────
    sync_teams = os.environ.get("GRAPH_SYNC_TEAMS", "true").lower() == "true"
    if sync_teams:
        try:
            channels = get_all_teams_and_channels(supabase)
            for ch in channels:
                resource_id = f"{ch['team_id']}:{ch['channel_id']}"
                resource_name = f"Teams: {ch['team_name']} / {ch['channel_name']}"
                try:
                    token = _get_delta_token(supabase, "teams_message", resource_id)
                    count, new_token = sync_teams_channel(
                        supabase,
                        ch["team_id"], ch["team_name"],
                        ch["channel_id"], ch["channel_name"],
                        token,
                    )
                    _save_sync_state(supabase, "teams_message", resource_id, resource_name, new_token, count)
                    summary["teams"] += count
                except Exception as e:
                    err = f"Teams sync failed for {resource_name}: {e}"
                    logger.error(f"[GraphSync] {err}", exc_info=True)
                    summary["errors"].append(err)
        except Exception as e:
            err = f"Teams enumeration failed: {e}"
            logger.error(f"[GraphSync] {err}")
            summary["errors"].append(err)

    # ── Teams Direct Messages ─────────────────────────────────────────────────
    # NOTE: Graph API does NOT support delta queries on chat messages with app-only
    # (client credentials) auth. We use timestamp-based incremental sync instead:
    # store last_sync_at in graph_sync_state and fetch messages newer than that.
    sync_teams_dm = os.environ.get("GRAPH_SYNC_TEAMS_DM", "true").lower() == "true"
    if sync_teams_dm:
        dm_users = [
            e.strip()
            for e in os.environ.get("MICROSOFT_SYNC_USERS", "").split(",")
            if e.strip()
        ]
        seen_chat_ids: set[str] = set()  # deduplicate chats shared by multiple users
        for user_email in dm_users:
            try:
                chats = get_user_chats(user_email)
                for chat in chats:
                    chat_id = chat["id"]
                    if chat_id in seen_chat_ids:
                        continue
                    seen_chat_ids.add(chat_id)
                    resource_id = f"chat:{chat_id}"
                    resource_name = f"Teams DM: {chat['display_name']}"
                    try:
                        # Use last_sync_at as cutoff timestamp (stored in delta_token field)
                        since_iso = _get_delta_token(supabase, "teams_chat", resource_id)
                        count, new_ts = sync_teams_chat(
                            supabase,
                            chat_id,
                            chat["display_name"],
                            chat["member_names"],
                            since_iso,
                        )
                        _save_sync_state(supabase, "teams_chat", resource_id, resource_name, new_ts, count)
                        summary["teams_dm"] += count
                    except Exception as e:
                        err = f"Teams DM sync failed for {resource_name}: {e}"
                        logger.error(f"[GraphSync] {err}", exc_info=True)
                        summary["errors"].append(err)
                        _save_sync_state(supabase, "teams_chat", resource_id, resource_name, "", 0, "error", str(e))
            except Exception as e:
                err = f"Teams DM chat listing failed for {user_email}: {e}"
                logger.error(f"[GraphSync] {err}")
                summary["errors"].append(err)

    # ── OneDrive ─────────────────────────────────────────────────────────────
    sync_onedrive = os.environ.get("GRAPH_SYNC_ONEDRIVE", "true").lower() == "true"
    if sync_onedrive:
        user_emails = [
            e.strip()
            for e in os.environ.get("MICROSOFT_SYNC_USERS", "").split(",")
            if e.strip()
        ]
        # Support multiple folders via ONEDRIVE_SYNC_FOLDERS (comma-separated)
        # Falls back to ONEDRIVE_SYNC_FOLDER (singular) for backwards compat
        folders_raw = os.environ.get("ONEDRIVE_SYNC_FOLDERS") or os.environ.get("ONEDRIVE_SYNC_FOLDER", "/Projects")
        onedrive_folders = [f.strip() for f in folders_raw.split(",") if f.strip()]

        for user_email in user_emails:
            for folder_path in onedrive_folders:
                resource_id = f"{user_email}:{folder_path}"
                resource_name = f"OneDrive: {user_email}{folder_path}"
                try:
                    token = _get_delta_token(supabase, "onedrive_file", resource_id)
                    count, new_token = sync_onedrive_folder(supabase, user_email, folder_path, token)
                    _save_sync_state(supabase, "onedrive_file", resource_id, resource_name, new_token, count)
                    summary["onedrive"] += count
                except Exception as e:
                    err = f"OneDrive sync failed for {user_email}{folder_path}: {e}"
                    logger.error(f"[GraphSync] {err}")
                    summary["errors"].append(err)
                    _save_sync_state(supabase, "onedrive_file", resource_id, resource_name, "", 0, "error", str(e))

    # ── SharePoint Sites ──────────────────────────────────────────────────────
    # Format: "hostname/site_name:folder_path" e.g. "alleato.sharepoint.com/AlleatoGroup:/SOP"
    sp_raw = os.environ.get("SHAREPOINT_SYNC_FOLDERS", "")
    sp_entries = [e.strip() for e in sp_raw.split(",") if e.strip()]
    for entry in sp_entries:
        try:
            site_part, folder_path = entry.split(":", 1) if ":" in entry else (entry, "/")
            hostname, site_name = site_part.split("/", 1)
            resource_id = f"sharepoint:{site_name}:{folder_path}"
            resource_name = f"SharePoint: {site_name}{folder_path}"
            try:
                token = _get_delta_token(supabase, "onedrive_file", resource_id)
                count, new_token = sync_sharepoint_folder(supabase, hostname, site_name, folder_path, token)
                _save_sync_state(supabase, "onedrive_file", resource_id, resource_name, new_token, count)
                summary["onedrive"] += count
            except Exception as e:
                err = f"SharePoint sync failed for {resource_name}: {e}"
                logger.error(f"[GraphSync] {err}")
                summary["errors"].append(err)
                _save_sync_state(supabase, "onedrive_file", resource_id, resource_name, "", 0, "error", str(e))
        except Exception as e:
            logger.error(f"[GraphSync] Bad SHAREPOINT_SYNC_FOLDERS entry '{entry}': {e}")

    total = summary["outlook"] + summary["teams"] + summary["teams_dm"] + summary["onedrive"]
    logger.info(
        "[GraphSync] Complete — Outlook: %d, Teams channels: %d, Teams DMs: %d, OneDrive: %d",
        summary["outlook"], summary["teams"], summary["teams_dm"], summary["onedrive"],
    )

    # ── Embed any newly ingested documents ───────────────────────────────────
    if total > 0 or True:  # Always run to catch any previously unembedded docs
        try:
            embed_result = embed_pending_graph_documents(supabase, limit=200)
            summary["embed"] = embed_result
            logger.info("[GraphSync] Embedding complete: %s", embed_result)
        except Exception as e:
            logger.error("[GraphSync] Embedding step failed: %s", e)
            summary["embed"] = {"error": str(e)}

    return {"status": "complete", "total_synced": total, **summary}
