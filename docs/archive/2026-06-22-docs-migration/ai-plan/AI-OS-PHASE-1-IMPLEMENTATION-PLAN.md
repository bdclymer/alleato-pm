# Alleato AI OS Phase 1 Implementation Plan

Last updated: 2026-06-18

Related strategy:

- `docs/ai-plan/AI-OS-GAP-MATRIX.md`
- `docs/ai-plan/SELF_LEARNING_INTELLIGENCE_ARCHITECTURE.md`
- `docs/architecture/AI-RAG-ARCHITECTURE.md`

## Objective

Ship the first visible Alleato AI OS slice:

1. Memory Center
2. Skill Library
3. Teach Alleato intake
4. Learning Review Queue

This turns the assistant from a hidden chat system into a visible, trainable, team-owned intelligence layer.

## Product Principle

The user should be able to answer:

- What does Alleato AI remember?
- Why did it use that memory?
- What has the team taught it?
- Which corrections are waiting for review?
- Which approved lessons changed future behavior?
- How can someone in the field contribute a better workflow?

If the system cannot answer those questions, the learning loop is not productized.

## Current Anchors To Reuse

Do not create parallel systems. Build on the surfaces and tables that already exist.

| Area | Existing anchor | Keep / extend |
|---|---|---|
| Personal memory UI | `frontend/src/app/(main)/settings/memory/page.tsx` | Extend into Memory Center. |
| Memory APIs | `frontend/src/app/api/ai-assistant/memories/**` | Keep for personal memory CRUD; add richer filters/usage metadata if missing. |
| Memory service | `frontend/src/lib/ai/services/ai-memory-service.ts` | Keep as canonical memory write/read service. |
| Memory extraction | `frontend/src/lib/ai/services/memory-extraction.ts` | Add candidate/review path before high-risk memories become durable. |
| Learning promotions | `frontend/src/app/(admin)/ai-learning-promotions/**` | Extend into the review queue for memories, skills, and workflow rules. |
| Feedback pipeline | `frontend/src/lib/ai/services/feedback-event-service.ts` | Keep as the promotion/event backbone. |
| Agent learnings | `frontend/src/lib/ai/services/agent-learning-service.ts` | Keep for prevention prompts and repeated failure patterns. |
| Existing tables | `ai_memories`, `ai_feedback_events`, `ai_learning_promotions`, `ai_retrieval_feedback`, `agent_learnings`, `agent_learning_usages` | Reuse before adding schema. |
| AI overview docs | `frontend/src/app/(admin)/docs/ai-overview/{memory,learning}/page.tsx` | Update later to reflect the new product loop and live counts. |

## Slice 1: Memory Center

### User Story

As an Alleato user, I can see and correct what the AI remembers so I trust the assistant and can shape future behavior without asking a developer.

### Route

Use the existing route:

```text
/settings/memory
```

Rename the page conceptually to **Memory Center** without creating a second page.

### Required UI

- Summary row:
  - active personal memories
  - active team/project memories visible to me
  - pending memory candidates
  - memories used in the last 7 days
- Tabs:
  - My Memories
  - Project Memories
  - Team Memories
  - Pending Review
  - Used Recently
- Filters:
  - type
  - visibility
  - project
  - source
  - confidence
  - last used
- Row fields:
  - memory content
  - type
  - visibility
  - source
  - project
  - confidence
  - importance
  - created date
  - last used
  - access count
  - source evidence if available
- Actions:
  - edit
  - delete/deactivate
  - pin / increase importance
  - lower importance
  - expire
  - convert to team memory
  - mark wrong

### Backend/API

Keep:

```text
GET /api/ai-assistant/memories
POST /api/ai-assistant/memories
PATCH /api/ai-assistant/memories/[memoryId]
DELETE /api/ai-assistant/memories/[memoryId]
```

Add only if needed:

```text
GET /api/ai-assistant/memories/usage
POST /api/ai-assistant/memories/[memoryId]/feedback
```

Preferred first approach:
extend the existing list endpoint instead of adding new endpoints unless the current contract gets too broad.

### Guardrails

