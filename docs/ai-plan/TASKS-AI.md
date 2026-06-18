# TASKS-AI

Last updated: 2026-06-18

Purpose: implementation checklist for the Alleato AI OS workstream.

Source docs:

- `docs/ai-plan/AI-OS-GAP-MATRIX.md`
- `docs/ai-plan/AI-OS-PHASE-1-IMPLEMENTATION-PLAN.md`
- `docs/ai-plan/SELF_LEARNING_INTELLIGENCE_ARCHITECTURE.md`
- `docs/architecture/AI-RAG-ARCHITECTURE.md`

## Current Status

- [x] Document OpenClaw/Hermes capability gap matrix and adoption roadmap.
- [x] Document phase-one implementation plan.
- [x] Link AI OS strategy docs from `AI-MASTER-PLAN.md`.
- [x] Upgrade `/settings/memory` into Memory Center.
- [x] Add wrong-memory feedback route.
- [x] Create `ai_feedback_events` + `ai_learning_promotions` review candidate when a memory is marked wrong.
- [x] Update `AI-RAG-ARCHITECTURE.md` for Memory Center review flow.
- [ ] Add assistant-answer memory trace disclosure.
- [ ] Add admin Memory tab to learning promotions.
- [ ] Build Teach Alleato intake.
- [ ] Build Skill Library.
- [ ] Build AI Work Queue and subagent delegation runtime.

## Phase 0: Planning And Control Plane

- [x] Create `AI-OS-GAP-MATRIX.md`.
- [x] Create `AI-OS-PHASE-1-IMPLEMENTATION-PLAN.md`.
- [x] Create `TASKS-AI.md`.
- [ ] Add this checklist to the relevant AI docs navigation if a docs index exists.
- [ ] Create Linear issue for the AI OS epic when Linear issue creation is available.
- [ ] Split Linear sub-issues by phase:
  - [ ] Memory trace and memory review admin workflow.
  - [ ] Teach Alleato intake.
  - [ ] Skill Library schema and UI.
  - [ ] Skill injection and traces.
  - [ ] AI Work Queue.
  - [ ] Subagent delegation runtime.
  - [ ] Browser verification and adoption demo.
- [ ] Add implementation handoff under `docs/ops/handoffs/` if this becomes a parallel-session effort.
- [ ] Keep `docs/architecture/AI-RAG-ARCHITECTURE.md` current for every AI/RAG behavior change.

## Phase 1: Memory Center

Goal: users can inspect, edit, delete, and challenge assistant memory.

### Memory Center UI

- [x] Reuse existing `/settings/memory` route.
- [x] Rename page concept to Memory Center.
- [x] Add active memory count.
- [x] Add team memory count.
- [x] Add project-linked memory count.
- [x] Add used-recently count.
- [x] Add review-queued count for the current session.
- [x] Add tabs:
  - [x] All.
  - [x] Team.
  - [x] Project.
  - [x] Used recently.
  - [x] Review queued.
- [x] Keep type filter.
- [x] Show content.
- [x] Show type.
- [x] Show visibility.
- [x] Show project ID when present.
- [x] Show confidence.
- [x] Show importance.
- [x] Show created date.
- [x] Show last-used date when present.
- [x] Show access count.
- [x] Keep edit action.
- [x] Keep delete/deactivate action.
- [x] Add mark-wrong action.
- [ ] Add explicit pin action.
- [ ] Add explicit expire action.
- [ ] Add convert-to-team action.
- [ ] Add project filter.
- [ ] Add visibility filter.
- [ ] Add source filter.
- [ ] Add confidence filter.
- [ ] Add last-used filter.
- [ ] Add pagination or virtualized list if memory count is high.
- [ ] Add toast/error display for failed edits, deletes, and review submissions.
- [ ] Add loading and failed-state copy that includes real API error text.

### Memory Feedback API

