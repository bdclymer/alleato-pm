---
title: Form Validation Test Template
description: Copy-paste template for testing form validation, required fields, and error handling with Playwright
keywords: ["playwright", "e2e", "form", "validation", "testing", "template"]
---

# Form Validation Test Template

Template focused on testing form validation behaviors, error handling, and user input scenarios.

## Quick Usage

Copy the template from `.claude/testing/templates/form-validation-test.ts` and customize for your forms.

## Template Features

- **Required field validation**: Tests empty field submission prevention
- **Format validation**: Email, phone, URL format checking
- **Length validation**: Min/max character limits
- **Error clearing**: Validates errors disappear when corrected
- **Success paths**: Valid form submission testing
- **Duplicate prevention**: Unique constraint testing

## Validation Scenarios Covered

1. **Required Fields**: Prevents submission without required data
2. **Email Format**: Validates email address format
3. **Field Length**: Enforces character limits
4. **Error Clearing**: Errors disappear when fields are fixed
5. **Valid Submission**: Successful form processing
6. **Duplicate Prevention**: Unique constraint enforcement

## Customization Steps

- [ ] Update form field labels and selectors
- [ ] Adjust validation error message text
- [ ] Add domain-specific validation rules
- [ ] Test format validation for your field types
- [ ] Verify your specific success indicators

## Related Templates

- [CRUD Test Template](/testing/templates/crud-test)
- [Modal Interaction Template](/testing/templates/modal-interaction-test)
