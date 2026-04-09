import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

// GET /api/projects/[projectId]/invoicing/subcontractor/invoices
// List subcontractor invoices for a project with commitment and billing period joins
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const supabase = await createClient();
    const { projectId } = await context.params;

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

    const { searchParams } = new URL(request.url);
    const billingPeriodId = searchParams.get("billing_period_id");
    const subcontractId = searchParams.get("subcontract_id");
    const purchaseOrderId = searchParams.get("purchase_order_id");
    const status = searchParams.get("status");

    let query = supabase
      .from("subcontractor_invoices")
      .select(
        `
        *,
        subcontracts(contract_number, title, contract_company_id),
        purchase_orders(contract_number, title, contract_company_id),
        billing_periods(name, start_date, end_date)
        `,
      )
      .eq("project_id", projectIdNum)
      .order("created_at", { ascending: false });

    if (billingPeriodId) {
      query = query.eq("billing_period_id", billingPeriodId);
    }
    if (subcontractId) {
      query = query.eq("subcontract_id", subcontractId);
    }
    if (purchaseOrderId) {
      query = query.eq("purchase_order_id", purchaseOrderId);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data: invoices, error: invoicesError } = await query;

    if (invoicesError) {
      return NextResponse.json(
        { error: "Failed to fetch subcontractor invoices", details: invoicesError.message },
        { status: 500 },
      );
    }

    // Flatten joined relations into top-level fields
    const enriched = (invoices || []).map((invoice) => {
      const sc = invoice.subcontracts as {
        contract_number: string | null;
        title: string | null;
        contract_company_id: string | null;
      } | null;
      const po = invoice.purchase_orders as {
        contract_number: string | null;
        title: string | null;
        contract_company_id: string | null;
      } | null;
      const bp = invoice.billing_periods as {
        name: string | null;
        start_date: string | null;
        end_date: string | null;
      } | null;

      const { subcontracts: _sc, purchase_orders: _po, billing_periods: _bp, ...invoiceData } = invoice;

      return {
        ...invoiceData,
        contract_number: sc?.contract_number ?? po?.contract_number ?? null,
        contract_title: sc?.title ?? po?.title ?? null,
        contract_company_id: sc?.contract_company_id ?? po?.contract_company_id ?? null,
        billing_period_name: bp?.name ?? null,
        billing_period_start: bp?.start_date ?? null,
        billing_period_end: bp?.end_date ?? null,
      };
    });

    return NextResponse.json({ data: enriched });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// POST /api/projects/[projectId]/invoicing/subcontractor/invoices
// Create a new subcontractor invoice for a project
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const supabase = await createClient();
    const { projectId } = await context.params;

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
    const {
      subcontract_id,
      purchase_order_id,
      billing_period_id,
      invoice_number,
      period_start,
      period_end,
      billing_date,
      notes,
    } = body;

    // Exactly one of subcontract_id or purchase_order_id is required
    if (!subcontract_id && !purchase_order_id) {
      return NextResponse.json(
        { error: "Either subcontract_id or purchase_order_id is required" },
        { status: 400 },
      );
    }
    if (subcontract_id && purchase_order_id) {
      return NextResponse.json(
        { error: "Provide either subcontract_id or purchase_order_id, not both" },
        { status: 400 },
      );
    }

    // Verify the commitment belongs to this project
    if (subcontract_id) {
      const { data: sc, error: scError } = await supabase
        .from("subcontracts")
        .select("id")
        .eq("id", subcontract_id)
        .eq("project_id", projectIdNum)
        .single();

      if (scError || !sc) {
        return NextResponse.json(
          { error: "Subcontract not found or does not belong to this project" },
          { status: 404 },
        );
      }
    }

    if (purchase_order_id) {
      const { data: po, error: poError } = await supabase
        .from("purchase_orders")
        .select("id")
        .eq("id", purchase_order_id)
        .eq("project_id", projectIdNum)
        .single();

      if (poError || !po) {
        return NextResponse.json(
          { error: "Purchase order not found or does not belong to this project" },
          { status: 404 },
        );
      }
    }

    const { data: invoice, error: insertError } = await supabase
      .from("subcontractor_invoices")
      .insert({
        project_id: projectIdNum,
        subcontract_id: subcontract_id ?? null,
        purchase_order_id: purchase_order_id ?? null,
        billing_period_id: billing_period_id ?? null,
        invoice_number: invoice_number ?? null,
        period_start: period_start ?? null,
        period_end: period_end ?? null,
        billing_date: billing_date === "" ? null : (billing_date ?? null),
        notes: notes ?? null,
        status: "draft",
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to create subcontractor invoice", details: insertError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
