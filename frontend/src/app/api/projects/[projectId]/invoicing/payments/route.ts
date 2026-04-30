import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncLinkedOwnerPaymentApplication } from "@/lib/invoicing/owner-payment-application-sync";

// GET /api/projects/[projectId]/invoicing/payments
// List all payments for a project, joined with owner/subcontractor invoice info.
export const GET = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/invoicing/payments#GET",
  async ({ request, params }) => {
  
    const supabase = await createClient();
    const { projectId } = params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/invoicing/payments#GET",
        message: "Authentication failed.",
        details: authError.message,
      });
    }
    if (!user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/invoicing/payments#GET", message: "Authentication required." });
    }

    const projectIdNum = parseInt(projectId, 10);
    if (!Number.isFinite(projectIdNum)) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "projects/[projectId]/invoicing/payments#GET",
        message: "Invalid project id.",
      });
    }

    const { data: payments, error: paymentsError } = await supabase
      .from("invoice_payments")
      .select(
        `
        *,
        owner_invoice:owner_invoices(id, invoice_number),
        subcontractor_invoice:subcontractor_invoices(id, invoice_number)
      `,
      )
      .eq("project_id", projectIdNum)
      .order("payment_date", { ascending: false, nullsFirst: false });

    if (paymentsError) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "projects/[projectId]/invoicing/payments#GET",
        message: "Failed to fetch payments.",
        details: paymentsError.message,
      });
    }

    const enriched = (payments ?? []).map((row) => {
      const owner = Array.isArray(row.owner_invoice)
        ? row.owner_invoice[0]
        : (row.owner_invoice as { id: number; invoice_number: string | null } | null);
      const sub = Array.isArray(row.subcontractor_invoice)
        ? row.subcontractor_invoice[0]
        : (row.subcontractor_invoice as { id: number; invoice_number: string | null } | null);

      const {
        owner_invoice: _o,
        subcontractor_invoice: _s,
        ...rest
      } = row;

      const invoice_type: "owner" | "subcontractor" | null = row.owner_invoice_id
        ? "owner"
        : row.subcontractor_invoice_id
          ? "subcontractor"
          : null;

      const invoice_number =
        invoice_type === "owner"
          ? (owner?.invoice_number ?? null)
          : invoice_type === "subcontractor"
            ? (sub?.invoice_number ?? null)
            : null;

      return {
        ...rest,
        invoice_type,
        invoice_number,
      };
    });

    return NextResponse.json({ data: enriched });
    },
);

