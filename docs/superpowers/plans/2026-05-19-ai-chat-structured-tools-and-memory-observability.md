# AI Chat Structured Tools + Memory Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the structured-data gap in the live AI chat by adding direct-query tools for the four operational tables the strategist cannot currently query (`project_emails`, `tasks`, `project_timeline_events`, `meeting_segments` JSONB), and surface memory pipeline state so silent regressions stop being silent.

**Architecture:**
- Three of the four new tools live in the existing `frontend/src/lib/ai/tools/structured-queries.ts` (they slot into `createStructuredQueryTools` which is already composed into `createOperationalTools → createProjectTools → createStrategistTools`).
- The fourth (timeline) lives in `project-tools.ts` so it sits alongside related project-scoped tools.
- A memory diagnostics tool exposes the same data `bot-core.ts` already loads on every turn — no new memory pipeline, just visibility into the existing one. An admin route at `/api/admin/ai-assistant/memory-diagnostics` returns the same shape for the diagnostics page.
- Each new tool follows the existing pattern: `tool({ description, inputSchema, execute: withTrace(...) })`, uses `resolveProject()` for project ID/name handling, returns `{ error }` on failure, caps row counts.

**Tech Stack:** AI SDK v6 (`tool()` from `ai`), Zod for input schemas, Supabase service client (`@/lib/supabase/service`), Jest for unit tests, Next.js 15 App Router for the admin route, agent-browser for end-to-end verification.

---

## Task 0: Baseline — capture the current "dumb chat" behaviour

**Why:** We need before/after evidence. Without it, no way to know if the fixes actually moved the needle.

**Files:**
- Create: `verify-output/2026-05-19-baseline/` (gitignored — local screenshots only)

- [ ] **Step 1: Start dev server in background**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npm run dev
```

Wait for "Ready in" output on port 3001.

- [ ] **Step 2: Use agent-browser to ask the four baseline questions**

Launch agent-browser, log in with `TEST_USER_1` / `TEST_PASSWORD_1` from `.env`. Navigate to the AI chat (likely `/ai-assistant` or `/chat`). Ask these questions one at a time, screenshot each answer.

**Memory + meta:**
1. `What do you remember about me?` — tests memory pipeline
2. `Are there any insights from today's meetings?` — tests meeting intelligence + recency

**Strategic / leadership:**
3. `What is the highest priority issue across all projects right now?` — tests aggregation + ranking
4. `Are any clients upset?` — tests sentiment + comm analysis
5. `What are Brandon's must-do items?` — tests person-scoped synthesis from comms/meetings (NOT tasks table)
6. `How does the pipeline look?` — tests sales/estimating aggregation

**Project-scoped (uses new tools when shipped):**
7. `What changed on Union Collective over the past 30 days?`
8. `What decisions came out of the Union Collective OAC meeting on 2026-05-14?`
9. `Show me every email on Union Collective about retainage`

**DO NOT ASK** any "open tasks" or "overdue tasks" questions — per memory, tasks/schedule data are mid-migration and every task is status=open. Misleading.

Save screenshots to `verify-output/2026-05-19-baseline/baseline-{1..9}.png`.

- [ ] **Step 3: Document the baseline**

Add file `verify-output/2026-05-19-baseline/README.md`:
```markdown
# Baseline — AI chat capability before structured tools fix

| # | Question | Result |
|---|----------|--------|
| 1 | What do you remember about me? | [paste] |
| 2 | Insights from today's meetings | [paste] |
| 3 | Highest priority across all projects | [paste] |
| 4 | Are any clients upset? | [paste] |
| 5 | Brandon's must-do items | [paste] |
| 6 | How does the pipeline look? | [paste] |
| 7 | What changed on Union Collective past 30 days | [paste] |
| 8 | Decisions from 2026-05-14 OAC meeting | [paste] |
| 9 | Emails on Union Collective about retainage | [paste] |
```

- [ ] **Step 4: No commit — baseline is local only**

`verify-output/` is gitignored per CLAUDE.md.

---

## Task 1: Add `queryProjectEmails` tool

**Files:**
- Modify: `frontend/src/lib/ai/tools/structured-queries.ts` (add new tool inside `createStructuredQueryTools` return object)
- Test: `frontend/src/lib/ai/tools/__tests__/structured-queries-emails.test.ts` (create)

### Sub-steps

- [ ] **Step 1: Read the existing tool pattern**

Read `frontend/src/lib/ai/tools/structured-queries.ts` lines 1–120 to see the `queryBudgetData` tool and the `withTrace` / `resolveProject` helpers. Read `frontend/src/lib/ai/tools/__tests__/project-tools-barrel.test.ts` to see the Supabase mock pattern.

- [ ] **Step 2: Write the failing test**

Create `frontend/src/lib/ai/tools/__tests__/structured-queries-emails.test.ts`:

```typescript
import { createStructuredQueryTools } from "../structured-queries";

jest.mock("@/lib/supabase/service", () => ({
  createServiceClient: jest.fn(),
}));

const buildMockSupabase = (rows: unknown[]) => {
  const queryChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data: rows, error: null }),
  };
  return {
    from: jest.fn().mockReturnValue(queryChain),
  };
};

const mockGuardrails = {
  resolveProject: jest.fn().mockResolvedValue({ id: 1009, name: "Union Collective" }),
} as any;

describe("queryProjectEmails", () => {
  it("returns emails filtered by project id, sender, and subject keyword", async () => {
    const supabase = buildMockSupabase([
      { id: "e1", subject: "Retainage release", from_name: "Brandon Clymer", received_at: "2026-05-10" },
      { id: "e2", subject: "Retainage question", from_name: "Andrew Cannon", received_at: "2026-05-12" },
    ]);

    const tools = createStructuredQueryTools(supabase as any, mockGuardrails, {});
    const result = await (tools.queryProjectEmails as any).execute({
      projectId: 1009,
      subjectContains: "retainage",
    });

    expect(supabase.from).toHaveBeenCalledWith("project_emails");
    expect(result).toMatchObject({
      projectId: 1009,
      projectName: "Union Collective",
      count: 2,
    });
    expect(result.emails).toHaveLength(2);
  });

  it("returns { error } when project cannot be resolved", async () => {
    const supabase = buildMockSupabase([]);
    const failingGuardrails = {
      resolveProject: jest.fn().mockResolvedValue({ error: "Project not found" }),
    } as any;

    const tools = createStructuredQueryTools(supabase as any, failingGuardrails, {});
    const result = await (tools.queryProjectEmails as any).execute({
      projectName: "Nonexistent Project",
    });

    expect(result).toEqual({ error: "Project not found" });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npx jest src/lib/ai/tools/__tests__/structured-queries-emails.test.ts
```

