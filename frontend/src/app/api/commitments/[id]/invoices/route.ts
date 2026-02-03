import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/commitments/[id]/invoices
 * List invoice data for a specific commitment (subcontract or purchase order)
 *
 * For commitments (subcontracts/purchase orders), invoice data comes from
 * the SOV line items' billed_to_date column. Each SOV item represents a
 * line that can be invoiced, and billed_to_date tracks what has been invoiced.
 *
 * Returns:
 * - Invoice summary with total invoiced amount
 * - Breakdown by SOV line item showing what has been billed
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First determine commitment type from unified view
    const { data: unifiedData, error: unifiedError } = await supabase
      .from("commitments_unified")
      .select("commitment_type")
      .eq("id", id)
      .single();

    if (unifiedError || !unifiedData) {
      return NextResponse.json(
        { error: "Commitment not found" },
        { status: 404 },
      );
    }

    const isSubcontract = unifiedData.commitment_type === "subcontract";
    const sovTableName = isSubcontract
      ? "subcontract_sov_items"
      : "purchase_order_sov_items";
    const sovFkColumn = isSubcontract ? "subcontract_id" : "purchase_order_id";
    const totalsViewName = isSubcontract
      ? "subcontracts_with_totals"
      : "purchase_orders_with_totals";

    // Fetch financial totals from the _with_totals view
    const { data: totalsData, error: totalsError } = await (supabase as any)
      .from(totalsViewName)
      .select(
        "total_sov_amount, total_billed_to_date, total_amount_remaining, sov_line_count",
      )
      .eq("id", id)
      .single();

    if (totalsError) {
      return NextResponse.json({ error: totalsError.message }, { status: 400 });
    }

    // Fetch SOV line items with billing details
    const { data: sovItems, error: sovError } = await (supabase as any)
      .from(sovTableName)
      .select("*")
      .eq(sovFkColumn, id)
      .order("line_number", { ascending: true });

    if (sovError) {
      return NextResponse.json({ error: sovError.message }, { status: 400 });
    }

    // Calculate totals
    const totalContractAmount = Number(totalsData?.total_sov_amount) || 0;
    const totalInvoiced = Number(totalsData?.total_billed_to_date) || 0;
    const remainingToInvoice = Number(totalsData?.total_amount_remaining) || 0;

    // Build invoice summary - for commitments, we show the billing progress
    // based on SOV line items rather than separate invoice records
    const invoiceSummary = {
      total_contract_amount: totalContractAmount,
      total_invoiced: totalInvoiced,
      remaining_to_invoice: remainingToInvoice,
      percent_invoiced: totalContractAmount > 0
        ? Math.round((totalInvoiced / totalContractAmount) * 100)
        : 0,
      total_paid: 0, // Placeholder - needs payment tracking implementation
      remaining_balance: totalInvoiced, // Outstanding = invoiced but not paid
    };

    // Format SOV items as invoice line items (showing billing progress)
    const invoiceLineItems = (sovItems || []).map((item: any) => {
      const amount = Number(item.amount) || 0;
      const billedToDate = Number(item.billed_to_date) || 0;
      const remainingAmount = amount - billedToDate;
      const percentComplete = amount > 0 ? Math.round((billedToDate / amount) * 100) : 0;

      return {
        id: item.id,
        line_number: item.line_number || null,
        budget_code: item.budget_code || item.cost_code || null,
        description: item.description || "",
        scheduled_value: amount,
        billed_to_date: billedToDate,
        remaining_amount: remainingAmount,
        percent_complete: percentComplete,
      };
    });

    // Return data structure compatible with InvoicesTab
    // Also return legacy format for backward compatibility
    const responseData = {
      summary: invoiceSummary,
      line_items: invoiceLineItems,
      // Legacy format - return as array of "invoices" for compatibility with existing UI
      data: invoiceLineItems.length > 0 ? [{
        id: `${id}-billing-summary`,
        number: "Billing Summary",
        date: new Date().toISOString(),
        amount: totalInvoiced,
        paid_amount: 0,
        status: totalInvoiced > 0 ? "billed" : "pending",
      }] : [],
    };

    return NextResponse.json(responseData);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Internal server error", message: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/commitments/[id]/invoices
 * Create a new invoice for a commitment
 * Body: { invoice_number?, period_start?, period_end?, status?, billing_period_id? }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const {
      invoice_number,
      period_start,
      period_end,
      status = "draft",
      billing_period_id,
    } = body;

    // Validate contract_id exists
    const { data: contract, error: contractError } = await supabase
      .from("prime_contracts")
      .select("id")
      .eq("id", id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 },
      );
    }

    // Create invoice
    const { data: invoice, error: insertError } = await supabase
      .from("owner_invoices")
      .insert({
        contract_id: parseInt(id),
        invoice_number,
        period_start,
        period_end,
        status,
        billing_period_id,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Internal server error", message: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
