import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

// GET /api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]
// Fetch a single subcontractor invoice with line items, commitment, and billing period joins
export async function GET(
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

    const { data: invoice, error: invoiceError } = await supabase
      .from("subcontractor_invoices")
      .select(
        `
        *,
        subcontractor_invoice_line_items(*),
        subcontracts(contract_number, title, contract_company_id, default_retainage_percent),
        purchase_orders(contract_number, title, contract_company_id, default_retainage_percent),
        billing_periods(name, start_date, end_date)
        `,
      )
      .eq("id", invoiceIdNum)
      .eq("project_id", projectIdNum)
      .single();

    if (invoiceError) {
      if (invoiceError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Invoice not found" },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { error: "Failed to fetch invoice", details: invoiceError.message },
        { status: 500 },
      );
    }

    const sc = invoice.subcontracts as {
      contract_number: string | null;
      title: string | null;
      contract_company_id: string | null;
      default_retainage_percent: number | null;
    } | null;
    const po = invoice.purchase_orders as {
      contract_number: string | null;
      title: string | null;
      contract_company_id: string | null;
      default_retainage_percent: number | null;
    } | null;
    const bp = invoice.billing_periods as {
      name: string | null;
      start_date: string | null;
      end_date: string | null;
    } | null;

    const { subcontracts: _sc, purchase_orders: _po, billing_periods: _bp, ...invoiceData } = invoice;

    return NextResponse.json({
      data: {
        ...invoiceData,
        contract_number: sc?.contract_number ?? po?.contract_number ?? null,
        contract_title: sc?.title ?? po?.title ?? null,
        contract_company_id: sc?.contract_company_id ?? po?.contract_company_id ?? null,
        contract_retainage_percent: sc?.default_retainage_percent ?? po?.default_retainage_percent ?? null,
        billing_period_name: bp?.name ?? null,
        billing_period_start: bp?.start_date ?? null,
        billing_period_end: bp?.end_date ?? null,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// PATCH /api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]
// Update a subcontractor invoice (only when status is draft or revise_and_resubmit)
export async function PATCH(
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

    const body = await request.json();
    const allowedFields = [
      "invoice_number",
      "period_start",
      "period_end",
      "billing_date",
      "notes",
      "status",
    ];
    const updatePayload: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updatePayload[field] = body[field] === "" ? null : body[field];
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided for update" },
        { status: 400 },
      );
    }

    // Verify the invoice exists and belongs to the project
    const { data: existing, error: fetchError } = await supabase
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

    const editableStatuses = ["draft", "revise_and_resubmit"];
    if (!editableStatuses.includes(existing.status)) {
      return NextResponse.json(
        {
          error: "Cannot edit invoice",
          message: `Invoice status is '${existing.status}'. Only draft or revise-and-resubmit invoices can be edited.`,
        },
        { status: 400 },
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("subcontractor_invoices")
      .update(updatePayload)
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
        { error: "Failed to update invoice", details: updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// DELETE /api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]
// Delete a subcontractor invoice (blocked if status is approved or paid)
export async function DELETE(
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

    if (invoice.status === "approved" || invoice.status === "paid") {
      return NextResponse.json(
        {
          error: "Cannot delete approved or paid invoices",
          message: `Invoice status is '${invoice.status}'. Only draft, submitted, or void invoices can be deleted.`,
        },
        { status: 400 },
      );
    }

    const { error: deleteError } = await supabase
      .from("subcontractor_invoices")
      .delete()
      .eq("id", invoiceIdNum);

    if (deleteError) {
      if (deleteError.code === "42501") {
        return NextResponse.json(
          { error: "Permission denied" },
          { status: 403 },
        );
      }
      return NextResponse.json(
        { error: "Failed to delete invoice", details: deleteError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: "Invoice deleted successfully" });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
