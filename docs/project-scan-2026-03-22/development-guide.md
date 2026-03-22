# Development Guide — Alleato-PM

> Generated: 2026-03-22 | Source: CLAUDE.md, package.json, playwright.config.ts

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 18+ | Required by Next.js |
| Python | 3.11+ | Required by FastAPI backend |
| pnpm | 10.13.1 | Package manager (two lockfiles: root + frontend/) |
| Supabase CLI | latest | For migrations and type generation |

---

## Initial Setup

```bash
# 1. Clone repo
git clone https://github.com/MeganHarrison/alleato-pm.git
cd alleato-pm

# 2. Install all dependencies
npm run install:all       # Installs root + frontend node_modules

# 3. Set up environment variables
cp .env.example .env      # Fill in required secrets
# Required: SUPABASE_URL, SUPABASE_ANON_KEY, OPENAI_API_KEY (or AI_GATEWAY_API_KEY),
#           ACCOUNTING_USER, ACCOUNTING_PASSWORD, PROCORE_USER, PROCORE_PASSWORD

# 4. Generate Supabase types (MANDATORY before any database work)
npm run db:types

# 5. Set up Python backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..
```

---

## Running the Application

```bash
# Full stack (frontend + backend concurrently)
npm run dev

# Frontend only (Next.js on port 3000)
npm run dev:frontend

# Backend only (FastAPI on port 8051)
npm run dev:backend
```

**Frontend:** `http://localhost:3000`
**Backend API:** `http://localhost:8051`
**Backend proxied through frontend:** `http://localhost:3000/rag-chatkit/*`

---

## Common Development Tasks

### Supabase Types (MANDATORY before database work)

```bash
# Regenerate types after any schema change
npm run db:types
# Outputs to: frontend/src/types/database.types.ts
```

**Always read the generated types before writing any database code.** Never assume table names or column types.

### Database Migrations

```bash
# Push a new migration
supabase db push && npm run db:types

# Or use the root script
npm run db:push
```

### Route Conflict Check

After creating new API routes:
```bash
npm run check:routes
```

Routes MUST use specific parameter names (`[projectId]`, `[companyId]`, etc.). Never use generic `[id]`.

### Clearing Next.js Cache

Before debugging any 404 or routing issue:
```bash
cd frontend && rm -rf .next && pkill -f "next dev" && npm run dev > /tmp/nextjs-dev.log 2>&1 &
sleep 10
tail -20 /tmp/nextjs-dev.log
```

### Scaffolding New Features

```bash
# Generate full CRUD feature (enforces all gates)
/create-feature <EntityName>

# With custom fields
/create-feature DrawingArea --fields 'name:text,area_number:text,status:text'
```

---

## Testing

### Playwright E2E Tests

Authentication is pre-saved in `frontend/tests/.auth/user.json`. No manual login needed.

```bash
cd frontend

# Run all tests (headless)
npm run test

# Run with browser visible
npm run test:headed

# Open Playwright UI (best for debugging)
npm run test:ui

# Run specific test file
npx playwright test tests/e2e/budget-line-item-validation.spec.ts --headed

# Re-authenticate if session expires
npx playwright test tests/auth.setup.ts
```

**Test credentials:** `test1@mail.com` / `test12026!!!` (from `.env` `TEST_USER_1`/`TEST_PASSWORD_1`)
**Test project:** Project ID 67 (Vermillion Rise Warehouse)
**Config:** `frontend/config/playwright/playwright.config.ts`
**Dev server port:** 3002 (separate from dev port 3000)

### Unit Tests (Jest)

```bash
cd frontend
npm run test:unit
npm run test:unit:watch
npm run test:unit:coverage
```

### Backend Tests (pytest)

```bash
cd backend
pytest
pytest --cov --cov-report=html
```

---

## Code Quality

```bash
# From frontend directory
npm run lint             # ESLint
npm run typecheck        # TypeScript type checking

# From root (runs both)
npm run quality          # typecheck + lint
npm run quality:fix      # typecheck + lint with auto-fix
```

**Pre-commit hooks** (Husky + lint-staged):
- TypeScript check
- ESLint (fails on design system violations)

**ESLint design system rules (hard errors):**
- `design-system/no-hardcoded-colors` — No hex codes or bare color classes
- `design-system/no-arbitrary-spacing` — No `p-[10px]` style values
- `design-system/require-semantic-colors` — Must use token-based colors

---

## Environment Variables

Key variables required in `.env` (project root):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI (via AI Gateway BYOK or direct)
AI_GATEWAY_API_KEY=          # AI Gateway with BYOK mode
OPENAI_API_KEY=              # Fallback if gateway key not set

# ERP Integration
ACCOUNTING_USER=             # Acumatica username
ACCOUNTING_PASSWORD=         # Acumatica password

# Procore (for crawlers/scripts)
PROCORE_USER=bclymer@alleatogroup.com
PROCORE_PASSWORD=Clymer926!

# Test credentials
TEST_USER_1=test1@mail.com
TEST_PASSWORD_1=test12026!!!

# Liveblocks
LIVEBLOCKS_SECRET_KEY=
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=

# Email
RESEND_API_KEY=

# File storage
BLOB_READ_WRITE_TOKEN=       # Vercel Blob
```

---

## Database Seeding

```bash
npm run seed:db               # Full database seed
npm run seed:db:dry           # Dry run (no changes)
npm run seed:db:reset         # Reset and reseed
npm run seed:financial        # Seed financial data only
npm run seed:project          # Seed project financial data
```

---

## Design System Rules

Before building any UI:

1. Read `frontend/src/design-system/CLAUDE_CODE_UI_GUIDE.md` — exact Tailwind classes
2. Read `frontend/src/design-system/tokens.md` — allowed colors, spacing, shadows
3. Import from `@/components/ui/` (base primitives) or `@/components/ds/` (design system)

**Forbidden:**
- Hardcoded colors (`bg-gray-200`, `#hex`, `text-gray-600`)
- Arbitrary spacing (`p-[10px]`, `gap-[14px]`)
- Heavy shadows (`shadow-md`, `shadow-lg`, `shadow-xl`)
- Generic `[id]` route parameters

---

## MANDATORY GATES (Summary)

See `CLAUDE.md` and `.claude/PREVENTION-CHECKLIST.md` for full rules. Top 5:

1. **Run `npm run db:types`** before any database code
2. **Use specific route parameters** (`[projectId]` not `[id]`)
3. **Clear `.next` cache** before debugging 404s
4. **Gather evidence first** before modifying code for bug fixes
5. **Use `/create-feature`** instead of writing CRUD from scratch

---

## Useful Scripts

```bash
# RAG verification
npm run rag:verify:financial
npm run rag:verify:risk-routing

# Cache management
npm run cache:stats
npm run cache:recent

# Playwright dashboard
npm run dashboard:playwright

# Procore docs crawler
node scripts/crawl-procore-support-docs.mjs
```
