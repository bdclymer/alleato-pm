#!/usr/bin/env python3
"""Sync the Alleato company knowledge-base SharePoint folder into document_metadata.

Every file in the folder is ingested with:
  type     = "knowledge-base"
  category = "knowledge"
  source   = "microsoft_graph"
  status   = "raw_ingested"   (queued for text extraction → embedding)

The script is idempotent — re-running it will upsert existing rows and
re-queue any file whose etag has changed.

Usage (dry-run, no writes):
    python scripts/ingestion/ingest_knowledge_base_folder.py

Usage (apply writes):
    python scripts/ingestion/ingest_knowledge_base_folder.py --apply
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple
from uuid import NAMESPACE_URL, uuid5

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_SRC = REPO_ROOT / "backend" / "src"
if str(BACKEND_SRC) not in sys.path:
    sys.path.insert(0, str(BACKEND_SRC))

from services.env_loader import load_env

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

KNOWLEDGE_BASE_SHARE_URL = (
    "https://alleato.sharepoint.com/:f:/s/AlleatoGroup/"
    "IgCo1HwDu98GSKEiKN1hGQ3ZASL22yaZpbU24gDbsuTfA5U?e=7fPOkY"
)

KNOWLEDGE_TYPE = "knowledge-base"
KNOWLEDGE_CATEGORY = "knowledge"
SOURCE_SYSTEM = "microsoft_graph"

GRAPH_BASE = "https://graph.microsoft.com/v1.0"
TOKEN_URL = "https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"

TEXT_EXTRACTION_EXTENSIONS = {".pdf", ".doc", ".docx", ".txt", ".md", ".csv"}

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


def load_dotenv() -> None:
    try:
        load_env(str(REPO_ROOT / ".env"))
    except TypeError:
        load_env()


def _post_form(url: str, data: Dict[str, str]) -> Dict[str, Any]:
    encoded = urllib.parse.urlencode(data).encode("utf-8")
    req = urllib.request.Request(url, data=encoded, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def get_graph_token() -> str:
    client_id = os.getenv("MICROSOFT_CLIENT_ID")
    client_secret = os.getenv("MICROSOFT_CLIENT_SECRET")
    tenant_id = os.getenv("MICROSOFT_TENANT_ID")
    missing = [k for k, v in {"MICROSOFT_CLIENT_ID": client_id, "MICROSOFT_CLIENT_SECRET": client_secret, "MICROSOFT_TENANT_ID": tenant_id}.items() if not v]
    if missing:
        raise RuntimeError(f"Missing Microsoft Graph env vars: {', '.join(missing)}")
    data = _post_form(
        TOKEN_URL.format(tenant_id=tenant_id),
        {"grant_type": "client_credentials", "client_id": client_id or "", "client_secret": client_secret or "", "scope": "https://graph.microsoft.com/.default"},
    )
    return str(data["access_token"])


# ---------------------------------------------------------------------------
# Graph helpers
# ---------------------------------------------------------------------------

import base64


def share_id_from_url(url: str) -> str:
    encoded = base64.urlsafe_b64encode(url.encode("utf-8")).decode("ascii").rstrip("=")
    return f"u!{encoded}"


def _graph_get(path_or_url: str, token: str, retries: int = 4) -> Dict[str, Any]:
    url = path_or_url if path_or_url.startswith("https://") else f"{GRAPH_BASE}{path_or_url}"
    last_exc: Optional[Exception] = None
    for attempt in range(retries):
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            last_exc = exc
            if exc.code not in {429, 503, 504}:
                raise
            delay = float(exc.headers.get("Retry-After") or 2.0 * (2 ** attempt))
            time.sleep(min(delay, 30.0))
        except urllib.error.URLError as exc:
            last_exc = exc
            time.sleep(min(2.0 * (2 ** attempt), 30.0))
    raise RuntimeError(f"Graph GET failed: {last_exc}")


def _iter_children(drive_id: str, item_id: str, token: str) -> Iterable[Dict[str, Any]]:
    url: Optional[str] = (
        f"{GRAPH_BASE}/drives/{drive_id}/items/{item_id}/children"
        "?$select=id,name,size,folder,file,lastModifiedDateTime,webUrl,eTag,cTag"
    )
    while url:
        data = _graph_get(url, token)
        yield from data.get("value", [])
        url = data.get("@odata.nextLink")


def walk_folder(
    drive_id: str,
    item_id: str,
    token: str,
    path_parts: List[str],
    files: List[Tuple[List[str], Dict[str, Any]]],
) -> None:
    for item in _iter_children(drive_id, item_id, token):
        if "folder" in item:
            walk_folder(drive_id, item["id"], token, path_parts + [item.get("name", "")], files)
        else:
            files.append((path_parts, item))


# ---------------------------------------------------------------------------
# Metadata builder
# ---------------------------------------------------------------------------


def _metadata_id(drive_id: str, item_id: str) -> str:
    return str(uuid5(NAMESPACE_URL, f"{SOURCE_SYSTEM}:{drive_id}:{item_id}"))


def _content_type(name: str) -> Optional[str]:
    explicit = {".heic": "image/heic", ".mpp": "application/vnd.ms-project", ".msg": "application/vnd.ms-outlook", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".zip": "application/zip"}
    ext = Path(name).suffix.lower()
    if ext in explicit:
        return explicit[ext]
    guessed, _ = mimetypes.guess_type(name)
    return guessed


def build_metadata_row(
    path_parts: List[str],
    item: Dict[str, Any],
    root: Dict[str, Any],
) -> Dict[str, Any]:
    name = item.get("name", "")
    ext = Path(name).suffix.lower()
    size_bytes = int(item.get("size") or 0)
    source_path = " / ".join(path_parts + [name]) if path_parts else name
    drive_id = str(root.get("parentReference", {}).get("driveId") or "")
    site_id = root.get("parentReference", {}).get("siteId")
    item_id = item.get("id", "")
    safe_name = re.sub(r"[^A-Za-z0-9._-]+", "-", name).strip("-")
    storage_path = f"knowledge-base/{item_id}{ext}"

    source_metadata: Dict[str, Any] = {
        "source_folder": path_parts,
        "storage_candidate_path": storage_path,
    }

    return {
        "id": _metadata_id(drive_id, item_id),
        "title": Path(name).stem,
        "file_name": name,
        "file_path": storage_path,
        "url": item.get("webUrl"),
        "type": KNOWLEDGE_TYPE,
        "category": KNOWLEDGE_CATEGORY,
        "source": SOURCE_SYSTEM,
        "source_system": SOURCE_SYSTEM,
        "source_drive_id": drive_id,
        "source_item_id": item_id,
        "source_site_id": site_id,
        "source_path": source_path,
        "source_web_url": item.get("webUrl"),
        "source_etag": item.get("eTag") or item.get("cTag"),
        "source_last_modified_at": item.get("lastModifiedDateTime"),
        "source_size": size_bytes,
        "date": item.get("lastModifiedDateTime"),
        "status": "raw_ingested",
        "phase": "ingest",
        "storage_bucket": "documents",
        "workflow_target": "knowledge",
        "tags": "knowledge-base,sharepoint",
        "source_metadata": source_metadata,
    }


# ---------------------------------------------------------------------------
# Apply
# ---------------------------------------------------------------------------


def apply_rows(rows: List[Dict[str, Any]], dry_run: bool) -> Dict[str, int]:
    if dry_run:
        return {"would_upsert": len(rows)}

    from services.supabase_helpers import get_supabase_client

    client = get_supabase_client()
    upserted = 0
    queued = 0
    errors = 0

    for row in rows:
        try:
            client.table("document_metadata").upsert(row, on_conflict="id").execute()
            client.table("fireflies_ingestion_jobs").upsert(
                {"fireflies_id": row["id"], "metadata_id": row["id"], "stage": "raw_ingested", "error_message": None},
                on_conflict="fireflies_id",
            ).execute()
            upserted += 1
            queued += 1
        except Exception as exc:
            print(f"  ERROR upserting {row.get('file_name')}: {exc}", file=sys.stderr)
            errors += 1

    return {"upserted": upserted, "queued": queued, "errors": errors}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync knowledge-base SharePoint folder → document_metadata")
    parser.add_argument("--apply", action="store_true", help="Write rows to Supabase (omit for dry-run)")
    parser.add_argument("--share-url", default=KNOWLEDGE_BASE_SHARE_URL, help="Override the SharePoint sharing URL")
    args = parser.parse_args()

    load_dotenv()

    print("Authenticating with Microsoft Graph …")
    token = get_graph_token()

    share_id = share_id_from_url(args.share_url)
    print(f"Resolving shared folder …")
    root = _graph_get(f"/shares/{share_id}/driveItem", token)
    drive_id = root.get("parentReference", {}).get("driveId")
    if not drive_id:
        raise RuntimeError("Graph response did not include a drive id.")

    root_name = root.get("name", "unknown")
    print(f"Walking folder: {root_name}")

    raw_files: List[Tuple[List[str], Dict[str, Any]]] = []
    walk_folder(drive_id, root["id"], token, [], raw_files)

    print(f"Found {len(raw_files)} files")

    # Only queue files we can extract text from
    eligible = [(p, item) for p, item in raw_files if Path(item.get("name", "")).suffix.lower() in TEXT_EXTRACTION_EXTENSIONS]
    skipped = len(raw_files) - len(eligible)
    print(f"  Eligible for text extraction: {len(eligible)}  (skipped {skipped} non-text files)")

    rows = [build_metadata_row(path_parts, item, root) for path_parts, item in eligible]

    if not args.apply:
        print("\nDRY RUN — no writes. Pass --apply to sync.\n")
        for row in rows[:20]:
            print(f"  {row['file_name']}  →  id={row['id']}")
        if len(rows) > 20:
            print(f"  … and {len(rows) - 20} more")
        print(f"\nWould upsert {len(rows)} rows into document_metadata")
        return 0

    print(f"\nApplying {len(rows)} rows …")
    result = apply_rows(rows, dry_run=False)
    print(json.dumps(result, indent=2))
    print("\nDone. Files are queued as 'raw_ingested' and will be processed by the pipeline.")
    print("To trigger embedding, call: POST /api/documents/trigger-pipeline  {\"phase\":\"embed\"}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
