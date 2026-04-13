import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requirePermission } from "@/lib/permissions-guard";

// POST /api/projects/[projectId]/invoicing/owner/[invoiceId]/submit
// Submit an invoice for approval
export const POST = withApiGuardrails<{ projectId: string; invoiceId: string }>(
  "projects/[projectId]/invoicing/owner/[invoiceId]/submit#POST",
  async ({ request }) => {
  
    const { projectId, invoiceId } = await context.params;
    const projectIdNum = parseInt(projectId, 10);
    const invoiceIdNum = parseInt(invoiceId, 10);

    const guard = await requirePermission(projectIdNum, "contracts", "write");
    if (guard.denied) return guard.response;

    const supabase = await createClient();

    // First, verify the invoice exists and belongs to the project
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

    // Only draft or revise_and_resubmit invoices can be submitted
    const submittableStatuses = ["draft", "revise_and_resubmit"];
    if (!submittableStatuses.includes(invoice.status)) {
      return NextResponse.json(
        { error: "Invoice must be in Draft or Revise & Resubmit status to submit" },
        { status: 400 },
      );
    }

    // Update invoice status to under_review (Procore: UNDER REVIEW)
    const { data: updatedInvoice, error: updateError } = await supabase
      .from("owner_invoices")
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
      data: updatedInvoice,
      message: "Invoice submitted successfully",
    });
    },
);