Expected: FAIL with "queryProjectEmails is not a function" or "Cannot read properties of undefined".

- [ ] **Step 4: Implement the tool**

Open `frontend/src/lib/ai/tools/structured-queries.ts`. Inside the `return { ... }` object of `createStructuredQueryTools`, add this tool (place it after the last existing tool, before the closing brace):

```typescript
    queryProjectEmails: tool({
      description:
        "List project-matched emails directly from the `project_emails` table. " +
        "Use this when the user asks for a LIST of emails on a project — " +
        "filtered by sender, recipient, date range, subject keyword, or attachment status. " +
        "Returns structured rows, NOT a vector-search summary. " +
        "For semantic search across all emails (not project-matched), use searchEmails instead.",
      inputSchema: z.object({
        projectId: z.number().optional().describe("Project ID if known"),
        projectName: z.string().optional().describe("Project name to search for"),
        fromEmail: z.string().optional().describe("Filter by sender email (exact match)"),
        senderNameContains: z.string().optional().describe("Filter where sender name contains this text"),
        subjectContains: z.string().optional().describe("Filter where subject contains this text (case-insensitive)"),
        bodyContains: z.string().optional().describe("Filter where body contains this text (case-insensitive)"),
        sinceDate: z.string().optional().describe("Only emails received on/after this date (YYYY-MM-DD)"),
        untilDate: z.string().optional().describe("Only emails received on/before this date (YYYY-MM-DD)"),
        hasAttachments: z.boolean().optional().describe("Filter to only emails with attachments"),
        limit: z.number().min(1).max(200).default(50).describe("Maximum rows to return (default 50, max 200)"),
      }),
      execute: withTrace(
        "queryProjectEmails",
        options,
        async ({
          projectId,
          projectName,
          fromEmail,
          senderNameContains,
          subjectContains,
          bodyContains,
          sinceDate,
          untilDate,
          hasAttachments,
          limit,
        }) => {
          const resolved = await resolveProject(supabase, guardrails, projectId, projectName);
          if ("error" in resolved) return resolved;

          let query = supabase
            .from("project_emails")
            .select("id, subject, from_name, from_email, to_list, cc_list, received_at, sent_at, has_attachments, thread_id")
            .eq("project_id", resolved.id)
            .order("received_at", { ascending: false, nullsFirst: false });

          if (fromEmail) query = query.eq("from_email", fromEmail);
          if (senderNameContains) query = query.ilike("from_name", `%${senderNameContains}%`);
          if (subjectContains) query = query.ilike("subject", `%${subjectContains}%`);
          if (bodyContains) query = query.ilike("body_text", `%${bodyContains}%`);
          if (sinceDate) query = query.gte("received_at", sinceDate);
          if (untilDate) query = query.lte("received_at", untilDate);
          if (typeof hasAttachments === "boolean") query = query.eq("has_attachments", hasAttachments);

          const { data, error } = await query.limit(limit ?? 50);
          if (error) return { error: `Email query failed: ${error.message}` };

          const rows = (data ?? []) as AnyRow[];
          return {
            projectId: resolved.id,
            projectName: resolved.name,
            count: rows.length,
            emails: rows,
          };
        },
      ),
    }),
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npx jest src/lib/ai/tools/__tests__/structured-queries-emails.test.ts
```

Expected: PASS, 2 tests.

- [ ] **Step 6: Delegate typecheck to background sub-agent**

Per CLAUDE.md, never run typecheck in the main thread. Dispatch a background sub-agent with prompt:

```
Run: cd /Users/meganharrison/Documents/alleato-pm/frontend && npm run typecheck
Report: pass/fail. If fail, list first 5 errors with file:line.
```

Expected: PASS. If fail, fix and re-delegate.

- [ ] **Step 7: Browser-verify in agent-browser**

With dev server still running, navigate to the chat. Ask:
- `Show me every email on Union Collective about retainage`

Expected: a structured list of emails (at least 3+ if any retainage thread exists). The strategist should be calling `queryProjectEmails` — verify by checking the trace in `/admin/ai-assistant/prompt-diagnostics` (or check Langfuse if traces enabled).

Save screenshot: `verify-output/2026-05-19-after-fix-1/email-retainage.png`.

- [ ] **Step 8: Commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm && git add frontend/src/lib/ai/tools/structured-queries.ts frontend/src/lib/ai/tools/__tests__/structured-queries-emails.test.ts && git commit -m "feat(ai-chat): add queryProjectEmails structured tool

Strategist can now list project-matched emails directly from the project_emails
table with filters (sender, subject, date, attachments) instead of falling back
to vector search of document_chunks.

Closes the gap identified in docs/reports/2026-05-19-ai-chat-wiring-audit.md
section 6 row 1."
```

---

## Task 2: Add `queryTasks` tool

**Files:**
- Modify: `frontend/src/lib/ai/tools/structured-queries.ts`
- Test: `frontend/src/lib/ai/tools/__tests__/structured-queries-tasks.test.ts` (create)

### Sub-steps

- [ ] **Step 1: Write the failing test**

Create `frontend/src/lib/ai/tools/__tests__/structured-queries-tasks.test.ts`:

```typescript
import { createStructuredQueryTools } from "../structured-queries";

jest.mock("@/lib/supabase/service", () => ({
  createServiceClient: jest.fn(),
}));

const buildMockSupabase = (rows: unknown[]) => {
  const queryChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data: rows, error: null }),
  };
  return { from: jest.fn().mockReturnValue(queryChain) };
};

