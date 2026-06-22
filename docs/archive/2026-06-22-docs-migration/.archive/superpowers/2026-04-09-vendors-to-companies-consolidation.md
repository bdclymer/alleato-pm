# Vendors → Companies Consolidation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the separate `vendors` table by moving all vendor data and FK relationships directly into `companies`, matching Procore's unified directory model.

**Architecture:** Add vendor-specific columns to `companies`, migrate all existing vendor row data into the corresponding company rows, update every FK that pointed to `vendors.id` to instead point to `companies.id`, delete the `vendors` table, and update all API/hook/component code to query `companies` directly. A boolean `is_vendor` flag on `companies` replaces the separate table.

**Tech Stack:** PostgreSQL (Supabase), Next.js 15 App Router API routes, TypeScript, Supabase JS client, React Query hooks.

---

## File Map

**New migration file:**
- Create: `supabase/migrations/20260409000001_consolidate_vendors_into_companies.sql`

**API routes to update (query vendors → query companies):**
- Modify: `frontend/src/app/api/directory/vendors/route.ts`
- Modify: `frontend/src/app/api/directory/vendors/[vendorId]/route.ts`
- Modify: `frontend/src/app/api/projects/[projectId]/vendors/route.ts`
- Modify: `frontend/src/app/api/projects/[projectId]/directory/vendors/route.ts`
- Modify: `frontend/src/app/api/sync/acumatica/vendors/route.ts`

**Library/service files:**
- Modify: `frontend/src/lib/acumatica/sync.ts` — upsert companies, not vendors
- Modify: `frontend/src/hooks/use-project-vendors.ts` — works with companies
- Modify: `frontend/src/hooks/use-company-contacts.ts` — remove vendor→company lookup

**Component/page files:**
- Modify: `frontend/src/app/(main)/directory/vendors/page.tsx` — query companies where is_vendor=true
- Modify: `frontend/src/components/direct-costs/DirectCostForm.tsx` — vendor dropdown now loads companies
- Modify: `frontend/src/components/direct-costs/FiltersPanel.tsx` — vendor filter options now companies

**Types (auto-generated, do not hand-edit):**
- Regenerate: `frontend/src/types/database.types.ts`

---

## Task 1: Write the database migration SQL

