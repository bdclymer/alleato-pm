# Procore Research: Submittals Gap Analysis

**Date:** 2026-04-09
**Question:** What gaps exist in our submittals implementation compared to Procore?
**Sources used:** Tier 1 (RAG) | Tier 2 (Manifest) | Tier 3 (WebFetch)

---

## Findings

### 1. Missing Views (High Priority)

Procore has 5 switchable views; we only have 1 (Items/list):

| View | Procore | Us | Notes |
|---|---|---|---|
| Items (list) | ✅ | ✅ | — |
| **Packages** | ✅ | ❌ | Groups submittals by submittal package |
| **Spec Sections** | ✅ | ❌ | Groups submittals by spec section, collapsible |
| **Ball In Court** | ✅ | ❌ | Groups submittals by who needs to act next |
| **Recycle Bin** | ✅ | ❌ | Restore soft-deleted submittals (`deleted_at` exists but no UI) |

---

### 2. Workflow Builder (High Priority — Functionally Broken)

We store workflow steps in the DB (`submittal_workflow_steps`) but there is **no UI to build or interact with the workflow**:

- **No add submitter/approver UI** — you can see existing steps in the detail view but can't add people
- **No sequential vs. parallel step concept in UI** — Procore lets you drag-and-drop step order and mark multiple people per step for parallel approval
- **Ball In Court is a manual text field** — Procore auto-shifts it to the next step when all required responses are collected; ours requires manual input
- **No "Respond as Approver" action** — approvers have no button to submit a response from our UI (`submittal_responses` table exists but no UI)
- **Required vs. optional response** — no way to mark a step's response as required vs. optional
- **No workflow templates** — Procore has admin-managed templates that can be bulk-applied

---

### 3. Missing Form Fields (Medium Priority)

| Field | Procore | Our Form | Issue |
|---|---|---|---|
| Submittal Manager | ✅ dropdown (project directory) | ❌ missing | Not in schema or form |
| Cost Code | ✅ dropdown | ❌ missing | Not in schema or form |
| Location | ✅ dropdown | ❌ missing | Not in schema or form |
| Responsible Contractor | ✅ dropdown (companies) | ⚠️ plain text | Should be FK to companies |
| Received From | ✅ dropdown (companies) | ⚠️ plain text | Should be FK to companies |
| Submittal Type | ✅ dropdown (configurable) | ⚠️ plain text input | Should be a select |
| Spec Section | ✅ linked to Specifications tool | ⚠️ plain text | Should reference spec sections |
| Distribution List | ✅ multi-select (project directory) | ⚠️ ball_in_court is text only | No multi-person distribution list UI |
| Submit By date | ✅ | ❌ missing | — |
| Issue Date | ✅ | ❌ missing | — |
| Received Date | ✅ | ❌ missing | — |
| Confirmed Delivery Date | ✅ | ❌ missing | Delivery Information section |
| Actual Delivery Date | ✅ | ❌ missing | Delivery Information section |
| Attachments upload | ✅ drag-and-drop | ❌ view only | Detail shows attachments but form has no uploader |
| Description | ✅ rich text editor | ⚠️ plain `<Textarea>` | Should be rich text |

---

### 4. Missing Actions (Medium Priority)

| Action | Procore | Us |
|---|---|---|
| Create & Send Emails vs. Create Only | ✅ two save options | ❌ no email concept |
| Duplicate submittal | ✅ | ❌ |
| Create submittal revision | ✅ dedicated flow | ❌ user manually edits revision number |
| Download all attachments | ✅ | ❌ |
| Bulk apply workflow template | ✅ | ❌ |
| CSV import | ✅ | ❌ |

---

### 5. Detail Page Issues (Lower Priority)

- **Uses deprecated layout** — `ProjectPageHeader + PageContainer` instead of `PageShell variant="detail"` (CLAUDE.md Gate 6)
  - File: `frontend/src/features/submittals/submittal-detail-client.tsx:16`
- **Workflow responder shows UUID** not person name (`resp.responder_id` rendered raw at line 316)
- **Linked drawings shows UUID** not drawing number/name (line 345)
- **No "Send for Review" action** on the detail page — no way to progress the workflow

---

## Gap Summary

| Area | Procore | Us | Priority |
|---|---|---|---|
| Views (5 total) | Items, Packages, Spec Sections, Ball In Court, Recycle Bin | Items only | High |
| Workflow builder UI | Full drag-and-drop, sequential/parallel, respond as approver | Read-only display, no builder | High |
| Ball In Court | Auto-managed by workflow engine | Manual text field | High |
| Form fields | ~20 fields including dropdowns linked to directory/companies | ~12 fields, several as plain text | Medium |
| Submittal revisions | Dedicated revision flow | Manual revision number edit | Medium |
| Duplicate | ✅ | ❌ | Medium |
| Page layout | — | Uses deprecated `ProjectPageHeader` pattern | Low |
| UUID display | Person names throughout | Raw UUIDs in workflow responder + linked drawings | Low |

---

## Recommended Priority Order

1. **Workflow builder UI** — biggest functional gap; submittals without an actionable workflow are not usable for real projects
2. **Packages view + Recycle Bin** — high-visibility navigation gaps
3. **Fix Responsible Contractor / Received From / Submittal Type to proper dropdowns** (FK-safe per Gate 11)
4. **Add Submittal Manager, Cost Code, Distribution List fields**
5. **Spec Sections view + Ball In Court view**
6. **Duplicate + Create Revision actions**
7. **Detail page: migrate to PageShell, fix UUID display**

---

## Sources

- https://v2.support.procore.com/product-manuals/submittals-project
- https://v2.support.procore.com/product-manuals/submittals-project/tutorials/create-a-submittal
- https://v2.support.procore.com/product-manuals/submittals-project/tutorials/switch-between-submittals-views
- https://v2.support.procore.com/product-manuals/submittals-project/tutorials/add-submitter-and-approvers-to-the-submittal-workflow
- https://v2.support.procore.com/product-manuals/submittals-project/tutorials/remove-a-submitter-or-approver-from-the-submittal-workflow
- https://v2.support.procore.com/product-manuals/submittals-project/tutorials/change-the-ball-in-court-on-a-submittal
- https://v2.support.procore.com/glossary-of-terms (Submittal Package definition)
- `.claude/procore-manifests/submittals/manifest.json` (Tier 2 — live DOM capture)
