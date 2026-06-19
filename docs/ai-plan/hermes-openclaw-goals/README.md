# Hermes/OpenClaw AI Assistant Goals

This folder turns the research report at `_bmad-output/planning-artifacts/research/technical-hermes-openclaw-vs-alleato-ai-research-2026-06-19.md` into goal-sized implementation documents.

The local source clones are available in the repo root:

- `openclaw/` - OpenClaw Foundation, MIT, TypeScript/Node. Prefer copying small self-contained TS modules when the shape fits Alleato.
- `hermes-agent/` - Nous Research, MIT, Python. Prefer adapting designs into Alleato TypeScript/Supabase patterns unless the source is a tiny pure utility.

Do not commit either clone wholesale. Use them as local source references, copy only intentional files or logic, and preserve MIT attribution headers for substantially copied code.

## Execution Order

1. [Goal 1 - Net Policy Closeout](goal-01-net-policy-closeout.md)
2. [Goal 2 - Outbound Action Policy](goal-02-outbound-action-policy.md)
3. [Goal 3 - Operator Presentation](goal-03-operator-presentation.md)
4. [Goal 4 - Session Search](goal-04-session-search.md)
5. [Goal 5 - Hybrid RAG Ranking](goal-05-hybrid-rag-ranking.md)
6. [Goal 6 - Context Compaction](goal-06-context-compaction.md)
7. [Goal 7 - Later High-Risk Work](goal-07-later-high-risk-work.md)

Deferred items from the research report are intentionally not first-class implementation goals yet:

- C1 tool-call repair: deferred until a non-OpenAI/provider-prose tool-call surface exists.
- C3a think scrubber: deferred until a model streams `<think>` or `<reasoning>` into user-visible content.
- C4 normalization core: defer until the next webhook, Teams callback, or untrusted JSON boundary needs it.

## Required Per-Goal Setup

Before code changes for any goal:

- Create or link a Linear issue.
- Create a task markdown file in `docs/ops/tasks/YYYY-MM-DD-<goal-slug>.md` from `docs/ops/tasks/TASK-TEMPLATE.md`.
- Create or update the worker handoff when this is part of parallel orchestration.
- Record the source clone paths being copied, adapted, or referenced.
- For AI SDK/tool execution changes, use the AI SDK skill and verify current APIs from local `node_modules/ai/docs` or `node_modules/ai/src`.

## Copy/Adapt/Reference Rules

- COPY: transplant small, self-contained code when OpenClaw/Hermes already solved the exact failure mode. Keep MIT headers.
- ADAPT: port the architecture or algorithm into Alleato's existing primitives, services, and Supabase schemas. Prefer fresh TypeScript over mechanical translation from Python.
- REFERENCE: study the model but build a smaller Alleato-native version. Do not import full gateway, plugin, or daemon frameworks.

## Verification Rules

- Main thread handles implementation, short targeted checks, and integration decisions.
- Delegate `typecheck`, `lint`, `build`, full test suites, and long eval runs to a cheaper verification sub-agent.
- RAG-touching work updates `docs/architecture/AI-RAG-ARCHITECTURE.md`, `docs/architecture/tables.yaml`, and runs `npm run db:inventory`.
- Migration work is not complete until the migration is applied or explicitly `Blocked/Deferred` and verified with the migration ledger command.
- Close finished work through `npm run codex:finish -- --message "<message>" --files <task-owned paths>`.

## Failure-Loudly Standard

Every goal must answer:

- What specific failure is prevented?
- Where is it detected?
- What message or status will make it visible?
- Which guardrail test would fail if the behavior regresses?
- Which old or duplicate path is archived, deleted, or explicitly marked deprecated?
