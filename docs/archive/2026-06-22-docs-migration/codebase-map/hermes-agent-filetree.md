# Hermes Agent Filetree Control Map

Source reviewed: [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent), shallow clone of the main branch.

Purpose: map the Hermes repository by subsystem ownership so we can model useful OpenClaw/Hermes-style features without copying blindly. "Controls" below means the runtime, user flow, configuration surface, or integration boundary owned by that path.

## Executive Summary

Hermes is a Python-first agent runtime with separate UI shells around one core loop. The important pattern is not the terminal UI itself; it is the way Hermes separates:

- Entry points from the agent loop.
- Agent orchestration from tool registration.
- Tool implementations from toolset policy.
- Persistent session history from transient turn state.
- Platform messaging from the core agent.
- Skills, plugins, cron, and MCP as first-class extension surfaces.

For Alleato, the most relevant ideas to model are:

- A shared agent runtime that can be entered from chat, scheduled jobs, Teams/adaptive cards, command tools, and internal admin surfaces.
- A tool registry with availability checks and toolset gating instead of ad hoc tool imports per surface.
- Session storage with searchable history, lineage, compression boundaries, and explicit source tagging.
- Skill-backed workflows for repeatable project-intelligence tasks.
- Gateway-style platform adapters that normalize inbound messages before dispatching to the agent.
- Cron jobs that run agent prompts as isolated sessions and deliver outcomes to channels.

## Runtime Control Flow

```text
User surface
  CLI / TUI / desktop / web / messaging gateway / ACP / batch runner
    -> AIAgent in run_agent.py
      -> agent/conversation_loop.py
      -> agent/prompt_builder.py and agent/system_prompt.py
      -> provider/runtime resolution
      -> model call
      -> model_tools.py
      -> tools/registry.py
      -> concrete tool handler
      -> hermes_state.py session persistence
      -> response returned to original surface
```

## Top-Level Filetree

```text
hermes-agent/
+-- README.md
|   Controls public product positioning, install instructions, command overview, OpenClaw migration summary, and docs index.
+-- pyproject.toml
|   Controls Python packaging, pinned core dependencies, optional dependency extras, console scripts, packaged data, pytest scope, and setuptools package discovery.
|   Notable scripts: hermes -> hermes_cli.main:main, hermes-agent -> run_agent:main, hermes-acp -> acp_adapter.entry:main.
+-- package.json
|   Controls Node workspaces for desktop, web dashboard, and TUI packages. Python remains the primary runtime.
+-- cli.py
|   Controls the classic interactive terminal interface, prompt_toolkit UI, slash command display behavior, streaming display, and input handling.
+-- run_agent.py
|   Controls AIAgent construction, provider calls, model/tool loop entry, message history shape, interruption, fallbacks, and compatibility exports for tests.
+-- model_tools.py
|   Controls tool discovery, tool schema collection, toolset filtering, and function-call dispatch into registered tools.
+-- toolsets.py
|   Controls named bundles of tool access by platform/profile. This is the policy layer between "tools exist" and "the model may use these tools."
+-- toolset_distributions.py
|   Controls packaged toolset presets/distribution metadata.
+-- hermes_state.py
|   Controls SQLite session storage, message persistence, FTS search, session lineage, schema migration, and write contention behavior.
+-- hermes_constants.py
|   Controls HERMES_HOME/profile-aware filesystem locations and shared path constants.
+-- hermes_logging.py
|   Controls shared logging setup, log rotation behavior, and session-aware log context.
+-- hermes_time.py
|   Controls shared time/timezone helpers.
+-- hermes_bootstrap.py
|   Controls early process bootstrap behavior such as Windows UTF-8 stdio safety.
+-- batch_runner.py
|   Controls batch trajectory/task generation flows for research/eval workloads.
+-- trajectory_compressor.py
|   Controls compression of trajectory data for training/evaluation workflows.
+-- mcp_serve.py
|   Controls serving Hermes capabilities through MCP.
+-- mini_swe_runner.py
|   Controls SWE-style benchmark runner integration.
+-- utils.py
|   Controls cross-cutting helpers used across runtime, config, path, and provider code.
+-- cli-config.yaml.example
|   Controls example user configuration shape.
+-- Dockerfile, docker-compose*.yml
|   Control containerized deployment and local service composition.
+-- setup-hermes.sh
|   Controls legacy/setup shell bootstrap path.
+-- scripts/
|   Controls install scripts, release scripts, diagnostics, live tests, catalog builders, setup helpers, and maintenance automation.
`-- tests/
    Controls regression coverage for runtime, CLI, gateway, provider, plugins, tools, install behavior, state DB, and platform adapters.
