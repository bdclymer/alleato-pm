# RAG Pipeline Docs

Core docs in this folder:

1. [`rag-pipeline.md`](./rag-pipeline.md) — authoritative runbook for:
   - Fireflies sync
   - RAG ingestion/pipeline stages
   - Chunking + extraction strategy
   - AI assistant agents/prompts/tools wiring
   - Conversation memory
   - Known quality failure modes and fixes
2. `README.md` (this file) — index + maintenance expectations

Documentation policy:
- Keep [`rag-pipeline.md`](./rag-pipeline.md) aligned with runtime code in the same PR as behavioral changes.
- Use direct file links in docs so implementation can be verified quickly.
- Keep this folder limited to operational docs, not one-off test artifacts.
