# Alleato AI OS Gap Matrix

Last updated: 2026-06-18

## Executive Point

Alleato AI should remain the main construction intelligence platform. The gap is not that Alleato needs to become OpenClaw or Hermes. The gap is that OpenClaw and Hermes have popularized a stronger agent operating model:

- visible persistent memory
- reusable skills
- subagent delegation
- background/scheduled work
- user-trainable behavior
- a clear loop from field feedback to improved AI performance

Alleato already has the harder construction foundation: project data, RAG, source citations, permissions, packet intelligence, Acumatica, Fireflies, Graph, Teams, documents, and project workflows. What is missing is the more visible and participatory AI OS layer that makes the system feel alive, coachable, and owned by the internal team.

The goal is to absorb the best patterns without moving project truth out of Alleato.

## Why OpenClaw And Hermes Feel Exciting

OpenClaw and Hermes are popular because they make AI feel less like a chatbot and more like an operating teammate.

| Platform pattern | Why people like it | What Alleato should learn from it |
|---|---|---|
| Persistent agent identity | The agent has a durable personality, tools, workspace, channels, and long-running context. | Alleato AI should feel like a company operator, not a one-off chat session. |
| Visible memory | Users can understand what the agent remembers and correct it. | Alleato needs a Memory Center where users can review, edit, approve, reject, pin, and expire memories. |
| Skills | Repeatable workflows become durable procedures instead of disappearing into chat history. | Alleato needs a Skill Library for company workflows: drawing review, RFI drafting, daily brief ranking, email triage, change-event review, estimating assumptions. |
| Self-improvement loop | Corrections become future behavior, not isolated apologies. | Alleato needs a correction-to-learning pipeline that creates memory, skill candidates, eval cases, retrieval rules, and guardrails. |
| Subagent spawning | A lead agent can delegate focused work to isolated workers and synthesize the result. | Alleato needs scoped subagents for drawing, estimating, schedule, financial, communications, risk, and historical-similarity research. |
| Background work | Agents can run recurring checks, audits, digests, and monitors. | Alleato needs a visible AI Work Queue for scheduled and delegated tasks. |
| Messaging/channel presence | Agents meet users in Slack/Teams/text/CLI instead of only inside a web page. | Alleato should use Teams/email/app surfaces for output, but keep the source of truth in Alleato. |

External references:

- OpenClaw positions itself as a personal assistant gateway with channels and agent execution: https://github.com/openclaw/openclaw
- OpenClaw `sessions_spawn` creates isolated background sessions that report back to the parent: https://docs.openclaw.ai/concepts/session-tool
- OpenClaw subagents are non-blocking background runs with push-based completion: https://docs.openclaw.ai/tools/subagents
- OpenClaw skills are markdown instruction packages loaded by environment/config/tool availability: https://docs.openclaw.ai/tools/skills
- Hermes positions itself as a self-improving agent with memory, skills, scheduled automations, subagents, and multi-environment runtime: https://github.com/NousResearch/hermes-agent
- Hermes docs emphasize a built-in learning loop that creates and improves skills from experience: https://hermes-agent.nousresearch.com/docs/
- Hermes delegation starts subagents from fresh context, forcing explicit goal/context handoff: https://hermes-agent.nousresearch.com/docs/user-guide/features/delegation

## Current Alleato Foundation

Alleato is not starting from zero. The current architecture already includes:

| Foundation | Current evidence | Gap |
|---|---|---|
| AI memory | `ai_memories`, `memories`, `conversation-memory.ts`, `ai-memory-service.ts`, memory APIs | Not visible or confidently editable by normal users. Recall quality feels hit-or-miss. |
| Agent learning | `agent_learnings`, `agent_learning_usages`, `agent-learning-service.ts`, feedback routes | Learning is fragmented and not clearly promoted into durable user-facing behavior. |
| Feedback events | `ai_feedback_events`, `ai_learning_promotions`, `ai_retrieval_feedback` | Some writers exist, but current table inventory shows parts are empty or underused. |
| Deep Agents | Backend Deep Agents runtime, research agent, app expert, project/executive agent | Not yet presented as an internal team-facing delegation/work queue model. |
| Subagents | Financial, schedule, risk, communications subagents in backend Deep Agents | Not exposed as a general parent-agent delegation capability inside the main assistant. |
| Skills | Backend research/content-builder packaged skills | No central Alleato Skill Library where field/team knowledge becomes approved procedures. |
| Source intelligence | RAG DB, source syntheses, packets, operating records, source health | Strong foundation, but field users need to see how their corrections improve the system. |
| Evals and guardrails | Assistant eval suite, memory verifier, source health verifier, packet quality gates | Evals exist for engineers, not as a clear product learning loop visible to users. |

## What Alleato Is Missing

### 1. Memory Center

Problem:
The assistant may have many stored memories, but users cannot easily see what it believes, correct bad memories, pin important preferences, or understand why something was recalled.

Needed:

