# AI Task Training Mechanism — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users mark AI-created tasks as "good" or "bad", store those signals, extract learnings from bad tasks, and inject positive examples into future task generation.

**Architecture:** Three layers — (1) a `ai_task_feedback` Supabase table captures thumbs-up/down with a snapshot of the task; (2) thumbs-down signals are routed through the existing `ingestThumbsFeedbackLearning` path in `agent-learning-service.ts` to produce prevention prompts; (3) thumbs-up tasks are stored as positive training examples that get injected as few-shot context when `createTask` runs. An admin review page at `/admin/task-training` shows all feedback with approve/reject controls.

**Tech Stack:** Next.js 15 App Router, Supabase (PostgreSQL), TypeScript, shadcn/ui, TanStack Query, existing `agent-learning-service.ts` and `withApiGuardrails`

---

## File Map

| Action | File |
|--------|------|
| **Create** | `supabase/migrations/20260506200000_ai_task_feedback.sql` |
| **Create** | `frontend/src/app/api/ai-assistant/task-feedback/route.ts` |
| **Create** | `frontend/src/hooks/use-task-feedback.ts` |
| **Create** | `frontend/src/components/ai/TaskFeedbackButtons.tsx` |
| **Modify** | `frontend/src/lib/ai/tools/action-tools.ts` — inject positive examples into `createTask` preview |
| **Create** | `frontend/src/lib/ai/services/task-training-service.ts` |
| **Create** | `frontend/src/app/(admin)/task-training/page.tsx` |
| **Create** | `frontend/src/app/(admin)/task-training/TaskTrainingClient.tsx` |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260506200000_ai_task_feedback.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260506200000_ai_task_feedback.sql`:

```sql
-- AI task training feedback
-- Captures thumbs-up/down on AI-created tasks (schedule_tasks created via the createTask tool)
-- Thumbs-down feeds agent_learnings; thumbs-up feeds few-shot examples injected into createTask

create table if not exists public.ai_task_feedback (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  project_id      integer references public.projects(id) on delete set null,
  task_id         uuid references public.schedule_tasks(id) on delete set null,
  signal          text not null check (signal in ('good', 'bad')),
  reason          text,
  task_snapshot   jsonb not null,
  session_id      text,
  learning_id     uuid,
  promoted        boolean not null default false
);

alter table public.ai_task_feedback enable row level security;

create policy "users can manage own task feedback"
  on public.ai_task_feedback
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "admins can read all task feedback"
  on public.ai_task_feedback
  for select
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and is_admin = true
    )
  );

create index ai_task_feedback_project_signal_idx
  on public.ai_task_feedback (project_id, signal, created_at desc);

create index ai_task_feedback_promoted_idx
  on public.ai_task_feedback (project_id, promoted, signal)
  where promoted = true and signal = 'good';
```

- [ ] **Step 2: Apply the migration via Supabase MCP**

Use the `mcp__claude_ai_Supabase__apply_migration` tool with the SQL above targeting the production project.

- [ ] **Step 3: Regenerate types**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npm run db:types
```

Verify `ai_task_feedback` appears in `frontend/src/types/database.types.ts`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260506200000_ai_task_feedback.sql frontend/src/types/database.types.ts
git commit -m "feat(task-training): add ai_task_feedback table and regenerate types"
```

---

## Task 2: Task Training Service

**Files:**
- Create: `frontend/src/lib/ai/services/task-training-service.ts`

- [ ] **Step 1: Write the service**

Create `frontend/src/lib/ai/services/task-training-service.ts`:

```typescript
import { createServiceClient } from "@/lib/supabase/service";
import { upsertAgentLearning } from "./agent-learning-service";
import type { Database } from "@/types/database.types";

type AiTaskFeedbackRow = Database["public"]["Tables"]["ai_task_feedback"]["Row"];

export interface TaskSnapshot {
  name: string;
  assignee?: string | null;
  dueDate?: string | null;
  priority: string;
  notes?: string | null;
  projectId: number;
}

export interface RecordTaskFeedbackParams {
  userId: string;
  projectId: number;
  taskId?: string | null;
  signal: "good" | "bad";
  reason?: string | null;
  taskSnapshot: TaskSnapshot;
  sessionId?: string | null;
}

export interface FewShotTask {
  name: string;
  assignee?: string | null;
  dueDate?: string | null;
  priority: string;
  notes?: string | null;
}