- [x] Add `POST /api/ai-assistant/memories/[memoryId]/feedback`.
- [x] Authenticate current user.
- [x] Verify memory belongs to current user.
- [x] Verify memory is active.
- [x] Record `ai_feedback_events` correction.
- [x] Create `ai_learning_promotions` review candidate.
- [x] Include memory snapshot in feedback event.
- [x] Include reason category and free-text correction.
- [x] Fail loudly when memory lookup fails.
- [x] Fail loudly when feedback creation fails.
- [x] Fail loudly when promotion creation fails.
- [ ] Add unit test for successful wrong-memory feedback.
- [ ] Add unit test for unauthorized memory ID.
- [ ] Add unit test for inactive/missing memory.
- [ ] Add unit test for event-created but promotion-failed path if service mocking exists.

### Memory Service

- [x] Reflect hydrated memory fields in memory service type metadata:
  - [x] `last_accessed_at`.
  - [x] `access_count`.
  - [x] `expires_at`.
- [ ] Add helper to mark memory as challenged if persistent status is needed.
- [ ] Add helper to list team-visible memories separately if product needs a stronger team scope.
- [ ] Add helper to list project memories by project ID.
- [ ] Add helper to return memory usage metadata for assistant-answer traces.

### Memory Verification

- [x] Run route conflict check.
- [x] Run changed-file lint and guardrails through finish flow.
- [x] Run RAG docs gate through finish flow.
- [ ] Run `scripts/verify/verify_ai_memory_contract.mjs`.
- [ ] Browser-verify `/settings/memory`.
- [ ] Browser-verify wrong-memory review flow creates a candidate in `/admin/ai-learning-promotions`.
- [ ] Capture browser artifacts for Memory Center.

## Phase 2: Assistant Answer Memory Trace

Goal: users can see when an answer used memory and challenge bad memory from the answer itself.

### Data Contract

- [x] Inspect `memory_usage` metadata emitted by `bot-core.ts`.
- [x] Define stable client type for memory trace payload.
- [x] Include memory ID.
- [x] Include memory type.
- [x] Include short memory snippet.
- [x] Include ranking reason when available.
- [x] Include project scope when available.
- [x] Include visibility only when safe for current user.
- [x] Do not expose private memories across users.

### Chat UI

- [x] Locate assistant message renderer.
- [x] Add quiet "Memory used" disclosure.
- [x] Hide disclosure when no memory was used.
- [x] Render concise memory snippets.
- [x] Add "This is wrong" action per memory.
- [x] Link to `/settings/memory`.
- [x] Keep visual noise low.
- [ ] Ensure mobile layout does not overflow.

### Feedback Wiring

- [x] Reuse memory feedback route where possible.
- [x] Include source context from the assistant message:
  - [x] conversation/session ID.
  - [x] message ID.
  - [x] route.
  - [ ] prompt/request context if already persisted.
- [x] Update review candidate proposed learning to say it came from answer trace.
- [x] Add success/failure UI.

### Guardrails

- [x] Ensure answer trace cannot reveal private memory to non-owner.
- [x] Ensure challenge action does not mutate behavior immediately.
- [x] Ensure failed challenge shows an actionable error.
- [x] Add regression test for memory trace rendering.
- [x] Add regression test for hidden trace when no memory is used.

## Phase 3: Learning Review Queue Improvements

Goal: admins can process memory and workflow learning candidates efficiently.

### Admin UI

- [ ] Extend `/admin/ai-learning-promotions`.
- [ ] Add promotion type tabs:
  - [ ] Memory.
  - [ ] Skill.
  - [ ] Retrieval.
  - [ ] Attribution.
  - [ ] Agent prevention.
  - [ ] Workflow.
- [ ] Add status count row:
  - [ ] candidate.
  - [ ] approved.
  - [ ] applied.
  - [ ] rejected.
  - [ ] paused.
  - [ ] superseded.
- [ ] Add source event detail panel.
- [ ] Show original correction text.
- [ ] Show before snapshot.
- [ ] Show proposed destination.
- [ ] Show project scope.
- [ ] Show risk level.
- [ ] Require reviewer notes on rejection.
- [ ] Add history/activity timeline for each promotion.

### Memory Candidate Handling