const mockGuardrails = {
  resolveProject: jest.fn().mockResolvedValue({ id: 1009, name: "Union Collective" }),
} as any;

describe("queryTasks", () => {
  it("returns open tasks filtered by assignee and overdue flag", async () => {
    const supabase = buildMockSupabase([
      { id: "t1", title: "Send PO", assignee_name: "Brandon", status: "open", due_date: "2026-05-10" },
    ]);

    const tools = createStructuredQueryTools(supabase as any, mockGuardrails, {});
    const result = await (tools.queryTasks as any).execute({
      projectId: 1009,
      assigneeNameContains: "Brandon",
      status: ["open"],
      overdueAsOf: "2026-05-19",
    });

    expect(supabase.from).toHaveBeenCalledWith("tasks");
    expect(result.count).toBe(1);
    expect(result.tasks[0].assignee_name).toBe("Brandon");
  });

  it("works without project filter (cross-project task query)", async () => {
    const supabase = buildMockSupabase([{ id: "t2", title: "Review", status: "open" }]);
    const tools = createStructuredQueryTools(supabase as any, mockGuardrails, {});
    const result = await (tools.queryTasks as any).execute({
      status: ["open"],
      limit: 25,
    });
    expect(result.count).toBe(1);
    expect(mockGuardrails.resolveProject).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npx jest src/lib/ai/tools/__tests__/structured-queries-tasks.test.ts
```

Expected: FAIL with "queryTasks is not a function".

- [ ] **Step 3: Implement the tool**

Add to `frontend/src/lib/ai/tools/structured-queries.ts` (after `queryProjectEmails`):

```typescript
    queryTasks: tool({
      description:
        "List tasks from the `tasks` table with filters. " +
        "Use this for ANY task-listing question: open tasks per project, tasks by assignee, " +
        "overdue tasks, tasks by priority, tasks by source. Returns a structured list. " +
        "If the user mentions a project, set projectId/projectName. " +
        "If they ask about a person, set assigneeNameContains or assigneeEmail. " +
        "For 'overdue' questions, set overdueAsOf to today's date.",
      inputSchema: z.object({
        projectId: z.number().optional().describe("Project ID if scoped to a project"),
        projectName: z.string().optional().describe("Project name if scoped to a project"),
        assigneeEmail: z.string().optional().describe("Filter by assignee email (exact)"),
        assigneeNameContains: z.string().optional().describe("Filter where assignee name contains this"),
        status: z.array(z.enum(["open", "in_progress", "completed", "blocked", "cancelled"])).optional()
          .describe("Filter to specific statuses (default: all)"),
        priority: z.array(z.enum(["low", "medium", "high", "urgent"])).optional().describe("Filter to specific priorities"),
        dueSince: z.string().optional().describe("Only tasks due on/after this date (YYYY-MM-DD)"),
        dueBefore: z.string().optional().describe("Only tasks due on/before this date (YYYY-MM-DD)"),
        overdueAsOf: z.string().optional().describe("Return only tasks where due_date < this date AND status not completed (YYYY-MM-DD)"),
        sourceSystem: z.string().optional().describe("Filter by source_system (e.g. 'scheduled_task_extraction')"),
        limit: z.number().min(1).max(200).default(50),
      }),
      execute: withTrace(
        "queryTasks",
        options,
        async (input) => {
          let projectId = input.projectId;
          let projectName: string | undefined;

          if (input.projectId || input.projectName) {
            const resolved = await resolveProject(supabase, guardrails, input.projectId, input.projectName);
            if ("error" in resolved) return resolved;
            projectId = resolved.id;
            projectName = resolved.name;
          }

          let query = supabase
            .from("tasks")
            .select("id, title, description, assignee_name, assignee_email, due_date, priority, status, source_system, project_id, created_at")
            .order("due_date", { ascending: true, nullsFirst: false })
            .order("created_at", { ascending: false });

          if (projectId) query = query.eq("project_id", projectId);
          if (input.assigneeEmail) query = query.eq("assignee_email", input.assigneeEmail);
          if (input.assigneeNameContains) query = query.ilike("assignee_name", `%${input.assigneeNameContains}%`);
          if (input.status?.length) query = query.in("status", input.status);
          if (input.priority?.length) query = query.in("priority", input.priority);
          if (input.dueSince) query = query.gte("due_date", input.dueSince);
          if (input.dueBefore) query = query.lte("due_date", input.dueBefore);
          if (input.sourceSystem) query = query.eq("source_system", input.sourceSystem);
          if (input.overdueAsOf) {
            query = query.lt("due_date", input.overdueAsOf).not("status", "in", "(completed,cancelled)");
          }

          const { data, error } = await query.limit(input.limit ?? 50);
          if (error) return { error: `Task query failed: ${error.message}` };

          const rows = (data ?? []) as AnyRow[];
          return {
            projectId: projectId ?? null,
            projectName: projectName ?? null,
            count: rows.length,
            tasks: rows,
          };
        },
      ),
    }),
```

- [ ] **Step 4: Run test, verify pass**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npx jest src/lib/ai/tools/__tests__/structured-queries-tasks.test.ts
```

Expected: PASS, 2 tests.

- [ ] **Step 5: Delegate typecheck to background sub-agent**

Same as Task 1 Step 6.

- [ ] **Step 6: Browser-verify**

Ask in chat:
- `What are Andrew Cannon's overdue tasks on Union Collective?`

Expected: structured list. Save screenshot to `verify-output/2026-05-19-after-fix-2/task-overdue.png`.

- [ ] **Step 7: Commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm && git add frontend/src/lib/ai/tools/structured-queries.ts frontend/src/lib/ai/tools/__tests__/structured-queries-tasks.test.ts && git commit -m "feat(ai-chat): add queryTasks structured tool

Strategist can now list tasks with filters (assignee, status, priority, due date,
overdue flag). Replaces the hardcoded 'generated tasks today' shortcut at
handler-v2.ts:806 with a general-purpose tool.

Closes audit gap section 6 row 3."
```

---

## Task 3: Add `getProjectTimeline` tool

**Files:**
- Modify: `frontend/src/lib/ai/tools/project-tools.ts`
- Test: `frontend/src/lib/ai/tools/__tests__/project-tools-timeline.test.ts` (create)

### Sub-steps

- [ ] **Step 1: Read existing patterns**

Read `frontend/src/lib/ai/tools/project-tools.ts` lines 391–500 to see `createProjectTools` shape. Read `frontend/src/app/api/ai-assistant/timeline/route.ts` to see the existing timeline query pattern.

- [ ] **Step 2: Write the failing test**

Create `frontend/src/lib/ai/tools/__tests__/project-tools-timeline.test.ts`:

```typescript
import { createProjectTools } from "../project-tools";

jest.mock("@/lib/supabase/service", () => ({
  createServiceClient: jest.fn(() => ({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: [
          { id: "evt1", kind: "meeting", title: "OAC", summary: "Bar relocated", occurred_at: "2026-05-14" },
        ],
        error: null,
      }),
    }),
  })),
}));

