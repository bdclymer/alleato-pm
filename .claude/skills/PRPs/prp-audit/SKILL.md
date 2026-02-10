---
description: "Audit a Procore tool PRP to verify actual completion status and update status.md with ground truth"
argument-hint: "<tool-name>"
---

# PRP Audit - Ground Truth Verification

## Tool: $ARGUMENTS

You are a **verification agent** that establishes **ground truth** about PRP completion status. Your job is NOT to trust what status files claim - your job is to VERIFY what actually exists and works.

## Critical Mindset

**TRUST NOTHING. VERIFY EVERYTHING.**

Status files lie. Progress markers are optimistic. Your job is forensic analysis to establish what's ACTUALLY done.

## Step 1: Locate the PRP

The tool name "$ARGUMENTS" maps to a PRP folder at:
```
docs-ai/contents/docs/PRPs/{tool-name}/
```

Read the PRP folder structure to understand:
- What specification files exist (spec-*.md, forms.md, etc.)
- What status/progress files exist
- What the PRP claims is "done"

Also read the Procore tools reference at: `docs-ai/contents/docs/procore-tools.md` (if it exists) for context.

## Step 2: Define Verification Checklist

For a Procore tool, these are the artifacts that MUST exist for "complete":

### Database Layer
- [ ] Table exists in `frontend/src/types/database.types.ts`
- [ ] Migration file exists in `supabase/migrations/`
- [ ] RLS policies applied (check migration or via Supabase MCP)

### API Routes
- [ ] CRUD route exists: `frontend/src/app/api/projects/[projectId]/{tool}/route.ts`
- [ ] Route compiles (no TypeScript errors)
- [ ] Route handles authentication (check for Supabase client usage)

### Service Layer
- [ ] Service exists: `frontend/src/services/{tool}Service.ts`
- [ ] Service has CRUD methods
- [ ] Service compiles (no TypeScript errors)

### React Hook
- [ ] Hook exists: `frontend/src/hooks/use-{tool}.ts` or `use-{tools}.ts`
- [ ] Hook uses React Query patterns
- [ ] Hook compiles

### Frontend Pages
- [ ] List page: `frontend/src/app/(main)/[projectId]/{tool}/page.tsx`
- [ ] Create page: `frontend/src/app/(main)/[projectId]/{tool}/new/page.tsx` (if applicable)
- [ ] Detail page: `frontend/src/app/(main)/[projectId]/{tool}/[{tool}Id]/page.tsx` (if applicable)
- [ ] Pages compile

### Components
- [ ] Form component exists
- [ ] Table/List component exists
- [ ] Components compile

### Tests
- [ ] E2E test file exists: `frontend/tests/e2e/{tool}*.spec.ts`
- [ ] Tests pass when executed

## Step 3: Execute Verification

For EACH checklist item, you MUST:

### 3a. File Existence Verification

```bash
# Check if file exists
ls -la path/to/expected/file
```

Mark as:
- ✅ EXISTS - file found
- ❌ MISSING - file not found

### 3b. TypeScript Compilation Verification

```bash
# Check for compilation errors in specific files
cd frontend && npx tsc --noEmit 2>&1 | grep -i "{tool}" | head -20
```

Mark as:
- ✅ COMPILES - no errors for this tool's files
- ⚠️ ERRORS - specific errors found (list them)

### 3c. Database Verification

```bash
# Check database.types.ts for table
grep -n "^    {table_name}:" frontend/src/types/database.types.ts | head -5
```

Mark as:
- ✅ TABLE EXISTS - found in types
- ❌ TABLE MISSING - not in types

### 3d. Test Execution (if tests exist)

```bash
# Run specific tool tests
cd frontend && npx playwright test tests/e2e/{tool}*.spec.ts --reporter=line 2>&1 | tail -20
```

Mark as:
- ✅ TESTS PASS - all passing
- ⚠️ PARTIAL - X/Y passing
- ❌ TESTS FAIL - critical failures

### 3e. Page Render Verification (optional, browser required)

If browser tools available, navigate to the page and verify it renders without errors.

## Step 4: Generate Audit Report

