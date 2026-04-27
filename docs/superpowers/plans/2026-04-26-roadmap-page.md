# Roadmap Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a two-column admin roadmap page at `/admin/roadmap` where the team can view, create, edit, reorder, and delete upcoming features grouped by priority phase.

**Architecture:** A Supabase `roadmap_items` table stores all features; four Next.js API routes under `/api/admin/roadmap` handle CRUD; a React Query hook manages data fetching and mutations; the page renders as a client component with a 30/70 split — phase selector cards on the left, a dnd-kit–sortable vertical timeline on the right.

**Tech Stack:** Next.js 15 App Router, Supabase (service client), React Query (TanStack Query), @dnd-kit/sortable, React Hook Form + Zod, shadcn Sheet, `withApiGuardrails`, `apiFetch`.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/20260426140000_roadmap_items.sql` | Table + seed data |
| Create | `frontend/src/lib/schemas/roadmap-schema.ts` | Zod schemas + inferred types |
| Create | `frontend/src/app/api/admin/roadmap/route.ts` | GET + POST handlers |
| Create | `frontend/src/app/api/admin/roadmap/[roadmapItemId]/route.ts` | PATCH + DELETE handlers |
| Create | `frontend/src/hooks/use-roadmap-items.ts` | React Query hooks |
| Create | `frontend/src/components/domain/roadmap/roadmap-phase-card.tsx` | Left-column phase card |
| Create | `frontend/src/components/domain/roadmap/roadmap-item-form.tsx` | Create/edit Sheet form |
| Create | `frontend/src/components/domain/roadmap/roadmap-item-actions.tsx` | `...` dropdown (edit/delete) |
| Create | `frontend/src/components/domain/roadmap/roadmap-timeline-item.tsx` | Single timeline dot + content |
| Create | `frontend/src/components/domain/roadmap/roadmap-sortable-list.tsx` | dnd-kit sortable wrapper per phase |
| Create | `frontend/src/components/domain/roadmap/roadmap-timeline.tsx` | Right-column full timeline |
| Create | `frontend/src/app/(admin)/roadmap/page.tsx` | Page shell + data loader |
| Modify | `frontend/src/lib/navigation-config.ts` | Add Roadmap to adminSettingsTools |

---

## Task 1: Database Migration + Seed

**Files:**
- Create: `supabase/migrations/20260426140000_roadmap_items.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260426140000_roadmap_items.sql

