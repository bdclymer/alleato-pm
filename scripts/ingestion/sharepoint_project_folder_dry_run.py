#!/usr/bin/env python3
"""Preview how a SharePoint project folder would import into Alleato.

This script is intentionally read-only. It walks a Microsoft Graph shared
folder, classifies files from the real folder path, and writes a preview report
for the project-documents and RAG ingestion layers.
"""

from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple
from uuid import NAMESPACE_URL, uuid5


REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_SRC = REPO_ROOT / "backend" / "src"
if str(BACKEND_SRC) not in sys.path:
    sys.path.insert(0, str(BACKEND_SRC))

from services.env_loader import load_env


GRAPH_BASE = "https://graph.microsoft.com/v1.0"
TOKEN_URL = "https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"

TEXT_EXTRACTION_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
    ".txt",
    ".md",
    ".csv",
}

RAW_STORAGE_EXTENSIONS = TEXT_EXTRACTION_EXTENSIONS | {
    ".xlsx",
    ".xls",
    ".mpp",
    ".xml",
    ".msg",
    ".png",
    ".jpg",
    ".jpeg",
    ".heic",
    ".mov",
    ".mp4",
    ".zip",
}

MEDIA_EXTENSIONS = {".jpg", ".jpeg", ".png", ".heic", ".mov", ".mp4"}
TABLE_EXTENSIONS = {".xlsx", ".xls", ".csv"}
SCHEDULE_EXTENSIONS = {".mpp", ".xml"}
ARCHIVE_EXTENSIONS = {".zip"}


@dataclass
class PreviewItem:
    source_path: str
    name: str
    extension: str
    size_bytes: int
    size_mb: float
    modified_at: Optional[str]
    web_url: Optional[str]
    drive_item_id: str
    document_category: str
    document_type: str
    workflow_target: str
    project_documents_action: str
    rag_action: str
    media_action: str
    division: Optional[str]
    trade: Optional[str]
    rfi_number: Optional[str]
    is_response: bool
    storage_recommendation: str
    skip_reason: Optional[str]
    project_documents_row: Dict[str, Any]
    document_metadata_row: Optional[Dict[str, Any]]


def load_dotenv() -> None:
    """Load repo env vars without printing secret values."""
    try:
        load_env(str(REPO_ROOT / ".env"))
    except TypeError:
        load_env()


def post_form(url: str, data: Dict[str, str]) -> Dict[str, Any]:
    encoded = urllib.parse.urlencode(data).encode("utf-8")
    request = urllib.request.Request(url, data=encoded, method="POST")
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def graph_get(path_or_url: str, token: str, max_retries: int = 4) -> Dict[str, Any]:
    url = path_or_url if path_or_url.startswith("https://") else f"{GRAPH_BASE}{path_or_url}"
    last_error: Optional[Exception] = None
    for attempt in range(max_retries):
        request = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            last_error = exc
            if exc.code not in {429, 503, 504}:
                raise
            retry_after = exc.headers.get("Retry-After")
            delay = float(retry_after) if retry_after and retry_after.isdigit() else 2.0 * (2 ** attempt)
            time.sleep(min(delay, 30.0))
        except urllib.error.URLError as exc:
            last_error = exc
            time.sleep(min(2.0 * (2 ** attempt), 30.0))
    raise RuntimeError(f"Graph GET failed after {max_retries} attempts: {last_error}")


def get_graph_token() -> str:
    client_id = os.getenv("MICROSOFT_CLIENT_ID")
    client_secret = os.getenv("MICROSOFT_CLIENT_SECRET")
    tenant_id = os.getenv("MICROSOFT_TENANT_ID")
    missing = [
        name
        for name, value in {
            "MICROSOFT_CLIENT_ID": client_id,
            "MICROSOFT_CLIENT_SECRET": client_secret,
            "MICROSOFT_TENANT_ID": tenant_id,
        }.items()
        if not value
    ]
    if missing:
        raise RuntimeError(f"Missing Microsoft Graph env vars: {', '.join(missing)}")

    data = post_form(
        TOKEN_URL.format(tenant_id=tenant_id),
        {
            "grant_type": "client_credentials",
            "client_id": client_id or "",
            "client_secret": client_secret or "",
            "scope": "https://graph.microsoft.com/.default",
        },
    )
    return str(data["access_token"])


