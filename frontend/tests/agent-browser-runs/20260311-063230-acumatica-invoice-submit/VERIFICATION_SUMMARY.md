# Invoice Form Verification - Acumatica AR

## Run Details
- Date: 2026-03-11
- Environment: local Next.js dev server (`http://localhost:3000`)
- Browser tool: `agent-browser`

## Scope
- Verify New Invoice form can submit
- Verify record persists in `public.acumatica_ar_invoices`
- Verify `project_id` persistence after form payload fix

## What Was Tested
1. Opened `/1/invoices/new` and submitted invoice.
2. Verified persisted row in Supabase (initially with `project_id = null` before fix).
3. Patched form payload to include `project_id`.
4. Re-tested on `/1/invoices/new` and observed expected FK rejection:
   - `acumatica_ar_invoices_project_id_fkey`
   - `Key (project_id)=(1) is not present in table "projects"`
5. Re-tested on valid project route `/31/invoices/new`.
6. Confirmed redirect to `/31/invoices` and DB persistence with `project_id = 31`.

## Verified Records
- `reference_nbr = E2E-ACU-20260311-0640`
  - inserted successfully
  - `project_id = null` (pre-fix submission)
- `reference_nbr = E2E-ACU-20260311-0658`
  - inserted successfully
  - `project_id = 31` (post-fix submission on valid project)

## Evidence
- `before-submit.png`
- `after-submit.png`
- `after-submit-post-fix.png`
- `after-submit-valid-project.png`
- `session.webm`
- `post-submit-snapshot.txt`
- this summary (`VERIFICATION_SUMMARY.md`)
