#!/usr/bin/env python3
"""Local folder ingestion for multi-pipeline RAG documents.

Scans a local folder, classifies files by document type, uploads raw files to
Supabase Storage, writes `document_metadata` + `fireflies_ingestion_jobs`, and
optionally runs the existing Python pipeline immediately.

Usage examples:
  python3 scripts/ingestion/ingest_local_documents.py \
    --source-dir ~/Documents/AlleatoKnowledge --project-id 43

  python3 scripts/ingestion/ingest_local_documents.py \
    --source-dir ~/Documents/AlleatoKnowledge --process-now --limit 25

  python3 scripts/ingestion/ingest_local_documents.py \
    --source-dir ~/Documents/AlleatoKnowledge --watch --interval-seconds 3600
"""

from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import os
import re
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple
from uuid import NAMESPACE_URL, uuid5

# Resolve backend imports from repository layout
REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_SRC = REPO_ROOT / "backend" / "src"
if str(BACKEND_SRC) not in sys.path:
    sys.path.insert(0, str(BACKEND_SRC))

from services.env_loader import load_env


SUPPORTED_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
    ".txt",
    ".md",
    ".rtf",
    ".csv",
    ".tsv",
    ".xls",
    ".xlsx",
    ".numbers",
    ".png",
    ".jpg",
    ".jpeg",
    ".tif",
    ".tiff",
    ".bmp",
    ".webp",
}

FINANCIAL_HINTS = {
    "budget",
    "estimate",
    "proposal",
    "takeoff",
    "p&l",
    "profit",
    "loss",
    "balance",
    "invoice",
    "cost",
    "schedule of values",
    "sov",
}

SPEC_HINTS = {
    "spec",
    "specification",
    "csi",
    "division",
    "manual",
    "submittal",
    "rfi",
}

DRAWING_HINTS = {
    "drawing",
    "sheet",
    "plan",
    "elevation",
    "detail",
    "as-built",
    "asbuilt",
}

CONTRACT_HINTS = {
    "contract",
    "change order",
    "change request",
    "legal",
    "permit",
    "agreement",
}

TRANSCRIPT_HINTS = {
    "transcript",
    "meeting",
    "minutes",
    "fireflies",
}


@dataclass
class FileCandidate:
    path: Path
    rel_path: str
    extension: str
    size: int
    mtime: float
    sha256: str


@dataclass
class IngestOutcome:
    file: str
    status: str
    metadata_id: Optional[str] = None
    category: Optional[str] = None
    reason: Optional[str] = None