create table roadmap_items (
  id uuid primary key default gen_random_uuid(),
  phase text not null check (phase in ('in_progress', 'immediate', 'high_priority', 'future')),
  title text not null,
  description text,
  bullet_points text[] default '{}',
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Seed from ROADMAP.md content
insert into roadmap_items (phase, title, description, bullet_points, sort_order) values
(
  'in_progress',
  'Integrated dev environment (AI coding bridge)',
  'Collapses Claude.ai chat, Claude Code in terminal, and Alleato in browser into one workflow. Megan clicks a floating "Report Issue" button, submits a note, and Claude Code diagnoses and replies — all without leaving the app.',
  array[
    'Dev annotation overlay (dev mode only)',
    'Screenshot + URL + element info captured on submit',
    'Claude Code polls for new annotations and posts replies'
  ],
  0
),
(
  'immediate',
  'Client feedback system (triage inbox)',
  'Before any client gets access to Alleato, there needs to be a way for them to report issues and for Megan to manage them. Clients annotate → Megan reviews in triage inbox → Megan decides what happens.',
  array[
    'Client-facing "Leave feedback" button on client-dashboard pages',
    'Internal triage inbox at /feedback with one-click actions',
    'Slack notification on new feedback'
  ],
  0
),
(
  'immediate',
  'Subcontractor invoice & billing submission',
  'Subcontractors submit invoices and sign commitment terms via a magic-link approach — no account creation, no password, no learning curve. Works like DocuSign or Typeform.',
  array[
    'Magic link scoped to commitment (UUID token)',
    'Typed signature + timestamp capture',
    'Admin view: submission status per subcontractor'
  ],
  1
),
(
  'immediate',
  'Nightly proactive intelligence scan',
  'The AI only responds when asked. This makes it proactive — surfacing budget variances, overdue RFIs, and pending COs before anyone thinks to ask.',
  array[
    'Cron job scanning budget variance >8%, overdue RFIs, stale COs',
    'Stores results in proactive_alerts table',
    'Daily digest via email or in-app notification'
  ],
  2
),
(
  'immediate',
  'RFI, RFQ, and submittal workflow',
  'Workflow status progression, notification triggers, and dashboards for RFIs (questions to architects), RFQs (quotes from subs), and submittals (shop drawing approvals).',
  array[
    'Status progression: who does what, in what order',
    'Email/notification triggers at each stage',
    'Dashboard: open RFIs by ball-in-court, overdue submittals by project'
  ],
  3
),
(
  'high_priority',
  'Meeting → project update automation',
  'After a Fireflies meeting is ingested, automatically draft a status update, flag new risks from the transcript, and create tasks from action items — then ask for review before saving.',
  array[
    'Trigger on new meeting transcript ingested',
    'AI extracts risks, action items, and decisions',
    'Review UI: approve/dismiss per item before saving'
  ],
  0
),
(
  'high_priority',
  'Voice-in → action-out (mobile)',
  'Press-hold to record a voice note while driving to a jobsite. AI recognizes intent and creates the right Alleato record.',
  array[
    'Mobile-friendly press-hold voice input in chat',
    'Transcribed via Whisper API',
    'AI calls the appropriate action tool to create the record'
  ],
  1
),
(
  'high_priority',
  'Predictive budget variance model',
  'Owners pay a premium for forward-looking financial visibility. Query historical budget data, find patterns, and show a confidence range for how current projects will trend.',
  array[
    'Pattern: at what % complete do COs typically spike?',
    'Compare current project against comparable completed projects',
    'Output: confidence range displayed in financial dashboard'
  ],
  2
),
(
  'future',
  'Client-facing dashboard (scoped read-only + AI)',
  'Clients log in to see their project in real time and ask the AI questions — no internal notes, no margin data, no subcontractor pricing visible.',
  array[
    'Scoped: client sees ONLY their project',
    'AI filtered: no internal or pricing data',
    'Read-only: no actions for clients'
  ],
  0
),
(
  'future',
  'Agent-to-agent autonomous workflows',
  'Multiple AI agents coordinate to handle end-to-end construction workflows without manual intervention.',
  array[
    'Agents hand off tasks between each other',
    'Human-in-the-loop checkpoints for critical decisions',
    'Full audit trail of agent actions'
  ],
  1
);
```

- [ ] **Step 2: Run the migration**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npx supabase db push
```

Expected: migration applies without error.

- [ ] **Step 3: Verify the table and seed data**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npx supabase db execute --local "select phase, title, sort_order from roadmap_items order by phase, sort_order;"
```

Expected: 10 rows returned across 4 phases.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260426140000_roadmap_items.sql
git commit -m "feat: add roadmap_items table with seed data"
```

---

## Task 2: Zod Schema

**Files:**
- Create: `frontend/src/lib/schemas/roadmap-schema.ts`

- [ ] **Step 1: Write the schema file**

```ts
// frontend/src/lib/schemas/roadmap-schema.ts
import { z } from "zod";

export const ROADMAP_PHASES = ["in_progress", "immediate", "high_priority", "future"] as const;
export type RoadmapPhase = (typeof ROADMAP_PHASES)[number];

export const PHASE_META: Record<RoadmapPhase, { label: string; dotColor: string; cardColor: string }> = {
  in_progress:   { label: "In Progress",   dotColor: "bg-blue-500",   cardColor: "border-l-blue-500" },
  immediate:     { label: "Immediate",     dotColor: "bg-orange-500", cardColor: "border-l-orange-500" },
  high_priority: { label: "High Priority", dotColor: "bg-yellow-500", cardColor: "border-l-yellow-500" },
  future:        { label: "Future",        dotColor: "bg-green-500",  cardColor: "border-l-green-500" },
};

export const roadmapItemSchema = z.object({
  id: z.string().uuid(),
  phase: z.enum(ROADMAP_PHASES),
  title: z.string().min(1, "Title is required"),
  description: z.string().nullable().optional(),
  bullet_points: z.array(z.string()).default([]),
  sort_order: z.number().int().default(0),
  created_at: z.string(),
  updated_at: z.string(),
});

export const createRoadmapItemSchema = z.object({
  phase: z.enum(ROADMAP_PHASES),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().default(""),
  bullet_points: z.array(z.string().min(1)).default([]),
  sort_order: z.number().int().optional().default(0),
});

export const updateRoadmapItemSchema = createRoadmapItemSchema.partial().extend({
  sort_order: z.number().int().optional(),
});

export type RoadmapItem = z.infer<typeof roadmapItemSchema>;
export type CreateRoadmapItemInput = z.infer<typeof createRoadmapItemSchema>;
export type UpdateRoadmapItemInput = z.infer<typeof updateRoadmapItemSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/schemas/roadmap-schema.ts
git commit -m "feat: add Zod schema for roadmap items"
```

---

## Task 3: API Routes — GET + POST

**Files:**
- Create: `frontend/src/app/api/admin/roadmap/route.ts`

- [ ] **Step 1: Write the route file**

```ts
// frontend/src/app/api/admin/roadmap/route.ts
import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createRoadmapItemSchema } from "@/lib/schemas/roadmap-schema";

const PHASE_ORDER = ["in_progress", "immediate", "high_priority", "future"] as const;

async function requireAdmin() {
  const user = await getApiRouteUser();
  if (!user) return null;
  const supa = createServiceClient();
  const { data } = await supa
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  return data?.is_admin ? user : null;
}

export const GET = withApiGuardrails("/api/admin/roadmap#GET", async () => {
  const user = await requireAdmin();
  if (!user) {
    throw new GuardrailError({ code: "FORBIDDEN", where: "/api/admin/roadmap#GET", message: "Admin access required.", status: 403 });
  }

  const supa = createServiceClient();
  const { data, error } = await supa
    .from("roadmap_items")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new GuardrailError({ code: "INTERNAL_ERROR", where: "/api/admin/roadmap#GET", message: error.message });
  }

  // Sort by phase order, then sort_order within phase
  const sorted = (data ?? []).sort((a, b) => {
    const phaseA = PHASE_ORDER.indexOf(a.phase as typeof PHASE_ORDER[number]);
    const phaseB = PHASE_ORDER.indexOf(b.phase as typeof PHASE_ORDER[number]);
    if (phaseA !== phaseB) return phaseA - phaseB;
    return a.sort_order - b.sort_order;
  });

  return NextResponse.json({ items: sorted });
});

export const POST = withApiGuardrails("/api/admin/roadmap#POST", async ({ request }) => {
  const user = await requireAdmin();
  if (!user) {
    throw new GuardrailError({ code: "FORBIDDEN", where: "/api/admin/roadmap#POST", message: "Admin access required.", status: 403 });
  }

  const body = await request.json();
  const parsed = createRoadmapItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  // Set sort_order to end of phase by default
  const supa = createServiceClient();
  const { count } = await supa
    .from("roadmap_items")
    .select("*", { count: "exact", head: true })
    .eq("phase", parsed.data.phase);

  const { data, error } = await supa
    .from("roadmap_items")
    .insert({ ...parsed.data, sort_order: parsed.data.sort_order ?? (count ?? 0) })
    .select("*")
    .single();

  if (error) {
    throw new GuardrailError({ code: "INTERNAL_ERROR", where: "/api/admin/roadmap#POST", message: error.message });
  }

  return NextResponse.json({ item: data }, { status: 201 });
});
```

- [ ] **Step 2: Smoke-test GET**

```bash
curl -s http://localhost:3000/api/admin/roadmap | jq '.items | length'
```

Expected: `10` (the seeded items).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/api/admin/roadmap/route.ts
git commit -m "feat: add GET + POST API routes for roadmap items"
```

---

## Task 4: API Routes — PATCH + DELETE

**Files:**
- Create: `frontend/src/app/api/admin/roadmap/[roadmapItemId]/route.ts`

- [ ] **Step 1: Write the route file**

```ts
// frontend/src/app/api/admin/roadmap/[roadmapItemId]/route.ts
import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { updateRoadmapItemSchema } from "@/lib/schemas/roadmap-schema";

async function requireAdmin() {
  const user = await getApiRouteUser();
  if (!user) return null;
  const supa = createServiceClient();
  const { data } = await supa
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  return data?.is_admin ? user : null;
}

export const PATCH = withApiGuardrails(
  "/api/admin/roadmap/[roadmapItemId]#PATCH",
  async ({ request, params }) => {
    const user = await requireAdmin();
    if (!user) {
      throw new GuardrailError({ code: "FORBIDDEN", where: "/api/admin/roadmap#PATCH", message: "Admin access required.", status: 403 });
    }

    const { roadmapItemId } = await params;
    const body = await request.json();
    const parsed = updateRoadmapItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
    }

    const supa = createServiceClient();
    const { data, error } = await supa
      .from("roadmap_items")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", roadmapItemId)
      .select("*")
      .single();

    if (error) {
      throw new GuardrailError({ code: "INTERNAL_ERROR", where: "/api/admin/roadmap#PATCH", message: error.message });
    }

    return NextResponse.json({ item: data });
  }
);

