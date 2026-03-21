#!/usr/bin/env python3
"""Re-sync 2026 Fireflies meetings that are missing rich metadata fields.

Fetches fireflies_id values from document_metadata where organizer_email IS NULL,
then re-fetches each transcript from Fireflies API and updates all rich fields
(organizer_email, keywords, sentiment, speakers, chapters, notes, attendees, etc.)

Also regenerates markdown and re-uploads to storage, and re-ingests chunks.

Usage:
    cd alleato-pm
    python scripts/resync-fireflies-2026-rich-fields.py
    python scripts/resync-fireflies-2026-rich-fields.py --dry-run
    python scripts/resync-fireflies-2026-rich-fields.py --limit 10
    python scripts/resync-fireflies-2026-rich-fields.py --metadata-only  # skip markdown/chunks, just update fields
"""

import os
import sys
import json
import argparse
import logging
import time
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).resolve().parent.parent / "backend" / "src"
services_dir = backend_dir / "services"
sys.path.insert(0, str(services_dir))
sys.path.insert(0, str(backend_dir))

# Load .env
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def parse_args():
    parser = argparse.ArgumentParser(description="Re-sync Fireflies 2026 meetings with rich metadata")
    parser.add_argument("--dry-run", action="store_true", help="Count and preview only, no writes")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of meetings to process (0 = all)")
    parser.add_argument("--metadata-only", action="store_true",
                        help="Only update metadata fields, skip markdown regeneration and chunk re-embedding")
    parser.add_argument("--batch-pause", type=float, default=1.0,
                        help="Seconds to pause between API calls (default: 1.0)")
    return parser.parse_args()


