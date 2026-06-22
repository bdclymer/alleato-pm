# Hermes vs OpenClaw Architecture Comparison

Sources reviewed:

- [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent)
- [openclaw/openclaw](https://github.com/openclaw/openclaw.git)

Companion maps:

- [Hermes Agent Filetree Control Map](./hermes-agent-filetree.md)
- [OpenClaw Filetree Control Map](./openclaw-filetree.md)

## Short Version

Hermes is a Python-first self-improving agent runtime with a strong central `AIAgent`, tool registry, skills, memory, cron, and multi-platform gateway. OpenClaw is a TypeScript/Node local-first assistant platform with a Gateway daemon, strict config schema, typed WebSocket protocol, extension packages, companion apps/nodes, and a large plugin/channel/provider ecosystem.

For Alleato:

- Use Hermes as the model for the agent loop, tool registry, procedural skills, session search, memory, and cron-as-agent-work.
- Use OpenClaw as the model for the operations control plane: Gateway, typed event protocol, strict config, extension package boundaries, channel normalization, task/run logs, and Control UI.
- Do not copy either UI. The reusable value is architecture and guardrails.

## Comparison Table

| Area | Hermes | OpenClaw | Alleato takeaway |
| --- | --- | --- | --- |
| Primary stack | Python runtime with Node workspaces for TUI/web/desktop | TypeScript/Node monorepo with packages, extensions, apps, UI | Alleato should stay in its existing stack, but borrow boundaries |
| Core runtime shape | AIAgent in run_agent.py plus agent/conversation_loop.py | Embedded agent runner under src/agents/embedded-agent-runner | A single shared agent runtime should serve all AI surfaces |
| Product center | Agent that grows through memory, skills, delegation, and tools | Local-first Gateway assistant across channels/devices/apps | Alleato needs both: agent runtime plus AI operations gateway |
| Entry points | CLI, TUI, gateway, ACP, batch, API/server-like surfaces | CLI, Gateway WS/RPC, Control UI, nodes, channels, ACP, cron, apps | Normalize all work into typed runs/events |
| Tool system | Python self-registering tools via tools/registry.py, filtered by toolsets.py | Built-in and plugin-provided TypeScript tools filtered by tool policy/provider/channel/sandbox | Use one registry plus route/role/project policy before model calls |
| Extension model | Plugins can register tools, hooks, CLI commands, memory/context providers | `extensions/*` packages cover providers, channels, media, search, memory, runtime features | Alleato integrations should be extension-like modules with contracts |
| Package boundaries | Mostly Python packages/modules; plugin boundaries exist but core is less package-split | Strong `packages/*` contracts plus import-boundary checks | Put shared AI event/tool/evidence contracts in stable modules |
| Session storage | SQLite state.db with FTS5, messages, sessions, lineage, token/cost metadata | Gateway-owned session store plus per-agent JSONL transcripts; cron/task state in SQLite | Need searchable AI sessions with evidence lineage and task/run records |
| Memory | Built-in memory manager plus memory provider plugin type; Honcho support | Memory extensions and skill/workspace files; memory host SDK | Use explicit memory provider boundaries and evidence-backed recall |
| Skills | Bundled and optional skills; procedural memory; autonomous creation/improvement | Bundled/workspace/managed skills with precedence and ClawHub install flow | Skill-like workflow packs fit project intelligence and briefs |
| Cron | Agent jobs in fresh sessions, JSON job storage in Hermes home, platform delivery | Gateway scheduler, SQLite-backed jobs/runs, isolated/main/custom sessions, task records | Prefer OpenClaw's durable task/run model, with Hermes-style skill injection |
| Gateway/channels | Messaging gateway with platform adapters inside `gateway/platforms` | Gateway is central product control plane with typed WS protocol and channel plugins | Use OpenClaw-style Gateway/event protocol for Teams/email/webhooks |
| Config | YAML config and env loading; CLI setup flows | Strict JSON5 schema, hot reload, Control UI generated from schema, startup refusal on bad config | AI operations config should fail loudly and be schema-backed |
| Provider runtime | Shared runtime resolver with many providers and API modes | Provider extensions plus runtime selection/model allowlists/fallbacks | Separate provider config from agent logic |
| ACP/editor integration | Dedicated `acp_adapter/` package | `src/acp/` and `packages/acp-core` | Useful for internal developer/admin control, not PM end users |
| UI surfaces | CLI/TUI/desktop/web docs/dashboard pieces | Control UI plus native apps/nodes | Alleato should build an internal operations console, not another chat shell |
| Security model | Tool approval, dangerous command checks, gateway pairing/allowlists, container/terminal backends | Strict DM pairing, allowlists, group mention gating, sandbox policy, config audit, protocol auth | Remote/channel AI must be permissioned before run construction |
| Testing/guardrails | Pytest suite; many runtime regression tests | Vitest/e2e matrix, import-boundary scripts, package/extension gates | Add boundary checks and failure-mode tests for AI tools |

## Major Architectural Difference

Hermes starts from the agent loop and grows outward.

```text
agent runtime -> tools -> skills/memory -> gateway/cron/UI
```

OpenClaw starts from the Gateway/control plane and routes inward.

```text
gateway -> channels/clients/nodes/config/state -> embedded agent runtime
```

That difference matters for Alleato. Project intelligence needs a reliable operations plane before it needs more autonomous cleverness. The current product risk is not "we need another chat UI"; it is "events, evidence, schedules, delivery, permissions, and source health need one owner."

## What Hermes Does Better

- Cleaner mental model for the agent loop: prompt, provider, tool dispatch, persistence.
- Straightforward tool registry and toolset filtering.
- Strong procedural skill story, including optional skills and OpenClaw migration skill.
- Session search with SQLite/FTS is explicit and central.
- Agent cron jobs are conceptually simple: skill/script context plus prompt plus delivery.
- Python is convenient for research/data-agent style workflows.

Best Alleato modeling targets from Hermes:

- Tool registry and toolsets.
- Skill-backed workflows.
- Session search and compression lineage.
- Delegation/subagent interfaces.
- Memory provider abstraction.
- Tool result classification and failure wrapping.

## What OpenClaw Does Better

- Stronger control-plane architecture through Gateway.
- Clearer package/extension boundaries.
- Strict configuration schema and generated Control UI.
- More mature channel/device/node thinking.
- Better runtime-owned background task/cron evidence.
- Stronger import-boundary and package-boundary guardrails.
- More explicit untrusted-channel security posture.

Best Alleato modeling targets from OpenClaw:

- Typed event/RPC protocol.
- Channel event normalization.
- Extension packages for integrations.
- Schema-backed AI operations config.
- Durable background tasks and run logs.
- Control UI generated from live schema and runtime state.
- Gateway-owned session routing and delivery policy.

## Recommended Hybrid for Alleato

```text
Alleato AI Operations Gateway
  - normalized inbound events
  - typed run/task/session API
  - strict config + health
  - source/channel adapters
  - durable task/run ledger

Shared Agent Runtime
  - project intelligence runner
  - tool registry + toolsets
  - skill/workflow packs
  - provider runtime
  - evidence/session storage
  - source-linked response contracts

Integration Extensions
  - Procore
  - Acumatica
  - Microsoft Graph / Teams / Outlook
  - Fireflies
  - Documents/RAG
  - delivery adapters

Internal Control UI
  - runs
  - tasks
  - config/schema
  - source health
  - tool availability
  - evidence drilldown
```

## Design Rules to Adopt

1. One event envelope for every inbound source.
2. One run ledger for every AI action, scheduled or interactive.
3. One tool registry with availability checks.
4. Tool visibility decided before the model call.
5. Every source claim carries evidence references.
6. Every scheduled job records run history, skipped state, failure state, and delivery state.
7. Config is schema-backed and startup/readiness fails loudly on invalid AI operations config.
8. Integrations live behind extension contracts, not scattered route-level imports.
9. Skills/workflows are versioned instruction packs with explicit allowed tools.
10. Control UI shows operational state; PM-facing UI stays quiet and workflow-focused.

## First Feature Slice to Build

Start with Executive Daily Brief as the proof slice.

Why this slice:

- It needs scheduled execution.
- It needs source health.
- It needs project-aware evidence.
- It needs delivery to Teams/email.
- It needs a repeatable skill/workflow.
- It needs durable task/run history.
- It can fail loudly when evidence is missing.

Suggested architecture for the slice:

```text
daily-brief schedule
  -> AI operations gateway task
  -> project evidence source adapters
  -> brief skill/workflow pack
  -> project-intelligence agent runtime
  -> evidence-linked generated packet
  -> Teams/email delivery adapter
  -> run log + source health + delivered artifact
```

## Key Difference in Risk

Hermes risk for Alleato: copying an agent-first architecture can produce impressive isolated chats while leaving operational source ownership fragmented.

OpenClaw risk for Alleato: copying a gateway/platform architecture can overbuild infrastructure before proving one high-value workflow.

Recommended path: build the OpenClaw-style control plane only as far as needed to make one Hermes-style workflow reliable, evidence-backed, scheduled, and delivered.