```

## Core Agent Runtime

```text
agent/
+-- conversation_loop.py
|   Controls the core turn lifecycle: append user message, build prompt, preflight compression, call provider, execute tools, persist response, and return final output.
+-- agent_init.py
|   Controls AIAgent initialization behavior split out of run_agent.py.
+-- agent_runtime_helpers.py
|   Controls helper functions used during agent runtime execution.
+-- prompt_builder.py
|   Controls system prompt assembly from identity, context files, skills, memory, environment hints, and subscription/provider hints.
+-- system_prompt.py
|   Controls stable system instruction tiers and prompt composition policy.
+-- context_engine.py
|   Controls the pluggable interface for context management engines.
+-- context_compressor.py
|   Controls default lossy conversation compression when context pressure rises.
+-- conversation_compression.py
|   Controls conversation-specific compression helpers and preservation rules.
+-- prompt_caching.py
|   Controls provider-specific prompt cache markers, especially Anthropic prefix caching.
+-- context_references.py
|   Controls file/context reference parsing and prompt insertion.
+-- coding_context.py
|   Controls codebase-aware context hints for coding workflows.
+-- turn_context.py
|   Controls per-turn derived metadata supplied to prompts/tools.
+-- turn_finalizer.py
|   Controls post-turn cleanup, persistence, and memory flush behavior.
+-- turn_retry_state.py
|   Controls retry bookkeeping inside a turn.
+-- iteration_budget.py
|   Controls max-turn/iteration limits for parent and delegated agents.
+-- auxiliary_client.py
|   Controls side-channel model calls for summarization, vision, and other helper tasks.
+-- plugin_llm.py
|   Controls LLM access made available to plugins.
+-- memory_manager.py
|   Controls built-in memory lifecycle and dispatch into memory providers.
+-- memory_provider.py
|   Controls the abstract interface for external memory providers.
+-- skill_commands.py
|   Controls slash-command access to skills.
+-- skill_bundles.py
|   Controls packaging/loading of grouped skills.
+-- skill_preprocessing.py
|   Controls skill content preprocessing before insertion into prompt/context.
+-- skill_utils.py
|   Controls shared skill loading and validation helpers.
+-- background_review.py
|   Controls background review/nudge workflows after complex sessions.
+-- curator.py, curator_backup.py
|   Control memory/skill curation behaviors and backup handling.
+-- insights.py
|   Controls usage/session insight generation.
+-- title_generator.py
|   Controls automatic session title generation.
+-- trajectory.py
|   Controls conversion/saving of sessions into training trajectories.
+-- display.py
|   Controls agent progress display primitives shared by CLI/gateway callbacks.
+-- error_classifier.py, errors.py
|   Control typed error classification and failover decisions.
+-- retry_utils.py
|   Controls jitter/backoff retry behavior.
+-- rate_limit_tracker.py, nous_rate_guard.py
|   Control provider-specific rate-limit tracking and Nous subscription guardrails.
+-- usage_pricing.py, account_usage.py, billing_view.py, credits_tracker.py
|   Control token/cost normalization, pricing, account limits, and billing display.
+-- model_metadata.py, models_dev.py
|   Control model context-length metadata, model registry lookup, and token estimates.
+-- chat_completion_helpers.py
|   Controls OpenAI-compatible chat completion call helpers.
+-- codex_responses_adapter.py, codex_runtime.py
|   Control OpenAI Responses/Codex API message conversion and runtime behavior.
+-- anthropic_adapter.py
|   Controls Anthropic Messages API conversion.
+-- bedrock_adapter.py, azure_identity_adapter.py, gemini_*.*, google_*.py, moonshot_schema.py, lmstudio_reasoning.py
|   Control provider-specific auth, schema, and message adaptation.
+-- transports/
|   Controls lower-level transport abstraction across chat completions, Anthropic, Bedrock, Codex, Codex app server, and Hermes tools MCP server.
+-- browser_provider.py, browser_registry.py
|   Control pluggable browser provider selection.
+-- web_search_provider.py, web_search_registry.py
|   Control pluggable web-search provider selection.
+-- image_gen_provider.py, image_gen_registry.py, image_routing.py
|   Control pluggable image-generation provider selection and routing.
+-- video_gen_provider.py, video_gen_registry.py
|   Control pluggable video-generation provider selection.
+-- tts_provider.py, tts_registry.py
|   Control pluggable text-to-speech provider selection.
+-- transcription_provider.py, transcription_registry.py
|   Control pluggable speech-to-text provider selection.
+-- credential_sources.py, credential_pool.py, credential_persistence.py
|   Control credential lookup, pooling, rotation, and persistence.
+-- secret_sources/
|   Controls secure secret-source plugins such as Bitwarden.
+-- message_sanitization.py, think_scrubber.py, redact.py
|   Control sanitization of invalid content, hidden reasoning tags, and sensitive output.
+-- tool_dispatch_helpers.py
|   Controls parallel-tool eligibility, destructive command detection helpers, mutation result extraction, and tool result normalization.
+-- tool_executor.py
|   Controls execution helpers around tool calls.
+-- tool_guardrails.py, tool_result_classification.py
|   Control tool safety guidance, synthetic tool results, and file-mutation classification.
+-- file_safety.py
|   Controls file mutation safety checks.
+-- shell_hooks.py
|   Controls shell lifecycle hooks.
+-- runtime_cwd.py, subdirectory_hints.py
|   Control current-working-directory hints and subdirectory context.
+-- async_utils.py, process_bootstrap.py, ssl_guard.py, stream_diag.py, jiter_preload.py
|   Control runtime safety, async support, stdio/proxy bootstrap, SSL diagnostics, streaming diagnostics, and import preloading.
+-- lsp/
|   Controls language-server installation, protocol interaction, workspace tracking, diagnostics, and code intelligence hooks.
`-- i18n.py
    Controls localized strings loaded from locales/.
```

