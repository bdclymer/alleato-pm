# Codex Task: AI Knowledge Base + "I Don't Know" Reflex

## Metadata

- Feature: ai-knowledge-base
- Priority: HIGH
- Estimated Complexity: MEDIUM
- Dependencies: existing RAG pipeline, `frontend/src/lib/ai/rag-assistant-prompt.ts`

## Inputs

- Spec: `docs/ai-plan/AI_KNOWLEDGE_BASE.md`
- Persona spec: `docs/ai-plan/AI_PERSONA_AND_MEMORY.md` (the "I don't know" reflex section)
- Existing RAG infra: locate via `rg "rag" frontend/src/lib/ai`
- Existing soul/identity: `frontend/src/lib/ai/soul.ts`, `frontend/src/lib/ai/identity.ts`

## Success Criteria

- [ ] `docs/ai-plan/AI_KNOWLEDGE_BASE.md` is loaded into the RAG corpus alongside project data, chunked by `###` heading
- [ ] Each chunk is embedded and retrievable by user query similarity
- [ ] System prompt assembly retrieves top-k KB chunks and injects them as `<knowledge_base>` block
- [ ] The "I don't know" reflex paragraph from `AI_PERSONA_AND_MEMORY.md` is present verbatim in the system prompt
- [ ] When the AI answers "I don't know" or equivalent, an event is logged to a new `ai_unknown_questions` table with the user's question, conversation context, and timestamp
- [ ] Admin dashboard at `/admin/ai/knowledge-gaps` shows:
  - Top 20 most-asked unknown questions in last 7/30 days
  - Click-through to the conversation context
  - "Mark as answered" action (links to a KB section once answered)
- [ ] CI check verifies that `AI_KNOWLEDGE_BASE.md` parses as valid markdown with all `###` headings being valid retrievable chunks
- [ ] Re-indexing happens automatically on commits that change `docs/ai-plan/AI_KNOWLEDGE_BASE.md` (GitHub Action or Vercel build hook)
- [ ] Megan and Brandon are listed as CODEOWNERS of `docs/ai-plan/AI_KNOWLEDGE_BASE.md`
- [ ] Markers `[VERIFY: Brandon]`, `[FILL]`, `[CHECK]` are flagged in PR review — a script counts them and blocks deploy if any are present in production
- [ ] Quality gate passes (0 errors)

## Workflow

1. PATTERNS: Read `.agents/patterns/index.json` and any existing RAG ingestion patterns. Look at how meeting transcripts are chunked and embedded — replicate that pipeline for the KB.
2. RESEARCH: Audit current RAG retrieval. Find where queries hit the vector store. Identify where to inject KB retrieval into the existing flow without adding latency.
3. PLAN: Create `docs/ai-plan/AI-KNOWLEDGE-BASE-PLAN.md`.
4. INGESTION: Build a script `scripts/ingest-knowledge-base.ts` that:
   - Reads `docs/ai-plan/AI_KNOWLEDGE_BASE.md`
   - Splits by `###` heading
   - Embeds each chunk
   - Upserts into a `kb_chunks` Supabase table (with content, embedding, source_section)
   - Idempotent — running it twice produces the same state
5. RETRIEVAL: Add KB retrieval to the system prompt assembly. Top-k by query similarity. 1500-token budget for the KB block.
6. PROMPT WIRING: Add the verbatim "I don't know" reflex paragraph to `rag-assistant-prompt.ts`. Position it AFTER the persona/identity blocks but BEFORE the retrieved data, so it carries forward through every response.
7. UNKNOWN-QUESTION LOGGING: Add a small classifier that detects "I don't know"-style responses (model-side via response inspection, or prompt-side via a structured tag). Log to `ai_unknown_questions` table.
8. ADMIN DASHBOARD: Build the knowledge-gaps view at `/admin/ai/knowledge-gaps`.
9. CI HOOKS: Add GitHub Action that re-runs ingestion when KB markdown changes. Add a deploy-blocking check for unresolved `[FILL]`/`[VERIFY]`/`[CHECK]` markers in the production branch.
10. CODEOWNERS: Update `.github/CODEOWNERS` so Megan and Brandon must approve KB changes.
11. TEST: E2E that asks a known KB question and verifies the response uses KB content. E2E that asks an unknown question and verifies the response says "I don't know" + logs the event.
12. VERIFY: `npx tsx .agents/tools/enforce-gates.ts ai-knowledge-base`.
13. PR: Screenshots of the knowledge-gaps dashboard, sample before/after AI responses.

