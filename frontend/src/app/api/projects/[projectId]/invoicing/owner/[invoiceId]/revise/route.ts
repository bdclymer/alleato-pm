import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

// POST /api/projects/[projectId]/invoicing/owner/[invoiceId]/revise
// Request revision of an invoice (UNDER REVIEW → REVISE AND RESUBMIT)
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; invoiceId: string }> },
) {
  try {
    const supabase = await createClient();
    const { projectId, invoiceId } = await context.params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectIdNum = parseInt(projectId, 10);
    const invoiceIdNum = parseInt(invoiceId, 10);

    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    // Verify invoice exists and belongs to the project
    const { data: invoice, error: fetchError } = await supabase
      .from("owner_invoices")
      .select(`id, status, prime_contracts!inner(project_id)`)
      .eq("id", invoiceIdNum)
      .eq("prime_contracts.project_id", projectIdNum)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Only under_review invoices can be sent back for revision
    if (invoice.status !== "under_review") {
      return NextResponse.json(
        {
          error: "Cannot request revision",
          message: `Invoice status is '${invoice.status}'. Only invoices under review can be sent back for revision.`,
        },
        { status: 400 },
      );
    }

    const updatePayload: Record<string, unknown> = { status: "revise_and_resubmit" };
    if (reason) updatePayload.notes = reason;

    const { data: updated, error: updateError } = await supabase
      .from("owner_invoices")
      .update(updatePayload)
      .eq("id", invoiceIdNum)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      data: updated,
      message: "Invoice returned for revision",
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
