"""
Microsoft Graph Sync Orchestrator
Coordinates sync of all three sources: Outlook, Teams, OneDrive.
Saves delta tokens between runs for incremental sync.
"""
import logging
import os
from datetime import datetime, timezone
from typing import Any, Optional

from supabase import Client

from .outlook import sync_outlook_emails
from .teams import sync_teams_channel, get_all_teams_and_channels, sync_user_chat_messages, ChatReadPermissionError
from .onedrive import sync_onedrive_folder, sync_sharepoint_folder
from .client import get_graph_client
from .embed import embed_pending_graph_documents

logger = logging.getLogger(__name__)


def _record_sync_run_safe(
    supabase: Client,
    *,
    source: str,
    resource_id: str,
    resource_name: str,
    started_at: datetime,
    status: str,
    items_synced: int = 0,
    items_seen: int = 0,
    items_failed: int = 0,
    error_message: Optional[str] = None,
    metadata: Optional[dict[str, Any]] = None,
) -> None:
    try:
        from src.services.health.source_sync_health import record_sync_run

        record_sync_run(
            supabase,
            source=source,
            resource_id=resource_id,
            resource_name=resource_name,
            stage="source_sync",
            status=status,
            started_at=started_at,
            finished_at=datetime.now(timezone.utc),
            items_seen=items_seen or items_synced,
            items_synced=items_synced,
            items_failed=items_failed,
            error_message=error_message,
            metadata=metadata or {},
        )
    except Exception as exc:
        logger.warning(
            "[GraphSync] Could not record source_sync_runs row for %s/%s: %s",
            source,
            resource_id,
            exc,
        )


def _count_outlook_docs_for_mailbox(supabase: Client, user_email: str) -> int:
    """Count persisted Outlook email docs for a mailbox via durable source paths."""
    prefix = f"outlook/{user_email}/"
    result = (
        supabase.from_("document_metadata")
        .select("id", count="exact")
        .eq("source", "microsoft_graph")
        .eq("source_system", "outlook_email")
        .like("source_path", f"{prefix}%")
        .execute()
    )
    return int(result.count or 0)


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
    try:
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
    except Exception as exc:
        logger.error(
            "[GraphSync] Could not save sync state for %s/%s: %s",
            source,
            resource_id,
            exc,
        )


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


def sync_outlook_mailbox_delta(
    supabase: Client,
    user_email: str,
    *,
    reason: str = "scheduled",
) -> dict[str, Any]:
    """Sync one Outlook mailbox through the durable delta-token path."""
    started_at = datetime.now(timezone.utc)
    before_count = _count_outlook_docs_for_mailbox(supabase, user_email)
    project_keywords = _get_active_project_keywords(supabase)
    token = _get_delta_token(supabase, "outlook_email", user_email)
    since_date = os.environ.get("OUTLOOK_SYNC_SINCE") or None
    effective_since = since_date if not token else None

    count, new_token = sync_outlook_emails(
        supabase,
        user_email,
        project_keywords,
        token,
        effective_since,
    )
    after_count = _count_outlook_docs_for_mailbox(supabase, user_email)
    persisted_delta = max(0, after_count - before_count)
    sync_status = "success"
    sync_error: Optional[str] = None
    if persisted_delta != count:
        sync_status = "mismatch"
        sync_error = (
            f"Persisted Outlook doc delta mismatch for {user_email}: "
            f"sync_outlook_emails returned {count}, but durable document_metadata rows increased by {persisted_delta}."
        )
        logger.error("[GraphSync] %s", sync_error)

    _save_sync_state(
        supabase,
        "outlook_email",
        user_email,
        f"Outlook: {user_email}",
        new_token,
        count,
        sync_status,
        sync_error,
    )
    _record_sync_run_safe(
        supabase,
        source="outlook_email",
        resource_id=user_email,
        resource_name=f"Outlook: {user_email}",
        started_at=started_at,
        status="warning" if sync_error else "succeeded",
        items_seen=count,
        items_synced=count,
        error_message=sync_error,
        metadata={"persisted_delta": persisted_delta, "reason": reason},
    )
    return {
        "status": "warning" if sync_error else "succeeded",
        "user_email": user_email,
        "items_synced": count,
        "persisted_delta": persisted_delta,
        "delta_token_saved": bool(new_token),
        "error": sync_error,
        "reason": reason,
    }


