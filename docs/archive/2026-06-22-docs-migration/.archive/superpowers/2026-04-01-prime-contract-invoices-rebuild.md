# Prime Contract Invoices (Payment Applications) — AIA G702/G703 Rebuild

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Prime Contract Invoices tab to match Procore's AIA G702/G703 payment application system with SOV-based line items, a full invoice detail page, editable SOV, retainage controls, status workflow, and billing period integration.

**Architecture:** New `payment_application_line_items` table stores per-invoice SOV progress (work completed, materials stored, retainage). A new invoice detail page at `/[projectId]/prime-contracts/[contractId]/invoices/[invoiceId]` renders G702 summary + G703 SOV detail tabs. The existing `prime_contract_payment_applications` table gets a `billing_period_id` FK. All data fetching moves from raw `fetch()` to React Query hooks.

**Tech Stack:** Next.js 15 App Router, Supabase (PostgreSQL), React Query, Zod, shadcn/ui, PageShell

**Reference Docs:**
- Procore crawl report: `docs/reports/procore-prime-contract-invoices-crawl.md`
- Existing SOV pattern: `frontend/src/components/commitments/tabs/ScheduleOfValuesTab.tsx`
- Database types: `frontend/src/types/database.types.ts`
- Prime contract detail: `frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/page.tsx`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `supabase/migrations/20260401100000_payment_application_line_items.sql` | DB migration: new line items table + billing_period_id on payment_applications |
| `frontend/src/hooks/use-payment-applications.ts` | React Query hooks for payment applications CRUD + line items |
| `frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/invoices/[invoiceId]/page.tsx` | Invoice detail page (G702 Summary + G703 Detail tabs) |
| `frontend/src/components/domain/invoices/InvoiceG702Summary.tsx` | AIA G702 Application for Payment summary display |
| `frontend/src/components/domain/invoices/InvoiceG703Detail.tsx` | AIA G703 SOV detail table (view + edit mode) |
| `frontend/src/components/domain/invoices/InvoiceGeneralSettings.tsx` | General settings view/edit for an invoice |
| `frontend/src/components/domain/invoices/CreateInvoiceDialog.tsx` | Improved create invoice modal with billing period dropdown |
| `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/line-items/route.ts` | GET + POST for invoice SOV line items |
| `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/populate-sov/route.ts` | POST to auto-populate SOV from contract SOV + approved COs |

### Modified Files

| File | What Changes |
|------|-------------|
| `frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/page.tsx` | Replace inline invoices tab with component, use React Query hooks, link rows to detail page |
| `frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/types.ts` | Add `PaymentApplicationLineItem` type, update `PaymentApplication` with `billing_period_id` |
| `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/route.ts` | Add billing_period_id to POST schema, return billing_period join |
| `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/route.ts` | Add line items aggregation to PATCH response |
| `frontend/src/types/database.types.ts` | Regenerated after migration (run `npm run db:types`) |

---

## Task 1: Database Migration — Line Items Table + Billing Period FK

**Files:**
- Create: `supabase/migrations/20260401100000_payment_application_line_items.sql`

This migration adds the SOV line items table that stores per-invoice billing progress for each contract SOV line, plus adds a `billing_period_id` FK to `prime_contract_payment_applications`.

- [ ] **Step 1: Write the migration SQL**

```sql
-- supabase/migrations/20260401100000_payment_application_line_items.sql

-- Add billing_period_id to payment applications
ALTER TABLE prime_contract_payment_applications
  ADD COLUMN IF NOT EXISTS billing_period_id uuid REFERENCES billing_periods(id),
  ADD COLUMN IF NOT EXISTS billing_date date,
  ADD COLUMN IF NOT EXISTS percent_complete numeric DEFAULT 0;

-- SOV line items per payment application (AIA G703)
CREATE TABLE IF NOT EXISTS payment_application_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_application_id uuid NOT NULL REFERENCES prime_contract_payment_applications(id) ON DELETE CASCADE,
  -- Links to the contract SOV line item
  sov_item_id integer REFERENCES prime_contract_sovs(id) ON DELETE SET NULL,
  -- Or links to a change order
  change_order_id uuid REFERENCES contract_change_orders(id) ON DELETE SET NULL,
  -- Display fields (denormalized for performance)
  item_number text NOT NULL,
  budget_code text,
  description text NOT NULL,
  -- AIA G703 columns
  scheduled_value numeric NOT NULL DEFAULT 0,
  work_completed_previous numeric NOT NULL DEFAULT 0,
  work_completed_this_period numeric NOT NULL DEFAULT 0,
  materials_stored numeric NOT NULL DEFAULT 0,
  total_completed numeric GENERATED ALWAYS AS (work_completed_previous + work_completed_this_period + materials_stored) STORED,
  percent_complete numeric GENERATED ALWAYS AS (
    CASE WHEN scheduled_value > 0
      THEN ROUND((work_completed_previous + work_completed_this_period + materials_stored) / scheduled_value * 100, 2)
      ELSE 0
    END
  ) STORED,
  balance_to_finish numeric GENERATED ALWAYS AS (
    scheduled_value - (work_completed_previous + work_completed_this_period + materials_stored)
  ) STORED,
  -- Retainage
  retainage_previous_work numeric NOT NULL DEFAULT 0,
  retainage_previous_materials numeric NOT NULL DEFAULT 0,
  retainage_this_period_work_pct numeric NOT NULL DEFAULT 0,
  retainage_this_period_work numeric NOT NULL DEFAULT 0,
  retainage_this_period_materials_pct numeric NOT NULL DEFAULT 0,
  retainage_this_period_materials numeric NOT NULL DEFAULT 0,
  retainage_released_work numeric NOT NULL DEFAULT 0,
  retainage_released_materials numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup by payment application
CREATE INDEX IF NOT EXISTS idx_pa_line_items_application_id
  ON payment_application_line_items(payment_application_id);

-- RLS policies
ALTER TABLE payment_application_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payment application line items"
  ON payment_application_line_items FOR SELECT
  USING (true);

CREATE POLICY "Users can insert payment application line items"
  ON payment_application_line_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update payment application line items"
  ON payment_application_line_items FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete payment application line items"
  ON payment_application_line_items FOR DELETE
  USING (true);

-- Updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON payment_application_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

- [ ] **Step 2: Apply the migration**

Run:
```bash
cd frontend && npx supabase db push
```

Expected: Migration applied successfully.

- [ ] **Step 3: Regenerate TypeScript types**

Run:
```bash
cd frontend && npm run db:types
```

Expected: `frontend/src/types/database.types.ts` updated with `payment_application_line_items` table and new columns on `prime_contract_payment_applications`.

- [ ] **Step 4: Verify types generated correctly**

Open `frontend/src/types/database.types.ts` and search for `payment_application_line_items`. Confirm the Row type includes all columns: `id`, `payment_application_id`, `sov_item_id`, `change_order_id`, `item_number`, `budget_code`, `description`, `scheduled_value`, `work_completed_previous`, `work_completed_this_period`, `materials_stored`, `total_completed`, `percent_complete`, `balance_to_finish`, retainage columns, `sort_order`, `created_at`, `updated_at`.

Also confirm `prime_contract_payment_applications` Row now includes `billing_period_id`, `billing_date`, `percent_complete`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260401100000_payment_application_line_items.sql frontend/src/types/database.types.ts
git commit -m "feat(invoices): add payment_application_line_items table and billing_period_id FK"
```