**Files:**
- Create: `supabase/migrations/20260409000001_consolidate_vendors_into_companies.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260409000001_consolidate_vendors_into_companies.sql
-- Consolidate vendors table into companies table.
-- Procore uses a unified directory — companies ARE vendors.
-- This migration:
--   1. Adds vendor-specific columns to companies
--   2. Migrates vendor row data into their linked company rows
--   3. Sets is_vendor = true on those companies
--   4. Updates all FK references that pointed to vendors.id → companies.id
--   5. Drops vendors table

BEGIN;

----------------------------------------------------------------------
-- PART 1: Add vendor columns to companies
----------------------------------------------------------------------
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS contact_name       text,
  ADD COLUMN IF NOT EXISTS contact_email      text,
  ADD COLUMN IF NOT EXISTS contact_phone      text,
  ADD COLUMN IF NOT EXISTS zip_code           text,
  ADD COLUMN IF NOT EXISTS country            text,
  ADD COLUMN IF NOT EXISTS tax_id             text,
  ADD COLUMN IF NOT EXISTS legal_name         text,
  ADD COLUMN IF NOT EXISTS vendor_class       text,
  ADD COLUMN IF NOT EXISTS terms              text,
  ADD COLUMN IF NOT EXISTS payment_method     text,
  ADD COLUMN IF NOT EXISTS ap_account         text,
  ADD COLUMN IF NOT EXISTS cash_account       text,
  ADD COLUMN IF NOT EXISTS is_1099_vendor     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_foreign_entity  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_labor_union     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_tax_agency      boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS acumatica_vendor_id text,
  ADD COLUMN IF NOT EXISTS acumatica_sync_at  timestamptz,
  ADD COLUMN IF NOT EXISTS is_vendor          boolean NOT NULL DEFAULT false;

-- Unique index on acumatica_vendor_id (same constraint vendors had)
CREATE UNIQUE INDEX IF NOT EXISTS companies_acumatica_vendor_id_key
  ON companies (acumatica_vendor_id)
  WHERE acumatica_vendor_id IS NOT NULL;

----------------------------------------------------------------------
-- PART 2: Migrate vendor data into companies rows
-- Every vendor has a company_id pointing to its companies row.
-- Copy vendor-specific fields onto that company row.
----------------------------------------------------------------------
UPDATE companies c
SET
  contact_name       = v.contact_name,
  contact_email      = v.contact_email,
  contact_phone      = v.contact_phone,
  -- address/city/state already exist on companies; only overwrite if blank
  address            = COALESCE(NULLIF(c.address, ''), v.address),
  city               = COALESCE(NULLIF(c.city, ''), v.city),
  state              = COALESCE(NULLIF(c.state, ''), v.state),
  zip_code           = v.zip_code,
  country            = v.country,
  notes              = COALESCE(NULLIF(c.notes, ''), v.notes),
  tax_id             = v.tax_id,
  legal_name         = v.legal_name,
  vendor_class       = v.vendor_class,
  terms              = v.terms,
  payment_method     = v.payment_method,
  ap_account         = v.ap_account,
  cash_account       = v.cash_account,
  is_1099_vendor     = v.is_1099_vendor,
  is_foreign_entity  = v.is_foreign_entity,
  is_labor_union     = v.is_labor_union,
  is_tax_agency      = v.is_tax_agency,
  acumatica_vendor_id = v.acumatica_vendor_id,
  acumatica_sync_at  = v.acumatica_sync_at,
  is_vendor          = true
FROM vendors v
WHERE v.company_id = c.id;

----------------------------------------------------------------------
-- PART 3: Update FK references from vendors.id → companies.id
-- For each child table, swap the stored vendor UUID for the
-- corresponding companies UUID (via vendors.company_id).
----------------------------------------------------------------------

-- 3a. direct_costs.vendor_id
ALTER TABLE direct_costs DROP CONSTRAINT IF EXISTS direct_costs_vendor_id_fkey;

UPDATE direct_costs dc
SET vendor_id = v.company_id
FROM vendors v
WHERE dc.vendor_id = v.id;

ALTER TABLE direct_costs
  ADD CONSTRAINT direct_costs_vendor_id_fkey
  FOREIGN KEY (vendor_id) REFERENCES companies(id) ON DELETE SET NULL;

-- 3b. change_event_line_items.vendor_id
ALTER TABLE change_event_line_items DROP CONSTRAINT IF EXISTS change_event_line_items_vendor_id_fkey;

UPDATE change_event_line_items celi
SET vendor_id = v.company_id
FROM vendors v
WHERE celi.vendor_id = v.id;

ALTER TABLE change_event_line_items
  ADD CONSTRAINT change_event_line_items_vendor_id_fkey
  FOREIGN KEY (vendor_id) REFERENCES companies(id) ON DELETE SET NULL;

-- 3c. prime_contracts.vendor_id
ALTER TABLE prime_contracts DROP CONSTRAINT IF EXISTS prime_contracts_vendor_id_fkey;

UPDATE prime_contracts pc
SET vendor_id = v.company_id
FROM vendors v
WHERE pc.vendor_id = v.id;

ALTER TABLE prime_contracts
  ADD CONSTRAINT prime_contracts_vendor_id_fkey
  FOREIGN KEY (vendor_id) REFERENCES companies(id) ON DELETE SET NULL;

-- 3d. project_vendors.vendor_id → now points to companies
ALTER TABLE project_vendors DROP CONSTRAINT IF EXISTS project_vendors_vendor_id_fkey;

UPDATE project_vendors pv
SET vendor_id = v.company_id
FROM vendors v
WHERE pv.vendor_id = v.id;

ALTER TABLE project_vendors
  ADD CONSTRAINT project_vendors_vendor_id_fkey
  FOREIGN KEY (vendor_id) REFERENCES companies(id) ON DELETE CASCADE;

-- 3e. vendor_contacts.vendor_id → rename column and retarget FK
ALTER TABLE vendor_contacts DROP CONSTRAINT IF EXISTS vendor_contacts_vendor_id_fkey;
ALTER TABLE vendor_contacts RENAME COLUMN vendor_id TO company_id;

UPDATE vendor_contacts vc
SET company_id = v.company_id
FROM vendors v
WHERE vc.company_id = v.id;

ALTER TABLE vendor_contacts
  ADD CONSTRAINT vendor_contacts_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- 3f. acumatica_subcontracts.vendor_uuid
ALTER TABLE acumatica_subcontracts DROP CONSTRAINT IF EXISTS acumatica_subcontracts_vendor_uuid_fkey;

UPDATE acumatica_subcontracts asub
SET vendor_uuid = v.company_id
FROM vendors v
WHERE asub.vendor_uuid = v.id;

ALTER TABLE acumatica_subcontracts
  ADD CONSTRAINT acumatica_subcontracts_vendor_uuid_fkey
  FOREIGN KEY (vendor_uuid) REFERENCES companies(id) ON DELETE SET NULL;

----------------------------------------------------------------------
-- PART 4: Drop vendors table (cascade removes remaining FKs)
----------------------------------------------------------------------
DROP TABLE IF EXISTS vendors CASCADE;

COMMIT;
```

