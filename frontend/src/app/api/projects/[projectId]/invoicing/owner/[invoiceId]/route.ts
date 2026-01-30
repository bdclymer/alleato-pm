import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/projects/[projectId]/invoicing/owner/[invoiceId]
// Fetch a single owner invoice with line items
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; invoiceId: string }> },
) {
  try {
    const supabase = await createClient();
    const { projectId, invoiceId } = await context.params;

    // Check authentication
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

    // Fetch invoice with line items, verify it belongs to the project
    const { data: invoice, error: invoiceError } = await supabase
      .from("owner_invoices")
      .select(
        `
        *,
        owner_invoice_line_items(*),
        contracts!inner(project_id)
      `,
      )
      .eq("id", invoiceIdNum)
      .eq("contracts.project_id", projectIdNum)
      .single();

    if (invoiceError) {
      // PGRST116 = no rows returned
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

    // Compute total_amount
    const lineItems = invoice.owner_invoice_line_items || [];
    const total_amount = lineItems.reduce(
      (sum: number, item: { approved_amount: number | null }) => sum + (item.approved_amount || 0),
      0,
    );

    // Remove the contracts join data from response
    const { contracts, ...invoiceData } = invoice;

    return NextResponse.json({
      data: {
        ...invoiceData,
        total_amount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/projects/[projectId]/invoicing/owner/[invoiceId]
// Delete an owner invoice (only if not approved or paid)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; invoiceId: string }> },
) {
  try {
    const supabase = await createClient();
    const { projectId, invoiceId } = await context.params;

    // Check authentication
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

    // First, verify the invoice exists and belongs to the project
    const { data: invoice, error: fetchError } = await supabase
      .from("owner_invoices")
      .select(
        `
        *,
        contracts!inner(project_id)
      `,
      )
      .eq("id", invoiceIdNum)
      .eq("contracts.project_id", projectIdNum)
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

    // Only allow deletion if status is not approved or paid
    if (invoice.status === "approved" || invoice.status === "paid") {
      return NextResponse.json(
        {
          error: "Cannot delete approved or paid invoices",
          message: `Invoice status is '${invoice.status}'. Only draft, submitted, or void invoices can be deleted.`,
        },
        { status: 400 },
      );
    }

    // Delete the invoice (cascade will handle line items)
    const { error: deleteError } = await supabase
      .from("owner_invoices")
      .delete()
      .eq("id", invoiceIdNum);

    if (deleteError) {
      // 42501 = RLS policy blocked
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

    return NextResponse.json({
      message: "Invoice deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
