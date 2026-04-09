import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

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
export async function GET(_request: NextRequest, context: Ctx) {
  try {
    const { supabase, error: authErr } = await getAuthedClient();
    if (authErr) return NextResponse.json({ error: authErr }, { status: 401 });

    const { projectId, paymentId } = await context.params;
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
      return NextResponse.json(
        { error: "Failed to fetch payment", details: error.message },
        { status: 500 },
      );
    }
    if (!data) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

// PATCH /api/projects/[projectId]/invoicing/payments/[paymentId]
export async function PATCH(request: NextRequest, context: Ctx) {
  try {
    const { supabase, error: authErr } = await getAuthedClient();
    if (authErr) return NextResponse.json({ error: authErr }, { status: 401 });

    const { projectId, paymentId } = await context.params;
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
      return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("invoice_payments")
      .update(updates)
      .eq("id", paymentIdNum)
      .eq("project_id", projectIdNum)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to update payment", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ data });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

// DELETE /api/projects/[projectId]/invoicing/payments/[paymentId]
export async function DELETE(_request: NextRequest, context: Ctx) {
  try {
    const { supabase, error: authErr } = await getAuthedClient();
    if (authErr) return NextResponse.json({ error: authErr }, { status: 401 });

    const { projectId, paymentId } = await context.params;
    const projectIdNum = parseInt(projectId, 10);
    const paymentIdNum = parseInt(paymentId, 10);

    const { error } = await supabase
      .from("invoice_payments")
      .delete()
      .eq("id", paymentIdNum)
      .eq("project_id", projectIdNum);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete payment", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