export async function recordTaskFeedback(params: RecordTaskFeedbackParams): Promise<{ id: string }> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("ai_task_feedback")
    .insert({
      user_id: params.userId,
      project_id: params.projectId,
      task_id: params.taskId ?? null,
      signal: params.signal,
      reason: params.reason ?? null,
      task_snapshot: params.taskSnapshot as unknown as Database["public"]["Tables"]["ai_task_feedback"]["Insert"]["task_snapshot"],
      session_id: params.sessionId ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to record task feedback: ${error?.message ?? "unknown error"}`);
  }

  if (params.signal === "bad") {
    await extractBadTaskLearning({
      feedbackId: data.id,
      taskSnapshot: params.taskSnapshot,
      reason: params.reason,
      projectId: params.projectId,
    });
  }

  return { id: data.id };
}

async function extractBadTaskLearning(params: {
  feedbackId: string;
  taskSnapshot: TaskSnapshot;
  reason?: string | null;
  projectId: number;
}) {
  const { taskSnapshot, reason, projectId, feedbackId } = params;
  const taskDescription = [
    `Task name: "${taskSnapshot.name}"`,
    taskSnapshot.assignee ? `Assignee: ${taskSnapshot.assignee}` : null,
    taskSnapshot.dueDate ? `Due: ${taskSnapshot.dueDate}` : null,
    `Priority: ${taskSnapshot.priority}`,
    taskSnapshot.notes ? `Notes: ${taskSnapshot.notes}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const preventionPrompt = reason
    ? `When creating tasks, avoid tasks like: "${taskSnapshot.name}". User feedback: ${reason}`
    : `When creating tasks, avoid tasks similar to: "${taskSnapshot.name}". This was rated as unhelpful.`;

  const learning = await upsertAgentLearning({
    title: `Bad task: "${taskSnapshot.name.slice(0, 80)}"`,
    source: "thumbs_down",
    status: "candidate",
    problemSignature: `bad_task ${taskSnapshot.name.toLowerCase().slice(0, 60)}`,
    symptoms: `User rejected AI-created task. ${taskDescription}${reason ? `. Reason: ${reason}` : ""}`,
    preventionPrompt,
    scopeTags: ["task", "createTask", "schedule"],
    projectId,
    confidence: 0.6,
    evidence: { feedbackId, taskSnapshot },
  });

  if (learning) {
    const supabase = createServiceClient();
    await supabase
      .from("ai_task_feedback")
      .update({ learning_id: learning.id })
      .eq("id", feedbackId);
  }
}

export async function getPositiveFewShotExamples(projectId: number, limit = 3): Promise<FewShotTask[]> {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("ai_task_feedback")
    .select("task_snapshot")
    .eq("signal", "good")
    .eq("promoted", true)
    .or(`project_id.is.null,project_id.eq.${projectId}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data) return [];

  return data
    .map((row) => {
      const snap = row.task_snapshot as unknown as TaskSnapshot;
      return {
        name: snap.name,
        assignee: snap.assignee,
        dueDate: snap.dueDate,
        priority: snap.priority,
        notes: snap.notes,
      };
    })
    .filter((t) => t.name);
}

export async function buildTaskFewShotBlock(projectId: number): Promise<string> {
  const examples = await getPositiveFewShotExamples(projectId);
  if (examples.length === 0) return "";

  const lines = examples.map(
    (ex, i) =>
      `Example ${i + 1}: "${ex.name}"${ex.priority !== "normal" ? ` (priority: ${ex.priority})` : ""}${ex.assignee ? ` — assigned to ${ex.assignee}` : ""}${ex.dueDate ? `, due ${ex.dueDate}` : ""}`,
  );

  return `\n\n### Well-rated task examples for this project (aim for similar quality):\n${lines.join("\n")}`;
}

export async function getAllTaskFeedback(params: {
  projectId?: number;
  signal?: "good" | "bad";
  limit?: number;
  offset?: number;
}): Promise<AiTaskFeedbackRow[]> {
  const supabase = createServiceClient();

  let query = supabase
    .from("ai_task_feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 50)
    .range(params.offset ?? 0, (params.offset ?? 0) + (params.limit ?? 50) - 1);

  if (params.projectId) {
    query = query.eq("project_id", params.projectId);
  }
  if (params.signal) {
    query = query.eq("signal", params.signal);
  }

  const { data } = await query;
  return (data ?? []) as AiTaskFeedbackRow[];
}

export async function promoteTaskFeedback(feedbackId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("ai_task_feedback")
    .update({ promoted: true })
    .eq("id", feedbackId)
    .eq("signal", "good");

  if (error) throw new Error(`Failed to promote feedback: ${error.message}`);
}

export async function demoteTaskFeedback(feedbackId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("ai_task_feedback")
    .update({ promoted: false })
    .eq("id", feedbackId);

  if (error) throw new Error(`Failed to demote feedback: ${error.message}`);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npx tsc --noEmit 2>&1 | grep "task-training-service" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/ai/services/task-training-service.ts
git commit -m "feat(task-training): add task training service"
```

---

## Task 3: API Route — Task Feedback

**Files:**
- Create: `frontend/src/app/api/ai-assistant/task-feedback/route.ts`

- [ ] **Step 1: Write the route**

```typescript
export const dynamic = "force-dynamic";

import { z } from "zod";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { getApiRouteUser } from "@/lib/supabase/server";
import { recordTaskFeedback, promoteTaskFeedback, demoteTaskFeedback } from "@/lib/ai/services/task-training-service";
import { requireAdmin } from "@/app/api/admin/intelligence-compiler/_shared";
import { logger } from "@/lib/logger";

const postBodySchema = z.object({
  projectId: z.number().int().positive(),
  taskId: z.string().uuid().nullable().optional(),
  signal: z.enum(["good", "bad"]),
  reason: z.string().max(1000).nullable().optional(),
  taskSnapshot: z.object({
    name: z.string().min(1).max(500),
    assignee: z.string().max(200).nullable().optional(),
    dueDate: z.string().nullable().optional(),
    priority: z.string().max(50),
    notes: z.string().max(2000).nullable().optional(),
    projectId: z.number(),
  }),
  sessionId: z.string().nullable().optional(),
});

const patchBodySchema = z.object({
  id: z.string().uuid(),
  promoted: z.boolean(),
});

export const POST = withApiGuardrails(
  "/api/ai-assistant/task-feedback#POST",
  async ({ request }) => {
    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "/api/ai-assistant/task-feedback#POST",
        message: "Authentication required.",
        status: 401,
      });
    }

    const raw = await request.json();
    const parsed = postBodySchema.safeParse(raw);
    if (!parsed.success) {
      throw new GuardrailError({
        code: "VALIDATION_ERROR",
        where: "/api/ai-assistant/task-feedback#POST",
        message: "Invalid request body.",
        status: 400,
        details: parsed.error.flatten(),
      });
    }

    const { projectId, taskId, signal, reason, taskSnapshot, sessionId } = parsed.data;

    try {
      const { id } = await recordTaskFeedback({
        userId: user.id,
        projectId,
        taskId: taskId ?? null,
        signal,
        reason: reason ?? null,
        taskSnapshot,
        sessionId: sessionId ?? null,
      });

      logger.info({ msg: "[TaskFeedback] Recorded", data: { id, signal, projectId } });
      return Response.json({ success: true, id });
    } catch (err) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "/api/ai-assistant/task-feedback#POST",
        message: err instanceof Error ? err.message : "Failed to record task feedback.",
        status: 500,
      });
    }
  },
);

