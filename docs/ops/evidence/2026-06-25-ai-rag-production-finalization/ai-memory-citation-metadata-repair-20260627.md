# AI Memory Citation Metadata Repair

Date: 2026-06-27

## Summary

The compact final verifier refresh found a real RAG retrieval-contract failure:
AI memory chunks could be retrieved but did not have corresponding
`rag_document_metadata` rows, so citation/reference metadata was missing.

## Root Cause

`frontend/src/lib/ai/services/ai-memory-service.ts` wrote AI memory embeddings
directly to the RAG `document_chunks` table, but did not create or update the
matching `rag_document_metadata` record. Retrieval could therefore return
AI memory source chunks with no title or reference URL.

Failing verifier evidence:

```text
npm run rag:verify:retrieval-contract
```

Failure class:

```json
{
  "chunk_id": "ai_memory_bb4b0ddb-b2be-4bd5-8116-961917615b0d",
  "document_id": "bb4b0ddb-b2be-4bd5-8116-961917615b0d",
  "doc_title": null
}
```

## Fix

`syncMemoryChunkToAiDb()` now upserts `rag_document_metadata` before writing
the AI memory chunk. The metadata row includes:

- stable document id and source item id;
- `source` and `source_system` set to AI memory;
- project id when present;
- display title;
- reference path `/settings/memory?memoryId=<id>`;
- content length and processing metadata;
- embedded status.

The write remains fail-loud: if metadata sync fails, memory chunk sync throws
instead of silently creating an uncitable chunk.

## Data Repair

Existing AI memory chunks without citation metadata were backfilled in the RAG
database.

```json
{
  "before": 26415,
  "repaired": 26415,
  "after": 0
}
```

## Guardrails

Focused unit coverage now asserts that memory creation writes both:

- `rag_document_metadata`
- `document_chunks`

Verification:

```text
cd frontend && npm run test:unit -- --runTestsByPath src/lib/ai/services/__tests__/ai-memory-service.test.ts --runInBand
PASS: 6/6

cd frontend && npm run typecheck:changed -- src/lib/ai/services/ai-memory-service.ts src/lib/ai/services/__tests__/ai-memory-service.test.ts
PASS: delegated verifier, no new type debt detected

npm run rag:verify:retrieval-contract
PASS
```

## Prevention

AI memory is now treated like every other RAG source: chunks are not written
without source metadata capable of producing citations/reference links.
