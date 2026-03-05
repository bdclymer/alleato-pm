# TypeScript Types - Type Safety Strategy

**Purpose**: This document defines the TypeScript type generation, hierarchy, and conventions for Alleato OS.

**Status**: Type system established - ongoing refinements

**Related Plans**:

- [PLANS_DOC.md](./PLANS_DOC.md) - Master plan index
- [Schema Modeling](./plans-schema-modeling.md) - Database schema that generates types
- [Component System](./plans-component-system.md) - Component prop types

---

## Overview

Alleato OS uses a **single source of truth** approach for TypeScript types:

1. **Database types are auto-generated** from Supabase schema
2. **Application types are derived** from database types
3. **Form validation uses Zod schemas** with inferred types
4. **Component props use explicit interfaces**

### Type Safety Philosophy

1. **No `any` types**: Use `unknown` or proper inference
2. **Strict null checks**: All nullable values explicitly typed
3. **Generated types are read-only**: Never manually edit
4. **Type imports from central location**: `@/types`
5. **Compile-time safety**: Catch errors before runtime

---

## Type Hierarchy

```text
Supabase Database Schema (source of truth)
    ↓
Supabase CLI Type Generation
    ↓
frontend/src/types/database.ts (auto-generated, NEVER edit manually)
    ↓
frontend/src/types/index.ts (derived types, helpers, re-exports)
    ↓
Application code (import from @/types)
```yaml
---

## Type Generation

### Supabase Type Generation

**After any schema changes, regenerate types:**

```bash
# From frontend directory
npm run db:types

# Or directly with Supabase CLI (local)
npx supabase gen types typescript --local > src/types/database.ts

# For production (requires PROJECT_REF)
npx supabase gen types typescript --project-id "$PROJECT_REF" --schema public > src/types/database.ts
```yaml
### Auto-Generated Database Types

**File**: `frontend/src/types/database.ts`

**CRITICAL**: This file is auto-generated. NEVER edit it manually.

**Structure**:
```typescript
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          name: string
          client_id: string | null
          created_at: string
          // ... all columns
        }
        Insert: {
          id?: string
          name: string
          client_id?: string | null
          // ... required fields
        }
        Update: {
          id?: string
          name?: string
          // ... all fields optional
        }
      }
      // ... all other tables
    }
    Views: {
      budget_summary_view: {
        Row: {
          project_id: string
          cost_code_id: string
          budgeted_amount: number
          // ... all view columns
        }
      }
      // ... all other views
    }
    Functions: {
      // ... database functions
    }
    Enums: {
      contract_status: 'draft' | 'pending_approval' | 'approved' | 'executed' | 'closed'
      commitment_type: 'subcontract' | 'purchase_order'
      // ... all enum types
    }
  }
}
```

---

## Derived Application Types

**File**: `frontend/src/types/index.ts`

This file creates human-friendly types from database types:

```typescript
import { Database } from './database'

// Extract table row types
export type Project = Database['public']['Tables']['projects']['Row']
export type Contract = Database['public']['Tables']['contracts']['Row']
export type Commitment = Database['public']['Tables']['commitments']['Row']
export type ChangeOrder = Database['public']['Tables']['change_orders']['Row']
export type OwnerInvoice = Database['public']['Tables']['owner_invoices']['Row']
export type DailyLog = Database['public']['Tables']['daily_logs']['Row']

// Special case: Meetings stored in document_metadata
export type Meeting = Database['public']['Tables']['document_metadata']['Row'] & {
  type: 'meeting'
}

// Extract insert types (for forms)
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
export type ContractInsert = Database['public']['Tables']['contracts']['Insert']
export type CommitmentInsert = Database['public']['Tables']['commitments']['Insert']

// Extract update types (for edits)
export type ProjectUpdate = Database['public']['Tables']['projects']['Update']
export type ContractUpdate = Database['public']['Tables']['contracts']['Update']
export type CommitmentUpdate = Database['public']['Tables']['commitments']['Update']

// Extract enum types
export type ContractStatus = Database['public']['Enums']['contract_status']
export type CommitmentType = Database['public']['Enums']['commitment_type']
export type ChangeOrderStatus = Database['public']['Enums']['change_order_status']
export type InvoiceStatus = Database['public']['Enums']['invoice_status']

// Badge variant type (for UI components)
export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'

// Helper function: Map status to badge variant
export function getStatusBadgeVariant(status: string): BadgeVariant {
  switch (status.toLowerCase()) {
    case 'approved':
    case 'executed':
    case 'paid':
    case 'complete':
      return 'success'
    case 'pending':
    case 'draft':
    case 'in_progress':
      return 'warning'
    case 'rejected':
    case 'cancelled':
    case 'overdue':
      return 'destructive'
    default:
      return 'default'
  }
}

// Re-export database types for convenience
export type { Database }
```yaml
---

