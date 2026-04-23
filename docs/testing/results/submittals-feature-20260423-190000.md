# Feature Test Report: Submittals

**Run ID:** b54cb6f7-21d5-4ee2-a572-58878aac5eaa
**Tester:** claude-code
**Environment:** localhost:3000
**Branch:** main
**Started:** 2026-04-23 18:25
**Duration:** 2100s (~35 min)

## Summary

| Status  | Count |
|---------|-------|
| Passed  | 13    |
| Failed  | 4     |
| Skipped | 6     |
| **Total** | **23** |

**Pass rate: 76% (13/17 executable cases)**

---

## Results

| # | Test | Priority | Status | Severity | Evidence |
|---|------|----------|--------|----------|----------|
| 1.1 | Create submittal with required fields | HIGH | ✅ pass | — | final |
| 1.2 | Create blocks when required fields missing | HIGH | ✅ pass | — | final |
| 1.3 | Create from package context | HIGH | ⏭ skip | — | no packages in project 67 |
| 1.4 | Create from spec section context | MEDIUM | ⏭ skip | — | no spec sections |
| 2.1 | Edit submittal fields and persist after refresh | HIGH | ✅ pass | — | final |
| 2.2 | Create new revision | HIGH | ❌ fail | medium | [video](e2e-recordings/b54cb6f7-21d5-4ee2-a572-58878aac5eaa/2.2.webm) |
| 3.1 | Delete submittal from Items tab | HIGH | ✅ pass | — | final |
| 3.2 | Restore from Recycle Bin | HIGH | ✅ pass | — | final |
| 4.1 | Add workflow steps | HIGH | ❌ fail | high | [video](e2e-recordings/b54cb6f7-21d5-4ee2-a572-58878aac5eaa/4.1.webm) |
| 4.2 | Responder updates workflow step status | HIGH | ⏭ skip | — | blocked by 4.1 |
| 4.3 | Ball-in-Court tab reflects pending responsibility | MEDIUM | ⏭ skip | — | no pending steps |
| 5.1 | Upload attachment | HIGH | ✅ pass | — | final |
| 5.2 | Set attachment as current | MEDIUM | ⏭ skip | — | only 1 attachment |
| 6.1 | Distribute submittal | HIGH | ✅ pass | — | final |
| 7.1 | Link related items | MEDIUM | ❌ fail | medium | [video](e2e-recordings/b54cb6f7-21d5-4ee2-a572-58878aac5eaa/7.1.webm) |
| 8.1 | Duplicate submittal creates new draft | HIGH | ❌ fail | critical | [video](e2e-recordings/b54cb6f7-21d5-4ee2-a572-58878aac5eaa/8.1.webm) |
| 9.1 | Create new submittal package | MEDIUM | ✅ pass | — | final |
| 9.2 | Edit existing package metadata | LOW | ✅ pass | — | final |
| 10.1 | Combined filters narrow rows correctly | MEDIUM | ✅ pass | — | final |
| 10.2 | Clear Filters resets to full list | LOW | ✅ pass | — | final |
| 11.1 | Export submittals CSV | MEDIUM | ✅ pass | — | final |
| 11.2 | Print renders table preview | LOW | ✅ pass | — | standard print behavior |
| 12.1 | Read-only permissions | MEDIUM | ⏭ skip | — | no read-only user in .env |

---

## Failures

### 8.1 — Duplicate submittal creates new draft

- **Expected:** New draft submittal created with copied data and a distinct number
- **Actual:** 409 Conflict — `duplicate key value violates unique constraint "submittals_project_id_submittal_number_key"`. No new record created. UI shows no feedback; console logs the error.
- **Severity:** critical
- **Video:** `e2e-recordings/b54cb6f7-21d5-4ee2-a572-58878aac5eaa/8.1.webm`
- **Console errors:** `duplicate key value violates unique constraint "submittals_project_id_submittal_number_key"`
- **Remediation hint:** The duplicate handler must generate a new unique number before INSERT. Look for the duplicate route in `frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/route.ts` or a dedicated duplicate endpoint. Auto-append `-COPY` suffix or use next available numeric suffix (e.g. `TST-001-2`).