## CLI, Setup, Profiles, and User Commands

```text
hermes_cli/
+-- main.py
|   Controls the installed `hermes` command, top-level subcommand dispatch, TUI/CLI selection, update/uninstall/version paths, and early startup behavior.
+-- _parser.py
|   Controls argument parsing helpers.
+-- commands.py
|   Controls central slash-command definitions and aliases shared by CLI/gateway.
+-- cli_agent_setup_mixin.py, cli_commands_mixin.py
|   Control how the classic CLI wires an AIAgent and handles user commands.
+-- config.py, fallback_config.py
|   Control default config, config loading/migration, and fallback provider config.
+-- setup.py
|   Controls interactive first-run setup wizard.
+-- env_loader.py
|   Controls `.env` loading from HERMES_HOME and project fallback.
+-- auth.py, auth_commands.py, providers.py, runtime_provider.py
|   Control provider registry, credentials, runtime provider resolution, and auth command flows.
+-- model_switch.py, model_catalog.py, model_setup_flows.py, model_normalize.py, model_cost_guard.py, models.py
|   Control model selection, aliases, model catalog, setup flows, and cost warnings.
+-- nous_account.py, nous_billing.py, nous_subscription.py, portal_cli.py
|   Control Nous Portal account auth, billing, subscription, and tool gateway CLI flows.
+-- tools_config.py
|   Controls `hermes tools` enable/disable behavior and toolset configuration.
+-- skills_config.py, skills_hub.py
|   Control `hermes skills`, Skills Hub browsing, and skill enablement.
+-- plugins.py, plugins_cmd.py
|   Control plugin discovery/loading and plugin CLI management.
+-- mcp_catalog.py, mcp_config.py, mcp_picker.py, mcp_security.py, mcp_startup.py
|   Control MCP catalog, server config, picker UI, security review, and startup behavior.
+-- memory_setup.py, memory_providers.py
|   Control memory provider setup and management.
+-- cron.py
|   Controls `hermes cron` management commands.
+-- gateway.py, gateway_enroll.py, gateway_windows.py, platforms.py
|   Control gateway service start/stop/status, enrollment, Windows service behavior, and platform config.
+-- send_cmd.py
|   Controls command-line message delivery through gateway/platforms.
+-- sessions_listing.py, session_recap.py, active_sessions.py, checkpoints.py, partial_compress.py
|   Control session browsing, recap, active-session status, rollback/checkpoints, and manual compression.
+-- claw.py, migrate.py, codex_runtime_plugin_migration.py
|   Control OpenClaw migration and runtime migration flows.
+-- kanban.py, kanban_db.py, kanban_decompose.py, kanban_diagnostics.py, kanban_specify.py, kanban_swarm.py
|   Control built-in kanban planning/worker-lane workflows.
+-- dashboard_register.py, web_server.py
|   Control dashboard registration and local web server surfaces.
+-- browser_connect.py, container_boot.py, service_manager.py, managed_uv.py, dep_ensure.py
|   Control external runtime dependency management and service/container bootstrap.
+-- backup.py, dump.py, logs.py, doctor.py, status.py, debug.py
|   Control backup/export, diagnostics, logging, doctor checks, status, and debug commands.
+-- profile_describer.py, profile_distribution.py, profiles.py
|   Control multi-profile behavior and profile packaging.
+-- secret_prompt.py, secrets_cli.py
|   Control secret prompting and secret CLI management.
+-- skin_engine.py, colors.py, banner.py, cli_output.py, curses_ui.py, pt_input_extras.py, stdio.py
|   Control terminal presentation, skins, output formatting, and input compatibility.
+-- pty_bridge.py, win_pty_bridge.py, _subprocess_compat.py, psutil_android.py
|   Control PTY/subprocess compatibility across platforms.
+-- clipboard.py, completion.py, tips.py, timeouts.py, voice.py
|   Control UX conveniences, shell completion, tips, provider timeout config, and voice setup.
`-- platform-specific auth/setup files
    Control Slack, DingTalk, Telegram managed bot, WhatsApp Cloud, Copilot, Azure, XAI, and GUI uninstall flows.