- [ ] Detect `proposed_learning.action = review_memory`.
- [ ] Add quick actions:
  - [ ] edit memory.
  - [ ] deactivate memory.
  - [ ] expire memory.
  - [ ] convert to team memory.
  - [ ] reject correction.
- [ ] Ensure each quick action writes an audit event.
- [ ] Ensure each quick action updates promotion status.
- [ ] Ensure failed apply operations keep candidate reviewable.

### Existing Promotion Apply Paths

- [ ] Verify user preference apply path still writes to `ai_memories`.
- [ ] Verify project lesson apply path still writes team-visible memory.
- [ ] Verify agent prevention prompt apply path writes to `agent_learnings`.
- [ ] Verify retrieval weight apply path writes active retrieval rule.
- [ ] Verify attribution apply path still works.

### Verification

- [ ] Unit-test memory review quick actions.
- [ ] Browser-verify Memory tab.
- [ ] Browser-verify rejection requires notes.
- [ ] Browser-verify apply failure is visible.
- [ ] Update AI overview learning docs with live state after implementation.

## Phase 4: Teach Alleato Intake

Goal: field and office users can contribute workflows, examples, corrections, and ideas without knowing prompts or code.

### User Surface

- [ ] Add `/ai-assistant/teach`.
- [ ] Add entry link from AI assistant.
- [ ] Add entry link from Memory Center.
- [ ] Add entry link from Feedback Inbox if appropriate.
- [ ] Add entry link from Project Intelligence if appropriate.
- [ ] Add entry link from Documents/drawings after drawing workflows exist.

### Intake Form

- [ ] Field: what should Alleato learn?
- [ ] Field: where does this apply?
  - [ ] personal.
  - [ ] project.
  - [ ] team.
  - [ ] company.
- [ ] Field: workflow category.
- [ ] Field: example input.
- [ ] Field: example output.
- [ ] Field: source/evidence link.
- [ ] Field: optional upload.
- [ ] Field: suggested reviewer.
- [ ] Field: why this matters.
- [ ] Field: perceived risk level.
- [ ] Validate required fields.
- [ ] Preserve drafts if submission fails.
- [ ] Show review status after submit.

### Backend

- [ ] Add Teach Alleato API route.
- [ ] Authenticate current user.
- [ ] Create `ai_feedback_events` row.
- [ ] Generate one or more `ai_learning_promotions` candidates.
- [ ] Use existing promotion types first:
  - [ ] user preference.
  - [ ] project lesson.
  - [ ] workflow rule.
  - [ ] agent prevention prompt.
- [ ] Store skill-shaped candidates in promotion payload until Skill Library schema exists.
- [ ] Fail loudly if event creation succeeds but candidate creation fails.
- [ ] Add tests for successful submit.
- [ ] Add tests for missing required fields.
- [ ] Add tests for promotion creation failure.

### Review Integration

- [ ] Surface Teach Alleato submissions in learning promotions.
- [ ] Show source user and route.
- [ ] Show proposed destination.
- [ ] Add reviewer actions.
- [ ] Add status back to submitter if notification system exists.

## Phase 5: Skill Library

Goal: approved field knowledge becomes reusable, versioned operating procedure.

### Schema

- [ ] Confirm there is no first-class skills table yet.
- [ ] Design skills schema.
- [ ] Create migration for skills tables.
- [ ] Apply migration to Supabase.
- [ ] Verify migration ledger.
- [ ] Regenerate Supabase types.
- [ ] Update table metadata docs.
- [ ] Add RLS:
  - [ ] personal skills visible to owner/admin.
  - [ ] project skills visible to project members/admin.
  - [ ] team/company skills visible to authenticated team/admin.
  - [ ] write/review actions admin-gated or owner-gated.
- [ ] Add indexes for status, scope, category, project, owner, updated date.

### Skill Model

- [ ] Skill title.
- [ ] Skill slug.
- [ ] Summary.
- [ ] Body/instructions.
- [ ] Category.
- [ ] Scope.
- [ ] Status.
- [ ] Owner.
- [ ] Reviewer.
- [ ] Version.
- [ ] Examples.
- [ ] Source event IDs.
- [ ] Risk level.
- [ ] Usage count.
- [ ] Last used.
- [ ] Metadata.

