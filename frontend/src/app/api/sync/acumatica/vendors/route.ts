import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncVendors } from "@/lib/acumatica/sync";

/**
 * POST /api/sync/acumatica/vendors
 *
 * Pulls all active vendors from Acumatica and upserts them into
 * the vendors table. Matches on acumatica_vendor_id first, then
 * name, then creates new records.
 *
 * Body: { companyId: string }  — required, the Alleato PM company UUID
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  // Verify user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const companyId: string = body.companyId;

  if (!companyId) {
    return NextResponse.json(
      { error: "companyId is required in the request body" },
      { status: 400 },
    );
  }

  try {
    const result = await syncVendors(companyId);

    return NextResponse.json({
      success: true,
      companyId,
      result,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