def share_id_from_url(url: str) -> str:
    encoded = base64.urlsafe_b64encode(url.encode("utf-8")).decode("ascii").rstrip("=")
    return f"u!{encoded}"


def iter_children(drive_id: str, item_id: str, token: str) -> Iterable[Dict[str, Any]]:
    url: Optional[str] = (
        f"{GRAPH_BASE}/drives/{drive_id}/items/{item_id}/children"
        "?$select=id,name,size,folder,file,lastModifiedDateTime,webUrl,eTag,cTag"
    )
    while url:
        data = graph_get(url, token)
        for item in data.get("value", []):
            yield item
        url = data.get("@odata.nextLink")


def walk_folder(
    drive_id: str,
    item_id: str,
    token: str,
    path_parts: List[str],
    max_files: int,
    files: List[Tuple[List[str], Dict[str, Any]]],
    folder_counter: List[int],
) -> None:
    for item in iter_children(drive_id, item_id, token):
        if max_files > 0 and len(files) >= max_files:
            return
        if "folder" in item:
            folder_counter[0] += 1
            walk_folder(
                drive_id,
                item["id"],
                token,
                path_parts + [item.get("name", "")],
                max_files,
                files,
                folder_counter,
            )
            if max_files > 0 and len(files) >= max_files:
                return
            continue

        files.append((path_parts, item))
        if max_files > 0 and len(files) >= max_files:
            return


def split_division_trade(folder_name: str) -> Tuple[Optional[str], Optional[str]]:
    match = re.match(r"^\s*(\d{2})\s*-\s*(.+?)\s*$", folder_name)
    if not match:
        return None, None
    return match.group(1), match.group(2).strip()


def find_division(path_parts: List[str]) -> Tuple[Optional[str], Optional[str]]:
    for part in path_parts[1:]:
        division, trade = split_division_trade(part)
        if division:
            return division, trade
    return None, None


def parse_rfi(name: str) -> Tuple[Optional[str], bool]:
    match = re.search(r"\bRFI[-\s_]*(\d+)\b", name, flags=re.IGNORECASE)
    number = match.group(1).lstrip("0") if match else None
    is_response = bool(re.search(r"\bresponse\b", name, flags=re.IGNORECASE))
    return number, is_response


def classify(path_parts: List[str], name: str, extension: str) -> Tuple[str, str, str]:
    source_path = " / ".join(path_parts + [name]).lower()
    top = path_parts[0].lower() if path_parts else ""

    if top == "06 - bid (responses)":
        return "bid_response", "bid_response", "bidding"
    if top == "13 - subcontractors":
        return "subcontractor_document", "subcontractor_document", "commitments"
    if top == "15 - rfi" or (not top and re.search(r"\brfi[-\s_]*\d+", name, re.IGNORECASE)):
        _, is_response = parse_rfi(name)
        return "rfi_document", "rfi_response" if is_response else "rfi_question", "rfi"
    if top == "01 - drawings" or extension == ".dwg":
        return "drawing", "drawing_sheet", "drawings"
    if top == "02 - specifications" or "spec" in source_path:
        return "specification", "spec_section", "specifications"
    if top == "03 - permits (ahj)" or top == "10 - permits" or "permit" in source_path:
        return "permit", "permit_document", "permits"
    if top == "04 - estimate":
        return "estimate", "estimate_document", "estimate"
    if top == "05 - proposal" or "proposal" in source_path:
        return "proposal", "proposal_document", "proposal"
    if top == "07 - photos" or extension in MEDIA_EXTENSIONS:
        return "photo", "project_media", "photos"
    if top == "08 - schedule" or extension in SCHEDULE_EXTENSIONS:
        return "schedule", "schedule_document", "schedule"
    if top == "09 - receipts":
        return "receipt", "receipt", "receipts"
    if top == "11 - safety":
        return "safety", "safety_document", "safety"
    if top == "12 - closeout":
        return "closeout", "closeout_document", "closeout"
    if top == "14 - psr":
        return "project_status_report", "project_status_report", "reports"
    if top == "00 - owner" or any(
        hint in source_path for hint in ("agreement", "prime", "contract", "nda", "purchase agreement")
    ):
        return "owner_contract", "owner_contract", "prime_contract"
    return "general_document", "project_document", "documents"


