import { Pool } from "pg";

const REQUIRED_TABLES = [
  "projects",
  "projects_sync",
  "project_emails",
  "email_attachments",
  "search_documents",
  "ingestion_dead_letter",
] as const;

let pool: Pool | undefined;

export function getPool(): Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL or SUPABASE_DB_URL.");
  }

  const url = new URL(connectionString);
  url.searchParams.delete("sslmode");

  pool = new Pool({
    connectionString: url.toString(),
    ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
    max: Number(process.env.EMAIL_INGESTION_DB_POOL_MAX ?? 5),
  });
  return pool;
}

export async function closePool(): Promise<void> {
  if (!pool) return;
  await pool.end();
  pool = undefined;
}

export async function assertRequiredSchema(): Promise<void> {
  const tableResult = await getPool().query<{ table_name: string }>(
    `
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name = any($1::text[])
    `,
    [[...REQUIRED_TABLES]],
  );
  const found = new Set(tableResult.rows.map((row) => row.table_name));
  const missing = REQUIRED_TABLES.filter((table) => !found.has(table));
  if (missing.length > 0) {
    throw new Error(`Missing required table(s): ${missing.join(", ")}`);
  }

  const embeddingResult = await getPool().query<{ atttypid: string; atttypmod: number }>(
    `
      select atttypid::regtype::text as atttypid, atttypmod
      from pg_attribute
      where attrelid = 'public.search_documents'::regclass
        and attname = 'embedding'
        and not attisdropped
    `,
  );
  const embedding = embeddingResult.rows[0];
  if (!embedding || embedding.atttypid !== "halfvec" || embedding.atttypmod !== 3072) {
    throw new Error(
      `search_documents.embedding must be halfvec(3072); found ${embedding?.atttypid ?? "missing"}(${embedding?.atttypmod ?? "unknown"}).`,
    );
  }
}

function shouldUseSsl(connectionString: string): boolean {
  return !connectionString.includes("localhost") && !connectionString.includes("127.0.0.1");
}
