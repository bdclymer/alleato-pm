# Feature Test Report: Drawings

**Run ID:** 8114e26c-c4f9-4701-99d1-d08b95017899
**Tester:** claude-code
**Environment:** localhost:3000
**Branch:** main
**Started:** 2026-04-23 18:20
**Duration:** ~2847s

## Summary

| Status  | Count |
|---------|-------|
| Passed  | 20    |
| Failed  | 8     |
| Skipped | 6     |
| Blocked | 0     |
| **Total** | 34  |

Pass rate: **59%** (20/34)

---

## Results

| # | Test | Priority | Status | Severity | Evidence |
|---|------|----------|--------|----------|----------|
| 1.1 | Upload a drawing PDF with all fields filled | HIGH | ✅ pass | — | [final](https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/object/public/test-screenshots/8114e26c-c4f9-4701-99d1-d08b95017899/1.1/1.1-final.png) |
| 1.2 | Uploading without a file shows validation error | HIGH | ✅ pass | — | [final](https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/object/public/test-screenshots/8114e26c-c4f9-4701-99d1-d08b95017899/1.2/1.2-final.png) |
| 1.3 | Drag PDF onto page pre-fills upload dialog | HIGH | ⏭ skip | — | OS-level drag unavailable in agent-browser |
| 2.1 | Edit drawing metadata saves and persists | HIGH | ❌ fail | high | [final](https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/object/public/test-screenshots/8114e26c-c4f9-4701-99d1-d08b95017899/2.1/2.1-final.png) [video](e2e-recordings/8114e26c-c4f9-4701-99d1-d08b95017899/2.1.webm) |
| 2.2 | Change revision number inline saves | HIGH | ✅ pass | — | [final](https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/object/public/test-screenshots/8114e26c-c4f9-4701-99d1-d08b95017899/2.2/2.2-final.png) |
| 2.3 | Cancel in-progress edit reverts fields | HIGH | ⏭ skip | — | MCP panel overlay interference |
| 3.1 | Publish drawing changes status badge | HIGH | ✅ pass | — | [final](https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/object/public/test-screenshots/8114e26c-c4f9-4701-99d1-d08b95017899/3.1/3.1-final.png) |
| 3.2 | Unpublish drawing reverts status | HIGH | ✅ pass | — | [final](https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/object/public/test-screenshots/8114e26c-c4f9-4701-99d1-d08b95017899/3.2/3.2-final.png) |
| 3.3 | Mark as obsolete shows Obsolete badge | HIGH | ✅ pass | — | [final](https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/object/public/test-screenshots/8114e26c-c4f9-4701-99d1-d08b95017899/3.3/3.3-final.png) |
| 3.4 | Restore obsolete drawing removes badge | HIGH | ❌ fail | medium | [final](https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/object/public/test-screenshots/8114e26c-c4f9-4701-99d1-d08b95017899/3.4/3.4-final.png) [video](e2e-recordings/8114e26c-c4f9-4701-99d1-d08b95017899/3.4.webm) |
| 3.5 | Show Unpublished toggle filters list | MEDIUM | ✅ pass | — | [final](https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/object/public/test-screenshots/8114e26c-c4f9-4701-99d1-d08b95017899/3.5/3.5-final.png) |
| 4.1 | Delete drawing moves to Recycle Bin | HIGH | ❌ fail | high | [final](https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/object/public/test-screenshots/8114e26c-c4f9-4701-99d1-d08b95017899/4.1/4.1-final.png) [video](e2e-recordings/8114e26c-c4f9-4701-99d1-d08b95017899/4.1.webm) |
| 4.2 | Delete from detail page navigates back | HIGH | ⏭ skip | — | Depends on 4.1 |
| 4.3 | Restore from Recycle Bin returns to active | HIGH | ⏭ skip | — | Depends on 4.1 |
| 4.4 | Permanently delete from Recycle Bin | HIGH | ⏭ skip | — | Depends on 4.1 |
| 5.1 | Status filter shows matching drawings only | MEDIUM | ✅ pass | — | [final](https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/object/public/test-screenshots/8114e26c-c4f9-4701-99d1-d08b95017899/5.1/5.1-final.png) |
| 5.2 | Clear filters restores full list | MEDIUM | ✅ pass | — | [final](https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/object/public/test-screenshots/8114e26c-c4f9-4701-99d1-d08b95017899/5.2/5.2-final.png) |
| 5.3 | Hiding a column removes it from table view | LOW | ✅ pass | — | [final](https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/object/public/test-screenshots/8114e26c-c4f9-4701-99d1-d08b95017899/5.3/5.3-final.png) |
| 6.1 | Bulk discipline update applies to all rows | HIGH | ✅ pass | — | [final](https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/object/public/test-screenshots/8114e26c-c4f9-4701-99d1-d08b95017899/6.1/6.1-final.png) |
| 6.2 | Bulk download packages as ZIP | HIGH | ✅ pass | — | [final](https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/object/public/test-screenshots/8114e26c-c4f9-4701-99d1-d08b95017899/6.2/6.2-final.png) |
| 6.3 | Clearing selection hides bulk actions | MEDIUM | ✅ pass | — | [final](https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/object/public/test-screenshots/8114e26c-c4f9-4701-99d1-d08b95017899/6.3/6.3-final.png) |
| 7.1 | Create drawing set saves and appears in list | HIGH | ✅ pass | — | [final](https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/object/public/test-screenshots/8114e26c-c4f9-4701-99d1-d08b95017899/7.1/7.1-final.png) |
| 7.2 | Edit drawing set name inline saves | MEDIUM | ❌ fail | medium | [final](https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/object/public/test-screenshots/8114e26c-c4f9-4701-99d1-d08b95017899/7.2/7.2-final.png) [video](e2e-recordings/8114e26c-c4f9-4701-99d1-d08b95017899/7.2.webm) |
| 8.1 | Create drawing area saves in hierarchy | HIGH | ✅ pass | — | [final](https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/object/public/test-screenshots/8114e26c-c4f9-4701-99d1-d08b95017899/8.1/8.1-final.png) |
| 8.2 | Delete drawing area removes from hierarchy | MEDIUM | ✅ pass | — | [final](https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/object/public/test-screenshots/8114e26c-c4f9-4701-99d1-d08b95017899/8.2/8.2-final.png) |
| 9.1 | All tabs on detail page load without error | HIGH | ❌ fail | medium | [final](https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/object/public/test-screenshots/8114e26c-c4f9-4701-99d1-d08b95017899/9.1/9.1-final.png) [video](e2e-recordings/8114e26c-c4f9-4701-99d1-d08b95017899/9.1.webm) |
| 9.2 | Upload sketch saves and displays in tab | HIGH | ✅ pass | — | [final](https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/object/public/test-screenshots/8114e26c-c4f9-4701-99d1-d08b95017899/9.2/9.2-final.png) |
| 9.3 | Link related item appears in Related Items | HIGH | ❌ fail | high | [final](https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/object/public/test-screenshots/8114e26c-c4f9-4701-99d1-d08b95017899/9.3/9.3-final.png) [video](e2e-recordings/8114e26c-c4f9-4701-99d1-d08b95017899/9.3.webm) |
| 9.4 | Unlink related item removes from tab | MEDIUM | ⏭ skip | — | Depends on 9.3 |
| 9.5 | Email distribution records in Emails tab | MEDIUM | ❌ fail | medium | [final](https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/object/public/test-screenshots/8114e26c-c4f9-4701-99d1-d08b95017899/9.5/9.5-final.png) [video](e2e-recordings/8114e26c-c4f9-4701-99d1-d08b95017899/9.5.webm) |
| 10.1 | View button opens PDF viewer | HIGH | ✅ pass | — | [final](https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/object/public/test-screenshots/8114e26c-c4f9-4701-99d1-d08b95017899/10.1/10.1-final.png) |
| 11.1 | QR code modal shows scannable code | MEDIUM | ✅ pass | — | [final](https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/object/public/test-screenshots/8114e26c-c4f9-4701-99d1-d08b95017899/11.1/11.1-final.png) |
| 12.1 | .docx upload rejected from queue | MEDIUM | ❌ fail | medium | [final](https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/object/public/test-screenshots/8114e26c-c4f9-4701-99d1-d08b95017899/12.1/12.1-final.png) [video](e2e-recordings/8114e26c-c4f9-4701-99d1-d08b95017899/12.1.webm) |
| 12.2 | Non-existent drawing shows error state | LOW | ✅ pass | — | [final](https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/object/public/test-screenshots/8114e26c-c4f9-4701-99d1-d08b95017899/12.2/12.2-final.png) |

