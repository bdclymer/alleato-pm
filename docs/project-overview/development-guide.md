# Alleato-Procore Development Guide

## Prerequisites
- Node.js 20+, npm 9+
- Python 3.11+
- Supabase CLI
- Git

## Getting Started

### Initial Setup
```bash
git clone <repo-url>
cd alleato-pm
npm run install:all
```

### Environment Variables
Frontend requires `.env.local` in `frontend/`:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

Backend configuration depends on the local backend startup path. Use the variables expected by `backend/start.sh` and the backend service configuration before running `npm run dev:backend`.

## Development Commands

### Running Locally
```bash
npm run dev                    # Frontend + Backend concurrently
npm run dev:frontend           # Frontend only (localhost:3000)
npm run dev:backend            # Backend only
```

### Build & Quality
```bash
npm run build                  # Frontend production build
cd frontend && npm run quality
cd frontend && npm run quality:fix
```

### Database
```bash
npm run db:types               # Regenerate Supabase types (MANDATORY before DB work)
npm run db:push                # Push schema changes
npm run seed:db                # Seed database
npm run seed:financial         # Seed financial data
```

### Testing
```bash
# Preferred interactive verification
npm run verify:browser

# Repo-level tests
npm run test
npm run test:backend

# Frontend tests
cd frontend && npm run test
cd frontend && npm run test:headed
cd frontend && npm run test:ui
cd frontend && npm run test:unit
cd frontend && npm run test:unit:coverage

# Single test file
cd frontend && npx playwright test tests/e2e/specific-test.spec.ts --config=config/playwright/playwright.config.ts --headed
```

Auth is AUTOMATIC - saved in tests/.auth/user.json. Never manually log in.

## Mandatory Gates (from CLAUDE.md)

### 1. Supabase Types Gate
Before ANY database code: run `npm run db:types`, read database.types.ts, verify tables/columns exist, verify FK types match PK types (projects.id is INTEGER, not UUID!)

### 2. Route Naming Gate
Use [projectId], [companyId], [contractId], [userId], [recordId] - NEVER generic [id]. Run `npm run check:routes` after creating routes.

### 3. Next.js Cache Gate
Before debugging any 404 or routing issue on new files:

```bash
cd frontend
rm -rf .next
pkill -f "next dev"
npm run dev > /tmp/nextjs-dev.log 2>&1 &
sleep 10
tail -20 /tmp/nextjs-dev.log
```

### 4. Root Cause Gate
Before modifying code: gather runtime evidence, state root cause with evidence, THEN fix.

### 5. Page Header Gate
All project pages MUST use ProjectPageHeader + PageContainer from @/components/layout

### 6. Authentication Gate
Never ask for manual login. Credentials in .env. Playwright uses saved auth state.

## Architecture Patterns

### Data Flow
User Action -> React Component -> Hook (use-*.ts) -> Supabase Query -> React Query Cache -> UI Update

### Provider Stack (root layout)
QueryProvider -> ThemeProvider -> ProjectProvider -> FavoritesProvider -> HeaderProvider

### File Locations
| Type | Location |
|------|----------|
| Pages | frontend/src/app/(main)/[projectId]/<tool>/page.tsx |
| API Routes | frontend/src/app/api/projects/[projectId]/<resource>/route.ts |
| Hooks | frontend/src/hooks/use-<entity>.ts |
| Services | frontend/src/services/<Entity>Service.ts |
| Components | frontend/src/components/<domain>/<Component>.tsx |
| Schemas | frontend/src/lib/schemas/<entity>.ts |
| Migrations | supabase/migrations/<timestamp>_<desc>.sql |
| Tests | frontend/tests/e2e/<feature>.spec.ts |

### Component Patterns
- Use shadcn/ui primitives from @/components/ui/
- Domain components in @/components/domain/
- Forms use React Hook Form + Zod
- Tables use DataTable components with responsive variants
- Project pages: ProjectPageHeader + PageContainer

## Deployment
- Frontend: Vercel (automatic from GitHub)
- Backend: Render (Docker container, port 8000)
- Database: Supabase hosted

## Common Pitfalls
1. Never install @supabase/auth-helpers-nextjs (deprecated, use @supabase/ssr)
2. Always clear .next cache when creating new routes
3. FK types must match PK types (projects.id = INTEGER)
4. Don't use generic [id] in dynamic routes
5. Run db:types before any database work
6. Prefer `npm run verify:browser` for evidence-based end-to-end verification

_Originally generated via BMAD and updated to match current repo commands and gates._
