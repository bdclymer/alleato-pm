# RAG Strategy Council Runbook

Use this runbook when Alleato RAG or AI assistant work needs consensus before implementation. It turns "another RAG fix" into a structured strategy review with evidence, disagreement, and recurrence guardrails.

## Trigger

Run a RAG Strategy Council when:

- A previous RAG/assistant fix did not hold.
- The failure could be in routing, provider/tool calling, packet freshness, source lookup, ingestion, attribution, embeddings, or synthesis.
- The user asks for consensus, debate, top expertise, or the best implementation strategy.
- A proposed change touches AI SDK provider behavior, packet-first project intelligence, source-specific lookup, or retrieval architecture.

## Skill

Use:

```text
rag-strategy-council
```

Related skills:

- `alleato-rag-implementation` for repo-specific assistant architecture.
- `ai-sdk` for AI SDK, AI Gateway, provider, streaming, tool-calling, structured-output, model, or embedding behavior.
- `rag-architect` as a challenging second opinion on retrieval design.

## Council Roles

| Role | Purpose |
|---|---|
| Repo Architect | Defends current packet-first architecture and identifies existing reusable surfaces. |
| RAG Architect | Challenges retrieval, chunking, metadata, hybrid search, reranking, and eval quality. |
| AI SDK And Provider Specialist | Verifies AI SDK docs/source, AI Gateway, tool calling, finish reasons, and provider matrix behavior. |
| Failure-Mode Reviewer | Finds how the proposed fix could silently fail again and names the guardrail. |
| Product Advisor | Checks whether the result feels like a project advisor or exact source lookup, depending on the prompt. |

## Report Location

Save every council report here:

```text
docs/ai-plan/councils/YYYY-MM-DD-rag-strategy-council-<topic>.md
```

Start from:

```text
.codex/skills/rag-strategy-council/templates/council-report.md
```

## Evidence Packet

Gather evidence before opinions:

- failing prompt and expected behavior
- relevant route/tool/provider/packet files
- verifier output when already available
- live DB counts or health checks when data health is in scope
- AI SDK docs/source references when provider or tool behavior is in scope

Do not run expensive checks in the main thread. Delegate full evals, provider matrices, browser runs, and long health checks to a cheaper verification sub-agent.

## Decision Rules

Prefer the strategy that:

- starts at the highest plausible failure layer before changing deeper infrastructure
- has direct evidence
- has the smallest blast radius
- adds a fail-loud guardrail
- improves the eval/verifier suite so the same failure cannot silently return

Do not:

- blame embeddings first
- replace packet-first project intelligence with raw vector search
- implement a generic LangChain/Pinecone rewrite without explicit user direction
- declare success from HTTP 200 alone
- ship without a recurrence guardrail

## Minimal Output

Every report must answer:

1. What is the first layer to prove or disprove?
2. What should we not change yet?
3. What is the implementation order?
4. What verifier protects the first slice?
5. How does this fail loudly?
6. What makes this never happen again?