jest.mock("../tool-utils", () => ({
  ...jest.requireActual("../tool-utils"),
  resolveProject: jest.fn().mockResolvedValue({ id: 1009, name: "Union Collective" }),
}));

describe("getProjectTimeline", () => {
  it("returns timeline events for the project in the given window", async () => {
    const tools = createProjectTools("test-user-id", {});
    const result = await (tools.getProjectTimeline as any).execute({
      projectId: 1009,
      sinceDate: "2026-04-19",
      untilDate: "2026-05-19",
    });

    expect(result).toMatchObject({
      projectId: 1009,
      projectName: "Union Collective",
      count: 1,
    });
    expect(result.events[0].kind).toBe("meeting");
  });
});
```

- [ ] **Step 3: Run test, verify fail**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npx jest src/lib/ai/tools/__tests__/project-tools-timeline.test.ts
```

Expected: FAIL with "getProjectTimeline is not a function".

- [ ] **Step 4: Implement the tool**

Open `frontend/src/lib/ai/tools/project-tools.ts`. Inside the `return { ... }` object of `createProjectTools`, add (place near other "get*" tools — search for `getProjectSummary` or `getProjectHealth` and add after one of them):

```typescript
    getProjectTimeline: tool({
      description:
        "Get the chronological timeline of events for a project (meetings, milestones, document uploads, " +
        "contract signings, status changes). Use this for ANY 'what happened on project X' or " +
        "'what changed in the last N days' question. Returns a structured chronological list, " +
        "NOT a vector-search summary.",
      inputSchema: z.object({
        projectId: z.number().optional().describe("Project ID if known"),
        projectName: z.string().optional().describe("Project name to search for"),
        sinceDate: z.string().optional().describe("Only events on/after this date (YYYY-MM-DD)"),
        untilDate: z.string().optional().describe("Only events on/before this date (YYYY-MM-DD)"),
        kinds: z.array(z.string()).optional().describe("Filter to specific event kinds (e.g. ['meeting', 'prime_contract', 'change_order'])"),
        limit: z.number().min(1).max(200).default(50),
      }),
      execute: withTrace(
        "getProjectTimeline",
        options,
        async ({ projectId, projectName, sinceDate, untilDate, kinds, limit }) => {
          const resolved = await resolveProject(supabase, guardrails, projectId, projectName);
          if ("error" in resolved) return resolved;

          let query = supabase
            .from("project_timeline_events")
            .select("id, kind, title, summary, status, occurred_at, entity_id")
            .eq("project_id", resolved.id)
            .order("occurred_at", { ascending: false });

          if (sinceDate) query = query.gte("occurred_at", sinceDate);
          if (untilDate) query = query.lte("occurred_at", untilDate);
          if (kinds?.length) query = query.in("kind", kinds);

          const { data, error } = await query.limit(limit ?? 50);
          if (error) return { error: `Timeline query failed: ${error.message}` };

          const rows = (data ?? []) as Array<Record<string, unknown>>;
          return {
            projectId: resolved.id,
            projectName: resolved.name,
            count: rows.length,
            events: rows,
          };
        },
      ),
    }),
```

If `tool`, `z`, `withTrace`, `resolveProject` aren't already imported in `project-tools.ts`, add the imports at the top (check existing imports first — most should already exist since other tools use them).

- [ ] **Step 5: Run test, verify pass**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npx jest src/lib/ai/tools/__tests__/project-tools-timeline.test.ts
```

Expected: PASS.

- [ ] **Step 6: Delegate typecheck**

Same pattern as Task 1 Step 6.

- [ ] **Step 7: Browser-verify**

Ask in chat:
- `What changed on Union Collective over the past 30 days?`

Expected: list of timeline events. Screenshot to `verify-output/2026-05-19-after-fix-3/timeline.png`.

- [ ] **Step 8: Commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm && git add frontend/src/lib/ai/tools/project-tools.ts frontend/src/lib/ai/tools/__tests__/project-tools-timeline.test.ts && git commit -m "feat(ai-chat): add getProjectTimeline tool

Strategist can now list project_timeline_events directly. Closes audit gap
section 6 row 4 — 'what changed on project X' previously returned a vector
search summary instead of an event list."
```

---

## Task 4: Add `queryMeetingSegments` tool

**Files:**
- Create: `frontend/src/lib/ai/tools/meeting-segments.ts`
- Modify: `frontend/src/lib/ai/tools/project-tools.ts` (compose into `createProjectTools`)
- Test: `frontend/src/lib/ai/tools/__tests__/meeting-segments.test.ts` (create)

### Sub-steps

- [ ] **Step 1: Confirm the schema**

`meeting_segments` columns (from audit data): `id`, `metadata_id`, `segment_index`, `title`, `summary`, `decisions` (jsonb), `risks` (jsonb), `tasks` (jsonb), `project_ids` (array of bigint — project association is via array membership, not direct FK), `sentiment`, `project_impact`, `mentioned_people`, `created_at`.

- [ ] **Step 2: Write the failing test**

Create `frontend/src/lib/ai/tools/__tests__/meeting-segments.test.ts`:

