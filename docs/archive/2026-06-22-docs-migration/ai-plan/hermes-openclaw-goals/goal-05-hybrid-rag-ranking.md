# Goal 5 - Hybrid RAG Ranking

## Outcome

Alleato document retrieval can compare and eventually use a hybrid ranking score that blends vector similarity, full-text score, recall frequency, and recency decay without regressing answer quality.

## Source Material

ADAPT source:

- `openclaw/extensions/memory-core/src/short-term-promotion.ts`
- `openclaw/extensions/memory-core/src/short-term-promotion.test.ts`
- `openclaw/packages/memory-host-sdk/src/host/types.ts`
- `openclaw/extensions/memory-core/src/memory/hybrid.ts`
- `openclaw/extensions/memory-core/src/memory/hybrid.test.ts`

Alleato target/current files:

- AI Database migration under the existing RAG migration path, discovered before implementation.
- `frontend/src/lib/ai/retrieval/retrieval-weight-scoring.ts`
- `frontend/src/lib/ai/retrieval/__tests__/retrieval-weight-scoring.test.ts`
- `docs/architecture/AI-RAG-ARCHITECTURE.md`
- `docs/architecture/tables.yaml`

## Acceptance Criteria

- The AI Database chunk store gains retrieval telemetry columns named recall count and last recalled at, or an equivalent normalized retrieval telemetry table if safer.
- `search_document_chunks` can return vector score and text score, or a clearly named hybrid score with score components.
- Hybrid ranking is flag-gated against existing pure-cosine behavior.
- A/B evaluation proves hybrid ranking is at least as good as current vector-only retrieval before default-on.
- Recall telemetry updates do not create hot-write contention or silently fail.
- Migration is reversible or has an explicit rollback plan.

## RAG Docs Gate

Update:

- `docs/architecture/AI-RAG-ARCHITECTURE.md`
- `docs/architecture/tables.yaml`

Run:

```bash
npm run db:inventory
```

Verify the AI Database migration ledger with the repo's RAG database migration process. Do not mark done if the migration is only local.

## Failure-Loudly Behavior

- If hybrid scoring cannot compute a component, the response reports degraded ranking mode instead of silently pretending hybrid was used.
- Eval failures keep the flag defaulted to pure-cosine.
- Migration/readback failure blocks closeout.

## Verification

Main-thread targeted checks:

- Unit tests for recency decay.
- Unit tests for score blending.
- Migration readback against AI Database.
- Retrieval eval comparing hybrid vs pure-cosine.

Delegated verification:

- `npm run quality`
- Longer eval-suite run if the targeted eval is not enough.

## Archive/Deletion Rule

Keep pure-cosine as a fallback behind the feature flag for one release. Delete or archive only after hybrid is proven in evals and production readback.
