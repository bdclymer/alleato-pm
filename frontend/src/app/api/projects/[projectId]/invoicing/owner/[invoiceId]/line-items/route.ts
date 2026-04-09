import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

// Helper to verify invoice belongs to project and return editable status
async function verifyInvoice(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invoiceIdNum: number,
  projectIdNum: number,
) {
  const { data, error } = await supabase
    .from("owner_invoices")
    .select(`id, status, prime_contracts!inner(project_id)`)
    .eq("id", invoiceIdNum)
    .eq("prime_contracts.project_id", projectIdNum)
    .single();

  if (error) {
    if (error.code === "PGRST116") return { invoice: null, notFound: true, error: null };
    return { invoice: null, notFound: false, error };
  }
  return { invoice: data, notFound: false, error: null };
}

// GET /api/projects/[projectId]/invoicing/owner/[invoiceId]/line-items
// Return all line items for an invoice
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ projectId: string; invoiceId: string }> },
) {
  try {
    const supabase = await createClient();
    const { projectId, invoiceId } = await context.params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectIdNum = parseInt(projectId, 10);
    const invoiceIdNum = parseInt(invoiceId, 10);

    const { invoice, notFound, error } = await verifyInvoice(supabase, invoiceIdNum, projectIdNum);
    if (notFound) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    if (error || !invoice) return NextResponse.json({ error: "Failed to verify invoice" }, { status: 500 });

    const { data: lineItems, error: lineItemsError } = await supabase
      .from("owner_invoice_line_items")
      .select("*")
      .eq("invoice_id", invoiceIdNum)
      .order("sort_order", { ascending: true });

    if (lineItemsError) {
      return NextResponse.json(
        { error: "Failed to fetch line items", details: lineItemsError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: lineItems ?? [] });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// POST /api/projects/[projectId]/invoicing/owner/[invoiceId]/line-items
// Add a new line item to an invoice
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; invoiceId: string }> },
) {
  try {
    const supabase = await createClient();
    const { projectId, invoiceId } = await context.params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectIdNum = parseInt(projectId, 10);
    const invoiceIdNum = parseInt(invoiceId, 10);

    const { invoice, notFound, error: verifyError } = await verifyInvoice(supabase, invoiceIdNum, projectIdNum);
    if (notFound) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    if (verifyError || !invoice) return NextResponse.json({ error: "Failed to verify invoice" }, { status: 500 });

    const editableStatuses = ["draft", "revise_and_resubmit"];
    if (!editableStatuses.includes(invoice.status)) {
      return NextResponse.json(
        { error: `Invoice status '${invoice.status}' does not allow editing` },
        { status: 400 },
      );
    }

    const body = await request.json();
    const {
      description,
      category,
      scheduled_value = 0,
      work_completed_period = 0,
      materials_stored = 0,
      retainage_pct = 0,
      retainage_released = 0,
      sort_order = 0,
    } = body;

    const { data: lineItem, error: insertError } = await supabase
      .from("owner_invoice_line_items")
      .insert({
        invoice_id: invoiceIdNum,
        description: description ?? null,
        category: category ?? null,
        scheduled_value,
        work_completed_period,
        materials_stored,
        retainage_pct,
        retainage_released,
        sort_order,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to create line item", details: insertError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: lineItem }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// PATCH /api/projects/[projectId]/invoicing/owner/[invoiceId]/line-items
// Bulk update editable fields on line items
// Body: Array of { id, work_completed_period?, materials_stored?, retainage_pct?, retainage_released? }
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; invoiceId: string }> },
) {
  try {
    const supabase = await createClient();
    const { projectId, invoiceId } = await context.params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectIdNum = parseInt(projectId, 10);
    const invoiceIdNum = parseInt(invoiceId, 10);

    const { invoice, notFound, error: verifyError } = await verifyInvoice(supabase, invoiceIdNum, projectIdNum);
    if (notFound) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    if (verifyError || !invoice) return NextResponse.json({ error: "Failed to verify invoice" }, { status: 500 });

    const editableStatuses = ["draft", "revise_and_resubmit"];
    if (!editableStatuses.includes(invoice.status)) {
      return NextResponse.json(
        { error: `Invoice status '${invoice.status}' does not allow editing` },
        { status: 400 },
      );
    }

    const body = await request.json();
    const updates = Array.isArray(body) ? body : body?.updates;
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "Request body must include a non-empty 'updates' array of line item updates" },
        { status: 400 },
      );
    }

    const ALLOWED_UPDATE_FIELDS = [
      "work_completed_period",
      "materials_stored",
      "retainage_pct",
      "retainage_amount",
      "retainage_released",
    ] as const;

    type AllowedField = (typeof ALLOWED_UPDATE_FIELDS)[number];

    // Perform each update — use individual upserts scoped to the invoice
    const results: unknown[] = [];
    for (const item of updates) {
      const { id, ...rest } = item as { id: number } & Partial<Record<AllowedField, number>>;
      if (typeof id !== "number") continue;

      const updatePayload: Partial<Record<AllowedField, number>> = {};
      for (const field of ALLOWED_UPDATE_FIELDS) {
        if (field in rest && typeof rest[field] === "number") {
          updatePayload[field] = rest[field];
        }
      }
      if (Object.keys(updatePayload).length === 0) continue;

      const { data: updated, error: updateError } = await supabase
        .from("owner_invoice_line_items")
        .update(updatePayload)
        .eq("id", id)
        .eq("invoice_id", invoiceIdNum)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json(
          { error: `Failed to update line item ${id}`, details: updateError.message },
          { status: 500 },
        );
      }

      results.push(updated);
    }

    return NextResponse.json({ data: results });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