### User UI

- [ ] Add `/ai-assistant/skills`.
- [ ] List active skills user can see.
- [ ] Filter by category.
- [ ] Filter by scope.
- [ ] Filter by project.
- [ ] Show owner/reviewer.
- [ ] Show examples.
- [ ] Show usage count.
- [ ] Link to Teach Alleato.
- [ ] Allow users to submit new skill candidates.

### Admin UI

- [ ] Add `/admin/ai-skills`.
- [ ] Review candidate skills.
- [ ] Approve candidate skills.
- [ ] Reject candidate skills with notes.
- [ ] Archive active skills.
- [ ] Create new skill version.
- [ ] Compare versions.
- [ ] View usage events.
- [ ] View linked evals.

### Seed Skill Candidates

- [ ] Drawing conflict review.
- [ ] Historical issue matching.
- [ ] RFI drafting from similar issues.
- [ ] Daily brief ranking.
- [ ] Important email classification.
- [ ] Pay app review.
- [ ] Change event source-to-record review.
- [ ] Submittal procurement review.
- [ ] Schedule impact review.
- [ ] Estimate assumption review.

### Verification

- [ ] Unit-test skill CRUD service.
- [ ] Unit-test RLS expectations where possible.
- [ ] Browser-verify user skill library.
- [ ] Browser-verify admin skill review.
- [ ] Verify migration applied.
- [ ] Update AI/RAG architecture docs.

## Phase 6: Skill Injection And Skill Traces

Goal: approved skills affect assistant behavior selectively and visibly.

### Retrieval And Selection

- [ ] Build skill selection service.
- [ ] Select by category.
- [ ] Select by route/surface.
- [ ] Select by project.
- [ ] Select by user/team/company scope.
- [ ] Select by explicit user request.
- [ ] Limit prompt token budget.
- [ ] Avoid injecting every active skill into every prompt.

### Assistant Integration

- [ ] Inject selected skills into main AI assistant prompt.
- [ ] Inject selected skills into backend Deep Agents where appropriate.
- [ ] Inject selected skills into App Expert only when app-help relevant.
- [ ] Inject selected skills into Microsoft Executive Assistant only when email/Teams relevant.
- [ ] Add clear instruction priority between system prompt, source evidence, memory, and skills.

### Traceability

- [ ] Persist selected skill IDs in chat metadata.
- [ ] Render "Skill used" trace in assistant answer.
- [ ] Show skill title and version.
- [ ] Link to skill page.
- [ ] Add "skill was wrong" feedback action.
- [ ] Create learning candidate when skill is challenged.

### Evals

- [ ] Add eval cases for each seeded skill.
- [ ] Verify correct skill selection.
- [ ] Verify irrelevant skills are not injected.
- [ ] Verify source evidence still outranks skill instructions.
- [ ] Verify high-risk skill only drafts/recommends.

## Phase 7: AI Work Queue

Goal: background AI labor is visible, reviewable, and recoverable.

### Schema

- [ ] Confirm there is no AI work queue table yet.
- [ ] Design work-run schema.
- [ ] Design work-run-step schema.
- [ ] Design artifact/report schema or reuse existing workspace artifacts.
- [ ] Add migration.
- [ ] Apply migration.
- [ ] Verify migration ledger.
- [ ] Regenerate Supabase types.
- [ ] Add RLS.
- [ ] Update table metadata docs.

### Work Queue UI

- [ ] Add `/ai-assistant/work`.
- [ ] Add admin view if needed.
- [ ] List queued work.
- [ ] List running work.
- [ ] List completed work.
- [ ] List failed work.
- [ ] List needs-review work.
- [ ] Show owner.
- [ ] Show project scope.
- [ ] Show source trigger.
- [ ] Show child steps.
- [ ] Show artifacts.
- [ ] Show confidence.
- [ ] Show failure reason.
- [ ] Add retry action where safe.
- [ ] Add cancel action where safe.

### Work Types

