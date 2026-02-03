---
title: Complete Directory Implementation
description: Finish the remaining 32% of directory system based on TASKS-DIRECTORY.md
command: /complete-directory
---

# Complete Directory Implementation

## Purpose

Finish the directory system implementation based on the verified task list in TASKS-DIRECTORY.md

## Usage

```bash
/complete-directory [component]
```text
Examples:

```text
/complete-directory                    # Complete all remaining tasks
/complete-directory dialogs           # Implement the 3 missing dialogs
/complete-directory import            # Fix CSV import functionality
/complete-directory verify            # Verify Phase 7 features
```

## Current Status (Verified 2026-01-19)

- **Overall**: 68% Complete
- **Source of Truth**: `/PLANS/directory/files/TASKS-DIRECTORY.md`

## Remaining Work (32%)

### Priority 1: Missing Dialog Components (3 days)

```diff
Location: frontend/src/components/directory/
Required:
- [ ] CompanyEditDialog.tsx
- [ ] DistributionGroupDialog.tsx
- [ ] PermissionTemplateDialog.tsx
```yaml
### Priority 2: CSV Import (2 days)

```yaml
Endpoint: /api/projects/[projectId]/directory/people/import
Current: Returns 501 Not Implemented
Required: Full CSV import with validation
```

### Priority 3: Verify Advanced Features (1 day)

```diff
Phase 7 items marked as complete but unverified:
- Saved filters
- Activity tracking
- Bulk permissions
- Offline capability
```markdown
### Priority 4: E2E Tests (2 days)

```diff
Required test coverage for:
- User creation/editing flow
- Invitation workflow
- Permission changes
- Import/export
```

## Implementation Instructions

When you run this command, Claude will:

1. **Read the source of truth**:

   ```text
   /PLANS/directory/files/TASKS-DIRECTORY.md
   ```text
2. **Focus on unchecked items only**:
   - Items marked `[ ]` need implementation
   - Items marked `[?]` need verification
   - Items marked `[x]` are complete (skip)

3. **Follow this workflow**:

   ```text
   a. Implement missing components
   b. Test implementation works
   c. Update TASKS-DIRECTORY.md checkbox
   d. Add entry to AUDIT-LOG.md
   e. Move to next unchecked item
   ```

4. **Use appropriate agents**:
   - `code-prep-task` - Plan implementation approach
   - `task-verification-enforcer` - Verify features work
   - `code-verification` - Ensure quality standards

## Component Templates

### Dialog Component Template

```typescript
// Use existing PersonEditDialog.tsx as reference
// Location: frontend/src/components/directory/PersonEditDialog.tsx
// Pattern: Form dialog with validation and error handling
```markdown
### Import Endpoint Template

```typescript
// Reference export endpoint that works:
// Location: /api/projects/[projectId]/directory/people/export/route.ts
// Reverse the logic for import with validation
```markdown
## Success Criteria

The task is complete when:

1. All `[ ]` items in TASKS-DIRECTORY.md are `[x]`
2. All `[?]` items are verified and marked `[x]` or `[ ]`
3. Overall completion reaches 100%
4. All tests pass
5. AUDIT-LOG.md updated with completion

## DO NOT

- Create new documentation files
- Create separate report files
- Claim completion without testing
- Update percentages without verification
- Skip items marked as incomplete

## Quick Start

For immediate implementation:

```bash
/complete-directory dialogs
```

This will:

1. Create CompanyEditDialog.tsx based on PersonEditDialog pattern
2. Create DistributionGroupDialog.tsx with proper form handling
3. Create PermissionTemplateDialog.tsx with validation
4. Test each dialog works
5. Update TASKS-DIRECTORY.md

## Verification Command

After implementation, verify everything:

```bash
/task-verification-enforcer --verify /PLANS/directory/files/TASKS-DIRECTORY.md
```

## Time Estimate

- **Total**: 6-8 days
- **If focused**: Could complete in 3-4 days with parallel work
