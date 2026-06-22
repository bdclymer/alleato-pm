# Alleato OS — Agent Action Layer Contract (v0.1)

The single primitive that unblocks every write-enabled agent. Agents never touch
tables directly. They emit a typed **proposal**; a central **executor** validates
it, routes it through one of three approval states, commits it inside a
transaction, and writes the audit trail. Build this once and every domain agent
(Submittal Reviewer, RFI Drafter, CO Detector, …) becomes configuration.

Anchored to the existing schema: `submittal_history` is the audit template,
`briefing_runs` is the run-tracker to generalize, financial tables share the
`uuid PK / created_by → users / status-enum` convention.

---

## 0. The one architectural call

Two ledgers, not one, and not seven:

- **`agent_actions`** — the agent-side proposal ledger. Source of truth for
  everything an agent proposes, who approved it, and how to undo it. One table.
- **Domain `*_history`** — the domain-side projection. On commit, the executor
  *also* writes the existing per-domain history row (`submittal_history`, and
  new `change_order_history`, `rfi_history`, etc.) so current timeline UIs keep
  working with zero changes.

Rule enforced everywhere: **agents emit `AgentAction`, the executor writes rows.**
No agent holds a DB write credential. This is the whole security model.

---

## 1. The `AgentAction` envelope

Every agent output that wants to change state is one of these. Typed on both
ends — TypeScript for the app, Pydantic for the FastAPI backend.

```typescript
// app/types/agent-actions.ts
export type ActionState = "draft" | "confirm" | "auto";
export type ActorType = "ai" | "human" | "system";

export interface FieldChange {
  field: string;
  before: unknown;   // null on create
  after: unknown;    // null on delete
}

export interface AgentAction {
  idempotency_key: string;      // hash(agent + resource + intent) — blocks double-writes on retry
  agent: string;                // "submittal_reviewer", "co_detector", ...
  run_id: string;               // FK → agent_runs.id
  action_type: string;          // from the registry in §2, e.g. "submittal.set_status"
  resource: { table: string; id: string | null; project_id: number };
  changes: FieldChange[];       // before/after per field — drives both apply and undo
  evidence: {                   // mandatory. no evidence → rejected at validation
    source: "meeting" | "submittal" | "email" | "document" | "schedule";
    ref_id: string;             // document_metadata.id, fireflies clip, etc.
    quote?: string;             // verbatim trigger text
  }[];
  confidence: number;           // 0–1, from the agent
  rationale: string;            // one line, human-readable, shown in the approval card
  proposed_state: ActionState;  // agent's suggestion; executor policy is final authority
}
```

```python
# python-backend/alleato_agent_workflow/actions/schema.py
from pydantic import BaseModel, Field
from typing import Any, Literal

class FieldChange(BaseModel):
    field: str
    before: Any | None = None
    after: Any | None = None

class Evidence(BaseModel):
    source: Literal["meeting", "submittal", "email", "document", "schedule"]
    ref_id: str
    quote: str | None = None

class AgentAction(BaseModel):
    idempotency_key: str
    agent: str
    run_id: str
    action_type: str
    resource: dict           # {table, id, project_id}
    changes: list[FieldChange]
    evidence: list[Evidence] = Field(min_length=1)   # hard requirement
    confidence: float = Field(ge=0, le=1)
    rationale: str
    proposed_state: Literal["draft", "confirm", "auto"]
```

Validation gates (executor rejects before any policy routing):
1. `evidence` is non-empty — enforces the non-fabrication reflex structurally.
2. `idempotency_key` not already committed — blocks duplicate COs/RFIs on retry.
3. `changes` reference real columns on `resource.table`.
4. `confidence` present.

---

## 2. Approval states + routing policy

Three states, classified on two axes — **externality** and **reversibility** —
never on confidence alone. Confidence only modulates *within* the internal lane.

| | Reversible | Irreversible / financial commit |
|---|---|---|
| **Internal** | `auto` (if confidence ≥ threshold) → else `confirm` | `confirm` |
| **External** (owner, architect, sub, Acumatica) | `confirm` | `draft` |

- **`auto`** — executor applies immediately, logs, fully reversible via `changes`.
  Internal + reversible + high confidence only.
- **`confirm`** — one-tap approve from the daily brief or `submittal_notifications`.
  Executor holds the proposal `pending` until a human acts.
- **`draft`** — executor writes nothing to the live record. It produces an
  editable draft a human must open and submit. External + financial.

The mapping is a **declarative policy table**, not hardcoded — tune thresholds
without redeploying agents:

```sql
-- action_policy: the routing authority
CREATE TABLE action_policy (
  action_type        text PRIMARY KEY,
  externality        text NOT NULL CHECK (externality IN ('internal','external')),
  reversible         boolean NOT NULL,
  auto_threshold     numeric NOT NULL DEFAULT 0.90,  -- confidence floor for auto
  enabled            boolean NOT NULL DEFAULT true,
  notes              text
);
```

Initial Alleato action registry (seed rows):

```
action_type                    externality  reversible  default_state
meeting.assign_project         internal     true        auto
insight.flag_risk              internal     true        auto
daily_log.draft                internal     true        auto         -- draft record, not published
submittal.draft_review         internal     true        confirm
submittal.set_status           internal     true        confirm      -- approved/rejected/revise
rfi.create                     internal     true        confirm
change_order.create            internal     true        confirm
schedule.flag_slip             internal     true        auto
cost.flag_variance             internal     true        auto
rfi.transmit_to_architect      external     false       draft
change_order.submit_to_owner   external     false       draft
client_comms.send              external     false       draft
invoice.submit                 external     false       draft
acumatica.write                external     false       draft        -- graduate to confirm once trusted
```

