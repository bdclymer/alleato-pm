import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/commitments/[id]/invoices
 * List all invoices for a specific commitment (prime contract)
 * Returns invoice list with calculated totals from line items
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

    // Query owner_invoices with line items to calculate amounts
    const { data: invoices, error } = await supabase
      .from("owner_invoices")
      .select(
        `
        id,
        invoice_number,
        period_start,
        period_end,
        status,
        approved_at,
        submitted_at,
        created_at,
        owner_invoice_line_items (
          approved_amount
        )
      `,
      )
      .eq("contract_id", id)
      .order("period_start", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Return empty array if no invoices found
    if (!invoices || invoices.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // Calculate totals from line items and format for frontend
    const formattedInvoices = invoices.map((invoice) => {
      // Sum approved amounts from line items
      const totalAmount =
        invoice.owner_invoice_line_items?.reduce(
          (sum, item) => sum + (item.approved_amount || 0),
          0,
        ) || 0;

      return {
        id: invoice.id,
        number: invoice.invoice_number || "Draft",
        date: invoice.period_start || invoice.approved_at || invoice.created_at,
        period_start: invoice.period_start,
        period_end: invoice.period_end,
        amount: totalAmount,
        paid_amount: 0, // TODO: Implement payment tracking
        status: invoice.status?.toLowerCase() || "draft",
        submitted_at: invoice.submitted_at,
        approved_at: invoice.approved_at,
      };
    });

    return NextResponse.json({ data: formattedInvoices });
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