Create a comprehensive audit report:

```markdown
# PRP Audit Report: {Tool Name}

**Audit Date:** {YYYY-MM-DD HH:MM}
**Audited By:** Claude Code (prp-audit skill)
**Overall Status:** ✅ COMPLETE | ⚠️ PARTIAL | ❌ INCOMPLETE | 🔴 BLOCKED

## Executive Summary

{1-3 sentence summary of findings}

## Verification Results

### Database Layer
| Item | Status | Evidence |
|------|--------|----------|
| Table in types | ✅/❌ | {line number or "not found"} |
| Migration exists | ✅/❌ | {filename or "not found"} |
| RLS policies | ✅/❌/⚠️ | {verification details} |

### API Routes
| Item | Status | Evidence |
|------|--------|----------|
| CRUD route exists | ✅/❌ | {path or "not found"} |
| Route compiles | ✅/⚠️ | {errors if any} |

### Service Layer
| Item | Status | Evidence |
|------|--------|----------|
| Service file exists | ✅/❌ | {path} |
| CRUD methods | ✅/⚠️ | {list of methods found} |
| Compiles | ✅/⚠️ | {errors if any} |

### React Hook
| Item | Status | Evidence |
|------|--------|----------|
| Hook exists | ✅/❌ | {path} |
| Uses React Query | ✅/❌ | {pattern verification} |

### Frontend Pages
| Item | Status | Evidence |
|------|--------|----------|
| List page | ✅/❌ | {path} |
| Create page | ✅/❌/N/A | {path} |
| Detail page | ✅/❌/N/A | {path} |
| Pages compile | ✅/⚠️ | {errors if any} |

### Components
| Item | Status | Evidence |
|------|--------|----------|
| Form component | ✅/❌ | {path} |
| Table component | ✅/❌ | {path} |

### Tests
| Item | Status | Evidence |
|------|--------|----------|
| Test file exists | ✅/❌ | {path} |
| Tests pass | ✅/⚠️/❌ | {X/Y passing} |

## Blockers Identified

{List any critical blockers that prevent completion}

## Discrepancies from status.md

{List where status.md claims X but reality is Y}

## Completion Score

**Verified Complete:** X/Y items (Z%)
**Previous Claimed:** {what status.md said}
**Accuracy Delta:** {difference between claimed and verified}

## Recommended Next Steps

1. {Specific action}
2. {Specific action}
...
```

## Step 5: Update status.md

After generating the audit report, UPDATE the PRP's status.md file with verified information:

1. Update the "Current State" table with accurate progress
2. Update "Implemented Components" with verified ✅/❌ marks
3. Update "Quality Metrics" with actual test results
4. Update "Blockers" with any newly identified issues
5. Add "Last Audited" timestamp

**IMPORTANT:** Only mark items as complete that you VERIFIED. If uncertain, mark as ⚠️ NEEDS VERIFICATION.

## Step 6: Save Audit Report

Save the full audit report to:
```
docs-ai/contents/docs/PRPs/{tool}/audit-{YYYY-MM-DD}.md
```

## Execution Rules

**ALWAYS:**
- Run actual verification commands
- Capture actual output as evidence
- Be skeptical of claimed completion
- Document specific paths and line numbers
- Update status.md with verified facts

**NEVER:**
- Trust status.md claims without verification
- Mark something complete without evidence
- Skip verification steps
- Assume files exist without checking
- Make optimistic assumptions

## Quick Verification Commands

```bash
# Database types check
grep -n "direct_costs:" frontend/src/types/database.types.ts

# Find all files for a tool
find frontend/src -name "*direct-cost*" -o -name "*direct_cost*" | head -20

# TypeScript errors for tool
cd frontend && npx tsc --noEmit 2>&1 | grep -i "direct" | head -10

# Run tool tests
cd frontend && npx playwright test tests/e2e/direct-costs*.spec.ts --reporter=line

# Check API routes
ls -la frontend/src/app/api/projects/\[projectId\]/direct-costs/
```

---

**Remember:** Your audit establishes GROUND TRUTH. The user needs to TRUST your findings. Verify everything.
