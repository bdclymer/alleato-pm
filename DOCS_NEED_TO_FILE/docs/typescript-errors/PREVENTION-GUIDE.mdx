# TypeScript Error Prevention Guide

## Overview

This guide provides patterns and practices to prevent common TypeScript errors in the Alleato-Procore codebase.

---

## 1. Schema Mismatch Prevention

### Problem
Database schema changes cause TypeScript errors when queries reference non-existent columns.

### Prevention

#### Always Regenerate Types After Schema Changes
```bash
# After ANY database migration
npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" \
  --schema public > frontend/src/types/database.types.ts
```

#### Use Type-Safe Query Builders
```typescript
// BAD: String-based column names
const { data } = await supabase
  .from('direct_costs')
  .select('amount, budget_item_id')  // These columns don't exist!

// GOOD: Use autocomplete, check database.types.ts
const { data } = await supabase
  .from('direct_costs')
  .select('total_amount, id, project_id')  // Actual columns
```

#### Create Database Constants
```typescript
// src/lib/constants/database-tables.ts
export const TABLES = {
  DIRECT_COSTS: 'direct_costs',
  DIRECT_COST_LINE_ITEMS: 'direct_cost_line_items',
  CHANGE_EVENTS: 'change_events',
  CHANGE_EVENT_LINE_ITEMS: 'change_event_line_items',
  // ... etc
} as const;

export const COLUMNS = {
  DIRECT_COST_LINE_ITEMS: {
    ID: 'id',
    BUDGET_CODE_ID: 'budget_code_id',
    LINE_TOTAL: 'line_total',
    // ... etc
  }
} as const;
```

---

## 2. Form Typing Best Practices

### Problem
Union types in React Hook Form cause complex type inference failures.

### Prevention

#### Use Single Form Type with Optional ID
```typescript
// BAD: Union types cause inference issues
type FormData = DirectCostCreate | DirectCostUpdate;
const form = useForm<FormData>({ ... });  // Type errors!

// GOOD: Single type with optional id
interface DirectCostFormData {
  id?: string;  // Optional for create, required for update
  cost_type: 'Invoice' | 'Expense' | 'Subcontractor Invoice';
  date: Date;
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Paid';
  // ... rest of fields
}

const form = useForm<DirectCostFormData>({ ... });
```

#### Type Form Default Values Explicitly
```typescript
// BAD: Implicit types cause mismatches
const defaultValues = {
  quantity: '1',  // String, but schema expects number!
  unit_cost: '0',
};

// GOOD: Match schema types exactly
const defaultValues: Partial<DirectCostFormData> = {
  quantity: 1,
  unit_cost: 0,
  cost_type: 'Expense',
  status: 'Draft',
};
```

#### Use Zod Transform for Type Conversion
```typescript
// Handle string inputs that need to be numbers
const lineItemSchema = z.object({
  quantity: z.coerce.number().min(0),  // Coerce string to number
  unit_cost: z.coerce.number().min(0),
  budget_code_id: z.string().uuid(),
});
```

---

## 3. Date Handling

### Problem
Dates can be `string | Date | null` causing type errors.

### Prevention

#### Create Date Utility Functions
```typescript
// src/lib/utils/date.ts
export function toISOString(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  if (date instanceof Date) return date.toISOString();
  return date;
}

export function toDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  if (date instanceof Date) return date;
  return new Date(date);
}

export function formatDate(date: Date | string | null | undefined): string {
  const d = toDate(date);
  if (!d) return '';
  return d.toLocaleDateString();
}
```

#### Use Consistent Types in Interfaces
```typescript
// Define whether dates are strings or Date objects
interface DirectCost {
  date: string;  // Always ISO string in API responses
  received_date: string | null;
  paid_date: string | null;
}

// Or use Date for client-side
interface DirectCostForm {
  date: Date;
  received_date: Date | null;
  paid_date: Date | null;
}
```

---

## 4. Service Class Patterns

### Problem
Service methods aren't recognized due to file corruption or incorrect exports.

### Prevention