export const PATCH = withApiGuardrails(
  "/api/ai-assistant/task-feedback#PATCH",
  async ({ request }) => {
    await requireAdmin("/api/ai-assistant/task-feedback#PATCH");

    const raw = await request.json();
    const parsed = patchBodySchema.safeParse(raw);
    if (!parsed.success) {
      throw new GuardrailError({
        code: "VALIDATION_ERROR",
        where: "/api/ai-assistant/task-feedback#PATCH",
        message: "id (uuid) and promoted (boolean) are required.",
        status: 400,
      });
    }

    const { id, promoted } = parsed.data;
    if (promoted) {
      await promoteTaskFeedback(id);
    } else {
      await demoteTaskFeedback(id);
    }

    return Response.json({ success: true });
  },
);
```

- [ ] **Step 2: Verify TypeScript, commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npx tsc --noEmit 2>&1 | grep "task-feedback" | head -10
git add frontend/src/app/api/ai-assistant/task-feedback/route.ts
git commit -m "feat(task-training): add POST/PATCH task-feedback API route"
```

---

## Task 4: React Hook

**Files:**
- Create: `frontend/src/hooks/use-task-feedback.ts`

- [ ] **Step 1: Write the hook**

```typescript
"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import type { TaskSnapshot } from "@/lib/ai/services/task-training-service";

export type FeedbackSignal = "good" | "bad";

interface UseTaskFeedbackOptions {
  projectId: number;
  taskId?: string | null;
  taskSnapshot: TaskSnapshot;
  sessionId?: string | null;
}

interface UseTaskFeedbackReturn {
  signal: FeedbackSignal | null;
  isSubmitting: boolean;
  submitFeedback: (signal: FeedbackSignal, reason?: string) => Promise<void>;
}

export function useTaskFeedback(options: UseTaskFeedbackOptions): UseTaskFeedbackReturn {
  const [signal, setSignal] = useState<FeedbackSignal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitFeedback = useCallback(
    async (newSignal: FeedbackSignal, reason?: string) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
        await apiFetch("/api/ai-assistant/task-feedback", {
          method: "POST",
          body: JSON.stringify({
            projectId: options.projectId,
            taskId: options.taskId ?? null,
            signal: newSignal,
            reason: reason ?? null,
            taskSnapshot: options.taskSnapshot,
            sessionId: options.sessionId ?? null,
          }),
        });
        setSignal(newSignal);
      } finally {
        setIsSubmitting(false);
      }
    },
    [options, isSubmitting],
  );

  return { signal, isSubmitting, submitFeedback };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/use-task-feedback.ts
git commit -m "feat(task-training): add useTaskFeedback hook"
```