```

## Tool Registry and Tool Implementations

```text
tools/
+-- registry.py
|   Controls central tool registration, availability checks, schema export, and dispatch.
+-- approval.py, threat_patterns.py, write_approval.py
|   Control dangerous-command detection, threat pattern definitions, and write approval flows.
+-- terminal_tool.py
|   Controls terminal command execution, PTY/background process handling, cwd, and backend selection.
+-- environments/
|   Controls terminal backends: local, Docker, SSH, Singularity, Modal, managed Modal, Daytona, and file sync.
+-- process_registry.py, read_terminal_tool.py, interrupt.py
|   Control background process tracking, terminal output reading, and interruption.
+-- file_tools.py, file_operations.py, file_state.py, patch_parser.py, path_security.py
|   Control file read/write/search/patch operations, file state tracking, patch parsing, and path safety.
+-- browser_tool.py, browser_supervisor.py, browser_cdp_tool.py, browser_dialog_tool.py, browser_camofox*.py
|   Control browser automation, browser lifecycle supervision, CDP operations, dialogs, and Camofox state.
+-- web_tools.py, read_extract.py, website_policy.py, url_safety.py, x_search_tool.py, openrouter_client.py, xai_http.py
|   Control web search/extraction, website access policy, URL safety, X search, and provider HTTP clients.
+-- code_execution_tool.py
|   Controls sandboxed code execution.
+-- delegate_tool.py, async_delegation.py, mixture_of_agents_tool.py
|   Control subagent delegation, async delegation, and multi-agent synthesis.
+-- mcp_tool.py, mcp_oauth.py, mcp_oauth_manager.py
|   Control MCP server discovery, tool registration, OAuth, and runtime calls.
+-- memory_tool.py, session_search_tool.py, todo_tool.py, thread_context.py
|   Control model-facing persistent memory, session search, todo state, and thread context.
+-- skill_manager_tool.py, skills_tool.py, skills_hub.py, skills_sync.py, skills_guard.py, skills_ast_audit.py, skill_provenance.py, skill_usage.py
|   Control model-facing skill creation/use, hub sync, safety review, provenance, and usage tracking.
+-- cronjob_tools.py, blueprints.py, kanban_tools.py
|   Control model-facing cron jobs, automation blueprints, and kanban operations.
+-- send_message_tool.py, discord_tool.py, homeassistant_tool.py, feishu_doc_tool.py, feishu_drive_tool.py, yuanbao_tools.py
|   Control platform/integration-specific outbound and workspace actions.
+-- microsoft_graph_auth.py, microsoft_graph_client.py
|   Control Microsoft Graph auth and API access.
+-- image_generation_tool.py, video_generation_tool.py, vision_tools.py, transcription_tools.py, tts_tool.py, voice_mode.py, neutts_synth.py, fal_common.py
|   Control multimodal generation, vision, transcription, TTS, and voice mode.
+-- computer_use_tool.py
|   Controls desktop/computer-use capability.
+-- clarify_tool.py, clarify_gateway.py, slash_confirm.py
|   Control model-to-user clarification and confirmation flows.
+-- managed_tool_gateway.py, tool_backend_helpers.py, tool_output_limits.py, tool_result_storage.py, tool_search.py, schema_sanitizer.py, lazy_deps.py
|   Control tool gateway routing, helper utilities, output truncation/storage, tool search, schema cleanup, and lazy dependency installation.
+-- credential_files.py, env_passthrough.py, env_probe.py, budget_config.py
|   Control secure credential/env passthrough into tools and budget configuration.
+-- checkpoint_manager.py
|   Controls checkpoint/rollback support for tool workflows.
+-- binary_extensions.py, ansi_strip.py, debug_helpers.py, fuzzy_match.py, osv_check.py, tirith_security.py
|   Control support utilities for file types, terminal text cleanup, debugging, matching, vulnerability checks, and security scans.
`-- optional integration helpers
    Control provider-specific or app-specific tool behavior.
```