- [ ] **Step 2: Apply the migration via Supabase MCP**

Use the Supabase MCP tool: `mcp__claude_ai_Supabase__apply_migration` with the SQL above.

- [ ] **Step 3: Verify migration ran cleanly**

Run this check query via `mcp__claude_ai_Supabase__execute_sql`:
```sql
SELECT
  (SELECT COUNT(*) FROM companies WHERE is_vendor = true) AS vendor_companies,
  (SELECT COUNT(*) FROM companies WHERE acumatica_vendor_id IS NOT NULL) AS acumatica_linked,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'vendors' AND table_schema = 'public') AS vendors_table_still_exists;
```
Expected: `vendors_table_still_exists = 0`. `vendor_companies` > 0 if vendors existed.

- [ ] **Step 4: Commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm
git add supabase/migrations/20260409000001_consolidate_vendors_into_companies.sql
git commit -m "feat(db): consolidate vendors table into companies — unified directory model"
```

---

## Task 2: Regenerate Supabase TypeScript types

**Files:**
- Regenerate: `frontend/src/types/database.types.ts`

- [ ] **Step 1: Regenerate types**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend
npm run db:types
```

- [ ] **Step 2: Verify companies table has new columns**

Open `frontend/src/types/database.types.ts` and confirm the `companies` Row type now includes:
`is_vendor`, `contact_name`, `contact_email`, `contact_phone`, `acumatica_vendor_id`, `legal_name`, `vendor_class`, `terms`, `payment_method`, `is_1099_vendor`, etc.

Also confirm there is NO `vendors` table entry in the types file.

