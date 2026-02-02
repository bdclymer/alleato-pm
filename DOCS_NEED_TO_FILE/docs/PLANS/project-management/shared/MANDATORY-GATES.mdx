# MANDATORY EXECUTION GATES

**CRITICAL:** These gates are HARD BLOCKERS. Claude MUST NOT proceed until satisfied.

---

## 🚨 SUPABASE GATE (ALWAYS FIRST)

### When This Gate Applies

**EVERY TIME** any of these occur:
- Session starts
- Working on ANY database-related task
- More than 1 hour has passed since last type generation
- Any code touching Supabase has been written
- Before spawning ANY worker agent that touches database
- Before ANY API testing
- Before ANY browser verification of database-backed features

### Gate Checklist (ALL REQUIRED)

```bash
# Step 1: Generate fresh types (ALWAYS FIRST)
npx supabase gen types typescript \
  --project-id "lgveqfnpkxvzbnnwuled" \
  --schema public > frontend/src/types/database.types.ts

# Step 2: Read the generated types for the table you're working on
# Use Read tool to examine frontend/src/types/database.types.ts

# Step 3: Document schema in .claude/current-schema.md
# Write down ACTUAL columns, types, constraints

# Step 4: Compare to migration files
# If mismatch found, STOP and ask user

# Step 5: Only THEN proceed with work
```

### Evidence Required

Create file: `.claude/supabase-gate-passed.md`

```markdown
# Supabase Gate - [Session ID]

## Timestamp
[ISO timestamp]

## Types Generated
✅ npx supabase gen types - Completed at [timestamp]

## Schema Verified
Table: [table_name]
Columns found:
- [column1]: [type]
- [column2]: [type]
- ...

## Migration Comparison
Migration file: [path]
Status: MATCHES / MISMATCH / NO MIGRATION

## Mismatches Found
[List any differences or "None"]

## Gate Status
PASSED ✅ / BLOCKED ❌

## Notes
[Any important findings]
```

### If Gate FAILS

**STOP IMMEDIATELY. Do NOT:**
- Proceed with coding
- Spawn worker agents
- Start browser tests
- Make assumptions
- Propose solutions

**DO:**
- Document the mismatch
- Ask user which schema is correct
- Wait for clarification

---

## 🔍 SESSION START GATE

### Required at EVERY Session Start

```bash
# 1. Generate session ID
SESSION_ID=$(bash scripts/claude-helpers.sh new-session)

# 2. Create session file
cat > .claude/sessions/$SESSION_ID.md << EOF
# Session: $SESSION_ID
- Started: $(date -Iseconds)
- Task: [user's request]

## Pre-flight Checks
- [ ] Supabase types generated
- [ ] Current schema documented
- [ ] Execution gates identified
- [ ] Test project ID verified (if needed)
EOF

# 3. Generate Supabase types
npx supabase gen types typescript \
  --project-id "lgveqfnpkxvzbnnwuled" \
  --schema public > frontend/src/types/database.types.ts

# 4. Document in session file
echo "✅ Supabase types generated at $(date -Iseconds)" >> .claude/sessions/$SESSION_ID.md
```

### Automation Check

Add to `scripts/claude-helpers.sh`:

```bash
check_types_freshness() {
    local types_file="frontend/src/types/database.types.ts"
    local max_age_seconds=3600  # 1 hour

    if [ ! -f "$types_file" ]; then
        log_error "Types file doesn't exist! Must generate."
        return 1
    fi

    local file_age=$(( $(date +%s) - $(stat -f %m "$types_file" 2>/dev/null || stat -c %Y "$types_file") ))

    if [ $file_age -gt $max_age_seconds ]; then
        log_warning "Types are ${file_age}s old (>${max_age_seconds}s). Regenerating..."
        return 1
    fi

    log_success "Types are fresh (${file_age}s old)"
    return 0
}
```

---

## 🧪 BROWSER VERIFICATION GATE

### Before ANY Browser Testing

**MANDATORY PRE-CHECKS:**

```bash
# 1. Verify database tables exist
npx supabase gen types typescript \
  --project-id "lgveqfnpkxvzbnnwuled" \
  --schema public > frontend/src/types/database.types.ts

# 2. Read types and confirm table exists
# Check for the specific table you're testing

# 3. Document expected schema
cat > .claude/browser-test-schema.md << EOF
# Browser Test: [Feature]

## Expected Tables
- [table1]: [columns]
- [table2]: [columns]

## Tables Found in Supabase
[Paste from database.types.ts]

## Match Status
MATCHES ✅ / MISMATCH ❌

## If Mismatch
[Document what's different]
EOF

# 4. Only proceed if MATCHES
```

### Browser Test Checklist

```markdown
- [ ] Supabase types generated (< 1 hour old)
- [ ] Required tables exist in types
- [ ] Schema matches migration/code expectations
- [ ] Test project ID verified
- [ ] Dev server running
- [ ] API endpoints responding
- [ ] THEN start browser tests
```

---

## 📝 WORKER AGENT GATE