## Messaging Gateway

```text
gateway/
+-- run.py
|   Controls GatewayRunner, platform startup, message dispatch, slash command handling, running-agent guards, cron ticker, and response routing.
+-- session.py
|   Controls gateway session key construction and conversation persistence.
+-- session_context.py
|   Controls session metadata/context passed into agents.
+-- platform_registry.py
|   Controls platform adapter discovery and registration.
+-- authz_mixin.py, pairing.py, slash_access.py
|   Control user authorization, DM pairing, and slash command access rules.
+-- delivery.py
|   Controls outbound delivery to origin chat, home channels, explicit targets, and cross-platform sends.
+-- channel_directory.py
|   Controls human-readable mapping of channels for delivery.
+-- hooks.py, builtin_hooks/
|   Control gateway lifecycle hooks and extension points.
+-- slash_commands.py
|   Controls gateway-specific slash command handling.
+-- stream_consumer.py, stream_dispatch.py, stream_events.py
|   Control streaming model/tool output back to messaging clients.
+-- response_filters.py, display_config.py, runtime_footer.py
|   Control outbound response formatting and footer/status display.
+-- mirror.py, rich_sent_store.py, message_timestamps.py
|   Control cross-session mirroring, rich sent-message records, and timestamp tracking.
+-- status.py, restart.py, shutdown_forensics.py
|   Control profile-scoped process locks, restart handling, and shutdown diagnostics.
+-- memory_monitor.py, kanban_watchers.py
|   Control background monitors attached to gateway runtime.
+-- sticker_cache.py, whatsapp_identity.py
|   Control media/identity helpers for specific platforms.
+-- platforms/
|   Controls inbound/outbound adapter implementations. Adapters normalize raw platform events into a common MessageEvent before GatewayRunner handles them.
|
|   +-- base.py
|   |   Controls shared adapter lifecycle, active-session guard, pending-message queue, and common send/receive interface.
|   +-- telegram.py, telegram_network.py
|   |   Control Telegram bot behavior and network handling.
|   +-- discord.py
|   |   Controls Discord bot behavior.
|   +-- slack.py
|   |   Controls Slack Socket Mode behavior.
|   +-- whatsapp.py, whatsapp_cloud.py, whatsapp_common.py
|   |   Control WhatsApp integrations.
|   +-- signal.py, signal_rate_limit.py
|   |   Control Signal integration and rate limits.
|   +-- matrix.py
|   |   Controls Matrix integration.
|   +-- email.py
|   |   Controls IMAP/SMTP email integration.
|   +-- sms.py
|   |   Controls SMS integration.
|   +-- dingtalk.py, feishu.py, wecom.py, wecom_callback.py, weixin.py
|   |   Control China/workchat platform adapters and callback crypto.
|   +-- msgraph_webhook.py
|   |   Controls Microsoft Graph webhook intake.
|   +-- webhook.py, api_server.py
|   |   Control generic webhook and REST API ingress.
|   +-- homeassistant.py
|   |   Controls Home Assistant conversation integration.
|   +-- bluebubbles.py
|   |   Controls iMessage via BlueBubbles.
|   +-- qqbot/
|   |   Controls Tencent QQ bot adapter, crypto, keyboards, upload, and onboarding.
|   `-- yuanbao*.py
|       Control Tencent Yuanbao adapter, media, protocol, and stickers.
`-- assets/
    Controls gateway-packaged static assets.
```

