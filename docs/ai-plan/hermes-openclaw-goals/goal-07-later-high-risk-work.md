# Goal 7 - Later High-Risk Work

These items are valuable but should not be started until Goals 1-6 have landed or a product need raises their priority.

## G3 - Human-Gated Learning Loop

Outcome: an opt-in background job proposes skill or memory writes into existing review queues without auto-promoting.

Reference source:

- `hermes-agent/agent/background_review.py`
- `hermes-agent/agent/curator.py`
- `hermes-agent/agent/memory_provider.py`
- `hermes-agent/tests/run_agent/test_background_review.py`
- `hermes-agent/tests/agent/test_curator.py`

Alleato anchors:

- `ai_memories`
- `ai_skills`
- `ai_learning_promotions`
- existing memory extraction and skill library services

Do not copy the Python daemon/threading model. Build an Alleato-native Render/Next `after()` proposal job with human approval.

## G6 - NL Schedule Parser And Automation Blueprints

Outcome: user-facing "schedule this automation" UX backed by existing Render crons and Supabase-stored automation blueprints.

Reference/adapt source:

- `hermes-agent/cron/jobs.py`
- `hermes-agent/cron/blueprint_catalog.py`
- `hermes-agent/cron/suggestions.py`
- `hermes-agent/tests/cron/test_blueprint_catalog.py`
- `hermes-agent/tests/cron/test_suggestions.py`

Copy only the pure parser/blueprint ideas. Do not adopt Hermes's in-process scheduler.

## C10 - Code-Mode RPC

Outcome: reduce token use for heavy-output tool workflows by letting a sandboxed script call many tools and return compact stdout.

Reference source:

- `hermes-agent/tools/code_execution_tool.py`

Do not implement before a security review and sandbox decision. This is arbitrary-code-execution territory. It requires C2 net-policy, environment scrubbing, strict tool allowlists, timeouts, and tests for sandbox escape attempts.

## G5 - Unified Delivery Router

Outcome: unify Teams, Outlook, digest, and future delivery surfaces behind an Alleato `PlatformEntry` and `DeliveryTarget` abstraction.

Reference source:

- `hermes-agent/gateway/`
- `openclaw/packages/gateway-protocol/`
- `openclaw/packages/gateway-client/`
- `openclaw/docs/gateway/`

Build fresh. Do not transplant the full gateway process, pairing model, or plugin framework.

## Shared Acceptance Bar

- Each item needs a separate Linear issue and task markdown file before code changes.
- Each item needs a narrow feature flag and rollback path.
- Each item must document source clone usage as COPY, ADAPT, or REFERENCE.
- Each item must define its failure-loudly behavior before implementation.
