# Source-to-Project Intelligence Pipeline

Purpose: define the implementation target for turning every new meeting,
Teams message, Outlook email, OneDrive document, and Acumatica update into
searchable knowledge, project intelligence, tasks, alerts, and executive output.

Status: target architecture. This document is intentionally short and is meant
to guide consolidation of the current separate Graph, Fireflies, synthesis,
briefing, and assistant paths.

## Target Outcome

Every source item should follow one shared contract:

```text
Source event
  -> canonical source record
  -> project assignment
  -> text extraction
  -> chunk + embed
  -> operational signal extraction
  -> project intelligence update
  -> routed actions
```

Source-specific code should only fetch, normalize, and deduplicate the item.
Everything after that should be shared across Teams, Outlook, OneDrive, and
Fireflies.

## Outcome Map

| Desired outcome | Pipeline stage | Primary output |
|---|---|---|
| Embed meeting transcripts, Teams messages, Outlook emails, and OneDrive documents | indexed_for_rag | `rag_document_metadata`, `document_chunks` |
| Assign every source item to a project | project_assigned | `document_metadata.project_id`, assignment confidence/review metadata |
| Generate tasks from all source types | signals_extracted | `tasks` with source document, assignee, confidence, project |
| Identify urgent items for project homepage | actions_routed | project homepage alerts sourced from urgent signal records |
| Identify potential change-order drivers | signals_extracted | `insight_cards.card_type='flag'` or change-event candidate records |
| Sync Acumatica twice daily | separate structured sync, then project_intelligence_updated | structured financial facts and deltas |
| Make AI assistant accurate and efficient | read layer | project intelligence first, RAG second, SQL/Acumatica for numbers |
| Monitor Brandon email and draft replies | consumer workflow from Outlook source records | reply drafts, Teams alerts, source-linked audit trail |
| Send morning/evening Teams briefs | consumer workflow from current intelligence + today delta | `daily_recaps` / Teams Adaptive Card payloads |
| Maintain running project intelligence | `project_intelligence_updated` | one current `intelligence_packets` row plus timeline/evidence |

## Canonical Record

All sources should produce the same normalized record before downstream work:

| Field | Meaning |
|---|---|
| `source_system` | `fireflies`, `outlook_email`, `teams_channel`, `teams_dm`, `onedrive`, `sharepoint`, `acumatica` |
| `source_item_id` | Stable upstream ID used for dedupe |
| `content_hash` | Hash of normalized content; unchanged hash means no LLM work |
| `project_id` | Assigned project, nullable only while pending review |
| `project_assignment_confidence` | Numeric confidence and method metadata |
| `occurred_at` | When the event happened, not when sync saw it |
| `title` | Subject, meeting title, file name, or structured sync label |
| `participants` | People/mailboxes/senders involved |
| `raw_text` | Canonical text used for RAG and extraction |
| `source_url` | Link back to Fireflies, Outlook, Teams, OneDrive, or Acumatica context |
| processing_status | Current source-processing stage |

Current tables can support most of this through `document_metadata` and
`rag_document_metadata`, but the processing lifecycle should be explicit rather
than inferred from mixed `status` fields.

## Required Processing Statuses

Use one durable ledger, for example `source_processing_jobs`, keyed by
`source_system + source_item_id + content_hash`.

| Status | Meaning | Retry behavior |
|---|---|---|
| captured | Source item was fetched and normalized | retry from project assignment |
| project_assigned | Project was assigned with sufficient confidence | retry from text extraction |
| project_assignment_review | Project confidence is too low | no model retry until reviewed |
| text_extracted | Raw text is available | retry from chunking |
| indexed_for_rag | Chunks and embeddings exist | retry from signal extraction |
| signals_extracted | Tasks, risks, decisions, flags, urgent items extracted | retry from project intelligence update |
| project_intelligence_updated | Current project packet and timeline were updated | retry from action routing |
| actions_routed | Alerts, briefs, reply drafts, task routes created | complete unless routing failed |
| complete | All required work finished | never reprocess unless hash changes |
| failed_retryable | Provider/network/transient failure | retry with backoff and cap |
| failed_permanent | Unsupported/no text/invalid source | do not retry automatically |
| skipped_unchanged | Same content hash already complete | never call LLM or embedding |

## Current Code Path Verdicts

