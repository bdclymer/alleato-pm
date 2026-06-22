# OpenClaw Filetree Control Map

Source reviewed: [openclaw/openclaw](https://github.com/openclaw/openclaw.git), shallow clone of the main branch.

Purpose: map OpenClaw by subsystem ownership so we can model the useful product/runtime patterns without copying implementation details. "Controls" means the runtime, integration boundary, user flow, policy layer, package contract, or operational surface owned by that path.

## Executive Summary

OpenClaw is a TypeScript/Node monorepo for a local-first, multi-channel personal AI assistant. Its core product shape is a long-running Gateway daemon that owns channels, WebSocket clients, nodes, sessions, tools, scheduler, configuration, and an embedded agent runtime.

The important OpenClaw patterns are:

- Gateway as the single control plane for channels, sessions, tools, nodes, events, and agent runs.
- Strict JSON5 configuration with schema validation, hot reload, and last-known-good behavior.
- A typed WebSocket protocol for CLI, web UI, companion apps, nodes, and automation clients.
- A large extension system where channels, providers, media, memory, search, tools, and migrations live as plugin-like packages.
- Reusable package boundaries under `packages/*` for protocol, SDK, agent core, LLM runtime, media, memory, terminal, and web content.
- OpenClaw-owned embedded agent runner under `src/agents/`, with provider streams, compaction, tools, skill loading, session wiring, and fallback handling.
- Gateway-owned state with SQLite-backed cron/task state plus per-agent JSONL transcripts.
- Companion apps and nodes for macOS, iOS, Android, Windows-style hub flows, local voice/canvas, and device commands.

For Alleato, the strongest ideas to model are Gateway-style event normalization, strict config/schema control, extension package boundaries, channel/tool policy layers, background task records, and a Control UI backed by the same runtime schema.

## Runtime Control Flow

```text
Inbound surface
  channel plugin / CLI / Control UI / node / webhook / cron / ACP
    -> Gateway daemon
      -> typed WS/RPC method or normalized channel event
      -> session routing and policy checks
      -> embedded agent runner
        -> prompt/bootstrap/skills/context assembly
        -> provider runtime and model fallback
        -> tool construction and policy filtering
        -> model stream / tool calls / compaction
      -> state/transcript/task updates
      -> delivery through channel, WS event, webhook, or Control UI
```

## Top-Level Filetree

```text
openclaw/
+-- README.md
|   Controls public product positioning, install instructions, security defaults, channel list, quick start, and development setup.
+-- VISION.md
|   Controls product direction and long-term narrative.
+-- package.json
|   Controls npm package metadata, `openclaw` binary, exports, release files, scripts, package boundaries, and root dependency policy.
+-- pnpm-workspace.yaml
|   Controls workspace membership for root, `ui`, `packages/*`, and `extensions/*`; also controls dependency age, overrides, patched deps, and allowed builds.
+-- openclaw.mjs
|   Controls the installed npm executable wrapper.
+-- src/
|   Controls the main TypeScript runtime: CLI, Gateway, embedded agent runner, tools, channels, config, sessions, cron, plugin SDK, state, and provider runtime.
+-- packages/
|   Controls reusable internal/public packages with explicit contracts for agent core, Gateway protocol/client, plugin SDK, LLM, memory, terminal, speech, media, and web content.
+-- extensions/
|   Controls bundled extension packages for channels, model providers, web/search providers, media providers, memory, diagnostics, migrations, and feature plugins.
+-- skills/
|   Controls bundled AgentSkills-compatible instruction packs.
+-- apps/
|   Controls companion/native apps for Android, iOS, macOS, macOS MLX TTS, shared app code, and Swabble.
+-- ui/
|   Controls the Vite/React Control UI served by the Gateway.
+-- docs/
|   Controls the Mintlify documentation site, architecture docs, channel guides, tool docs, security docs, generated docs, and assets.
+-- scripts/
|   Controls build, release, verification, docs, install, Docker, mobile, plugin, security, performance, and QA automation.
+-- test/
|   Controls top-level Vitest/e2e/test project configuration and root-level integration checks.
+-- qa/
|   Controls QA harness, scenarios, frontier harness planning, and Convex credential broker.
+-- security/
|   Controls security docs and opengrep rule metadata.
+-- config/
|   Controls shared tsconfig, lint, format, markdown, SwiftLint/SwiftFormat, and dead-code config.
+-- deploy/, fly.toml, render.yaml, docker-compose.yml, Dockerfile
|   Control deployment recipes and container/runtime hosting configuration.
+-- git-hooks/
|   Controls repository git hook installation.
+-- patches/
|   Controls patched dependency overlays.
+-- .github/
|   Controls CI, workflows, labels, CodeQL, Codex/agent instructions, issue templates, dependency automation, and PR templates.
`-- taxonomy.yaml
    Controls repo taxonomy/classification metadata.
```

## Core Runtime: `src/`

```text
src/
+-- entry.ts
|   Controls the Node CLI process entrypoint, compile cache, respawn behavior, profile/container flags, root help fast paths, version fast path, and main command loading.
+-- index.ts, library.ts, runtime.ts
|   Control package runtime exports and library entry behavior.
+-- global-state.ts, globals.ts
|   Control process-wide runtime state.
+-- logger.ts, logging.ts
|   Control logging setup and diagnostic output.
+-- cli/
|   Controls Commander-based CLI commands, argument handling, root help, profiles, container targeting, Windows argv normalization, startup metadata, and user command UX.
+-- commands/
|   Controls command implementations shared by CLI/Gateway-facing flows.
+-- config/
|   Controls JSON5 config loading, schema validation, strict startup behavior, hot reload, last-known-good behavior, generated schema, and docs metadata.
+-- gateway/
|   Controls the Gateway daemon, WebSocket server, RPC methods, HTTP server, client/node handshake, server-push events, plugin HTTP surfaces, and Gateway tests.
+-- channels/
|   Controls normalized channel events, message access policy, allowlists, transport abstractions, outbound messages, status issues, and channel plugin contracts.
+-- agents/
|   Controls the embedded agent runtime, agent tools, bootstrap files, session wiring, compaction, provider streams, auth profile resolution, model discovery, sandboxing, skill loading, and runtime hooks.
+-- tools/
|   Controls shared built-in tool surfaces and tool-related helpers outside the larger `src/agents/*` tool implementation files.
+-- sessions/
|   Controls session abstractions outside the agent-specific session runtime.
+-- cron/
|   Controls Gateway scheduler, cron store, isolated agent runs, run logs, timeout handling, task creation, and cron service behavior.
+-- tasks/
|   Controls background task records and task lifecycle surfaces.
+-- provider-runtime/
|   Controls model/provider runtime resolution and provider execution support.
+-- llm/
|   Controls LLM provider registry, model catalog integration, transport helpers, and provider-specific stream implementations.
+-- model-catalog/
|   Controls model catalog data and lookup behavior.
+-- mcp/
|   Controls MCP integration and related runtime setup.
+-- memory/
|   Controls memory features and memory runtime integration.
+-- memory-host-sdk/
|   Controls memory-host-facing SDK integration.
+-- plugin-sdk/
|   Controls plugin-facing SDK barrels, helper contracts, runtime APIs, and test helpers.
+-- plugins/
|   Controls plugin discovery/loading and runtime plugin orchestration.
+-- plugin-state/
|   Controls persisted plugin state.
+-- image-generation/, media-generation/, music-generation/, video-generation/
|   Control media generation surfaces and provider abstractions.
+-- media/, media-understanding/, link-understanding/
|   Control media parsing, understanding, and link extraction.
+-- tts/, speech/realtime-related dirs
|   Control text-to-speech and speech runtime features.
+-- realtime-transcription/, transcripts/
|   Control realtime transcription and transcript handling.
+-- web-fetch/, web-search/
|   Control web content fetching/search provider surfaces.
+-- acp/
|   Controls Agent Client Protocol server/client, approvals, permission relay, translator, session mapping, and event ledger.
+-- node-host/, nodes-related surfaces
|   Control paired device/node command handling and node host integration.
+-- pairing/
|   Controls device/channel pairing stores and approval flows.
+-- daemon/
|   Controls launchd/systemd daemon/service management.
+-- state/
|   Controls shared state database/storage helpers.
+-- secrets/
|   Controls secret storage and secret resolution.
+-- security/
|   Controls runtime security checks and policy helpers.
+-- routing/
|   Controls agent/channel routing decisions.
+-- tui/, interactive/
|   Control terminal UI and interactive runtime surfaces.
+-- wizard/
|   Controls onboarding/configuration wizard flows.
+-- auto-reply/, commitments/, heartbeat/adjacent runtime dirs
|   Control automated reply/commitment-style runtime workflows.
+-- infra/, process/, bootstrap/, compat/, utils/, shared/
|   Control infrastructure helpers, subprocess execution, bootstrap utilities, compatibility shims, general utilities, and shared types.
+-- i18n/
|   Controls localization.
+-- docs/
|   Controls runtime docs generation/support code.
+-- test-helpers/, test-utils/
|   Control shared test support.
`-- types/
    Controls shared TypeScript type definitions.
```

## Embedded Agent Runtime: `src/agents/`

```text
src/agents/
+-- embedded-agent-runner/
|   Controls the built-in agent attempt loop, model/provider selection, provider stream adapters, context/compaction, prompt cache behavior, session history, fallback, tool construction, delivery evidence, run state, and abort handling.
+-- embedded-agent-runner/run/
|   Controls the inner attempt lifecycle: setup, system prompt assembly, LLM boundary, tool-call normalization/repair, transcript policy, auth controller, fallbacks, failover policy, timeout/idle breakers, payload conversion, and runtime cleanup.
+-- sessions/
|   Controls agent session persistence, skill/resource discovery, prompts, themes, TUI-backed tool renderers, compaction helpers, and extension loading.
+-- agent-tools*.ts
|   Control OpenClaw-owned tool definitions, schemas, tool policy, parameters, message-provider policy, before/after tool hooks, read/edit/write/exec behavior, and host edit access.
+-- bash-tools*.ts
|   Control shell/exec/process tools, approvals, PTY behavior, node-host execution, output handling, process registry, and safe-bin rules.
+-- apply-patch*.ts
|   Control patch application and path validation.
+-- agent-hooks/
|   Controls built-in runtime hooks such as context pruning and compaction safeguards.
+-- auth-profiles/
|   Controls auth profile storage, rotation, cooldowns, discovery, and health.
+-- cli-runner/
|   Controls external CLI-backed agent runtime execution.
+-- command/
|   Controls agent command handling.
+-- runtime/
|   Controls the facade around `@openclaw/agent-core` and local proxy utilities.
+-- runtime-plan/
|   Controls runtime plan/selection behavior.
+-- sandbox/
|   Controls sandbox setup and policy for non-main sessions.
+-- schema/
|   Controls agent schema definitions.
+-- modes/
|   Controls agent runtime modes such as interactive mode.
+-- harness/
|   Controls test/runtime harness support.
+-- templates/
|   Controls workspace/bootstrap templates.
+-- tools/
|   Controls subdirectories for specific agent tools and renderers.
+-- utils/
|   Controls agent-specific helpers.
`-- AGENTS.md
    Controls local contributor/agent instructions for the agent runtime subtree.
```

## Gateway, Channels, and Protocol

```text
src/gateway/
+-- server/
|   Controls WebSocket/HTTP server, handshake, auth, node/client connections, event push, plugin HTTP routes, and server tests.
+-- methods/
|   Controls Gateway RPC method implementation.
+-- server-methods/
|   Controls method registration and server method grouping.
+-- server/ws-connection/
|   Controls WebSocket connection lifecycle.
+-- server/plugins-http/
|   Controls plugin-provided HTTP endpoints.
+-- test/
|   Controls Gateway test helpers.

src/channels/
+-- plugins/
|   Controls channel plugin contracts, action registration, outbound adapters, and plugin status issues.
+-- inbound-event/
|   Controls normalized inbound event shapes.
+-- message/
|   Controls message construction and transformation.
+-- message-access/
|   Controls access checks for message actions.
+-- allowlists/
|   Controls channel/user/group allowlist behavior.
+-- transport/
|   Controls channel transport abstractions.
+-- turn/
|   Controls channel turn handling.
`-- status/
    Controls channel health/status reporting.

packages/gateway-protocol/
|   Controls typed Gateway protocol schemas and contracts.
packages/gateway-client/
|   Controls reusable client package for Gateway connections.
```

## Configuration, State, Sessions, and Scheduling

```text
src/config/
|   Controls strict config schema, JSON5 parsing, config writes, hot reload, generated docs/schema, plugin/channel schema merge, and validation failure behavior.

src/state/
|   Controls shared database/state helpers.

src/sessions/
|   Controls session-related shared runtime logic.

src/agents/sessions/
|   Controls the agent-facing transcript/session runtime.

src/cron/
+-- store/
|   Controls SQLite-backed cron job storage and migration away from legacy JSON files.
+-- service/
|   Controls scheduler runtime, due-job detection, run execution, and Gateway integration.
+-- isolated-agent/
|   Controls fresh isolated agent-session cron runs, model/tool overrides, timeout handling, and cleanup.
+-- run-log/
|   Controls cron run history and durable run evidence.
`-- root files
    Control cron command/RPC surfaces, validation, failure notifications, delivery behavior, and task reconciliation.

docs/automation/cron-jobs.md
|   Documents cron behavior: schedule types, isolated/main/custom sessions, command payloads, delivery, model overrides, failure handling, and watchdog behavior.
```

## Packages

```text
packages/
+-- agent-core/
|   Controls reusable agent core contracts: messages, compaction helpers, tool/session contracts, prompt templates, and lower-level harness types.
+-- llm-core/
|   Controls shared LLM type contracts.
+-- llm-runtime/
|   Controls reusable LLM runtime behavior.
+-- gateway-protocol/
|   Controls typed Gateway protocol schema.
+-- gateway-client/
|   Controls reusable Gateway client implementation.
+-- plugin-sdk/
|   Controls public plugin authoring SDK.
+-- plugin-package-contract/
|   Controls plugin package manifest/contract types.
+-- sdk/
|   Controls broader OpenClaw public SDK.
+-- acp-core/
|   Controls reusable Agent Client Protocol core types/helpers.
+-- terminal-core/
|   Controls reusable terminal/process contracts.
+-- memory-host-sdk/
|   Controls memory host SDK contracts.
+-- model-catalog-core/
|   Controls model catalog contracts.
+-- net-policy/
|   Controls network policy contracts/helpers.
+-- normalization-core/
|   Controls normalization helpers shared across packages.
+-- markdown-core/
|   Controls markdown rendering/parsing helpers.
+-- media-core/
|   Controls shared media contracts.
+-- media-generation-core/
|   Controls shared media generation contracts.
+-- media-understanding-common/
|   Controls media understanding shared contracts.
+-- speech-core/
|   Controls OpenClaw speech runtime package.
+-- tool-call-repair/
|   Controls model tool-call repair helpers.
`-- web-content-core/
    Controls web content extraction/fetch contracts.
```

## Extensions

```text
extensions/
+-- channel extensions
|   Control messaging/channel adapters such as discord, slack, telegram, whatsapp, signal, imessage, matrix, mattermost, msteams, googlechat, feishu, line, nextcloud-talk, nostr, synology-chat, tlon, twitch, qqbot, wechat/tencent-adjacent providers, zalo, zalouser, irc, sms, and webhooks.
+-- model provider extensions
|   Control model/provider integrations such as openai, anthropic, anthropic-vertex, amazon-bedrock, azure/microsoft-foundry, google, openrouter, ollama, lmstudio, litellm, deepseek, groq, mistral, qwen, kimi/moonshot, xai, zai, nvidia, together, cerebras, cohere, chutes, fireworks, huggingface, llama-cpp, vllm, sglang, venice, novita, byteplus, qianfan, volcengine, xiaomi, and more.
+-- web/search extensions
|   Control brave, exa, firecrawl, duckduckgo, parallel, perplexity, searxng, tavily, web-readability, and related web fetch/search providers.
+-- media extensions
|   Control image/video/music/speech providers and core media packages such as fal, comfy, runway, pixverse, elevenlabs, deepgram, azure-speech, senseaudio, tts-local-cli, image-generation-core, video-generation-core, media-understanding-core, and document-extract.
+-- memory extensions
|   Control active-memory, memory-core, memory-lancedb, and memory-wiki.
+-- tool/runtime extensions
|   Control browser, canvas, diffs, llm-task, file-transfer, phone-control, codex, codex-supervisor, opencode, open-prose, openshell, kilocode, kimi-coding, policy, workboard, qa-lab, qa-channel, qa-matrix, admin-http-rpc, acpx, and diagnostics.
+-- migration extensions
|   Control migrate-claude and migrate-hermes paths.
+-- package-level structure
|   Each extension generally owns package.json, index.ts, optional README, local src files, and plugin manifest metadata consumed by the plugin/package runtime.
`-- AGENTS.md
    Controls contributor/agent instructions for extension package boundaries.
```

## Skills

```text
skills/
|   Controls bundled AgentSkills-compatible instruction packs. Examples include 1password, apple-notes, apple-reminders, bear-notes, blogwatcher, canvas, clawhub, coding-agent, diagram-maker, discord, github, healthcheck, himalaya, imsg, mcporter, meme-maker, model-usage, nano-pdf, notion, obsidian, openai-whisper, openhue, oracle, python-debugpy, session-logs, slack, spotify-player, summarize, taskflow, taskflow-inbox-triage, tmux, trello, video-frames, voice-call, weather, and xurl.

docs/tools/skills.md
|   Documents skill precedence: workspace, workspace `.agents/skills`, personal `~/.agents/skills`, managed `~/.openclaw/skills`, bundled, then extra/plugin skill dirs.
```

## Apps, UI, and Nodes

```text
apps/
+-- macos/
|   Controls macOS menu bar app, Voice Wake, push-to-talk overlay, WebChat/debug tools, and remote Gateway control.
+-- ios/
|   Controls iOS node app and device pairing.
+-- android/
|   Controls Android node app, chat/voice/canvas/camera/screen/device command features.
+-- macos-mlx-tts/
|   Controls local macOS MLX TTS support.
+-- shared/
|   Controls shared app code.
`-- swabble/
    Controls Swabble app/package surface.

ui/
+-- src/
|   Controls Control UI frontend.
+-- public/
|   Controls Control UI assets.
+-- package.json, vite.config.ts, vitest*.ts
|   Control Control UI build/test/runtime config.
`-- docs/
    Controls UI-specific documentation.
```

## Docs, Operations, and Tests

```text
docs/
|   Controls public docs: getting started, architecture, agent runtime, Gateway, channels, plugins, tools, automation, security, web, platforms, providers, specs, generated docs, and assets.

scripts/
|   Controls build, release, packaging, docs generation, CI checks, codegen, mobile release, Docker e2e, plugin release, dependency/security gates, perf benchmarks, QA, and verification.

test/
|   Controls root-level Vitest/e2e suites, global setup, package-manager tests, plugin release tests, UI presenter tests, and test project configs.

src/**/*.test.ts and extensions/**/*.test.ts
|   Control colocated unit/integration coverage by subsystem.

qa/
|   Controls scenario harnesses and frontier/live QA planning.

security/
|   Controls security docs and opengrep rules.
```

## Feature Patterns Worth Modeling

### 1. Gateway as Product Control Plane

OpenClaw treats the Gateway as the owner of channels, WebSocket clients, nodes, auth, sessions, cron, tools, events, and delivery.

Alleato implication: a project-intelligence Gateway could normalize Teams, email, web chat, admin actions, scheduled jobs, and webhook events into one event/task/session plane.

### 2. Strict Runtime Configuration

OpenClaw validates `~/.openclaw/openclaw.json` strictly; malformed config prevents startup, and Control UI renders fields from the live schema.

Alleato implication: AI operations should have schema-backed configuration for providers, tool policy, schedules, delivery targets, and safety gates. Silent config drift should fail loudly.

### 3. Extensions as Product Modules

OpenClaw keeps provider/channel/media/search/runtime features in `extensions/*`, each with package metadata and SDK boundaries.

Alleato implication: Procore, Acumatica, Microsoft Graph, Fireflies, Teams, document extraction, and future providers should be extension-shaped modules with manifest metadata and health/config contracts.

### 4. Packages as Contract Boundaries

OpenClaw uses `packages/*` for reusable contracts instead of letting every extension import `src/**`.

Alleato implication: shared AI tool contracts, event envelopes, evidence references, provider runtime types, and Gateway client types should live in stable packages/modules.

### 5. Channel Event Normalization

Channel plugins normalize platform-specific events into common Gateway events before agent handling.

Alleato implication: Teams messages, email replies, project comments, and webhook triggers should map into one normalized event shape with source, actor, project, thread, permissions, and delivery target.

### 6. Background Tasks and Cron Are Runtime-Owned

Cron is Gateway-owned, stored in shared SQLite state, creates task records, supports isolated sessions, command payloads, delivery modes, failures, and run logs.

Alleato implication: scheduled briefs and source sync audits should be durable task records with run logs, not hidden scripts or ad hoc cron invocations.

### 7. Skills Are Precedence-Aware

OpenClaw has explicit skill load precedence and per-agent allowlists.

Alleato implication: project-specific, company-wide, and user-specific AI operating instructions should have clear precedence and visibility rules.

### 8. Tool Visibility Is Policy-Filtered

Tools are only exposed after profile, allow/deny policy, provider restrictions, sandbox state, channel permissions, and plugin availability.

Alleato implication: AI tools should be filtered by route, role, project permissions, execution environment, and provider capability before the model sees them.

## Guardrails to Copy

- Strict config validation with startup refusal for unknown/malformed fields.
- Device/channel pairing for untrusted inbound channels.
- Channel allowlists and group mention gating.
- Gateway-owned session routing with explicit DM/group/cron/webhook isolation.
- Schema-backed Gateway protocol and generated client contracts.
- Tool policy applied before model calls.
- Extension/package import boundary checks.
- Background task records for scheduled and detached work.
- Cron failures and skipped runs recorded separately from successful runs.
- Runtime watchdogs for stalled setup, first model call, no-output, and timeout phases.
- Security audits and doctor/repair commands for risky config.

## Modeling Candidates for Alleato

| OpenClaw concept | Candidate Alleato analog |
| --- | --- |
| Gateway daemon | AI operations gateway for Teams/email/webhooks/admin UI |
| Typed WS/RPC protocol | Internal AI run/event API for Control UI and workers |
| `src/channels` | Normalized source adapters for Teams, Outlook, Fireflies, Procore webhooks |
| `extensions/*` | Integration packages for Procore, Acumatica, Graph, Fireflies, docs, RAG |
| `packages/*` contracts | Shared AI tool/event/evidence/provider packages |
| Strict JSON5 config schema | Schema-backed AI operations config and admin UI |
| `src/cron` | Durable scheduled briefs, source audits, sync repair jobs |
| Skill precedence | Company/project/user AI instruction layering |
| Control UI | Internal AI operations console with live schema, tasks, runs, health |
| Node/device model | Worker/node capabilities for ingestion, browser, document processing |

## Recommended Next Steps

1. Use OpenClaw as the model for the "AI operations control plane" layer, not for user-facing PM screens.
2. Define an Alleato event envelope that can represent Teams messages, emails, Fireflies meetings, Procore events, admin actions, and scheduled jobs.
3. Define extension/package boundaries for Procore, Acumatica, Microsoft Graph, Fireflies, documents, RAG, and delivery.
4. Add a schema-backed AI operations config with validation and read-back health checks.
5. Build durable task/run logs for scheduled briefs and source sync audits before adding more autonomous behavior.