---

## Task 2: React Query Hooks for Payment Applications

**Files:**
- Create: `frontend/src/hooks/use-payment-applications.ts`
- Modify: `frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/types.ts`

This replaces the raw `fetch()` + `useState` pattern in the prime contract page with proper React Query hooks.

- [ ] **Step 1: Add PaymentApplicationLineItem type**

Add to `frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/types.ts` after the existing `PaymentApplication` interface (~line 37):

```typescript
export interface PaymentApplicationLineItem {
  id: string;
  payment_application_id: string;
  sov_item_id: number | null;
  change_order_id: string | null;
  item_number: string;
  budget_code: string | null;
  description: string;
  scheduled_value: number;
  work_completed_previous: number;
  work_completed_this_period: number;
  materials_stored: number;
  total_completed: number;
  percent_complete: number;
  balance_to_finish: number;
  retainage_previous_work: number;
  retainage_previous_materials: number;
  retainage_this_period_work_pct: number;
  retainage_this_period_work: number;
  retainage_this_period_materials_pct: number;
  retainage_this_period_materials: number;
  retainage_released_work: number;
  retainage_released_materials: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
```

Also update `PaymentApplication` interface to add:
```typescript
  billing_period_id: string | null;
  billing_date: string | null;
  // Joined from billing_periods
  billing_period?: {
    id: string;
    start_date: string;
    end_date: string;
    name: string | null;
    period_number: number;
  } | null;
```

- [ ] **Step 2: Create the React Query hooks file**

Create `frontend/src/hooks/use-payment-applications.ts`:

```typescript
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { PaymentApplication, PaymentApplicationLineItem } from "@/app/(main)/[projectId]/prime-contracts/[contractId]/types";

// Cache key factory
const paymentAppKeys = {
  all: (contractId: string) => ["payment-applications", contractId] as const,
  detail: (contractId: string, appId: string) =>
    ["payment-applications", contractId, appId] as const,
  lineItems: (contractId: string, appId: string) =>
    ["payment-applications", contractId, appId, "line-items"] as const,
};

// --- List ---
export function usePaymentApplications(projectId: number, contractId: string) {
  return useQuery({
    queryKey: paymentAppKeys.all(contractId),
    queryFn: async (): Promise<PaymentApplication[]> => {
      const res = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/payment-applications`
      );
      if (!res.ok) throw new Error("Failed to fetch payment applications");
      return res.json();
    },
    staleTime: 30_000,
  });
}

// --- Single ---
export function usePaymentApplication(
  projectId: number,
  contractId: string,
  applicationId: string
) {
  return useQuery({
    queryKey: paymentAppKeys.detail(contractId, applicationId),
    queryFn: async (): Promise<PaymentApplication> => {
      const res = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/payment-applications/${applicationId}`
      );
      if (!res.ok) throw new Error("Failed to fetch payment application");
      return res.json();
    },
    staleTime: 30_000,
  });
}

// --- Create ---
export function useCreatePaymentApplication(
  projectId: number,
  contractId: string
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: Partial<PaymentApplication>
    ): Promise<PaymentApplication> => {
      const res = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/payment-applications`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create payment application");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentAppKeys.all(contractId) });
    },
  });
}

// --- Update ---
export function useUpdatePaymentApplication(
  projectId: number,
  contractId: string,
  applicationId: string
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: Partial<PaymentApplication>
    ): Promise<PaymentApplication> => {
      const res = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/payment-applications/${applicationId}`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }
      );
      if (!res.ok) throw new Error("Failed to update payment application");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentAppKeys.all(contractId) });
      queryClient.invalidateQueries({
        queryKey: paymentAppKeys.detail(contractId, applicationId),
      });
    },
  });
}

// --- Delete ---
export function useDeletePaymentApplication(
  projectId: number,
  contractId: string
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (applicationId: string): Promise<void> => {
      const res = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/payment-applications/${applicationId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete payment application");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentAppKeys.all(contractId) });
    },
  });
}

// --- Line Items ---
export function usePaymentApplicationLineItems(
  projectId: number,
  contractId: string,
  applicationId: string
) {
  return useQuery({
    queryKey: paymentAppKeys.lineItems(contractId, applicationId),
    queryFn: async (): Promise<PaymentApplicationLineItem[]> => {
      const res = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/payment-applications/${applicationId}/line-items`
      );
      if (!res.ok) throw new Error("Failed to fetch line items");
      return res.json();
    },
    staleTime: 30_000,
  });
}

// --- Populate SOV (auto-fill from contract SOV + approved COs) ---
export function usePopulateSOV(
  projectId: number,
  contractId: string,
  applicationId: string
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<PaymentApplicationLineItem[]> => {
      const res = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/payment-applications/${applicationId}/populate-sov`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Failed to populate SOV");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: paymentAppKeys.lineItems(contractId, applicationId),
      });
    },
  });
}

// --- Update Line Items (batch save from SOV editor) ---
export function useUpdateLineItems(
  projectId: number,
  contractId: string,
  applicationId: string
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      items: Partial<PaymentApplicationLineItem>[]
    ): Promise<PaymentApplicationLineItem[]> => {
      const res = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/payment-applications/${applicationId}/line-items`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) }
      );
      if (!res.ok) throw new Error("Failed to update line items");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: paymentAppKeys.lineItems(contractId, applicationId),
      });
      queryClient.invalidateQueries({
        queryKey: paymentAppKeys.detail(contractId, applicationId),
      });
    },
  });
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
cd frontend && npx tsc --noEmit --pretty 2>&1 | head -30
```

Expected: No errors related to these new files.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/hooks/use-payment-applications.ts frontend/src/app/\(main\)/\[projectId\]/prime-contracts/\[contractId\]/types.ts
git commit -m "feat(invoices): add React Query hooks for payment applications and line items"
```

---

## Task 3: API Routes — Line Items CRUD + SOV Population

**Files:**
- Create: `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/line-items/route.ts`
- Create: `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/populate-sov/route.ts`
- Modify: `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/route.ts`

- [ ] **Step 1: Create line-items API route**

