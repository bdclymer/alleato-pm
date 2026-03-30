import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/commitments/[id]/invoices
 *
 * Retrieves invoice/billing data for a specific commitment (subcontract or purchase order).
 *
 * For commitments, invoice data is derived from the SOV line items' billed_to_date
 * column rather than separate invoice records. Each SOV item represents a
 * line that can be invoiced, and billed_to_date tracks cumulative billing.
 *
 * @route GET /api/commitments/[id]/invoices
 * @param {string} id - Commitment UUID
 *
 * @returns {object} 200 - Invoice data with structure:
 *   {
 *     summary: {
 *       total_contract_amount: number,
 *       total_invoiced: number,
 *       remaining_to_invoice: number,
 *       percent_invoiced: number,
 *       total_paid: number,
 *       remaining_balance: number
 *     },
 *     line_items: Array<{
 *       id, line_number, budget_code, description,
 *       scheduled_value, billed_to_date, remaining_amount, percent_complete
 *     }>,
 *     data: Array<{ id, number, date, amount, paid_amount, status }> // Legacy format
 *   }
 * @returns {object} 401 - Unauthorized (no user session)
 * @returns {object} 404 - Commitment not found
 * @returns {object} 400 - Database query error
 * @returns {object} 500 - Internal server error
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
 *
 * Creates a new invoice record for a commitment. The invoice is stored in the
 * `owner_invoices` table linked to the commitment's contract_id.
 *
 * @route POST /api/commitments/[id]/invoices
 * @param {string} id - Commitment UUID (used as contract_id)
 *
 * @requestBody {object}
 *   - invoice_number {string} [optional] - Custom invoice number
 *   - period_start {string} [optional] - Billing period start date (ISO)
 *   - period_end {string} [optional] - Billing period end date (ISO)
 *   - status {string} [default="draft"] - Invoice status
 *   - billing_period_id {string} [optional] - Associated billing period ID
 *
 * @returns {object} 201 - Created invoice: { data: InvoiceRecord }
 * @returns {object} 401 - Unauthorized (no user session)
 * @returns {object} 404 - Contract not found
 * @returns {object} 400 - Database insert error
 * @returns {object} 500 - Internal server error
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
        prime_contract_id: id,
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