export const DELETE = withApiGuardrails(
  "/api/admin/roadmap/[roadmapItemId]#DELETE",
  async ({ params }) => {
    const user = await requireAdmin();
    if (!user) {
      throw new GuardrailError({ code: "FORBIDDEN", where: "/api/admin/roadmap#DELETE", message: "Admin access required.", status: 403 });
    }

    const { roadmapItemId } = await params;
    const supa = createServiceClient();
    const { error } = await supa
      .from("roadmap_items")
      .delete()
      .eq("id", roadmapItemId);

    if (error) {
      throw new GuardrailError({ code: "INTERNAL_ERROR", where: "/api/admin/roadmap#DELETE", message: error.message });
    }

    return NextResponse.json({ deleted: true });
  }
);
```

- [ ] **Step 2: Verify route check passes**

```bash
cd frontend && npm run check:routes
```

Expected: no conflicts reported.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/api/admin/roadmap/[roadmapItemId]/route.ts
git commit -m "feat: add PATCH + DELETE API routes for roadmap items"
```

---

## Task 5: React Query Hook

**Files:**
- Create: `frontend/src/hooks/use-roadmap-items.ts`

- [ ] **Step 1: Write the hook file**

```ts
// frontend/src/hooks/use-roadmap-items.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import {
  type RoadmapItem,
  type CreateRoadmapItemInput,
  type UpdateRoadmapItemInput,
  ROADMAP_PHASES,
  type RoadmapPhase,
} from "@/lib/schemas/roadmap-schema";

const QUERY_KEY = ["roadmap-items"];

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useRoadmapItems() {
  return useQuery<RoadmapItem[]>({
    queryKey: QUERY_KEY,
    queryFn: ({ signal }) =>
      apiFetch<{ items: RoadmapItem[] }>("/api/admin/roadmap", { signal }).then(
        (res) => res.items
      ),
  });
}

/** Returns items grouped by phase in canonical phase order */
export function useRoadmapItemsByPhase() {
  const query = useRoadmapItems();
  const grouped: Record<RoadmapPhase, RoadmapItem[]> = {
    in_progress: [],
    immediate: [],
    high_priority: [],
    future: [],
  };
  for (const item of query.data ?? []) {
    grouped[item.phase as RoadmapPhase]?.push(item);
  }
  return { ...query, grouped };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateRoadmapItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRoadmapItemInput) =>
      apiFetch<{ item: RoadmapItem }>("/api/admin/roadmap", {
        method: "POST",
        body: JSON.stringify(input),
      }).then((res) => res.item),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Feature added to roadmap");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create item: ${error.message}`);
    },
  });
}