def storage_recommendation(extension: str, category: str) -> str:
    if extension in MEDIA_EXTENSIONS:
        return "store_original_in_media_bucket_or_project_files; skip default text embedding"
    if extension in ARCHIVE_EXTENSIONS:
        return "store_original_archive; inspect contents asynchronously"
    if extension in TABLE_EXTENSIONS:
        return "store_original; parse with financial/tabular pipeline when relevant"
    if extension in SCHEDULE_EXTENSIONS:
        return "store_original; parse schedule metadata with dedicated schedule parser"
    if category == "drawing":
        return "store_original_pdf; extract sheets/OCR asynchronously"
    return "store_original; extract text/chunks asynchronously"


def content_type_for_name(name: str) -> Optional[str]:
    explicit = {
        ".heic": "image/heic",
        ".mpp": "application/vnd.ms-project",
        ".msg": "application/vnd.ms-outlook",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".zip": "application/zip",
    }
    extension = Path(name).suffix.lower()
    if extension in explicit:
        return explicit[extension]
    guessed, _ = mimetypes.guess_type(name)
    return guessed


def storage_path_for(args: argparse.Namespace, drive_item_id: str, name: str) -> str:
    extension = Path(name).suffix.lower()
    safe_project = re.sub(r"[^A-Za-z0-9._-]+", "-", str(args.project_number or args.project_id or "project")).strip("-")
    return f"sharepoint/{safe_project}/{drive_item_id}{extension}"


def metadata_id_for(source_system: str, drive_id: str, drive_item_id: str) -> str:
    return str(uuid5(NAMESPACE_URL, f"{source_system}:{drive_id}:{drive_item_id}"))


def source_metadata_for(
    path_parts: List[str],
    item: Dict[str, Any],
    preview: Dict[str, Any],
    storage_candidate_path: str,
) -> Dict[str, Any]:
    return {
        "source_folder": path_parts,
        "preview_action": preview,
        "storage_candidate_path": storage_candidate_path,
    }


def should_create_metadata(rag_action: str) -> bool:
    return rag_action != "skip_default_embedding"


