# PRP-Create Command Update Summary

**Date:** 2026-02-01
**Purpose:** Add mandatory Supabase type generation and pattern review to prevent recurring errors

---

## Changes Made

### 1. New Mandatory Step 0: Supabase Types Generation & Review

**Added BEFORE all other research steps**

**Requirements:**

- Generate fresh Supabase types using `npx supabase gen types...`
- Read and analyze `database.types.ts` file
- Document all relevant table structures, column types, and FK relationships
- **CRITICAL**: Verify FK column types match PK types (INTEGER vs UUID)
- Add "Database Schema" section to PRP with current schema and FK requirements

**Why This Matters:**

- Prevents UUID/INTEGER type mismatches (caused 3+ historical bugs)
- Ensures code matches actual database schema
- Catches missing tables/columns before coding starts

**Example Issues Prevented:**

- `schedule_tasks.project_id` was created as UUID when `projects.id` is INTEGER
- Multiple incidents of FK type mismatches causing silent query failures

---

### 2. New Mandatory Step 1: Pattern Review & Historical Error Prevention

**Added BEFORE codebase analysis**

**Requirements:**

- Read INCIDENT-LOG.md for all 🔴 CRITICAL and 🟡 WARNING incidents
- Review relevant pattern files based on feature type:
  - `database-issues.md` - Schema and query problems
  - `api-routing-errors.md` - Route and endpoint failures
  - `authentication-errors.md` - Permission and login issues
  - `testing-errors.md` - Test failures and patterns
  - `typescript-errors.md` - Type errors and solutions
  - `ui-errors.md` - UI/UX issues
  - `PLAYWRIGHT-PATTERNS.mdx` - E2E testing best practices
- Extract common mistakes, root causes, and prevention rules
- Add "Known Pitfalls & Prevention" section to PRP

**Why This Matters:**

- Prevents repeating the same mistakes (saves hours of debugging)
- Ensures PRP includes prevention rules from past incidents
- Makes executing agent aware of common pitfalls upfront
- Reduces implementation failures from known issues

**Example Issues Prevented:**

- Next.js build cache issues (3+ incidents, 90+ minutes wasted)
- Dynamic route naming conflicts (3+ incidents)
- Root cause misdiagnosis from grep searches instead of runtime evidence

---

### 3. Updated Research Process Numbering

Renumbered existing steps to accommodate new mandatory steps:

- **Step 0**: Supabase Types Generation & Review (NEW)
- **Step 1**: Pattern Review & Historical Error Prevention (NEW)
- **Step 2**: Procore Crawl Data & Spec Artifacts (was Step 0)
- **Step 3**: TypeScript/React Codebase Analysis (was Step 1)
- **Step 4**: TypeScript/React External Research (was Step 2)
- **Step 5**: User Clarification (was Step 3)

---

### 4. Enhanced Quality Gates

**Added to "Mandatory Prerequisites" section:**

- [ ] Supabase types generated and reviewed (Step 0 completed)
  - [ ] database.types.ts read and analyzed
  - [ ] All relevant table structures documented in PRP
  - [ ] FK type requirements identified (INTEGER vs UUID)
  - [ ] "Database Schema" section added to PRP context
- [ ] Pattern review completed (Step 1 completed)
  - [ ] INCIDENT-LOG.md reviewed for critical/warning incidents
  - [ ] Relevant pattern files read based on feature type
  - [ ] Common mistakes and prevention rules extracted
  - [ ] "Known Pitfalls & Prevention" section added to PRP

**Enhanced Context Completeness Check:**

- Added requirement for Database Schema section with FK type requirements
- Added requirement for Known Pitfalls section with prevention rules

---

### 5. Updated Output Checklist

**New Pre-Flight Checks:**

- Verify Step 0 (Supabase types) completed with all sub-items
- Verify Step 1 (Pattern review) completed with all sub-items
- Ensure Database Schema section exists in PRP
- Ensure Known Pitfalls & Prevention section exists in PRP

---

## Expected Benefits

### Error Prevention

- **Database Type Mismatches**: Catch FK type issues BEFORE creating migrations
- **Route Conflicts**: Review historical route naming issues before creating routes
- **Build Cache Issues**: Include prevention steps from incident log
- **Root Cause Misdiagnosis**: Reference patterns for proper debugging approach

### Time Savings

- Avoid 30-90 minute debugging sessions from repeated errors
- Reduce implementation failures from known issues
- Less back-and-forth fixing type mismatches after code is written

### Quality Improvement

- PRPs now include comprehensive schema context
- PRPs now include historical error prevention rules
- Executing agents have upfront knowledge of common pitfalls
- Better one-pass implementation success rate

---

## Pattern Files Referenced

Located at: `docs-ai/contents/docs/patterns/`

| File | Purpose |
| ------ | --------- |
| `INCIDENT-LOG.md` | Comprehensive history of all repeated errors |
| `database-issues.md` | Schema and query problems |
| `api-routing-errors.md` | Route and endpoint failures |
| `authentication-errors.md` | Permission and login issues |
| `testing-errors.md` | Test failures and patterns |
| `typescript-errors.md` | Type errors and solutions |
| `ui-errors.md` | UI/UX issues |
| `PLAYWRIGHT-PATTERNS.mdx` | E2E testing best practices |

---

## Validation

To verify these changes are working:

1. **Next PRP Creation**: Run `/prp-create <feature>` and verify:
   - Agent generates Supabase types first
   - Agent reads database.types.ts before any code analysis
   - Agent reviews INCIDENT-LOG.md
   - Agent reviews relevant pattern files
   - PRP includes "Database Schema" section
   - PRP includes "Known Pitfalls & Prevention" section

2. **Next PRP Execution**: Run `/prp-execute` and verify:
   - Executing agent references Database Schema section for FK types
   - Executing agent follows prevention rules from Known Pitfalls section
   - No repeated errors from INCIDENT-LOG occur

---

## Files Modified

- `.claude/commands/prp-create.md` - Main command file with new mandatory steps

---

## Success Metrics

**Target Improvements:**

- 🎯 Zero FK type mismatch errors in next 5 implementations
- 🎯 Zero Next.js build cache debugging sessions in next 5 implementations
- 🎯 Zero dynamic route naming conflicts in next 5 implementations
- 🎯 100% of PRPs include Database Schema section
- 🎯 100% of PRPs include Known Pitfalls & Prevention section

**Monitoring:**

- Track incident recurrence in INCIDENT-LOG.md
- Review PRP quality scores for improvement trend
- Monitor implementation success rate (first-pass vs requires fixes)
