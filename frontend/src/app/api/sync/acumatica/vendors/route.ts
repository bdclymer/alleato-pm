import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncVendors } from "@/lib/acumatica/sync";

// Alleato Group company ID — the single company in this deployment
const ALLEATO_COMPANY_ID = "bef9dcfc-531e-47c9-90a5-4cadd99447fb";

/**
 * POST /api/sync/acumatica/vendors
 *
 * Pulls all active vendors from Acumatica and upserts them into
 * the vendors table. Matches on acumatica_vendor_id first, then
 * name, then creates new records.
 *
 * No body required — always syncs into the Alleato Group company.
 */
export async function POST(_request: Request) {
  const supabase = await createClient();

  // Verify user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = ALLEATO_COMPANY_ID;

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