```typescript
import { createMeetingSegmentTools } from "../meeting-segments";

jest.mock("@/lib/supabase/service", () => ({ createServiceClient: jest.fn() }));

const buildMockSupabase = (rows: unknown[]) => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data: rows, error: null }),
  };
  return { from: jest.fn().mockReturnValue(chain) };
};

describe("queryMeetingSegments", () => {
  it("returns segments with at least one decision when onlyWithDecisions=true", async () => {
    const supabase = buildMockSupabase([
      {
        id: "seg1",
        title: "Wood vs steel decision",
        summary: "Team chose wood framing",
        decisions: [{ text: "Wood framing committed" }],
        risks: [],
        tasks: [],
        project_ids: [1009],
        created_at: "2026-05-06",
      },
    ]);

    const tools = createMeetingSegmentTools(supabase as any, { resolveProject: jest.fn().mockResolvedValue({ id: 1009, name: "Union Collective" }) } as any, {});
    const result = await (tools.queryMeetingSegments as any).execute({
      projectId: 1009,
      onlyWithDecisions: true,
    });

    expect(supabase.from).toHaveBeenCalledWith("meeting_segments");
    expect(result.count).toBe(1);
    expect(result.segments[0].decisions).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Run test, verify fail**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npx jest src/lib/ai/tools/__tests__/meeting-segments.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement the new file**

Create `frontend/src/lib/ai/tools/meeting-segments.ts`:

```typescript
import { tool } from "ai";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { type ToolGuardrails } from "./guardrails";
import { resolveProject, type ToolTracePayload, withTrace as _withTrace } from "./tool-utils";

type AnyRow = Record<string, unknown>;

type Options = {
  onTrace?: (trace: ToolTracePayload) => void;
  pinnedProjectId?: number;
};

function withTrace<TIn extends Record<string, unknown>, TOut>(
  name: string,
  options: Options,
  execute: (input: TIn) => Promise<TOut>,
) {
  return _withTrace(name, options, execute, "Meeting segment query failed. Try a different filter.");
}

export function createMeetingSegmentTools(
  supabase: ReturnType<typeof createServiceClient>,
  guardrails: ToolGuardrails,
  options: Options,
) {
  return {
    queryMeetingSegments: tool({
      description:
        "Query individual meeting segments (sub-sections within a meeting transcript) that have " +
        "structured decisions/risks/tasks JSONB. Use this for ANY question about decisions, risks, " +
        "or action items from meetings on a project. Filter by project, date, sentiment, or whether " +
        "the segment has decisions/risks/tasks. Returns the segment summary AND the raw structured arrays.",
      inputSchema: z.object({
        projectId: z.number().optional().describe("Project ID — matches segments where project_ids array contains this id"),
        projectName: z.string().optional().describe("Project name — resolved to project_id then matched against project_ids array"),
        sinceDate: z.string().optional().describe("Only segments created on/after this date (YYYY-MM-DD)"),
        untilDate: z.string().optional().describe("Only segments created on/before this date (YYYY-MM-DD)"),
        onlyWithDecisions: z.boolean().optional().describe("Return only segments with at least one decision"),
        onlyWithRisks: z.boolean().optional().describe("Return only segments with at least one risk"),
        onlyWithTasks: z.boolean().optional().describe("Return only segments with at least one task"),
        sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
        limit: z.number().min(1).max(100).default(25),
      }),
      execute: withTrace(
        "queryMeetingSegments",
        options,
        async (input) => {
          let projectId = input.projectId;
          let projectName: string | undefined;

          if (input.projectId || input.projectName) {
            const resolved = await resolveProject(supabase, guardrails, input.projectId, input.projectName);
            if ("error" in resolved) return resolved;
            projectId = resolved.id;
            projectName = resolved.name;
          }

          let query = supabase
            .from("meeting_segments")
            .select("id, metadata_id, segment_index, title, summary, decisions, risks, tasks, project_ids, sentiment, project_impact, created_at")
            .order("created_at", { ascending: false });

          if (projectId) query = query.contains("project_ids", [projectId]);
          if (input.sinceDate) query = query.gte("created_at", input.sinceDate);
          if (input.untilDate) query = query.lte("created_at", input.untilDate);
          if (input.sentiment) query = query.eq("sentiment", input.sentiment);

          // JSONB "has at least one element" filter — use the postgres '!=' against empty array
          if (input.onlyWithDecisions) query = query.not("decisions", "eq", "[]");
          if (input.onlyWithRisks) query = query.not("risks", "eq", "[]");
          if (input.onlyWithTasks) query = query.not("tasks", "eq", "[]");

          const { data, error } = await query.limit(input.limit ?? 25);
          if (error) return { error: `Meeting segment query failed: ${error.message}` };

          const rows = (data ?? []) as AnyRow[];
          return {
            projectId: projectId ?? null,
            projectName: projectName ?? null,
            count: rows.length,
            segments: rows,
          };
        },
      ),
    }),
  };
}
```

- [ ] **Step 5: Wire into createProjectTools**

Open `frontend/src/lib/ai/tools/project-tools.ts`. Add import at top:

```typescript
import { createMeetingSegmentTools } from "./meeting-segments";
```

Inside `createProjectTools`, after the existing tool composition (search for `...createStructuredQueryTools` or similar pattern), add:

```typescript
    ...createMeetingSegmentTools(supabase, guardrails, options),
```

- [ ] **Step 6: Run test, verify pass**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npx jest src/lib/ai/tools/__tests__/meeting-segments.test.ts
```

Expected: PASS.

- [ ] **Step 7: Delegate typecheck**

Same as before.

- [ ] **Step 8: Browser-verify**

Ask:
- `What decisions came out of the Union Collective OAC meeting on 2026-05-14?`

Expected: list of decisions from the segment JSONB. Screenshot to `verify-output/2026-05-19-after-fix-4/decisions.png`.

- [ ] **Step 9: Commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm && git add frontend/src/lib/ai/tools/meeting-segments.ts frontend/src/lib/ai/tools/project-tools.ts frontend/src/lib/ai/tools/__tests__/meeting-segments.test.ts && git commit -m "feat(ai-chat): add queryMeetingSegments tool exposing decisions/risks/tasks JSONB