Graduation path: an `action_type` moves `draft → confirm → auto` by editing one
row in `action_policy` after its accuracy clears your bar in `agent_actions`
history. No code change.

---

## 3. Audit schema

### 3.1 AI actor identity

`submittal_history.actor_id` is a FK to `users`. Give every agent a real `users`
row so existing FKs resolve and the timeline UIs render the actor cleanly:

```sql
INSERT INTO users (id, email, full_name, role)
VALUES ('00000000-0000-0000-0000-00000000a1ee', 'agents@alleato.internal',
        'Alleato AI', 'agent')
ON CONFLICT (id) DO NOTHING;
-- All agent writes carry actor_type='ai', actor_id=this uuid.
```

### 3.2 `agent_runs` (generalize `briefing_runs`)

```sql
CREATE TABLE agent_runs (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent         text NOT NULL,
  trigger       text,                 -- "fireflies_ingest", "cron", "user_chat"
  project_id    integer REFERENCES projects(id),
  input_refs    text[],               -- document_metadata ids, etc.
  status        text DEFAULT 'running', -- running | succeeded | failed
  token_usage   jsonb,
  error         text,
  started_at    timestamptz DEFAULT now(),
  finished_at   timestamptz
);
```

### 3.3 `agent_actions` (the ledger)

```sql
CREATE TABLE agent_actions (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id           uuid REFERENCES agent_runs(id),
  idempotency_key  text UNIQUE NOT NULL,
  agent            text NOT NULL,
  action_type      text NOT NULL REFERENCES action_policy(action_type),
  resource_table   text NOT NULL,
  resource_id      uuid,                          -- null for creates pre-commit
  project_id       integer REFERENCES projects(id),
  changes          jsonb NOT NULL,                -- [{field, before, after}]
  evidence         jsonb NOT NULL,
  confidence       numeric NOT NULL,
  rationale        text,
  state            text NOT NULL,                 -- draft | confirm | auto
  status           text NOT NULL DEFAULT 'pending', -- pending | applied | rejected | undone | expired
  decided_by       uuid REFERENCES users(id),     -- human who approved/rejected (null for auto)
  decided_at       timestamptz,
  applied_at       timestamptz,
  undone_at        timestamptz,
  created_at       timestamptz DEFAULT now()
);
CREATE INDEX ON agent_actions (status, state);
CREATE INDEX ON agent_actions (project_id, created_at DESC);
```

### 3.4 Domain projection

On `applied`, the executor writes the matching `*_history` row inside the same
transaction. `submittal_history` already exists; create siblings on the same
shape for the financial domains:

```sql
CREATE TABLE change_order_history (LIKE submittal_history INCLUDING ALL);
ALTER TABLE change_order_history RENAME COLUMN submittal_id TO change_order_id;
-- repeat for rfi_history, commitment_history as those agents come online
```

### 3.5 RLS

AI writes never run on a user session. They run through the executor on the
**service role**, which is the only identity allowed to write `agent_actions`
and to apply domain rows where `actor_type='ai'`. Human approval flips
`status` via an RPC, not a direct update.

```sql
ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read agent_actions" ON agent_actions
  FOR SELECT USING (auth.uid() IS NOT NULL);
-- INSERT/UPDATE only via service-role executor + approve/reject RPC. No client write policy.
```

### 3.6 Reversibility

`undo(action_id)` replays `changes[].before` into the resource inside a
transaction, sets `status='undone'`, and writes a compensating `*_history` row.
`draft` actions have nothing to undo (no live write happened). External
`applied` actions are not auto-undoable — they're flagged for human follow-up.

---

## 4. Executor flow

```
agent emits AgentAction
        │
        ▼
[validate]  evidence present? idempotency free? columns real? confidence set?
        │ fail → reject, log, surface blocker
        ▼
[policy]    look up action_policy → resolve state
            internal + reversible + confidence ≥ auto_threshold → auto
            else internal/external rules from §2 matrix
        │
        ├── auto    → BEGIN; apply changes; write *_history; agent_actions.status='applied'; COMMIT
        ├── confirm → agent_actions.status='pending'; emit submittal_notifications / brief card
        │              human approve → RPC → BEGIN; apply; project history; status='applied'; COMMIT
        │              human reject  → status='rejected'
        └── draft   → render editable draft (no live write); status stays 'pending' until human submits
```

Fixes the silent-failure pattern flagged in `api.py`: the executor is the **one**
place writes happen, wrapped in a transaction with explicit error capture into
`agent_runs.error` and a Sentry breadcrumb. No `console.error`-and-swallow.

---

## 5. Build order (executable)

1. **Migration A** — `agent_runs`, `agent_actions`, `action_policy` + seed
   registry + AI actor `users` row. ~1 file.
2. **Migration B** — `change_order_history`, `rfi_history` (clone of
   `submittal_history`). ~1 file.
3. **Executor module** — `python-backend/alleato_agent_workflow/actions/executor.py`:
   `validate()`, `route()`, `apply()`, `undo()`, service-role Supabase client.
4. **Approve/reject RPC** — Supabase edge function flipping `agent_actions.status`
   transactionally + writing domain history.
5. **Pilot agent** — wire **Submittal Reviewer** as the first producer. Schema is
   100% ready (`submittal_types.review_criteria`, `submittal_documents.ai_analysis`).
   Its actions (`submittal.draft_review`, `submittal.set_status`) are all `confirm`,
   so the pilot is fully human-gated — lowest risk, validates the whole loop end to end.

Once 1–4 exist, every later agent is steps of registry config plus a producer
function. That's the leverage: the action layer is one project; the agent fleet
is configuration on top of it.