## Key Table Mappings

### Meetings

**IMPORTANT**: Meeting data is stored in the `document_metadata` table, NOT a dedicated `meetings` table.

**Table**: `document_metadata`
**Filter**: `type='meeting'` or `source='fireflies'`

**Type**:
```typescript
import { Meeting } from '@/types'

// Meeting fields come from document_metadata table:
interface Meeting {
  id: string
  title: string
  summary: string
  participants: any[] // JSONB
  project_id: string
  date: string
  fireflies_link: string | null
  fireflies_id: string | null
  action_items: any[] | null // JSONB
  bullet_points: any[] | null // JSONB
  overview: string | null
  content: string | null // full transcript
  duration_minutes: number | null
  audio: string | null
  video: string | null
}
```yaml
### Other Critical Tables

| Application Type | Database Table | Key Fields |
| --- | --- | --- |
| `Project` | `projects` | id, name, client_id, status |
| `Commitment` | `commitments` | id, project_id, vendor_id, type |
| `ChangeOrder` | `change_orders` | id, project_id, status, approved_cost |
| `OwnerInvoice` | `owner_invoices` | id, contract_id, total_completed |
| `MeetingSegment` | `meeting_segments` | meeting_id, segment_text, embedding |
| `Document` | `documents` | id, project_id, file_path, metadata |

---

## Form Validation with Zod

### Zod Schema Definition

**File**: `frontend/src/lib/schemas/contracts.ts`

```typescript
import { z } from 'zod'

export const contractSchema = z.object({
  contract_number: z.string().min(1, 'Contract number is required'),
  contract_title: z.string().min(1, 'Title is required'),
  status: z.enum(['draft', 'pending_approval', 'approved', 'executed', 'closed']),
  contract_value: z.number().positive('Contract value must be positive'),
  executed_date: z.string().optional(),
  start_date: z.string().optional(),
  completion_date: z.string().optional(),
  retention_percentage: z.number().min(0).max(100).default(10),
  private: z.boolean().default(false)
})

// Infer TypeScript type from Zod schema
export type ContractFormData = z.infer<typeof contractSchema>
```yaml
### Using Zod with React Hook Form

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { contractSchema, ContractFormData } from '@/lib/schemas/contracts'

export function ContractForm() {
  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      contract_number: '',
      contract_title: '',
      status: 'draft',
      retention_percentage: 10,
      private: false
    }
  })

  async function onSubmit(data: ContractFormData) {
    // Data is fully type-safe and validated
    const contract = await createContract(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* form fields */}
      </form>
    </Form>
  )
}
```

---

## Component Prop Types

### Explicit Interfaces

**Pattern**: Define explicit interfaces for component props

```typescript
// ✅ Good - Explicit interface
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'destructive'
  size: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  children: React.ReactNode
}

export function Button({ variant, size = 'md', disabled, loading, onClick, children }: ButtonProps) {
  // ...
}

// ❌ Bad - No types
export function Button(props) {
  // ...
}

// ❌ Bad - Using `any`
export function Button(props: any) {
  // ...
}
```yaml
### Generic Components

```typescript
// DataTable with generic row type
interface DataTableProps<TData> {
  data: TData[]
  columns: ColumnDef<TData>[]
  onRowClick?: (row: TData) => void
}

export function DataTable<TData>({ data, columns, onRowClick }: DataTableProps<TData>) {
  // Fully type-safe table implementation
}

// Usage
<DataTable<Contract>
  data={contracts}
  columns={contractColumns}
  onRowClick={(contract) => console.log(contract.contract_number)}
/>
```yaml
---

## Type Import Conventions

### Import from Central Location

```typescript
// ✅ Good - Import from @/types
import { Project, Contract, Commitment } from '@/types'

// ❌ Bad - Import from database.ts directly
import { Database } from '@/types/database'
type Project = Database['public']['Tables']['projects']['Row']

// ❌ Bad - Define types inline
interface Project {
  id: string
  name: string
  // ... duplicated type definition
}
```typescript
### Import Patterns

```typescript
// Component imports
import type { ComponentProps } from '@/types/components'