export function useUpdateRoadmapItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }: UpdateRoadmapItemInput & { id: string }) =>
      apiFetch<{ item: RoadmapItem }>(`/api/admin/roadmap/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      }).then((res) => res.item),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Roadmap item updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update item: ${error.message}`);
    },
  });
}

export function useDeleteRoadmapItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/admin/roadmap/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Roadmap item deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete item: ${error.message}`);
    },
  });
}

export function useReorderRoadmapItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updates: Array<{ id: string; sort_order: number }>) =>
      Promise.all(
        updates.map(({ id, sort_order }) =>
          apiFetch(`/api/admin/roadmap/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ sort_order }),
          })
        )
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (error: Error) => {
      toast.error(`Failed to reorder: ${error.message}`);
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/use-roadmap-items.ts
git commit -m "feat: add React Query hooks for roadmap items"
```

---

## Task 6: Phase Card Component

**Files:**
- Create: `frontend/src/components/domain/roadmap/roadmap-phase-card.tsx`

- [ ] **Step 1: Write the component**

```tsx
// frontend/src/components/domain/roadmap/roadmap-phase-card.tsx
"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { type RoadmapPhase, PHASE_META } from "@/lib/schemas/roadmap-schema";

interface RoadmapPhaseCardProps {
  phase: RoadmapPhase;
  itemCount: number;
  isActive: boolean;
  onClick: () => void;
  onAddClick: () => void;
}

export function RoadmapPhaseCard({
  phase,
  itemCount,
  isActive,
  onClick,
  onAddClick,
}: RoadmapPhaseCardProps) {
  const meta = PHASE_META[phase];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full text-left px-4 py-4 rounded-lg border-l-4 transition-all",
        "bg-card hover:bg-muted/50",
        meta.cardColor,
        isActive ? "bg-muted/60 shadow-xs" : "border-l-transparent hover:border-l-current"
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Phase {Object.keys(PHASE_META).indexOf(phase) + 1}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">{meta.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {itemCount} {itemCount === 1 ? "feature" : "features"}
          </p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onAddClick();
          }}
          aria-label={`Add feature to ${meta.label}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/domain/roadmap/roadmap-phase-card.tsx
git commit -m "feat: add RoadmapPhaseCard component"
```

---

## Task 7: Item Form (Create/Edit Sheet)

**Files:**
- Create: `frontend/src/components/domain/roadmap/roadmap-item-form.tsx`

- [ ] **Step 1: Write the component**

```tsx
// frontend/src/components/domain/roadmap/roadmap-item-form.tsx
"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  createRoadmapItemSchema,
  type CreateRoadmapItemInput,
  type RoadmapItem,
  ROADMAP_PHASES,
  PHASE_META,
} from "@/lib/schemas/roadmap-schema";

interface RoadmapItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPhase?: CreateRoadmapItemInput["phase"];
  existingItem?: RoadmapItem;
  onSubmit: (data: CreateRoadmapItemInput) => Promise<void>;
  isPending: boolean;
}

export function RoadmapItemForm({
  open,
  onOpenChange,
  defaultPhase = "immediate",
  existingItem,
  onSubmit,
  isPending,
}: RoadmapItemFormProps) {
  const form = useForm<CreateRoadmapItemInput>({
    resolver: zodResolver(createRoadmapItemSchema),
    defaultValues: {
      phase: defaultPhase,
      title: "",
      description: "",
      bullet_points: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    // @ts-expect-error — useFieldArray expects object fields; we wrap strings
    name: "bullet_points",
  });

  // Reset form when editing a different item or opening fresh
  useEffect(() => {
    if (open) {
      form.reset({
        phase: existingItem?.phase ?? defaultPhase,
        title: existingItem?.title ?? "",
        description: existingItem?.description ?? "",
        bullet_points: existingItem?.bullet_points ?? [],
      });
    }
  }, [open, existingItem, defaultPhase, form]);

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit(data);
    onOpenChange(false);
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{existingItem ? "Edit Feature" : "Add Feature"}</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
            {/* Phase */}
            <FormField
              control={form.control}
              name="phase"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phase</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select phase" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROADMAP_PHASES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {PHASE_META[p].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Feature name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What does this feature do and why does it matter?"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Bullet Points */}
            <div className="flex flex-col gap-2">
              <FormLabel>Key Details</FormLabel>
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <Input
                    {...form.register(`bullet_points.${index}` as const)}
                    placeholder={`Detail ${index + 1}`}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-1 w-fit"
                onClick={() => append("")}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add detail
              </Button>
            </div>

            <SheetFooter className="mt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : existingItem ? "Save Changes" : "Add Feature"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/domain/roadmap/roadmap-item-form.tsx
git commit -m "feat: add RoadmapItemForm sheet component"
```

---

## Task 8: Item Actions Dropdown

**Files:**
- Create: `frontend/src/components/domain/roadmap/roadmap-item-actions.tsx`

- [ ] **Step 1: Write the component**

```tsx
// frontend/src/components/domain/roadmap/roadmap-item-actions.tsx
"use client";

import { useState } from "react";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDeleteDialog } from "@/components/ds/ConfirmDeleteDialog";
import { type RoadmapItem } from "@/lib/schemas/roadmap-schema";

interface RoadmapItemActionsProps {
  item: RoadmapItem;
  onEdit: (item: RoadmapItem) => void;
  onDelete: (id: string) => Promise<void>;
  isDeleting: boolean;
}

export function RoadmapItemActions({
  item,
  onEdit,
  onDelete,
  isDeleting,
}: RoadmapItemActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="More options"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(item)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        itemName={item.title}
        onConfirm={() => onDelete(item.id)}
        isDeleting={isDeleting}
      />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/domain/roadmap/roadmap-item-actions.tsx
git commit -m "feat: add RoadmapItemActions dropdown component"
```

---

## Task 9: Timeline Item Component

**Files:**
- Create: `frontend/src/components/domain/roadmap/roadmap-timeline-item.tsx`

- [ ] **Step 1: Write the component**

```tsx
// frontend/src/components/domain/roadmap/roadmap-timeline-item.tsx
"use client";

import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";
import { type RoadmapItem, type RoadmapPhase, PHASE_META } from "@/lib/schemas/roadmap-schema";
import { RoadmapItemActions } from "./roadmap-item-actions";

interface RoadmapTimelineItemProps {
  item: RoadmapItem;
  phase: RoadmapPhase;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
  isDragging?: boolean;
  onEdit: (item: RoadmapItem) => void;
  onDelete: (id: string) => Promise<void>;
  isDeleting: boolean;
}

export function RoadmapTimelineItem({
  item,
  phase,
  dragHandleProps,
  isDragging,
  onEdit,
  onDelete,
  isDeleting,
}: RoadmapTimelineItemProps) {
  const meta = PHASE_META[phase];

  return (
    <div
      className={cn(
        "group relative flex gap-6 pb-8",
        isDragging && "opacity-50"
      )}
    >
      {/* Dot */}
      <div className="relative flex flex-col items-center">
        <span className={cn("mt-1.5 h-3 w-3 rounded-full shrink-0 ring-2 ring-background", meta.dotColor)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 -mt-0.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground leading-snug pr-2">
            {item.title}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            {/* Drag handle */}
            <span
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
              aria-label="Drag to reorder"
            >
              <GripVertical className="h-4 w-4" />
            </span>
            <RoadmapItemActions
              item={item}
              onEdit={onEdit}
              onDelete={onDelete}
              isDeleting={isDeleting}
            />
          </div>
        </div>

        {item.description && (
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
            {item.description}
          </p>
        )}

        {item.bullet_points && item.bullet_points.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1">
            {item.bullet_points.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/domain/roadmap/roadmap-timeline-item.tsx
git commit -m "feat: add RoadmapTimelineItem component"
```

---

## Task 10: Sortable List (dnd-kit)

**Files:**
- Create: `frontend/src/components/domain/roadmap/roadmap-sortable-list.tsx`

- [ ] **Step 1: Write the component**

```tsx
// frontend/src/components/domain/roadmap/roadmap-sortable-list.tsx
"use client";

import { useCallback } from "react";
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type RoadmapItem, type RoadmapPhase } from "@/lib/schemas/roadmap-schema";
import { RoadmapTimelineItem } from "./roadmap-timeline-item";

interface SortableItemProps {
  item: RoadmapItem;
  phase: RoadmapPhase;
  onEdit: (item: RoadmapItem) => void;
  onDelete: (id: string) => Promise<void>;
  isDeleting: boolean;
}

function SortableItem({ item, phase, onEdit, onDelete, isDeleting }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <RoadmapTimelineItem
        item={item}
        phase={phase}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
        onEdit={onEdit}
        onDelete={onDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}

interface RoadmapSortableListProps {
  phase: RoadmapPhase;
  items: RoadmapItem[];
  onReorder: (updates: Array<{ id: string; sort_order: number }>) => void;
  onEdit: (item: RoadmapItem) => void;
  onDelete: (id: string) => Promise<void>;
  isDeleting: boolean;
}

export function RoadmapSortableList({
  phase,
  items,
  onReorder,
  onEdit,
  onDelete,
  isDeleting,
}: RoadmapSortableListProps) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      const reordered = arrayMove(items, oldIndex, newIndex);

      onReorder(reordered.map((item, idx) => ({ id: item.id, sort_order: idx })));
    },
    [items, onReorder]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {items.map((item) => (
          <SortableItem
            key={item.id}
            item={item}
            phase={phase}
            onEdit={onEdit}
            onDelete={onDelete}
            isDeleting={isDeleting}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/domain/roadmap/roadmap-sortable-list.tsx
git commit -m "feat: add RoadmapSortableList with dnd-kit"
```

---

## Task 11: Timeline Component

**Files:**
- Create: `frontend/src/components/domain/roadmap/roadmap-timeline.tsx`

- [ ] **Step 1: Write the component**

```tsx
// frontend/src/components/domain/roadmap/roadmap-timeline.tsx
"use client";

import { useCallback } from "react";
import { EmptyState } from "@/components/ds/empty-state";
import { Plus, MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROADMAP_PHASES, PHASE_META, type RoadmapPhase, type RoadmapItem } from "@/lib/schemas/roadmap-schema";
import { RoadmapSortableList } from "./roadmap-sortable-list";

interface RoadmapTimelineProps {
  grouped: Record<RoadmapPhase, RoadmapItem[]>;
  onAddToPhase: (phase: RoadmapPhase) => void;
  onEdit: (item: RoadmapItem) => void;
  onDelete: (id: string) => Promise<void>;
  onReorder: (updates: Array<{ id: string; sort_order: number }>) => void;
  isDeleting: boolean;
}

export function RoadmapTimeline({
  grouped,
  onAddToPhase,
  onEdit,
  onDelete,
  onReorder,
  isDeleting,
}: RoadmapTimelineProps) {
  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[5px] top-2 bottom-0 w-px bg-border" aria-hidden />

      <div className="flex flex-col">
        {ROADMAP_PHASES.map((phase) => {
          const items = grouped[phase];
          const meta = PHASE_META[phase];

          return (
            <section
              key={phase}
              id={`phase-${phase}`}
              className="scroll-mt-8 pb-10"
            >
              {/* Phase heading */}
              <div className="flex items-center gap-3 mb-6 pl-0">
                <span className={`h-3 w-3 rounded-full shrink-0 ${meta.dotColor} ring-2 ring-background`} />
                <h2 className="text-base font-semibold text-foreground">{meta.label}</h2>
                <span className="text-xs text-muted-foreground">
                  {items.length} {items.length === 1 ? "feature" : "features"}
                </span>
              </div>

              {/* Items or empty state */}
              <div className="pl-9">
                {items.length === 0 ? (
                  <EmptyState
                    icon={<MapIcon className="h-5 w-5" />}
                    title="No features yet"
                    description={`Add the first feature to the ${meta.label} phase.`}
                    action={
                      <Button size="sm" onClick={() => onAddToPhase(phase)}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Add feature
                      </Button>
                    }
                  />
                ) : (
                  <RoadmapSortableList
                    phase={phase}
                    items={items}
                    onReorder={onReorder}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    isDeleting={isDeleting}
                  />
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/domain/roadmap/roadmap-timeline.tsx
git commit -m "feat: add RoadmapTimeline component"
```

---

## Task 12: Page Component

**Files:**
- Create: `frontend/src/app/(admin)/roadmap/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
// frontend/src/app/(admin)/roadmap/page.tsx
"use client";

import { useState, useCallback } from "react";
import { PageShell } from "@/components/layout";
import { ErrorState } from "@/components/ds/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useRoadmapItemsByPhase,
  useCreateRoadmapItem,
  useUpdateRoadmapItem,
  useDeleteRoadmapItem,
  useReorderRoadmapItems,
} from "@/hooks/use-roadmap-items";
import {
  ROADMAP_PHASES,
  type RoadmapPhase,
  type RoadmapItem,
  type CreateRoadmapItemInput,
} from "@/lib/schemas/roadmap-schema";
import { RoadmapPhaseCard } from "@/components/domain/roadmap/roadmap-phase-card";
import { RoadmapTimeline } from "@/components/domain/roadmap/roadmap-timeline";
import { RoadmapItemForm } from "@/components/domain/roadmap/roadmap-item-form";

export default function RoadmapPage() {
  const { grouped, isLoading, isError, error } = useRoadmapItemsByPhase();
  const createItem = useCreateRoadmapItem();
  const updateItem = useUpdateRoadmapItem();
  const deleteItem = useDeleteRoadmapItem();
  const reorderItems = useReorderRoadmapItems();

  const [activePhase, setActivePhase] = useState<RoadmapPhase>("in_progress");
  const [formOpen, setFormOpen] = useState(false);
  const [formPhase, setFormPhase] = useState<RoadmapPhase>("immediate");
  const [editingItem, setEditingItem] = useState<RoadmapItem | undefined>(undefined);

  const scrollToPhase = useCallback((phase: RoadmapPhase) => {
    setActivePhase(phase);
    document.getElementById(`phase-${phase}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleAddToPhase = useCallback((phase: RoadmapPhase) => {
    setEditingItem(undefined);
    setFormPhase(phase);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((item: RoadmapItem) => {
    setEditingItem(item);
    setFormPhase(item.phase as RoadmapPhase);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteItem.mutateAsync(id);
    },
    [deleteItem]
  );

  const handleFormSubmit = useCallback(
    async (data: CreateRoadmapItemInput) => {
      if (editingItem) {
        await updateItem.mutateAsync({ id: editingItem.id, ...data });
      } else {
        await createItem.mutateAsync(data);
      }
    },
    [editingItem, createItem, updateItem]
  );

  const handleReorder = useCallback(
    (updates: Array<{ id: string; sort_order: number }>) => {
      reorderItems.mutate(updates);
    },
    [reorderItems]
  );

  if (isError) {
    return (
      <PageShell variant="content" title="Roadmap">
        <ErrorState
          title="Could not load roadmap"
          description={error?.message ?? "An unexpected error occurred."}
        />
      </PageShell>
    );
  }

  return (
    <PageShell variant="content" title="Roadmap">
      <div className="flex gap-8 min-h-0">
        {/* Left: Phase cards */}
        <aside className="w-64 shrink-0 flex flex-col gap-3 pt-1">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))
            : ROADMAP_PHASES.map((phase) => (
                <RoadmapPhaseCard
                  key={phase}
                  phase={phase}
                  itemCount={grouped[phase].length}
                  isActive={activePhase === phase}
                  onClick={() => scrollToPhase(phase)}
                  onAddClick={() => handleAddToPhase(phase)}
                />
              ))}
        </aside>

        {/* Right: Timeline */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col gap-8">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <RoadmapTimeline
              grouped={grouped}
              onAddToPhase={handleAddToPhase}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReorder={handleReorder}
              isDeleting={deleteItem.isPending}
            />
          )}
        </main>
      </div>

      {/* Create/Edit Form */}
      <RoadmapItemForm
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultPhase={formPhase}
        existingItem={editingItem}
        onSubmit={handleFormSubmit}
        isPending={createItem.isPending || updateItem.isPending}
      />
    </PageShell>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/(admin)/roadmap/page.tsx