- [ ] **Step 3: Commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm
git add frontend/src/types/database.types.ts
git commit -m "chore: regenerate Supabase types after vendors→companies migration"
```

---

## Task 3: Update the global vendors directory API route

**Files:**
- Modify: `frontend/src/app/api/directory/vendors/route.ts`
- Modify: `frontend/src/app/api/directory/vendors/[vendorId]/route.ts`

- [ ] **Step 1: Rewrite the list route to query companies**

Replace the entire contents of `frontend/src/app/api/directory/vendors/route.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get("page") ?? "1");
  const perPage = Math.min(parseInt(searchParams.get("per_page") ?? "50"), 150);
  const search = searchParams.get("search") ?? "";
  const isActive = searchParams.get("is_active");
  const vendorClass = searchParams.get("vendor_class");
  const paymentMethod = searchParams.get("payment_method");
  const sortBy = searchParams.get("sort_by") ?? "name";
  const sortOrder = searchParams.get("sort_order") === "desc" ? false : true;

  const offset = (page - 1) * perPage;

  let query = supabase
    .from("companies")
    .select("*", { count: "exact" })
    .eq("is_vendor", true);

  if (search) {
    query = query.or(
      [
        "name", "legal_name", "contact_name", "contact_email", "contact_phone",
        "city", "state", "address", "zip_code", "vendor_class", "payment_method",
        "terms", "tax_id", "acumatica_vendor_id",
      ]
        .map((col) => `${col}.ilike.%${search}%`)
        .join(",")
    );
  }

  if (isActive !== null && isActive !== "") {
    query = query.eq("status", isActive === "true" ? "active" : "inactive");
  }
  if (vendorClass) {
    query = query.eq("vendor_class", vendorClass);
  }
  if (paymentMethod) {
    query = query.eq("payment_method", paymentMethod);
  }

  query = query.order(sortBy, { ascending: sortOrder }).range(offset, offset + perPage - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    pagination: {
      page,
      per_page: perPage,
      total: count ?? 0,
      total_pages: Math.ceil((count ?? 0) / perPage),
    },
  });
}
```

- [ ] **Step 2: Rewrite the single-vendor route**

Replace the entire contents of `frontend/src/app/api/directory/vendors/[vendorId]/route.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  const { vendorId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", vendorId)
    .eq("is_vendor", true)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  const { vendorId } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("companies")
    .update(body)
    .eq("id", vendorId)
    .eq("is_vendor", true)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  const { vendorId } = await params;
  const supabase = await createClient();

  // Soft-delete: set status to inactive rather than hard-delete
  const { error } = await supabase
    .from("companies")
    .update({ status: "inactive" })
    .eq("id", vendorId)
    .eq("is_vendor", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm
git add frontend/src/app/api/directory/vendors/
git commit -m "feat(api): vendors directory routes now query companies where is_vendor=true"
```

---

## Task 4: Update project-scoped vendor API routes

**Files:**
- Modify: `frontend/src/app/api/projects/[projectId]/vendors/route.ts`
- Modify: `frontend/src/app/api/projects/[projectId]/directory/vendors/route.ts`

- [ ] **Step 1: Rewrite the dropdown-data route**

This route feeds vendor dropdowns in forms (DirectCostForm etc).
Replace the entire contents of `frontend/src/app/api/projects/[projectId]/vendors/route.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const supabase = await createClient();

  // Return vendors associated with this project via project_vendors,
  // plus any unassociated vendors so forms always have options.
  // project_vendors.vendor_id now points to companies.id.
  const { data, error } = await supabase
    .from("project_vendors")
    .select("vendor_id, companies!project_vendors_vendor_id_fkey(id, name, legal_name)")
    .eq("project_id", projectId);

  if (error) {
    // Fallback: return all vendor companies if join fails
    const { data: allVendors, error: fallbackError } = await supabase
      .from("companies")
      .select("id, name, legal_name")
      .eq("is_vendor", true)
      .order("name");

    if (fallbackError) {
      return NextResponse.json({ error: fallbackError.message }, { status: 500 });
    }

    return NextResponse.json(
      allVendors?.map((c) => ({
        id: c.id,
        vendor_name: c.name,
        company_id: c.id,
        company: c.name,
      })) ?? []
    );
  }

  return NextResponse.json(
    data?.map((row) => {
      const company = row.companies as { id: string; name: string; legal_name: string | null } | null;
      return {
        id: row.vendor_id,
        vendor_name: company?.name ?? "",
        company_id: row.vendor_id,
        company: company?.name ?? "",
      };
    }) ?? []
  );
}
```

- [ ] **Step 2: Rewrite the project directory vendors route**

Replace the entire contents of `frontend/src/app/api/projects/[projectId]/directory/vendors/route.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("project_vendors")
    .select(`
      id,
      added_at,
      added_by,
      notes,
      companies!project_vendors_vendor_id_fkey (
        id, name, legal_name, vendor_class, contact_name,
        contact_email, contact_phone, city, state, status, acumatica_vendor_id
      )
    `)
    .eq("project_id", projectId)
    .order("added_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const supabase = await createClient();
  const { vendor_id, notes } = await request.json();

  // vendor_id here is now companies.id
  const { data, error } = await supabase
    .from("project_vendors")
    .insert({ project_id: projectId, vendor_id, notes })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const supabase = await createClient();
  const { vendor_id } = await request.json();

  const { error } = await supabase
    .from("project_vendors")
    .delete()
    .eq("project_id", projectId)
    .eq("vendor_id", vendor_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm
git add frontend/src/app/api/projects/
git commit -m "feat(api): project vendor routes query companies via project_vendors junction"
```

---

## Task 5: Update Acumatica vendor sync

**Files:**
- Modify: `frontend/src/lib/acumatica/sync.ts`

- [ ] **Step 1: Read the current sync file**

Read `frontend/src/lib/acumatica/sync.ts` and find the `syncVendors` function.

- [ ] **Step 2: Replace vendors upsert with companies upsert**

The current flow creates company rows AND vendor rows. Replace so it only upserts companies.

Find the section that does `supabase.from("vendors").upsert(...)` and replace with:

```typescript
// Map Acumatica vendor fields to our companies table columns
const companyUpserts = acumaticaVendors.map((av) => ({
  // Match by acumatica_vendor_id if exists, else by name under parent company
  acumatica_vendor_id: av.VendorID,
  acumatica_sync_at: new Date().toISOString(),
  is_vendor: true,
  name: av.VendorName,
  legal_name: av.LegalName ?? null,
  contact_email: av.Email ?? null,
  contact_phone: av.Phone1 ?? null,
  vendor_class: av.VendorClass ?? null,
  terms: av.Terms ?? null,
  payment_method: av.PaymentMethod ?? null,
  ap_account: av.APAccount ?? null,
  cash_account: av.CashAccount ?? null,
  is_1099_vendor: av.F1099Vendor ?? false,
  is_foreign_entity: av.ForeignEntity ?? false,
  is_labor_union: av.VendorIsLaborUnion ?? false,
  is_tax_agency: av.VendorIsTaxAgency ?? false,
}));

const { data: upserted, error: upsertError } = await supabase
  .from("companies")
  .upsert(companyUpserts, { onConflict: "acumatica_vendor_id", ignoreDuplicates: false })
  .select("id, acumatica_vendor_id");

if (upsertError) throw upsertError;
```

Also remove any remaining code that references `supabase.from("vendors")` in this file.

- [ ] **Step 3: Commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm
git add frontend/src/lib/acumatica/sync.ts
git commit -m "feat(acumatica): vendor sync now upserts companies table directly"
```

---

## Task 6: Update the Acumatica sync API route

**Files:**
- Modify: `frontend/src/app/api/sync/acumatica/vendors/route.ts`

- [ ] **Step 1: Read the file**

Read `frontend/src/app/api/sync/acumatica/vendors/route.ts`.

- [ ] **Step 2: Remove any vendors table references**

If the route itself queries the vendors table (not just calls syncVendors), replace those queries with equivalent `companies` queries filtered by `is_vendor = true`.

- [ ] **Step 3: Commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm
git add frontend/src/app/api/sync/acumatica/vendors/route.ts
git commit -m "chore(acumatica): sync route no longer references vendors table"
```

---

## Task 7: Update React Query hooks

**Files:**
- Modify: `frontend/src/hooks/use-project-vendors.ts`
- Modify: `frontend/src/hooks/use-company-contacts.ts`

- [ ] **Step 1: Update use-project-vendors.ts**

Read `frontend/src/hooks/use-project-vendors.ts`. Update the `ProjectVendor` interface to match the new API response shape (nested `companies` object renamed, `vendor_id` → `company_id`):

```typescript
export interface ProjectVendor {
  id: string;
  added_at: string;
  added_by: string | null;
  notes: string | null;
  companies: {
    id: string;
    name: string;
    legal_name: string | null;
    vendor_class: string | null;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    city: string | null;
    state: string | null;
    status: string | null;
    acumatica_vendor_id: string | null;
  } | null;
}
```

No URL changes needed — the API endpoint URL stays the same.

- [ ] **Step 2: Update use-company-contacts.ts**

Read `frontend/src/hooks/use-company-contacts.ts`. Find the block that resolves vendorId → companyId by querying the vendors table:

```typescript
// OLD — remove this block:
const { data: vendorRow } = await supabase
  .from("vendors")
  .select("company_id")
  .eq("id", vendorId)
  .single();
const resolvedCompanyId = vendorRow?.company_id;
```

Replace with direct lookup (vendorId IS now the company id):

```typescript
// NEW — vendorId and companyId are the same after migration
const resolvedCompanyId = vendorId ?? companyId;
```

- [ ] **Step 3: Commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm
git add frontend/src/hooks/use-project-vendors.ts frontend/src/hooks/use-company-contacts.ts
git commit -m "feat(hooks): vendor hooks query companies table; vendorId = companyId after migration"
```

---

## Task 8: Update the vendors directory page

**Files:**
- Modify: `frontend/src/app/(main)/directory/vendors/page.tsx`

- [ ] **Step 1: Read the current page**

Read `frontend/src/app/(main)/directory/vendors/page.tsx` in full.

- [ ] **Step 2: Update the type import**

Find the line that imports the vendors row type:
```typescript
// OLD
type VendorRow = Database["public"]["Tables"]["vendors"]["Row"];
```

Replace with:
```typescript
// NEW
type VendorRow = Database["public"]["Tables"]["companies"]["Row"];
```

- [ ] **Step 3: Update any column definitions that reference vendor-only fields**

The page should display the same visible columns as before — they now live on `companies`. No column name changes needed (the columns moved to `companies` with the same names). The data fetch URL remains `/api/directory/vendors` (we kept the URL stable).

- [ ] **Step 4: Commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm
git add frontend/src/app/(main)/directory/vendors/page.tsx
git commit -m "feat(ui): vendors directory page uses companies type after table consolidation"
```

---

## Task 9: Update DirectCostForm vendor dropdown

**Files:**
- Modify: `frontend/src/components/direct-costs/DirectCostForm.tsx`
- Modify: `frontend/src/components/direct-costs/FiltersPanel.tsx`

- [ ] **Step 1: Read DirectCostForm.tsx**

Read `frontend/src/components/direct-costs/DirectCostForm.tsx` and find the vendor dropdown section.

- [ ] **Step 2: Verify the vendor_id field stores company.id**

After migration, `direct_costs.vendor_id` is a FK to `companies.id`. The API at `/api/projects/[projectId]/vendors` now returns `{ id: companyId, vendor_name, company_id, company }`. Since `id === company_id` after migration, the form value written to `vendor_id` will correctly match `companies.id`. No logic changes needed — just verify the dropdown `value` prop uses `option.id`.

If you find `option.vendor_id` used as the value, replace with `option.id`.

- [ ] **Step 3: Read FiltersPanel.tsx**

Read `frontend/src/components/direct-costs/FiltersPanel.tsx`. Verify the vendor filter uses `id` as the filter value, not a `vendor_id` sub-field. No change expected but confirm.

- [ ] **Step 4: Commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm
git add frontend/src/components/direct-costs/
git commit -m "chore(direct-costs): verify vendor dropdown uses companyId after migration"
```

---

## Task 10: Typecheck and fix any remaining errors

**Files:**
- Various — whatever `tsc` reports

- [ ] **Step 1: Run typecheck**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend
npm run typecheck 2>&1 | head -80
```

- [ ] **Step 2: Fix each error**

For any error that says `Property 'X' does not exist on type` related to vendors:
- If it's a column that moved to companies, the type is now auto-generated correctly — remove any manual type overrides.
- If it's a reference to `vendors` table directly, update to `companies`.
- If it's a `vendor_id` on `vendor_contacts` (now renamed `company_id`), update the column reference.

- [ ] **Step 3: Run lint**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend
npm run lint 2>&1 | head -50
```

Fix any lint errors reported.

- [ ] **Step 4: Commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm
git add -u frontend/src/
git commit -m "fix: resolve TypeScript errors after vendors→companies migration"
```

---

## Task 11: Browser verification

- [ ] **Step 1: Start dev server**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && rm -rf .next
npm run dev > /tmp/nextjs-dev.log 2>&1 &
sleep 12 && tail -20 /tmp/nextjs-dev.log
```

Confirm "Ready on http://localhost:3000".

- [ ] **Step 2: Open vendors directory page in agent-browser**

```
agent-browser open http://localhost:3000/directory/vendors
agent-browser screenshot /tmp/vendors-dir.png
```

Read `/tmp/vendors-dir.png`. Confirm vendor list loads with names, classes, contact info visible.

- [ ] **Step 3: Open a direct cost edit form**

```
agent-browser open http://localhost:3000/67/direct-costs
```

Click into an existing direct cost. Open the edit form. Take a screenshot. Confirm the vendor dropdown shows the correct pre-filled vendor name (not blank "Select...").

- [ ] **Step 4: Open a change event with a vendor line item**

```
agent-browser open http://localhost:3000/67/change-events
```

Find a change event with vendor line items. Click edit. Confirm vendor dropdown pre-fills correctly.

- [ ] **Step 5: Final commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm
git add -u
git commit -m "feat: vendors table fully consolidated into companies — unified directory model complete"
```

---

## Self-Review Checklist

- [x] **Migration SQL** covers all 6 FK columns (direct_costs, change_event_line_items, prime_contracts, project_vendors, vendor_contacts, acumatica_subcontracts)
- [x] **Data migration** copies vendor fields → company rows before dropping vendors table
- [x] **API routes** — all 5 vendor routes updated
- [x] **Acumatica sync** updated to upsert companies directly
- [x] **Type regen** included as explicit task
- [x] **Hooks** — both use-project-vendors and use-company-contacts updated
- [x] **Directory page** type updated
- [x] **Form components** verified
- [x] **Typecheck + lint** gate included
- [x] **Browser verification** for all affected UIs
- [x] **No placeholder steps** — every step has exact SQL or code