def run_graph_sync(
    supabase: Client,
    *,
    run_embedding: bool = True,
    run_teams_compiler: bool = True,
    embed_limit: int = 25,
    teams_compiler_batch_size: int = 25,
) -> dict:
    """
    Run a full Microsoft Graph sync for all configured sources.
    Called by the scheduler or the /api/graph/sync endpoint.

    Returns a summary dict with counts per source.
    """
    graph = get_graph_client()
    if not graph.is_configured():
        logger.info("[GraphSync] Microsoft Graph credentials not set — skipping")
        return {"status": "skipped", "reason": "not_configured"}

    summary: dict = {
        "outlook": 0,
        "teams": 0,
        "teams_dm": 0,
        "onedrive": 0,
        "errors": [],
        "phases": {
            "source_sync": "enabled",
            "embedding": "enabled" if run_embedding else "skipped",
            "teams_compiler": "enabled" if run_teams_compiler else "skipped",
        },
    }

    # ── Outlook ──────────────────────────────────────────────────────────────
    sync_emails = os.environ.get("GRAPH_SYNC_OUTLOOK", "true").lower() == "true"
    if sync_emails:
        user_emails = [
            e.strip()
            for e in os.environ.get("MICROSOFT_SYNC_USERS", "").split(",")
            if e.strip()
        ]

        for user_email in user_emails:
            try:
                result = sync_outlook_mailbox_delta(supabase, user_email, reason="scheduled")
                if result.get("error"):
                    summary["errors"].append(result["error"])
                summary["outlook"] += int(result.get("items_synced") or 0)
            except Exception as e:
                err = f"Outlook sync failed for {user_email}: {e}"
                logger.error(f"[GraphSync] {err}")
                summary["errors"].append(err)
                _save_sync_state(supabase, "outlook_email", user_email, f"Outlook: {user_email}", "", 0, "error", str(e))
                _record_sync_run_safe(
                    supabase,
                    source="outlook_email",
                    resource_id=user_email,
                    resource_name=f"Outlook: {user_email}",
                    started_at=started_at,
                    status="failed",
                    items_failed=1,
                    error_message=str(e),
                )

    # ── Teams ─────────────────────────────────────────────────────────────────
    sync_teams = os.environ.get("GRAPH_SYNC_TEAMS", "true").lower() == "true"
    if sync_teams:
        try:
            channels = get_all_teams_and_channels(supabase)
            for ch in channels:
                resource_id = f"{ch['team_id']}:{ch['channel_id']}"
                resource_name = f"Teams: {ch['team_name']} / {ch['channel_name']}"
                started_at = datetime.now(timezone.utc)
                try:
                    token = _get_delta_token(supabase, "teams_message", resource_id)
                    count, new_token = sync_teams_channel(
                        supabase,
                        ch["team_id"], ch["team_name"],
                        ch["channel_id"], ch["channel_name"],
                        token,
                    )
                    _save_sync_state(supabase, "teams_message", resource_id, resource_name, new_token, count)
                    _record_sync_run_safe(
                        supabase,
                        source="teams_message",
                        resource_id=resource_id,
                        resource_name=resource_name,
                        started_at=started_at,
                        status="succeeded",
                        items_seen=count,
                        items_synced=count,
                    )
                    summary["teams"] += count
                except Exception as e:
                    err = f"Teams sync failed for {resource_name}: {e}"
                    logger.error(f"[GraphSync] {err}", exc_info=True)
                    summary["errors"].append(err)
                    _record_sync_run_safe(
                        supabase,
                        source="teams_message",
                        resource_id=resource_id,
                        resource_name=resource_name,
                        started_at=started_at,
                        status="failed",
                        items_failed=1,
                        error_message=str(e),
                    )
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
        for user_email in dm_users:
            started_at = datetime.now(timezone.utc)
            try:
                resource_id = f"user:{user_email}"
                resource_name = f"Teams DM export: {user_email}"
                since_iso = _get_delta_token(supabase, "teams_chat_export", resource_id)
                count, new_ts = sync_user_chat_messages(supabase, user_email, since_iso)
                _save_sync_state(
                    supabase,
                    "teams_chat_export",
                    resource_id,
                    resource_name,
                    new_ts,
                    count,
                )
                _record_sync_run_safe(
                    supabase,
                    source="teams_chat_export",
                    resource_id=resource_id,
                    resource_name=resource_name,
                    started_at=started_at,
                    status="succeeded",
                    items_seen=count,
                    items_synced=count,
                )
                summary["teams_dm"] += count
            except ChatReadPermissionError as e:
                err = f"Teams DM sync skipped — Chat.Read.All admin consent required in Azure AD: {e}"
                logger.error(f"[GraphSync] {err}")
                summary["errors"].append(err)
                _record_sync_run_safe(
                    supabase,
                    source="teams_chat_export",
                    resource_id=f"user:{user_email}",
                    resource_name=f"Teams DM export: {user_email}",
                    started_at=started_at,
                    status="skipped",
                    error_message=str(e),
                    metadata={"required_permission": "Chat.Read.All"},
                )
                break  # All users share the same tenant; no point retrying others
            except Exception as e:
                err = f"Teams DM export failed for {user_email}: {e}"
                logger.error(f"[GraphSync] {err}", exc_info=True)
                summary["errors"].append(err)
                _save_sync_state(
                    supabase,
                    "teams_chat_export",
                    f"user:{user_email}",
                    f"Teams DM export: {user_email}",
                    "",
                    0,
                    "error",
                    str(e),
                )
                _record_sync_run_safe(
                    supabase,
                    source="teams_chat_export",
                    resource_id=f"user:{user_email}",
                    resource_name=f"Teams DM export: {user_email}",
                    started_at=started_at,
                    status="failed",
                    items_failed=1,
                    error_message=str(e),
                )

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
                started_at = datetime.now(timezone.utc)
                try:
                    token = _get_delta_token(supabase, "onedrive_file", resource_id)
                    count, new_token = sync_onedrive_folder(supabase, user_email, folder_path, token)
                    _save_sync_state(supabase, "onedrive_file", resource_id, resource_name, new_token, count)
                    _record_sync_run_safe(
                        supabase,
                        source="onedrive_file",
                        resource_id=resource_id,
                        resource_name=resource_name,
                        started_at=started_at,
                        status="succeeded",
                        items_seen=count,
                        items_synced=count,
                    )
                    summary["onedrive"] += count
                except Exception as e:
                    err = f"OneDrive sync failed for {user_email}{folder_path}: {e}"
                    logger.error(f"[GraphSync] {err}")
                    summary["errors"].append(err)
                    _save_sync_state(supabase, "onedrive_file", resource_id, resource_name, "", 0, "error", str(e))
                    _record_sync_run_safe(
                        supabase,
                        source="onedrive_file",
                        resource_id=resource_id,
                        resource_name=resource_name,
                        started_at=started_at,
                        status="failed",
                        items_failed=1,
                        error_message=str(e),
                    )

    # ── SharePoint Sites ──────────────────────────────────────────────────────
    # Format: "hostname/site_name:folder_path" e.g. "alleato.sharepoint.com/AlleatoGroup:/SOP"
    sync_sharepoint = os.environ.get("GRAPH_SYNC_SHAREPOINT", "true").lower() == "true"
    sp_raw = os.environ.get("SHAREPOINT_SYNC_FOLDERS", "") if sync_sharepoint else ""
    sp_entries = [e.strip() for e in sp_raw.split(",") if e.strip()]
    for entry in sp_entries:
        try:
            site_part, folder_path = entry.split(":", 1) if ":" in entry else (entry, "/")
            hostname, site_name = site_part.split("/", 1)
            resource_id = f"sharepoint:{site_name}:{folder_path}"
            resource_name = f"SharePoint: {site_name}{folder_path}"
            started_at = datetime.now(timezone.utc)
            try:
                token = _get_delta_token(supabase, "sharepoint_file", resource_id)
                count, new_token = sync_sharepoint_folder(supabase, hostname, site_name, folder_path, token)
                _save_sync_state(supabase, "sharepoint_file", resource_id, resource_name, new_token, count)
                _record_sync_run_safe(
                    supabase,
                    source="sharepoint_file",
                    resource_id=resource_id,
                    resource_name=resource_name,
                    started_at=started_at,
                    status="succeeded",
                    items_seen=count,
                    items_synced=count,
                )
                summary["onedrive"] += count
            except Exception as e:
                err = f"SharePoint sync failed for {resource_name}: {e}"
                logger.error(f"[GraphSync] {err}")
                summary["errors"].append(err)
                _save_sync_state(supabase, "sharepoint_file", resource_id, resource_name, "", 0, "error", str(e))
                _record_sync_run_safe(
                    supabase,
                    source="sharepoint_file",
                    resource_id=resource_id,
                    resource_name=resource_name,
                    started_at=started_at,
                    status="failed",
                    items_failed=1,
                    error_message=str(e),
                )
        except Exception as e:
            logger.error(f"[GraphSync] Bad SHAREPOINT_SYNC_FOLDERS entry '{entry}': {e}")

    total = summary["outlook"] + summary["teams"] + summary["teams_dm"] + summary["onedrive"]
    logger.info(
        "[GraphSync] Complete — Outlook: %d, Teams channels: %d, Teams DMs: %d, OneDrive: %d",
        summary["outlook"], summary["teams"], summary["teams_dm"], summary["onedrive"],
    )

    # ── Embed any newly ingested documents ───────────────────────────────────
    if run_embedding:
        try:
            embed_result = embed_pending_graph_documents(supabase, limit=embed_limit)
            summary["embed"] = embed_result
            logger.info("[GraphSync] Embedding complete: %s", embed_result)
        except Exception as e:
            logger.error("[GraphSync] Embedding step failed: %s", e)
            summary["errors"].append(f"Embedding failed: {e}")
            summary["embed"] = {"error": str(e)}
    else:
        summary["embed"] = {"status": "skipped", "reason": "run_embedding=false"}

    # ── Compile Teams DM conversations into structured intelligence ───────────
    # Runs after embed so newly embedded conversations are picked up immediately.
    # Batch capped at 25 per sync run; compiler has its own internal time limit.
    if run_teams_compiler:
        try:
            from src.services.intelligence.teams_compiler import run_compiler_batch
            compiler_result = run_compiler_batch(supabase, batch_size=teams_compiler_batch_size)
            summary["teams_compiler"] = compiler_result
            logger.info(
                "[GraphSync] Teams compiler complete — processed: %d, succeeded: %d, failed: %d",
                compiler_result.get("total_processed", 0),
                compiler_result.get("succeeded", 0),
                compiler_result.get("failed", 0),
            )
        except Exception as e:
            logger.error("[GraphSync] Teams compiler step failed: %s", e)
            summary["errors"].append(f"Teams compiler failed: {e}")
            summary["teams_compiler"] = {"error": str(e)}
    else:
        summary["teams_compiler"] = {"status": "skipped", "reason": "run_teams_compiler=false"}

    # Report status accurately — "complete" only if no errors
    status = "complete" if not summary["errors"] else "complete_with_errors"
    return {"status": status, "total_synced": total, **summary}
