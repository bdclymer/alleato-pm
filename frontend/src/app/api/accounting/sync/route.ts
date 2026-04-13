import { NextResponse } from "next/server";
import { syncAllMirrorEntities } from "@/lib/acumatica/mirror-sync";

/**
 * POST /api/accounting/sync
 *
 * Triggers an incremental Acumatica → Supabase mirror sync.
 * Protected by a bearer token (ACCOUNTING_SYNC_SECRET env var).
 *
 * Called by the scheduled remote agent twice daily (6am + 6pm ET).
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.ACCOUNTING_SYNC_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "ACCOUNTING_SYNC_SECRET not configured" },
      { status: 500 },
    );
  }

  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const mode: "incremental" | "full" = body.mode === "full" ? "full" : "incremental";

  try {
    const results = await syncAllMirrorEntities({ mode });

    const summary = results.map((r) => ({
      entity: r.entity,
      fetched: r.fetched,
      upserted: r.upserted,
      skipped: r.skipped,
      errors: r.errors,
      durationMs: r.durationMs,
    }));

    const totalUpserted = results.reduce((acc, r) => acc + r.upserted, 0);
    const totalErrors = results.reduce((acc, r) => acc + r.errors, 0);

    return NextResponse.json({
      ok: true,
      mode,
      totalUpserted,
      totalErrors,
      entities: summary,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[accounting/sync] Sync failed:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