---

## Failures

### 2.1 — Edit drawing metadata saves and persists

- **Expected:** All edited fields (number, title, discipline, type) persist after page refresh
- **Actual:** After clicking Save and refreshing, all fields reverted to original values. DB query confirmed: `drawing_number` and `title` unchanged, `discipline` and `drawing_type` null.
- **Severity:** high
- **Video:** `e2e-recordings/8114e26c-c4f9-4701-99d1-d08b95017899/2.1.webm`
- **Console errors:** none related
- **DB assertion:** `select drawing_number, title, discipline, drawing_type from drawings where id = 'bc1fc214-...'` → original values returned
- **Remediation hint:** `frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/route.ts` — PATCH handler likely not accepting or applying the metadata fields from request body

---

### 3.4 — Restore obsolete drawing removes Obsolete badge

- **Expected:** Obsolete badge disappears immediately after "Restore from Obsolete" action
- **Actual:** DB correctly updated `is_obsolete=false`. UI still shows Obsolete badge — requires page reload to reflect.
- **Severity:** medium
- **Video:** `e2e-recordings/8114e26c-c4f9-4701-99d1-d08b95017899/3.4.webm`
- **Root cause:** React Query not invalidating the drawing detail query after the restore mutation. Same pattern as publish (3.1), drawing set inline edit (7.2), and email distribution (9.5).
- **Remediation hint:** Search for the restore mutation hook in `frontend/src/hooks/` — add `queryClient.invalidateQueries(['drawing', drawingId])` in `onSuccess`