- Personal memory view
- Project memory view
- Team/company memory view
- Pending memory candidates
- Approved/rejected memory history
- Memory source and evidence
- Expiration, confidence, importance, visibility, and owner controls
- "Used in this answer" trace for memory-backed responses

Product value:
This turns AI memory from mysterious behavior into something the team can trust and shape.

### 2. Skill Library

Problem:
Repeated workflows are scattered across prompts, docs, memories, code, and chat behavior.

Needed:

- Durable skills with owner, scope, version, status, and examples
- Field-submitted skill ideas
- Approved company operating skills
- Project-specific skills
- Skill eval cases
- Skill usage analytics
- Change history

Examples:

- "How Alleato reviews drawing conflicts"
- "How Brandon wants the daily brief ranked"
- "How to draft an RFI from similar historical issues"
- "How to classify important vs spammy email"
- "How to compare a current issue to past projects"
- "How to review a subcontractor pay app"

Product value:
Field knowledge becomes reusable operating intelligence instead of disappearing in conversations.

### 3. Correction-To-Learning Loop

Problem:
When a user corrects the assistant, the correction often stays local to that interaction.

Needed:

```text
User correction
-> classify correction type
-> create learning candidate
-> route to review
-> promote into memory, skill, eval, retrieval weight, or guardrail
-> measure future usage
-> prune if ineffective
```

Correction types:

- Wrong source
- Wrong project
- Wrong priority
- Bad ranking
- Missing context
- Bad workflow assumption
- Wrong tone
- Wrong field/business rule
- Bad retrieval result
- Hallucinated or unsupported claim

Product value:
Every correction becomes a chance to improve the company operating system.

### 4. Subagent Delegation Runtime

Problem:
Alleato has domain agents, but the main assistant does not yet feel like it can delegate work the way a strong operator would.

Needed:

- Parent-agent task planner
- Isolated subagent runs
- Explicit handoff context
- Bounded tools and permissions per subagent
- Cheap model routing for routine work
- Parent synthesis of child reports
- Run transcript, evidence, and confidence
- Human approval before writes or high-impact recommendations

High-value construction subagents:

- Drawing reviewer
- Historical issue matcher
- RFI drafter
- Estimating comparator
- Schedule impact analyst
- Submittal procurement analyst
- Financial exposure analyst
- Communications/evidence analyst
- Project source-health auditor

Product value:
This makes Alleato AI feel operationally capable, not just conversational.

### 5. AI Work Queue

Problem:
Background jobs exist, but users do not have a product surface showing what the AI is doing, what it found, what failed, and what needs review.

Needed:

- Queued, running, completed, failed, needs-review states
- Owner and project scope
- Source links and artifacts
- Human review actions
- Recurring schedules
- "Why did this run?" explanation
- "What changed because of this?" outcome tracking

Examples:

- Nightly drawing conflict scan
- Weekly stale RFI review
- Daily executive brief generation
- New document classification
- New meeting transcript action extraction
- Historical-similarity search for active risks
- Estimate/schedule variance monitor

Product value:
AI becomes visible labor. The team sees the system working for them.

### 6. Field Innovation Intake

Problem:
The people closest to the work have the most valuable operational ideas, but there is no structured path from field insight to AI capability.

Needed:

- "Teach Alleato" submission flow
- Workflow idea intake
- Example upload
- Before/after explanation
- PM/field review
- AI skill candidate generation
- Voting/prioritization
- Pilot-to-production status

Product value:
Change management improves because the team is not being handed an opaque tool. They are helping train and shape it.

## Gap Matrix

| Capability | OpenClaw/Hermes pattern | Alleato current state | Gap severity | Recommended Alleato implementation |
|---|---|---|---|---|
| Visible memory | User can inspect/shape durable memory and workspace files. | Memory tables and APIs exist; user-facing governance is limited. | Critical | Build Memory Center with review, edit, pin, expire, source, and answer-usage trace. |
| Workflow learning | Hermes-style learning loop creates/improves skills. | Learning services exist, but promotion is not visible or consistently productized. | Critical | Build correction-to-learning pipeline and review queue. |
| Skills | Skills are first-class files/modules. | Some backend skills exist; no unified product library. | Critical | Build Skill Library with field-submitted, approved, versioned skills. |
| Subagents | Parent can spawn isolated workers with explicit context. | Backend Deep Agents has subagents, but main assistant does not expose general delegation. | High | Build AI work-run model with subagent runs, reports, and parent synthesis. |
| Background work | Scheduled automations and async tasks are core. | Crons and pipelines exist, but not user-visible as agent work. | High | Build AI Work Queue over existing jobs and new delegated runs. |
| User participation | Users can correct, teach, and shape behavior. | Feedback exists but feels like bug reporting, not co-creation. | High | Build Teach Alleato flow for ideas, examples, corrections, and skill candidates. |
| Multi-channel presence | Agents operate in chat channels and push results. | Teams/email delivery exists for briefs; assistant primarily lives in app. | Medium | Keep app as source of truth, expand Teams/email push for work queue results. |
| Runtime portability | Agents run local/cloud/VPS with pluggable models. | Alleato runs app/backend provider paths via AI Gateway/OpenAI. | Medium | Keep provider abstraction; do not chase runtime portability unless needed. |
| Plain-file inspectability | Memory/skills can be grep/read/edited. | Mostly DB-backed. | Medium | Add export/import for approved skills and memory snapshots, but keep DB canonical. |
| Self-evolving skills | Agent proposes skill changes after use. | Not yet productized. | Medium | Start human-reviewed; do not allow autonomous skill changes without review. |

