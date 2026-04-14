import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ projectId: string; paymentId: string }> };

async function getAuthedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { supabase, error: "Not authenticated" as const };
  return { supabase, user, error: null };
}

// GET /api/projects/[projectId]/invoicing/payments/[paymentId]
export const GET = withApiGuardrails(
  "projects/[projectId]/invoicing/payments/[paymentId]#GET",
  async ({ request, params }) => {
  
    const { supabase, error: authErr } = await getAuthedClient();
    if (authErr) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/invoicing/payments/[paymentId]#GET",
        message: authErr,
      });
    }

    const { projectId, paymentId } = params;
    const projectIdNum = parseInt(projectId, 10);
    const paymentIdNum = parseInt(paymentId, 10);

    const { data, error } = await supabase
      .from("invoice_payments")
      .select(
        `
        *,
        owner_invoice:owner_invoices(id, invoice_number),
        subcontractor_invoice:subcontractor_invoices(id, invoice_number)
      `,
      )
      .eq("id", paymentIdNum)
      .eq("project_id", projectIdNum)
      .maybeSingle();

    if (error) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "projects/[projectId]/invoicing/payments/[paymentId]#GET",
        message: "Failed to fetch payment.",
        details: error.message,
      });
    }
    if (!data) {
      throw new GuardrailError({
        code: "ROUTE_BINDING_MISSING",
        where: "projects/[projectId]/invoicing/payments/[paymentId]#GET",
        message: "Payment not found.",
      });
    }

    return NextResponse.json({ data });
    },
);

// PATCH /api/projects/[projectId]/invoicing/payments/[paymentId]
export const PATCH = withApiGuardrails(
  "projects/[projectId]/invoicing/payments/[paymentId]#PATCH",
  async ({ request, params }) => {
  
    const { supabase, error: authErr } = await getAuthedClient();
    if (authErr) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/invoicing/payments/[paymentId]#PATCH",
        message: authErr,
      });
    }

    const { projectId, paymentId } = params;
    const projectIdNum = parseInt(projectId, 10);
    const paymentIdNum = parseInt(paymentId, 10);

    const body = await request.json();

    const allowed = [
      "payment_number",
      "payment_method",
      "amount",
      "payment_date",
      "check_number",
      "notes",
    ] as const;

    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "projects/[projectId]/invoicing/payments/[paymentId]#PATCH",
        message: "No updatable fields provided.",
      });
    }

    const { data, error } = await supabase
      .from("invoice_payments")
      .update(updates)
      .eq("id", paymentIdNum)
      .eq("project_id", projectIdNum)
      .select()
      .single();

    if (error) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "projects/[projectId]/invoicing/payments/[paymentId]#PATCH",
        message: "Failed to update payment.",
        details: error.message,
      });
    }

    return NextResponse.json({ data });
    },
);

// DELETE /api/projects/[projectId]/invoicing/payments/[paymentId]
export const DELETE = withApiGuardrails(
  "projects/[projectId]/invoicing/payments/[paymentId]#DELETE",
  async ({ request, params }) => {
  
    const { supabase, error: authErr } = await getAuthedClient();
    if (authErr) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/invoicing/payments/[paymentId]#DELETE",
        message: authErr,
      });
    }

    const { projectId, paymentId } = params;
    const projectIdNum = parseInt(projectId, 10);
    const paymentIdNum = parseInt(paymentId, 10);

    const { error } = await supabase
      .from("invoice_payments")
      .delete()
      .eq("id", paymentIdNum)
      .eq("project_id", projectIdNum);

    if (error) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "projects/[projectId]/invoicing/payments/[paymentId]#DELETE",
        message: "Failed to delete payment.",
        details: error.message,
      });
    }

    return NextResponse.json({ success: true });
    },
);
