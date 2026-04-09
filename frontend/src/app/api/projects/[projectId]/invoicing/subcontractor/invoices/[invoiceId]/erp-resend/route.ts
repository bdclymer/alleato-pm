import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

// POST → resend this invoice to the ERP (Acumatica).
// Phase 1: logs the intent to the audit log so the Change History tab reflects
// the user action. The actual Acumatica push hook will be wired in a follow-up
// once the AP Bill endpoint contract is confirmed.
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ projectId: string; invoiceId: string }> },
) {
  try {
    const supabase = await createClient();
    const { invoiceId } = await context.params;
    const invoiceIdNum = parseInt(invoiceId, 10);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify the invoice exists
    const { data: invoice, error: fetchError } = await supabase
      .from("subcontractor_invoices")
      .select("id, status")
      .eq("id", invoiceIdNum)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (!["approved", "approved_as_noted", "paid"].includes(invoice.status)) {
      return NextResponse.json(
        {
          error: "Cannot resend to ERP",
          message: `Invoice must be approved before it can be sent to the ERP. Current status: ${invoice.status}`,
        },
        { status: 400 },
      );
    }

    await supabase.from("subcontractor_invoice_audit_log").insert({
      invoice_id: invoiceIdNum,
      actor_user_id: user.id,
      actor_email: user.email ?? null,
      event_type: "erp.resend_requested",
      notes: "Queued for Acumatica re-sync",
    });

    return NextResponse.json({
      message: "ERP resend queued",
      status: "queued",
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