| Code path | Verdict | Reason |
|---|---|---|
| `backend/src/services/integrations/microsoft_graph/sync.py` | Keep, simplify | Correct source fetch entrypoint for Outlook, Teams, OneDrive, SharePoint; should enqueue canonical jobs instead of owning downstream orchestration directly. |
| `backend/src/services/integrations/microsoft_graph/embed.py` | Keep | Embedding path is useful, but should be called by the shared pipeline stage rather than source-specific sweeps. |
| `backend/src/services/ingestion/fireflies_pipeline.py` | Keep, adapt | Good Fireflies fetch/normalize path; downstream task, memory, embedding, and intelligence work should move behind the shared pipeline contract. |
| `backend/src/services/pipeline/orchestrator.py` | Keep as shared stage owner | Closest existing owner for parse, embed, extract, and source intelligence sequencing. Needs to become source-agnostic. |
| `backend/src/services/pipeline/extractor.py` | Keep, refactor | Meeting deep extraction is valuable. The signal schema should be shared across all source types. |
| `backend/src/services/intelligence/project_synthesizer.py` | Keep, consolidate | Correct direction for email/Teams and rolling synthesis. Should also handle Fireflies and should be invoked by the shared job ledger. |
| `backend/src/services/intelligence/project_intelligence.py` | Keep | This should be the single writer for one current project intelligence packet. |
| `backend/src/services/intelligence/domain_compiler.py` | Keep separate for now | Domain intelligence is cross-project/process-level, not the project running log. Revisit after project pipeline is stable. |
| `backend/src/services/intelligence/compiler.py` | Replace gradually | Useful helpers remain, but source candidates/packet refresh orchestration should not be the main lifecycle. |
| `backend/src/services/intelligence/operating_summary.py` | Replace | Legacy packet path overlaps with rolling project synthesis. |
| `backend/src/services/task_extraction.py` | Delete/keep retired | Redundant task pass; task creation should come from the shared signal extraction stage. |
| `alleato-intelligence-compiler-drain` cron | Delete/retire if absent | Current live Render no longer has this service; do not reintroduce the old queue drain model. |
| `alleato-project-synthesis-sweep` cron | Keep as backstop only | Should catch missed work, not be the primary source of intelligence updates. |
| `alleato-domain-packet-compiler` cron | Keep separate | Cross-project operational/domain read, independent from per-project running log. |
| `alleato-task-extraction` cron | Keep suspended/delete | Redundant and cost-risky. |

## Tables To Keep

| Table | Role |
|---|---|
| `document_metadata` | App-facing source catalog and project assignment surface |
| `rag_document_metadata` | Full source text in the AI/RAG database |
| `document_chunks` | Vector chunks for semantic search |
| `tasks` | Unified generated/manual task table |
| `insight_cards` | Timeline/event/evidence cards derived from source signals |
| `intelligence_packets` | One current synthesized project state per project target |
| `intelligence_targets` | Project/domain target ownership |
| `daily_recaps` | Brief storage and audit history |
| `source_sync_runs` | Sync health and freshness ledger |

## Tables Or Status Concepts To Add

| Table/status | Purpose |
|---|---|
| source_processing_jobs | Proposed durable row per source item hash, with stage status, retry count, model usage, and error details |
| source_project_assignments | Proposed optional ledger of assignment method, confidence, reviewed_by, reviewed_at |
| project_alerts | Proposed homepage-visible urgent alerts sourced from extracted signals |
| change_event_candidates | Proposed potential change-order/change-event leads before a user creates a formal change event |
| email_reply_drafts | Proposed reviewable Brandon-email draft replies with source evidence |
| pipeline_model_usage | Implemented RAG-side model, token, estimated-cost, item count, and budget-block ledger |

These can be new tables or views over existing tables, but the statuses must be
queryable without parsing logs.

## Cost Controls

| Control | Required behavior |
|---|---|
| Content-hash idempotency | If `source_system + source_item_id + content_hash` is complete, mark `skipped_unchanged` and do not call embeddings or LLMs. |
| Stage-specific model routing | Use the model map below. Expensive models are reserved for high-value synthesis and executive-facing outputs. |
| Delta-only synthesis | Project intelligence only runs when new source evidence exists or a user explicitly forces a refresh. |
| One current packet | Update the current `intelligence_packets` row in place; do not create competing packet writers. |
| Retry caps | Retry transient provider/network failures with backoff; permanent failures must stop loudly. |
| Daily budget guard | Stop background LLM stages when a configured daily cap is reached, but continue cheap capture and indexing. |
| Usage ledger | Every LLM/embedding call records source item, stage, model, token usage when available, status, and error. |

Budget control env:

```text
PIPELINE_DAILY_MODEL_BUDGET_USD=10
```

When unset, the usage ledger still records estimated spend, but the hard stop is
disabled. Production background jobs should set this value before broad source
processing is resumed.

## Model Map

