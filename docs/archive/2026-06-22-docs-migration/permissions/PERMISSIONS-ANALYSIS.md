# Permissions System: Thorough Analysis

Related implementation plan: `docs/permissions/directory-rls-attribution-plan.md` covers the RLS hardening path, the attribution-only contact model, and the proposed `No Access` boundary for project directory contacts that should support email/file mapping without app access.

## How Procore's Permission System Works (The Mental Model)

Think of Procore's permissions as a **3-layer sandwich**:

```
Layer 3:  Role-Based Privileges     (rare, tool-specific — e.g. "Accounting Approver")
Layer 2:  Granular Permissions      (fine-grained toggles on top of base level)
Layer 1:  Base Permission Level     (None / Read Only / Standard / Admin per tool)
```

### Layer 1: Base Permission Levels (per tool)

Every user gets ONE of these levels for EACH tool:

| Level | What It Means |
|-------|--------------|
| **None** | Tool is invisible to the user |
| **Read Only** | Can view everything but touch nothing |
| **Standard** | Can create and interact with items — the "worker" level |
| **Admin** | Full control: configure, delete, manage settings |

**Key insight:** This is set **per tool, per user, per project**. So one person can be Admin on Budget but Read Only on Change Orders in the same project, and have completely different levels on a different project.

### Layer 2: Granular Permissions (the fine-tuning knobs)

These are **named capability flags** that can be toggled ON for users at the Read Only or Standard level. They let you give someone specific extra powers without promoting them to Admin.

**Example:** A superintendent has Standard access to Budget, but you also want them to be able to create budget modifications. Instead of making them Admin (which would give them delete access, settings access, etc.), you just toggle on the `create_budget_modifications` granular flag.

**Rules:**
- Granular flags are **NOT available at None or Admin** — None means no access at all, Admin already has everything
- They only apply to **Read Only and Standard** users
- They're defined on the **permission template**, not per-user

### Layer 3: Role-Based Privileges (rare)

These are special tool-specific roles like "Accounting Approver" in ERP Integrations. They're assigned directly on a user's Directory record, not via templates. We don't need to worry about these much.

---

## The Two Scopes: Company vs Project

```
                        ┌─────────────────────────────┐
                        │     COMPANY LEVEL            │
                        │  (applies across ALL projects)│
                        │                              │
                        │  Tools:                      │
                        │  - Directory (company-wide)  │
                        │  - Permissions tool          │
                        │  - Portfolio Financials       │
                        │  - Bid Board                 │
                        │  - Company Settings          │
                        └──────────┬──────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
          ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
          │  PROJECT A   │ │  PROJECT B   │ │  PROJECT C   │
          │              │ │              │ │              │
          │  Tools:      │ │  Tools:      │ │  Tools:      │
          │  - Budget    │ │  - Budget    │ │  - Budget    │
          │  - Commits   │ │  - Commits   │ │  - Commits   │
          │  - COs       │ │  - COs       │ │  - COs       │
          │  - RFIs      │ │  - RFIs      │ │  - RFIs      │
          │  - etc.      │ │  - etc.      │ │  - etc.      │
          └──────────────┘ └──────────────┘ └──────────────┘
```

**Critical rule:** A user with Admin on the **Company-level Directory tool** automatically gets Admin across ALL company AND project tools. This is the "super admin" escalation path.

---

## Permission Templates: The Main Mechanism

A **permission template** is a saved preset that bundles together:
- Base permission levels for each tool
- Granular permission flags

Instead of configuring each user's access to each tool individually, you create templates like "Project Manager" or "Subcontractor" and assign them to users.

### Three Types of Templates

| Type | Scope | Use Case |
|------|-------|----------|
| **Company Permissions Template** | Company-wide tools only | Controls access to Directory, Bid Board, etc. |
| **Global Project Template** | Can be used on ANY project | "Project Manager" template reused across all projects |
| **Project-Specific Template** | ONE specific project only | "Special PM for Warehouse Project" with custom access |

### How Templates Get Assigned

```
                    ┌──────────────────┐
                    │  COMPANY         │
                    │  DIRECTORY       │
                    │                  │
                    │  Assign default  │──── User gets this template on
                    │  project template│     every project they're added to
                    └──────────────────┘

                    ┌──────────────────┐
                    │  PROJECT         │
                    │  DIRECTORY       │
                    │                  │
                    │  Override with   │──── User gets a different template
                    │  project-specific│     on just THIS project
                    │  template        │
                    └──────────────────┘
```

