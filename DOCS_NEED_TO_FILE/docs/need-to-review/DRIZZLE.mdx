# Drizzle ORM Setup

This project now uses Drizzle ORM alongside Supabase for type-safe database operations.

## Installation

Drizzle is already installed. The following packages are included:
- `drizzle-orm` - The ORM library
- `drizzle-kit` - CLI tools for migrations and introspection
- `postgres` - PostgreSQL client for Drizzle

## Configuration

### Environment Variables

Make sure you have `DATABASE_URL` set in your `.env.local`:

```bash
DATABASE_URL=postgresql://postgres:[password]@db.lgveqfnpkxvzbnnwuled.supabase.co:5432/postgres
```

### Files Structure

```
frontend/
├── drizzle.config.ts          # Drizzle Kit configuration
├── src/lib/db/
│   ├── index.ts               # Database connection
│   └── schema.ts              # Database schema definitions
└── drizzle/                   # Generated migrations (gitignored)
```

## Available Commands

```bash
# Generate migrations from schema changes
npm run db:generate

# Apply migrations to database
npm run db:migrate

# Push schema changes directly to database (development)
npm run db:push

# Open Drizzle Studio (visual database browser)
npm run db:studio

# Introspect existing database and generate schema
npm run db:introspect
```

## Usage Examples

### Basic Queries

```typescript
import { db } from '@/lib/db';
import { contracts, companies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Select all contracts
const allContracts = await db.select().from(contracts);

// Select with where clause
const draftContracts = await db
  .select()
  .from(contracts)
  .where(eq(contracts.status, 'draft'));

// Insert
const newContract = await db
  .insert(contracts)
  .values({
    title: 'New Subcontract',
    contractNumber: 'SC-003',
    projectId: 67,
    clientId: 1,
  })
  .returning();

// Update
await db
  .update(contracts)
  .set({ status: 'approved' })
  .where(eq(contracts.id, 1));

// Delete
await db
  .delete(contracts)
  .where(eq(contracts.id, 1));
```

### Joins

```typescript
// Join contracts with companies
const contractsWithCompanies = await db
  .select()
  .from(contracts)
  .leftJoin(companies, eq(contracts.contractorId, companies.id));
```

### Transactions

```typescript
await db.transaction(async (tx) => {
  const contract = await tx
    .insert(contracts)
    .values({ /* ... */ })
    .returning();

  await tx
    .insert(contractLineItems)
    .values({
      contractId: contract[0].id,
      description: 'Line item 1',
      amount: '1000',
    });
});
```

## Schema Definition

The schema is defined in `src/lib/db/schema.ts`. Key tables:

- `contracts` - Main contracts/subcontracts table
- `contractLineItems` - Schedule of Values (SOV) line items
- `companies` - Companies/vendors/subcontractors

### Adding New Tables

1. Add table definition to `schema.ts`:

```typescript
export const myTable = pgTable('my_table', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  // ... other columns
});
```

2. Generate migration:

```bash
npm run db:generate
```

3. Apply migration:

```bash
npm run db:migrate
```

## Drizzle Studio

Drizzle Studio provides a visual interface to browse and edit your database:

```bash
npm run db:studio
```

Then open http://localhost:4983 in your browser.

## Migration Workflow

### Development
Use `db:push` for quick schema iterations:
```bash
npm run db:push
```

### Production
Use proper migrations:
```bash
# 1. Make schema changes in schema.ts
# 2. Generate migration
npm run db:generate
# 3. Review migration in drizzle/ folder
# 4. Apply migration
npm run db:migrate
```

## TypeScript Types

Drizzle automatically infers types from your schema:

```typescript
import { type Contract, type NewContract } from '@/lib/db/schema';

// Contract = full row type (with id)
// NewContract = insert type (without id)

const contract: Contract = {
  id: 1,
  title: 'My Contract',
  // ... all required fields
};

const newContract: NewContract = {
  title: 'My Contract',
  // ... id is optional
};
```

## Best Practices

1. **Always use transactions** for related inserts/updates
2. **Use prepared statements** for repeated queries
3. **Leverage TypeScript** - let Drizzle catch type errors at compile time
4. **Use migrations in production** - never `db:push` to production
5. **Keep schema in sync** with Supabase types for consistency

## Supabase Integration

Drizzle works alongside Supabase. You can use:
- Drizzle for type-safe queries
- Supabase client for auth, realtime, storage
- Supabase RLS policies still apply

## Troubleshooting

### Connection Issues
- Verify `DATABASE_URL` is correct
- Check database is accessible
- Ensure connection string includes `?sslmode=require` for Supabase

### Type Errors
- Run `npm run db:generate` after schema changes
- Restart TypeScript server in your editor

### Migration Conflicts
- Check `drizzle/` folder for migration files
- Review and merge conflicting migrations manually
