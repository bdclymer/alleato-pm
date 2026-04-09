import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

// DELETE /api/projects/[projectId]/invoicing/owner/[invoiceId]/line-items/[lineItemId]
// Delete a single line item. Only allowed when invoice is draft or revise_and_resubmit.
export async function DELETE(
  _request: NextRequest,
  context: {
    params: Promise<{ projectId: string; invoiceId: string; lineItemId: string }>;
  },
) {
  try {
    const supabase = await createClient();
    const { projectId, invoiceId, lineItemId } = await context.params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectIdNum = parseInt(projectId, 10);
    const invoiceIdNum = parseInt(invoiceId, 10);
    const lineItemIdNum = parseInt(lineItemId, 10);

    if (
      Number.isNaN(projectIdNum) ||
      Number.isNaN(invoiceIdNum) ||
      Number.isNaN(lineItemIdNum)
    ) {
      return NextResponse.json({ error: "Invalid id parameter" }, { status: 400 });
    }

    // Verify invoice belongs to project + fetch status
    const { data: invoice, error: verifyError } = await supabase
      .from("owner_invoices")
      .select(`id, status, prime_contracts!inner(project_id)`)
      .eq("id", invoiceIdNum)
      .eq("prime_contracts.project_id", projectIdNum)
      .single();

    if (verifyError) {
      if (verifyError.code === "PGRST116") {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }
      return NextResponse.json(
        { error: "Failed to verify invoice", details: verifyError.message },
        { status: 500 },
      );
    }

    const editableStatuses = ["draft", "revise_and_resubmit"];
    if (!editableStatuses.includes(invoice.status)) {
      return NextResponse.json(
        { error: `Invoice status '${invoice.status}' does not allow editing` },
        { status: 400 },
      );
    }

    const { error: deleteError } = await supabase
      .from("owner_invoice_line_items")
      .delete()
      .eq("id", lineItemIdNum)
      .eq("invoice_id", invoiceIdNum);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete line item", details: deleteError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
