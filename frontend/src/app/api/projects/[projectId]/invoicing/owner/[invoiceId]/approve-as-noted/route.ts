import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requirePermission } from "@/lib/permissions-guard";

// POST /api/projects/[projectId]/invoicing/owner/[invoiceId]/approve-as-noted
// Transition an owner invoice to approved_as_noted. Pre-condition: must be under_review.
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; invoiceId: string }> },
) {
  try {
    const { projectId, invoiceId } = await context.params;
    const projectIdNum = parseInt(projectId, 10);
    const invoiceIdNum = parseInt(invoiceId, 10);

    const guard = await requirePermission(projectIdNum, "contracts", "admin");
    if (guard.denied) return guard.response;

    const supabase = await createClient();

    const { data: invoice, error: fetchError } = await supabase
      .from("owner_invoices")
      .select(
        `
        *,
        prime_contracts!inner(project_id)
      `,
      )
      .eq("id", invoiceIdNum)
      .eq("prime_contracts.project_id", projectIdNum)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Invoice not found" },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { error: "Failed to verify invoice", details: fetchError.message },
        { status: 500 },
      );
    }

    if (invoice.status !== "under_review") {
      return NextResponse.json(
        { error: "Invoice must be Under Review to approve as noted" },
        { status: 400 },
      );
    }

    const { data: updatedInvoice, error: updateError } = await supabase
      .from("owner_invoices")
      .update({
        status: "approved_as_noted",
        approved_at: new Date().toISOString(),
      })
      .eq("id", invoiceIdNum)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === "42501") {
        return NextResponse.json(
          { error: "Permission denied" },
          { status: 403 },
        );
      }

      return NextResponse.json(
        { error: "Failed to approve invoice as noted", details: updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      data: updatedInvoice,
      message: "Invoice approved as noted successfully",
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