#### Use Consistent Service Structure
```typescript
// src/lib/services/example-service.ts
import { createClient } from '@/lib/supabase/server';

export class ExampleService {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabase: ReturnType<typeof createClient>) {
    this.supabase = supabase;
  }

  async getById(id: string): Promise<Example | null> {
    const { data, error } = await this.supabase
      .from('examples')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async list(filters?: ExampleFilters): Promise<Example[]> {
    // ...
  }

  async create(data: ExampleCreate): Promise<Example> {
    // ...
  }

  async update(id: string, data: ExampleUpdate): Promise<Example> {
    // ...
  }

  async delete(id: string): Promise<void> {
    // ...
  }
}
```

#### Export Service Instance Factory
```typescript
// At bottom of service file
export function createExampleService(supabase: ReturnType<typeof createClient>) {
  return new ExampleService(supabase);
}
```

---

## 5. Library Type Issues

### Problem
Third-party libraries have incorrect or missing type definitions.

### Prevention

#### Document Known Issues
```typescript
// src/types/library-fixes.d.ts

// react-syntax-highlighter style prop type issue
// See: https://github.com/react-syntax-highlighter/react-syntax-highlighter/issues/XXX
declare module 'react-syntax-highlighter' {
  // Add custom type overrides if needed
}
```

#### Create Wrapper Components
```typescript
// src/components/ui/code-block.tsx
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language = 'typescript' }: CodeBlockProps) {
  return (
    // @ts-expect-error - Known type issue with style prop
    <SyntaxHighlighter language={language} style={vscDarkPlus}>
      {code}
    </SyntaxHighlighter>
  );
}
```

---

## 6. Type Assertions

### When to Use

```typescript
// GOOD: Double assertion for truly incompatible types (with comment)
// Database type doesn't match component type, mapping would be complex
const commitments = data as unknown as CommitmentProps[];

// GOOD: Assert on validated data
const validated = schema.parse(input);
const typed = validated as KnownType;  // Zod already validated

// BAD: Silencing errors without understanding
const data = response as any;  // Never do this!
```

### When NOT to Use

```typescript
// BAD: Assertion instead of proper typing
function process(data: unknown) {
  return (data as MyType).property;  // Could fail at runtime!
}

// GOOD: Use type guards
function process(data: unknown) {
  if (isMyType(data)) {
    return data.property;  // Type-safe
  }
  throw new Error('Invalid data');
}

function isMyType(data: unknown): data is MyType {
  return typeof data === 'object' && data !== null && 'property' in data;
}
```

---

## 7. Pre-Commit Checks

### Recommended Hooks

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run TypeScript check
npm run typecheck --prefix frontend

# Run linting
npm run lint --prefix frontend

# Format check
npx prettier --check "frontend/src/**/*.{ts,tsx}"
```

### CI Pipeline Check

```yaml
# .github/workflows/typecheck.yml
name: TypeScript Check

on: [push, pull_request]

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci --prefix frontend
      - run: npm run typecheck --prefix frontend
```

---

## 8. Quick Reference

### Before Writing Supabase Queries
1. Check `database.types.ts` for available tables/columns
2. Use IDE autocomplete
3. Run type check after writing query

### Before Changing Component Props
1. Search for all usages: "Find All References"
2. Update all call sites
3. Run type check

### Before Committing
1. `npm run typecheck`
2. `npm run lint`
3. Review changed files for type assertions

### After Database Migrations
1. Run `npx supabase gen types typescript ...`
2. Update any affected queries
3. Run full type check

---

## Error Log Template

When encountering new TypeScript errors, log them using this template:

```markdown
### [Short Description]

**File:** `path/to/file.ts`

**Error Code:** TS[XXXX]

**Error:**
```
[Full error message]
```

**Root Cause:**
[Why the error occurred]

**Fix:**
[How it was resolved]

**Prevention:**
[How to prevent similar errors]

**Category:** [SCHEMA_MISMATCH | FORM_TYPING | TYPE_CONVERSION | etc.]
```
