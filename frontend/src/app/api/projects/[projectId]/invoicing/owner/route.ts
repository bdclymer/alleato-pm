import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/projects/[projectId]/invoicing/owner
// Create a new owner invoice for a project
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const supabase = await createClient();
    const { projectId } = await context.params;

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
    const body = await request.json();
    const { prime_contract_id, invoice_number, period_start, period_end, billing_period_id, status } = body;

    // Validate required fields
    if (!prime_contract_id) {
      return NextResponse.json(
        { error: "prime_contract_id is required" },
        { status: 400 },
      );
    }

    // Verify the prime contract belongs to this project
    const { data: contract, error: contractError } = await supabase
      .from("prime_contracts")
      .select("id")
      .eq("id", prime_contract_id)
      .eq("project_id", projectIdNum)
      .single();

    if (contractError || !contract) {
      return NextResponse.json(
        { error: "Contract not found or does not belong to this project" },
        { status: 404 },
      );
    }

    // Insert the new owner invoice
    const { data: invoice, error: insertError } = await supabase
      .from("owner_invoices")
      .insert({
        prime_contract_id,
        invoice_number: invoice_number ?? null,
        period_start: period_start ?? null,
        period_end: period_end ?? null,
        billing_period_id: billing_period_id ?? null,
        status: status ?? "draft",
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to create owner invoice", details: insertError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// GET /api/projects/[projectId]/invoicing/owner
// Fetch all owner invoices for a project with their line items
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const supabase = await createClient();
    const { projectId } = await context.params;

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

    // Parse optional query filters
    const { searchParams } = new URL(request.url);
    const billingPeriodId = searchParams.get("billing_period_id");
    const primeContractId = searchParams.get("prime_contract_id");

    // Build query scoped to the project via prime_contracts join
    let query = supabase
      .from("owner_invoices")
      .select(
        `
        *,
        owner_invoice_line_items(*),
        prime_contracts!inner(id, project_id, contract_number, title, contract_amount)
      `,
      )
      .eq("prime_contracts.project_id", projectIdNum)
      .order("created_at", { ascending: false });

    if (billingPeriodId) {
      query = query.eq("billing_period_id", billingPeriodId);
    }
    if (primeContractId) {
      query = query.eq("prime_contract_id", primeContractId);
    }

    const { data: invoices, error: invoicesError } = await query;

    if (invoicesError) {
      return NextResponse.json(
        { error: "Failed to fetch owner invoices", details: invoicesError.message },
        { status: 500 },
      );
    }

    // Compute financial summary for each invoice from line items
    const invoicesWithTotals = (invoices || []).map((invoice) => {
      const lineItems = invoice.owner_invoice_line_items || [];
      const gross_amount = lineItems.reduce(
        (sum: number, item: { scheduled_value: number | null }) => sum + (item.scheduled_value || 0),
        0,
      );
      const net_amount = lineItems.reduce(
        (sum: number, item: { approved_amount: number | null }) => sum + (item.approved_amount || 0),
        0,
      );
      const total_amount = net_amount;

      const pc = Array.isArray(invoice.prime_contracts)
        ? invoice.prime_contracts[0]
        : invoice.prime_contracts as { contract_number: string | null; title: string | null; contract_amount: number | null } | null;

      const { prime_contracts: _pc, ...invoiceData } = invoice;

      return {
        ...invoiceData,
        contract_number: pc?.contract_number ?? null,
        contract_title: pc?.title ?? null,
        total_contract_amount: pc?.contract_amount ?? null,
        gross_amount: invoice.gross_amount ?? gross_amount,
        net_amount: invoice.net_amount ?? net_amount,
        paid_amount: invoice.paid_amount ?? null,
        percent_complete: invoice.percent_complete ?? null,
        total_amount,
      };
    });

    return NextResponse.json({ data: invoicesWithTotals });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
