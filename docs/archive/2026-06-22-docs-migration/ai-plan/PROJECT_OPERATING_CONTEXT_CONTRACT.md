# Project Operating Context Contract

## Purpose

Project-scoped assistant questions should not start from a blank chat turn. The assistant should preload a compact operating context for the project, then use RAG, source-specific lookup, and live tools as drilldown layers.

This contract defines what the assistant should know before it answers a project question and how missing context fails loudly.

## Retrieval Order

1. Resolve the project from `selectedProjectId` or the message text.
2. Load the current `intelligence_packets` row through `packet-service.ts`.
3. Load the structured project briefing snapshot through `getProjectBriefingSnapshot`.
4. Add semantic vector search or source-specific RAG only when the question asks for exact evidence, documents, transcripts, emails, Teams messages, specs, drawings, RFIs, or citations.
5. Answer from the operating context first, then cite or drill into exact sources as needed.

The current frontend implementation lives in:

- `frontend/src/lib/ai/retrieval/planner.ts`
- `frontend/src/lib/ai/retrieval/executor.ts`
- `frontend/src/lib/ai/retrieval/system-prompt.ts`
- `frontend/src/lib/ai/intelligence/packet-service.ts`
- `frontend/src/lib/ai/intelligence/advisor-synthesis.ts`

The current backend compiler implementation lives in:

- `backend/src/services/intelligence/operating_summary.py`

## Operating Context Shape

The project operating context is composed from two existing layers.

### Current Intelligence Packet

Source: `intelligence_packets`, `intelligence_packet_cards`, `insight_cards`, `insight_card_evidence`.

Required answerable fields:

- Project current read
- What changed recently
- Risks and blockers
- Open decisions
- Promises made
- Money impact
- Recommended actions
- Evidence and confidence
- Source coverage and freshness
- Document-intelligence signals

### Structured Project Snapshot

Source: shared project tools and structured app tables.

Required answerable fields:

- Project identity and status
- Project team and key contacts
- Financial records and exposure
- Schedule and milestone context
- RFIs, submittals, change management, commitments, invoices, and daily-log status where available
- Record-system gaps that should be disclosed

## Document Intelligence Requirements

Document intelligence should be summarized in the packet, not dumped into the prompt.

The packet should know:

- Latest important documents by category: drawings, specs, RFIs, submittals, prime contract, commitments, change orders, permits, certificates, insurance, financial documents, and daily reports.
- Revision and freshness signals: newest revision, stale documents, missing categories, duplicate or conflicting documents.
- Extracted obligations: dates, owner approvals, required submittals, specification constraints, scope exclusions, closeout requirements, insurance/certificate requirements, and compliance items.
- Project impact: why the document matters to cost, schedule, risk, scope, billing, or next PM action.
- Evidence pointers: `document_metadata.id`, chunk IDs, titles, source dates, and excerpts for drilldown.

Raw document chunks remain in RAG. The packet carries the expert summary and source map; RAG retrieves the exact clause, spec passage, drawing note, email, transcript, or attachment when the user asks for proof.

Current packet storage:

- `source_coverage.documentIntelligence`
- `packet_json.strategicReport.documentIntelligence`
- `insight_cards.metadata.key = operating-document-intelligence`

Current document-intelligence schema:

- `latestByCategory`: latest selected source per document category with source pointer and project-impact note.
- `revisionSignals`: repeated same-title/category document records that may indicate newer revisions.
- `conflictSignals`: source text with conflict/revision/discrepancy language.
- `obligations`: source text with approval, submittal, permit, inspection, closeout, insurance, warranty, or other requirement language.
- `projectImpact`: category-level impact notes for PM risk/action framing.
- `evidencePointers`: compact source IDs, record IDs, titles, categories, dates, and URLs for drilldown.

## Failure Contract

The assistant must not silently continue when the operating context is unavailable.

Required warnings:

- Missing packet: state that the current intelligence packet was unavailable for the project.
- Missing snapshot: state that structured project context was unavailable.
- Stale packet: state the packet age/freshness and verify critical facts with live tools or source lookup.
- Thin evidence: state which source families are missing or weak.
- Source-specific lookup miss: do not say there is no data unless the relevant direct lookup was actually run and returned no rows.

## Acceptance Tests

Minimum regression coverage:

- A selected-project source lookup loads `intelligencePacket`, `projectSnapshot`, and `semanticVectorSearch`.
- A selected-project source-specific RAG request loads `intelligencePacket`, `projectSnapshot`, and `sourceSpecificRag`.
- Missing packet/snapshot produces executor warnings.
- The system prompt includes a project operating context instruction before packet/snapshot/vector content.
- Stale or low-confidence packets cannot fast-path direct answers.

Targeted command:

```bash
npm run test:unit -- --runInBand --runTestsByPath src/lib/ai/retrieval/__tests__/planner.test.ts src/lib/ai/retrieval/__tests__/executor.test.ts src/lib/ai/retrieval/__tests__/system-prompt.test.ts src/lib/ai/__tests__/packet-fast-path.test.ts
```

```bash
PYTHONPATH=$PWD/backend backend/.venv/bin/pytest backend/tests/test_project_operating_summary.py -q
```

Live assistant eval bundle:

```bash
node scripts/verify/verify_ai_assistant_eval_suite.mjs --bundle project-document-intelligence-regression
```
