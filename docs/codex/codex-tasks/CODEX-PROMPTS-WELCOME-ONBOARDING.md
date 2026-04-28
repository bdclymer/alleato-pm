# Codex Prompts — Welcome Onboarding + AI Foundations

Copy/paste these prompts into Codex (CLI or GitHub Actions) in the order listed.
Each prompt references a task file already saved in `docs/codex/codex-tasks/`.
Codex should follow your existing AGENTS.md rules, gate enforcement, and Linear-Codex process automatically.

---

## Recommended order

1. **Welcome Onboarding** — pure UI, no backend dependencies. Ship-able in a day. Build confidence and unlock the rest.
2. **Ask Alleato Widget** — consolidates the existing feedback widget + RAG chat into the unified pill the onboarding teaches.
3. **AI Knowledge Base** — grounds the assistant so it stops fabricating. Required before the team logs in.
4. **User Profiles + Memory** — enables Brandon and Jesse personalization. Wow factor on top of a working foundation.

You can run #1 and #2 in parallel (different branches). #3 and #4 should follow #2 since both modify the same prompt assembly.

---

## Prompt 1 — Welcome Onboarding

Paste into Codex:

```
Implement the welcome onboarding modal per
docs/codex/codex-tasks/CODEX-TASK-WELCOME-ONBOARDING.md.

Read these inputs first:
- docs/codex/codex-tasks/CODEX-TASK-WELCOME-ONBOARDING.md
- docs/onboarding/WELCOME_ONBOARDING_SPEC.md
- docs/onboarding/WelcomeOnboarding.reference.tsx (reference only, do not import)
- frontend/src/components/onboarding/AlleatoAiOnboarding.tsx (existing — to deprecate)
- frontend/src/config/aiPersonalization.ts (existing — keep functional)
- frontend/src/lib/alleato-ai-onboarding.ts (existing — may inform Step 2 personalization)
- AGENTS.md
- .agents/patterns/index.json

Follow the workflow, constraints, gates, and deliverables in the task file
exactly. Create the Linear issue first per the Linear-Codex process. Use the
worker-handoff template. Do not claim complete without GATES.md checksums.

Hard reminders:
- Use auth fixture for E2E tests
- Use waitForLoadState('domcontentloaded') not networkidle
- Step 1 copy must come from a single source of truth module (lib/onboarding/copy.ts)
- The existing AlleatoAiOnboarding.tsx must be removed or archived — no two onboarding flows
- Storage key is alleato_onboarding_completed_v3
```

---

## Prompt 2 — Ask Alleato Widget

Paste into Codex:

```
Implement the unified Ask Alleato widget per
docs/codex/codex-tasks/CODEX-TASK-ASK-ALLEATO-WIDGET.md.

Read these inputs first:
- docs/codex/codex-tasks/CODEX-TASK-ASK-ALLEATO-WIDGET.md
- docs/onboarding/WELCOME_ONBOARDING_SPEC.md (Step 3 section)
- docs/onboarding/WelcomeOnboarding.reference.tsx (the AskAlleatoPill section)
- frontend/src/components/admin-feedback/AdminFeedbackWidget.tsx (existing — to consolidate)
- frontend/src/components/ai-assistant/rag-chat-page.tsx (existing — backend to reuse)
- frontend/src/lib/ai/rag-assistant-prompt.ts (the prompt assembly entry point)
- AGENTS.md
- .agents/patterns/index.json

Follow the workflow, constraints, gates, and deliverables in the task file
exactly. Create the Linear issue first.

Critical:
- Reuse the existing RAG chat backend. Do NOT spin up a new chat endpoint.
- Reuse the existing feedback submission API. Do NOT duplicate the table.
- Map Bug→Issue, Idea→Wishlist, Confused→General thought (existing feedback type strings).
- Cmd+I shortcut stays in code, not surfaced visually.
- Pill is hidden on auth routes and while the welcome onboarding modal is open.
- Preserve AdminFeedbackWidget's screenshot/snapshot/targeting helpers — port them into the new widget.
```

---

## Prompt 3 — AI Knowledge Base + "I don't know" reflex

Paste into Codex:

