# Type-Safe API Pattern with Zod Validation

## The Problem We're Solving

**NEVER WASTE TIME ON COLUMN NAME MISMATCHES AGAIN**

This pattern ensures:
- ✅ Database columns match validation schemas
- ✅ Runtime type checking catches errors early
- ✅ TypeScript enforces correctness at compile time
- ✅ No more debugging "column doesn't exist" errors

---

## Pattern 1: API Route with Database Validation

```typescript
// app/api/projects/[id]/budget/lines/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  BudgetLineInsertSchema,
  validateBudgetLineInsert,
  safeParseBudgetLineInsert,
} from '@/lib/schemas/budget-db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // OPTION 1: Throw on validation error (use in most cases)
    const validatedData = validateBudgetLineInsert(body);

    // OPTION 2: Get result object (use when you need custom error handling)
    const result = safeParseBudgetLineInsert(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Insert into database - column names are GUARANTEED to match
    const { data, error } = await supabase
      .from('budget_lines')
      .insert(validatedData) // ← Uses actual database column names
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## Pattern 2: Frontend Form with Validation

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BudgetLineInsertSchema } from '@/lib/schemas/budget-db';
import type { BudgetLineInsertInput } from '@/lib/schemas/budget-db';

export function CreateBudgetLineForm({ projectId }: { projectId: number }) {
  const form = useForm<BudgetLineInsertInput>({
    resolver: zodResolver(BudgetLineInsertSchema),
    defaultValues: {
      project_id: projectId,
      original_amount: 0,
      forecasting_enabled: false,
    },
  });

  async function onSubmit(data: BudgetLineInsertInput) {
    // Data is already validated by Zod
    // Column names match database exactly
    const response = await fetch(`/api/projects/${projectId}/budget/lines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data), // ← Sends snake_case to match database
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Validation errors:', error.details);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Use snake_case field names */}
      <input {...form.register('cost_code_id')} />
      <input {...form.register('description')} />
      <input {...form.register('quantity', { valueAsNumber: true })} />
      <input {...form.register('unit_cost', { valueAsNumber: true })} />
      <input {...form.register('unit_of_measure')} />

      <button type="submit">Create Budget Line</button>
    </form>
  );
}
```

---

## Pattern 3: Using Case Conversion (Optional)

If you **must** use camelCase on the frontend:

```typescript
import { camelToSnake, snakeToCamel } from '@/lib/utils/case-conversion';

// Frontend component
const formData = {
  costCodeId: '123',
  unitCost: 100,
  unitOfMeasure: 'EA',
};

// Convert to snake_case before sending to API
const dbData = camelToSnake(formData);
// { cost_code_id: '123', unit_cost: 100, unit_of_measure: 'EA' }

// Validate AFTER conversion
const validated = validateBudgetLineInsert(dbData);

// Send to API
await fetch('/api/...', {
  method: 'POST',
  body: JSON.stringify(validated),
});

// Convert API response back to camelCase
const response = await fetch('/api/...');
const dbResult = await response.json();
const frontendData = snakeToCamel(dbResult);
```

---

## Pattern 4: Bulk Operations

```typescript
import { BulkBudgetLineInsertSchema } from '@/lib/schemas/budget-db';

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Validate bulk insert
  const validated = BulkBudgetLineInsertSchema.parse(body);
  // {
  //   project_id: 123,
  //   budget_lines: [
  //     { cost_code_id: '...', original_amount: 1000, ... },
  //     { cost_code_id: '...', original_amount: 2000, ... },
  //   ]
  // }

  const supabase = await createClient();

  // Insert all budget lines
  const { data, error } = await supabase
    .from('budget_lines')
    .insert(validated.budget_lines)
    .select();

  return NextResponse.json(data);
}
```

---

## Key Benefits

### 1. **Compile-time Safety**
```typescript
const data = {
  costCodeId: '123', // ❌ TypeScript error: Property 'costCodeId' does not exist
  cost_code_id: '123', // ✅ Correct
};
```

### 2. **Runtime Validation**
```typescript
BudgetLineInsertSchema.parse({
  project_id: 'not a number', // ❌ Throws ZodError at runtime
});
```

### 3. **Schema Matches Database**
```typescript
// The schema is derived from database.types.ts
// If you rename a column in the database and regenerate types,
// TypeScript will immediately show all places that need updating
```

### 4. **Clear Error Messages**
```typescript
const result = safeParseBudgetLineInsert({ foo: 'bar' });
// result.error.flatten().fieldErrors:
// {
//   project_id: ['Required'],
//   cost_code_id: ['Required'],
//   cost_type_id: ['Required'],
// }
```

---

## Migration Strategy

### Step 1: Update Existing API Routes
Replace manual validation with Zod schemas:

```typescript
// ❌ OLD (error-prone)
const { costCodeId, amount } = await request.json();
await supabase.from('budget_lines').insert({
  cost_code_id: costCodeId, // Oops, forgot to convert!
  original_amount: amount,   // Another mismatch!
});

// ✅ NEW (type-safe)
const validated = validateBudgetLineInsert(await request.json());
await supabase.from('budget_lines').insert(validated);
```

### Step 2: Update Forms
Use `zodResolver` with react-hook-form:

```typescript
const form = useForm({
  resolver: zodResolver(BudgetLineInsertSchema),
});
```

### Step 3: Test
Zod schemas will catch errors immediately during development.

---

## Future: Auto-Generate Schemas

Eventually, we can auto-generate Zod schemas from `database.types.ts`:

```typescript
// Coming soon: npx supabase-to-zod
// Auto-generates budget-db.ts from database.types.ts
```

---

## Questions?

- **Q: Do I always use snake_case?**
  A: Yes in the database layer. Optionally use `camelToSnake()` if your frontend prefers camelCase.

- **Q: What about existing code?**
  A: Migrate gradually. New code uses these patterns. Fix old code as you touch it.

- **Q: Where do I put schemas?**
  A: `/src/lib/schemas/[domain]-db.ts` for database schemas
     `/src/lib/schemas/[domain]-api.ts` for API request/response schemas

- **Q: How do I handle updates?**
  A: Use `BudgetLineUpdateSchema` which makes all fields optional and validates partial updates.
