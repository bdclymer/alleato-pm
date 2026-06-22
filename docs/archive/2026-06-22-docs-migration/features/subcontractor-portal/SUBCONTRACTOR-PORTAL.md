# Subcontractor Portal

## What Is Already Built

### Invite Flow (Complete)
- PM clicks "Send SSOV Notification" on a commitment's Subcontractor SOV tab
- **New user path** (`SubcontractorSovInvite.tsx` email): Supabase generates a magic link → user sets password → lands on their SOV tab
- **Existing user path** (`SOVInvitation.tsx` email): Direct link to `?tab=subcontractor-sov`
- After subcontractor submits, PM gets `SSOVSubmittedToPM.tsx` email + a `todos` row

### Database (Complete)
- `user_type: "subcontractor"` is set on `project_directory_memberships` when the invite is sent
- `Subcontractor` permission template already seeded (migration `20260407200000_permissions_completion.sql`):
  - `directory` → read, `budget` → none, `contracts` → read, `documents` → read
  - `schedule` → read, `submittals` → read+write, `rfis` → read+write, `change_orders` → read
- `subcontractor_sov_submissions` + `subcontractor_sov_items` tables track SOV workflow state

### Access Control (Complete)
- Project layout guard: subcontractors who try to access a project they're not on → `access-denied`
- `verifyProjectAccess` in every API route checks `project_directory_memberships`
- `getActorRoleContext` in SSOV route gates who can edit vs review vs send notifications
- Sidebar already filters tools by module permission (budget/directory hidden when no access)

---

## What Is NOT Built (Gaps)

### 1. Permission Template Not Auto-Assigned on Invite
**Status:** Missing  
**File:** `frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/subcontractor-sov/route.ts` ~line 299  
**Problem:** The membership upsert sets `user_type: "subcontractor"` but does NOT set `permission_template_id`. This means new subcontractors have no template → no module permissions → can only access their SOV tab (which uses its own auth logic), but any permission-gated nav item falls back to none.  
**Fix:** Look up the `Subcontractor` system template ID and include it in the upsert.

### 2. No Subcontractor-Specific Navigation Items
**Status:** Missing  
**File:** `frontend/src/lib/navigation-config.ts`  
**Problem:** The sidebar shows the full Financial/Operations nav filtered by module permissions. A subcontractor with `contracts: read` sees Prime Contracts, Commitments, Invoicing — but NOT their own SOV link directly. There are no "My SOV" or "My Invoices" shortcuts.  
**Fix:** Add a `subcontractorOnly` flag to `NavigationTool`. Add a `"Subcontractor"` sidebar group with:
  - My Schedule of Values → `commitments` (filtered to their company's commitment)
  - Submit Invoice → `invoices/subcontractor/new`
  - RFIs → `rfis`
  - Submittals → `submittals`
  - Documents → `documents`

### 3. No Subcontractor "My Work" Landing Page
**Status:** Missing  
**Path:** `/[projectId]/my-work/page.tsx`  
**Problem:** When a subcontractor logs in after initial setup, they land on the regular project home page which shows full financial metrics they can't see. There's no focused "here's what you need to do today" view.  
**Fix:** Create a `My Work` page showing:
  - **SOV Status Card** — their current SOV status (draft/submitted/approved/rejected) with CTA to the SOV tab
  - **Pending Invoices** — invoices awaiting submission
  - **Open RFIs** — RFIs assigned to their company
  - **Submittals** — pending submittals

### 4. No Login Redirect for Subcontractors
**Status:** Missing  
**Files:** `frontend/src/app/(main)/[projectId]/layout.tsx` or middleware  
**Problem:** On second+ logins, subcontractors land on `/[projectId]/home` which shows charts and financials they can't access. First login is handled by the invite link redirect.  
**Fix:** In the project layout, detect `user_type === "subcontractor"` and redirect from `/[projectId]` or `/[projectId]/home` to `/[projectId]/my-work`.

### 5. Project Selector Shows All Projects (Minor)
**Status:** Low priority — the layout guard already prevents access  
**Problem:** The sidebar project selector may attempt to show all projects, but clicking a different one would land on access-denied. Not broken, just noisy.  
**Fix (future):** Filter the project selector to only show projects where the user has membership.

---

## Implementation Plan

### Phase 1 — Permission Template Wiring (Foundation)
**File:** `subcontractor-sov/route.ts`
1. Before the membership upsert, query `permission_templates` for `name = 'Subcontractor' AND is_system = true`
2. Include `permission_template_id` in the upsert

### Phase 2 — Navigation Gating
**Files:** `navigation-config.ts`, `app-sidebar.tsx`
1. Add `subcontractorOnly?: boolean` field to `NavigationTool` type
2. Add a `subcontractorNavGroup` with the 5 tools above
3. In `filterTools`, show `subcontractorOnly` items only when `userType === "subcontractor"`, and hide standard Financial group for subs
4. In `sidebarNavGroups`, add the subcontractor group conditionally

### Phase 3 — My Work Landing Page
**Files:** `frontend/src/app/(main)/[projectId]/my-work/page.tsx`
1. Server component: fetch user's SOV submissions for this project, open RFIs, submittals
2. Show status cards with CTAs
3. Use `PageShell variant="dashboard"`

### Phase 4 — Login Redirect
**File:** `frontend/src/app/(main)/[projectId]/home/page.tsx` (or layout)
1. In the home page or layout, check if the visiting user has `user_type === "subcontractor"`
2. Redirect to `/[projectId]/my-work`

---

## Future: RFQs (Not Started)
RFQs (Requests for Quotes) don't exist yet as a module. When built:
- Add `rfqs` to `PermissionModule` in `permissions-shared.ts`
- Add `submit_rfq_response` granular flag
- Subcontractor template gets `rfqs: read+write`
- Add "RFQs" to the subcontractor nav group

---

## File Locations Quick Reference

| What | Where |
|---|---|
| SSOV API (invite send) | `frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/subcontractor-sov/route.ts` |
| Permission template type | `frontend/src/lib/permissions-shared.ts` |
| Nav config | `frontend/src/lib/navigation-config.ts` |
| Sidebar | `frontend/src/components/app-sidebar.tsx` |
| Project layout guard | `frontend/src/app/(main)/[projectId]/layout.tsx` |
| `useProjectPermissions` hook | `frontend/src/hooks/use-project-permissions.ts` |
| SOV invite email (new user) | `frontend/src/emails/subcontractor/SubcontractorSovInvite.tsx` |
| SOV invitation email (existing) | `frontend/src/emails/subcontractor/SOVInvitation.tsx` |
| My Work page (to create) | `frontend/src/app/(main)/[projectId]/my-work/page.tsx` |
