# BASH EXECUTION RULES

## Working Directory Awareness

### Rule 1: Check pwd FIRST

Before running any command that depends on relative paths:

```bash
pwd
```
### Rule 2: Use Absolute Paths
ALWAYS prefer absolute paths over relative paths:

**WRONG:**
```bash
npx supabase gen types ... > src/types/database.types.ts
```
**CORRECT:**

```bash
npx supabase gen types ... > /Users/meganharrison/Documents/github/alleato-procore/frontend/src/types/database.types.ts
```
### Rule 3: Don't Use `cd` in Command Chains (zsh issue)
This DOES NOT WORK reliably:
```bash
cd frontend && npm run something  # FAILS in zsh
```

Instead, use absolute paths or run from correct directory:

```bash
npm run something --prefix /path/to/frontend
# OR verify pwd first, then run command separately
```
---

## String Escaping

### Rule 4: Use Single Quotes for node -e
Double quotes with special characters cause escaping nightmares:

**WRONG:**
```bash
node -e "console.log('Key exists:', !!process.env.VAR)"  # !! gets interpreted
```
**CORRECT:**

```bash
node -e 'console.log("Key exists:", !!process.env.VAR)'  # Single quotes outer
```
### Rule 5: Heredocs for Multi-line SQL/Scripts
Don't try to escape multi-line strings. Use heredocs:

```bash
cat << 'EOF' | psql
SELECT * FROM table;
EOF
```

---

## Environment Variables

### Rule 6: Source env files properly

**WRONG:**

```bash
source .env.local && node script.js  # May not work
```
**CORRECT:**
```bash
export $(cat .env.local | grep -v '^#' | xargs) && node script.js
```

But verify the path to .env.local is correct first!

---

## Common Failures (From Incident 2026-01-28)

| Command | Why It Failed | Fix |
|---------|--------------|-----|
| `cd frontend && ...` | zsh doesn't chain like bash | Use absolute paths |
| `> src/types/...` | Relative path from wrong dir | Use absolute path |
| `node -e "...!!"` | `!!` is history expansion | Use single quotes |
| `source .env.local` | Wrong relative path | Check pwd first |

---

## Pre-Flight Checklist

Before running bash commands:

- [ ] Checked current working directory with `pwd`
- [ ] Using absolute paths for file operations
- [ ] Not using `cd` in command chains
- [ ] Using single quotes for node -e with special chars
- [ ] Environment file path is correct