- [ ] Daily brief generation.
- [ ] Source health check.
- [ ] Drawing conflict scan.
- [ ] Stale RFI review.
- [ ] Submittal gap review.
- [ ] Meeting transcript action extraction.
- [ ] Historical-similarity search.
- [ ] Estimate/schedule variance monitor.
- [ ] Project source-health audit.

### Guardrails

- [ ] Every work run has status.
- [ ] Every failure has cause.
- [ ] Every failure has owner file/service when applicable.
- [ ] Every high-impact recommendation requires review.
- [ ] No official write happens without existing confirmation/audit pattern.
- [ ] Long-running work uses cheaper capable models where possible.

## Phase 8: Subagent Delegation Runtime

Goal: parent agents can spawn focused child agents and synthesize one sourced answer.

### Runtime Contract

- [ ] Define subagent run request.
- [ ] Define subagent run response.
- [ ] Define child report schema.
- [ ] Define source evidence schema.
- [ ] Define confidence schema.
- [ ] Define failure schema.
- [ ] Define parent synthesis schema.

### Parent Planner

- [ ] Detect when delegation is useful.
- [ ] Create task plan.
- [ ] Select subagents.
- [ ] Bound runtime.
- [ ] Bound model cost.
- [ ] Bound tool access.
- [ ] Persist work-run parent.
- [ ] Persist child steps.

### Subagents

- [ ] Drawing reviewer.
- [ ] Historical issue matcher.
- [ ] RFI drafter.
- [ ] Estimating comparator.
- [ ] Schedule impact analyst.
- [ ] Submittal procurement analyst.
- [ ] Financial exposure analyst.
- [ ] Communications/evidence analyst.
- [ ] Project source-health auditor.

### Tool Scoping

- [ ] Read-only source tools by default.
- [ ] Project-scoped data access.
- [ ] No arbitrary SQL unless admin/runtime gated.
- [ ] No external email/send without review.
- [ ] No record writes without confirmation.
- [ ] Audit all proposed writes.

### Parent Synthesis

- [ ] Combine child reports.
- [ ] Preserve source citations.
- [ ] Surface disagreements.
- [ ] Surface low confidence.
- [ ] Identify next review action.
- [ ] Produce draft records only when requested.

### Verification

- [ ] Unit-test child report validation.
- [ ] Unit-test planner routing.
- [ ] Eval-test multi-subagent synthesis.
- [ ] Browser-verify work queue run detail.
- [ ] Verify failure state is clear.

## Phase 9: Construction Domain Pilots

Goal: prove value with high-excitement, field-relevant workflows.

### Drawing Brain Pilot

- [ ] Inventory drawing data sources.
- [ ] Inventory CAD availability.
- [ ] Inventory drawing PDF extraction path.
- [ ] Inventory RFI log linkage.
- [ ] Inventory submittal/spec linkage.
- [ ] Define drawing review skill.
- [ ] Define low-confidence guardrail.
- [ ] Define conflict report output.
- [ ] Build read-only drawing conflict scan.
- [ ] Browser-verify with one real project.
- [ ] Add review workflow for suggested RFIs/change events.

### Tribal Engine Pilot

- [ ] Define historical issue matching contract.
- [ ] Identify source tables for past RFIs.
- [ ] Identify source tables for past change events.
- [ ] Identify source tables for meeting decisions.
- [ ] Identify source tables for final resolutions.
- [ ] Build similarity query across historical project sources.
- [ ] Return matched issue, route taken, outcome, and source links.
- [ ] Add draft-RFI output as review-only.
- [ ] Add confidence threshold.
- [ ] Browser-verify with one active issue.

### Scheduler/Estimator Pilot

- [ ] Inventory internal historical estimate data.
- [ ] Identify RSMeans access path and licensing constraints.
- [ ] Define estimator skill.
- [ ] Define schedule impact skill.
- [ ] Build read-only estimate comparison.
- [ ] Build read-only lead-time/schedule impact review.
- [ ] Add confidence threshold.
- [ ] Add human review before budget/schedule writes.

## Phase 10: Change Management And Adoption

Goal: make this feel like the team is helping create Alleato AI.

