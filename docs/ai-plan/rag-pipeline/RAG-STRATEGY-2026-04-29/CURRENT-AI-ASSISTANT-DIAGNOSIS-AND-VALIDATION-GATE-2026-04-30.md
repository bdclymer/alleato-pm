# Current AI Assistant Diagnosis And Validation Gate

Date: 2026-04-30
Status: Required PRP context
Scope: Current AI chat failure mode, AI SDK/OpenAI/Gateway validation, and how packet-first project intelligence fits into the broader Alleato intelligence system.

Related documents:

- [Client Project Intelligence PRP Scope](CLIENT-PROJECT-INTELLIGENCE-PRP-SCOPE-2026-04-30.md)
- [RAG Strategy Working Decisions](RAG-STRATEGY-WORKING-DECISIONS-2026-04-30.md)
- [RAG Compiler And Assistant Behavior V1](RAG-COMPILER-AND-ASSISTANT-BEHAVIOR-V1-2026-04-30.md)
- [Client Project Gold-Standard Chat Examples](CLIENT-PROJECT-GOLD-STANDARD-CHAT-EXAMPLES-2026-04-30.md)

## Current Problem

The AI chat is technically responding, but it is not useful enough.

The issue is not simply "the model is bad." The model may be capable, but the current application work process around it is fragile and poorly aligned to how a strategic advisor should work.

The current assistant appears to blur several different jobs:

1. Project advisor
2. Business strategist
3. Thought partner
4. Company memory
5. App helper

When those modes are blurred, the assistant feels like it is running random tools or returning generic summaries instead of understanding the user's actual need.

## Mental Model

The model is the brain.

RAG is what it reads before answering.

The app code is the assistant's work process.

Right now, the model may be smart, but the work process is not strong enough. It is closer to:

> Before answering, randomly check a few filing cabinets, skim some meeting notes, maybe look at emails, maybe do not, then write a formatted report.

The desired process is:

> Listen to what the user is really asking, classify the mode, pull the right packet and source evidence, understand what changed, form a point of view, and answer like a strategic partner.

## Current Implementation Concerns

The PRP should explicitly investigate these issues before building on top of the current assistant route.

## Current Repo Evidence To Verify

The PRP should start by inspecting the current implementation instead of assuming the failure is a model-quality problem.

Known repo signals:

- `frontend/src/app/api/ai-assistant/chat/route.ts` disables model tools in the main assistant route with `modelTools = undefined` because of an AI Gateway `finishReason: other` / empty-text issue.
- `frontend/src/lib/ai/detect-rag-request.ts` documents deterministic pre-retrieval as a workaround for the disabled model tool path.
- `frontend/src/lib/ai/bot-core.ts` still uses `streamText` with tools in another path.
- `frontend/src/lib/ai/orchestrator.ts` still defines specialist `ToolLoopAgent` flows for CFO/COO/CRO-style analysis and includes financial, operational, risk, portfolio, and Acumatica-style tools.

Interpretation:

This looks less like "AI SDK cannot call tools" and more like the main chat route has accumulated a workaround around one Gateway/tool-calling failure mode. The PRP should prove that directly before building more features on top of it.

## Documentation Evidence

The current AI SDK docs support tool calling. They do not support treating AI SDK plus OpenAI as inherently unable to call tools.

Docs to use during PRP implementation:

- AI SDK tool calling: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
- AI SDK `streamText`: https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text
- AI SDK `generateText`: https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text
- AI SDK `ToolLoopAgent`: https://ai-sdk.dev/docs/reference/ai-sdk-core/tool-loop-agent
- AI SDK loop control: https://ai-sdk.dev/docs/agents/loop-control

Implementation rule:

Do not remove AI SDK or permanently bypass it unless the validation gate proves that the installed SDK/provider path cannot reliably support the assistant's required tool loop.

### 1. AI SDK and tool calling may be misused or over-disabled

Current local code includes comments that model tools are globally disabled in the main assistant route because of an AI Gateway `finishReason: other` / empty-text issue.

That may have been a pragmatic workaround, but it cannot be treated as a permanent architecture without proof.

The official AI SDK documentation supports tool calling with `generateText`, `streamText`, `tools`, `stopWhen`, and `ToolLoopAgent`. The docs do not support a blanket assumption that AI SDK plus OpenAI cannot call tools.

Therefore, the PRP must include a validation gate before assuming the tool layer is fundamentally broken.

