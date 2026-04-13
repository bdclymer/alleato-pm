/**
 * Run the Acumatica mirror sync from CLI.
 * Usage: cd frontend && npx tsx --tsconfig tsconfig.json ../scripts/run-mirror-sync.ts
 */
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
import { createClient } from "@supabase/supabase-js";

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env");
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Dynamic import with path alias resolved via tsconfig
  const { syncAllMirrorEntities } = await import(
    "@/lib/acumatica/mirror-sync"
  );

  console.log("Starting full mirror sync...\n");
  const results = await syncAllMirrorEntities({ mode: "full" }, supabase);

  for (const r of results) {
    const status = r.errors > 0 ? "⚠️" : "✅";
    console.log(
      `${status} ${r.entity}: fetched=${r.fetched} upserted=${r.upserted} errors=${r.errors} (${r.durationMs}ms)`,
    );
    if (r.errorMessages.length > 0) {
      for (const msg of r.errorMessages.slice(0, 3)) {
        console.log(`   → ${msg}`);
      }
    }
  }

  const totalFetched = results.reduce(
    (s: number, r: { fetched: number }) => s + r.fetched,
    0,
  );
  const totalUpserted = results.reduce(
    (s: number, r: { upserted: number }) => s + r.upserted,
    0,
  );
  const totalErrors = results.reduce(
    (s: number, r: { errors: number }) => s + r.errors,
    0,
  );
  console.log(
    `\nTOTAL: ${totalFetched} fetched, ${totalUpserted} upserted, ${totalErrors} errors`,
  );
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