// POST /api/projects/[projectId]/invoicing/payments
// Create a new payment. Requires exactly one of owner_invoice_id / subcontractor_invoice_id.
export const POST = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/invoicing/payments#POST",
  async ({ request, params }) => {
  
    const supabase = await createClient();
    const { projectId } = params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/invoicing/payments#POST",
        message: "Authentication failed.",
        details: authError.message,
      });
    }
    if (!user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/invoicing/payments#POST", message: "Authentication required." });
    }

    const projectIdNum = parseInt(projectId, 10);
    if (!Number.isFinite(projectIdNum)) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "projects/[projectId]/invoicing/payments#POST",
        message: "Invalid project id.",
      });
    }

    const body = await request.json();
    const {
      owner_invoice_id,
      subcontractor_invoice_id,
      payment_number,
      payment_method,
      amount,
      payment_date,
      check_number,
      notes,
    } = body ?? {};

    if (amount === undefined || amount === null || Number.isNaN(Number(amount))) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "projects/[projectId]/invoicing/payments#POST",
        message: "amount is required.",
      });
    }
    if (!payment_date) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "projects/[projectId]/invoicing/payments#POST",
        message: "payment_date is required.",
      });
    }
    if (!payment_method) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "projects/[projectId]/invoicing/payments#POST",
        message: "payment_method is required.",
      });
    }

    const hasOwner = owner_invoice_id !== undefined && owner_invoice_id !== null && owner_invoice_id !== "";
    const hasSub =
      subcontractor_invoice_id !== undefined &&
      subcontractor_invoice_id !== null &&
      subcontractor_invoice_id !== "";

    if (hasOwner === hasSub) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "projects/[projectId]/invoicing/payments#POST",
        message:
          "Provide exactly one of owner_invoice_id or subcontractor_invoice_id.",
      });
    }

    // Verify the referenced invoice belongs to this project.
    if (hasOwner) {
      const { data: ownerInv, error: oErr } = await supabase
        .from("owner_invoices")
        .select("id, net_amount, gross_amount, prime_contracts!inner(project_id)")
        .eq("id", Number(owner_invoice_id))
        .eq("prime_contracts.project_id", projectIdNum)
        .maybeSingle();
      if (oErr || !ownerInv) {
        throw new GuardrailError({
          code: "ROUTE_BINDING_MISSING",
          where: "projects/[projectId]/invoicing/payments#POST",
          message: "Owner invoice not found for this project.",
        });
      }
    } else {
      const { data: subInv, error: sErr } = await supabase
        .from("subcontractor_invoices")
        .select("id, project_id")
        .eq("id", Number(subcontractor_invoice_id))
        .eq("project_id", projectIdNum)
        .maybeSingle();
      if (sErr || !subInv) {
        throw new GuardrailError({
          code: "ROUTE_BINDING_MISSING",
          where: "projects/[projectId]/invoicing/payments#POST",
          message: "Subcontractor invoice not found for this project.",
        });
      }
    }

    const { data: payment, error: insertError } = await supabase
      .from("invoice_payments")
      .insert({
        project_id: projectIdNum,
        owner_invoice_id: hasOwner ? Number(owner_invoice_id) : null,
        subcontractor_invoice_id: hasSub ? Number(subcontractor_invoice_id) : null,
        payment_number: payment_number ?? null,
        payment_method,
        amount: Number(amount),
        payment_date,
        check_number: check_number ?? null,
        notes: notes ?? null,
      })
      .select()
      .single();

    if (insertError) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "projects/[projectId]/invoicing/payments#POST",
        message: "Failed to create payment.",
        details: insertError.message,
      });
    }

    if (hasOwner) {
      const ownerInvoiceId = Number(owner_invoice_id);
      const { data: ownerInvoice, error: ownerInvoiceError } = await supabase
        .from("owner_invoices")
        .select("id, prime_contract_id, payment_application_id, net_amount, gross_amount")
        .eq("id", ownerInvoiceId)
        .single();

      if (ownerInvoiceError) {
        throw new GuardrailError({
          code: "INTERNAL_ERROR",
          where: "projects/[projectId]/invoicing/payments#POST",
          message: "Failed to refresh owner invoice payment totals.",
          details: ownerInvoiceError.message,
        });
      }

      const { data: ownerPayments, error: ownerPaymentsError } = await supabase
        .from("invoice_payments")
        .select("amount")
        .eq("project_id", projectIdNum)
        .eq("owner_invoice_id", ownerInvoiceId);

      if (ownerPaymentsError) {
        throw new GuardrailError({
          code: "INTERNAL_ERROR",
          where: "projects/[projectId]/invoicing/payments#POST",
          message: "Failed to refresh owner invoice payment totals.",
          details: ownerPaymentsError.message,
        });
      }

      const totalPaid = (ownerPayments ?? []).reduce(
        (sum, row) => sum + (row.amount || 0),
        0,
      );
      const invoiceTotal =
        (ownerInvoice.net_amount ?? 0) ||
        (ownerInvoice.gross_amount ?? 0);
      const statusUpdate =
        invoiceTotal > 0 && totalPaid >= invoiceTotal ? "paid" : undefined;

      const { error: ownerUpdateError } = await supabase
        .from("owner_invoices")
        .update({
          paid_amount: totalPaid,
          ...(statusUpdate ? { status: statusUpdate } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", ownerInvoiceId);

      if (ownerUpdateError) {
        throw new GuardrailError({
          code: "INTERNAL_ERROR",
          where: "projects/[projectId]/invoicing/payments#POST",
          message: "Failed to update owner invoice payment status.",
          details: ownerUpdateError.message,
        });
      }

      if (statusUpdate === "paid") {
        await syncLinkedOwnerPaymentApplication({
          supabase,
          projectId: projectIdNum,
          invoice: ownerInvoice,
          status: "approved",
          where: "projects/[projectId]/invoicing/payments#POST",
        });
      }
    }

    return NextResponse.json({ data: payment }, { status: 201 });
    },
);
