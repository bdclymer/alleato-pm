import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { Database as RagDatabase } from "@/types/rag-database.types";

/**
 * Supabase Admin Client (Service Role)
 *
 * This client bypasses Row Level Security (RLS) policies.
 * Use ONLY in server-side API routes where you need admin access.
 *
 * ⚠️ NEVER expose this client or service role key to the client-side ⚠️
 */
export function createServiceClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable",
    );
  }

  if (!supabaseServiceKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY environment variable. " +
        "This is required for server-side admin operations.",
    );
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function isRagDatabaseReadsEnabled() {
  return (
    (process.env.RAG_DATABASE_READS_ENABLED ?? "").trim().toLowerCase() ===
    "true"
  );
}

export function isRagDatabaseWritesEnabled() {
  return (
    (process.env.RAG_DATABASE_WRITES_ENABLED ?? "").trim().toLowerCase() ===
    "true"
  );
}

export function createRagServiceClient() {
  const supabaseUrl = process.env.RAG_SUPABASE_URL;
  const supabaseServiceKey =
    process.env.RAG_SUPABASE_SERVICE_ROLE_KEY ??
    process.env.RAG_SUPABASE_SERVICE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Missing RAG_SUPABASE_URL environment variable. " +
        "This is required when RAG_DATABASE_READS_ENABLED=true.",
    );
  }

  if (!supabaseServiceKey) {
    throw new Error(
      "Missing RAG_SUPABASE_SERVICE_ROLE_KEY environment variable. " +
        "This is required when RAG_DATABASE_READS_ENABLED=true.",
    );
  }

  return createClient<RagDatabase>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