## Scheduling and Automation

```text
cron/
+-- jobs.py
|   Controls job model, jobs.json persistence, atomic writes, schedule parsing, and lifecycle state.
+-- scheduler.py
|   Controls due-job detection, fresh AIAgent creation, skill/script injection, job execution, delivery, repeat handling, and locking.
+-- blueprint_catalog.py
|   Controls built-in automation blueprint metadata.
+-- suggestion_catalog.py, suggestions.py
|   Control cron suggestion generation and cataloged suggestions.
`-- scripts/
    Controls script templates/helpers used by scheduled jobs.
```

## ACP / Editor Integration

```text
acp_adapter/
+-- entry.py, __main__.py
|   Control the `hermes-acp` executable entry point.
+-- server.py
|   Controls ACP JSON-RPC server behavior.
+-- session.py
|   Controls editor-agent session lifecycle.
+-- tools.py
|   Controls ACP-exposed tool operations.
+-- permissions.py, edit_approval.py
|   Control editor edit permissions and approval flow.
+-- events.py
|   Controls event emission to ACP clients.
+-- auth.py
|   Controls ACP auth.
`-- provenance.py
    Controls provenance metadata for editor changes.
```

## TUI, Desktop, and Web Surfaces

```text
tui_gateway/
+-- entry.py
|   Controls Python-side TUI gateway entry point.
+-- server.py, ws.py, transport.py
|   Control WebSocket/server transport between Python runtime and Node TUI.
+-- event_publisher.py
|   Controls event publishing to the TUI.
+-- render.py
|   Controls server-side render helpers.
`-- slash_worker.py
    Controls slash command worker behavior for TUI.

ui-tui/
+-- src/entry.tsx
|   Controls the Node/React terminal UI entry point.
+-- packages/hermes-ink/
|   Controls shared Ink components for terminal UI rendering.
+-- package.json
|   Controls TUI build/dev scripts and dependencies.
`-- README.md
    Documents TUI usage and architecture.

apps/
+-- desktop/
|   Controls Electron desktop shell, packaged desktop app behavior, and desktop-specific docs.
+-- bootstrap-installer/
|   Controls installer/bootstrap UI packaging.
`-- shared/
    Controls shared TypeScript utilities/components across apps.

web/
+-- src/App.tsx
|   Controls Vite web dashboard application shell.
+-- public/
|   Controls dashboard static assets.
+-- package.json
|   Controls dashboard scripts/dependencies.
`-- README.md
    Documents dashboard development.
```

## Plugins, Providers, Skills, and MCP Extensions

```text
plugins/
+-- plugin_utils.py
|   Controls shared plugin helper utilities.
+-- context_engine/
|   Controls pluggable context-engine plugin type.
+-- memory/
|   Controls pluggable memory-provider plugin type.
+-- model-providers/
|   Controls bundled model-provider plugin examples/registration.
+-- browser/, web/, image_gen/, video_gen/
|   Control bundled provider/tool plugins for browser, web search, image generation, and video generation.
+-- platforms/
|   Controls platform plugin registration for gateway adapters.
+-- dashboard_auth/
|   Controls dashboard authentication plugin.
+-- observability/
|   Controls observability plugin surface.
+-- security-guidance/
|   Controls bundled security guidance patterns.
+-- disk-cleanup/
|   Controls disk cleanup plugin.
+-- google_meet/
|   Controls Google Meet bot/audio bridge/tools.
+-- teams_pipeline/
|   Controls Teams meeting pipeline runtime, store, subscriptions, and CLI.
+-- kanban/
|   Controls kanban plugin surface.
+-- spotify/
|   Controls Spotify client and tools.
`-- hermes-achievements/
    Controls achievements/gamification plugin surface.

