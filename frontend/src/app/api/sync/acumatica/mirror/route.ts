import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/sync/acumatica/mirror
 *
 * Triggers a full or incremental sync of Acumatica entities into mirror tables.
 * This is a GLOBAL sync — no projectId needed. Pulls all records from Acumatica
 * and upserts into acumatica_* Supabase tables.
 *
 * Body: {
 *   mode: "full" | "incremental"   // default: "incremental"
 *   entities?: string[]             // optional — sync only these entities
 *   tier?: number                   // optional — sync only this tier (0-3)
 * }
 */
export const maxDuration = 300;

export async function POST(request: Request) {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    mode?: "full" | "incremental";
    entities?: string[];
    tier?: number;
  };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const mode = body.mode ?? "incremental";

  try {
    // Dynamic import to avoid bundling issues
    const { syncAllMirrorEntities, syncMirrorTier } = await import(
      "@/lib/acumatica/mirror-sync"
    );

    let results;
    if (typeof body.tier === "number") {
      results = await syncMirrorTier(body.tier, { mode }, supabase);
    } else {
      results = await syncAllMirrorEntities({ mode }, supabase);
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

    return NextResponse.json({
      success: true,
      mode,
      summary: {
        entities: results.length,
        totalFetched,
        totalUpserted,
        totalErrors,
      },
      results,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
