import { NextResponse } from "next/server";

import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";

// GET /api/projects/[projectId]/invoicing/payments
// List all payments for a project, joined with owner/subcontractor invoice info.
export const GET = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/invoicing/payments#GET",
  async ({ params }) => {
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
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/invoicing/payments#GET",
        message: "Authentication required.",
      });
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
        ...row,
        invoice_type,
        invoice_number,
      };
    });

    return NextResponse.json({ data: enriched });
  },
);

// POST /api/projects/[projectId]/invoicing/payments
// Invoice payments are read-only Acumatica inbound records.
export const POST = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/invoicing/payments#POST",
  async () => {
    throw new GuardrailError({
      code: "READ_ONLY_RESOURCE",
      where: "projects/[projectId]/invoicing/payments#POST",
      message:
        "Invoice payments are synced from Acumatica and cannot be created in Alleato.",
      status: 405,
      severity: "low",
    });
  },
);
