import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

// POST /api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/submit
// Transition invoice to under_review. Pre-condition: must be draft or revise_and_resubmit.
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

    if (authError) {
      return NextResponse.json(
        { error: "Authentication failed", details: authError.message },
        { status: 401 },
      );
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const projectIdNum = parseInt(projectId, 10);
    const invoiceIdNum = parseInt(invoiceId, 10);

    const { data: invoice, error: fetchError } = await supabase
      .from("subcontractor_invoices")
      .select("id, status")
      .eq("id", invoiceIdNum)
      .eq("project_id", projectIdNum)
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

    const submittableStatuses = ["draft", "revise_and_resubmit"];
    if (!submittableStatuses.includes(invoice.status)) {
      return NextResponse.json(
        { error: "Invoice must be in Draft or Revise & Resubmit status to submit" },
        { status: 400 },
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("subcontractor_invoices")
      .update({
        status: "under_review",
        submitted_at: new Date().toISOString(),
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
        { error: "Failed to submit invoice", details: updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      data: updated,
      message: "Invoice submitted successfully",
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