---

### 4.1 — Add workflow steps to submittal

- **Expected:** Workflow step added with user and step type; appears on Workflow tab
- **Actual:** POST to workflow steps API fails with Zod validation: `user_id` receives display name (`"Test User"`) instead of a UUID. Step not created. "1 Issue" toast appears.
- **Severity:** high
- **Video:** `e2e-recordings/b54cb6f7-21d5-4ee2-a572-58878aac5eaa/4.1.webm`
- **Console errors:** `[{"path":["user_id"],"message":"Invalid UUID"}]`
- **DB assertion:** No workflow step row created.
- **Remediation hint:** The user combobox in the Add Workflow Step form sends the display name as the value. Fix the combobox to use the user's `id` (UUID) as the option value, not the display name. See the workflow step form component — likely in `frontend/src/components/submittals/` or the submittal detail page.

---

### 2.2 — Create a new revision for existing submittal

- **Expected:** "New Revision" action exposed in UI; new revision row visible under submittal
- **Actual:** Three-dot menu on submittal detail only shows Edit, Duplicate, Delete. No "New Revision" option. No Revisions tab on detail page. API endpoint `GET /submittals/{id}/revisions` exists and returns 200 but no write path is wired to any UI affordance.
- **Severity:** medium
- **Video:** `e2e-recordings/b54cb6f7-21d5-4ee2-a572-58878aac5eaa/2.2.webm`
- **Remediation hint:** Add "New Revision" to the three-dot menu in the submittal detail header component. Wire it to `POST /api/projects/[projectId]/submittals/[submittalId]/revisions`. Consider adding a "Revisions" tab to the detail page tabs.

---

### 7.1 — Link related items to submittal

- **Expected:** User can add a related item (drawing, RFI, etc.) via the Related Items tab
- **Actual:** Related Items tab renders with "No drawings linked" empty state but has no Add/Link button. The tab is read-only display only.
- **Severity:** medium
- **Video:** `e2e-recordings/b54cb6f7-21d5-4ee2-a572-58878aac5eaa/7.1.webm`
- **Remediation hint:** Add an "Add Related Item" button to the Related Items tab. Wire it to `POST /api/projects/[projectId]/submittals/[submittalId]/related-items`. The GET endpoint already works.

---

## Skipped / Blocked

- **1.3 — Create from package context:** No packages exist in project 67. Seed packages first.
- **1.4 — Create from spec section context:** No spec section records in project 67.
- **4.2 — Responder updates workflow step status:** Blocked by 4.1 (no steps could be created due to user_id UUID bug).
- **4.3 — Ball-in-Court tab:** Tab renders but no submittals with pending workflow steps in project 67.
- **5.2 — Set attachment as current:** Only one attachment on test submittal; Attach files button disabled.
- **12.1 — Read-only permissions:** No read-only test user in `.env`; no `project_members` table in schema.

---

## UX Notes (non-blocking)

- **1.1:** After successful creation, form stays on `/new` instead of redirecting to the new submittal's detail page. Expected behavior is redirect to `/[submittalId]`.

---

## Next Steps

- [ ] Fix **8.1** — duplicate endpoint: generate unique number before INSERT (`frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/` duplicate handler)
- [ ] Fix **4.1** — workflow step user combobox: bind option `value` to user UUID, not display name
- [ ] Fix **2.2** — expose New Revision in three-dot menu + wire to revisions API
- [ ] Fix **7.1** — add Add/Link button to Related Items tab
- [ ] Re-run after fixes: `/test-scenario-run-feature submittals --case 8.1`
- [ ] Re-run after fixes: `/test-scenario-run-feature submittals --case 4.1`
- [ ] Seed project 67 with packages + spec sections to enable 1.3, 1.4
- [ ] Add read-only test user to `.env` to enable 12.1
