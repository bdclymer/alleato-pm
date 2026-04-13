import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requirePermission } from "@/lib/permissions-guard";

// POST /api/projects/[projectId]/invoicing/owner/[invoiceId]/void
// Void an owner invoice. Pre-condition: must not already be paid or void.
export const POST = withApiGuardrails<{ projectId: string; invoiceId: string }>(
  "projects/[projectId]/invoicing/owner/[invoiceId]/void#POST",
  async ({ request, params }) => {
  
    const { projectId, invoiceId } = params;
    const projectIdNum = parseInt(projectId, 10);

    const guard = await requirePermission(projectIdNum, "contracts", "admin");
    if (guard.denied) return guard.response;

    const supabase = await createClient();

    let reason: string | null = null;
    try {
      const body = await request.json();
      if (body && typeof body.reason === "string") {
        reason = body.reason.trim() || null;
      }
    } catch {
      // No body is fine
    }

    const invoiceIdNum = parseInt(invoiceId, 10);

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

    if (invoice.status === "paid" || invoice.status === "void") {
      return NextResponse.json(
        { error: `Invoice cannot be voided from status "${invoice.status}"` },
        { status: 400 },
      );
    }

    // Append the void reason to notes (preserving any prior notes)
    const voidNote = reason
      ? `[Voided ${new Date().toISOString().split("T")[0]}] ${reason}`
      : null;
    const mergedNotes = voidNote
      ? invoice.notes
        ? `${invoice.notes}\n\n${voidNote}`
        : voidNote
      : invoice.notes;

    const { data: updatedInvoice, error: updateError } = await supabase
      .from("owner_invoices")
      .update({
        status: "void",
        notes: mergedNotes,
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
        { error: "Failed to void invoice", details: updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      data: updatedInvoice,
      message: "Invoice voided successfully",
    });
    },
);