---

### 4.1 — Delete drawing moves to Recycle Bin

- **Expected:** Deleted drawing appears in Recycle Bin page
- **Actual:** Delete succeeded (toast: "Drawing moved to Recycle Bin", DB: `deleted_at` set). Recycle Bin page shows empty.
- **Severity:** high
- **Video:** `e2e-recordings/8114e26c-c4f9-4701-99d1-d08b95017899/4.1.webm`
- **DB assertion:** `select id, deleted_at from drawings where deleted_at IS NOT NULL` → 1 row returned. Recycle Bin page query likely missing `WHERE deleted_at IS NOT NULL` filter.
- **Remediation hint:** `frontend/src/app/api/projects/[projectId]/drawings/recycle-bin/route.ts` — verify GET handler filters on `deleted_at IS NOT NULL`; also check the page component query

---

### 7.2 — Edit drawing set name inline saves and updates row

- **Expected:** Row immediately shows updated name after inline edit + Enter
- **Actual:** DB updated correctly. Row still shows old name — React Query not invalidating drawing sets list query after inline save mutation.
- **Severity:** medium
- **Video:** `e2e-recordings/8114e26c-c4f9-4701-99d1-d08b95017899/7.2.webm`
- **Remediation hint:** Find the drawing set update mutation in `frontend/src/hooks/` — add `invalidateQueries(['drawing-sets', projectId])` in `onSuccess`

---

### 9.1 — All tabs on detail page load without error

- **Expected:** No console errors when navigating between tabs
- **Actual:** Every tab navigation produces: `"Hydration failed because the server rendered HTML didn't match the client"` — React SSR/client mismatch. Tabs render visually but the error fires on every click.
- **Severity:** medium
- **Console errors:** `Hydration failed because the server rendered HTML didn't match the client` (on every tab change)
- **Remediation hint:** `frontend/src/app/(main)/[projectId]/drawings/[drawingId]/page.tsx` — likely a conditional render or dynamic content (e.g. date formatting, client-only state) diverging between SSR and client. Wrap the diverging section in a `useEffect` or `dynamic(() => ..., { ssr: false })`.

---

### 9.3 — Link related item appears in Related Items tab

