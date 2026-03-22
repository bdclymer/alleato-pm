# Frontend Architecture — Alleato-PM

> Generated: 2026-03-22 | Next.js 15.5.12 / React 19 / TypeScript

---

## Architectural Principles

1. **Server Components by default** — Add `'use client'` only for interactivity
2. **Layered data access** — `app/` pages → `hooks/` (React Query) → `lib/supabase/` → Supabase
3. **Design system enforced** — ESLint errors block builds on design violations
4. **Typed from the database** — `database.types.ts` (20,790 lines) is the source of truth
5. **Proxy handles auth** — Every request passes through `proxy.ts` for session refresh

---

## Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Browser / Client                          │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP
┌───────────────────────────▼─────────────────────────────────┐
│              proxy.ts (Supabase session refresh)            │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                   app/ (Next.js App Router)                  │
│  ├── (admin)/   Admin pages                                 │
│  ├── (auth)/    Authentication                              │
│  ├── (chat)/    AI chat pages                               │
│  ├── (main)/    Main app + [projectId]/* tool pages         │
│  └── api/       Route handlers (150+ endpoints)             │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│          components/ (React component library)              │
│  ├── ui/       shadcn/ui primitives (55+)                  │
│  ├── ds/       Design system components (8)                 │
│  ├── layout/   Page structure                               │
│  ├── tables/   Data table infrastructure                    │
│  └── domain/   Feature-specific components                  │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│          hooks/ (React Query data layer ~80 hooks)          │
│  use-{resource}.ts → wraps Supabase calls with caching      │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│          services/ (Business logic layer, 14 files)         │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│    lib/supabase/ (Data access — createClient client/server) │
│    lib/ai/ (AI orchestration, tools, system prompt)         │
└───────────────────────────┬─────────────────────────────────┘
                            │
                      Supabase / External APIs
```

---

## Routing Structure

### Route Groups (App Router)

| Route Group | Path | Description |
|-------------|------|-------------|
| `(admin)` | `/design-system`, `/style-guide`, etc. | Admin-only internal tools |
| `(auth)` | `/login`, `/signup` | Public auth pages |
| `(chat)` | `/ai-assistant`, `/rag`, etc. | AI chat interfaces |
| `(main)` | `/`, `/[projectId]/*`, `/directory/*` | Main app (requires auth) |
| `(other)` | `/access-denied` | Miscellaneous |

### Project-Scoped Routes

All project tool pages live under `/[projectId]/`:

```
/[projectId]/home          → Project dashboard
/[projectId]/budget        → Budget management (SOV)
/[projectId]/prime-contracts → Prime contracts
/[projectId]/commitments   → Subcontracts + POs
/[projectId]/change-events → Change events
/[projectId]/direct-costs  → Direct cost records
/[projectId]/invoicing     → Owner invoicing
/[projectId]/drawings      → Drawing management
/[projectId]/specifications → Specification sections
/[projectId]/submittals    → Submittals
/[projectId]/rfis          → RFIs
/[projectId]/schedule      → Schedule tasks
/[projectId]/punch-list    → Punch items
/[projectId]/meetings      → Meeting records
/[projectId]/reporting     → 360 reporting
/[projectId]/documents     → Document center
/[projectId]/directory     → Project directory
```

### API Routes

~150+ route files across 30+ domains. See `docs/api-contracts-frontend.md` for full reference.

**Naming convention:** `[projectId]`, `[companyId]`, `[contractId]` (never generic `[id]`)

---

## Data Access Patterns

### React Query (Server State)

```typescript
// Hook pattern (hooks/use-{resource}.ts)
export function useBudgetData(projectId: number) {
  return useQuery({
    queryKey: ['budget', projectId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('budget_lines')
        .select('*')
        .eq('project_id', projectId);
      if (error) throw error;
      return data;
    }
  });
}
```

```typescript
// Mutation pattern
export function useCreateBudgetLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await fetch(`/api/projects/${projectId}/budget/line-items`, {
        method: 'POST', body: JSON.stringify(payload)
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budget', projectId] })
  });
}
```

### Supabase Direct (Server Components / API Routes)

```typescript
// API route (server-side)
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request, { params }: { params: { projectId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.projectId)
    .single();

  return Response.json(data);
}
```

---

## State Management

### React Query (Primary — Server State)
Caches all Supabase data. Provides stale-while-revalidate, optimistic updates, background refetching.

### Zustand (Secondary — Client State)
One store: `financial-store.ts` manages UI state for financial tool pages (active filters, selected rows, grouping).

```typescript
import { useStore } from "@/hooks/use-store";
const { filters, setFilters } = useStore();
```

### URL State
Filters, active tabs, and pagination are stored in URL search params where possible (bookmarkable state).

---

## AI Architecture (Frontend)

### Vercel AI SDK v6 Integration

```typescript
// Route handler (app/api/ai-assistant/chat/route.ts)
import { streamText } from 'ai';
import { createGateway } from '@ai-sdk/gateway';

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    model: 'openai/gpt-5.4',  // Routes through AI Gateway
    system: ragSystemPrompt,
    messages: convertToModelMessages(messages),
    tools: { ... }
  });
  return result.toUIMessageStreamResponse();
}
```

```typescript
// Chat UI (Client Component)
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

const { messages, sendMessage, status } = useChat({
  transport: new DefaultChatTransport({ api: '/api/ai-assistant/chat' })
});
```

### AI Context Sources (Orchestrator)
`lib/ai/orchestrator.ts` routes queries to:
- `match_meeting_chunks_with_project` — Meeting transcript RAG
- `match_documents` — Document content RAG
- `full_text_search_meetings` — Meeting full-text search
- `match_crawled_pages` — Procore docs RAG
- `match_memories` — AI memory retrieval
- `get_project_matching_context` — Project-specific context

### AI Tools (Frontend)
Located in `lib/ai/tools/`:
- Financial data queries
- Acumatica ERP queries
- Meeting insights
- Document lookup
- Web search (Tavily)

---

## Security Architecture (Frontend)

### Middleware (`proxy.ts`)
Runs on every request. Calls `updateSession()` to refresh Supabase JWT. Excludes:
- `/_next/*` — Next.js static files
- `/images/*`, `/favicon.ico` — Static assets

### Permission System
1. **Database RLS** — Enforced at Postgres level (cannot be bypassed)
2. **API route checks** — `supabase.auth.getUser()` per request
3. **Client guards** — `PermissionGuard`, `ProjectAccessGuard` components hide UI

### Security Headers (next.config.ts)
- `Strict-Transport-Security` (HSTS)
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`

---

## Design System Enforcement

Three ESLint rules **fail the build** on violations:

| Rule | Violation | Example |
|------|-----------|---------|
| `no-hardcoded-colors` | Raw color classes | `bg-gray-200`, `text-gray-600` |
| `no-arbitrary-spacing` | Arbitrary CSS | `p-[10px]`, `gap-[14px]` |
| `require-semantic-colors` | Non-token colors | `bg-blue-500` (use `bg-primary`) |

**Allowed shadows:** `shadow-xs`, `shadow-sm` only.

---

## Performance Patterns

| Pattern | Implementation |
|---------|---------------|
| Virtual scrolling | TanStack Virtual for large tables/lists |
| Image optimization | `next/image` (auto WebP + responsive) |
| Font optimization | `next/font` (zero layout shift) |
| Code splitting | Automatic via Next.js App Router |
| Lazy loading | `React.lazy()` + Suspense for heavy components |
| Query caching | React Query stale-while-revalidate (5 min default) |
| Memo | `useMemo`, `useCallback` for expensive computations |
| Streaming | `streamText` + Suspense boundaries for AI responses |
