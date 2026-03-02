#!/usr/bin/env python3
"""Process existing documents in Supabase to create embeddings and chunks"""

import os
import sys
from pathlib import Path

# Add parent directories to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))  # src/workers
sys.path.insert(0, str(Path(__file__).parent.parent.parent))  # src

# Load environment variables from root
from services.env_loader import load_env
load_env()

from services.supabase_helpers import SupabaseRagStore, get_supabase_client, DocumentChunk
from services.ingestion.fireflies_pipeline import ParsedTranscript, TranscriptSegment
import hashlib

# Try to import OpenAI for embeddings
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    print("Warning: OpenAI not available, will create chunks without embeddings")
    OPENAI_AVAILABLE = False

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> list[str]:
    """Split text into overlapping chunks."""
    words = text.split()
    chunks = []
    
    for i in range(0, len(words), chunk_size - overlap):
        chunk = ' '.join(words[i:i + chunk_size])
        if chunk:
            chunks.append(chunk)
    
    return chunks

def create_embedding(text: str, client) -> list[float]:
    """Create embedding for text using OpenAI."""
    try:
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"Error creating embedding: {e}")
        return None

def process_documents():
    print("Processing existing documents in Supabase...")
    
    # Initialize clients
    rag_store = SupabaseRagStore()
    client = get_supabase_client()
    
    # Initialize OpenAI if available
    openai_client = None
    if OPENAI_AVAILABLE and os.getenv('OPENAI_API_KEY'):
        openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        print("✓ OpenAI client initialized for embeddings")
    
    # Fetch unprocessed meeting documents (max 50, skip already embedded)
    result = (
        client.table('document_metadata')
        .select('*')
        .eq('type', 'meeting')
        .not_.in_('status', ['embedded', 'done'])
        .limit(50)
        .execute()
    )
    documents = result.data or []

    print(f"Found {len(documents)} unembedded meeting documents (max 50)")
    
    for i, doc in enumerate(documents, 1):
        doc_id = doc['id']
        title = doc.get('title', 'Untitled')
        content = doc.get('content', '')
        
        print(f"\n[{i}/{len(documents)}] Processing: {title}")
        
        # Check if already processed
        existing_chunks = client.table('document_chunks').select('chunk_id').eq('document_id', doc_id).limit(1).execute()
        if existing_chunks.data:
            print(f"  ⚠️  Already has chunks, skipping...")
            continue
        
        if not content or len(content) < 50:
            print(f"  ⚠️  Content too short, skipping...")
            continue
        
        # Create chunks
        text_chunks = chunk_text(content)
        print(f"  Created {len(text_chunks)} chunks")
        
        # Create DocumentChunk objects
        chunks_to_insert = []
        for chunk_index, chunk_content in enumerate(text_chunks):
            chunk_hash = hashlib.sha256(f"{doc_id}:{chunk_index}:{chunk_content}".encode()).hexdigest()
            
            # Create embedding if OpenAI is available
            embedding = None
            if openai_client:
                embedding = create_embedding(chunk_content, openai_client)
            
            chunk = DocumentChunk(
                document_id=doc_id,
                chunk_index=chunk_index,
                chunk_id=f"{doc_id}-{chunk_index}",
                text=chunk_content,
                metadata={
                    'title': title,
                    'date': doc.get('date'),
                    'participants': doc.get('participants'),
                    'project_id': doc.get('project_id'),
                    'fireflies_id': doc.get('fireflies_id')
                },
                embedding=embedding,
                content_hash=chunk_hash
            )
            chunks_to_insert.append(chunk)
        
        # Insert chunks
        try:
            rag_store.upsert_chunks(chunks_to_insert)
            print(f"  ✓ Inserted {len(chunks_to_insert)} chunks")
        except Exception as e:
            print(f"  ✗ Error inserting chunks: {e}")
    
    # Verify results
    print("\n" + "="*50)
    print("Verification:")
    print("="*50)
    
    # Check total chunks
    result = client.table('document_chunks').select('*', count='exact').execute()
    total_chunks = result.count if hasattr(result, 'count') else 0
    print(f"Total chunks in database: {total_chunks}")
    
    # Get sample chunk
    sample = rag_store.fetch_recent_chunks(limit=1)
    if sample:
        print(f"\nSample chunk:")
        print(f"  Document: {sample[0].get('metadata', {}).get('title', 'N/A')}")
        print(f"  Text: {sample[0]['text'][:150]}...")
        print(f"  Has embedding: {'Yes' if sample[0].get('embedding') else 'No'}")

if __name__ == "__main__":
    process_documents()