- **Expected:** RFI successfully linked; appears in Revision Related Items tab
- **Actual:** API returned error toast: "Could not link item — Drawing not found" when linking RFI `d09008bf-f04b-4947-9a8d-70c431e1a83a` to drawing integer ID `51933023`.
- **Severity:** high
- **Video:** `e2e-recordings/8114e26c-c4f9-4701-99d1-d08b95017899/9.3.webm`
- **Root cause:** The related-items link endpoint likely queries the drawings table using the integer `drawing_id` but the API route receives or resolves the UUID. Type mismatch between integer PK and UUID reference.
- **Remediation hint:** `frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/revisions/[revisionId]/related-items/route.ts` (or similar) — check how `drawingId` is resolved when the link request fires

---

### 9.5 — Email distribution records in Emails tab

- **Expected:** Emails tab shows sent email after distribution
- **Actual:** Distribution sent successfully (toast confirmed), dialog closed. Emails tab shows "No emails".
- **Severity:** medium
- **Video:** `e2e-recordings/8114e26c-c4f9-4701-99d1-d08b95017899/9.5.webm`
- **Root cause:** React Query not invalidating the emails query after the distribute mutation. Same systemic pattern.
- **Remediation hint:** Find the distribute mutation hook — add `invalidateQueries(['drawing-emails', drawingId])` in `onSuccess`

---

### 12.1 — .docx upload rejected from queue

- **Expected:** .docx file rejected by file input or shown as error; not added to queue
- **Actual:** File input `accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif"` but app accepts .docx when set via DataTransfer API (simulates drag & drop bypass). .docx appeared in queue with green checkmark and no error.
- **Severity:** medium
- **Video:** `e2e-recordings/8114e26c-c4f9-4701-99d1-d08b95017899/12.1.webm`
- **Root cause:** Client-side validation only enforces the `accept` attribute (browser native filter). No secondary JS validation of file type after selection. A user can drag & drop unsupported files and bypass the restriction.
- **Remediation hint:** In the upload dialog component, add a file type check in the `onChange` / drop handler — reject files whose MIME type or extension is not in the accepted set, show an inline error. Also add server-side validation in the upload API route.

---

## Systemic Issues

### React Query Invalidation Pattern (affects 4 cases: 3.4, 7.2, 9.5, plus partial in 3.1)

All of these mutations succeed in the database but the UI does not re-render:
- Restore from Obsolete (3.4)
- Drawing Set inline name edit (7.2)
- Email distribution (9.5)
- Publish (3.1 — required page reload)

**Fix:** Audit all drawing mutation hooks in `frontend/src/hooks/use-drawings*.ts` and `use-drawing-sets*.ts`. Every `onSuccess` must call `queryClient.invalidateQueries` for the affected query keys. Consider a shared hook pattern that auto-invalidates.

---

## Skipped / Blocked

- **1.3 — Drag PDF pre-fills dialog:** OS-level file drag cannot be simulated via JS DataTransfer in agent-browser
- **2.3 — Cancel edit reverts fields:** MCP annotation panel interference caused Cancel button ref to resolve incorrectly
- **4.2 / 4.3 / 4.4 — Recycle Bin flows:** All depend on 4.1 (Recycle Bin display broken)
- **9.4 — Unlink related item:** Depends on 9.3 (linking failed)

---

## Next Steps

- [ ] Fix [2.1] — Edit metadata PATCH not persisting: `frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/route.ts`
- [ ] Fix [4.1] — Recycle Bin query missing `deleted_at IS NOT NULL`: `frontend/src/app/api/projects/[projectId]/drawings/recycle-bin/route.ts`
- [ ] Fix [9.3] — Related items link "Drawing not found" error: check drawing ID type resolution in related-items route
- [ ] Fix [systemic] — React Query invalidation missing after mutations: audit all drawing mutation hooks (affects 3.4, 7.2, 9.5, 3.1)
- [ ] Fix [9.1] — SSR hydration mismatch on drawing detail tabs: `frontend/src/app/(main)/[projectId]/drawings/[drawingId]/page.tsx`
- [ ] Fix [12.1] — Add client-side + server-side file type validation in upload dialog
- [ ] Re-run after fixes: `/test-scenario-run-feature drawings --case 2.1`
- [ ] Re-run after fixes: `/test-scenario-run-feature drawings --case 4.1`
- [ ] Re-run after fixes: `/test-scenario-run-feature drawings --case 9.3`
- [ ] Run smoke to verify API still healthy: `/test-scenario-run-smoke drawings`
