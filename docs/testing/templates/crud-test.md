---
title: CRUD Test Template
description: Copy-paste template for testing Create, Read, Update, Delete workflows with Playwright
keywords: ["playwright", "e2e", "crud", "testing", "template"]
---

# CRUD Test Template

Complete template for testing CRUD workflows. Links to the actual TypeScript template file in `.claude/testing/templates/crud-test.ts`.

## Quick Usage

1. Copy the template from `.claude/testing/templates/crud-test.ts`
2. Replace placeholders with your feature-specific values
3. Implement required database helpers
4. Add cleanup to `cleanupProjectArtifacts()`

## Template Features

- **Complete CRUD coverage**: Create, Read, Update, Delete operations
- **Isolated test data**: Each test suite creates its own project
- **Database verification**: Uses `pollFor()` to verify persistence
- **Reload fallback**: Handles data hydration timing issues
- **Proper cleanup**: Automatic teardown of all test data

## Customization Checklist

- [ ] Replace `Feature Name` with your actual feature
- [ ] Update route paths (`/your-feature` → your actual routes)
- [ ] Replace form field selectors with actual IDs/labels
- [ ] Implement database helper functions in `db.ts`
- [ ] Add cleanup call to `cleanupProjectArtifacts()`
- [ ] Update expected text/content to match your data

## Related

- [Form Validation Template](/testing/templates/form-validation-test)
- [Modal Interaction Template](/testing/templates/modal-interaction-test)
- [Full E2E Testing Guide](/testing/e2e-testing-guide)