providers/
+-- base.py
|   Controls provider plugin base interface.
`-- README.md
    Documents provider extension expectations.

skills/
|   Controls bundled skills that are available with Hermes. Categories include apple, autonomous agents, creative, data science, devops, email, github, media, mlops, note-taking, productivity, research, smart-home, social-media, software-development, and yuanbao.

optional-skills/
|   Controls official opt-in skills. Categories include autonomous agents, blockchain, communication, creative, devops, email, finance, gaming, health, MCP, migration, MLOps, payments, productivity, research, security, software development, and web development.
|   Important for OpenClaw modeling: optional-skills/migration/openclaw-migration owns guided OpenClaw migration workflow instructions.

optional-mcps/
|   Controls packaged MCP catalog entries such as linear, n8n, and unreal-engine.
```

## Documentation, Packaging, Deployment, and Assets

```text
website/
+-- docs/
|   Controls the public Docusaurus documentation. Developer-guide docs are especially useful for architecture, agent loop, tools runtime, gateway internals, cron internals, provider runtime, and session storage.
+-- src/, static/, sidebars.ts, docusaurus.config.ts
|   Control docs site frontend, static assets, navigation, and configuration.
`-- scripts/
    Controls docs generation/maintenance scripts.

docs/
|   Controls repo-local specs, internal docs, design notes, security docs, observability notes, kanban docs, and PDFs.

assets/
|   Controls public README/media assets such as the banner image.

locales/
|   Controls YAML translation catalogs used by CLI/gateway strings.

docker/
|   Controls container entrypoints, init scripts, process supervision, and container runtime docs.

nix/
|   Controls Nix package, dev shell, overlays, desktop, web, and module definitions.

packaging/homebrew/
|   Controls Homebrew packaging.

datagen-config-examples/
|   Controls example batch/browser/research trajectory generation configs.

.github/
|   Controls issue templates, workflows, dependabot, reusable actions, and PR metadata.
```

## Testing Layout

```text
tests/
+-- acp/, acp_adapter/
|   Control editor protocol and adapter regression coverage.
+-- agent/
|   Controls agent runtime regression coverage.
+-- cli/, hermes_cli/
|   Control CLI and command regression coverage.
+-- cron/
|   Controls scheduler/job coverage.
+-- gateway/
|   Controls gateway message, platform, stream, and session coverage.
+-- plugins/
|   Controls plugin loading and behavior coverage.
+-- providers/
|   Controls provider integration/adapter coverage.
+-- tools/
|   Controls tool registration, dispatch, safety, and helper coverage.
+-- tui_gateway/
|   Controls TUI gateway coverage.
+-- website/
|   Controls docs/web coverage.
+-- e2e/, integration/, stress/
|   Control broader behavioral and performance checks.
+-- fixtures/, fakes/
|   Control shared test fixtures and fake services.
`-- root-level test_*.py
    Control cross-cutting regressions for install, state DB, model behavior, package metadata, SQL injection, logging, and compatibility.
```

## Feature Patterns Worth Modeling

### 1. One Runtime, Many Entrypoints

Hermes keeps `AIAgent` as the execution center. CLI, gateway, cron, ACP, batch, TUI, desktop, and web shells feed work into that center rather than owning separate agent logic.

Alleato implication: project intelligence, executive briefs, Teams cards, admin tools, and scheduled sync audits should converge on one typed agent runtime with source-specific adapters.

### 2. Tool Registry With Availability Gates

Tools self-register through the tools/registry.py module; model_tools.py filters schemas by toolset and availability. This prevents every surface from hand-curating imports.

Alleato implication: tools such as Procore sync, Supabase lookup, Fireflies transcript search, project packet generation, Teams delivery, and change-order analysis should register once with explicit availability checks.