### 2. Deterministic server-side retrieval is acting as a workaround

Because model tools are disabled in the main route, the code has accumulated deterministic retrieval paths and source-specific pattern detection.

This creates brittle behavior:

- regex-like source routing
- source-specific special cases
- pre-injected context instead of model-directed evidence gathering
- fallback synthesis chains
- no clean advisor loop

This may explain why the assistant feels robotic. It is being forced to answer from whatever context the route prepared, rather than following a clean reasoning and evidence workflow.

### 3. Current tools still have value

The PRP should not throw away the existing assistant tools.

Existing valuable capabilities include:

- project and portfolio tools
- financial tools
- Acumatica/ERP analysis
- operational tools
- meeting search
- Teams and email search
- semantic search
- company knowledge
- memory
- app help
- specialist agents such as CFO/COO/CRO-style analysis

The problem is not that these tools are useless. The problem is that they are not orchestrated inside a coherent intelligence system.

### 4. Packet-first intelligence is one layer, not the whole system

The client project packet is the briefing layer the assistant should read first for project-advisor questions.

It does not replace:

- financial tools
- Acumatica analysis
- structured project database queries
- memory
- app help
- raw source lookup
- specialist analysis

Instead, it should become the top-level project context that helps the assistant know what matters before deciding which deeper tools to use.

## Required Validation Gate

Before the PRP implements packet-first routing, it should validate the AI SDK/OpenAI/Gateway tool path with a minimal isolated test.

The validation should compare:

1. AI SDK + AI Gateway + OpenAI model
2. AI SDK + direct OpenAI provider
3. Raw OpenAI API, if needed

Each test should use:

- one simple read-only tool
- one obvious prompt that requires that tool
- multi-step synthesis after tool result
- captured tool calls
- captured final text
- captured finish reason
- captured warnings/errors

## Validation Outcomes

### Outcome A: AI Gateway fails, direct OpenAI works

Decision:

- keep AI SDK
- bypass AI Gateway for tool-heavy assistant calls
- use Gateway only where it is stable

### Outcome B: AI SDK direct OpenAI fails too

Decision:

- inspect local AI SDK usage, tool schemas, message shape, streaming integration, and model options
- do not blame Gateway until local usage is corrected

### Outcome C: Raw OpenAI fails too

Decision:

- inspect model/tool schema compatibility
- simplify tools or switch model

### Outcome D: all paths work

Decision:

- current assistant route/workflow is the problem
- remove or retire the global tool-disable workaround
- rebuild around a clean intent/evidence/advisor loop

## Required PRP Sequence

The PRP should follow this sequence:

1. Diagnose current assistant route behavior.
2. Validate AI SDK/Gateway/OpenAI tool-calling path.
3. Decide whether tools should run through Gateway, direct OpenAI provider, or a mixed approach.
4. Preserve useful existing tools.
5. Add packet-first client project intelligence as the project-advisor briefing layer.
6. Route by assistant mode:
   - project advisor
   - business strategist
   - thought partner
   - company memory
   - app helper
7. Use existing tools behind the right mode instead of running random or source-specific retrieval.

## Target Intelligence System

The end state is not just a RAG upgrade.

The target is an Alleato intelligence system that merges:

- compiled client project intelligence packets
- raw source evidence from emails, Teams, meetings, documents, and daily reports
- structured project records
- financial and Acumatica analysis
- memory and company knowledge
- specialist tools and agents
- app workflow help
- review queues for uncertain attribution and low-confidence insights

The packet-first client project layer is the first proof case, not the entire destination.

## PRP Framing Language

Use this language in the PRP:

> The current AI chat is not useful enough because the assistant work process is brittle. Before adding new intelligence features, validate whether AI SDK, AI Gateway, direct OpenAI, and local tool schemas can support reliable tool calling. Then preserve the existing useful tools and add packet-first client project intelligence as the project-advisor briefing layer inside a broader Alleato intelligence system.

## V1 Success Criteria

The first implementation is successful when:

- the team knows whether the tool-calling issue is Gateway, AI SDK usage, OpenAI/provider configuration, or local route code
- the assistant no longer depends on an unexplained global tool-disable workaround
- existing valuable tools are preserved
- project-advisor questions load the client project packet first
- structured financial and project tools remain available for deeper analysis
- the assistant can answer Westfield Collective project questions with status, risk, financial exposure, next action, source confidence, and honest gaps