- [ ] Create internal one-page explainer.
- [ ] Create "Teach Alleato" launch message.
- [ ] Create short demo script.
- [ ] Demo Memory Center.
- [ ] Demo wrong-memory review.
- [ ] Demo Teach Alleato submission.
- [ ] Demo learning review queue.
- [ ] Demo approved skill used in answer.
- [ ] Collect field workflow ideas.
- [ ] Pick first three pilot workflows.
- [ ] Add status labels:
  - [ ] submitted.
  - [ ] in review.
  - [ ] accepted.
  - [ ] piloting.
  - [ ] active.
  - [ ] rejected.
- [ ] Show contributors on accepted skills where appropriate.
- [ ] Publish before/after examples.

## Phase 11: Observability And Quality

- [ ] Add Langfuse metadata for memory trace usage.
- [ ] Add Langfuse metadata for skill selection.
- [ ] Add Langfuse metadata for Teach Alleato submissions.
- [ ] Add Langfuse metadata for learning promotion apply operations.
- [ ] Add eval bundle for memory trace.
- [ ] Add eval bundle for skill selection.
- [ ] Add eval bundle for Teach Alleato candidate generation.
- [ ] Add eval bundle for subagent synthesis.
- [ ] Add dashboard counts:
  - [ ] active memories.
  - [ ] challenged memories.
  - [ ] pending promotions.
  - [ ] applied promotions.
  - [ ] active skills.
  - [ ] skill usage.
  - [ ] work runs by status.
- [ ] Add stale-candidate alert.
- [ ] Add failed-promotion alert.
- [ ] Add failed-work-run alert.

## Phase 12: Documentation

- [x] Document AI OS gap matrix.
- [x] Document phase-one implementation plan.
- [x] Document Memory Center review flow in AI/RAG architecture.
- [ ] Update AI overview memory page after Memory Center is browser-verified.
- [ ] Update AI overview learning page after review queue is extended.
- [ ] Add Skill Library architecture doc after schema lands.
- [ ] Add AI Work Queue architecture doc after schema lands.
- [ ] Add subagent delegation architecture doc after runtime lands.
- [ ] Add user-facing help article: What Alleato AI remembers.
- [ ] Add user-facing help article: How to teach Alleato.
- [ ] Add admin-facing help article: Reviewing AI learning candidates.
- [ ] Add admin-facing help article: Managing skills.

## Cross-Cutting Guardrails

- [ ] No project truth moves out of Alleato.
- [ ] No autonomous official writes without existing approval/audit path.
- [ ] Every memory/skill/work-run failure has a visible error path.
- [ ] Every behavior-changing correction is reviewable before activation.
- [ ] Private memory stays private.
- [ ] Team/project memory respects membership and admin rules.
- [ ] RAG chunk sync remains the vector path for memory search.
- [ ] PM APP memory tables do not receive embedding writes.
- [ ] Source evidence outranks memories and skills.
- [ ] Low-confidence domain outputs route to review.
- [ ] Skills are selected narrowly by scope and category.
- [ ] Long-running verification is delegated when subagents are available.
- [ ] Browser artifacts are captured before claiming frontend workflow completion.

## Verification Checklist Per Slice

- [ ] Run `npm run check:routes` after route changes.
- [ ] Run `npm run verify:nonprod-routes` after route changes.
- [ ] Run targeted lint for changed frontend files.
- [ ] Run changed-file quality gates through `codex:finish`.
- [ ] Run relevant unit tests.
- [ ] Run relevant AI/RAG verifier:
  - [ ] memory contract verifier.
  - [ ] assistant eval suite.
  - [ ] app expert eval suite if touched.
  - [ ] source health verifier if source pipeline touched.
- [ ] Browser-verify user-facing pages with artifacts.
- [ ] Update `AI-RAG-ARCHITECTURE.md` for AI/RAG behavior changes.
- [ ] Update table metadata docs for schema changes.
- [ ] Apply Supabase migrations and verify remote migration ledger for schema changes.
- [ ] Commit and push with `npm run codex:finish -- --files ...`.
