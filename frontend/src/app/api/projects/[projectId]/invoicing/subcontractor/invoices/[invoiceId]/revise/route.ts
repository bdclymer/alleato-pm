import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/revise
// Transition invoice to revise_and_resubmit. Pre-condition: must be under_review.
export const POST = withApiGuardrails<{ projectId: string; invoiceId: string }>(
  "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/revise#POST",
  async ({ request, params }) => {
  
    const supabase = await createClient();
    const { projectId, invoiceId } = params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/revise#POST",
        message: "Authentication failed",
        status: 401,
        severity: "medium",
        details: { reason: authError.message },
        cause: authError,
      });
    }

    if (!user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/revise#POST", message: "Authentication required." });
    }

    const projectIdNum = parseInt(projectId, 10);
    const invoiceIdNum = parseInt(invoiceId, 10);

    const body = await request.json().catch(() => ({}));
    const { reason } = body as { reason?: string };

    const { data: invoice, error: fetchError } = await supabase
      .from("subcontractor_invoices")
      .select("id, status")
      .eq("id", invoiceIdNum)
      .eq("project_id", projectIdNum)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        throw new GuardrailError({
          code: "ROUTE_BINDING_MISSING",
          where: "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/revise#POST",
          message: "Invoice not found",
          status: 404,
          severity: "low",
        });
      }
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/revise#POST",
        message: "Failed to verify invoice",
        details: { reason: fetchError.message },
        cause: fetchError,
      });
    }

    if (invoice.status !== "under_review") {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/revise#POST",
        message: "Invoice must be Under Review to request revision",
        status: 400,
        severity: "low",
      });
    }

    const updatePayload: Record<string, unknown> = { status: "revise_and_resubmit" };
    if (reason) updatePayload.notes = reason;

    const { data: updated, error: updateError } = await supabase
      .from("subcontractor_invoices")
      .update(updatePayload)
      .eq("id", invoiceIdNum)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === "42501") {
        throw new GuardrailError({
          code: "AUTH_FORBIDDEN",
          where: "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/revise#POST",
          message: "Permission denied",
          status: 403,
          severity: "medium",
        });
      }
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/revise#POST",
        message: "Failed to request revision",
        details: { reason: updateError.message },
        cause: updateError,
      });
    }

    return NextResponse.json({
      data: updated,
      message: "Invoice returned for revision",
    });
    },
);
