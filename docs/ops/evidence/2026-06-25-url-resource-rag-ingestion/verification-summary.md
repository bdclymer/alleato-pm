# URL Resource RAG Ingestion Verification

Date: 2026-06-25
Task: `docs/ops/tasks/2026-06-25-url-resource-rag-ingestion.md`
Linear: `AAI-631`

## Commands

### Focused unit verification

```bash
PYTHONPATH=/Users/meganharrison/Documents/alleato-pm/backend \
  pytest --noconftest backend/tests/test_url_resource_ingestion.py -q
```

Result: `3 passed in 0.83s`

### Syntax validation

```bash
python -m py_compile \
  backend/src/services/url_resource_ingestion.py \
  backend/src/services/supabase_helpers.py \
  backend/src/api/main.py
```

Result: pass

### Live end-to-end proof

```bash
set -a && source .env && set +a && \
PYTHONPATH=/Users/meganharrison/Documents/alleato-pm/backend python - <<'PY'
from src.services.supabase_helpers import SupabaseRagStore
from src.services.pipeline import llm
from src.services.url_resource_ingestion import UrlResourceIngestionService

url = 'https://www.python.org/about/'
service = UrlResourceIngestionService()
doc_id = service._document_id(service._normalize_url(url), None)
store = SupabaseRagStore()
meta = store.fetch_rag_document_metadata(doc_id) or {}
chunks = store.query_chunks({'document_id': doc_id}, limit=25)
query_embedding = llm.batch_embed(['Python Software Foundation about page'])[0]
vector_hits = [
    row for row in store.vector_search_documents(query_embedding=query_embedding, limit=10)
    if row.get('document_id') == doc_id
]
print({
    'document_id': doc_id,
    'metadata_category': meta.get('category'),
    'metadata_type': meta.get('type'),
    'stored_url': meta.get('url'),
    'stored_source_web_url': meta.get('source_web_url'),
    'metadata_hash': meta.get('content_hash'),
    'chunk_count': len(chunks),
    'vector_hit_count': len(vector_hits),
})
PY
```

Observed result:

```text
{
  'document_id': 'web_resource_ab37721e-df7e-598c-80ac-9b1e27a4a97f',
  'metadata_category': 'resource',
  'metadata_type': 'web_page',
  'stored_url': 'https://www.python.org/about/',
  'stored_source_web_url': 'https://www.python.org/about/',
  'metadata_hash': 'a4ca72b4c477aa1bdb74ca687d6591a5ee326beb072c666ab8606ef0e05c2a81',
  'chunk_count': 19,
  'vector_hit_count': 6
}
```

## Unrelated / Existing Repo Debt Found During Verification

- `search_chunks_by_keyword('Python Software Foundation')` timed out on live `document_chunks` with Postgres error `57014 canceling statement due to statement timeout`. The new URL ingestion path still completed, and vector search/read-back succeeded.
- Importing the full FastAPI app under `backend/tests/conftest.py` requires `python-multipart` because existing schedule-upload routes use `File(...)`. That prevented running the new API-route test through the repo’s normal backend app fixture in this environment, so focused verification used direct service tests plus live DB read-back instead.
