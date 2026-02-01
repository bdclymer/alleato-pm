# Error Pattern Documentation

## Purpose

This directory contains documented error patterns, their root causes, and prevention strategies. **Every Claude Code session MUST review relevant patterns before taking action.**

## Available Patterns

### 1. [Authentication Errors](./authentication-errors.md)
**When to read:** Before working with RLS policies, permissions, or auth-related features

**Key patterns:**
- Missing users_auth link (people.auth_user_id doesn't exist)
- Correct RLS policy structure with users_auth joins
- Permission verification queries

### 2. [Database Issues](./database-issues.md)
**When to read:** Before creating tables, migrations, foreign keys, or form UIs that insert data

**Key patterns:**
- Foreign key type mismatch (UUID vs INTEGER)
- Missing type generation before migration
- Column name case sensitivity (snake_case)
- Type mapping reference for all tables
- CHECK constraint violation on insert (UI values vs DB-allowed values)
- Misleading placeholder vs empty value in forms
- Swallowed API errors (generic error messages hiding real cause)

### 3. [API Routing Errors](./api-routing-errors.md)
**When to read:** Before creating API routes or dynamic routes

**Key patterns:**
- Generic [id] parameter conflicts (use [projectId] instead)
- Missing async params in Next.js 15
- Missing permission checks in routes
- Route naming standards

## Usage Workflow

### Before ANY Action
```bash
# 1. Read MANDATORY-ERROR-PREVENTION.md
cat .claude/MANDATORY-ERROR-PREVENTION.md

# 2. Identify relevant pattern category
# - Authentication work? → authentication-errors.md
# - Database/migration work? → database-issues.md
# - API/route work? → api-routing-errors.md

# 3. Search for similar issues
grep -i "your_error_keyword" docs-ai/contents/docs/patterns/*.md

# 4. Apply documented solution
# 5. Update pattern if new issue discovered
```

### Quick Search
```bash
# Search all patterns for a keyword
grep -r "users_auth" docs-ai/contents/docs/patterns/

# Find RLS policy examples
grep -r "CREATE POLICY" docs-ai/contents/docs/patterns/

# Find type checking examples
grep -r "database.types.ts" docs-ai/contents/docs/patterns/
```

## Pattern Creation Guidelines

When you encounter a NEW error pattern:

1. **Document immediately** - Don't wait until it happens again
2. **Include root cause** - Explain WHY it happened
3. **Provide correct pattern** - Show the right way to do it
4. **Add prevention steps** - How to avoid in future
5. **Link related patterns** - Cross-reference other relevant docs

### Template
```markdown
## Pattern: [Error Name]

### Symptom
What the error looks like

### Root Cause
Technical explanation of why it occurs

### Wrong Pattern
❌ Code example that fails

### Correct Pattern
✅ Code example that works

### Prevention Steps
- [ ] Step 1
- [ ] Step 2

### Historical Incidents
- Date: What happened, how it was fixed

### Related Patterns
- See: other-pattern.md
```

### 4. [Incident Log](./INCIDENT-LOG.md)
**When to read:** When investigating recurring issues or checking if an error has been seen before

**Contents:**
- Chronological log of all incidents with dates, root causes, and fixes
- Cross-references to relevant pattern docs and prevention rules
- 7 incidents documented (INC-001 through INC-007)

## Enforcement

**These patterns are MANDATORY reading:**

- ✅ Before creating migrations → Read `database-issues.md`
- ✅ Before writing RLS policies → Read `authentication-errors.md`
- ✅ Before creating routes → Read `api-routing-errors.md`
- ✅ Before any database work → Run `npm run db:types` first

**Violations:** Repeating documented errors is unacceptable and must be prevented through this system.

## Maintenance

**Update frequency:**
- Immediately when new pattern discovered
- Weekly review for accuracy
- After any major architectural changes

**Quality standards:**
- Every pattern must have working code examples
- Every prevention step must be actionable
- Every historical incident must be documented

## Quick Reference Commands

```bash
# Generate fresh database types (MANDATORY before DB work)
npm run db:types

# Check for route conflicts
find app -name "*[*]*" | sort

# Search for auth patterns in existing code
grep -r "users_auth" supabase/migrations/

# Find API routes without permission checks
grep -r "export async function" app/api/ | xargs grep -L "auth.getUser"
```

---

**Last Updated:** 2026-02-01
**Patterns Documented:** 3 categories, 9+ patterns (authentication, database, api-routing)
**Coverage:** Core error patterns from specifications, budget/vertical-markup, and scheduling implementations
