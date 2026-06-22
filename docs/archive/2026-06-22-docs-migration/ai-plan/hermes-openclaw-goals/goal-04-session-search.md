# Goal 4 - Session Search

## Outcome

Alleato can recall relevant prior assistant conversations through a scoped `searchPastConversations` tool using Postgres full-text search over `chat_history`, with anchored context windows and session bookends inspired by Hermes.

## Source Material

ADAPT source:

- `hermes-agent/tools/session_search_tool.py`
- `hermes-agent/hermes_state.py`
- `hermes-agent/tests/test_hermes_state.py`

Alleato target/current files:

- `supabase/migrations/<timestamp>_search_chat_history.sql` (PM app database)
- `frontend/src/types/database.types.ts`
- `frontend/src/lib/ai/tools/search-past-conversations.ts` (new)
- `frontend/src/lib/ai/tool-registry.ts`
- Chat context assembly and daily-brief context assembly files discovered before implementation.
- `docs/architecture/tables.yaml`

## Acceptance Criteria

- `chat_history` search uses Postgres `tsvector` and `pg_trgm`, not document RAG tables.
- `search_chat_history` RPC scopes by authenticated user/team/project rules.
- Results dedupe by session or lineage root.
- Each hit expands to an anchored neighboring message window plus first/last session bookends.
- Zero results return a loud-empty typed result, not an exception or silent absence.
- The tool is registered in the governed AI tool registry.
- Daily brief context can opt into session recall without mixing it into `document_chunks`.

## Database Gate

Before writing database code:

```bash
npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > frontend/src/types/database.types.ts
```

After migration work:

```bash
npm run db:migrations:verify-applied -- supabase/migrations/<timestamp>_search_chat_history.sql
```

Also update `docs/architecture/tables.yaml` and run `npm run db:inventory`.

## Failure-Loudly Behavior

- Missing permissions return a scoped authorization error.
- Empty search returns a typed empty result with the query and scope.
- RPC shape drift fails tests and generated types.

## Verification

Main-thread targeted checks:

- RPC/unit tests for anchored window correctness.
- Tests for session dedupe.
- Tests for RLS/scoping.
- Tool registry verification.

Delegated verification:

- `npm run quality`
- Any broader AI assistant eval if session recall is injected into generation context.

## Archive/Deletion Rule

This is a new capability. Do not route conversation recall through document RAG or archive document retrieval code.