def build_preview_item(
    path_parts: List[str],
    item: Dict[str, Any],
    max_rag_size_mb: float,
    root: Dict[str, Any],
    args: argparse.Namespace,
) -> PreviewItem:
    name = item.get("name", "")
    extension = Path(name).suffix.lower() or "[none]"
    size_bytes = int(item.get("size") or 0)
    size_mb = round(size_bytes / 1024 / 1024, 2)
    category, doc_type, workflow = classify(path_parts, name, extension)
    division, trade = find_division(path_parts)
    rfi_number, is_response = parse_rfi(name)
    source_path = " / ".join(path_parts + [name])
    drive_id = root.get("parentReference", {}).get("driveId")
    site_id = root.get("parentReference", {}).get("siteId")
    drive_item_id = item.get("id", "")
    storage_path = storage_path_for(args, drive_item_id, name)
    source_system = "sharepoint"

    if extension not in RAW_STORAGE_EXTENSIONS:
        project_action = "skip_until_supported"
        skip_reason = f"unsupported extension {extension}"
    else:
        project_action = "upsert_project_documents"
        skip_reason = None

    rag_action = "skip_default_embedding"
    if extension in TEXT_EXTRACTION_EXTENSIONS and category not in {"photo"}:
        if size_mb > max_rag_size_mb:
            rag_action = "queue_large_file_extraction"
        else:
            rag_action = "queue_text_extraction_and_embedding"
    elif extension in TABLE_EXTENSIONS:
        rag_action = "queue_tabular_parser"
    elif category == "drawing" and extension in {".pdf", ".png", ".jpg", ".jpeg"}:
        rag_action = "queue_drawing_ocr_or_sheet_parser"

    media_action = "none"
    if category == "photo" or extension in MEDIA_EXTENSIONS:
        media_action = "upsert_project_media"

    preview_action = {
        "project_documents_action": project_action,
        "rag_action": rag_action,
        "media_action": media_action,
        "storage_recommendation": storage_recommendation(extension, category),
    }
    source_metadata = source_metadata_for(path_parts, item, preview_action, storage_path)
    project_documents_row: Dict[str, Any] = {
        "project_id": args.project_id,
        "folder": " / ".join(path_parts) or "Root",
        "title": Path(name).stem,
        "description": None,
        "file_name": name,
        "file_url": item.get("webUrl") or "",
        "file_size": size_bytes,
        "content_type": content_type_for_name(name),
        "version": 1,
        "status": "Published",
        "category": category,
        "is_private": False,
        "uploaded_by": "SharePoint sync",
        "source_system": source_system,
        "source_drive_id": drive_id,
        "source_item_id": drive_item_id,
        "source_site_id": site_id,
        "source_path": source_path,
        "source_web_url": item.get("webUrl"),
        "source_etag": item.get("eTag") or item.get("cTag"),
        "source_last_modified_at": item.get("lastModifiedDateTime"),
        "source_size": size_bytes,
        "sync_status": "synced",
        "sync_error": None,
        "last_synced_at": datetime.now(timezone.utc).isoformat(),
        "storage_bucket": "documents",
        "storage_path": None,
        "content_hash": None,
        "workflow_target": workflow,
        "division": division,
        "trade": trade,
        "source_metadata": source_metadata,
    }

    document_metadata_row: Optional[Dict[str, Any]] = None
    if should_create_metadata(rag_action):
        document_metadata_row = {
            "id": metadata_id_for(source_system, drive_id or "", drive_item_id),
            "title": Path(name).stem,
            "url": item.get("webUrl"),
            "type": doc_type,
            "source": "microsoft_graph",
            "category": category,
            "project_id": args.project_id,
            "date": item.get("lastModifiedDateTime"),
            "status": "raw_ingested",
            "phase": "ingest",
            "file_name": name,
            "file_path": storage_path,
            "storage_bucket": "documents",
            "source_system": source_system,
            "source_drive_id": drive_id,
            "source_item_id": drive_item_id,
            "source_site_id": site_id,
            "source_path": source_path,
            "source_web_url": item.get("webUrl"),
            "source_etag": item.get("eTag") or item.get("cTag"),
            "source_last_modified_at": item.get("lastModifiedDateTime"),
            "source_size": size_bytes,
            "workflow_target": workflow,
            "division": division,
            "trade": trade,
            "source_metadata": source_metadata,
            "tags": ";".join(
                part
                for part in [
                    "sharepoint",
                    f"workflow:{workflow}",
                    f"division:{division}" if division else "",
                    f"trade:{trade}" if trade else "",
                    f"rfi:{rfi_number}" if rfi_number else "",
                    "rfi_response" if is_response else "",
                ]
                if part
            ),
        }

    return PreviewItem(
        source_path=source_path,
        name=name,
        extension=extension,
        size_bytes=size_bytes,
        size_mb=size_mb,
        modified_at=item.get("lastModifiedDateTime"),
        web_url=item.get("webUrl"),
        drive_item_id=item.get("id", ""),
        document_category=category,
        document_type=doc_type,
        workflow_target=workflow,
        project_documents_action=project_action,
        rag_action=rag_action,
        media_action=media_action,
        division=division,
        trade=trade,
        rfi_number=rfi_number,
        is_response=is_response,
        storage_recommendation=storage_recommendation(extension, category),
        skip_reason=skip_reason,
        project_documents_row=project_documents_row,
        document_metadata_row=document_metadata_row,
    )