---

## Task 5: TaskFeedbackButtons Component

**Files:**
- Create: `frontend/src/components/ai/TaskFeedbackButtons.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useTaskFeedback, type FeedbackSignal } from "@/hooks/use-task-feedback";
import type { TaskSnapshot } from "@/lib/ai/services/task-training-service";

interface TaskFeedbackButtonsProps {
  projectId: number;
  taskId?: string | null;
  taskSnapshot: TaskSnapshot;
  sessionId?: string | null;
  className?: string;
}

export function TaskFeedbackButtons({
  projectId,
  taskId,
  taskSnapshot,
  sessionId,
  className,
}: TaskFeedbackButtonsProps) {
  const { signal, isSubmitting, submitFeedback } = useTaskFeedback({
    projectId,
    taskId,
    taskSnapshot,
    sessionId,
  });

  const [badReasonOpen, setBadReasonOpen] = useState(false);
  const [badReason, setBadReason] = useState("");

  const handleGood = async () => {
    if (signal) return;
    await submitFeedback("good");
  };

  const handleBadConfirm = async () => {
    setBadReasonOpen(false);
    await submitFeedback("bad", badReason.trim() || undefined);
    setBadReason("");
  };

  if (signal) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        {signal === "good" ? "Marked as good example" : "Feedback recorded"}
      </span>
    );
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-foreground"
        title="Good task — use as training example"
        disabled={isSubmitting}
        onClick={handleGood}
      >
        {isSubmitting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ThumbsUp className="h-3.5 w-3.5" />
        )}
      </Button>

      <Popover open={badReasonOpen} onOpenChange={setBadReasonOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            title="Bad task — help train the AI"
            disabled={isSubmitting}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="end">
          <p className="mb-2 text-sm font-medium">What's wrong with this task?</p>
          <Textarea
            placeholder="Too vague, wrong assignee, already exists... (optional)"
            className="mb-2 min-h-[60px] resize-none text-sm"
            value={badReason}
            onChange={(e) => setBadReason(e.target.value)}
          />
          <div className="flex justify-end gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => setBadReasonOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleBadConfirm} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : null}
              Submit
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript, commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npx tsc --noEmit 2>&1 | grep "TaskFeedback" | head -10
git add frontend/src/components/ai/TaskFeedbackButtons.tsx
git commit -m "feat(task-training): add TaskFeedbackButtons component"
```

---

## Task 6: Wire Buttons to AI Chat Task Previews

**Files:**
- Modify: the chat component that renders `schedule_tasks` previews (find with grep)

- [ ] **Step 1: Find the render location**

```bash
grep -rn "schedule_tasks\|createTask\|preview.*fields" \
  /Users/meganharrison/Documents/alleato-pm/frontend/src/components/chat/ \
  --include="*.tsx" | head -20
```

- [ ] **Step 2: Read that file, find the preview card, add TaskFeedbackButtons**

