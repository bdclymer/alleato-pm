#!/usr/bin/env python3
"""Re-sync the last N Fireflies meetings with the updated GraphQL query.

This script:
1. Fetches the last 25 transcripts from Fireflies API (with new ai_filters fields)
2. Regenerates markdown with ai_filters inline tags + AI Sentence Filters section
3. Re-ingests into Supabase (upserts metadata, replaces chunks, re-embeds)
4. Writes local markdown files for verification

Usage:
    cd alleato-pm
    python scripts/resync-fireflies-with-ai-filters.py
"""

import os
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).resolve().parent.parent / "backend" / "src"
services_dir = backend_dir / "services"
sys.path.insert(0, str(services_dir))
sys.path.insert(0, str(backend_dir))

# Load .env
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

import json
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

def main():
    from services.supabase_helpers import SupabaseRagStore, get_supabase_client
    from services.ingestion.fireflies_pipeline import FirefliesIngestionPipeline

    api_key = os.getenv("FIREFLIES_API_KEY")
    if not api_key:
        print("ERROR: FIREFLIES_API_KEY not set in .env")
        sys.exit(1)

    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        print("WARNING: OPENAI_API_KEY not set — embeddings will use hash fallback")

    client = get_supabase_client()
    store = SupabaseRagStore(client)
    pipeline = FirefliesIngestionPipeline(store)

    output_dir = Path(__file__).resolve().parent.parent / "backend" / "output" / "fireflies-resync-ai-filters"
    output_dir.mkdir(parents=True, exist_ok=True)

    LIMIT = 25  # Fetch last 25 to ensure we get at least 20 processable

    print(f"\n{'='*60}")
    print(f"  Fireflies Re-Sync with AI Filters")
    print(f"  Fetching last {LIMIT} transcripts from Fireflies API")
    print(f"  Output dir: {output_dir}")
    print(f"{'='*60}\n")

    # Step 1: Fetch transcript summaries
    print("[1/4] Fetching transcript list from Fireflies...")
    summaries = pipeline._fetch_recent_transcript_summaries(LIMIT)
    print(f"       Found {len(summaries)} transcripts")

    if not summaries:
        print("ERROR: No transcripts returned from Fireflies API")
        sys.exit(1)

    results = []
    processed = 0
    skipped = 0
    errors = 0

    for i, item in enumerate(summaries):
        transcript_id = str(item.get("id") or "").strip()
        title = item.get("title") or "Untitled"
        if not transcript_id:
            continue

        print(f"\n[2/4] Processing {i+1}/{len(summaries)}: {title[:60]}")
        print(f"       ID: {transcript_id}")

        try:
            # Step 2: Fetch full transcript with NEW fields (ai_filters, privacy, etc.)
            transcript = pipeline._fetch_transcript(transcript_id)

            meeting_info = transcript.get("meeting_info") or {}
            summary_status = str(meeting_info.get("summary_status") or "").strip().lower()
            sentences = transcript.get("sentences") or []

            if summary_status and summary_status not in {"processed", "complete", "completed"}:
                print(f"       SKIP: summary_status={summary_status}")
                skipped += 1
                continue

            if not sentences:
                print(f"       SKIP: no sentences")
                skipped += 1
                continue

            # Count sentences with ai_filters
            sentences_with_filters = sum(
                1 for s in sentences
                if s.get("ai_filters") and any(
                    v for k, v in (s.get("ai_filters") or {}).items()
                    if k not in ("text_cleanup", "sentiment")
                )
            )
            print(f"       Sentences: {len(sentences)}, with ai_filters: {sentences_with_filters}")
            print(f"       Privacy: {transcript.get('privacy', 'N/A')}")

            # Step 3: Fetch apps outputs
            apps_outputs = pipeline._fetch_apps_outputs(transcript_id)

            # Step 4: Generate NEW markdown with ai_filters
            markdown = pipeline._format_transcript_markdown(transcript, apps_outputs)

            # Write local file for verification
            md_file = output_dir / f"{transcript_id}.md"
            md_file.write_text(markdown, encoding="utf-8")

            # Step 5: Upload to storage
            captured_at = pipeline._parse_datetime(
                transcript.get("dateString") or transcript.get("date")
            )
            storage_path = pipeline._build_storage_path(
                transcript.get("title") or transcript_id, captured_at
            )
            storage_url = store.upload_public_text("transcripts", storage_path, markdown)

            # Step 6: Re-ingest (upsert metadata + re-embed chunks)
            ingestion = pipeline.ingest_markdown_text(
                markdown,
                project_id=None,
                dry_run=False,
                storage_url=storage_url,
            )

            print(f"       ✓ Ingested: doc={ingestion.document_id}, chunks={ingestion.chunk_count}, actions={ingestion.action_item_count}")
            print(f"       ✓ Markdown: {len(markdown)} chars → {md_file.name}")

            results.append({
                "transcript_id": transcript_id,
                "title": title,
                "sentences": len(sentences),
                "ai_filter_sentences": sentences_with_filters,
                "chunks": ingestion.chunk_count,
                "document_id": ingestion.document_id,
                "status": "ok",
            })
            processed += 1

        except Exception as exc:
            print(f"       ✗ ERROR: {exc}")
            results.append({
                "transcript_id": transcript_id,
                "title": title,
                "status": "error",
                "error": str(exc),
            })
            errors += 1

    # Summary
    print(f"\n{'='*60}")
    print(f"  RESULTS")
    print(f"  Processed: {processed}")
    print(f"  Skipped:   {skipped}")
    print(f"  Errors:    {errors}")
    print(f"  Output:    {output_dir}")
    print(f"{'='*60}\n")

    # Write results JSON
    results_file = output_dir / "_resync_results.json"
    results_file.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"Results written to: {results_file}")

    # Show ai_filters stats
    total_ai_sentences = sum(r.get("ai_filter_sentences", 0) for r in results if r.get("status") == "ok")
    total_sentences = sum(r.get("sentences", 0) for r in results if r.get("status") == "ok")
    if total_sentences > 0:
        print(f"\nAI Filter coverage: {total_ai_sentences}/{total_sentences} sentences ({100*total_ai_sentences/total_sentences:.1f}%)")

    if errors > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