def summarize(items: List[PreviewItem], folder_count: int, root: Dict[str, Any], args: argparse.Namespace) -> Dict[str, Any]:
    by_category: Dict[str, Dict[str, Any]] = {}
    for category in sorted({item.document_category for item in items}):
        rows = [item for item in items if item.document_category == category]
        by_category[category] = {
            "files": len(rows),
            "mb": round(sum(item.size_bytes for item in rows) / 1024 / 1024, 2),
        }

    by_top_folder: Dict[str, Dict[str, Any]] = {}
    for top in sorted({item.source_path.split(" / ")[0] if " / " in item.source_path else "[root]" for item in items}):
        rows = [
            item
            for item in items
            if (item.source_path.split(" / ")[0] if " / " in item.source_path else "[root]") == top
        ]
        by_top_folder[top] = {
            "files": len(rows),
            "mb": round(sum(item.size_bytes for item in rows) / 1024 / 1024, 2),
            "extensions": dict(Counter(item.extension for item in rows).most_common(8)),
        }

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "project_id": args.project_id,
        "project_number": args.project_number,
        "project_name": args.project_name,
        "root_name": root.get("name"),
        "root_web_url": root.get("webUrl"),
        "drive_id": root.get("parentReference", {}).get("driveId"),
        "root_item_id": root.get("id"),
        "folder_count": folder_count,
        "file_count": len(items),
        "total_mb": round(sum(item.size_bytes for item in items) / 1024 / 1024, 2),
        "project_documents_upserts": sum(
            1 for item in items if item.project_documents_action == "upsert_project_documents"
        ),
        "rag_queue_count": sum(1 for item in items if item.rag_action != "skip_default_embedding"),
        "media_upserts": sum(1 for item in items if item.media_action != "none"),
        "unsupported_count": sum(1 for item in items if item.skip_reason),
        "by_category": by_category,
        "by_top_folder": by_top_folder,
        "extensions": dict(Counter(item.extension for item in items).most_common()),
        "largest_files": [
            asdict(item)
            for item in sorted(items, key=lambda row: row.size_bytes, reverse=True)[: args.largest_limit]
        ],
        "rfi_candidates": [
            asdict(item)
            for item in items
            if item.document_category == "rfi_document"
        ],
    }


def write_markdown(report_path: Path, summary: Dict[str, Any], items: List[PreviewItem]) -> None:
    lines = [
        f"# SharePoint Import Preview: {summary['root_name']}",
        "",
        f"- Generated: `{summary['generated_at']}`",
        f"- Project: `{summary.get('project_id')}` `{summary.get('project_number') or ''}` {summary.get('project_name') or ''}",
        f"- Folders: `{summary['folder_count']}`",
        f"- Files: `{summary['file_count']}`",
        f"- Total size: `{summary['total_mb']} MB`",
        f"- Project document upserts: `{summary['project_documents_upserts']}`",
        f"- RAG/parser queue candidates: `{summary['rag_queue_count']}`",
        f"- Media upserts: `{summary['media_upserts']}`",
        f"- Unsupported/skipped: `{summary['unsupported_count']}`",
        "",
        "## By Category",
        "",
        "| Category | Files | MB |",
        "| --- | ---: | ---: |",
    ]
    for category, row in summary["by_category"].items():
        lines.append(f"| {category} | {row['files']} | {row['mb']} |")

    lines.extend(["", "## By Top Folder", "", "| Folder | Files | MB | Extensions |", "| --- | ---: | ---: | --- |"])
    for folder, row in summary["by_top_folder"].items():
        lines.append(
            f"| {folder} | {row['files']} | {row['mb']} | `{json.dumps(row['extensions'], sort_keys=True)}` |"
        )

    lines.extend(["", "## Largest Files", "", "| MB | Category | Path |", "| ---: | --- | --- |"])
    for item in summary["largest_files"]:
        lines.append(f"| {item['size_mb']} | {item['document_category']} | {item['source_path']} |")

    lines.extend(["", "## RFI Candidates", "", "| RFI | Type | MB | Path |", "| --- | --- | ---: | --- |"])
    for item in summary["rfi_candidates"]:
        rfi = item.get("rfi_number") or ""
        kind = "response" if item.get("is_response") else "question"
        lines.append(f"| {rfi} | {kind} | {item['size_mb']} | {item['source_path']} |")

    lines.extend(["", "## Sample Import Rows", "", "| Destination | RAG Action | Category | Path |", "| --- | --- | --- | --- |"])
    for item in items[:75]:
        lines.append(
            f"| {item.project_documents_action} | {item.rag_action} | {item.document_category} | {item.source_path} |"
        )

    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def clean_project_document_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """Remove preview-only nulls while preserving intentional DB defaults."""
    cleaned = dict(row)
    if cleaned.get("project_id") is None:
        raise RuntimeError("project_id is required to apply project document rows.")
    if not cleaned.get("file_url"):
        raise RuntimeError(f"file_url is required for {cleaned.get('source_path')}")
    return cleaned


