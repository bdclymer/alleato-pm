# Drawings — Feature Test Run
**Date:** 2026-04-21  
**Run ID:** ecc19024-3043-4360-ab64-065b1dd343c8  
**Environment:** localhost:3000 — Project 67 (Vermillion Rise Warehouse)  
**Branch:** main  
**Tester:** claude-agent (test-scenario-run-feature skill)

---

## Summary

| Status | Count |
|--------|-------|
| Pass   | 34    |
| Fail   | 1     |
| Skip   | 10    |
| Blocked | 0   |
| **Total** | **45** |

**Pass rate (tested cases):** 97% (34/35)  
**Overall coverage:** 78% (35/45 executed)

---

## Critical Failures

### 12.1 — Unsupported file type not rejected (MEDIUM)
`POST /api/projects/67/drawings/upload-url`  
Sent `{ file_name: "test.docx", file_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", file_size: 1024 }`  
**Expected:** 400 error rejecting non-PDF  
**Actual:** 200 OK — signed upload URL returned. The API accepts any file type. Non-PDF files can be "uploaded" as drawings.  
**Fix needed:** Add MIME type validation in `/api/projects/[projectId]/drawings/upload-url/route.ts` — only allow `application/pdf` and image types (`image/png`, `image/jpeg`, `image/tiff`).

---

## Passed Tests

### Navigation (10/10)
| # | Test | Notes |
|---|------|-------|
| 1.1 | Drawings list page loads without error | ✅ |
| 1.2 | Table view shows expected columns | ✅ Number, Title, Discipline, Status, Revision, Updated |
| 1.3 | Upload button opens drawing upload dialog | ✅ Dialog opened with correct form fields |
| 1.4 | Searching the drawings list filters results | ✅ |
| 1.5 | Discipline filter narrows the drawing list | ✅ |
| 1.6 | Filtering to no results shows the empty state | ✅ |
| 1.7 | Drawing Sets tab loads without error | ✅ |
| 1.8 | Recycle Bin tab loads without error | ✅ |
| 1.9 | Clicking a drawing opens its detail page | ✅ |
| 1.10 | Card and list view toggles render without error | ✅ |

### Create (3/3 tested)
| # | Test | Notes |
|---|------|-------|
| 1.1 | Upload dialog with all fields | ✅ POST /upload-url returns signed URL |
| 7.1 | Create drawing set | ✅ POST /drawing-sets succeeded |
| 8.1 | Create drawing area | ✅ POST /areas succeeded |

### Edit (3/3 tested)
| # | Test | Notes |
|---|------|-------|
| 2.1 | Edit and save drawing metadata | ✅ All fields persisted after refresh |
| 2.3 | Cancel discards changes | ✅ Fields reverted to original values |
| 7.2 | Edit drawing set name inline | ✅ PATCH /drawing-sets/:id updated row |

### Status (5/5)
| # | Test | Notes |
|---|------|-------|
| 3.1 | Publish drawing | ✅ is_published=true, Published badge shown |
| 3.2 | Unpublish drawing | ✅ is_published=false, Unpublished badge shown |
| 3.3 | Mark as obsolete | ✅ PATCH /obsolete, Obsolete badge shown |
| 3.4 | Restore from obsolete | ✅ DELETE /obsolete, badge removed |
| 3.5 | Show Unpublished toggle | ✅ Grouped list included unpublished drawings |

### Delete (5/5)
| # | Test | Notes |
|---|------|-------|
| 4.1 | Soft delete from list | ✅ Moved to Recycle Bin |
| 4.2 | Delete from detail page | ✅ Navigated back to list |
| 4.3 | Restore from Recycle Bin | ✅ PATCH /restore |
| 4.4 | Permanent delete | ✅ DELETE /permanent-delete |
| 8.2 | Delete drawing area | ✅ Removed from hierarchy |

### Filters (1/1 tested)
| # | Test | Notes |
|---|------|-------|
| 5.1 | Status filter | ✅ GET /drawings?status=published filtered correctly |

### Bulk (2/2 tested)
| # | Test | Notes |
|---|------|-------|
| 6.1 | Bulk status update | ✅ PATCH /bulk-status {action:"publish"} |
| 6.2 | Bulk download ZIP | ✅ POST /bulk-download returned application/zip |

### Detail Tabs / PDF / QR
| # | Test | Notes |
|---|------|-------|
| 9.1 | All detail tabs load | ✅ Change History showed audit entries |
| 10.1 | PDF viewer loads | ✅ Full-screen viewer rendered pages |
| 11.1 | QR code modal | ✅ Scannable QR with drawing URL |

### Edge Cases (1/1 tested)
| # | Test | Notes |
|---|------|-------|
| 12.2 | Non-existent drawing shows error state | ✅ "Drawing Not Found" error state with back button |

### Smoke
| # | Test | Notes |
|---|------|-------|
| 0.0.0 | API endpoint sweep | ✅ All 27 Drawings routes responded without 500 |

---

## Skipped Tests

| # | Test | Reason |
|---|------|--------|
| 1.2 (Create) | Upload validation UI | File picker not automatable headless |
| 1.3 (Create) | Drag-and-drop upload | Native file system required |
| 2.2 | Inline revision number edit | Focused cell interaction blocked by overlay |
| 5.2 | Clear all filters | Filter clear UI blocked by agentation overlay |
| 5.3 | Column visibility toggle | Popover click blocked by agentation overlay |
| 6.3 | Deselect clears bulk toolbar | Checkbox UI blocked by agentation overlay |
| 9.2 | Upload sketch to revision | Real image file + file picker required |
| 9.3 | Link related item | No seeded RFI/submittal data in project 67 |
| 9.4 | Unlink related item | No linked items to unlink |
| 9.5 | Email distribution | SMTP + recipient seeding required |

---

## Bugs Found

### BUG-001: Upload API accepts non-PDF files (MEDIUM)
- **File:** `frontend/src/app/api/projects/[projectId]/drawings/upload-url/route.ts`
- **Reproduction:** POST with `file_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"`
- **Expected:** 400 rejection
- **Actual:** 200 + signed upload URL
- **Fix:** Add MIME type allowlist to route handler. Allowed types: `application/pdf`, `image/png`, `image/jpeg`, `image/tiff`, `image/svg+xml`.

---

## Test Environment Notes

- Project 67 used throughout (Vermillion Rise Warehouse)
- Test drawing `bc1fc214-bfcd-43ed-a5f0-1f877b7a11ab` (D_NEW) was created via direct DB INSERT during test to replace drawing permanently deleted in test 4.4
- Agentation "Block page interactions" overlay blocked native click interactions; JS-eval used as workaround for most cases; some tests skipped where workaround wasn't viable
- Dev server restarted once mid-run after going down
