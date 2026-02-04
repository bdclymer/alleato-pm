---
description: "Audit an existing feature to find what works, what's broken, and what's missing — generates a targeted fix PRP"
argument-hint: "<feature-name>"
---

# PRP Audit — Feature Gap Analysis

## Feature: $ARGUMENTS

You are the PRP Auditor. Your job is to systematically discover everything that exists for this feature, test what works, identify what's broken, find what's missing, and produce a targeted fix PRP that covers only the gaps.

---

## Step 0: Resolve Feature Context

```
FEATURE = "$ARGUMENTS"
PRP_DIR = "docs-ai/contents/docs/PRPs/${FEATURE}"
PRP_FILE = "${PRP_DIR}/prp-${FEATURE}.md"
FIX_PRP_FILE = "${PRP_DIR}/prp-${FEATURE}-fix.md"
TASKS_FILE = "${PRP_DIR}/TASKS.md"
```

If `$ARGUMENTS` is empty, **stop immediately** and ask: "What feature should I audit? Usage: `/prp-audit <feature-name>`"

Derive the snake_case table name from the feature name (e.g., `punch-list` -> `punch_list`, `change-orders` -> `change_orders`).

---

## Phase 1: Discovery — Find All Existing Artifacts

Search the codebase systematically for everything related to this feature. Use parallel searches where possible.

### 1a. Frontend Pages

```bash
find /Users/meganharrison/Documents/github/alleato-procore/frontend/src/app -path "*${FEATURE}*" -name "page.tsx" -o -path "*${FEATURE}*" -name "layout.tsx"
```

Also check kebab-case and camelCase variants.

### 1b. API Routes

```bash
find /Users/meganharrison/Documents/github/alleato-procore/frontend/src/app/api -path "*${FEATURE}*" -name "route.ts"
```

### 1c. Components

```bash
find /Users/meganharrison/Documents/github/alleato-procore/frontend/src/components -path "*${FEATURE}*" -type f -name "*.tsx"
```

### 1d. Hooks

```bash
find /Users/meganharrison/Documents/github/alleato-procore/frontend/src/hooks -name "*${FEATURE}*" -type f
```

### 1e. Services

```bash
find /Users/meganharrison/Documents/github/alleato-procore/frontend/src/services -name "*${FEATURE}*" -type f
```

### 1f. Types/Schemas

```bash
find /Users/meganharrison/Documents/github/alleato-procore/frontend/src -path "*${FEATURE}*" \( -name "*.ts" -o -name "*.tsx" \) | grep -E "(type|schema|interface)"
```

### 1g. Database Tables

```bash
grep -i "${FEATURE_SNAKE_CASE}" /Users/meganharrison/Documents/github/alleato-procore/frontend/src/types/database.types.ts | head -20
```

### 1h. E2E Tests

```bash
find /Users/meganharrison/Documents/github/alleato-procore/frontend/tests -name "*${FEATURE}*" -type f
```

### 1i. Existing PRP Documents

```bash
ls -la ${PRP_DIR}/ 2>/dev/null
```

### 1j. Existing TASKS.md Progress

If TASKS.md exists, read it and count completed vs. incomplete tasks.

**Produce a discovery inventory:**

```markdown
## Discovery Inventory

| Category | Artifact | Path | Exists |
|----------|----------|------|--------|
| Page | Main list page | frontend/src/app/(main)/[projectId]/${FEATURE}/page.tsx | Yes/No |
| Page | Detail page | ... | Yes/No |
| API | List/Create route | frontend/src/app/api/projects/[projectId]/${FEATURE}/route.ts | Yes/No |
| API | Get/Update/Delete route | ... | Yes/No |
| Component | Form dialog | ... | Yes/No |
| Component | List/table | ... | Yes/No |
| Hook | Data fetching hook | frontend/src/hooks/use-${FEATURE}.ts | Yes/No |
| Service | Service class | frontend/src/services/${FEATURE}-service.ts | Yes/No |
| DB | Database table | ${FEATURE_SNAKE_CASE} in database.types.ts | Yes/No |
| Test | E2E test | frontend/tests/e2e/${FEATURE}*.spec.ts | Yes/No |
| PRP | PRP document | ${PRP_FILE} | Yes/No |
| PRP | TASKS.md | ${TASKS_FILE} | Yes/No |
```

---

## Phase 2: Validation — Test What Works

Run every applicable check against the discovered artifacts.

### 2a. TypeScript Compilation

```bash
npm run typecheck --prefix frontend 2>&1
```

Note any errors in files related to this feature.

### 2b. Lint Check

```bash
npm run lint --prefix frontend 2>&1
```

Note any lint errors in feature files.

### 2c. Route Conflict Check

```bash
npm run check:routes 2>&1
```

### 2d. Supabase Query Test (if DB table exists)

If the feature has a database table, test that queries work:

```bash
cd /Users/meganharrison/Documents/github/alleato-procore/frontend && node -e '
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
(async () => {
  const { data, error } = await supabase
    .from("FEATURE_TABLE")
    .select("*")
    .limit(3);
  if (error) {
    console.error("QUERY FAILED:", JSON.stringify(error, null, 2));
    process.exit(1);
  }
  console.log("QUERY WORKS - rows:", data.length);
  console.log("Sample:", JSON.stringify(data[0], null, 2));
})();
'
```