Create `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/line-items/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = {
  params: Promise<{
    projectId: string;
    contractId: string;
    applicationId: string;
  }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { projectId, contractId, applicationId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("payment_application_line_items")
    .select("*")
    .eq("payment_application_id", applicationId)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { projectId, contractId, applicationId } = await params;
  const supabase = await createClient();
  const body = await request.json();
  const { items } = body as {
    items: Array<{
      id: string;
      work_completed_this_period?: number;
      materials_stored?: number;
      retainage_this_period_work_pct?: number;
      retainage_this_period_work?: number;
      retainage_this_period_materials_pct?: number;
      retainage_this_period_materials?: number;
      retainage_released_work?: number;
      retainage_released_materials?: number;
    }>;
  };

  if (!items || !Array.isArray(items)) {
    return NextResponse.json({ error: "items array required" }, { status: 400 });
  }

  // Batch update each line item
  const results = [];
  for (const item of items) {
    const { id, ...updates } = item;
    const { data, error } = await supabase
      .from("payment_application_line_items")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("payment_application_id", applicationId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Failed to update item ${id}: ${error.message}` },
        { status: 500 }
      );
    }
    results.push(data);
  }

  // Recalculate payment application totals from line items
  const { data: allItems } = await supabase
    .from("payment_application_line_items")
    .select("*")
    .eq("payment_application_id", applicationId);

  if (allItems && allItems.length > 0) {
    const totalScheduled = allItems.reduce((sum, i) => sum + Number(i.scheduled_value || 0), 0);
    const totalCompleted = allItems.reduce(
      (sum, i) =>
        sum +
        Number(i.work_completed_previous || 0) +
        Number(i.work_completed_this_period || 0) +
        Number(i.materials_stored || 0),
      0
    );
    const totalRetainage = allItems.reduce(
      (sum, i) =>
        sum +
        Number(i.retainage_previous_work || 0) +
        Number(i.retainage_previous_materials || 0) +
        Number(i.retainage_this_period_work || 0) +
        Number(i.retainage_this_period_materials || 0) -
        Number(i.retainage_released_work || 0) -
        Number(i.retainage_released_materials || 0),
      0
    );

    await supabase
      .from("prime_contract_payment_applications")
      .update({
        amount: totalCompleted,
        retention_amount: totalRetainage,
        net_amount: totalCompleted - totalRetainage,
        percent_complete: totalScheduled > 0
          ? Math.round((totalCompleted / totalScheduled) * 10000) / 100
          : 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId);
  }

  return NextResponse.json(results);
}
```

- [ ] **Step 2: Create populate-sov API route**

Create `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/populate-sov/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = {
  params: Promise<{
    projectId: string;
    contractId: string;
    applicationId: string;
  }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { projectId, contractId, applicationId } = await params;
  const supabase = await createClient();

  // 1. Check if line items already exist
  const { data: existing } = await supabase
    .from("payment_application_line_items")
    .select("id")
    .eq("payment_application_id", applicationId)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: "Line items already populated. Delete existing items first." },
      { status: 409 }
    );
  }

  // 2. Get the current payment application to find previous one
  const { data: currentApp } = await supabase
    .from("prime_contract_payment_applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (!currentApp) {
    return NextResponse.json({ error: "Payment application not found" }, { status: 404 });
  }

  // 3. Find the previous payment application (by application_number)
  const currentNum = parseInt(currentApp.application_number, 10);
  let previousLineItems: Record<string, { total_completed: number; retainage_work: number; retainage_materials: number }> = {};

  if (currentNum > 1) {
    const { data: prevApp } = await supabase
      .from("prime_contract_payment_applications")
      .select("id")
      .eq("contract_id", contractId)
      .eq("application_number", String(currentNum - 1))
      .single();

    if (prevApp) {
      const { data: prevItems } = await supabase
        .from("payment_application_line_items")
        .select("*")
        .eq("payment_application_id", prevApp.id);

      if (prevItems) {
        for (const item of prevItems) {
          const key = item.sov_item_id
            ? `sov_${item.sov_item_id}`
            : item.change_order_id
              ? `co_${item.change_order_id}`
              : `desc_${item.description}`;
          previousLineItems[key] = {
            total_completed:
              Number(item.work_completed_previous || 0) +
              Number(item.work_completed_this_period || 0) +
              Number(item.materials_stored || 0),
            retainage_work:
              Number(item.retainage_previous_work || 0) +
              Number(item.retainage_this_period_work || 0) -
              Number(item.retainage_released_work || 0),
            retainage_materials:
              Number(item.retainage_previous_materials || 0) +
              Number(item.retainage_this_period_materials || 0) -
              Number(item.retainage_released_materials || 0),
          };
        }
      }
    }
  }

  // 4. Get contract SOV items
  const { data: sovItems } = await supabase
    .from("prime_contract_sovs")
    .select("*")
    .eq("contract_id", contractId)
    .order("sort_order", { ascending: true });

  // 5. Get approved change orders for this contract
  const { data: changeOrders } = await supabase
    .from("contract_change_orders")
    .select("*")
    .eq("contract_id", contractId)
    .eq("status", "approved")
    .order("change_order_number", { ascending: true });

  // 6. Build line items from SOV
  const lineItems: Array<Record<string, unknown>> = [];
  let sortOrder = 0;

  if (sovItems) {
    for (const sov of sovItems) {
      const key = `sov_${sov.id}`;
      const prev = previousLineItems[key];
      sortOrder++;
      lineItems.push({
        payment_application_id: applicationId,
        sov_item_id: sov.id,
        item_number: String(sortOrder),
        budget_code: sov.cost_code || null,
        description: sov.description || `SOV Item ${sortOrder}`,
        scheduled_value: Number(sov.line_amount || 0),
        work_completed_previous: prev?.total_completed || 0,
        retainage_previous_work: prev?.retainage_work || 0,
        retainage_previous_materials: prev?.retainage_materials || 0,
        sort_order: sortOrder,
      });
    }
  }

  // 7. Add change order line items
  if (changeOrders) {
    const coStartNum = sortOrder + 1;
    for (let i = 0; i < changeOrders.length; i++) {
      const co = changeOrders[i];
      const key = `co_${co.id}`;
      const prev = previousLineItems[key];
      sortOrder++;
      lineItems.push({
        payment_application_id: applicationId,
        change_order_id: co.id,
        item_number: `${coStartNum + i}`,
        budget_code: `PCCO#${co.change_order_number}`,
        description: co.description,
        scheduled_value: Number(co.amount || 0),
        work_completed_previous: prev?.total_completed || 0,
        retainage_previous_work: prev?.retainage_work || 0,
        retainage_previous_materials: prev?.retainage_materials || 0,
        sort_order: sortOrder,
      });
    }
  }

  if (lineItems.length === 0) {
    return NextResponse.json(
      { error: "No SOV items or approved change orders found for this contract" },
      { status: 404 }
    );
  }

  // 8. Insert all line items
  const { data: inserted, error } = await supabase
    .from("payment_application_line_items")
    .insert(lineItems)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(inserted, { status: 201 });
}
```

- [ ] **Step 3: Update payment-applications GET to join billing_period**

In `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/route.ts`, update the GET handler's select query from:

```typescript
.select("*")
```

to:

```typescript
.select("*, billing_period:billing_periods(*)")
```

This joins the billing period data so the list can display period names.

- [ ] **Step 4: Update payment-applications POST schema to accept billing_period_id**

In the same file, update the Zod schema to add:

```typescript
billing_period_id: z.string().uuid().nullable().optional(),
billing_date: z.string().nullable().optional(),
```

And include them in the insert object.

- [ ] **Step 5: Add a GET single endpoint to the [applicationId] route**

Add a GET handler to `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/route.ts`:

```typescript
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { projectId, contractId, applicationId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("prime_contract_payment_applications")
    .select("*, billing_period:billing_periods(*)")
    .eq("id", applicationId)
    .eq("contract_id", contractId)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Payment application not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}
