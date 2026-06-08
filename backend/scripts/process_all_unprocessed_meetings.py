#!/usr/bin/env python3
"""
Process ALL unprocessed meetings with GPT-5.4 insight extraction.
Runs in batches to handle the large volume.
"""

import asyncio
import sys
import os

# Add paths for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'services'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'workers'))

# Load environment
from dotenv import load_dotenv
env_locations = [
    os.path.join(os.path.dirname(__file__), '..', '..', '.env'),
    os.path.join(os.path.dirname(__file__), '..', '..', '.env.local'),
]
for env_path in env_locations:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        print(f"Loaded env from: {env_path}")
        break

from supabase_helpers import get_supabase_client
from extract_meeting_insights import process_meeting

async def main():
    print("=" * 60)
    print("Processing ALL Unprocessed Meetings with GPT-5.4")
    print("=" * 60)
    
    client = get_supabase_client()
    
    # Get ALL processed meeting IDs first
    processed_ids = set()
    for table in ['risks', 'decisions', 'opportunities', 'tasks']:
        result = client.table(table).select('metadata_id').execute()
        for row in result.data:
            if row.get('metadata_id'):
                processed_ids.add(row['metadata_id'])
    
    print(f"Found {len(processed_ids)} meetings already processed")
    
    # Process in chunks to avoid loading too much at once
    batch_size = 10  # Start small for testing
    offset = 0
    total_processed = 0
    total_insights = {'risk': 0, 'decision': 0, 'opportunity': 0, 'task': 0}
    
    max_batches = 20  # Process more since we're filtering for substantial content
    batch_count = 0
    while batch_count < max_batches:
        # Get batch of meetings
        meetings_batch = client.table('document_metadata').select(
            'id, title, date, project_id, content, overview'
        ).not_.is_('content', 'null').order('date', desc=True).range(
            offset, offset + batch_size - 1
        ).execute()
        
        if not meetings_batch.data:
            print("No more meetings to process")
            break
        
        # Filter to unprocessed only AND substantial content (>3000 chars)
        unprocessed_batch = []
        for m in meetings_batch.data:
            if m['id'] not in processed_ids:
                content = m.get('content', '') or m.get('overview', '')
                if len(content) > 3000:  # Only process substantial meetings
                    unprocessed_batch.append(m)
        
        if not unprocessed_batch:
            print(f"Batch {offset}-{offset+batch_size}: All meetings already processed or lack substantial content")
            offset += batch_size
            batch_count += 1
            continue
        
        print(f"\n{'='*60}")
        print(f"Processing batch {offset}-{offset+batch_size}: {len(unprocessed_batch)} unprocessed meetings")
        print(f"{'='*60}")
        
        # Process each meeting in this batch
        for i, meeting in enumerate(unprocessed_batch):
            try:
                content_length = len(meeting.get('content', '') or meeting.get('overview', ''))
                print(f"[{i+1}/{len(unprocessed_batch)}] Processing: {meeting.get('title', 'Untitled')} ({content_length:,} chars)")
                counts = await process_meeting(client, meeting, dry_run=False, verbose=False)
                
                # Add to totals
                for key, value in counts.items():
                    total_insights[key] = total_insights.get(key, 0) + value
                    
                total_processed += 1
                
                # Mark as processed for future batches
                processed_ids.add(meeting['id'])
                
            except Exception as e:
                print(f"  ❌ Error processing meeting: {e}")
        
        # Move to next batch
        offset += batch_size
        batch_count += 1
        
        print(f"\nBatch complete. Total processed so far: {total_processed}")
        print(f"Running totals - R:{total_insights['risk']} D:{total_insights['decision']} O:{total_insights['opportunity']} T:{total_insights['task']}")
    
    # Final summary
    print("\n" + "=" * 60)
    print("FINAL SUMMARY")
    print("=" * 60)
    print(f"Total meetings processed: {total_processed}")
    print(f"Total insights extracted:")
    print(f"  - Risks: {total_insights['risk']}")
    print(f"  - Decisions: {total_insights['decision']}")
    print(f"  - Opportunities: {total_insights['opportunity']}")
    print(f"  - Tasks: {total_insights['task']}")
    print(f"  - Grand total: {sum(total_insights.values())}")
    print(f"\nAll meetings processed with GPT-5.4!")

if __name__ == '__main__':
    asyncio.run(main())