### Procore's Default Templates (for General Contractor companies)

| Template | Internal/External | Purpose |
|----------|-------------------|---------|
| **Project Manager** | Internal | Your own PMs — high access to everything |
| **Foreman/Superintendent** | Internal | Field leads — schedule/docs/submittals, read financials |
| **Architect/Engineer** | External | A/E firms — read financials, write on RFIs/submittals |
| **Subcontractor** | External | Subs — limited to their own contracts/invoices |
| **Owner/Client** | External | Project owners — read everything, write nothing |

---

## Granular Permissions by Financial Tool (What Procore Offers)

### Budget Tool
| Flag | Description |
|------|-------------|
| Import line items from CSV | Bulk import budget data |
| Modify original budget amount | Change the baseline budget |
| View Direct Cost details | See detailed direct costs |
| Delete budget line items | Remove lines from budget |
| Lock Budget | Prevent further changes |
| Send/retrieve from ERP | Sync with accounting system |
| Create/edit/delete Budget Changes | Manage budget modifications |

### Commitments Tool
| Flag | Description |
|------|-------------|
| View Private PO Contract | See contracts marked private |
| View Private WO Contract | See work orders marked private |
| Create PO Contract | Add new purchase orders |
| Create WO Contract | Add new work orders |
| Update PO Contract | Edit existing purchase orders |
| Update WO Contract | Edit existing work orders |

### Change Orders
| Action | Read Only | Standard | Admin |
|--------|:---------:|:--------:|:-----:|
| View change orders | Y | Y | Y |
| Create PDF | Y | Y | Y |
| Review/Respond | Y | Y | Y |
| Create new COs | - | Y | Y |
| Edit own COs | - | Y | Y |
| Delete own COs | - | Y | Y |
| Edit ANY CO | - | - | Y |
| Delete ANY CO | - | - | Y |
| Void COs | - | - | Y |
| Configure settings | - | - | Y |

### Invoicing
Access is **derived from Commitments/Prime Contracts permissions** — there is no standalone Invoicing permission level.

| Level | Capabilities |
|-------|-------------|
| **None** | No access |
| **Read Only** | View invoices; accept/decline invite to bill; submit invoices as invoice contact |
| **Standard** | Create/edit invoices; manage billing periods; bulk edit sub invoice statuses |
| **Admin** | All Standard + delete; all billing modes; bulk DocuSign; create payments |

### Tool Dependencies
- **Invoicing** depends on Commitments/Prime Contracts access
- **Change Orders** with budget impacts require Budget access
- **Creating COs from Change Events** requires Commitments or Prime Contracts access
- **Budget Changes from RFQs** require Budget access

---

## What We Currently Have (Alleato)

### Database Schema

```
permission_templates
├── id (UUID)
├── name (text)
├── description (text)
├── scope ('company' | 'project' | 'global')
├── is_system (boolean) — system templates can't be deleted
├── rules_json (jsonb) — { module: [level, level, ...] }
└── granular_flags (text[]) — named capability flags

user_module_permissions (per-user overrides)
├── project_id → projects
├── person_id → people
├── module (text)
├── level ('none' | 'read' | 'write' | 'admin')
└── updated_by → auth.users

permission_audit_log
├── project_id, person_id, changed_by
├── action ('assign_template' | 'set_override' | 'remove_override')
├── module, old_level, new_level
└── template_id → permission_templates

project_directory_memberships
├── permission_template_id → permission_templates  (the assignment link)
└── ...
```

### Current System Templates (7 total)

| Template | Modules | Notes |
|----------|---------|-------|
| **Project Admin** | Admin on all modules | All 8 granular flags enabled |
| **Project Manager** | Admin on budget, contracts, schedule, submittals, RFIs, COs; Write on directory, documents | 6 granular flags (no manage_project_directory or edit_own_ssov) |
| **Superintendent** | Admin on schedule; Write on docs, submittals, RFIs; Read on everything else | Only `create_change_events` granular flag |
| **Field Engineer** | Write on docs, schedule, submittals, RFIs; Read on everything else | No granular flags |
| **Subcontractor** | Write on submittals, RFIs; Read on most; None on budget | Only `edit_own_ssov` granular flag |
| **Owner / Client** | Read on everything | No granular flags |
| **Read Only** | Read on everything | No granular flags |

