# Codex Task: User Profiles + Conversation Memory

## Metadata

- Feature: user-profiles-memory
- Priority: HIGH
- Estimated Complexity: MEDIUM
- Dependencies: existing AI prompt assembly in `frontend/src/lib/ai/`, Supabase migration tooling

## Inputs

- Spec: `docs/ai-plan/AI_PERSONA_AND_MEMORY.md`
- Existing personalization config: `frontend/src/config/aiPersonalization.ts` (demo profiles — to be evolved into real profiles)
- Existing AI prompt assembly: `frontend/src/lib/ai/rag-assistant-prompt.ts`, `soul.ts`, `identity.ts`
- Sample profiles: `docs/ai-plan/AI_PERSONA_AND_MEMORY.md` (Brandon Collier, Jesse Lou)

## Success Criteria

- [ ] Supabase migration adds `public.user_profiles` and `public.conversation_memory` tables with RLS policies matching the spec
- [ ] Supabase types regenerated: `npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > frontend/src/types/database.types.ts`
- [ ] Brandon Collier and Jesse Lou seeded as real `user_profiles` rows (with placeholders Megan can fill in)
- [ ] System prompt assembly in `rag-assistant-prompt.ts` updated to:
  - Inject a `<user_profile>` block when the calling user has a profile
  - Inject a `<remembered_context>` block with top-k relevant memories + last N recent
  - Include the mandatory "I don't know" reflex paragraph
  - Gracefully omit blocks when data is missing (no empty tags)
- [ ] Conversation memory extraction job runs after each completed chat session, async, using the extraction prompt from the spec
- [ ] Admin UI at `/admin/users/[id]/profile` with three tabs:
  - **Profile**: editable structured fields (display_name, role, company, communication_style, pet_topics array, context_notes textarea)
  - **Memory**: list of extracted facts with delete and supersede actions
  - **Activity**: query count, "I don't know" count, top KB gaps for this user
- [ ] Admin UI gated to admin role only — non-admins routed to 403
- [ ] User-facing "clear my conversation memory" action available from settings
- [ ] All profile mutations write `updated_by = auth.uid()` for audit
- [ ] E2E tests cover: admin edits Brandon's profile → next AI call includes the updated `<user_profile>` block
- [ ] Memory retrieval has a graceful-degradation path: if Supabase is slow/unavailable, the chat completes without it
- [ ] Quality gate passes (0 errors)

## Workflow

1. PATTERNS: Read `.agents/patterns/index.json`. Specifically check existing admin route patterns and Supabase migration conventions.
2. RESEARCH: Audit the current chat backend to find every place the system prompt is assembled. The persona/memory injection must be added at every entry point — not just one.
3. PLAN: Create `docs/ai-plan/USER-PROFILES-MEMORY-PLAN.md`.
4. MIGRATE: Create the Supabase migration. Run it. Regenerate types.
5. SEED: Create a SQL or TypeScript seed for Brandon's and Jesse's profiles. Make it idempotent.
6. PROMPT WIRING: Update `rag-assistant-prompt.ts` (and any other entry points) to fetch and inject profile + memory. Use the format from the spec exactly.
7. EXTRACTION JOB: Implement the conversation memory extractor. Run it as a Supabase Edge Function or a server-side job after chat completion. Use the cheapest capable model — this is routine work, not frontier reasoning.
8. ADMIN UI: Build the three-tab editor. Use existing admin layout patterns.
9. SETTINGS UI: Add "Clear my conversation memory" to user settings.
10. TEST: E2E coverage on the admin edit → AI call round-trip. Unit tests on memory extraction.
11. VERIFY: `npx tsx .agents/tools/enforce-gates.ts user-profiles-memory`.
12. PR: Screenshots of admin UI, before/after of an AI response when profile is enriched.

## Constraints (MANDATORY)

- Must use the Supabase types from `frontend/src/types/database.types.ts` after regeneration — NEVER write inline types for these tables
- Must NOT inject empty `<user_profile>` or `<remembered_context>` blocks — omit entirely when data is missing
- Must NOT block the chat request waiting for memory retrieval — if memory call exceeds 200ms, proceed without it and log a warning
- Must NOT delete or overwrite Brandon's or Jesse's `context_notes` once Megan has populated them — admin UI updates must merge, not replace, when the field is empty in the form (use a "clear" explicit action instead)
- Must mark all RLS policies as enabled and test that a non-admin user cannot read another user's profile
- Must respect existing `aiPersonalization.ts` demo profiles — those serve a separate purpose (UI personalization for the old onboarding) and should remain functional during migration

## Gates

| Gate | Command | Must Pass |
|---|---|---|
| Patterns | Read `.agents/patterns/index.json` | Applied |
| TypeScript | `npm run typecheck --prefix frontend` | 0 errors |
| ESLint | `npm run lint --prefix frontend` | 0 errors |
| Migration | `supabase db diff --linked` | Clean |
| Types regenerated | Diff in database.types.ts | Present |
| Tests | `npx playwright test tests/e2e/user-profiles*.spec.ts` | 100% |
| RLS | Manual test as non-admin user | 403 on others' profiles |
| Gates | `npx tsx .agents/tools/enforce-gates.ts user-profiles-memory` | All PASSED |

## Deliverables

### Database

- [ ] `supabase/migrations/[timestamp]_user_profiles_and_memory.sql`
- [ ] `frontend/src/types/database.types.ts` regenerated
- [ ] Seed for Brandon Collier and Jesse Lou profiles

### Backend

- [ ] `frontend/src/lib/ai/profile-loader.ts` — fetches user_profile and conversation_memory for a user_id
- [ ] `frontend/src/lib/ai/memory-extractor.ts` — runs after each conversation
- [ ] `frontend/src/lib/ai/rag-assistant-prompt.ts` updated with profile + memory injection and "I don't know" reflex
- [ ] Supabase Edge Function or server route for the extraction job

### Admin UI

- [ ] `frontend/src/app/(admin)/admin/users/[userId]/profile/page.tsx`
- [ ] `frontend/src/components/admin/user-profile-editor.tsx`
- [ ] `frontend/src/components/admin/user-memory-viewer.tsx`
- [ ] `frontend/src/components/admin/user-ai-activity.tsx`

### User-facing

- [ ] "Clear conversation memory" action in user settings

### Tests

- [ ] `frontend/tests/e2e/user-profiles-admin.spec.ts`
- [ ] `frontend/tests/e2e/user-profiles-rls.spec.ts`
- [ ] `frontend/tests/e2e/ai-prompt-injection.spec.ts` — confirms profile is in the prompt
- [ ] Unit tests on memory extractor

### Documentation

- [ ] `docs/ai-plan/USER-PROFILES-MEMORY-PLAN.md`
- [ ] `docs/ai-plan/TASKS.md` updated
- [ ] `docs/ai-plan/GATES.md`

## Completion Evidence

```markdown
## Completion Report
- Feature: user-profiles-memory
- Date: [timestamp]
- PR: [link]

### Gates
| Gate | Status | Checksum | Timestamp |
|---|---|---|---|
| TypeScript | PASSED | [xxxx] | [timestamp] |
| ESLint | PASSED | [xxxx] | [timestamp] |
| RLS | PASSED | [xxxx] | [timestamp] |
| E2E | PASSED | [xxxx] | [timestamp] |

### Profile UI screenshots
- Profile tab: [link]
- Memory tab: [link]
- Activity tab: [link]

### Before/after AI response
- Without profile: [link]
- With Brandon's profile loaded: [link]

### Loom
[link]
```
