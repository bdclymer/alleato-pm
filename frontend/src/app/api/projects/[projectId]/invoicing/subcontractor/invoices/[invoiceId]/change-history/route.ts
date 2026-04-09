import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

// GET → list audit log entries for this invoice, newest first
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ projectId: string; invoiceId: string }> },
) {
  try {
    const supabase = await createClient();
    const { invoiceId } = await context.params;
    const invoiceIdNum = parseInt(invoiceId, 10);

    const { data, error } = await supabase
      .from("subcontractor_invoice_audit_log")
      .select("*")
      .eq("invoice_id", invoiceIdNum)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch change history", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