Strategist can now query meeting_segments.decisions, .risks, .tasks JSONB
directly. Closes audit gap section 6 row 5 — decisions previously only
surfaced as paraphrased vector-search summaries."
```

---

## Task 5: Memory diagnostics tool + admin endpoint

**Files:**
- Create: `frontend/src/lib/ai/tools/memory-diagnostics.ts`
- Create: `frontend/src/app/api/admin/ai-assistant/memory-diagnostics/route.ts`
- Modify: `frontend/src/lib/ai/orchestrator.ts` (register the new tool in `createStrategistTools`)
- Test: `frontend/src/lib/ai/tools/__tests__/memory-diagnostics.test.ts` (create)

### Sub-steps

- [ ] **Step 1: Write the failing test**

Create `frontend/src/lib/ai/tools/__tests__/memory-diagnostics.test.ts`:

```typescript
import { createMemoryDiagnosticTools } from "../memory-diagnostics";

jest.mock("@/lib/ai/services/ai-memory-service", () => ({
  getMemoriesForSession: jest.fn().mockResolvedValue({
    preferences: [{ id: "m1", content: "Megan prefers terse responses", importance: 0.9 }],
    relevant: [{ id: "m2", content: "Union Collective groundbreaking is August", importance: 0.8 }],
    team: [],
  }),
}));

jest.mock("@/lib/ai/services/conversation-memory", () => ({
  getRecentConversationSummaries: jest.fn().mockResolvedValue([
    { id: "c1", summary: "Discussed Union Collective design milestones", created_at: "2026-05-18" },
  ]),
}));

jest.mock("@/lib/ai/services/agent-learning-service", () => ({
  getRelevantAgentLearnings: jest.fn().mockResolvedValue([
    { id: "l1", lesson: "Always confirm overdue tasks against today's date" },
  ]),
}));