// Schema imports
import { contractSchema } from '@/lib/schemas/contracts'
import type { ContractFormData } from '@/lib/schemas/contracts'

// Database type imports
import type { Contract, Project, Commitment } from '@/types'

// Enum type imports
import type { ContractStatus, CommitmentType } from '@/types'

// Helper imports
import { getStatusBadgeVariant } from '@/types'
```

---

## Type Safety Rules

### 1. No `any` Types

```typescript
// ❌ Bad
function processData(data: any) {
  return data.map((item: any) => item.value)
}

// ✅ Good
function processData<T>(data: T[]): T[] {
  return data.map(item => item)
}
```javascript
### 2. Explicit Return Types

```typescript
// ❌ Bad
async function fetchProjects() {
  const { data } = await supabase.from('projects').select()
  return data
}

// ✅ Good
async function fetchProjects(): Promise<Project[]> {
  const { data } = await supabase.from('projects').select()
  return data ?? []
}
```typescript
### 3. Null Safety

```typescript
// ❌ Bad
function getClientName(project: Project) {
  return project.client.name // Error if client is null
}

// ✅ Good
function getClientName(project: Project): string | null {
  return project.client?.name ?? null
}
```javascript
### 4. Type Guards

```typescript
// Type guard for meetings
function isMeeting(doc: Document | Meeting): doc is Meeting {
  return 'type' in doc && doc.type === 'meeting'
}

// Usage
const documents = await fetchDocuments()
const meetings = documents.filter(isMeeting)
// meetings is now typed as Meeting[]
```

---

## Common Type Patterns

### Server Actions

```typescript
// actions/contracts.ts
import { Contract, ContractInsert } from '@/types'

export async function createContract(data: ContractInsert): Promise<Contract | null> {
  const supabase = await createClient()
  const { data: contract, error } = await supabase
    .from('contracts')
    .insert(data)
    .select()
    .single()

  if (error) {
    console.error('Error creating contract:', error)
    return null
  }

  return contract
}
```yaml
### React Query Hooks

```typescript
import { useQuery } from '@tanstack/react-query'
import { Contract } from '@/types'

export function useContracts(projectId: string) {
  return useQuery({
    queryKey: ['contracts', projectId],
    queryFn: async (): Promise<Contract[]> => {
      const supabase = await createClient()
      const { data } = await supabase
        .from('contracts')
        .select('*')
        .eq('project_id', projectId)

      return data ?? []
    }
  })
}
```yaml
### Table Column Definitions

```typescript
import { ColumnDef } from '@tanstack/react-table'
import { Contract } from '@/types'

export const contractColumns: ColumnDef<Contract>[] = [
  {
    accessorKey: 'contract_number',
    header: 'Contract #',
    cell: ({ row }) => row.original.contract_number
  },
  {
    accessorKey: 'contract_title',
    header: 'Title',
    cell: ({ row }) => row.original.contract_title
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={getStatusBadgeVariant(row.original.status)}>
        {row.original.status}
      </Badge>
    )
  }
]
```diff
---

## Type Checking

### Run Type Checker

```bash
# From frontend directory
npm run typecheck

# Watch mode
npm run typecheck:watch
```

### tsconfig.json Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```diff
---

## Troubleshooting

### Issue: "Type 'X' is not assignable to type 'Y'"

**Solution**: Regenerate types after schema changes
```bash
npm run db:types
```markdown
### Issue: "Cannot find module '@/types'"

**Solution**: Check `tsconfig.json` paths configuration

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```markdown
### Issue: "Property 'X' does not exist on type 'Y'"

**Solution**: Verify the column exists in the database schema
```bash
cd backend && ./scripts/check_schema.sh
```

---

## Best Practices

1. **Always regenerate types after schema changes**
2. **Import types from `@/types`, never `database.ts`**
3. **Use Zod for form validation, infer types with `z.infer<>`**
4. **Define explicit interfaces for component props**
5. **Use type guards for discriminated unions**
6. **Run `npm run typecheck` before committing**
7. **Never use `any` - use `unknown` or proper inference**

---

## Related Files

- [frontend/src/types/database.ts](../../frontend/src/types/database.ts) - Auto-generated Supabase types
- [frontend/src/types/index.ts](../../frontend/src/types/index.ts) - Derived application types
- [frontend/src/lib/schemas/](../../frontend/src/lib/schemas/) - Zod validation schemas
- [frontend/tsconfig.json](../../frontend/tsconfig.json) - TypeScript configuration

---

**Last Updated**: 2025-12-17
**Maintained By**: Alleato Engineering Team