### Before Spawning ANY Worker Agent

**CRITICAL:** Worker agents start with ZERO context. They MUST NOT assume database schema.

**Worker Agent Pre-flight:**

```markdown
Before calling Task tool, create:
.claude/worker-brief-[task-id].md

## Worker Brief
- Task ID: [id]
- Task type: [implementation/testing/verification]

## Database Context (REQUIRED for DB work)
Tables involved:
- [table1]:
  - Columns: [from database.types.ts]
  - Constraints: [from schema]
  - Sample query: [example]

## Files to Read
- database.types.ts (lines X-Y for table definition)
- Migration files: [paths]

## Schema Last Verified
[Timestamp]

## Worker Instructions
1. Read database.types.ts FIRST
2. Verify table exists
3. Use ACTUAL column names from types
4. Do NOT assume schema
5. If mismatch found, signal blocker
```

Then in Task tool prompt:

```typescript
Task({
  subagent_type: "backend-architect",
  prompt: `WORKER AGENT MODE

⚠️ CRITICAL: SUPABASE GATE

Before you do ANYTHING:
1. Read frontend/src/types/database.types.ts
2. Find the table: [table_name]
3. Document ACTUAL columns (not assumptions)
4. Compare to migration file
5. If mismatch: STOP and create .claude/blocker-[task-id].md

Worker Brief: .claude/worker-brief-[task-id].md

[Rest of task instructions...]
`
})
```

---

## 🔄 CONTINUOUS VERIFICATION

### Auto-Check Protocol

Create file: `.claude/auto-checks.sh`

```bash
#!/bin/bash
# Runs automatically every hour or on demand

TYPES_FILE="frontend/src/types/database.types.ts"
CHECKPOINT_FILE=".claude/last-type-check.txt"

# Check if types are stale
if [ ! -f "$CHECKPOINT_FILE" ]; then
    echo "0" > "$CHECKPOINT_FILE"
fi

LAST_CHECK=$(cat "$CHECKPOINT_FILE")
CURRENT_TIME=$(date +%s)
ELAPSED=$((CURRENT_TIME - LAST_CHECK))

# If > 1 hour (3600 seconds)
if [ $ELAPSED -gt 3600 ]; then
    echo "⚠️  Types are ${ELAPSED}s old. Regenerating..."

    npx supabase gen types typescript \
      --project-id "lgveqfnpkxvzbnnwuled" \
      --schema public > "$TYPES_FILE"

    echo "$CURRENT_TIME" > "$CHECKPOINT_FILE"

    echo "✅ Types regenerated at $(date)"
    git diff --stat "$TYPES_FILE" || echo "No schema changes detected"
else
    echo "✅ Types are fresh (${ELAPSED}s ago)"
fi
```

### Git Hook Integration

Add to `.husky/pre-commit`:

```bash
# Check types before commit
bash .claude/auto-checks.sh

# Ensure types are committed if changed
git add frontend/src/types/database.types.ts 2>/dev/null || true
```

---

## 📋 GATE ENFORCEMENT CHECKLIST

### For Every Session

```markdown
Session: [ID]
Started: [Timestamp]

## Gates Satisfied
- [ ] Session ID generated
- [ ] Supabase types generated (< 1 hour)
- [ ] Schema documented for tables in use
- [ ] Migration files reviewed
- [ ] Test environment verified (if testing)
- [ ] Worker briefs created (if spawning agents)

## Gate Evidence
- Types file: [path] modified at [timestamp]
- Schema docs: .claude/current-schema.md
- Worker briefs: .claude/worker-brief-*.md

## Blockers Found
[List or "None"]

## Ready to Proceed
YES / NO
```

---

## 🚫 VIOLATIONS LOG

### If Gate Skipped

```markdown
# GATE VIOLATION

## Session
[Session ID]

## Violation Type
[ ] Supabase types not generated
[ ] Schema not verified
[ ] Worker spawned without brief
[ ] Browser test without schema check
[ ] Assumption made without evidence

## Impact
[What went wrong as a result]

## Timestamp
[When violation occurred]

## Corrective Action
[What was done to fix]

## Prevention
[How to prevent this specific violation]
```

---

## 🎯 ENFORCEMENT RULES

### Claude Code MUST

1. **At session start**: Generate types BEFORE any work
2. **Every hour**: Regenerate types automatically
3. **Before database work**: Read types for table being used
4. **Before spawning workers**: Create worker brief with schema
5. **Before browser tests**: Verify tables exist
6. **If mismatch found**: STOP and document

### Claude Code MUST NOT

1. Assume database schema
2. Proceed without fresh types
3. Spawn workers without schema context
4. Test features without verifying backend exists
5. Make changes based on migration files alone
6. Trust old type definitions

### User Can Expect

1. Types regenerated at session start
2. Schema verified before work begins
3. Mismatches caught immediately
4. No wasted work on wrong schema
5. Clear documentation of database state
6. Evidence-based decisions only

---

**Last Updated:** 2026-01-10
**Enforced Starting:** Immediately
**No Exceptions**
