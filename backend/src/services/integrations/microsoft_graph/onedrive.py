"""
OneDrive / SharePoint File Ingestion
Fetches and extracts text from project documents.
"""
import io
import logging
import os
from datetime import datetime, timezone
from typing import Optional

from .client import get_graph_client
from .project_documents import (
    DOCUMENT_BUCKET,
    graph_id_safe,
    metadata_text_storage,
    project_document_payload_from_graph_item,
    source_path,
    upsert_project_document_by_source,
)
from .project_inference import infer_project_id
from ...supabase_helpers import SupabaseRagStore, get_rag_read_client

logger = logging.getLogger(__name__)

# File types we can extract text from
SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".md", ".csv"}
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB


def _fetch_rag_document_text(doc_id: str) -> str:
    try:
        row = (
            get_rag_read_client()
            .from_("rag_document_metadata")
            .select("content,raw_text")
            .eq("id", doc_id)
            .single()
            .execute()
            .data
            or {}
        )
        return str(row.get("content") or row.get("raw_text") or "")
    except Exception:
        return ""


def _extract_text_from_pdf(content: bytes) -> str:
    """Extract text from PDF bytes using pypdf."""
    try:
        import pypdf
        reader = pypdf.PdfReader(io.BytesIO(content))
        pages = []
        for page in reader.pages[:50]:  # Cap at 50 pages
            text = page.extract_text() or ""
            if text.strip():
                pages.append(text)
        return "\n\n".join(pages)
    except ImportError:
        logger.warning("[OneDrive] pypdf not installed — skipping PDF extraction")
        return ""
    except Exception as e:
        logger.warning(f"[OneDrive] PDF extraction failed: {e}")
        return ""


