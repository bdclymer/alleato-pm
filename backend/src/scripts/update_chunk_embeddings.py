#!/usr/bin/env python3
"""Update existing chunks with embeddings"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from typing import List

# Load environment variables
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

from ingestion.fireflies_pipeline import EmbeddingGenerator
from supabase_helpers import SupabaseRagStore, get_supabase_client

def update_embeddings():
    print("Updating chunk embeddings with text-embedding-3-small (1536 dimensions)...")
    print("NOTE: This script only updates vectors in document_chunks.")
    print("      It does NOT refresh transcript markdown/content from Fireflies.")
    
    # Create clients
    client = get_supabase_client()
    rag_store = SupabaseRagStore(client)
    embedder = EmbeddingGenerator(model="text-embedding-3-small")
    
    # Get all chunks without embeddings
    print("\nFetching chunks without embeddings...")
    
    # First get a count
    all_chunks = client.table("document_chunks").select("chunk_id").execute()
    total_chunks = len(all_chunks.data)
    print(f"Total chunks in database: {total_chunks}")
    
    # Get chunks without embeddings (or with old embeddings)
    chunks_to_update = client.table("document_chunks")\
        .select("chunk_id, text")\
        .is_("embedding", "null")\
        .execute()
    
    if not chunks_to_update.data:
        # Try getting all chunks to re-embed them
        print("No chunks with null embeddings found. Getting all chunks to re-embed...")
        chunks_to_update = client.table("document_chunks")\
            .select("chunk_id, text")\
            .limit(500)\
            .execute()
    
    chunks = chunks_to_update.data
    print(f"Found {len(chunks)} chunks to update")
    
    if not chunks:
        print("No chunks to update!")
        return
    
    # Process in batches
    batch_size = 20
    total_updated = 0
    
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        print(f"\nProcessing batch {i//batch_size + 1} ({i+1}-{min(i+batch_size, len(chunks))} of {len(chunks)})")
        
        try:
            # Extract texts
            texts = [chunk['text'] for chunk in batch]
            chunk_ids = [chunk['chunk_id'] for chunk in batch]
            
            # Generate embeddings
            print(f"  Generating embeddings for {len(texts)} chunks...")
            embeddings = embedder.embed(texts)
            
            # Update each chunk
            for chunk_id, embedding in zip(chunk_ids, embeddings):
                try:
                    # Update the chunk with embedding
                    result = client.table("document_chunks")\
                        .update({"embedding": embedding})\
                        .eq("chunk_id", chunk_id)\
                        .execute()
                    
                    if result.data:
                        total_updated += 1
                    
                except Exception as e:
                    print(f"  Error updating chunk {chunk_id}: {e}")
            
            print(f"  ✓ Updated {len(batch)} chunks")
            
        except Exception as e:
            print(f"  ✗ Error processing batch: {e}")
            import traceback
            traceback.print_exc()
    
    print(f"\n{'='*50}")
    print(f"Update complete!")
    print(f"Total chunks updated: {total_updated}")
    print('='*50)
    
    # Test vector search
    print("\nTesting vector search...")
    test_query = "NFPA requirements for rack heights"
    
    try:
        # Generate embedding for test query
        query_embedding = embedder.embed([test_query])[0]
        
        # Try vector search using RPC
        results = client.rpc('match_document_chunks', {
            'query_embedding': query_embedding,
            'match_count': 3,
            'match_threshold': 0.3
        }).execute()
        
        if results.data:
            print(f"✓ Vector search working! Found {len(results.data)} results for '{test_query}'")
            for i, result in enumerate(results.data[:2], 1):
                print(f"\n  Result {i} (similarity: {result['similarity']:.3f}):")
                print(f"    {result['text'][:150]}...")
        else:
            print("✗ Vector search returned no results")
            
    except Exception as e:
        print(f"✗ Vector search error: {e}")

if __name__ == "__main__":
    update_embeddings()