| Pipeline step | Primary model | Escalation / fallback |
|---|---|---|
| Capture, dedupe, and content hash | no model | Never call an LLM for this stage. |
| Project assignment | rules and SQL first; `gpt-5.4-nano` only when rules are inconclusive | Send low-confidence assignments to review instead of retrying repeatedly. |
| Text extraction and cleanup | no model | Use `gpt-5.4-nano` only for messy OCR or malformed extracted text. |
| Embeddings | `text-embedding-3-large` | Current `document_chunks` search uses 3072-dimensional vectors, so do not switch to `text-embedding-3-small` without a vector-dimension migration. |
| Task, risk, urgent item, and change-order signal extraction | `gpt-5.5-mini` target | Current OpenAI docs reviewed on 2026-06-16 list `gpt-5.4-mini` as the deployable mini model. Use `gpt-5.4-mini` until `gpt-5.5-mini` is available from the provider. |
| Project intelligence update | `gpt-5.4` | Do not run if there is no new source evidence or explicit user refresh. |
| Brandon email importance, reply draft, and Teams alert | `gpt-5.5` | Route contractual/legal uncertainty to human review before sending. |
| Morning and evening Teams brief | `gpt-5.5` | Generate from current packets and today deltas; avoid broad raw RAG scans. |
| AI assistant | `gpt-5.5` | Use retrieval and structured tools first so the model is reasoning over bounded evidence. |

Recommended environment defaults:

```text
PIPELINE_MODEL_PROJECT_ASSIGNMENT=gpt-5.4-nano
PIPELINE_MODEL_TEXT_CLEANUP=gpt-5.4-nano
PIPELINE_MODEL_SIGNAL_EXTRACTION=gpt-5.4-mini
PIPELINE_MODEL_SIGNAL_EXTRACTION_TARGET=gpt-5.5-mini
PIPELINE_MODEL_PROJECT_INTELLIGENCE=gpt-5.4
PIPELINE_MODEL_BRANDON_EMAIL=gpt-5.5
PIPELINE_MODEL_DAILY_BRIEF=gpt-5.5
PIPELINE_MODEL_ASSISTANT=gpt-5.5
PIPELINE_EMBEDDING_MODEL=text-embedding-3-large
```

## Consumer Workflows

### Project Intelligence

Reads new `signals_extracted` items plus the prior current packet and writes one
updated project state. The packet should contain the durable synthesized state:
current read, what changed, open risks, open decisions, tasks, schedule/cost
concerns, likely change-order drivers, and cited source IDs.

It should not store every raw email or transcript line. Raw history lives in
RAG and is cited from the packet.

### AI Assistant

Default retrieval order:

1. Current project intelligence packet for state/status questions.
2. Structured SQL/Acumatica tools for numbers.
3. RAG search for source lookup, details, and evidence.
4. Raw source drilldown only when the user asks for exact history.

### Brandon Email Monitor

Consumes Outlook source records after the signals_extracted status.

Outputs:

- `email_reply_drafts` for important reply-needed emails.
- Teams notification for critical items.
- Linked task when the reply/action belongs to Brandon or another team member.

### Daily Briefs

Morning and evening briefs should read:

- Current project intelligence packets.
- Today delta signals and urgent alerts.
- New tasks and overdue tasks.
- Acumatica deltas from the latest twice-daily sync.
- Critical Brandon email drafts/notifications.

Brief generation should not perform broad raw RAG searches unless it needs a
specific citation not already present in the current packet or signal ledger.

### Project Homepage Alerts

Homepage alerts should be routed from urgent signals, not generated directly by
page load. The page should read a small project_alerts view/table and show
only active alerts with source evidence and a clear action.

## Implementation Slices

1. Create the `source_processing_jobs` contract and write adapters from Graph
   sync and Fireflies into it.
2. Move Teams, Outlook, OneDrive, and Fireflies embedding behind one
   `indexed_for_rag` stage.
3. Move task, urgent-item, and change-event-candidate extraction behind one
   `signals_extracted` stage.
4. Make project_intelligence.py the only writer of current project packets.
5. Route homepage alerts, Brandon email drafts, daily briefs, and assistant
   responses from the shared outputs.
6. Delete or permanently retire duplicate cron/job paths after evidence shows
   the shared pipeline covers the same sources.

## Definition Of Done

- A new source item from each source type reaches complete with source-linked
  evidence and no duplicate work on unchanged re-sync.
- Each source item has either a confident `project_id` or a review status.
- Every generated task has source evidence, project assignment, assignee data,
  and confidence metadata.
- Project intelligence updates only when source evidence changes.
- The assistant can answer from the current packet and cite raw source records.
- Morning/evening briefs use current packets and today delta signals, not broad
  repeated raw searches.
- Cost can be reported by source, stage, model, and day.