## Constraints (MANDATORY)

- The "I don't know" reflex must be the SINGLE highest-priority rule in the prompt. Position it so it cannot be overridden by retrieved data or user instruction
- Must NOT fabricate KB content — if a section is `[FILL]`, the AI must say "I don't have that yet" rather than hallucinate
- Must NOT block deploy on `[FILL]` markers in feature branches — only in the production branch
- Must NOT remove existing RAG functionality — KB retrieval is additive
- Must keep KB retrieval cheap — embedding similarity only, no separate LLM call

## Gates

| Gate | Command | Must Pass |
|---|---|---|
| Patterns | Read `.agents/patterns/index.json` | Applied |
| TypeScript | `npm run typecheck --prefix frontend` | 0 errors |
| ESLint | `npm run lint --prefix frontend` | 0 errors |
| Ingestion script | `tsx scripts/ingest-knowledge-base.ts --dry-run` | Clean parse |
| KB markers | `tsx scripts/check-kb-markers.ts` | 0 unresolved on main |
| Tests | `npx playwright test tests/e2e/ai-knowledge*.spec.ts` | 100% |
| Gates | `npx tsx .agents/tools/enforce-gates.ts ai-knowledge-base` | All PASSED |

## Deliverables

### Database

- [ ] Migration: `kb_chunks` table (content text, embedding vector, source_section text, updated_at)
- [ ] Migration: `ai_unknown_questions` table (id, user_id, question, conversation_id, response_excerpt, resolved_at, resolved_to_kb_section, created_at)
- [ ] Types regenerated

### Scripts

- [ ] `scripts/ingest-knowledge-base.ts` — idempotent KB ingestion
- [ ] `scripts/check-kb-markers.ts` — fails on unresolved markers
- [ ] `.github/workflows/kb-reindex.yml` — auto-reindex on KB changes

### Backend

- [ ] `frontend/src/lib/ai/kb-retrieval.ts` — top-k retrieval from kb_chunks
- [ ] `frontend/src/lib/ai/rag-assistant-prompt.ts` updated with KB block + "I don't know" reflex
- [ ] `frontend/src/lib/ai/unknown-question-logger.ts` — logs "I don't know" responses

### Admin UI

- [ ] `frontend/src/app/(admin)/admin/ai/knowledge-gaps/page.tsx`
- [ ] `frontend/src/components/admin/knowledge-gaps-table.tsx`

### Tests

- [ ] `frontend/tests/e2e/ai-knowledge-base.spec.ts` — known question returns KB-grounded answer
- [ ] `frontend/tests/e2e/ai-i-dont-know.spec.ts` — unknown question triggers reflex + logs event
- [ ] Unit tests on the ingestion chunking logic

### Documentation

- [ ] `docs/ai-plan/AI-KNOWLEDGE-BASE-PLAN.md`
- [ ] `docs/ai-plan/TASKS.md` updated
- [ ] `docs/ai-plan/GATES.md`
- [ ] `.github/CODEOWNERS` updated

## Completion Evidence

```markdown
## Completion Report
- Feature: ai-knowledge-base
- Date: [timestamp]
- PR: [link]

### Gates
| Gate | Status | Checksum | Timestamp |
|---|---|---|---|
| TypeScript | PASSED | [xxxx] | [timestamp] |
| ESLint | PASSED | [xxxx] | [timestamp] |
| KB markers | PASSED | [xxxx] | [timestamp] |
| E2E | PASSED | [xxxx] | [timestamp] |

### Examples
- Known question (with KB hit): [link to test output]
- Unknown question (triggering reflex + log): [link to test output]
- Knowledge gaps dashboard: [link]

### Loom
[link]
```