git commit -m "feat: add /admin/roadmap page"
```

---

## Task 13: Add to Admin Navigation

**Files:**
- Modify: `frontend/src/lib/navigation-config.ts`

- [ ] **Step 1: Add Roadmap to the adminSettingsTools array**

In `frontend/src/lib/navigation-config.ts`, find the `adminSettingsTools` array (around line 610). Add the Roadmap entry:

```ts
// Add this import near the top with other lucide imports:
import { Map } from "lucide-react";

// Then add this entry to adminSettingsTools:
{
  name: "Roadmap",
  path: "/admin/roadmap",
  requiresProject: false,
  icon: Map,
  description: "Product roadmap and upcoming features",
  adminOnly: true,
},
```

Place it after "Command Center" and before "Feedback Inbox" so it appears near the top of the admin tools list.

- [ ] **Step 2: Verify typecheck passes**

```bash
cd frontend && npm run typecheck
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/navigation-config.ts
git commit -m "feat: add Roadmap to admin navigation"
```

---

## Task 14: Verify in Browser

- [ ] **Step 1: Ensure dev server is running**

```bash
cd frontend && rm -rf .next && npm run dev > /tmp/nextjs-dev.log 2>&1 &
sleep 10 && tail -20 /tmp/nextjs-dev.log
```

Expected: "Ready" in output.

- [ ] **Step 2: Open the roadmap page and take a screenshot**

Use `agent-browser`:
```
agent-browser open http://localhost:3000/admin/roadmap
agent-browser screenshot /tmp/roadmap-page.png
```

Read `/tmp/roadmap-page.png` and verify:
- Two-column layout renders (phase cards left, timeline right)
- All 4 phase cards visible with correct labels and item counts
- 10 seeded items visible in the timeline with colored dots
- No console errors

- [ ] **Step 3: Test create flow**

```
agent-browser click the "+" button on the "Immediate" phase card
agent-browser screenshot /tmp/roadmap-create.png
```

Verify: Sheet opens with Phase pre-set to "Immediate".

- [ ] **Step 4: Test drag reorder**

Drag the first item in a phase below the second item. Verify order persists after page refresh.

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -p
git commit -m "fix: roadmap page browser verification fixes"
```
