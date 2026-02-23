# USE AVAILABLE TOOLS (Don't Make User Do Your Job)

## The Rule

**If a tool can do it, USE THE TOOL. Don't tell the user to do it manually.**

---

## Tools Available in This Project

### 1. Supabase MCP

Use for:

- Running SQL queries
- Executing migrations
- Checking schema
- Managing database

**WRONG:**

```sql
User: You need to run this SQL in Supabase:
DROP TABLE IF EXISTS ...
CREATE TABLE ...
```
**CORRECT:**

```bash
Let me run that SQL through the Supabase MCP.
[Uses mcp__supabase__execute_sql tool]
```

### 2. Supabase CLI

Use for:

- Generating types: `npx supabase gen types typescript ...`
- Database operations

**WRONG:**

```bash
After running this SQL, regenerate the Supabase types:
npx supabase gen types typescript ...
```
**CORRECT:**

```text
[Runs the command directly via Bash tool]
```

### 3. ToolSearch for Deferred Tools

Before giving up and asking user to do something, search for a tool:

```text
[Uses ToolSearch with query: "supabase sql"]
```
---

## The Incident (2026-01-28)

Claude dumped 150+ lines of SQL and told the user:
> "User: You need to run this SQL in Supabase to fix the schema mismatch..."

User's response:
> "why can't you freaking run it with the supabase cli or mcp? And don't freaking tell me to generate the types when you are 100% capable of doing this. Get your shit together."

**Lesson:** The user is RIGHT. Claude had tools available and chose not to use them.

---

## Decision Tree

```text
Need to do something?
    |
    v
Can I do it with a tool?
    |
    +-- YES --> USE THE TOOL
    |
    +-- NO --> Search for a tool (ToolSearch)
                |
                +-- Found one --> USE IT
                |
                +-- None exists --> THEN ask user
```

---

## Things You Should NEVER Ask User To Do

| Task | Use This Instead |
|------|------------------|
| Run SQL in Supabase | `mcp__supabase__execute_sql` or `mcp__supabase__apply_migration` |
| Generate types | `npx supabase gen types ...` via Bash |
| Read a file | Read tool |
| Run a command | Bash tool |
| Search for files | Glob tool |

---

## Pre-Action Checklist

Before telling user to do something:

- [ ] Can the Supabase MCP do this?
- [ ] Can the Bash tool do this?
- [ ] Can any other available tool do this?
- [ ] Did I search ToolSearch for relevant tools?

If ALL are "no", THEN you may ask the user.
