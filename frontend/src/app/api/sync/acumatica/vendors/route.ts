import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncVendors } from "@/lib/acumatica/sync";

/**
 * POST /api/sync/acumatica/vendors
 *
 * Pulls all active vendors from Acumatica and upserts them directly
 * into the companies table (is_vendor = true), keyed on acumatica_vendor_id.
 *
 * No body required.
 */
export async function POST(_request: Request) {
  const supabase = await createClient();

  // Verify user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncVendors();

    return NextResponse.json({
      success: true,
      result,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