describe("getMemoryDiagnostics", () => {
  it("returns the memories that would be injected for the given user/session/message", async () => {
    const tools = createMemoryDiagnosticTools({
      userId: "user-abc",
      sessionId: "sess-123",
    });
    const result = await (tools.getMemoryDiagnostics as any).execute({
      firstMessage: "Tell me about Union Collective",
    });

    expect(result.summary).toEqual({
      preferencesCount: 1,
      relevantCount: 1,
      teamCount: 0,
      conversationSummariesCount: 1,
      agentLearningsCount: 1,
      totalInjected: 4,
    });
    expect(result.preferences[0].content).toContain("terse");
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npx jest src/lib/ai/tools/__tests__/memory-diagnostics.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the diagnostic tool**

Create `frontend/src/lib/ai/tools/memory-diagnostics.ts`:

```typescript
import { tool } from "ai";
import { z } from "zod";
import { getMemoriesForSession } from "@/lib/ai/services/ai-memory-service";
import { getRecentConversationSummaries } from "@/lib/ai/services/conversation-memory";
import { getRelevantAgentLearnings } from "@/lib/ai/services/agent-learning-service";

type Args = {
  userId: string;
  sessionId: string;
  projectId?: number;
};

export function createMemoryDiagnosticTools(args: Args) {
  return {
    getMemoryDiagnostics: tool({
      description:
        "Show what memories, conversation summaries, and agent learnings WOULD be loaded into " +
        "your system prompt for the current user/session. Use this when the user asks 'what do you " +
        "remember about me', 'why didn't you remember X', or 'are memories working'. " +
        "Returns counts, the actual memory text, and importance scores so silent regressions " +
        "(AI Database dual-write failures, RLS mismatches, top-12 cap) become visible.",
      inputSchema: z.object({
        firstMessage: z.string().describe("The first user message of the session (used to score relevance)"),
      }),
      execute: async ({ firstMessage }) => {
        const [memorySet, conversationSummaries, agentLearnings] = await Promise.all([
          getMemoriesForSession({ userId: args.userId, firstMessage }),
          getRecentConversationSummaries(args.userId, args.sessionId, 3),
          getRelevantAgentLearnings({
            messageText: firstMessage,
            projectId: args.projectId,
            limit: 4,
          }),
        ]);

        const preferences = memorySet?.preferences ?? [];
        const relevant = memorySet?.relevant ?? [];
        const team = memorySet?.team ?? [];

        return {
          summary: {
            preferencesCount: preferences.length,
            relevantCount: relevant.length,
            teamCount: team.length,
            conversationSummariesCount: conversationSummaries?.length ?? 0,
            agentLearningsCount: agentLearnings?.length ?? 0,
            totalInjected:
              preferences.length +
              relevant.length +
              team.length +
              (conversationSummaries?.length ?? 0) +
              (agentLearnings?.length ?? 0),
          },
          preferences,
          relevant,
          team,
          conversationSummaries,
          agentLearnings,
          note: "If totalInjected is 0 but you expect memories, check: (1) ai_memories.embedding dual-write to AI Database, (2) RLS policy alignment for this user_id, (3) top-12 importance×recency cap in bot-core.ts:159.",
        };
      },
    }),
  };
}
```

- [ ] **Step 4: Wire into createStrategistTools**

Open `frontend/src/lib/ai/orchestrator.ts`. Find `createStrategistTools` (~line 991). Add import at top of file:

```typescript
import { createMemoryDiagnosticTools } from "./tools/memory-diagnostics";
```

Inside the function body, build the diagnostic tools using the existing `userId` and `sessionId` parameters and spread into the returned object:

```typescript
  const memoryDiagnosticTools = createMemoryDiagnosticTools({
    userId,
    sessionId: options.sessionId,
    projectId: options.pinnedProjectId,
  });

  // ... existing tool composition ...

  return {
    // ... existing spreads ...
    ...memoryDiagnosticTools,
    // ... rest ...
  };
```

(The exact insertion point depends on the existing structure — read lines 991–1172 first and match the pattern of other `...createXxxTools(...)` spreads.)

- [ ] **Step 5: Create the admin endpoint**

Create `frontend/src/app/api/admin/ai-assistant/memory-diagnostics/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMemoriesForSession } from "@/lib/ai/services/ai-memory-service";
import { getRecentConversationSummaries } from "@/lib/ai/services/conversation-memory";
import { getRelevantAgentLearnings } from "@/lib/ai/services/agent-learning-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("userId") ?? user.id;
  const sessionId = url.searchParams.get("sessionId") ?? "diagnostic-no-session";
  const firstMessage = url.searchParams.get("firstMessage") ?? "Tell me about my projects";
  const projectIdParam = url.searchParams.get("projectId");
  const projectId = projectIdParam ? Number(projectIdParam) : undefined;

  const [memorySet, conversationSummaries, agentLearnings] = await Promise.all([
    getMemoriesForSession({ userId: targetUserId, firstMessage }),
    getRecentConversationSummaries(targetUserId, sessionId, 3),
    getRelevantAgentLearnings({ messageText: firstMessage, projectId, limit: 4 }),
  ]);

  const preferences = memorySet?.preferences ?? [];
  const relevant = memorySet?.relevant ?? [];
  const team = memorySet?.team ?? [];

  return NextResponse.json({
    targetUserId,
    sessionId,
    firstMessage,
    projectId: projectId ?? null,
    summary: {
      preferencesCount: preferences.length,
      relevantCount: relevant.length,
      teamCount: team.length,
      conversationSummariesCount: conversationSummaries?.length ?? 0,
      agentLearningsCount: agentLearnings?.length ?? 0,
      totalInjected:
        preferences.length + relevant.length + team.length +
        (conversationSummaries?.length ?? 0) + (agentLearnings?.length ?? 0),
    },
    preferences,
    relevant,
    team,
    conversationSummaries,
    agentLearnings,
  });
}
```

- [ ] **Step 6: Add the route to api-smoke-contracts**

Per CLAUDE.md, every new API route gets a smoke entry. Open `scripts/api-smoke-contracts.mjs` (or equivalent — find the right file with `grep -rn 'api-smoke' scripts/`) and add:

```javascript
{ path: "/api/admin/ai-assistant/memory-diagnostics?firstMessage=test", method: "GET", expectStatus: [200, 401] },
```

- [ ] **Step 7: Run tests, verify pass**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npx jest src/lib/ai/tools/__tests__/memory-diagnostics.test.ts
```

Expected: PASS.

- [ ] **Step 8: Delegate typecheck**

Same pattern.

- [ ] **Step 9: Browser-verify**

In the chat, ask:
- `What do you remember about me?`

Expected: the strategist calls `getMemoryDiagnostics`, returns the actual memories with counts. If `totalInjected: 0` — that's the silent regression made visible. Screenshot to `verify-output/2026-05-19-after-fix-5/memory-diag.png`.

Also visit `http://localhost:3001/api/admin/ai-assistant/memory-diagnostics?firstMessage=Tell+me+about+my+projects` directly in the browser. Expected: JSON response with the same shape.

- [ ] **Step 10: Commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm && git add frontend/src/lib/ai/tools/memory-diagnostics.ts frontend/src/lib/ai/tools/__tests__/memory-diagnostics.test.ts frontend/src/lib/ai/orchestrator.ts frontend/src/app/api/admin/ai-assistant/memory-diagnostics/route.ts scripts/api-smoke-contracts.mjs && git commit -m "feat(ai-chat): add memory diagnostics tool + admin route

When the user asks 'what do you remember about me' the strategist now calls
getMemoryDiagnostics which surfaces preferences/relevant/team/conversation
summaries/agent learnings counts plus content. Admin GET endpoint at
/api/admin/ai-assistant/memory-diagnostics returns the same shape for any
user/session combo.

Makes silent memory regressions (AI Database dual-write failures, RLS
mismatches, top-12 cap) visible. Closes audit section 5 hypothesis."
```

---

## Task 6: Delete vestigial starter tools

**Files:**
- Delete: `frontend/src/lib/ai/tools/get-weather.ts`
- Delete: `frontend/src/lib/ai/tools/create-document.ts`
- Delete: `frontend/src/lib/ai/tools/update-document.ts`
- Delete: `frontend/src/lib/ai/tools/request-suggestions.ts`
- Delete: `frontend/src/lib/ai/tools/mcp-tools.ts` (no live consumer either)

### Sub-steps

- [ ] **Step 1: Confirm zero non-test consumers**

```bash
cd /Users/meganharrison/Documents/alleato-pm && grep -rn "get-weather\|create-document\|update-document\|request-suggestions\|mcp-tools" frontend/src --include="*.ts" --include="*.tsx" | grep -v __tests__ | grep -v ".test.ts"
```

Expected: only the files themselves (self-imports) and possibly some markdown docs. If any LIVE code imports them, stop and report — don't delete.

- [ ] **Step 2: Delete the files and their tests**

```bash
cd /Users/meganharrison/Documents/alleato-pm && rm frontend/src/lib/ai/tools/get-weather.ts frontend/src/lib/ai/tools/create-document.ts frontend/src/lib/ai/tools/update-document.ts frontend/src/lib/ai/tools/request-suggestions.ts frontend/src/lib/ai/tools/mcp-tools.ts
```

Check if there are matching test files in `__tests__/`:

```bash
ls frontend/src/lib/ai/tools/__tests__/ | grep -E "weather|document|suggestions|mcp-tools"
```

If any exist, delete them too.

- [ ] **Step 3: Search for any document.tsx UI component that references the deleted tools**

```bash
cd /Users/meganharrison/Documents/alleato-pm && grep -rn "createDocument\|updateDocument\|requestSuggestions\|getWeather" frontend/src --include="*.ts" --include="*.tsx" | grep -v ".md"
```

If any UI component references these as string tool names, also delete those references (likely in `components/ai-chat/document.tsx` per the audit).

- [ ] **Step 4: Delegate typecheck**

Same pattern. Expected: PASS — these had no live consumers.

- [ ] **Step 5: Commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm && git add -A && git commit -m "chore(ai-chat): delete vestigial AI-SDK starter tools

Removes get-weather, create-document, update-document, request-suggestions,
mcp-tools. Audit (docs/reports/2026-05-19-ai-chat-wiring-audit.md section 4)
confirmed zero non-test consumers. They were polluting the tool inventory
and creating confusion about what's actually wired into the live chat."
```

---

## Task 7: After-fix verification + memory snapshot update

**Files:**
- Update: `~/.claude/projects/-Users-meganharrison-Documents-alleato-pm/memory/MEMORY.md` (project memory index)
- Create: a new memory snapshot recording the new tool counts and the audit findings location

### Sub-steps

- [ ] **Step 1: Re-run the four baseline questions in the chat**

Ask the same questions from Task 0 in the chat, screenshot the answers, save to `verify-output/2026-05-19-after-fix-final/`.

- [ ] **Step 2: Compare baseline vs after**

Add `verify-output/2026-05-19-after-fix-final/COMPARISON.md`:

```markdown
# Before vs After — AI chat structured tools

| # | Question | Baseline (Task 0) | After fix |
|---|----------|-------------------|-----------|
| 1 | Emails on Union Collective about retainage | [paste baseline] | [paste after] |
| 2 | Brandon's overdue tasks this week | [paste] | [paste] |
| 3 | What changed past 30 days | [paste] | [paste] |
| 4 | Decisions from 2026-05-14 OAC | [paste] | [paste] |

## Verdict
[Did the strategist call the new tools? Was the answer structured? Was it accurate?]
```

- [ ] **Step 3: Update project memory**

Create new memory file `~/.claude/projects/-Users-meganharrison-Documents-alleato-pm/memory/ai_chat_tool_inventory.md`:

```markdown
---
name: ai-chat-tool-inventory
description: Current AI chat tool inventory, structured-data coverage, and memory pipeline state. Read before debugging "the chat is dumb" or "memory isn't working" complaints.
metadata:
  type: project
---

## Live chat entry point (verified 2026-05-19)
- Route: `frontend/src/app/api/ai-assistant/chat/route.ts` → `handler-v2.ts` → `createStrategistTools` in `orchestrator.ts:991-1172`
- Hit by `rag-chat-page.tsx` and `compact-ai-chat.tsx`

## Tool count (verified 2026-05-19, after structured-tools fix)
- Total tool definitions in `frontend/src/lib/ai/tools/`: ~124 minus 5 deleted starter tools = ~119
- Live strategist tool count: ~117 + 4 new structured tools + 1 memory diagnostic = ~122
- The old project memory claim "28+ tools across 6 files" was wildly out of date — discard it.

## Structured-data coverage (post-fix)
| Table | Direct-query tool |
|---|---|
| project_emails | `queryProjectEmails` (structured-queries.ts) — NEW 2026-05-19 |
| tasks | `queryTasks` (structured-queries.ts) — NEW 2026-05-19 |
| project_timeline_events | `getProjectTimeline` (project-tools.ts) — NEW 2026-05-19 |
| meeting_segments JSONB | `queryMeetingSegments` (meeting-segments.ts) — NEW 2026-05-19 |
| budget_lines | `queryBudgetData` (existing) |
| prime_contract_change_orders | `queryChangeOrders` (existing) |
| commitments_unified | `queryCommitments` (existing) |
| direct_costs | `queryDirectCosts` (existing) |
| schedule_tasks | `queryScheduleTasks` (existing) |
| document_metadata + rows | `queryDocumentRows`, `searchStructuredFinancialRows` (existing) |
| actionable_insights | STILL MISSING — flow via insight_cards instead |
| project_insights | STILL MISSING — flow via insight_cards instead |

## Memory pipeline (verified 2026-05-19)
- Loads on every chat turn via `bot-core.ts:126-193`
- Sources: `ai_memories` (preferences/relevant/team), `memories` (conversation summaries), `ai_lessons_learned` (agent learnings)
- Hard cap: top-12 by importance×recency at `bot-core.ts:159`
- Silent failure modes: (1) AI Database dual-write break in `ai-memory-service.ts:73`, (2) RLS user_id mismatch, (3) top-12 cap pushing older important memories off
- **Diagnostic**: chat tool `getMemoryDiagnostics` OR admin route `/api/admin/ai-assistant/memory-diagnostics?firstMessage=...`

## Audit report
Full audit: [docs/reports/2026-05-19-ai-chat-wiring-audit.md](../../../Documents/alleato-pm/docs/reports/2026-05-19-ai-chat-wiring-audit.md)
```

Add a line to `~/.claude/projects/-Users-meganharrison-Documents-alleato-pm/memory/MEMORY.md` under "AI Master Plan":

```
- [AI chat tool inventory (post-fix 2026-05-19)](ai_chat_tool_inventory.md) — 122 live tools, structured-data coverage for emails/tasks/timeline/segments now complete; memory diagnostics endpoint at /api/admin/ai-assistant/memory-diagnostics
```

- [ ] **Step 4: Commit memory updates** (NOT to the project repo — these live in `~/.claude/`)

```bash
cd ~/.claude && git add . && git commit -m "memory: update Alleato AI chat inventory after structured-tools fix" 2>/dev/null || echo "memory dir not a git repo, save in place"
```

(If `~/.claude/` isn't a git repo, just leave the files in place — they're auto-loaded per session.)

- [ ] **Step 5: Final report**

Write a short summary message to the user with:
- Number of new tools shipped
- Path to the before/after comparison
- Path to the audit report
- Outstanding gaps (actionable_insights and project_insights tables still uncovered — surface as a follow-up)

---

## Self-review notes

**Spec coverage:**
- Section 6 fix shortlist items 1–4 → Tasks 1–4 ✓
- Section 6 fix shortlist item 5 (delete vestigial) → Task 6 ✓
- Memory observability (audit section 5) → Task 5 ✓
- Baseline + after-fix comparison → Tasks 0 and 7 ✓

**Placeholder scan:** All test code, all tool implementations, all imports, all commit messages are fully specified. No "implement here" gaps.

**Type consistency:**
- `resolveProject` returns `{ id, name } | { error }` — used consistently
- `withTrace` signature matches existing pattern in structured-queries.ts
- Tool object key names match across the file (`queryProjectEmails`, `queryTasks`, `getProjectTimeline`, `queryMeetingSegments`, `getMemoryDiagnostics`)
- Test file naming follows existing pattern (`__tests__/<thing>.test.ts`)