```

- [ ] **Step 6: Run typecheck**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1 | head -30
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/api/projects/\[projectId\]/contracts/\[contractId\]/payment-applications/
git commit -m "feat(invoices): add line items CRUD, populate-sov, and billing period join APIs"
```

---

## Task 4: Invoice Detail Page — G702 Summary + G703 SOV Detail

**Files:**
- Create: `frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/invoices/[invoiceId]/page.tsx`
- Create: `frontend/src/components/domain/invoices/InvoiceG702Summary.tsx`
- Create: `frontend/src/components/domain/invoices/InvoiceG703Detail.tsx`
- Create: `frontend/src/components/domain/invoices/InvoiceGeneralSettings.tsx`

This is the core new page — the invoice detail view with tabs matching Procore: Summary (G702), Detail (G703 SOV), Change History.

- [ ] **Step 1: Create InvoiceGeneralSettings component**

Create `frontend/src/components/domain/invoices/InvoiceGeneralSettings.tsx`:

```tsx
"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ds";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PaymentApplication } from "@/app/(main)/[projectId]/prime-contracts/[contractId]/types";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "under_review", label: "Under Review" },
  { value: "revise_and_resubmit", label: "Revise and Resubmit" },
  { value: "approved", label: "Approved" },
] as const;

interface InvoiceGeneralSettingsProps {
  invoice: PaymentApplication;
  onUpdate: (data: Partial<PaymentApplication>) => Promise<void>;
  billingPeriods?: Array<{
    id: string;
    start_date: string;
    end_date: string;
    name: string | null;
    period_number: number;
  }>;
}

export function InvoiceGeneralSettings({
  invoice,
  onUpdate,
  billingPeriods = [],
}: InvoiceGeneralSettingsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    application_number: invoice.application_number,
    billing_period_id: invoice.billing_period_id || "",
    period_from: invoice.period_from || "",
    period_to: invoice.period_to || "",
    billing_date: invoice.billing_date || "",
    status: invoice.status,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate({
        application_number: form.application_number,
        billing_period_id: form.billing_period_id || null,
        period_from: form.period_from || null,
        period_to: form.period_to || null,
        billing_date: form.billing_date || null,
        status: form.status,
      });
      setIsEditing(false);
      toast.success("Invoice updated");
    } catch {
      toast.error("Failed to update invoice");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBillingPeriodChange = (periodId: string) => {
    setForm((prev) => ({ ...prev, billing_period_id: periodId }));
    const period = billingPeriods.find((p) => p.id === periodId);
    if (period) {
      setForm((prev) => ({
        ...prev,
        billing_period_id: periodId,
        period_from: period.start_date,
        period_to: period.end_date,
      }));
    }
  };

  if (!isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">General Settings</h3>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Billing Period</p>
            <p className="text-sm text-foreground">
              {invoice.period_from && invoice.period_to
                ? `${format(new Date(invoice.period_from), "MM/dd/yy")} - ${format(new Date(invoice.period_to), "MM/dd/yy")}`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Invoice #</p>
            <p className="text-sm text-foreground">{invoice.application_number}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <StatusBadge status={invoice.status} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Billing Date</p>
            <p className="text-sm text-foreground">
              {invoice.billing_date
                ? format(new Date(invoice.billing_date), "MM/dd/yy")
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Percent Complete</p>
            <p className="text-sm text-foreground">
              {invoice.percent_complete != null
                ? `${Number(invoice.percent_complete).toFixed(2)}%`
                : "0.00%"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">General Settings</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Update"}
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="billing_period">Commitment Billing Period</Label>
          <Select value={form.billing_period_id} onValueChange={handleBillingPeriodChange}>
            <SelectTrigger id="billing_period">
              <SelectValue placeholder="Select period..." />
            </SelectTrigger>
            <SelectContent>
              {billingPeriods.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {format(new Date(p.start_date), "MM/dd/yy")} -{" "}
                  {format(new Date(p.end_date), "MM/dd/yy")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="app_number">Invoice #</Label>
          <Input
            id="app_number"
            value={form.application_number}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, application_number: e.target.value }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <Select
            value={form.status}
            onValueChange={(v) => setForm((prev) => ({ ...prev, status: v }))}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="period_from">Period Start</Label>
          <Input
            id="period_from"
            type="date"
            value={form.period_from}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, period_from: e.target.value }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="period_to">Period End</Label>
          <Input
            id="period_to"
            type="date"
            value={form.period_to}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, period_to: e.target.value }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="billing_date">Billing Date</Label>
          <Input
            id="billing_date"
            type="date"
            value={form.billing_date}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, billing_date: e.target.value }))
            }
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create InvoiceG702Summary component**

Create `frontend/src/components/domain/invoices/InvoiceG702Summary.tsx`:

```tsx
"use client";

import { formatCurrency } from "@/config/tables";
import type { PaymentApplication, PaymentApplicationLineItem } from "@/app/(main)/[projectId]/prime-contracts/[contractId]/types";

interface InvoiceG702SummaryProps {
  invoice: PaymentApplication;
  lineItems: PaymentApplicationLineItem[];
  contract: {
    original_contract_value: number;
    revised_contract_value: number;
    title: string;
    contract_number: string;
    start_date: string | null;
  };
  previousPaymentDue: number;
}