- Private memories must remain user-owned.
- Team memories must require explicit visibility.
- Project memories must respect project membership/admin rules.
- Bad memory edits must update the RAG memory chunk/delete sync through the existing memory service.
- The page must not write embeddings to PM APP `ai_memories.embedding`; RAG chunk sync remains the vector path.

### Acceptance Criteria

- A user can edit/delete/deactivate a memory from `/settings/memory`.
- A user can see why a memory is likely to affect future answers.
- A memory marked wrong creates an `ai_feedback_events` row and a reviewable `ai_learning_promotions` candidate.
- `npm run rag:verify:memory` or `scripts/verify/verify_ai_memory_contract.mjs` passes after changes.

## Slice 2: Skill Library

### User Story

As an Alleato team member, I can teach the AI a repeatable workflow so field knowledge becomes reviewed company operating intelligence.

### Route

Recommended routes:

```text
/ai-assistant/skills
/admin/ai-skills
```

Use `/ai-assistant/skills` for normal users and `/admin/ai-skills` for review/admin actions.

### Data Model

There is no obvious first-class app table for productized skills today. Add a small PM APP schema only when ready to implement.

Recommended tables:

```text
ai_skills
ai_skill_versions
ai_skill_examples
ai_skill_usage_events
```

Minimum `ai_skills` fields:

- `id`
- `created_at`
- `updated_at`
- `created_by`
- `owner_user_id`
- `title`
- `slug`
- `summary`
- `status`: `candidate | active | archived | rejected`
- `scope`: `personal | project | team | company`
- `project_id`
- `category`: `drawing | estimating | schedule | rfi | submittal | financial | communication | executive | other`
- `body`
- `source_event_ids`
- `reviewed_by`
- `reviewed_at`
- `risk_level`
- `metadata`

### First Skills To Seed

Seed these as candidate examples, not active truth unless reviewed:

- Drawing conflict review
- Historical issue matching
- RFI drafting from similar issues
- Daily brief ranking
- Important email classification
- Pay app review
- Change event source-to-record review

### Guardrails

- No autonomous skill activation without review.
- Every active skill must have an owner.
- Every active skill must have at least one example or evidence note.
- High-risk skills cannot trigger writes directly; they can only draft/recommend.
- Skills must be injected selectively by scope/category, not dumped into every prompt.

### Acceptance Criteria

- User can submit a skill candidate.
- Admin can approve/reject a skill candidate.
- Approved skill appears in an active skill list.
- Assistant traces can identify which active skill was used.

## Slice 3: Teach Alleato Intake

### User Story

As someone in the field or office, I can teach Alleato a better way to handle a workflow without knowing prompts, code, or database structure.

### Route

Recommended:

```text
/ai-assistant/teach
```

Can be linked from:

- AI assistant welcome screen
- Memory Center
- Feedback inbox
- Project Intelligence
- Documents/drawings pages later

### Intake Fields

- What should Alleato learn?
- Where does this apply?
  - personal
  - project
  - team
  - company
- Workflow category
- Example input
- Example output
- Source/evidence upload or link
- Who should review this?
- Why this matters
- Risk level perceived by submitter

### Routing

Map submissions into `ai_feedback_events` first.

Then generate one or more `ai_learning_promotions` candidates:

- `user_preference`
- `project_lesson`
- `workflow_rule`
- `agent_prevention_prompt`
- later: `skill_candidate`

If `ai_skills` does not exist yet, store skill-shaped candidates in `ai_learning_promotions.proposed_learning` until the Skill Library schema ships.

### Guardrails

- Teach submissions are candidates, not active behavior.
- User-facing copy must make review status clear.
- Submissions with uploads must preserve source links.
- The system must fail loudly if feedback event creation succeeds but promotion candidate creation fails.

### Acceptance Criteria

- A user can submit a workflow idea.
- The submission creates an event and a reviewable candidate.
- Admin queue shows the submission with source, category, scope, and proposed destination.

## Slice 4: Learning Review Queue

### User Story

As an admin/reviewer, I can approve, reject, apply, pause, or supersede learning candidates so the AI improves deliberately instead of silently.