class PayloadTooLargeError(RuntimeError):
    """Raised when storage upload rejects a file because it is too large."""


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256_file(path: Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        while True:
            block = fh.read(chunk_size)
            if not block:
                break
            digest.update(block)
    return digest.hexdigest()


def sanitize_storage_component(raw: str) -> str:
    value = re.sub(r"[^A-Za-z0-9._-]+", "-", raw.strip())
    value = re.sub(r"-+", "-", value).strip("-._")
    return value[:180] or "file"


def classify_document(rel_path: str, ext: str) -> Tuple[str, str]:
    normalized = rel_path.lower().replace("_", " ")

    if ext in {".md", ".txt"} and any(h in normalized for h in TRANSCRIPT_HINTS):
        return ("meeting", "transcript")

    if ext in {".csv", ".tsv", ".xls", ".xlsx", ".numbers"}:
        return ("financial_document", "financial_table")

    if any(h in normalized for h in FINANCIAL_HINTS):
        return ("financial_document", "financial_table")

    if ext in {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".webp"}:
        return ("drawing", "drawing_image")

    if any(h in normalized for h in DRAWING_HINTS):
        return ("drawing", "drawing_sheet")

    if any(h in normalized for h in SPEC_HINTS):
        return ("specification", "spec_section")

    if any(h in normalized for h in CONTRACT_HINTS):
        return ("contract", "contract_clause")

    return ("document", "generic_document")


def load_manifest(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {"version": 1, "files": {}}
    with path.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    if "files" not in data or not isinstance(data["files"], dict):
        return {"version": 1, "files": {}}
    return data


def save_manifest(path: Path, manifest: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    with tmp_path.open("w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2, sort_keys=True)
    tmp_path.replace(path)


def iter_candidates(source_dir: Path) -> Iterable[FileCandidate]:
    for file_path in source_dir.rglob("*"):
        if not file_path.is_file():
            continue
        ext = file_path.suffix.lower()
        if ext not in SUPPORTED_EXTENSIONS:
            continue
        stat = file_path.stat()
        rel_path = str(file_path.relative_to(source_dir))
        yield FileCandidate(
            path=file_path,
            rel_path=rel_path,
            extension=ext,
            size=stat.st_size,
            mtime=stat.st_mtime,
            sha256=sha256_file(file_path),
        )


def should_ingest(
    candidate: FileCandidate,
    manifest_files: Dict[str, Any],
    reindex_all: bool,
) -> bool:
    if reindex_all:
        return True
    prev = manifest_files.get(candidate.rel_path)
    if not prev:
        return True
    return (
        prev.get("sha256") != candidate.sha256
        or int(prev.get("size", -1)) != int(candidate.size)
        or float(prev.get("mtime", -1.0)) != float(candidate.mtime)
    )


def upload_binary(
    client,
    bucket: str,
    storage_path: str,
    file_path: Path,
) -> None:
    ext = file_path.suffix.lower()
    explicit_content_types = {
        ".md": "text/markdown",
        ".tsv": "text/tab-separated-values",
        ".xls": "application/vnd.ms-excel",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
    content_type = explicit_content_types.get(ext)
    if not content_type:
        content_type, _ = mimetypes.guess_type(str(file_path))

    options = {"upsert": "true"}
    if content_type:
        options["content-type"] = content_type

    payload = file_path.read_bytes()
    try:
        client.storage.from_(bucket).upload(storage_path, payload, options)
    except Exception as exc:
        message = str(exc).lower()
        if (
            "statuscode': 413" in message
            or "payload too large" in message
            or "maximum allowed size" in message
            or "object exceeded the maximum allowed size" in message
        ):
            raise PayloadTooLargeError(str(exc)) from exc

        # If a bucket mime allowlist blocks this upload, retry with a
        # generic content type for resiliency across environments.
        if "mime type" in message and "not supported" in message:
            fallback_options = {"upsert": "true", "content-type": "application/octet-stream"}
            try:
                client.storage.from_(bucket).upload(storage_path, payload, fallback_options)
                return
            except Exception:
                client.storage.from_(bucket).update(storage_path, payload, fallback_options)
                return
        client.storage.from_(bucket).update(storage_path, payload, options)


def fetch_existing_by_hash(client, content_hash: str) -> Optional[Dict[str, Any]]:
    resp = (
        client.table("document_metadata")
        .select("id, content_hash")
        .eq("content_hash", content_hash)
        .limit(1)
        .execute()
    )
    rows = resp.data or []
    return rows[0] if rows else None


def resolve_project_id(
    client,
    explicit_project_id: Optional[int],
    project_name: Optional[str],
) -> Optional[int]:
    if explicit_project_id is not None:
        return explicit_project_id
    if not project_name:
        return None

    target = project_name.strip()
    if not target:
        return None

    exact_resp = (
        client.table("projects")
        .select("id, name")
        .ilike("name", target)
        .limit(5)
        .execute()
    )
    exact_rows = exact_resp.data or []
    if len(exact_rows) == 1:
        return int(exact_rows[0]["id"])
    if len(exact_rows) > 1:
        names = ", ".join(str(r.get("name") or r.get("id")) for r in exact_rows)
        raise RuntimeError(
            f"Multiple projects match '{project_name}' exactly (case-insensitive): {names}. "
            "Use --project-id to disambiguate."
        )

    contains_resp = (
        client.table("projects")
        .select("id, name")
        .ilike("name", f"%{target}%")
        .limit(10)
        .execute()
    )
    contains_rows = contains_resp.data or []
    if len(contains_rows) == 1:
        return int(contains_rows[0]["id"])
    if len(contains_rows) > 1:
        names = ", ".join(str(r.get("name") or r.get("id")) for r in contains_rows)
        raise RuntimeError(
            f"Multiple projects partially match '{project_name}': {names}. "
            "Use --project-id to disambiguate."
        )

    raise RuntimeError(f"Project not found for name '{project_name}'.")


def make_metadata_id(rel_path: str, content_hash: str) -> str:
    return str(uuid5(NAMESPACE_URL, f"{rel_path}:{content_hash}"))


def ingest_candidate(
    client,
    candidate: FileCandidate,
    source_dir: Path,
    bucket: str,
    project_id: Optional[int],
    process_now: bool,
    dry_run: bool,
    max_file_size_bytes: Optional[int],
) -> IngestOutcome:
    category, strategy = classify_document(candidate.rel_path, candidate.extension)

    if max_file_size_bytes is not None and candidate.size > max_file_size_bytes:
        limit_mb = max_file_size_bytes / (1024 * 1024)
        actual_mb = candidate.size / (1024 * 1024)
        return IngestOutcome(
            file=candidate.rel_path,
            status="skipped_oversized",
            category=category,
            reason=f"file size {actual_mb:.2f} MB exceeds max {limit_mb:.2f} MB",
        )

    existing = fetch_existing_by_hash(client, candidate.sha256)
    if existing:
        return IngestOutcome(
            file=candidate.rel_path,
            status="skipped_existing",
            metadata_id=existing.get("id"),
            category=category,
            reason="matching content_hash already exists",
        )

    metadata_id = make_metadata_id(candidate.rel_path, candidate.sha256)
    title = candidate.path.stem
    source_path_slug = sanitize_storage_component(candidate.rel_path.replace("/", "--"))
    storage_path = f"local/{datetime.now(timezone.utc).date().isoformat()}/{source_path_slug}"

    metadata_row: Dict[str, Any] = {
        "id": metadata_id,
        "title": title,
        "category": category,
        "type": "document",
        "source": "local_filesystem",
        "status": "raw_ingested",
        "phase": "ingest",
        "content_hash": candidate.sha256,
        "file_name": candidate.path.name,
        "file_path": storage_path,
        "storage_bucket": bucket,
        "captured_at": now_iso(),
        "tags": f"strategy:{strategy};local_path:{candidate.rel_path}",
    }
    if project_id is not None:
        metadata_row["project_id"] = project_id

    job_row = {
        "fireflies_id": metadata_id,
        "metadata_id": metadata_id,
        "stage": "raw_ingested",
        "error_message": None,
    }

    if dry_run:
        return IngestOutcome(
            file=candidate.rel_path,
            status="dry_run",
            metadata_id=metadata_id,
            category=category,
            reason=f"would enqueue {strategy}",
        )

    try:
        upload_binary(client, bucket, storage_path, candidate.path)
    except PayloadTooLargeError as exc:
        return IngestOutcome(
            file=candidate.rel_path,
            status="skipped_oversized",
            metadata_id=metadata_id,
            category=category,
            reason=f"storage rejected upload as too large: {exc}",
        )

    client.table("document_metadata").upsert(metadata_row).execute()
    client.table("fireflies_ingestion_jobs").upsert(
        job_row, on_conflict="fireflies_id"
    ).execute()

    if process_now:
        from services.pipeline import run_full_pipeline
        run_full_pipeline(metadata_id)

    return IngestOutcome(
        file=candidate.rel_path,
        status="ingested",
        metadata_id=metadata_id,
        category=category,
        reason=f"enqueued via {strategy}",
    )


def run_once(args: argparse.Namespace) -> Dict[str, Any]:
    source_dir = Path(args.source_dir).expanduser().resolve()
    if not source_dir.exists() or not source_dir.is_dir():
        raise RuntimeError(f"Source directory does not exist: {source_dir}")

    max_file_size_bytes: Optional[int] = None
    if args.max_file_size_mb is not None and args.max_file_size_mb > 0:
        max_file_size_bytes = int(args.max_file_size_mb * 1024 * 1024)

    manifest_path = Path(args.manifest).expanduser().resolve()
    manifest = load_manifest(manifest_path)
    manifest_files: Dict[str, Any] = manifest.get("files", {})

    client = None
    effective_project_id = args.project_id
    should_init_client = (not args.dry_run) or bool(args.project_name)
    if should_init_client:
        try:
            from services.supabase_helpers import get_supabase_client
        except Exception as exc:
            raise RuntimeError(
                "Supabase Python dependencies are not installed. "
                "Install backend requirements first: `cd backend && pip install -r requirements.txt`"
            ) from exc
        client = get_supabase_client()
        effective_project_id = resolve_project_id(client, args.project_id, args.project_name)

    candidates = list(iter_candidates(source_dir))
    candidates.sort(key=lambda c: c.rel_path.lower())

    changed = [
        c
        for c in candidates
        if should_ingest(c, manifest_files, reindex_all=args.reindex_all)
    ]

    if args.limit > 0:
        changed = changed[: args.limit]

    outcomes: List[IngestOutcome] = []
    for c in changed:
        try:
            if args.dry_run:
                category, strategy = classify_document(c.rel_path, c.extension)
                metadata_id = make_metadata_id(c.rel_path, c.sha256)
                outcome = IngestOutcome(
                    file=c.rel_path,
                    status="dry_run",
                    metadata_id=metadata_id,
                    category=category,
                    reason=f"would enqueue {strategy}",
                )
            else:
                outcome = ingest_candidate(
                    client=client,
                    candidate=c,
                    source_dir=source_dir,
                    bucket=args.bucket,
                    project_id=effective_project_id,
                    process_now=args.process_now,
                    dry_run=args.dry_run,
                    max_file_size_bytes=max_file_size_bytes,
                )
        except Exception as exc:
            outcome = IngestOutcome(
                file=c.rel_path,
                status="error",
                reason=str(exc),
            )

        outcomes.append(outcome)

        if outcome.status in {"ingested", "skipped_existing", "skipped_oversized", "dry_run"}:
            manifest_files[c.rel_path] = {
                "sha256": c.sha256,
                "size": c.size,
                "mtime": c.mtime,
                "metadata_id": outcome.metadata_id,
                "category": outcome.category,
                "status": outcome.status,
                "updated_at": now_iso(),
            }

    manifest["files"] = manifest_files
    manifest["updated_at"] = now_iso()
    if not args.dry_run:
        save_manifest(manifest_path, manifest)

    summary = {
        "source_dir": str(source_dir),
        "total_supported_files": len(candidates),
        "changed_files": len(changed),
        "processed": len(outcomes),
        "ingested": sum(1 for o in outcomes if o.status == "ingested"),
        "skipped_existing": sum(1 for o in outcomes if o.status == "skipped_existing"),
        "dry_run": sum(1 for o in outcomes if o.status == "dry_run"),
        "skipped_oversized": sum(1 for o in outcomes if o.status == "skipped_oversized"),
        "errors": sum(1 for o in outcomes if o.status == "error"),
        "manifest": str(manifest_path),
        "process_now": bool(args.process_now),
        "project_id": effective_project_id,
        "max_file_size_mb": args.max_file_size_mb,
        "results": [o.__dict__ for o in outcomes],
    }
    return summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Local folder ingestion for RAG documents")
    parser.add_argument(
        "--source-dir",
        default=os.getenv("RAG_LOCAL_SOURCE_DIR"),
        help="Directory containing source documents",
    )
    parser.add_argument(
        "--project-id",
        type=int,
        default=None,
        help="Optional project_id to attach to all ingested docs",
    )
    parser.add_argument(
        "--project-name",
        default=os.getenv("RAG_LOCAL_PROJECT_NAME"),
        help="Optional project name to resolve and attach as project_id",
    )
    parser.add_argument(
        "--bucket",
        default=os.getenv("RAG_LOCAL_STORAGE_BUCKET", "documents"),
        help="Supabase storage bucket for uploaded files",
    )
    parser.add_argument(
        "--manifest",
        default=os.getenv("RAG_LOCAL_MANIFEST", str(REPO_ROOT / "tmp" / "rag-ingestion" / "manifest.json")),
        help="Manifest path used for incremental ingestion",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Optional max changed files per run (0 = no limit)",
    )
    parser.add_argument(
        "--reindex-all",
        action="store_true",
        help="Ignore manifest and attempt to process all supported files",
    )
    parser.add_argument(
        "--process-now",
        action="store_true",
        help="Run the pipeline immediately instead of only enqueueing",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview classification and enqueue decisions without writing",
    )
    parser.add_argument(
        "--max-file-size-mb",
        type=float,
        default=float(os.getenv("RAG_LOCAL_MAX_FILE_SIZE_MB", "45")),
        help="Skip files larger than this size in MB (<=0 disables pre-check)",
    )
    parser.add_argument(
        "--watch",
        action="store_true",
        help="Poll the folder continuously",
    )
    parser.add_argument(
        "--interval-seconds",
        type=int,
        default=int(os.getenv("RAG_LOCAL_WATCH_INTERVAL", "3600")),
        help="Polling interval in watch mode",
    )

    args = parser.parse_args()
    if not args.source_dir:
        parser.error("--source-dir is required (or set RAG_LOCAL_SOURCE_DIR)")
    if args.project_id is not None and args.project_name:
        parser.error("Use either --project-id or --project-name, not both")
    if args.interval_seconds < 10:
        parser.error("--interval-seconds must be >= 10")
    if args.max_file_size_mb is not None and args.max_file_size_mb < 0:
        parser.error("--max-file-size-mb must be >= 0")
    return args


def main() -> int:
    load_env()
    args = parse_args()

    if not args.watch:
        summary = run_once(args)
        print(json.dumps(summary, indent=2))
        return 0 if summary.get("errors", 0) == 0 else 1

    print(
        f"[rag-local-ingest] watch mode started | source={args.source_dir} | interval={args.interval_seconds}s"
    )
    while True:
        summary = run_once(args)
        print(json.dumps(summary, indent=2))
        time.sleep(args.interval_seconds)


if __name__ == "__main__":
    raise SystemExit(main())