def _extract_text_from_docx(content: bytes) -> str:
    """Extract text from DOCX bytes using python-docx."""
    try:
        import docx
        doc = docx.Document(io.BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    except ImportError:
        logger.warning("[OneDrive] python-docx not installed — skipping DOCX extraction")
        return ""
    except Exception as e:
        logger.warning(f"[OneDrive] DOCX extraction failed: {e}")
        return ""


def _extract_text(content: bytes, extension: str) -> str:
    """Route to the right text extractor based on file extension."""
    ext = extension.lower()
    if ext == ".pdf":
        return _extract_text_from_pdf(content)
    elif ext in (".docx", ".doc"):
        return _extract_text_from_docx(content)
    elif ext in (".txt", ".md", ".csv"):
        return content.decode("utf-8", errors="replace")
    return ""


def _promote_to_project_documents(
    *,
    supabase_client,
    project_id: Optional[int],
    source_system: str,
    owner: str,
    folder_path: str,
    item: dict,
    item_id: str,
    name: str,
    storage_path: str,
    uploaded_by: str,
) -> None:
    if not project_id:
        return

    payload = project_document_payload_from_graph_item(
        project_id=project_id,
        source_system=source_system,
        owner=owner,
        folder_path=folder_path,
        item=item,
        item_id=item_id,
        name=name,
        storage_path=storage_path,
        uploaded_by=uploaded_by,
    )
    upsert_project_document_by_source(supabase_client, payload)


def sync_onedrive_folder(
    supabase_client,
    user_email: str,
    folder_path: str = "/",
    delta_token: Optional[str] = None,
) -> tuple[int, str]:
    """
    Sync files from a user's OneDrive folder. Returns (count_synced, new_delta_token).

    Args:
        supabase_client: Supabase service client
        user_email: The user whose OneDrive to sync
        folder_path: Folder path within OneDrive (default: root)
        delta_token: Previous delta token for incremental sync
    """
    graph = get_graph_client()
    if not graph.is_configured():
        logger.warning("[OneDrive] Microsoft Graph not configured — skipping")
        return 0, delta_token or ""

    user_id = user_email
    if folder_path == "/" or not folder_path:
        delta_path = f"/users/{user_id}/drive/root/delta"
    else:
        # Graph path format: /drive/root:/full/path/here:/delta
        # Do NOT replace inner slashes — only wrap the whole path with colons
        clean_path = folder_path.strip("/")
        delta_path = f"/users/{user_id}/drive/root:/{clean_path}:/delta"

    try:
        items, new_delta_token = graph.get_delta(delta_path, delta_token)
    except Exception as e:
        logger.error(f"[OneDrive] Delta query failed for {user_email}{folder_path}: {e}")
        return 0, delta_token or ""

    synced = 0
    for item in items:
        if "@removed" in item:
            continue

        # Skip folders
        if "folder" in item:
            continue

        name = item.get("name", "")
        size = item.get("size", 0)

        # Check extension
        _, ext = os.path.splitext(name)
        ext = ext.lower()
        if ext not in SUPPORTED_EXTENSIONS:
            continue

        if size > MAX_FILE_SIZE_BYTES:
            logger.info(f"[OneDrive] Skipping large file: {name} ({size} bytes)")
            continue

        item_id = item.get("id", "")
        doc_id = f"onedrive_{item_id}"
        storage_path = metadata_text_storage("onedrive", user_email, item_id, ext)

        # Check if already ingested
        existing = (
            supabase_client.from_("document_metadata")
            .select("id, project_id")
            .eq("id", doc_id)
            .limit(1)
            .execute()
        )
        if existing.data:
            existing_doc = existing.data[0]
            project_id = existing_doc.get("project_id")
            if not project_id:
                clean_content = _fetch_rag_document_text(doc_id)
                project_id, assignment_method, _ = infer_project_id(
                    supabase_client,
                    title=name,
                    content=clean_content,
                    participants=[user_email],
                )
                if project_id:
                    supabase_client.from_("document_metadata").update({
                        "project_id": project_id,
                        "tags": ",".join(["onedrive", ext.lstrip("."), f"project_auto:{assignment_method}"]),
                    }).eq("id", doc_id).execute()
            _promote_to_project_documents(
                supabase_client=supabase_client,
                project_id=project_id,
                source_system="onedrive",
                owner=user_email,
                folder_path=folder_path,
                item=item,
                item_id=item_id,
                name=name,
                storage_path=storage_path,
                uploaded_by=user_email,
            )
            continue

        # Download file content
        download_url = item.get("@microsoft.graph.downloadUrl", "")
        if not download_url:
            try:
                file_data = graph.get(f"/users/{user_id}/drive/items/{item_id}")
                download_url = file_data.get("@microsoft.graph.downloadUrl", "")
            except Exception:
                continue

        if not download_url:
            continue

        try:
            raw_bytes = graph.download_bytes(download_url)
        except Exception as e:
            logger.warning(f"[OneDrive] Download failed for {name}: {e}")
            continue

        # Extract text (strip null bytes — postgres rejects \u0000 in text columns)
        text_content = _extract_text(raw_bytes, ext).replace("\x00", "")
        if len(text_content.strip()) < 50:
            logger.debug(f"[OneDrive] Too little text extracted from {name}, skipping")
            continue

        # Get file metadata
        modified = item.get("lastModifiedDateTime", datetime.now(timezone.utc).isoformat())
        web_url = item.get("webUrl", "")
        created_by = item.get("createdBy", {}).get("user", {}).get("displayName", user_email)

        # Upload extracted text to Supabase Storage for AI search.
        try:
            supabase_client.storage.from_(DOCUMENT_BUCKET).upload(
                storage_path,
                text_content.encode("utf-8"),
                {"content-type": "text/plain", "upsert": "true"},
            )
        except Exception as e:
            logger.warning(f"[OneDrive] Storage upload failed for {name}: {e}")
            continue

        try:
            # Strip null bytes — PostgreSQL text columns reject \u0000
            clean_content = text_content[:50000].replace("\x00", "")
            project_id, assignment_method, assignment_confidence = infer_project_id(
                supabase_client,
                title=name,
                content=clean_content,
                participants=[created_by, user_email],
            )
            SupabaseRagStore(supabase_client).upsert_document_metadata({
                "id": doc_id,
                "title": name,
                "source": "microsoft_graph",
                "category": "document",
                "type": "document",
                "content": clean_content,
                "date": modified[:10] if modified else None,
                "url": web_url,
                "participants": ", ".join([created_by, user_email]),
                "status": "raw_ingested",
                "tags": ",".join(["onedrive", ext.lstrip("."), f"project_auto:{assignment_method}" if project_id else "unassigned"]),
                "project_id": project_id,
                "source_system": "onedrive",
                "source_item_id": item_id,
                "source_drive_id": graph_id_safe((item.get("parentReference") or {}).get("driveId")),
                "source_path": source_path(folder_path, name),
                "source_web_url": web_url or None,
                "source_etag": item.get("eTag") or item.get("cTag"),
                "source_last_modified_at": modified,
                "source_size": size,
                "storage_bucket": DOCUMENT_BUCKET,
                "file_path": storage_path,
                "source_metadata": {
                    "graph_source": "onedrive",
                    "graph_owner": user_email,
                    "source_folder": folder_path,
                },
            })
            _promote_to_project_documents(
                supabase_client=supabase_client,
                project_id=project_id,
                source_system="onedrive",
                owner=user_email,
                folder_path=folder_path,
                item=item,
                item_id=item_id,
                name=name,
                storage_path=storage_path,
                uploaded_by=user_email,
            )
            synced += 1
            if project_id:
                logger.info(
                    "[OneDrive] Auto-assigned project_id=%s for %s via %s (%.2f)",
                    project_id,
                    item_id,
                    assignment_method,
                    assignment_confidence,
                )
        except Exception as e:
            logger.warning(f"[OneDrive] Failed to insert metadata for {name}: {e}")

    logger.info(f"[OneDrive] Synced {synced} files for {user_email}{folder_path}")
    return synced, new_delta_token


def sync_sharepoint_folder(
    supabase_client,
    site_hostname: str,
    site_name: str,
    folder_path: str = "/",
    delta_token: Optional[str] = None,
) -> tuple[int, str]:
    """
    Sync files from a SharePoint site folder. Returns (count_synced, new_delta_token).

    Args:
        site_hostname: e.g. "alleato.sharepoint.com"
        site_name: e.g. "AlleatoGroup"
        folder_path: Folder path within the site drive (e.g. "/SOP" or "/")
        delta_token: Previous delta token for incremental sync
    """
    graph = get_graph_client()
    if not graph.is_configured():
        logger.warning("[SharePoint] Microsoft Graph not configured — skipping")
        return 0, delta_token or ""

    site_ref = f"{site_hostname}:/sites/{site_name}"

    if folder_path == "/" or not folder_path:
        delta_path = f"/sites/{site_ref}/drive/root/delta"
    else:
        clean_path = folder_path.strip("/")
        delta_path = f"/sites/{site_ref}/drive/root:/{clean_path}:/delta"

    try:
        items, new_delta_token = graph.get_delta(delta_path, delta_token)
    except Exception as e:
        logger.error(f"[SharePoint] Delta query failed for {site_name}{folder_path}: {e}")
        return 0, delta_token or ""

    synced = 0
    for item in items:
        if "@removed" in item or "folder" in item:
            continue

        name = item.get("name", "")
        size = item.get("size", 0)
        _, ext = os.path.splitext(name)
        ext = ext.lower()
        if ext not in SUPPORTED_EXTENSIONS:
            continue
        if size > MAX_FILE_SIZE_BYTES:
            continue

        item_id = item.get("id", "")
        doc_id = f"sharepoint_{item_id}"
        storage_path = metadata_text_storage("sharepoint", site_name, item_id, ext)

        existing = (
            supabase_client.from_("document_metadata")
            .select("id, project_id")
            .eq("id", doc_id)
            .limit(1)
            .execute()
        )
        if existing.data:
            existing_doc = existing.data[0]
            project_id = existing_doc.get("project_id")
            if not project_id:
                clean_content = _fetch_rag_document_text(doc_id)
                project_id, assignment_method, _ = infer_project_id(
                    supabase_client,
                    title=name,
                    content=clean_content,
                    participants=[site_name],
                )
                if project_id:
                    supabase_client.from_("document_metadata").update({
                        "project_id": project_id,
                        "tags": ",".join(["sharepoint", site_name.lower(), ext.lstrip("."), f"project_auto:{assignment_method}"]),
                    }).eq("id", doc_id).execute()
            _promote_to_project_documents(
                supabase_client=supabase_client,
                project_id=project_id,
                source_system="sharepoint",
                owner=site_name,
                folder_path=folder_path,
                item=item,
                item_id=item_id,
                name=name,
                storage_path=storage_path,
                uploaded_by="SharePoint sync",
            )
            continue

        download_url = item.get("@microsoft.graph.downloadUrl", "")
        if not download_url:
            try:
                file_data = graph.get(f"/sites/{site_ref}/drive/items/{item_id}")
                download_url = file_data.get("@microsoft.graph.downloadUrl", "")
            except Exception:
                continue

        if not download_url:
            continue

        try:
            raw_bytes = graph.download_bytes(download_url)
        except Exception as e:
            logger.warning(f"[SharePoint] Download failed for {name}: {e}")
            continue

        text_content = _extract_text(raw_bytes, ext)
        if len(text_content.strip()) < 50:
            continue

        modified = item.get("lastModifiedDateTime", datetime.now(timezone.utc).isoformat())
        web_url = item.get("webUrl", "")
        created_by = item.get("createdBy", {}).get("user", {}).get("displayName", site_name)

        try:
            supabase_client.storage.from_(DOCUMENT_BUCKET).upload(
                storage_path,
                text_content.encode("utf-8"),
                {"content-type": "text/plain", "upsert": "true"},
            )
        except Exception as e:
            logger.warning(f"[SharePoint] Storage upload failed for {name}: {e}")
            continue

        try:
            clean_content = text_content[:50000].replace("\x00", "")
            project_id, assignment_method, _ = infer_project_id(
                supabase_client,
                title=name,
                content=clean_content,
                participants=[created_by, site_name],
            )
            SupabaseRagStore(supabase_client).upsert_document_metadata({
                "id": doc_id,
                "title": name,
                "source": "microsoft_graph",
                "category": "document",
                "type": "document",
                "content": clean_content,
                "date": modified[:10] if modified else None,
                "url": web_url,
                "participants": ", ".join([created_by, site_name]),
                "status": "raw_ingested",
                "tags": ",".join(["sharepoint", site_name.lower(), ext.lstrip("."), f"project_auto:{assignment_method}" if project_id else "unassigned"]),
                "project_id": project_id,
                "source_system": "sharepoint",
                "source_item_id": item_id,
                "source_drive_id": graph_id_safe((item.get("parentReference") or {}).get("driveId")),
                "source_site_id": graph_id_safe((item.get("parentReference") or {}).get("siteId")),
                "source_path": source_path(folder_path, name),
                "source_web_url": web_url or None,
                "source_etag": item.get("eTag") or item.get("cTag"),
                "source_last_modified_at": modified,
                "source_size": size,
                "storage_bucket": DOCUMENT_BUCKET,
                "file_path": storage_path,
                "source_metadata": {
                    "graph_source": "sharepoint",
                    "graph_owner": site_name,
                    "source_folder": folder_path,
                },
            })
            _promote_to_project_documents(
                supabase_client=supabase_client,
                project_id=project_id,
                source_system="sharepoint",
                owner=site_name,
                folder_path=folder_path,
                item=item,
                item_id=item_id,
                name=name,
                storage_path=storage_path,
                uploaded_by="SharePoint sync",
            )
            synced += 1
        except Exception as e:
            logger.warning(f"[SharePoint] Failed to insert metadata for {name}: {e}")

    logger.info(f"[SharePoint] Synced {synced} files from {site_name}{folder_path}")
    return synced, new_delta_token