```
Implement the AI knowledge base ingestion, retrieval, and "I don't know"
reflex per docs/codex/codex-tasks/CODEX-TASK-AI-KNOWLEDGE-BASE.md.

Read these inputs first:
- docs/codex/codex-tasks/CODEX-TASK-AI-KNOWLEDGE-BASE.md
- docs/ai-plan/AI_KNOWLEDGE_BASE.md (the corpus to ingest)
- docs/ai-plan/AI_PERSONA_AND_MEMORY.md (the "I don't know" reflex paragraph)
- frontend/src/lib/ai/rag-assistant-prompt.ts
- frontend/src/lib/ai/soul.ts
- frontend/src/lib/ai/identity.ts
- AGENTS.md
- .agents/patterns/index.json

Follow the workflow, constraints, gates, and deliverables in the task file
exactly. Create the Linear issue first.

Critical:
- The "I don't know" reflex paragraph must be in the system prompt verbatim — copy it exactly from AI_PERSONA_AND_MEMORY.md.
- Position it AFTER persona/identity, BEFORE retrieved data.
- Do NOT fabricate KB content. [FILL]/[VERIFY]/[CHECK] markers stay as-is — Megan and Brandon will fill them.
- Add a deploy-blocking CI check for unresolved markers on the production branch only.
- Set Megan and Brandon as CODEOWNERS of docs/ai-plan/AI_KNOWLEDGE_BASE.md.
- Re-indexing must run automatically when AI_KNOWLEDGE_BASE.md changes.
```

---

## Prompt 4 — User Profiles + Conversation Memory

Paste into Codex:

```
Implement user profiles and conversation memory per
docs/codex/codex-tasks/CODEX-TASK-USER-PROFILES-MEMORY.md.

Read these inputs first:
- docs/codex/codex-tasks/CODEX-TASK-USER-PROFILES-MEMORY.md
- docs/ai-plan/AI_PERSONA_AND_MEMORY.md (schema, prompt format, Brandon and Jesse profiles)
- frontend/src/config/aiPersonalization.ts (existing demo profiles — keep functional)
- frontend/src/lib/ai/rag-assistant-prompt.ts (where injection happens)
- AGENTS.md
- .agents/patterns/index.json

Follow the workflow, constraints, gates, and deliverables in the task file
exactly. Create the Linear issue first.

Critical:
- Run the Supabase migration. Regenerate types. Use the regenerated types — never inline types for these tables.
- Seed Brandon Collier and Jesse Lou as real user_profiles rows. Pull initial values from docs/ai-plan/AI_PERSONA_AND_MEMORY.md sample profiles.
- Do NOT inject empty <user_profile> or <remembered_context> blocks — omit when missing.
- Memory retrieval is non-blocking: 200ms timeout, then proceed without it.
- RLS must be tested as a non-admin user (cannot read another user's profile).
- Admin UI lives at /admin/users/[userId]/profile with three tabs.
- "Clear my conversation memory" available in user settings.
```

---

## After all four ship

1. **Megan fills the `[FILL]` markers** in `docs/ai-plan/AI_KNOWLEDGE_BASE.md` (data retention, current models, integrations list, known gaps, what's coming next).
2. **Brandon reviews and corrects `[VERIFY: Brandon]` markers** in Sections 5–8 and Section 12 of the KB.
3. **Megan populates Brandon's and Jesse's `context_notes`** via the new admin UI — the paragraph is the part that creates the wow factor. Don't skip it.
4. **Bump the storage key to `alleato_onboarding_completed_v4`** for the team rollout if you want everyone to see the modal again after the foundations are real.
5. **Watch the knowledge-gaps dashboard daily for the first week.** Every recurring "I don't know" is a 30-second copy edit to the KB. Within two weeks the unknown rate should drop sharply.

---

## If a single Codex task gets blocked

Run only the unblocked downstream pieces. Order can be:
- 1 → 2 → 3 → 4 (recommended, sequential)
- 1 + 2 in parallel → 3 → 4 (faster, two streams)
- 3 alone (if you want the AI to stop fabricating before any UI changes)

The task files are independent. Each has its own gates and Linear issue.