export function InvoiceG702Summary({
  invoice,
  lineItems,
  contract,
  previousPaymentDue,
}: InvoiceG702SummaryProps) {
  const originalContractSum = contract.original_contract_value || 0;
  const netChangeByCOs = (contract.revised_contract_value || 0) - originalContractSum;
  const contractSumToDate = originalContractSum + netChangeByCOs;

  const totalCompletedAndStored = lineItems.reduce(
    (sum, item) =>
      sum +
      Number(item.work_completed_previous || 0) +
      Number(item.work_completed_this_period || 0) +
      Number(item.materials_stored || 0),
    0
  );

  const totalRetainageWork = lineItems.reduce(
    (sum, item) =>
      sum +
      Number(item.retainage_previous_work || 0) +
      Number(item.retainage_this_period_work || 0) -
      Number(item.retainage_released_work || 0),
    0
  );

  const totalRetainageMaterials = lineItems.reduce(
    (sum, item) =>
      sum +
      Number(item.retainage_previous_materials || 0) +
      Number(item.retainage_this_period_materials || 0) -
      Number(item.retainage_released_materials || 0),
    0
  );

  const totalRetainage = totalRetainageWork + totalRetainageMaterials;
  const totalEarnedLessRetainage = totalCompletedAndStored - totalRetainage;
  const currentPaymentDue = totalEarnedLessRetainage - previousPaymentDue;
  const balanceToFinish = contractSumToDate - totalCompletedAndStored;

  const lines = [
    { num: "1", label: "Original Contract Sum", value: originalContractSum },
    { num: "2", label: "Net Change by Change Orders", value: netChangeByCOs },
    { num: "3", label: "Contract Sum to Date (Line 1 +/- 2)", value: contractSumToDate },
    {
      num: "4",
      label: "Total Completed and Stored to Date (Column G on G703)",
      value: totalCompletedAndStored,
    },
    { num: "5a", label: "Retainage: % of Completed Work", value: totalRetainageWork, indent: true },
    { num: "5b", label: "Retainage: % of Stored Material", value: totalRetainageMaterials, indent: true },
    { num: "5", label: "Total Retainage (Line 5a + 5b)", value: totalRetainage },
    { num: "6", label: "Total Earned Less Retainage (Line 4 less Line 5)", value: totalEarnedLessRetainage },
    { num: "7", label: "Less Previous Certificates for Payment", value: previousPaymentDue },
    { num: "8", label: "Current Payment Due", value: currentPaymentDue, highlight: true },
    { num: "9", label: "Balance to Finish, Including Retainage", value: balanceToFinish },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-foreground">
        Contractor&apos;s Application for Payment
      </h3>
      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <tbody>
            {lines.map((line) => (
              <tr
                key={line.num}
                className={`border-b border-border last:border-0 ${
                  line.highlight ? "bg-primary/5 font-semibold" : ""
                }`}
              >
                <td className="w-12 px-3 py-2 text-muted-foreground">{line.num}</td>
                <td className={`px-3 py-2 ${line.indent ? "pl-8" : ""}`}>
                  {line.label}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatCurrency(line.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create InvoiceG703Detail component**

Create `frontend/src/components/domain/invoices/InvoiceG703Detail.tsx`:

```tsx
"use client";

import { useCallback, useState } from "react";
import { Pencil, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/config/tables";
import type { PaymentApplicationLineItem } from "@/app/(main)/[projectId]/prime-contracts/[contractId]/types";

interface InvoiceG703DetailProps {
  lineItems: PaymentApplicationLineItem[];
  onSave: (items: Partial<PaymentApplicationLineItem>[]) => Promise<void>;
  isReadOnly?: boolean;
}

export function InvoiceG703Detail({
  lineItems,
  onSave,
  isReadOnly = false,
}: InvoiceG703DetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editItems, setEditItems] = useState<PaymentApplicationLineItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const startEditing = useCallback(() => {
    setEditItems(lineItems.map((item) => ({ ...item })));
    setIsEditing(true);
  }, [lineItems]);

  const updateItem = useCallback(
    (id: string, field: string, value: number) => {
      setEditItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
      );
    },
    []
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const changes = editItems.map((item) => ({
        id: item.id,
        work_completed_this_period: item.work_completed_this_period,
        materials_stored: item.materials_stored,
        retainage_this_period_work_pct: item.retainage_this_period_work_pct,
        retainage_this_period_work: item.retainage_this_period_work,
        retainage_this_period_materials_pct: item.retainage_this_period_materials_pct,
        retainage_this_period_materials: item.retainage_this_period_materials,
        retainage_released_work: item.retainage_released_work,
        retainage_released_materials: item.retainage_released_materials,
      }));
      await onSave(changes);
      setIsEditing(false);
      toast.success("SOV line items saved");
    } catch {
      toast.error("Failed to save line items");
    } finally {
      setIsSaving(false);
    }
  };

  const items = isEditing ? editItems : lineItems;

  // Totals
  const totals = items.reduce(
    (acc, item) => ({
      scheduledValue: acc.scheduledValue + Number(item.scheduled_value || 0),
      previousWork: acc.previousWork + Number(item.work_completed_previous || 0),
      thisPeriod: acc.thisPeriod + Number(item.work_completed_this_period || 0),
      materialsStored: acc.materialsStored + Number(item.materials_stored || 0),
      totalCompleted:
        acc.totalCompleted +
        Number(item.work_completed_previous || 0) +
        Number(item.work_completed_this_period || 0) +
        Number(item.materials_stored || 0),
      balanceToFinish:
        acc.balanceToFinish +
        (Number(item.scheduled_value || 0) -
          Number(item.work_completed_previous || 0) -
          Number(item.work_completed_this_period || 0) -
          Number(item.materials_stored || 0)),
      retainageCurrent:
        acc.retainageCurrent +
        Number(item.retainage_previous_work || 0) +
        Number(item.retainage_previous_materials || 0) +
        Number(item.retainage_this_period_work || 0) +
        Number(item.retainage_this_period_materials || 0) -
        Number(item.retainage_released_work || 0) -
        Number(item.retainage_released_materials || 0),
    }),
    {
      scheduledValue: 0,
      previousWork: 0,
      thisPeriod: 0,
      materialsStored: 0,
      totalCompleted: 0,
      balanceToFinish: 0,
      retainageCurrent: 0,
    }
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Schedule of Values (AIA G703)
        </h3>
        {!isReadOnly && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={startEditing}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-2 py-2 text-left font-medium text-muted-foreground">A<br/>Item #</th>
              <th className="px-2 py-2 text-left font-medium text-muted-foreground">Budget Code</th>
              <th className="px-2 py-2 text-left font-medium text-muted-foreground">B<br/>Description</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground">C<br/>Scheduled Value</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground">D<br/>Previous App</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground">E<br/>This Period</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground">F<br/>Materials Stored</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground">G<br/>Total Complete</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground">%<br/>G/C</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground">H<br/>Balance</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground">Retainage<br/>Current</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const totalComp =
                Number(item.work_completed_previous || 0) +
                Number(item.work_completed_this_period || 0) +
                Number(item.materials_stored || 0);
              const pct =
                Number(item.scheduled_value) > 0
                  ? ((totalComp / Number(item.scheduled_value)) * 100).toFixed(2)
                  : "0.00";
              const balance = Number(item.scheduled_value || 0) - totalComp;
              const currentRetainage =
                Number(item.retainage_previous_work || 0) +
                Number(item.retainage_previous_materials || 0) +
                Number(item.retainage_this_period_work || 0) +
                Number(item.retainage_this_period_materials || 0) -
                Number(item.retainage_released_work || 0) -
                Number(item.retainage_released_materials || 0);

              return (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-2 py-1.5 tabular-nums">{item.item_number}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{item.budget_code || "—"}</td>
                  <td className="max-w-[200px] truncate px-2 py-1.5">{item.description}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatCurrency(Number(item.scheduled_value))}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatCurrency(Number(item.work_completed_previous))}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {isEditing ? (
                      <Input
                        type="number"
                        className="h-7 w-24 text-right text-xs"
                        value={item.work_completed_this_period}
                        onChange={(e) =>
                          updateItem(item.id, "work_completed_this_period", Number(e.target.value))
                        }
                      />
                    ) : (
                      formatCurrency(Number(item.work_completed_this_period))
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {isEditing ? (
                      <Input
                        type="number"
                        className="h-7 w-24 text-right text-xs"
                        value={item.materials_stored}
                        onChange={(e) =>
                          updateItem(item.id, "materials_stored", Number(e.target.value))
                        }
                      />
                    ) : (
                      formatCurrency(Number(item.materials_stored))
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatCurrency(totalComp)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{pct}%</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatCurrency(balance)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatCurrency(currentRetainage)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/50 font-semibold">
              <td className="px-2 py-2" colSpan={3}>Totals</td>
              <td className="px-2 py-2 text-right tabular-nums">
                {formatCurrency(totals.scheduledValue)}
              </td>
              <td className="px-2 py-2 text-right tabular-nums">
                {formatCurrency(totals.previousWork)}
              </td>
              <td className="px-2 py-2 text-right tabular-nums">
                {formatCurrency(totals.thisPeriod)}
              </td>
              <td className="px-2 py-2 text-right tabular-nums">
                {formatCurrency(totals.materialsStored)}
              </td>
              <td className="px-2 py-2 text-right tabular-nums">
                {formatCurrency(totals.totalCompleted)}
              </td>
              <td className="px-2 py-2 text-right tabular-nums">
                {totals.scheduledValue > 0
                  ? ((totals.totalCompleted / totals.scheduledValue) * 100).toFixed(2)
                  : "0.00"}
                %
              </td>
              <td className="px-2 py-2 text-right tabular-nums">
                {formatCurrency(totals.balanceToFinish)}
              </td>
              <td className="px-2 py-2 text-right tabular-nums">
                {formatCurrency(totals.retainageCurrent)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create the Invoice Detail page**

Create `frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/invoices/[invoiceId]/page.tsx`:

```tsx
"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ds";
import {
  usePaymentApplication,
  usePaymentApplicationLineItems,
  useUpdatePaymentApplication,
  useUpdateLineItems,
  usePopulateSOV,
  useDeletePaymentApplication,
} from "@/hooks/use-payment-applications";
import { InvoiceGeneralSettings } from "@/components/domain/invoices/InvoiceGeneralSettings";
import { InvoiceG702Summary } from "@/components/domain/invoices/InvoiceG702Summary";
import { InvoiceG703Detail } from "@/components/domain/invoices/InvoiceG703Detail";
import type { PaymentApplication } from "@/app/(main)/[projectId]/prime-contracts/[contractId]/types";

type Tab = "summary" | "detail" | "change-history";

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; contractId: string; invoiceId: string }>;
}) {
  const { projectId: projectIdStr, contractId, invoiceId } = use(params);
  const projectId = Number(projectIdStr);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [contract, setContract] = useState<Record<string, unknown> | null>(null);
  const [billingPeriods, setBillingPeriods] = useState<
    Array<{ id: string; start_date: string; end_date: string; name: string | null; period_number: number }>
  >([]);
  const [previousPaymentDue, setPreviousPaymentDue] = useState(0);

  const { data: invoice, isLoading } = usePaymentApplication(
    projectId,
    contractId,
    invoiceId
  );
  const { data: lineItems = [], isLoading: lineItemsLoading } =
    usePaymentApplicationLineItems(projectId, contractId, invoiceId);

  const updateApp = useUpdatePaymentApplication(projectId, contractId, invoiceId);
  const updateLineItems = useUpdateLineItems(projectId, contractId, invoiceId);
  const populateSOV = usePopulateSOV(projectId, contractId, invoiceId);
  const deleteApp = useDeletePaymentApplication(projectId, contractId);

  // Fetch contract data for G702 calculations
  useEffect(() => {
    fetch(`/api/projects/${projectId}/contracts/${contractId}`)
      .then((r) => r.json())
      .then(setContract)
      .catch(() => {});
  }, [projectId, contractId]);

  // Fetch billing periods
  useEffect(() => {
    fetch(`/api/projects/${projectId}/billing-periods`)
      .then((r) => r.json())
      .then((data) => setBillingPeriods(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [projectId]);

  // Calculate previous payment due from earlier applications
  useEffect(() => {
    if (!invoice) return;
    fetch(
      `/api/projects/${projectId}/contracts/${contractId}/payment-applications`
    )
      .then((r) => r.json())
      .then((apps: PaymentApplication[]) => {
        const currentNum = parseInt(invoice.application_number, 10);
        const prevApps = apps.filter(
          (a) => parseInt(a.application_number, 10) < currentNum
        );
        const total = prevApps.reduce(
          (sum, a) => sum + Number(a.net_amount ?? a.amount - a.retention_amount),
          0
        );
        setPreviousPaymentDue(total);
      })
      .catch(() => {});
  }, [invoice, projectId, contractId]);

  const handleUpdate = useCallback(
    async (data: Partial<PaymentApplication>) => {
      await updateApp.mutateAsync(data);
    },
    [updateApp]
  );

  const handleSaveLineItems = useCallback(
    async (items: Partial<PaymentApplication>[]) => {
      await updateLineItems.mutateAsync(items as never);
    },
    [updateLineItems]
  );

  const handlePopulateSOV = useCallback(async () => {
    try {
      await populateSOV.mutateAsync();
      toast.success("SOV populated from contract");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to populate SOV"
      );
    }
  }, [populateSOV]);

  const handleDelete = useCallback(async () => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;
    try {
      await deleteApp.mutateAsync(invoiceId);
      toast.success("Invoice deleted");
      router.push(`/${projectId}/prime-contracts/${contractId}`);
    } catch {
      toast.error("Failed to delete invoice");
    }
  }, [deleteApp, invoiceId, router, projectId, contractId]);

  if (isLoading || !invoice) {
    return (
      <PageShell variant="detail" title="Payment Application">
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">Loading invoice...</p>
        </div>
      </PageShell>
    );
  }

  const tabs = [
    { id: "summary" as const, label: "Summary" },
    { id: "detail" as const, label: "Detail" },
    { id: "change-history" as const, label: "Change History" },
  ];

  return (
    <PageShell
      variant="detail"
      title={`Invoice #${invoice.application_number}`}
      subtitle={
        invoice.period_from && invoice.period_to
          ? `${format(new Date(invoice.period_from), "MM/dd/yy")} - ${format(new Date(invoice.period_to), "MM/dd/yy")}`
          : undefined
      }
      onBack={() => router.push(`/${projectId}/prime-contracts/${contractId}`)}
      actions={
        <div className="flex items-center gap-1.5">
          <StatusBadge status={invoice.status} />
          <Button variant="outline" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      }
    >
      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-4 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-8 p-6">
        {/* Summary Tab */}
        {activeTab === "summary" && (
          <>
            <InvoiceGeneralSettings
              invoice={invoice}
              onUpdate={handleUpdate}
              billingPeriods={billingPeriods}
            />
            {contract && (
              <InvoiceG702Summary
                invoice={invoice}
                lineItems={lineItems}
                contract={{
                  original_contract_value: Number(
                    (contract as Record<string, unknown>).original_contract_value || 0
                  ),
                  revised_contract_value: Number(
                    (contract as Record<string, unknown>).revised_contract_value || 0
                  ),
                  title: String((contract as Record<string, unknown>).title || ""),
                  contract_number: String(
                    (contract as Record<string, unknown>).contract_number || ""
                  ),
                  start_date:
                    ((contract as Record<string, unknown>).start_date as string) || null,
                }}
                previousPaymentDue={previousPaymentDue}
              />
            )}
          </>
        )}

        {/* Detail Tab (G703 SOV) */}
        {activeTab === "detail" && (
          <>
            {lineItemsLoading ? (
              <p className="text-sm text-muted-foreground">Loading schedule of values...</p>
            ) : lineItems.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <p className="text-sm text-muted-foreground">
                  No line items yet. Populate from the contract&apos;s Schedule of Values.
                </p>
                <Button onClick={handlePopulateSOV} disabled={populateSOV.isPending}>
                  {populateSOV.isPending ? "Populating..." : "Populate SOV from Contract"}
                </Button>
              </div>
            ) : (
              <InvoiceG703Detail
                lineItems={lineItems}
                onSave={handleSaveLineItems}
                isReadOnly={invoice.status === "approved"}
              />
            )}
          </>
        )}

        {/* Change History Tab */}
        {activeTab === "change-history" && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Change history tracking coming soon.
          </div>
        )}
      </div>
    </PageShell>
  );
}
```

- [ ] **Step 5: Run typecheck and lint**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1 | head -40
```

Fix any type errors that come up.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/domain/invoices/ frontend/src/app/\(main\)/\[projectId\]/prime-contracts/\[contractId\]/invoices/
git commit -m "feat(invoices): add invoice detail page with G702 summary, G703 SOV, and general settings"
```

---

## Task 5: Improved Create Invoice Dialog

**Files:**
- Create: `frontend/src/components/domain/invoices/CreateInvoiceDialog.tsx`

This replaces the inline modal in the prime contract page with a proper component that includes billing period selection and auto-incrementing invoice numbers.

- [ ] **Step 1: Create the dialog component**

Create `frontend/src/components/domain/invoices/CreateInvoiceDialog.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { PaymentApplication } from "@/app/(main)/[projectId]/prime-contracts/[contractId]/types";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "under_review", label: "Under Review" },
  { value: "revise_and_resubmit", label: "Revise and Resubmit" },
  { value: "approved", label: "Approved" },
];

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    application_number: string;
    billing_period_id?: string;
    period_from?: string;
    period_to?: string;
    billing_date?: string;
    status: string;
    notes?: string;
    amount: number;
    retention_amount: number;
  }) => Promise<void>;
  nextInvoiceNumber: number;
  billingPeriods: Array<{
    id: string;
    start_date: string;
    end_date: string;
    name: string | null;
    period_number: number;
  }>;
}

