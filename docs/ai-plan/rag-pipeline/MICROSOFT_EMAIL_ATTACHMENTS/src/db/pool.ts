import { Pool } from "pg";

const REQUIRED_TABLES = [
  "projects_sync",
  "project_emails",
  "email_attachments",
  "search_documents",
  "ingestion_dead_letter",
] as const;

let pool: Pool | undefined;

export function getPool(): Pool {
  if (pool) {
    return pool;
  }

  const connectionString = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL or SUPABASE_DB_URL for Supabase Postgres connection.");
  }

  pool = new Pool({
    connectionString: normalizeConnectionString(connectionString),
    max: Number(process.env.EMAIL_INGESTION_DB_POOL_MAX ?? 5),
    ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
  });

  return pool;
}

export async function closePool(): Promise<void> {
  if (!pool) {
    return;
  }
  await pool.end();
  pool = undefined;
}

export async function assertRequiredTables(): Promise<void> {
  const result = await getPool().query<{ table_name: string }>(
    `
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name = any($1::text[])
    `,
    [[...REQUIRED_TABLES]],
  );

  const found = new Set(result.rows.map((row) => row.table_name));
  const missing = REQUIRED_TABLES.filter((table) => !found.has(table));
  if (missing.length > 0) {
    throw new Error(
      `Supabase schema is missing required worker table(s): ${missing.join(", ")}. Runtime migrations are disabled; create/apply the schema before running ingestion.`,
    );
  }
}

function shouldUseSsl(connectionString: string): boolean {
  if (connectionString.includes("sslmode=disable")) {
    return false;
  }
  return !connectionString.includes("localhost") && !connectionString.includes("127.0.0.1");
}

function normalizeConnectionString(connectionString: string): string {
  const url = new URL(connectionString);
  url.searchParams.delete("sslmode");
  return url.toString();
}