def apply_project_document_rows(items: List[PreviewItem]) -> Dict[str, int]:
    from services.supabase_helpers import get_supabase_client

    client = get_supabase_client()
    inserted = 0
    updated = 0
    skipped = 0

    for item in items:
        if item.project_documents_action != "upsert_project_documents":
            skipped += 1
            continue

        row = clean_project_document_row(item.project_documents_row)
        existing = (
            client.table("project_documents")
            .select("id")
            .eq("project_id", row["project_id"])
            .eq("source_system", row["source_system"])
            .eq("source_drive_id", row["source_drive_id"])
            .eq("source_item_id", row["source_item_id"])
            .is_("deleted_at", "null")
            .limit(1)
            .execute()
        )
        rows = existing.data or []
        if rows:
            record_id = rows[0]["id"]
            client.table("project_documents").update(row).eq("id", record_id).execute()
            updated += 1
        else:
            client.table("project_documents").insert(row).execute()
            inserted += 1

    return {"inserted": inserted, "updated": updated, "skipped": skipped}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Dry-run a SharePoint project-folder import")
    parser.add_argument("--share-url", required=True, help="SharePoint sharing URL for the project folder")
    parser.add_argument("--project-id", type=int, default=None, help="Alleato project id for the preview")
    parser.add_argument("--project-number", default=None, help="Alleato project number for the preview")
    parser.add_argument("--project-name", default=None, help="Alleato project name for the preview")
    parser.add_argument(
        "--output-dir",
        default=str(REPO_ROOT / "tmp" / "sharepoint-import-preview"),
        help="Directory for JSON and Markdown preview reports",
    )
    parser.add_argument("--max-files", type=int, default=0, help="Stop after N files, for sampling")
    parser.add_argument(
        "--apply-project-documents",
        action="store_true",
        help="Write project_documents rows. Does not copy files or write document_metadata.",
    )
    parser.add_argument(
        "--max-rag-size-mb",
        type=float,
        default=50.0,
        help="Files above this size are marked for large-file extraction",
    )
    parser.add_argument("--largest-limit", type=int, default=20, help="Largest files to include in summary")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    load_dotenv()
    token = get_graph_token()
    share_id = share_id_from_url(args.share_url)
    root = graph_get(f"/shares/{share_id}/driveItem", token)
    drive_id = root.get("parentReference", {}).get("driveId")
    if not drive_id:
        raise RuntimeError("Graph response did not include a drive id for the shared folder.")

    raw_files: List[Tuple[List[str], Dict[str, Any]]] = []
    folder_counter = [0]
    walk_folder(drive_id, root["id"], token, [], args.max_files, raw_files, folder_counter)

    items = [
        build_preview_item(path_parts, item, args.max_rag_size_mb, root, args)
        for path_parts, item in raw_files
    ]
    items.sort(key=lambda row: row.source_path.lower())

    summary = summarize(items, folder_counter[0], root, args)
    apply_result: Optional[Dict[str, int]] = None
    if args.apply_project_documents:
        if args.project_id is None:
            raise RuntimeError("--project-id is required with --apply-project-documents")
        apply_result = apply_project_document_rows(items)
        summary["apply_project_documents"] = apply_result
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    slug_source = args.project_number or args.project_name or root.get("name") or "sharepoint-folder"
    slug = re.sub(r"[^A-Za-z0-9._-]+", "-", str(slug_source)).strip("-").lower() or "sharepoint-folder"
    json_path = output_dir / f"{slug}-preview.json"
    md_path = output_dir / f"{slug}-preview.md"

    json_path.write_text(
        json.dumps(
            {
                "summary": summary,
                "items": [asdict(item) for item in items],
            },
            indent=2,
            sort_keys=True,
        ),
        encoding="utf-8",
    )
    write_markdown(md_path, summary, items)

    print(json.dumps({
        "status": "ok",
        "json": str(json_path),
        "markdown": str(md_path),
        "files": len(items),
        "folders": folder_counter[0],
        "total_mb": summary["total_mb"],
        "project_documents_upserts": summary["project_documents_upserts"],
        "rag_queue_count": summary["rag_queue_count"],
        "media_upserts": summary["media_upserts"],
        "unsupported_count": summary["unsupported_count"],
        "apply_project_documents": apply_result,
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