Import:
```tsx
import { TaskFeedbackButtons } from "@/components/ai/TaskFeedbackButtons";
```

Add below the task preview content:
```tsx
<div className="mt-2 flex items-center justify-end">
  <TaskFeedbackButtons
    projectId={fields.project_id}
    taskSnapshot={{
      name: fields.name,
      assignee: fields.assignee ?? null,
      dueDate: fields.finish_date ?? null,
      priority: fields.priority ?? "normal",
      notes: null,
      projectId: fields.project_id,
    }}
    sessionId={sessionId}
  />
</div>
```

Also add on confirmed task results (where `toolResult.task.id` is available), passing `taskId={toolResult.task.id}`.

- [ ] **Step 3: Verify TypeScript, commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npx tsc --noEmit 2>&1 | grep -i "chat\|task" | head -10
git add frontend/src/components/chat/
git commit -m "feat(task-training): wire TaskFeedbackButtons onto AI task preview and confirmation cards"
```

---

## Task 7: Inject Few-Shot Examples into createTask

**Files:**
- Modify: `frontend/src/lib/ai/tools/action-tools.ts` (the `!confirmed` branch of `createTask`)

- [ ] **Step 1: Add import at top of action-tools.ts**

```typescript
import { buildTaskFewShotBlock } from "@/lib/ai/services/task-training-service";
```

- [ ] **Step 2: In the `!confirmed` branch, fetch and append few-shot block**

Replace the `return { action: "preview", message: "...", preview: {...} }` with:

```typescript
let fewShotBlock = "";
try {
  fewShotBlock = await buildTaskFewShotBlock(projectId);
} catch {
  // non-critical — proceed without examples
}

return {
  action: "preview",
  message: `Here's the task I'll create. Reply **confirm** to proceed.${fewShotBlock}`,
  preview: {
    table: "schedule_tasks",
    fields: {
      project_id: projectId,
      name: notes ? `${name} — ${notes}` : name,
      status: "not_started",
      finish_date: dueDate ?? null,
      assignee: assignee ?? null,
      priority,
    },
  },
};
```

- [ ] **Step 3: Verify TypeScript, commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npx tsc --noEmit 2>&1 | grep "action-tools" | head -10
git add frontend/src/lib/ai/tools/action-tools.ts
git commit -m "feat(task-training): inject promoted few-shot examples into createTask preview"
```

---

## Task 8: Admin Review Page

**Files:**
- Create: `frontend/src/app/(admin)/task-training/page.tsx`
- Create: `frontend/src/app/(admin)/task-training/TaskTrainingClient.tsx`
- Modify: `frontend/src/components/nav/app-sidebar.tsx` (add nav entry)

- [ ] **Step 1: Write page.tsx**

```tsx
export const dynamic = "force-dynamic";

import { PageShell } from "@/components/layout";
import { TaskTrainingClient } from "./TaskTrainingClient";
import { getAllTaskFeedback } from "@/lib/ai/services/task-training-service";
import { requireAdmin } from "@/app/api/admin/intelligence-compiler/_shared";

export default async function TaskTrainingPage() {
  await requireAdmin("task-training-page");

  const [goodFeedback, badFeedback] = await Promise.all([
    getAllTaskFeedback({ signal: "good", limit: 100 }),
    getAllTaskFeedback({ signal: "bad", limit: 100 }),
  ]);

  return (
    <PageShell variant="content" title="Task Training">
      <TaskTrainingClient goodFeedback={goodFeedback} badFeedback={badFeedback} />
    </PageShell>
  );
}
```

- [ ] **Step 2: Write TaskTrainingClient.tsx**