### 3. Toolsets as Policy

The toolsets.py module separates capability policy from implementation. A tool can exist without every agent surface being allowed to use it.

Alleato implication: executive assistants, project assistants, admin repair agents, and ingestion workers can share tools while receiving different toolsets.

### 4. Session Storage With Search and Lineage

The hermes_state.py module uses SQLite, FTS5, source tagging, message storage, and parent/child lineage for compressed sessions.

Alleato implication: a project intelligence memory store should track source surface, project, user, generated artifact, evidence links, and compression lineage. Claims should be searchable across sessions.

### 5. Skills as Procedural Memory

`skills/` and `optional-skills/` package reusable workflows as instructions, scripts, and references. Skills can be loaded by agents and cron jobs.

Alleato implication: recurring workflows like "daily Brandon brief", "project risk digest", "change-order packet review", and "meeting action extraction" should become skill-like packages with evidence requirements.

### 6. Gateway Adapters Normalize the Outside World

`gateway/platforms/*` converts Telegram/Slack/Teams/etc. events into common message events before the agent sees them.

Alleato implication: Teams, email, web chat, and admin console events should normalize into a shared task envelope before AI processing.

### 7. Cron Runs Agent Work, Not Shell Commands

Cron jobs create fresh isolated agent sessions, inject skills/scripts, run a prompt, and deliver the result. The scheduler prevents recursive cron mutation.

Alleato implication: recurring project intelligence jobs should run as isolated tasks with attached skills and explicit delivery destinations, not hidden scripts with side effects.

### 8. Plugins Extend Runtime Without Forking Core

Hermes supports plugins for tools, hooks, CLI commands, memory providers, context engines, and platform integrations.

Alleato implication: external integrations such as Procore, Acumatica, Fireflies, Microsoft Graph, and future providers should be plugin-shaped modules with explicit contracts.

## Guardrails to Copy

- Every tool has a schema, handler, optional availability check, and explicit toolset.
- Dangerous operations route through approval/guardrail logic before execution.
- Tool errors return structured error payloads rather than uncaught exceptions.
- Long-running agents can be interrupted.
- Multiple tool calls can run concurrently only when the tool mix allows it.
- Cron jobs run in isolated sessions and cannot recursively create more cron jobs.
- Gateway adapters have two layers of running-agent guard and interruption handling.
- Session storage tags source/platform and preserves lineage across compression.
- Optional heavy dependencies lazy-install or remain opt-in.
- Public entry points are thin wrappers around shared runtime code.

## Modeling Candidates for Alleato

| Hermes concept | Candidate Alleato analog |
| --- | --- |
| `AIAgent` core loop | Shared project-intelligence agent runtime |
| `tools/registry.py` | Central AI tool registry for Procore, Supabase, Fireflies, Graph, Teams, Acumatica |
| toolsets.py | Permission/tool policy by assistant type and route |
| hermes_state.py | Searchable AI session/evidence store with project/source lineage |
| `skills/` | Repeatable PM workflows and Brandon-facing briefing protocols |
| `gateway/platforms/` | Teams/email/webhook/adaptive-card adapters |
| `cron/jobs.py` + `cron/scheduler.py` | Scheduled briefs, sync audits, missing-evidence checks |
| `plugins/` | Integration packs and memory/context providers |
| `acp_adapter/` | Internal developer/admin control plane for AI operations |
| `tui_gateway/` and `ui-tui/` | Optional live run console for debugging agent execution |

## Recommended Next Steps

1. Create an Alleato "agent runtime architecture" doc that mirrors this separation: entrypoints, runtime, tool registry, memory/session store, scheduling, adapters, and plugins.
2. Inventory current Alleato AI tools and classify them into Hermes-style toolsets by user role and route.
3. Pick one workflow to model first: recommended target is Executive Daily Brief because it naturally needs skills, session evidence, scheduled execution, source-linked claims, and Teams/email delivery.
4. Add a failure-loudly contract for every agent tool: unavailable dependency, permission denied, empty evidence, stale source, and partial delivery should all return typed errors.
5. Avoid porting Hermes UI directly. The useful asset is the backend/control-plane architecture, not the visual style.