export function CreateInvoiceDialog({
  open,
  onOpenChange,
  onSubmit,
  nextInvoiceNumber,
  billingPeriods,
}: CreateInvoiceDialogProps) {
  const [form, setForm] = useState({
    application_number: String(nextInvoiceNumber),
    billing_period_id: "",
    period_from: "",
    period_to: "",
    billing_date: "",
    status: "draft",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        application_number: String(nextInvoiceNumber),
        billing_period_id: "",
        period_from: "",
        period_to: "",
        billing_date: "",
        status: "draft",
        notes: "",
      });
    }
  }, [open, nextInvoiceNumber]);

  const handleBillingPeriodChange = (periodId: string) => {
    const period = billingPeriods.find((p) => p.id === periodId);
    if (period) {
      setForm((prev) => ({
        ...prev,
        billing_period_id: periodId,
        period_from: period.start_date,
        period_to: period.end_date,
      }));
    }
  };

  const handleSubmit = async () => {
    if (!form.application_number) {
      toast.error("Invoice number is required");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({
        application_number: form.application_number,
        billing_period_id: form.billing_period_id || undefined,
        period_from: form.period_from || undefined,
        period_to: form.period_to || undefined,
        billing_date: form.billing_date || undefined,
        status: form.status,
        notes: form.notes || undefined,
        amount: 0,
        retention_amount: 0,
      });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Invoice (Payment Application)</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-1.5">
            <Label>Commitment Billing Period</Label>
            <Select value={form.billing_period_id} onValueChange={handleBillingPeriodChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select period..." />
              </SelectTrigger>
              <SelectContent>
                {billingPeriods.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {format(new Date(p.start_date), "MM/dd/yy")} -{" "}
                    {format(new Date(p.end_date), "MM/dd/yy")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Invoice #</Label>
            <Input
              value={form.application_number}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, application_number: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Period Start</Label>
            <Input
              type="date"
              value={form.period_from}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, period_from: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Period End</Label>
            <Input
              type="date"
              value={form.period_to}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, period_to: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Billing Date</Label>
            <Input
              type="date"
              value={form.billing_date}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, billing_date: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm((prev) => ({ ...prev, status: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/domain/invoices/CreateInvoiceDialog.tsx
git commit -m "feat(invoices): add CreateInvoiceDialog with billing period selection"
```

---

## Task 6: Update Prime Contract Invoices Tab — React Query + Clickable Rows + New Columns

**Files:**
- Modify: `frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/page.tsx` (lines ~2777-3008 — the invoices tab, lines 137-178 — state vars, lines 436-543 — handlers)

This task replaces the inline invoices tab with React Query hooks, clickable rows linking to the detail page, and additional Procore columns.

- [ ] **Step 1: Add imports to the page**

At the top of `page.tsx`, add these imports (alongside existing ones):

```typescript
import {
  usePaymentApplications,
  useCreatePaymentApplication,
  useDeletePaymentApplication,
} from "@/hooks/use-payment-applications";
import { CreateInvoiceDialog } from "@/components/domain/invoices/CreateInvoiceDialog";
```

- [ ] **Step 2: Replace inline state with React Query**

In the component body, find these state declarations (~lines 154-178) and remove:

```typescript
const [paymentApplications, setPaymentApplications] = useState<PaymentApplication[]>([]);
const [paymentsLoading, setPaymentsLoading] = useState(false);
const [showAddInvoiceDialog, setShowAddInvoiceDialog] = useState(false);
const [invoiceForm, setInvoiceForm] = useState<InvoiceFormState>({...});
const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);
```

Replace with:

```typescript
const [showAddInvoiceDialog, setShowAddInvoiceDialog] = useState(false);
const {
  data: paymentApplications = [],
  isLoading: paymentsLoading,
} = usePaymentApplications(projectId, contractId);
const createPaymentApp = useCreatePaymentApplication(projectId, contractId);
const deletePaymentApp = useDeletePaymentApplication(projectId, contractId);
```

- [ ] **Step 3: Remove old fetch useEffect and handlers**

Remove the `useEffect` that fetches payment applications (~lines 436-454) and the `handleCreateInvoice` and `handleDeleteInvoice` functions (~lines 477-543). They are replaced by the React Query hooks.

- [ ] **Step 4: Fetch billing periods**

Add state and effect for billing periods:

```typescript
const [billingPeriods, setBillingPeriods] = useState<
  Array<{ id: string; start_date: string; end_date: string; name: string | null; period_number: number }>
>([]);

useEffect(() => {
  if (activeTab === "invoices") {
    fetch(`/api/projects/${projectId}/billing-periods`)
      .then((r) => r.json())
      .then((data) => setBillingPeriods(Array.isArray(data) ? data : []))
      .catch(() => {});
  }
}, [activeTab, projectId]);
```

- [ ] **Step 5: Replace the invoices tab JSX**

Replace the entire invoices tab section (~lines 2777-3008) with:

```tsx
{activeTab === "invoices" && (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-base font-semibold text-foreground">
          Invoices (Payment Applications)
        </h2>
        <p className="text-sm text-muted-foreground">
          {paymentApplications.length} invoice{paymentApplications.length !== 1 ? "s" : ""}
        </p>
      </div>
      <Button size="sm" onClick={() => setShowAddInvoiceDialog(true)}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Create Invoice
      </Button>
    </div>

    {paymentsLoading ? (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    ) : paymentApplications.length === 0 ? (
      <div className="flex flex-col items-center gap-2 py-12">
        <FileText className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No invoices yet</p>
      </div>
    ) : (
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Invoice #</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Billing Period</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Amount</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Retainage</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Payment Due</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">% Complete</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {paymentApplications.map((app) => {
              const netAmount = Number(app.net_amount ?? (Number(app.amount) - Number(app.retention_amount)));
              return (
                <tr
                  key={app.id}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/30"
                  onClick={() =>
                    router.push(
                      `/${projectId}/prime-contracts/${contractId}/invoices/${app.id}`
                    )
                  }
                >
                  <td className="px-3 py-2 font-medium text-primary">
                    #{app.application_number}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {app.period_from && app.period_to
                      ? `${format(new Date(app.period_from), "MM/dd/yy")} - ${format(new Date(app.period_to), "MM/dd/yy")}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatCurrency(Number(app.amount))}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatCurrency(Number(app.retention_amount))}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatCurrency(netAmount)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {app.percent_complete != null
                      ? `${Number(app.percent_complete).toFixed(2)}%`
                      : "—"}
                  </td>
                  <td className="px-1 py-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete this invoice?")) {
                          deletePaymentApp.mutate(app.id, {
                            onSuccess: () => toast.success("Invoice deleted"),
                            onError: () => toast.error("Failed to delete"),
                          });
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}

    <CreateInvoiceDialog
      open={showAddInvoiceDialog}
      onOpenChange={setShowAddInvoiceDialog}
      onSubmit={async (data) => {
        await createPaymentApp.mutateAsync(data);
        toast.success("Invoice created");
      }}
      nextInvoiceNumber={paymentApplications.length + 1}
      billingPeriods={billingPeriods}
    />
  </div>
)}
```

- [ ] **Step 6: Run typecheck and verify**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1 | head -30
```

Fix any errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/\(main\)/\[projectId\]/prime-contracts/\[contractId\]/page.tsx
git commit -m "feat(invoices): replace inline invoices tab with React Query hooks and clickable rows"
```

---

## Task 7: Update Status Values — Align with Procore

**Files:**
- Modify: `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/route.ts`
- Modify: `frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/types.ts`

Procore uses: `draft`, `under_review`, `revise_and_resubmit`, `approved`. Our current system uses: `draft`, `submitted`, `approved`, `rejected`. Align to Procore.

- [ ] **Step 1: Update the Zod schema in the POST route**

In `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/route.ts`, change the status enum from:

```typescript
status: z.enum(["draft", "submitted", "approved", "rejected"]).default("draft"),
```

to:

```typescript
status: z.enum(["draft", "under_review", "revise_and_resubmit", "approved"]).default("draft"),
```

- [ ] **Step 2: Update the PaymentApplication type**

In `frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/types.ts`, change:

```typescript
status: "draft" | "submitted" | "approved" | "rejected";
```

to:

```typescript
status: "draft" | "under_review" | "revise_and_resubmit" | "approved";
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/api/projects/\[projectId\]/contracts/\[contractId\]/payment-applications/route.ts frontend/src/app/\(main\)/\[projectId\]/prime-contracts/\[contractId\]/types.ts
git commit -m "fix(invoices): align payment application statuses with Procore (under_review, revise_and_resubmit)"
```

---

## Task 8: Quality Check — Typecheck + Lint + Dev Server

**Files:** None (verification only)

- [ ] **Step 1: Run typecheck**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1 | tail -20
```

Expected: No errors. If there are errors, fix them.

- [ ] **Step 2: Run lint**

```bash
cd frontend && npm run lint 2>&1 | tail -20
```

Expected: No new errors. Fix any that appear.

- [ ] **Step 3: Clear cache and start dev server**

```bash
cd frontend && rm -rf .next && npm run dev > /tmp/nextjs-dev.log 2>&1 &
sleep 12 && tail -30 /tmp/nextjs-dev.log
```

Expected: "Ready" message, no compilation errors.

- [ ] **Step 4: Verify route check passes**

```bash
cd frontend && npm run check:routes
```

Expected: No dynamic route conflicts. The new `/invoices/[invoiceId]` route should not conflict because it's nested under `/prime-contracts/[contractId]/`.

- [ ] **Step 5: Commit any fixes**

If you had to fix anything, commit those fixes:

```bash
git add -A
git commit -m "fix(invoices): address typecheck and lint issues from invoice rebuild"
```

---

## Task 9: Browser Verification

**Files:** None (verification only)

- [ ] **Step 1: Navigate to prime contract page**

```bash
agent-browser open http://localhost:3000/760/prime-contracts/69c520da-1540-4399-a003-6273c58f019e
```

- [ ] **Step 2: Take screenshot of invoices tab**

Click the "Invoices" tab, then screenshot:

```bash
agent-browser screenshot /tmp/invoices-tab-new.png
```

Verify: Table shows with columns (Invoice #, Billing Period, Status, Amount, Retainage, Payment Due, % Complete). Create Invoice button visible. Rows should be clickable.

- [ ] **Step 3: Test create invoice dialog**

Click "Create Invoice" button and screenshot the dialog:

```bash
agent-browser screenshot /tmp/create-invoice-dialog.png
```

Verify: Dialog shows Commitment Billing Period dropdown, Invoice #, Period Start/End, Billing Date, Status, Notes fields.

- [ ] **Step 4: Create a test invoice**

Fill out the form and submit. Verify the new invoice appears in the list.

- [ ] **Step 5: Click into invoice detail page**

Click the new invoice row. Screenshot:

```bash
agent-browser screenshot /tmp/invoice-detail-summary.png
```

Verify: PageShell with "Invoice #N" title, Summary tab with General Settings section.

- [ ] **Step 6: Test SOV population**

Click the "Detail" tab. Click "Populate SOV from Contract". Screenshot:

```bash
agent-browser screenshot /tmp/invoice-g703-sov.png
```

Verify: G703 SOV table renders with line items from the contract's SOV, showing columns A through H plus retainage.

- [ ] **Step 7: Test SOV editing**

Click "Edit" on the Detail tab. Enter values in "This Period" and "Materials Stored" columns. Click Save. Verify values persist.

- [ ] **Step 8: Verify G702 summary updates**

Go back to Summary tab. Screenshot:

```bash
agent-browser screenshot /tmp/invoice-g702-summary.png
```

Verify: The 9-line Contractor's Application for Payment table shows calculated values from the SOV line items.

---

## Summary

| Task | Description | New Files | Modified Files |
|------|------------|-----------|---------------|
| 1 | DB migration — line items table + billing_period_id | 1 SQL migration | database.types.ts (regen) |
| 2 | React Query hooks | use-payment-applications.ts | types.ts |
| 3 | API routes — line items CRUD + populate SOV | 2 route files | 2 existing route files |
| 4 | Invoice detail page + G702/G703 components | 4 component files | — |
| 5 | Create invoice dialog | 1 component file | — |
| 6 | Update prime contract invoices tab | — | page.tsx |
| 7 | Align status values with Procore | — | route.ts, types.ts |
| 8 | Quality check (typecheck + lint + dev) | — | — |
| 9 | Browser verification | — | — |