## Implementation Roadmap

Implementation detail for the first build slice lives in `docs/ai-plan/AI-OS-PHASE-1-IMPLEMENTATION-PLAN.md`.

### Phase 1: Make Memory Trustworthy And Visible

Goal:
Users can see what Alleato AI remembers and fix it.

Build:

- Memory Center page
- Memory candidate approval queue
- Memory source/evidence display
- Pin/expire/delete/edit actions
- "Why this memory was used" trace on assistant answers
- Admin view for team/project memories

Success criteria:

- User can correct a bad memory without developer help.
- Assistant answers can show which memories influenced them.
- Incorrect memories fail loudly through review/trace instead of silently steering answers.

### Phase 2: Build The Skill Library

Goal:
Field knowledge becomes reusable company operating procedure.

Build:

- Skill model: title, owner, scope, status, version, body, examples, evals
- Skill candidate queue from corrections and field submissions
- Approved skills injected into the right agent contexts
- Skill usage analytics
- Skill review workflow

Success criteria:

- A PM can submit "how we handle this" and turn it into a reviewed skill.
- The assistant can cite which skill it followed.
- Bad behavior can be fixed by updating a skill instead of changing code.

### Phase 3: Correction-To-Learning Pipeline

Goal:
Every correction becomes structured improvement.

Build:

- Correction classifier
- Learning candidate generator
- Promotion review queue
- Destinations: memory, skill, eval, retrieval feedback, agent learning, attribution rule
- Outcome tracking through `agent_learning_usages`

Success criteria:

- A thumbs-down with reason creates a reviewable learning candidate.
- Repeated corrections are grouped into one durable rule.
- Approved learnings are measured for future usefulness.

### Phase 4: Subagent Delegation And AI Work Queue

Goal:
Alleato AI can delegate work and show its work.

Build:

- Add a future work-run control table; there is no `ai_work_runs` table yet.
- Add a future child-run/step table; there is no `ai_work_run_steps` table yet.
- parent-agent planner
- subagent runtime wrapper around existing backend Deep Agents
- work queue UI
- artifact/report persistence
- failure-loud status and retry rules

Success criteria:

- User can ask: "Review these drawings against RFIs and past issues."
- Parent agent spawns drawing, RFI, historical, and schedule subagents.
- User receives one synthesized report with sources, confidence, and review actions.

### Phase 5: Field Innovation Loop

Goal:
The team helps create the AI system.

Build:

- "Teach Alleato" UI
- Field idea intake
- Example upload
- Skill candidate generation
- Internal voting/prioritization
- Pilot status tracking
- Before/after success stories

Success criteria:

- Field users can submit workflows and examples without needing to understand prompts or code.
- Approved field ideas become skills, evals, or automations.
- Team members can see that their input changed how Alleato AI works.

## First Product Slice

The fastest high-impact slice is:

1. Memory Center
2. Skill Library
3. Teach Alleato intake
4. Correction-to-learning review queue

Do not start with fully autonomous subagents. First make memory and skills visible, trustworthy, and participatory. Once the team can see and shape what the AI knows, subagent delegation becomes much safer and more credible.

## Proposed Internal Message

Alleato AI is not just a chatbot we are building for the team. It is becoming a shared company intelligence system the team can help train.

The next step is to make the AI's memory, skills, and learning process visible. When someone in the field corrects the AI, teaches it a better workflow, or shows it how a project issue was actually handled, that should become reusable company knowledge after review.

This gives the team ownership. It also gives Alleato a compounding advantage: every project, correction, RFI, drawing issue, estimate, schedule lesson, and field insight can make the system smarter for the next project.

## Guardrails

- Alleato remains the source of truth.
- External agent frameworks may inspire the design, but project data stays in Alleato-controlled systems.
- Skills and memories require ownership, evidence, and review.
- No autonomous write-back without existing confirmation/audit rules.
- Subagents must have scoped tools, bounded runtime, and parent review.
- Every AI work run must show status, sources, confidence, and failure reason.
- Field contributions must be celebrated but still reviewed before becoming durable behavior.

## Bottom Line

OpenClaw and Hermes are popular because they make AI feel persistent, trainable, delegated, and alive.

Alleato already has stronger construction-specific data and workflow context. The opportunity is to add the missing AI OS layer:

- visible memory
- visible skills
- visible learning
- visible background work
- visible field contribution

That is the path to better buy-in, stronger change management, and a genuinely compounding internal AI platform.
