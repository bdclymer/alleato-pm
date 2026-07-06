# Submittals Settings Tabs Verification Report

**Date:** 2026-07-06  
**Route:** `https://projects.alleatogroup.com/876/submittals?tab=settings`  
**Reference:** Procore submittals settings at `https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949954702659/tools/submittals/settings`  
**Status:** ✅ PASS

## Summary

Production is serving the published submittals settings tab parity update for project `876`.

A fresh browser verification hit the exact protected production route, followed the expected redirect to `/auth/login`, completed login with the repo-backed fallback credentials available in the environment, and verified the updated content across all settings tabs. The non-General tabs now expose the intended Procore-parity copy and disabled CTA affordances that were published in the settings-surface update.

## URLs Checked

- `https://projects.alleatogroup.com/876/submittals?tab=settings`
- `https://projects.alleatogroup.com/876/submittals?tab=settings&settings_tab=general`
- `https://projects.alleatogroup.com/876/submittals?tab=settings&settings_tab=responses`
- `https://projects.alleatogroup.com/876/submittals?tab=settings&settings_tab=workflow-templates`
- `https://projects.alleatogroup.com/876/submittals?tab=settings&settings_tab=replace-workflow-user`
- `https://projects.alleatogroup.com/876/submittals?tab=settings&settings_tab=imports`
- `https://projects.alleatogroup.com/876/submittals?tab=settings&settings_tab=custom-reports`
- `https://projects.alleatogroup.com/876/submittals?tab=settings&settings_tab=permissions`

## Tab-by-Tab Ledger

| Tab | Result | Evidence |
| --- | ------ | -------- |
| `General` | PASS | Route loaded normally and remained accessible after authentication. Screenshot: [tab-general.png](./tab-general.png) |
| `Responses` | PASS | Shows `Add Response`, copy beginning `Procore provides default submittal responses...`, and note `Custom response editing is not yet available on this Alleato route.` Screenshot: [tab-responses.png](./tab-responses.png) |
| `Workflow Templates` | PASS | Shows `Create New Template` and empty-state headline `Create Workflow Templates to Get Started`. Screenshot: [tab-workflow-templates.png](./tab-workflow-templates.png) |
| `Replace Workflow User` | PASS | Shows `Cancel` and `Replace and Save`, plus expanded Procore-style instructional copy about pending responses, prior responses, email behavior, and templates. Screenshot: [tab-replace-workflow-user.png](./tab-replace-workflow-user.png) |
| `Imports` | PASS | Shows disabled `Download .xlsx Template` and disabled `Download Procore Imports`, plus note `Import downloads are not yet available on this Alleato route.` Screenshot: [tab-imports.png](./tab-imports.png) |
| `Custom Reports` | PASS | Shows `No Custom Reports` for both sections and two disabled `Go to Reports` actions. Screenshot: [tab-custom-reports.png](./tab-custom-reports.png) |
| `Permissions` | PASS | Shows longer Procore-style guidance mentioning `Company Admins`, `permission templates`, and `best practice`. Screenshot: [tab-permissions.png](./tab-permissions.png) |

## Authentication and Network Evidence

- Initial unauthenticated access redirected to `/auth/login?callbackUrl=%2F876%2Fsubmittals%3Ftab%3Dsettings`.
- Fallback UI login succeeded and returned the browser to the target production settings route.
- `GET /api/projects/876/submittals/settings -> 200`
- `GET /api/projects/876/directory/permissions -> 200`

## Notes

- Background noise included repeated `GET /api/users/me/profile -> 401` responses, but this did not block rendering or interaction on the verified settings tabs.
- No evidence of stale deployment propagation or cache mismatch remained during this verification pass; the live production route served the updated content.

## Artifacts

- [initial.png](./initial.png)
- [after-login-attempt.png](./after-login-attempt.png)
- [tab-general.png](./tab-general.png)
- [tab-responses.png](./tab-responses.png)
- [tab-workflow-templates.png](./tab-workflow-templates.png)
- [tab-replace-workflow-user.png](./tab-replace-workflow-user.png)
- [tab-imports.png](./tab-imports.png)
- [tab-custom-reports.png](./tab-custom-reports.png)
- [tab-permissions.png](./tab-permissions.png)

## Final Classification

**Verified**

The production Alleato route now matches the intended published parity update for the submittals settings tabs that were in scope for this pass.
