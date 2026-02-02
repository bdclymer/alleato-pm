# TypeScript Errors Log

A continuous log of all TypeScript errors encountered in the Alleato-Procore codebase.

---

## Statistics

| Metric | Value |
|--------|-------|
| Total Errors Logged | 60 |
| Total Fix Sessions | 1 |
| Most Common Category | FORM_TYPING (33%) |
| Last Updated | 2026-01-12 |

### Errors by Category (All Time)

| Category | Count | Description |
|----------|-------|-------------|
| FORM_TYPING | 20 | React Hook Form / Zod schema mismatches |
| SCHEMA_MISMATCH | 18 | Database schema vs TypeScript types |
| TYPE_CONVERSION | 12 | Date, string, number conversions |
| SERVICE_METHOD | 6 | Service class method issues |
| LIBRARY_TYPES | 3 | Third-party library type issues |
| MISSING_PROPERTY | 1 | Non-existent property access |

---

## Error Log

### 2026-01-12 | 60 errors | 16 files

#### SCHEMA_MISMATCH (18 errors)

**File:** `src/app/api/projects/[projectId]/budget/details/route.ts`

| Line | Code | Error |
|------|------|-------|
| 381 | TS2339 | Property 'change_events' does not exist on type 'SelectQueryError<"column 'cost_code' does not exist on 'change_event_line_items'.">' |
| 387 | TS2339 | Property 'id' does not exist on type 'SelectQueryError<...>' |
| 388 | TS2339 | Property 'cost_code' does not exist on type 'SelectQueryError<...>' |
| 392 | TS2339 | Property 'description' does not exist on type 'SelectQueryError<...>' |
| 414 | TS2339 | Property 'id' does not exist on type 'SelectQueryError<"column 'amount' does not exist on 'direct_costs'.">' |
| 415 | TS2339 | Property 'budget_item_id' does not exist on type 'SelectQueryError<...>' |
| 417 | TS2339 | Property 'vendor_id' does not exist on type 'SelectQueryError<...>' |
| 419 | TS2339 | Property 'description' does not exist on type 'SelectQueryError<...>' |
| 420 | TS2339 | Property 'amount' does not exist on type 'SelectQueryError<...>' |

**Root Cause:** Supabase queries referenced non-existent columns (`cost_code` instead of `budget_code_id`, `amount` instead of `line_total`)

**Fix:** Updated column references to match actual database schema, changed query from `direct_costs` to `direct_cost_line_items` table

---

**File:** `src/components/commitments/tabs/AttachmentsTab.tsx`

| Line | Code | Error |
|------|------|-------|
| 13 | TS2339 | Property 'commitment_attachments' does not exist on type |

**Root Cause:** Referenced table `commitment_attachments` doesn't exist; should use `attachments`

**Fix:** Changed table reference from `commitment_attachments` to `attachments`

---

#### SERVICE_METHOD (6 errors)

**Files:**
- `src/app/api/projects/[projectId]/direct-costs/[costId]/route.ts`
- `src/app/api/projects/[projectId]/direct-costs/bulk/route.ts`
- `src/app/api/projects/[projectId]/direct-costs/export/route.ts`
- `src/app/api/projects/[projectId]/direct-costs/route.ts`

| Line | Code | Error |
|------|------|-------|
| 23 | TS2339 | Property 'getById' does not exist on type 'DirectCostService' |
| 68 | TS2339 | Property 'update' does not exist on type 'DirectCostService' |
| 126 | TS2339 | Property 'delete' does not exist on type 'DirectCostService' |
| 67 | TS2339 | Property 'bulkStatusUpdate' does not exist on type 'DirectCostService' |
| 104 | TS2339 | Property 'bulkDelete' does not exist on type 'DirectCostService' |
| 57 | TS2339 | Property 'list' does not exist on type 'DirectCostService' |

**Root Cause:** Service file was corrupted/minified to single line, TypeScript couldn't parse method definitions

**Fix:** Reformatted service file to proper multi-line format

---

#### FORM_TYPING (20 errors)

**File:** `src/components/direct-costs/DirectCostForm.tsx`

| Line | Code | Error |
|------|------|-------|
| 162 | TS2322 | Resolver type mismatch - union type inference failure |
| 163 | TS2322 | Default values type incompatible with form schema |
| 341 | TS2322 | Type 'string' is not assignable to type 'number' |
| 343 | TS2322 | Type 'string' is not assignable to type 'number' |
| 379 | TS2322 | Property 'autoSaving' does not exist on type 'AutoSaveIndicatorProps' |
| 440 | TS2345 | SubmitHandler type incompatible |
| 452-697 | TS2322 | Control type mismatches (12 instances) |
| 767 | TS2322 | UseFormReturn type mismatch |
| 793 | TS2322 | AttachmentManager props incorrect |

**Root Cause:**
1. Union types `DirectCostCreate | DirectCostUpdate` cause complex type inference issues
2. Component props changed but usages weren't updated
3. Form field types (string) didn't match schema types (number)

**Fix:**
1. Used conditional `FormData` type with `as never` casts
2. Updated component prop usage to match interfaces
3. Changed default values from strings to numbers

