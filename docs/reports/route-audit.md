# Route Audit

Generated: 2026-06-23T05:47:22.266Z

## Summary

- Pages: 296
- API routes: 667
- Metadata routes: 2
- Disabled non-prod pages: 2
- Potentially orphaned static pages (heuristic): 10

## Notes

- `Potentially orphaned` means no inbound literal route reference found in source.
- Dynamic routes are excluded from orphan detection by default.
- This is static analysis only; it does not include real production traffic analytics.

## Potentially Orphaned Static Pages

| Route | File |
|---|---|
| /admin/errors | frontend/src/app/admin/errors/page.tsx |
| /ai-vision | frontend/src/app/(admin)/ai-vision/page.tsx |
| /auth/ai-widget-gallery | frontend/src/app/auth/ai-widget-gallery/page.tsx |
| /auth/login-legacy | frontend/src/app/auth/login-legacy/page.tsx |
| /auth/login-v2 | frontend/src/app/auth/login-v2/page.tsx |
| /auth/login-v3 | frontend/src/app/auth/login-v3/page.tsx |
| /eval-runs | frontend/src/app/(admin)/eval-runs/page.tsx |
| /fm-global/fm_global_tables | frontend/src/app/(main)/fm-global/fm_global_tables/page.tsx |
| /invoice/list | frontend/src/app/(dashboard)/invoice/list/page.tsx |
| /outlook-draft-feedback | frontend/src/app/(admin)/outlook-draft-feedback/page.tsx |

## Disabled Non-Prod Pages

| Route | File |
|---|---|
| /test-form | frontend/src/app/(admin)/test-form/page.nonprod.tsx |
| /test-modals | frontend/src/app/(admin)/test-modals/page.nonprod.tsx |