### Existing Route

Use:

```text
/admin/ai-learning-promotions
```

### Required Improvements

- Add tabs by promotion type:
  - Memory
  - Skill
  - Retrieval
  - Attribution
  - Agent prevention
  - Workflow
- Add clear status counts:
  - candidate
  - approved
  - applied
  - rejected
  - paused
- Add source event detail:
  - original user correction/submission
  - before/after
  - source route/page
  - project/team scope
- Add apply destinations:
  - `ai_memories`
  - `agent_learnings`
  - `ai_retrieval_weights`
  - future `ai_skills`
- Add reviewer notes required for rejection.

### Guardrails

- Applying a promotion must create an audit event.
- Promotion status transitions must be explicit.
- Review queue cannot silently swallow failed apply operations.
- Rejected candidates must remain visible in history.

### Acceptance Criteria

- Admin can apply a user preference into memory.
- Admin can apply an agent prevention prompt into `agent_learnings`.
- Admin can reject a candidate with notes.
- Review activity appears in the candidate history.

## Slice 5: Assistant Answer Memory Trace

### User Story

When an answer uses memory, I can see which memory influenced the answer and correct it if it was wrong.

### Implementation Notes

`bot-core.ts` already emits `memory_usage` metadata. Productize it in the chat UI:

- Show a quiet "Memory used" disclosure on memory-backed answers.
- List memory snippets, not full private raw metadata.
- Include "This is wrong" action.
- Link to Memory Center for detailed editing.

### Guardrails

- Do not expose private memories to other users.
- Do not make the chat visually noisy.
- Hide memory trace by default behind disclosure.

### Acceptance Criteria

- A memory-backed answer exposes a memory trace.
- User can flag a memory as wrong from the answer.
- The wrong-memory action creates feedback and a review candidate.

## Recommended Build Order

1. Upgrade `/settings/memory` into Memory Center.
2. Wire wrong-memory feedback into `ai_feedback_events` and `ai_learning_promotions`.
3. Add memory trace disclosure to assistant answers.
4. Extend `/admin/ai-learning-promotions` for memory/preference/project lesson review.
5. Add `/ai-assistant/teach` intake and route submissions into the same review queue.
6. Add Skill Library schema and admin/user surfaces.
7. Start injecting approved skills selectively into assistant/Deep Agents context.

## Verification Plan

Short checks in main thread:

- Targeted TypeScript check for changed routes/components.
- Unit tests for service helpers if added.
- Direct API route smoke where possible.

Long-running checks delegated to a cheap sub-agent:

- Full frontend typecheck.
- Full lint/quality.
- Browser verification of Memory Center and Teach Alleato routes.

Browser evidence required before claiming frontend completion:

- `/settings/memory`
- `/admin/ai-learning-promotions`
- `/ai-assistant/teach` once built
- one chat answer showing memory trace once built

## Product Copy Direction

Use plain, participatory language:

- "Teach Alleato"
- "Memory Center"
- "Skills"
- "Pending review"
- "Used recently"
- "This changed future answers"
- "Needs human review before becoming active"

Avoid:

- "Prompt engineering"
- "Vector embeddings"
- "RAG internals"
- "Autonomous agent governance"
- "Fine-tuning"

## Failure-Loud Requirements

- If memory extraction fails, record the failure in response metadata or logs.
- If a correction event writes but promotion creation fails, show a clear warning.
- If a promotion apply operation fails, keep the candidate in candidate/failed state with the exact error.
- If a skill is active but cannot be loaded into the assistant, the trace must show that it was skipped.
- If memory was used in an answer, the user must be able to inspect or challenge it.

## Definition Of Done For Phase 1

Phase 1 is done when:

- Users can inspect and correct memory.
- Users can submit "Teach Alleato" workflow knowledge.
- Admins can review and apply learning candidates.
- Approved learnings can become memory or prevention prompts.
- The assistant can show when memory influenced an answer.
- The internal team can see that their feedback changes the AI's future behavior.

This is the minimum product loop needed for buy-in, change management, and field-led innovation.