---

**File:** `src/components/direct-costs/DirectCostTable.tsx`

| Line | Code | Error |
|------|------|-------|
| 439 | TS2322 | Type 'string' is not assignable to type 'number' |

**Root Cause:** Component expected `stats` prop with different interface than provided `summary`

**Fix:** Added data transformation to map `DirectCostSummary` to `DirectCostStats`

---

**File:** `src/components/direct-costs/LineItemsManager.tsx`

| Line | Code | Error |
|------|------|-------|
| 504 | TS2345 | Type '"budget_code_id"' not assignable to field path type |
| 576 | TS2322 | Merge<FieldError, ...> not assignable to Record<string, { message?: string }> |

**Root Cause:** React Hook Form's error types more complex than component expected

**Fix:** Changed prop type to `unknown` with runtime type guards

---

**File:** `src/components/domain/change-events/ChangeEventLineItemsGrid.tsx`

| Line | Code | Error |
|------|------|-------|
| 581 | TS2322 | FieldError type incompatibility |

**Root Cause:** Same as LineItemsManager - RHF error types don't match expected interface

**Fix:** Added FieldError type import and type guards

---

#### TYPE_CONVERSION (12 errors)

**File:** `src/app/api/projects/[projectId]/direct-costs/export/route.ts`

| Line | Code | Error |
|------|------|-------|
| 79 | TS2345 | Uint8Array not assignable to BodyInit |
| 212 | TS2322 | Type 'string \| Date' is not assignable to type 'string' |
| 222 | TS2322 | Type 'string \| Date' is not assignable to type 'string' |
| 226 | TS2322 | Type 'string \| Date' is not assignable to type 'string' |
| 237 | TS2322 | Type 'string \| Date' is not assignable to type 'string' |
| 251 | TS2322 | Type 'string \| Date' is not assignable to type 'string' |
| 252 | TS2322 | Type 'string \| Date' is not assignable to type 'string' |
| 273 | TS2322 | Type 'string \| Date' is not assignable to type 'string' |
| 283 | TS2322 | Type 'string \| Date' is not assignable to type 'string' |
| 291 | TS2322 | Type 'string \| Date' is not assignable to type 'string' |
| 305 | TS2322 | Type 'string \| Date' is not assignable to type 'string' |
| 306 | TS2322 | Type 'string \| Date' is not assignable to type 'string' |

**Root Cause:** Date fields can be `string | Date`, but export expected `string`

**Fix:**
1. Cast Uint8Array: `buffer as unknown as BodyInit`
2. Convert dates: `value instanceof Date ? value.toISOString() : value`

---

**File:** `src/app/[projectId]/home/page.tsx`

| Line | Code | Error |
|------|------|-------|
| 124 | TS2352 | Type conversion error - database response doesn't match component props |

**Root Cause:** Database type has different properties than expected component type

**Fix:** Used double type assertion: `data as unknown as ExpectedType[]`

---

#### LIBRARY_TYPES (3 errors)

**Files:**
- `src/app/simple-chat/page.tsx`
- `src/components/docs/markdown-renderer.tsx`

| Line | Code | Error |
|------|------|-------|
| 191 | TS2769 | SyntaxHighlighter style prop type mismatch |
| 114 | TS2769 | SyntaxHighlighter style prop type mismatch |

**Root Cause:** react-syntax-highlighter's style prop type doesn't match imported theme object

**Fix:** Added `@ts-expect-error` comment (known library issue)

---

**File:** `src/app/api/direct-costs/[id]/route.ts`

| Line | Code | Error |
|------|------|-------|
| 140 | TS2339 | Property 'errors' does not exist on type 'ZodError' |

**Root Cause:** ZodError uses `.issues` not `.errors`

**Fix:** Changed `zodError.errors` to `zodError.issues`

---

#### MISSING_PROPERTY (1 error)

**File:** `src/app/api/projects/[projectId]/change-events/route.ts`

| Line | Code | Error |
|------|------|-------|
| 310 | TS2339 | Property 'description' does not exist on insert type |

**Root Cause:** Insert object included property not in database Insert type

**Fix:** Removed `description` from insert object

---

#### FUNCTION_RETURN (2 errors)

**File:** `src/app/api/monitoring/dashboard/route.ts`

| Line | Code | Error |
|------|------|-------|
| 81 | TS2355 | Function must return a value |
| 125 | TS2355 | Function must return a value |

**Root Cause:** Functions were minified, TypeScript couldn't detect return statements

**Fix:** Reformatted functions to proper multi-line format

---

## Pattern Analysis

### Recurring Issues

1. **Schema Drift** - Database changes not reflected in queries
2. **Form Union Types** - Complex type inference failures with create/update unions
3. **Date Handling** - Inconsistent `string | Date` types
4. **Code Formatting** - Minified files cause parse failures

### Prevention Checklist

- [ ] Run `npm run db:types` after schema changes
- [ ] Use single form type with optional `id` instead of unions
- [ ] Use date utility functions for consistent handling
- [ ] Run `prettier --write` before committing
- [ ] Check `database.types.ts` before writing queries

---

*Add new entries above this line, following the format above*