### Current Permission Modules (8)

1. `directory` - Directory/contacts
2. `budget` - Budget
3. `contracts` - Commitments/contracts
4. `documents` - Documents
5. `schedule` - Schedule
6. `submittals` - Submittals
7. `rfis` - RFIs
8. `change_orders` - Change Orders

### Current Granular Flags (8)

1. `view_private_commitments`
2. `edit_own_ssov` (Schedule of Values for invoice contacts)
3. `bulk_edit_subcontractor_invoice_status`
4. `approve_change_orders`
5. `approve_invoices`
6. `create_change_events`
7. `create_budget_modifications`
8. `manage_project_directory`

### Permission Resolution Order

```
App Admin? ──yes──► Full access to everything
    │no
    ▼
Per-module override exists? ──yes──► Use override level
    │no
    ▼
Template assigned? ──yes──► Use template's rules_json + granular_flags
    │no
    ▼
No access (none)
```

### Current Admin UI

Located at `/permissions` (admin section), with 3 tabs:
1. **User Permissions** — lists all users with their project memberships and template assignments
2. **Company Templates** — CRUD for company-scoped templates
3. **Project Templates** — CRUD for project-scoped templates

Template creation/editing includes:
- Name and description
- Permission matrix (module x level grid with checkmarks)
- Granular flags (checkboxes)

