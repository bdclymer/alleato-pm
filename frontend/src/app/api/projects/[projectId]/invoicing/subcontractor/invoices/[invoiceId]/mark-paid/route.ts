import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/mark-paid
// Records a payment against an approved subcontractor invoice and transitions it to paid.
export const POST = withApiGuardrails<{ projectId: string; invoiceId: string }>(
  "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/mark-paid#POST",
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
        where: "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/mark-paid#POST",
        message: "Authentication failed",
        status: 401,
        severity: "medium",
        details: { reason: authError.message },
        cause: authError,
      });
    }

    if (!user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/mark-paid#POST",
        message: "Authentication required.",
      });
    }

    const projectIdNum = parseInt(projectId, 10);
    const invoiceIdNum = parseInt(invoiceId, 10);
    const body = await request.json().catch(() => ({}));
    const {
      amount,
      payment_date,
      payment_method,
      payment_number,
      check_number,
      notes,
    } = body as {
      amount?: number | string;
      payment_date?: string;
      payment_method?: string;
      payment_number?: string;
      check_number?: string;
      notes?: string;
    };

    const paymentAmount = Number(amount);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/mark-paid#POST",
        message: "Payment amount must be greater than zero.",
        status: 400,
        severity: "low",
      });
    }

    if (!payment_date) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/mark-paid#POST",
        message: "Payment date is required.",
        status: 400,
        severity: "low",
      });
    }

    if (!payment_method) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/mark-paid#POST",
        message: "Payment method is required.",
        status: 400,
        severity: "low",
      });
    }

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
          where: "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/mark-paid#POST",
          message: "Invoice not found",
          status: 404,
          severity: "low",
        });
      }
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/mark-paid#POST",
        message: "Failed to verify invoice",
        details: { reason: fetchError.message },
        cause: fetchError,
      });
    }

    if (!["approved", "approved_as_noted"].includes(invoice.status)) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/mark-paid#POST",
        message: "Invoice must be Approved before it can be marked paid.",
        status: 400,
        severity: "low",
        details: { currentStatus: invoice.status },
      });
    }

    const { data: payment, error: paymentError } = await supabase
      .from("invoice_payments")
      .insert({
        project_id: projectIdNum,
        subcontractor_invoice_id: invoiceIdNum,
        owner_invoice_id: null,
        amount: paymentAmount,
        payment_date,
        payment_method,
        payment_number: payment_number?.trim() || null,
        check_number: check_number?.trim() || null,
        notes: notes?.trim() || null,
      })
      .select()
      .single();

    if (paymentError) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/mark-paid#POST",
        message: "Failed to record payment.",
        details: { reason: paymentError.message },
        cause: paymentError,
      });
    }

    const { data: updated, error: updateError } = await supabase
      .from("subcontractor_invoices")
      .update({ status: "paid" })
      .eq("id", invoiceIdNum)
      .select()
      .single();

    if (updateError) {
      await supabase.from("invoice_payments").delete().eq("id", payment.id);
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/mark-paid#POST",
        message: "Failed to mark invoice paid.",
        details: { reason: updateError.message },
        cause: updateError,
      });
    }

    await supabase.from("subcontractor_invoice_audit_log").insert({
      invoice_id: invoiceIdNum,
      actor_user_id: user.id,
      actor_email: user.email ?? null,
      event_type: "payment.recorded",
      notes: `Recorded payment ${payment.payment_number ? `#${payment.payment_number} ` : ""}for $${paymentAmount.toFixed(2)}`,
    });

    return NextResponse.json({
      data: { invoice: updated, payment },
      message: "Invoice marked paid successfully",
    });
  },
);