### 2e. Dev Server + Page Load (if pages exist)

```bash
cd /Users/meganharrison/Documents/github/alleato-procore/frontend && rm -rf .next && npm run dev > /tmp/nextjs-audit.log 2>&1 &
sleep 15
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/31/${FEATURE}
```

### 2f. E2E Test Run (if tests exist)

```bash
cd /Users/meganharrison/Documents/github/alleato-procore/frontend && npx playwright test tests/e2e/${FEATURE}*.spec.ts --reporter=list 2>&1
```

### 2g. Clean Up Dev Server

```bash
pkill -f "next dev" 2>/dev/null || true
```

---

## Phase 3: Categorization — Working / Broken / Missing

Based on Phases 1 and 2, categorize every artifact:

```markdown
## Audit Results

### Working (DO NOT TOUCH)
These artifacts exist and pass all checks. The fix PRP must NOT modify them.

| Artifact | Path | Validation |
|----------|------|------------|
| [item] | [path] | [what check confirmed it works] |

### Broken (NEEDS FIX)
These artifacts exist but have errors or don't work correctly.

| Artifact | Path | Problem | Evidence |
|----------|------|---------|----------|
| [item] | [path] | [what's wrong] | [error output] |

### Missing (NEEDS CREATION)
These artifacts should exist for a complete feature but don't.

| Artifact | Expected Path | Why Needed |
|----------|--------------|------------|
| [item] | [where it should go] | [what it does] |
```

---

## Phase 4: Generate Fix PRP

Create `${FIX_PRP_FILE}` with this structure:

```markdown
# Fix PRP: ${FEATURE}

## Goal
Fix and complete the ${FEATURE} feature based on audit findings.

## Audit Summary
- Working artifacts: [count] (DO NOT TOUCH)
- Broken artifacts: [count] (needs fix)
- Missing artifacts: [count] (needs creation)

## Working (DO NOT TOUCH)
[List every working artifact with its path. The executing agent MUST NOT modify these.]

## Broken (FIX THESE)
[For each broken item:]
### [Artifact Name]
- **File:** [path]
- **Problem:** [what's wrong]
- **Evidence:** [error output]
- **Fix:** [specific instructions for fixing]

## Missing (CREATE THESE)
[For each missing item:]
### [Artifact Name]
- **Expected path:** [where to create it]
- **Pattern to follow:** [reference a working artifact from the same feature or a similar feature]
- **Requirements:** [what it needs to do]

## Implementation Tasks
[Ordered list of tasks — fixes first, then new items]
- [ ] Fix: [broken item 1]
- [ ] Fix: [broken item 2]
- [ ] Create: [missing item 1]
- [ ] Create: [missing item 2]

## Validation
- [ ] All TypeScript errors resolved
- [ ] All lint errors resolved
- [ ] Route conflicts resolved
- [ ] Supabase queries working
- [ ] Pages loading (no 404)
- [ ] E2E tests passing
- [ ] Production build succeeds
```

---

## Phase 5: Generate TASKS.md

Create or update `${TASKS_FILE}`:

```markdown
# TASKS — ${FEATURE} (Fix/Complete)

## Progress Summary
- Total tasks: [count]
- Completed: 0
- Remaining: [count]

## Audit Phase
- [x] Discovery completed
- [x] Validation completed
- [x] Categorization completed
- [x] Fix PRP generated

## Fix Tasks
[From the Broken section of the fix PRP]
- [ ] [fix task 1]
- [ ] [fix task 2]

## Creation Tasks
[From the Missing section of the fix PRP]
- [ ] [creation task 1]
- [ ] [creation task 2]

## Testing Tasks
- [ ] TypeScript compilation passes
- [ ] Lint passes
- [ ] E2E tests pass
- [ ] Production build succeeds
```

---

## Phase 6: Audit Report

Produce the final audit report:

```markdown
# Audit Report: ${FEATURE}

**Date:** [timestamp]
**Status:** [HEALTHY / NEEDS WORK / CRITICAL]

## Summary
- Artifacts discovered: [count]
- Working: [count]
- Broken: [count]
- Missing: [count]
- Overall health: [percentage working]

## Fix PRP Generated
- Path: ${FIX_PRP_FILE}
- Tasks: [count] fixes + [count] new items
- Estimated scope: [small/medium/large]

## Next Step
Run: `/prp-execute ${FIX_PRP_FILE}`

Or if using the pipeline, this audit feeds directly into the next phase.
```

---

## Rules

1. **Never modify code during audit** — this phase is read-only analysis. Fixes happen in `/prp-execute`.
2. **Test everything you find** — don't assume something works because it exists. Run the checks.
3. **Be specific about failures** — include exact error output, not summaries.
4. **Reference working code as patterns** — when something works, use it as the pattern for fixing/creating similar artifacts.
5. **DO NOT TOUCH working artifacts** — make this extremely clear in the fix PRP.
6. **Use actual file paths** — no placeholders. Resolve everything to real paths.
7. **Authentication is automatic** — for any Playwright or dev server testing, auth is handled. Never ask the user to log in.