```tsx
"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionHeader } from "@/components/ds/section-header";
import { EmptyState } from "@/components/ds/empty-state";
import { apiFetch } from "@/lib/api-client";
import type { Database } from "@/types/database.types";
import { formatDistanceToNow } from "date-fns";

type FeedbackRow = Database["public"]["Tables"]["ai_task_feedback"]["Row"];
type TaskSnap = { name: string; assignee?: string | null; dueDate?: string | null; priority: string };

interface Props {
  goodFeedback: FeedbackRow[];
  badFeedback: FeedbackRow[];
}

export function TaskTrainingClient({ goodFeedback: initialGood, badFeedback }: Props) {
  const [goodFeedback, setGoodFeedback] = useState(initialGood);
  const [promoting, setPromoting] = useState<string | null>(null);

  const handleTogglePromote = async (row: FeedbackRow) => {
    setPromoting(row.id);
    try {
      await apiFetch("/api/ai-assistant/task-feedback", {
        method: "PATCH",
        body: JSON.stringify({ id: row.id, promoted: !row.promoted }),
      });
      setGoodFeedback((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, promoted: !r.promoted } : r)),
      );
    } finally {
      setPromoting(null);
    }
  };

  return (
    <Tabs defaultValue="good">
      <TabsList className="mb-4">
        <TabsTrigger value="good">
          <ThumbsUp className="mr-1.5 h-3.5 w-3.5" />
          Good Examples ({goodFeedback.length})
        </TabsTrigger>
        <TabsTrigger value="bad">
          <ThumbsDown className="mr-1.5 h-3.5 w-3.5" />
          Bad Examples ({badFeedback.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="good">
        <SectionHeader
          title="Good Task Examples"
          description="Promote examples to inject them as few-shot context when the AI creates new tasks."
        />
        {goodFeedback.length === 0 ? (
          <EmptyState
            icon={<ThumbsUp />}
            title="No good examples yet"
            description="When users mark AI tasks as good, they'll appear here for promotion."
          />
        ) : (
          <div className="mt-4 space-y-2">
            {goodFeedback.map((row) => {
              const snap = row.task_snapshot as unknown as TaskSnap;
              return (
                <div key={row.id} className="flex items-start justify-between rounded-lg bg-muted/40 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{snap.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Priority: {snap.priority}
                      {snap.assignee ? ` · ${snap.assignee}` : ""}
                      {" · "}
                      {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={row.promoted ? "default" : "outline"}
                    className="ml-4 shrink-0"
                    disabled={promoting === row.id}
                    onClick={() => handleTogglePromote(row)}
                  >
                    {row.promoted ? (
                      <>
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                        Promoted
                      </>
                    ) : (
                      "Promote"
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </TabsContent>

      <TabsContent value="bad">
        <SectionHeader
          title="Bad Task Feedback"
          description="These tasks were marked as unhelpful. Learnings have been extracted and added to the AI's prevention prompts."
        />
        {badFeedback.length === 0 ? (
          <EmptyState
            icon={<ThumbsDown />}
            title="No bad examples yet"
            description="When users flag AI tasks as unhelpful, they'll appear here."
          />
        ) : (
          <div className="mt-4 space-y-2">
            {badFeedback.map((row) => {
              const snap = row.task_snapshot as unknown as TaskSnap;
              return (
                <div key={row.id} className="flex items-start gap-4 rounded-lg bg-muted/40 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{snap.name}</p>
                    {row.reason && (
                      <p className="mt-0.5 text-xs italic text-muted-foreground">"{row.reason}"</p>
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                      {row.learning_id ? " · Learning extracted" : " · No learning yet"}
                    </p>
                  </div>
                  {row.learning_id ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
```

- [ ] **Step 3: Add nav entry to app-sidebar.tsx**

Find the admin section and add a Task Training link. Check exact structure first:
```bash
grep -n "intelligence-compiler\|feedback-inbox\|command-center" \
  /Users/meganharrison/Documents/alleato-pm/frontend/src/components/nav/app-sidebar.tsx | head -10
```

Add `{ title: "Task Training", url: "/admin/task-training", icon: Brain }` in the admin nav items array. Import `Brain` from `lucide-react`.

- [ ] **Step 4: Verify TypeScript, commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npx tsc --noEmit 2>&1 | grep "task-training\|TaskTraining" | head -10
git add frontend/src/app/(admin)/task-training/ frontend/src/components/nav/app-sidebar.tsx
git commit -m "feat(task-training): add admin task training review page"
```

---

## Task 9: Quality Gate + Smoke Test

- [ ] **Step 1: Full quality gate**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npm run quality
```

- [ ] **Step 2: Add endpoint to smoke test script**

```bash
grep -n "ai-assistant" /Users/meganharrison/Documents/alleato-pm/scripts/api-smoke-test.sh | tail -5
```

Add the new endpoint in the appropriate section of `scripts/api-smoke-test.sh`.

- [ ] **Step 3: Final commit**

```bash
git add scripts/api-smoke-test.sh
git commit -m "feat(task-training): add smoke test entry and run quality gate"
```
