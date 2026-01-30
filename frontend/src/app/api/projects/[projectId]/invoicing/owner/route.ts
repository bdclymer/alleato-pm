import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Fetch owner invoices with line items, scoped to the project via contracts
    const { data: invoices, error: invoicesError } = await supabase
      .from("owner_invoices")
      .select(
        `
        *,
        owner_invoice_line_items(*),
        contracts!inner(project_id)
      `,
      )
      .eq("contracts.project_id", projectIdNum)
      .order("created_at", { ascending: false});

    if (invoicesError) {
      return NextResponse.json(
        { error: "Failed to fetch owner invoices", details: invoicesError.message },
        { status: 500 },
      );
    }

    // Compute total_amount for each invoice (sum of line item approved_amount)
    const invoicesWithTotals = (invoices || []).map((invoice) => {
      const lineItems = invoice.owner_invoice_line_items || [];
      const total_amount = lineItems.reduce(
        (sum: number, item: { approved_amount: number | null }) => sum + (item.approved_amount || 0),
        0,
      );

      // Remove the contracts join data from response
      const { contracts, ...invoiceData } = invoice;

      return {
        ...invoiceData,
        total_amount,
      };
    });

    return NextResponse.json({ data: invoicesWithTotals });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
