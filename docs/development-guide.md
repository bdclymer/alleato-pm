# Alleato-Procore Development Guide

## Prerequisites
- Node.js 20+, npm 9+
- Python 3.11+
- Supabase CLI (for type generation)
- Docker (for backend)
- Git

## Getting Started

### Initial Setup
```bash
git clone <repo-url>
cd alleato-procore
npm install                    # Root dependencies

# Frontend
cd frontend && npm install
cd ..

# Backend
cd backend && pip install -r requirements.txt
cd ..
```

### Environment Variables
Frontend requires `.env.local` in `frontend/`:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

Backend requires `.env` at project root:
- SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY
- OPENAI_API_KEY
- PROCORE_USER, PROCORE_PASSWORD (for crawlers/tests)

## Development Commands

### Running Locally
```bash
npm run dev                    # Frontend + Backend concurrently
npm run dev:frontend           # Frontend only (localhost:3000)
npm run dev:backend            # Backend only
```

### Build & Quality
```bash
npm run build                  # Production build
npm run quality                # TypeScript check + ESLint
npm run quality:fix            # Auto-fix lint issues
```

### Database
```bash
npm run db:types               # Regenerate Supabase types (MANDATORY before DB work)
npm run db:generate            # Generate Drizzle migrations
npm run db:migrate             # Run migrations
npm run db:push                # Push schema changes
npm run db:studio              # Open Drizzle Studio
npm run seed:db                # Seed database
npm run seed:financial         # Seed financial data
```

### Testing
```bash
# E2E (Playwright) - from frontend/
npm run test                   # Headless
npm run test:headed            # With browser
npm run test:ui                # Playwright UI mode (best for debugging)
npm run test:report            # View report

# Unit (Jest) - from frontend/
npm run test:unit
npm run test:unit:watch
npm run test:unit:coverage

# Single test file
npx playwright test tests/e2e/specific-test.spec.ts --headed
```

Auth is AUTOMATIC - saved in tests/.auth/user.json. Never manually log in.

## Mandatory Gates (from CLAUDE.md)

### 1. Supabase Types Gate
Before ANY database code: run `npm run db:types`, read database.types.ts, verify tables/columns exist, verify FK types match PK types (projects.id is INTEGER, not UUID!)

### 2. Route Naming Gate
Use [projectId], [companyId], [contractId], [userId], [recordId] - NEVER generic [id]. Run `npm run check:routes` after creating routes.

### 3. Next.js Cache Gate
Before debugging ANY 404: `cd frontend && rm -rf .next && pkill -f "next dev" && npm run dev`

### 4. Root Cause Gate
Before modifying code: gather runtime evidence, state root cause with evidence, THEN fix.

### 5. Page Header Gate
All project pages MUST use ProjectPageHeader + PageContainer from @/components/layout

### 6. Authentication Gate
Never ask for manual login. Credentials in .env. Playwright uses saved auth state.

## Scaffolding System
```bash
/create-feature <EntityName>               # Full CRUD with all gates enforced
/create-feature Entity --fields 'f1:type'  # Custom fields
/api-endpoint GET contracts export-csv     # Add endpoint to existing entity
/supabase-migration add column X to Y      # Schema change only
```

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

## CI/CD Pipeline
- **ci.yml**: Quality (lint+typecheck) -> Unit Tests -> Build (on PRs and main)
- **deploy-frontend.yml**: Vercel preview on PR, production on main
- **deploy-backend.yml**: Backend tests -> Render deploy on main
- **e2e.yml**: Smoke on PR, full suite on main + nightly
- 10 total GitHub Actions workflows

## Deployment
- Frontend: Vercel (automatic from GitHub)
- Backend: Render (Docker container, port 8000)
- Database: Supabase hosted
- CORS configured in render.yaml

## Common Pitfalls
1. Never install @supabase/auth-helpers-nextjs (deprecated, use @supabase/ssr)
2. Always clear .next cache when creating new routes
3. FK types must match PK types (projects.id = INTEGER)
4. Don't use generic [id] in dynamic routes
5. Run db:types before any database work
6. Use /create-feature instead of writing CRUD from scratch

_Generated using BMAD Method document-project workflow_