def main():
    args = parse_args()

    from services.supabase_helpers import SupabaseRagStore, get_supabase_client
    from services.ingestion.fireflies_pipeline import FirefliesIngestionPipeline

    api_key = os.getenv("FIREFLIES_API_KEY")
    if not api_key:
        print("ERROR: FIREFLIES_API_KEY not set in .env")
        sys.exit(1)

    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key and not args.metadata_only:
        print("WARNING: OPENAI_API_KEY not set — embeddings will use hash fallback")

    client = get_supabase_client()
    store = SupabaseRagStore(client)
    pipeline = FirefliesIngestionPipeline(store)

    # Step 1: Fetch meetings needing resync from database
    print(f"\n{'='*60}")
    print(f"  Fireflies 2026 Rich Metadata Re-Sync")
    print(f"  Mode: {'DRY RUN' if args.dry_run else ('metadata-only' if args.metadata_only else 'full resync')}")
    print(f"{'='*60}\n")

    print("[1/4] Fetching meetings needing resync from database...")

    # Query for 2026 Fireflies meetings missing rich fields
    query = (
        client.table("document_metadata")
        .select("id, fireflies_id, title, date")
        .eq("source", "fireflies")
        .gte("date", "2026-01-01")
        .is_("organizer_email", "null")
        .not_.is_("fireflies_id", "null")
        .order("date", desc=False)
    )

    if args.limit > 0:
        query = query.limit(args.limit)
    else:
        query = query.limit(1000)

    result = query.execute()
    meetings = result.data or []

    print(f"       Found {len(meetings)} meetings needing rich metadata update")

    if not meetings:
        print("       Nothing to do!")
        return

    if args.dry_run:
        print("\n  [DRY RUN] Would process these meetings:")
        for m in meetings[:10]:
            print(f"    - {m['date'][:10]} | {m['title'][:60]} | ff_id={m['fireflies_id'][:20]}...")
        if len(meetings) > 10:
            print(f"    ... and {len(meetings) - 10} more")
        print(f"\n  Total: {len(meetings)} meetings")
        return

    # Step 2: Process each meeting
    processed = 0
    skipped = 0
    errors = 0
    results = []

    for i, meeting in enumerate(meetings):
        ff_id = meeting["fireflies_id"]
        doc_id = meeting["id"]
        title = meeting.get("title") or "Untitled"

        print(f"\n[2/4] Processing {i+1}/{len(meetings)}: {title[:60]}")
        print(f"       Fireflies ID: {ff_id}")

        try:
            # Fetch full transcript from Fireflies API
            transcript = pipeline._fetch_transcript(ff_id)

            if not transcript:
                print(f"       SKIP: transcript not found in Fireflies API")
                skipped += 1
                results.append({"doc_id": doc_id, "ff_id": ff_id, "status": "not_found"})
                continue

            meeting_info = transcript.get("meeting_info") or {}
            summary_status = str(meeting_info.get("summary_status") or "").strip().lower()
            sentences = transcript.get("sentences") or []

            if summary_status and summary_status not in {"processed", "complete", "completed"}:
                print(f"       SKIP: summary_status={summary_status}")
                skipped += 1
                results.append({"doc_id": doc_id, "ff_id": ff_id, "status": "skip", "reason": f"summary_status={summary_status}"})
                continue

            # Extract rich metadata
            rich_metadata = pipeline._extract_fireflies_rich_metadata(transcript)

            if args.metadata_only:
                # Just update the metadata fields directly
                update_data = {k: v for k, v in rich_metadata.items() if v is not None}

                # Convert lists/dicts to JSON strings for Supabase
                for key, val in update_data.items():
                    if isinstance(val, (dict, list)):
                        update_data[key] = json.dumps(val) if not isinstance(val, list) else val

                if update_data:
                    client.table("document_metadata").update(update_data).eq("id", doc_id).execute()
                    print(f"       ✓ Updated {len(update_data)} metadata fields")
                else:
                    print(f"       SKIP: no rich metadata extracted")
                    skipped += 1
                    results.append({"doc_id": doc_id, "ff_id": ff_id, "status": "no_metadata"})
                    continue
            else:
                # Full resync: regenerate markdown, re-upload, re-ingest
                if not sentences:
                    print(f"       SKIP: no sentences for full resync")
                    skipped += 1
                    results.append({"doc_id": doc_id, "ff_id": ff_id, "status": "skip", "reason": "no_sentences"})
                    continue

                apps_outputs = pipeline._fetch_apps_outputs(ff_id)
                markdown = pipeline._format_transcript_markdown(transcript, apps_outputs)

                captured_at = pipeline._parse_datetime(
                    transcript.get("dateString") or transcript.get("date")
                )
                storage_path = pipeline._build_storage_path(
                    transcript.get("title") or ff_id, captured_at
                )
                storage_url = store.upload_public_text("transcripts", storage_path, markdown)

                ingestion = pipeline.ingest_markdown_text(
                    markdown,
                    project_id=None,
                    dry_run=False,
                    storage_url=storage_url,
                    extra_metadata=rich_metadata,
                )
                print(f"       ✓ Full resync: doc={ingestion.document_id}, chunks={ingestion.chunk_count}")

            processed += 1
            results.append({
                "doc_id": doc_id,
                "ff_id": ff_id,
                "title": title,
                "status": "ok",
                "fields_updated": len([v for v in rich_metadata.values() if v is not None]),
            })

        except Exception as exc:
            print(f"       ✗ ERROR: {exc}")
            errors += 1
            results.append({"doc_id": doc_id, "ff_id": ff_id, "status": "error", "error": str(exc)})

        # Rate-limit Fireflies API calls
        if i < len(meetings) - 1:
            time.sleep(args.batch_pause)

    # Summary
    print(f"\n{'='*60}")
    print(f"  RESULTS")
    print(f"  Processed: {processed}")
    print(f"  Skipped:   {skipped}")
    print(f"  Errors:    {errors}")
    print(f"{'='*60}\n")

    # Write results JSON
    output_dir = Path(__file__).resolve().parent.parent / "backend" / "output" / "fireflies-2026-resync"
    output_dir.mkdir(parents=True, exist_ok=True)
    results_file = output_dir / "_resync_results.json"
    results_file.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"Results written to: {results_file}")

    if errors > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