### API Endpoints

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/permissions/templates` | GET, POST | List/create templates |
| `/api/permissions/templates/[templateId]` | PUT, DELETE | Update/delete template |
| `/api/permissions/users` | GET | List users with their template assignments |
| `/api/projects/[projectId]/permissions` | GET | Get project permission state |
| `/api/projects/[projectId]/permissions/assign` | POST | Assign template to user |
| `/api/projects/[projectId]/permissions/override` | POST | Set per-user module override |
| `/api/projects/[projectId]/permissions/audit` | GET | Get audit trail |
| `/api/projects/[projectId]/directory/permissions` | GET | Get directory-specific permissions |
| `/api/projects/[projectId]/directory/people/[personId]/permissions` | GET | Get person-specific permissions |

---

## Gap Analysis: What's Missing or Could Be Improved

### 1. Missing Modules

We have 8 modules. Procore has granular permissions for **27 project-level tools** and **4 company-level tools**. We're missing:

| Missing Module | Priority | Notes |
|---------------|----------|-------|
| `prime_contracts` | High | Currently lumped into `contracts` |
| `invoicing` | High | Currently has no dedicated module (derives from contracts) |
| `change_events` | High | Currently lumped into `change_orders` |
| `direct_costs` | Medium | No permission control |
| `daily_log` | Medium | When implemented |
| `drawings` | Medium | When implemented |
| `photos` | Low | When implemented |
| `punch_list` | Low | When implemented |
| `meetings` | Low | When implemented |

### 2. Missing Granular Flags

Procore has dozens more per-tool flags. Key missing ones:

| Flag | Tool | Why It Matters |
|------|------|----------------|
| `import_budget_csv` | Budget | Bulk import is dangerous without explicit permission |
| `modify_original_budget` | Budget | Changing baseline budget should be separately gated |
| `lock_budget` | Budget | Budget locking is a critical control |
| `delete_budget_lines` | Budget | Destructive action needs separate permission |
| `create_po` / `create_wo` | Commitments | Creating contracts should be separately gated |
| `send_to_erp` | Multiple | ERP sync is a sensitive operation |
| `void_change_orders` | Change Orders | Voiding is different from deleting |

### 3. UX Improvements Needed

| Issue | Current State | Procore's Approach | Recommendation |
|-------|---------------|-------------------|----------------|
| **No visual permission matrix** | Simple checkmark grid | Interactive matrix with color coding | Build a richer visual matrix |
| **No "effective permissions" view** | Can't see what a user actually has | Shows resolved permissions per user | Add a "What can this person do?" view |
| **No template comparison** | Can't compare two templates | Side-by-side comparison | Add comparison mode |
| **No project-level permission management** | All management in admin area | Permission tab in each project's directory | Add project-level permission UI |
| **No Internal/External designation** | Templates don't distinguish | Templates labeled Internal vs External | Add `audience` field |
| **No template cloning** | Must create from scratch | Can duplicate existing template | Add clone action |
| **No bulk assignment** | Assign one user at a time | Can assign template to multiple users | Add multi-select assignment |
| **Templates not on directory page** | Separate admin page only | Inline in project directory | Show permission template on each person in directory |

### 4. Enforcement Gaps

Currently, the permission system is **data-only** — templates exist in the database, but:
- RLS policies don't check `permission_templates.rules_json` — they check `is_admin` or membership
- API routes don't call `loadUserPermissions()` before allowing writes
- Frontend doesn't conditionally render actions based on permissions
- No middleware or higher-order function enforces tool-level access

**This is the biggest gap.** The templates exist but aren't enforced anywhere.

---

## Recommended Improvements (Prioritized)

### Phase 1: Make What Exists Actually Work
1. **Add permission checking middleware** — HOC or utility that API routes call before allowing writes
2. **Add frontend permission hooks** — `usePermissions()` hook that conditionally renders UI elements
3. **Wire up directory page** — show each person's template assignment, allow changing it inline
4. **Add "effective permissions" view** — for any user, show what they can actually do

### Phase 2: Expand Coverage
5. **Split modules** — separate `prime_contracts` from `contracts`, `change_events` from `change_orders`, add `invoicing`, `direct_costs`
6. **Add more granular flags** — `import_budget_csv`, `modify_original_budget`, `lock_budget`, etc.
7. **Add Internal/External to templates** — helps users pick the right template for the right person type
8. **Add template cloning** — UX convenience

### Phase 3: Polish
9. **Template comparison view** — side-by-side
10. **Bulk assignment** — assign template to multiple people at once
11. **Permission change notifications** — alert users when their access changes
12. **Export/import templates** — for documentation and auditing

---

## Visual: How It All Fits Together

```
┌─────────────────────────────────────────────────────────┐
│                   ADMIN: PERMISSIONS PAGE                │
│                                                          │
│  ┌─ Users Tab ──────────────────────────────────────┐   │
│  │  User A (App Admin) ──── Full access everywhere  │   │
│  │  User B ── Project 1: "Project Manager"          │   │
│  │         ── Project 2: "Superintendent"           │   │
│  │  User C ── Project 1: "Subcontractor"            │   │
│  │         ── (no other projects)                    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─ Company Templates Tab ──────────────────────────┐   │
│  │  (Controls company-level tools like              │   │
│  │   company directory, portfolio, bid board)       │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─ Project Templates Tab ──────────────────────────┐   │
│  │  System:  Project Admin | PM | Super | FE | Sub  │   │
│  │           Owner/Client | Read Only               │   │
│  │  Custom:  [user-created templates]               │   │
│  │                                                   │   │
│  │  Each template shows:                             │   │
│  │  ┌─────────────────────────────────────────┐     │   │
│  │  │ Module        │ Read │ Write │ Admin    │     │   │
│  │  │───────────────│──────│───────│──────────│     │   │
│  │  │ Directory     │  x   │       │          │     │   │
│  │  │ Budget        │  x   │   x   │    x     │     │   │
│  │  │ Contracts     │  x   │   x   │    x     │     │   │
│  │  │ ...           │      │       │          │     │   │
│  │  └─────────────────────────────────────────┘     │   │
│  │                                                   │   │
│  │  Granular flags:                                  │   │
│  │  [x] Approve change orders                        │   │
│  │  [x] Create budget modifications                  │   │
│  │  [ ] View private commitments                     │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─ Project Directory (where assignment happens) ───┐   │
│  │  John Smith ── PM ── Template: "Project Manager"  │   │
│  │  Jane Doe  ── Super ── Template: "Superintendent" │   │
│  │  Acme Corp ── Sub ── Template: "Subcontractor"    │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Summary for Decision-Making

**What's working well:**
- Database schema is solid and Procore-aligned
- System templates cover the main roles
- Granular flags infrastructure exists
- Audit logging is in place
- Admin UI for template CRUD exists

**What needs attention:**
1. **Enforcement is the #1 gap** — permissions exist but aren't checked anywhere
2. **UX needs work** — template assignment should be inline on directory pages, not buried in admin
3. **Module coverage is incomplete** — 8 modules vs Procore's 27+
4. **No "what can this person do?" view** — makes it hard to understand effective access

**Recommendation:** Start with Phase 1 (enforcement + directory integration) before expanding modules. Having 8 enforced modules is better than 27 unenforced ones.
