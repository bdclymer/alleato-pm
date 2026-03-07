# Alleato Project Manager - Developer Manual

**Version:** 1.0.0
**Last Updated:** December 2024

This manual provides comprehensive guidance for developers joining the Alleato Project Manager team. It covers the system architecture, development workflows, coding standards, and key concepts that every contributor needs to understand.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Getting Started](#getting-started)
5. [Development Workflow](#development-workflow)
6. [Architecture Deep Dive](#architecture-deep-dive)
7. [Key Concepts](#key-concepts)
8. [Code Quality Standards](#code-quality-standards)
9. [Testing Strategy](#testing-strategy)
10. [Common Development Tasks](#common-development-tasks)
11. [Troubleshooting](#troubleshooting)

---

## Project Overview

### What is Alleato?

Alleato is a **construction project management system** inspired by and designed to complement Procore's functionality. It provides construction companies with tools to manage:

- **Projects** - Track all aspects of construction projects from inception to completion
- **Financial Management** - Budgets, contracts, change orders, invoices, and commitments
- **Document Management** - Store and organize project documents, drawings, specifications
- **Team Collaboration** - Team chat, task management, daily logs
- **AI-Powered Insights** - Meeting transcription analysis, document intelligence

### Business Context

Construction project management involves complex financial tracking and document workflows. The system mirrors Procore's data model closely, making it familiar to users who have worked with Procore while adding AI-enhanced capabilities.

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.5.9 | React framework with App Router |
| React | 19.0.0 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.4.17 | Utility-first styling |
| ShadCN UI | - | Component library (Radix-based) |
| React Query | 5.90.11 | Server state management |
| Zustand | 5.0.9 | Client state management |
| React Hook Form | 7.67.0 | Form handling |
| Zod | 4.1.13 | Schema validation |

### Backend & Database

| Technology | Purpose |
|------------|---------|
| Supabase | PostgreSQL database, authentication, storage, real-time |
| OpenAI | AI chat integration via ChatKit |
| Python (FastAPI) | Backend services (port 8000) |

### Testing

| Tool | Purpose |
|------|---------|
| Playwright | E2E testing |
| Jest | Unit testing |
| Testing Library | Component testing |

---

## Project Structure

```text
alleato-pm/
├── frontend/                    # Next.js application
│   ├── src/
│   │   ├── app/                # App Router pages and API routes
│   │   │   ├── [projectId]/    # Dynamic project-specific routes
│   │   │   ├── api/            # API route handlers
│   │   │   ├── auth/           # Authentication pages
│   │   │   └── ...
│   │   ├── components/         # React components (by domain)
│   │   │   ├── ui/             # ShadCN base components
│   │   │   ├── layout/         # Layout components
│   │   │   ├── forms/          # Reusable form fields
│   │   │   ├── budget/         # Budget feature components
│   │   │   ├── chat/           # Chat/AI components
│   │   │   ├── domain/         # Domain-specific components
│   │   │   └── ...
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Utilities and services
│   │   │   ├── supabase/       # Supabase client configurations
│   │   │   └── stores/         # Zustand stores
│   │   ├── types/              # TypeScript type definitions
│   │   │   └── database.types.ts  # Auto-generated Supabase types
│   │   └── contexts/           # React Context providers
│   ├── tests/                  # All test files
│   │   ├── e2e/                # Playwright E2E tests
│   │   ├── visual-regression/  # Visual tests
│   │   └── screenshots/        # Test screenshots
│   └── public/                 # Static assets
├── backend/                    # Python backend services
│   ├── src/
│   │   ├── api/               # API endpoints
│   │   ├── services/          # Business logic
│   │   └── workers/           # Background jobs
│   └── tests/
├── supabase/                   # Database migrations
├── scripts/                    # Automation scripts
├── docs/                       # Documentation
│   └── development/           # Developer docs (you are here)
├── .agents/                    # AI agent configurations
└── .claude/                    # Claude Code plugins
```markdown
### Key Directories Explained

#### `/frontend/src/app/`

Uses Next.js 15 App Router. File-based routing where:

- `page.tsx` = route page
- `layout.tsx` = shared layout
- `route.ts` = API endpoint
- `[param]/` = dynamic route segment

#### `/frontend/src/components/`

Components organized by **domain** (feature area), not by type:

- `ui/` - Base ShadCN components (buttons, dialogs, etc.)
- `forms/` - Reusable form field components
- `budget/` - Budget feature components
- `domain/` - Sub-organized by domain (clients, contracts, etc.)

#### `/frontend/src/hooks/`

Custom hooks for data fetching and business logic:

- `use-projects.ts` - Fetch projects
- `use-clients.ts` - Fetch clients
- `use-companies.ts` - Fetch companies
- etc.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase project access (credentials)
- OpenAI API key (for AI features)

### Initial Setup

```bash
# 1. Clone the repository
git clone [repository-url]
cd alleato-pm

# 2. Install frontend dependencies
cd frontend
npm install

# 3. Set up environment variables
# Copy .env.example to .env.local and fill in values:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - OPENAI_API_KEY

# 4. Generate Supabase types
npm run db:types

# 5. Start development server
npm run dev
# Frontend available at http://localhost:3000
```markdown
### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side) | Yes |
| `OPENAI_API_KEY` | OpenAI API key | For AI features |
| `BACKEND_URL` | Python backend URL | For backend features |

---

## Development Workflow

### Branch Strategy

We use feature branches with the following naming convention:
```

claude/feature-name-XXXXX

```markdown
### Making Changes

1. **Create a feature branch** from `main`
2. **Make changes** following our coding standards
3. **Run quality checks** before committing:
   ```bash
   npm run quality --prefix frontend
   ```

1. **Commit** with descriptive messages
2. **Push** and create a Pull Request

### Code Quality Gates

**Pre-commit hooks** automatically run:

- ESLint on staged files
- Auto-formatting

**Pre-push hooks** run:

- Full TypeScript check
- Full ESLint check

If any check fails, the commit/push is blocked.

### Quick Commands

```bash
# Development
npm run dev                    # Start dev server

# Code Quality
npm run lint                   # Run ESLint
npm run lint:fix              # Fix ESLint issues
npm run typecheck             # TypeScript check
npm run quality               # Both lint + typecheck
npm run quality:fix           # Both + auto-fix

# Database
npm run db:types              # Regenerate Supabase types

# Testing
npm run test                  # Run Playwright tests
npm run test:unit             # Run Jest tests
npm run test:ui               # Playwright UI mode
```diff
---

## Architecture Deep Dive

### Data Flow

```text
┌──────────────────────────────────────────────────────────────┐
│                         BROWSER                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │   React Components + React Query                        │ │
│  │   (Client-side rendering with server state caching)     │ │
│  └─────────────────────────────────────────────────────────┘ │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                     NEXT.JS SERVER                            │
│  ┌─────────────┐   ┌─────────────┐   ┌────────────────────┐ │
│  │ API Routes  │   │ Server      │   │ Server Actions     │ │
│  │ /api/*      │   │ Components  │   │ (form submissions) │ │
│  └─────────────┘   └─────────────┘   └────────────────────┘ │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                        SUPABASE                               │
│  ┌───────────┐   ┌────────────┐   ┌─────────────────────┐   │
│  │ PostgreSQL│   │    Auth    │   │      Storage        │   │
│  │  (RLS)    │   │            │   │  (files/images)     │   │
│  └───────────┘   └────────────┘   └─────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### Supabase Client Types

We have **three** Supabase client types for different use cases:

| Client | File | Use Case |
|--------|------|----------|
| **Browser** | `lib/supabase/client.ts` | Client-side components |
| **Server** | `lib/supabase/server.ts` | Server components, API routes |
| **Service** | `lib/supabase/service.ts` | Bypass RLS (admin operations) |

```typescript
// Client component
import { createClient } from '@/lib/supabase/client'

// Server component or API route
import { createClient } from '@/lib/supabase/server'

// Admin operations (use sparingly!)
import { createServiceClient } from '@/lib/supabase/service'
```markdown
### State Management

| Type | Technology | Use Case |
|------|------------|----------|
| Server State | React Query | Data from Supabase (projects, clients, etc.) |
| Client State | Zustand | UI state, local preferences |
| Form State | React Hook Form | Form inputs and validation |
| URL State | Next.js params | Route-based state (projectId, filters) |

---

## Key Concepts

### Project Context

Every project-related page uses a **dynamic route** with `projectId`:

```text
/[projectId]/budget
/[projectId]/contracts
/[projectId]/change-orders

```bash
The `projectId` is extracted from the URL and used to scope all data fetching.

### Financial Data Model

The core financial entities follow Procore's model:

```

Project
  ├── Budget (budget_items, budget_codes)
  │     └── Budget Modifications
  ├── Contracts (prime contracts with clients)
  │     └── Change Orders
  │           └── Change Order Line Items
  ├── Commitments (subcontracts)
  │     └── Commitment Changes
  ├── Direct Costs
  └── Invoices

```typescript
See [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md) for detailed schema documentation.

### Component Patterns

#### Form Components
Use our reusable form field components from `/components/forms/`:

```tsx
import { TextField, SelectField, MoneyField } from '@/components/forms'

<TextField name="title" label="Title" />
<MoneyField name="amount" label="Amount" />
<SelectField name="status" label="Status" options={statusOptions} />
```typescript
#### Data Tables

Use `@tanstack/react-table` via our wrapper components:

```tsx
import { DataTable } from '@/components/table-page/GenericDataTable'
```typescript
---

## Code Quality Standards

### TypeScript Rules

- **No `any` type** - Use `unknown` instead
- **No `@ts-ignore`** - Fix the type issue properly
- **Strict null checks** - Handle null/undefined cases

### ESLint Rules

- **No `console.log`** - Use `console.warn` or `console.error`
- **React hooks rules** - Follow the rules of hooks
- **No unused variables** - Prefix with `_` if intentionally unused
- **Prefer const** - Use `const` over `let` when possible

### File Naming

- **Components**: PascalCase (`BudgetTable.tsx`)
- **Hooks**: camelCase with `use` prefix (`use-projects.ts`)
- **Utilities**: kebab-case (`format-currency.ts`)
- **Types**: PascalCase (`ProjectTypes.ts`)

### Import Organization

```typescript
// 1. React/Next imports
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 2. External libraries
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

// 3. Internal absolute imports
import { Button } from '@/components/ui/button'
import { useProjects } from '@/hooks/use-projects'

// 4. Relative imports
import { LocalComponent } from './LocalComponent'

// 5. Types (type-only imports)
import type { Project } from '@/types/portfolio'
```

---

## Testing Strategy

### Test Types

| Type | Tool | Location | Purpose |
|------|------|----------|---------|
| E2E | Playwright | `tests/e2e/` | User flow testing |
| Visual | Playwright | `tests/visual-regression/` | Screenshot comparison |
| Unit | Jest | `__tests__/` | Function/logic testing |
| Component | Testing Library | `__tests__/` | Component testing |

### Running Tests

```bash
# E2E tests
npm run test                    # All Playwright tests
npm run test:ui                # With UI mode
npm run test:headed            # With visible browser

# Unit tests
npm run test:unit              # All Jest tests
npm run test:unit:watch        # Watch mode
npm run test:unit:coverage     # With coverage report
```javascript
### Writing E2E Tests

```typescript
// tests/e2e/example.spec.ts
import { test, expect } from '@playwright/test'

test('can create a new project', async ({ page }) => {
  await page.goto('/')
  await page.click('text=New Project')
  await page.fill('[name="name"]', 'Test Project')
  await page.click('text=Save')
  await expect(page.locator('text=Test Project')).toBeVisible()
})
```typescript
---

## Common Development Tasks

### Adding a New Page

1. Create file at `src/app/[route]/page.tsx`
2. Export a default component
3. Add to navigation if needed

```tsx
// src/app/example/page.tsx
export default function ExamplePage() {
  return <div>New Page</div>
}
```typescript
### Adding a New API Endpoint

1. Create file at `src/app/api/[route]/route.ts`
2. Export HTTP method handlers (GET, POST, PUT, DELETE)

```typescript
// src/app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('example')
    .select('*')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
```

### Adding a Custom Hook

```typescript
// src/hooks/use-example.ts
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useExample(id: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['example', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('example')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    },
  })
}
```markdown
### Updating Database Types

After any database schema change:

```bash
npm run db:types --prefix frontend
```diff
This regenerates `src/types/database.types.ts` from the live Supabase schema.

---

## Troubleshooting

### Common Issues

#### "Type errors after pulling latest changes"

```bash
npm run db:types --prefix frontend
npm run typecheck --prefix frontend
```markdown
#### "ESLint errors blocking commit"
```bash
npm run lint:fix --prefix frontend
```

#### "Module not found" errors

```bash
npm install --prefix frontend
```

#### "Supabase connection errors"

- Check `.env.local` has correct values
- Verify Supabase project is running
- Check network connectivity

### Getting Help

1. Check this documentation
2. Search existing issues on GitHub
3. Ask in team chat
4. Create a GitHub issue with:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages/screenshots

---

## Next Steps

After reading this manual:

1. Review [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md) to understand the data model
2. Review [TEAM_ONBOARDING.md](./TEAM_ONBOARDING.md) for team structure and task assignment
3. Set up your local development environment
4. Pick a small task to get familiar with the codebase
5. Ask questions early - we're here to help!

---

*This is a living document. Please update it as you discover new patterns or solutions.*
