#!/usr/bin/env python3
"""
Backfill script for document_metadata.summary_embedding

Generates embeddings for meetings that have a summary/overview but are missing
their summary_embedding. Uses text-embedding-3-large (3072 dimensions) to match
the embedder worker.

Usage:
    python src/scripts/backfill_meeting_summary_embeddings.py [--batch-size 20] [--limit 100] [--dry-run]

Options:
    --batch-size    Number of meetings to process per batch (default: 20)
    --limit         Maximum number of meetings to process (default: all)
    --dry-run       Show what would be done without making changes
"""

import argparse
import os
import sys
import time
from pathlib import Path
from typing import List, Dict, Any, Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Load env from root directory
from dotenv import load_dotenv
root_dir = Path(__file__).parent.parent.parent.parent
env_path = root_dir / '.env'
if not env_path.exists():
    env_path = root_dir / '.env.local'
load_dotenv(env_path)

from openai import OpenAI
from supabase import create_client, Client

EMBEDDING_MODEL = "text-embedding-3-large"
EMBEDDING_DIMENSIONS = 3072


def get_supabase_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
    return create_client(url, key)


def get_openai_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is required")
    return OpenAI(api_key=api_key)


def fetch_meetings_without_embeddings(
    supabase: Client,
    limit: int = 20,
    offset: int = 0,
) -> List[Dict[str, Any]]:
    """Fetch document_metadata rows missing summary_embedding."""
    result = (
        supabase.table('document_metadata')
        .select('id, title, date, summary, overview')
        .is_('summary_embedding', 'null')
        .order('date', desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    # Filter to rows that actually have text to embed
    return [
        r for r in (result.data or [])
        if (r.get('summary') or r.get('overview') or '').strip()
    ]


def count_meetings_without_embeddings(supabase: Client) -> int:
    result = (
        supabase.table('document_metadata')
        .select('id', count='exact')
        .is_('summary_embedding', 'null')
        .limit(0)
        .execute()
    )
    return result.count or 0


def get_embedding_text(meeting: Dict[str, Any]) -> str:
    """Build text to embed from summary/overview."""
    title = meeting.get('title') or ''
    date = meeting.get('date') or ''
    summary = meeting.get('summary') or meeting.get('overview') or ''

    parts = []
    if title:
        parts.append(f"Meeting: {title}")
    if date:
        parts.append(f"Date: {date}")
    if summary:
        parts.append(summary)

    return "\n".join(parts)


def generate_embeddings(
    openai_client: OpenAI,
    texts: List[str],
) -> List[List[float]]:
    """Generate 3072-dim embeddings for a list of texts."""
    if not texts:
        return []

    response = openai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        dimensions=EMBEDDING_DIMENSIONS,
        input=texts,
    )

    result: List[List[float]] = [[] for _ in texts]
    for item in response.data:
        result[item.index] = item.embedding

    return result


def backfill(
    batch_size: int = 20,
    limit: Optional[int] = None,
    dry_run: bool = False,
) -> Dict[str, int]:
    supabase = get_supabase_client()
    openai_client = get_openai_client()

    total_missing = count_meetings_without_embeddings(supabase)
    total_to_process = min(limit, total_missing) if limit else total_missing

    print(f"\n{'='*60}")
    print(f"Meeting Summary Embedding Backfill")
    print(f"{'='*60}")
    print(f"Total meetings missing summary_embedding: {total_missing}")
    print(f"Meetings to process this run: {total_to_process}")
    print(f"Batch size: {batch_size}")
    print(f"Model: {EMBEDDING_MODEL} ({EMBEDDING_DIMENSIONS} dimensions)")
    if dry_run:
        print(f"MODE: DRY RUN (no changes will be made)")
    print(f"{'='*60}\n")

    if total_to_process == 0:
        print("No meetings need summary_embedding backfill!")
        return {'processed': 0, 'success': 0, 'failed': 0}

    stats = {'processed': 0, 'success': 0, 'failed': 0}
    batch_num = 0

    while stats['processed'] < total_to_process:
        batch_num += 1
        current_batch_size = min(batch_size, total_to_process - stats['processed'])

        print(f"Batch {batch_num}: Fetching up to {current_batch_size} meetings...")
        meetings = fetch_meetings_without_embeddings(
            supabase,
            limit=current_batch_size,
            offset=0,  # Always 0 since we update as we go
        )

        if not meetings:
            print("  No more meetings to process.")
            break

        texts = [get_embedding_text(m) for m in meetings]

        if dry_run:
            print(f"  [DRY RUN] Would generate {len(texts)} embeddings")
            for m, text in zip(meetings[:3], texts[:3]):
                preview = text[:100] + "..." if len(text) > 100 else text
                print(f"    - {m['id']}: {preview}")
            if len(meetings) > 3:
                print(f"    ... and {len(meetings) - 3} more")
            stats['processed'] += len(meetings)
            stats['success'] += len(meetings)
            continue

        # Generate embeddings
        print(f"  Generating {len(texts)} embeddings...")
        start_time = time.time()
        try:
            embeddings = generate_embeddings(openai_client, texts)
            elapsed = time.time() - start_time
            print(f"  Embeddings generated in {elapsed:.2f}s")
        except Exception as e:
            print(f"  ERROR generating embeddings: {e}")
            stats['failed'] += len(meetings)
            stats['processed'] += len(meetings)
            continue

        # Update database
        for meeting, embedding in zip(meetings, embeddings):
            if not embedding:
                stats['failed'] += 1
                continue
            try:
                supabase.table('document_metadata').update({
                    'summary_embedding': embedding,
                }).eq('id', meeting['id']).execute()
                stats['success'] += 1
            except Exception as e:
                print(f"  Error updating {meeting['id']}: {e}")
                stats['failed'] += 1

        stats['processed'] += len(meetings)
        pct = 100 * stats['processed'] / total_to_process
        print(f"  Batch {batch_num} complete: {stats['success']} total successes so far")
        print(f"  Progress: {stats['processed']}/{total_to_process} ({pct:.1f}%)")

        if stats['processed'] < total_to_process:
            time.sleep(0.5)

    print(f"\n{'='*60}")
    print(f"Backfill Complete")
    print(f"{'='*60}")
    print(f"Processed: {stats['processed']}")
    print(f"Success:   {stats['success']}")
    print(f"Failed:    {stats['failed']}")
    print(f"{'='*60}\n")

    return stats


def main():
    parser = argparse.ArgumentParser(
        description="Backfill document_metadata.summary_embedding with OpenAI embeddings"
    )
    parser.add_argument('--batch-size', type=int, default=20)
    parser.add_argument('--limit', type=int, default=None)
    parser.add_argument('--dry-run', action='store_true')

    args = parser.parse_args()

    try:
        stats = backfill(
            batch_size=args.batch_size,
            limit=args.limit,
            dry_run=args.dry_run,
        )
        if stats['failed'] > 0:
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\nFATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
