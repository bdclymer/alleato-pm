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

    const invoiceRows = invoices ?? [];
    const invoiceIds = invoiceRows.map((i) => i.id);

    // Batch: line items for all invoices
    const lineItemsByInvoice = new Map<number, Array<Record<string, unknown>>>();
    if (invoiceIds.length > 0) {
      const { data: liRows } = await supabase
        .from("subcontractor_invoice_line_items")
        .select(
          "invoice_id, work_completed_period, materials_stored, total_completed_stored, retainage_amount, materials_retainage_amount, net_amount_this_period, scheduled_value",
        )
        .in("invoice_id", invoiceIds);
      for (const li of liRows ?? []) {
        const arr = lineItemsByInvoice.get(li.invoice_id as number) ?? [];
        arr.push(li as Record<string, unknown>);
        lineItemsByInvoice.set(li.invoice_id as number, arr);
      }
    }

    // Collect contract ids (subcontract or PO) + company ids
    const subIds = new Set<string>();
    const poIds = new Set<string>();
    const companyIds = new Set<string>();
    for (const inv of invoiceRows) {
      const sc = inv.subcontracts as { contract_company_id: string | null } | null;
      const po = inv.purchase_orders as { contract_company_id: string | null } | null;
      if (inv.subcontract_id) subIds.add(inv.subcontract_id as string);
      if (inv.purchase_order_id) poIds.add(inv.purchase_order_id as string);
      const cid = sc?.contract_company_id ?? po?.contract_company_id ?? null;
      if (cid) companyIds.add(cid);
    }

    // Batch: SOV items per contract (subcontracts)
    const sovSumByContract = new Map<string, number>();
    if (subIds.size > 0) {
      const { data: sovRows } = await supabase
        .from("subcontract_sov_items")
        .select("subcontract_id, amount")
        .in("subcontract_id", Array.from(subIds));
      for (const r of sovRows ?? []) {
        const k = r.subcontract_id as string;
        sovSumByContract.set(k, (sovSumByContract.get(k) ?? 0) + (Number(r.amount) || 0));
      }
    }

    // Batch: approved change orders per contract
    const coSumByContract = new Map<string, number>();
    if (subIds.size > 0 || poIds.size > 0) {
      const contractIds = [...subIds, ...poIds];
      const { data: coRows } = await supabase
        .from("contract_change_orders")
        .select("contract_id, amount, status")
        .in("contract_id", contractIds);
      for (const r of coRows ?? []) {
        if ((r.status ?? "").toLowerCase() !== "approved") continue;
        const k = r.contract_id as string;
        coSumByContract.set(k, (coSumByContract.get(k) ?? 0) + (Number(r.amount) || 0));
      }
    }

    // Batch: companies
    const companyNameById = new Map<string, string>();
    if (companyIds.size > 0) {
      const { data: companyRows } = await supabase
        .from("companies")
        .select("id, name")
        .in("id", Array.from(companyIds));
      for (const c of companyRows ?? []) {
        companyNameById.set(c.id as string, (c.name as string) ?? "");
      }
    }

    // Flatten + enrich
    const enriched = invoiceRows.map((invoice) => {
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

      const { subcontracts: _sc, purchase_orders: _po, billing_periods: _bp, ...invoiceData } =
        invoice;

      const lineItems = lineItemsByInvoice.get(invoice.id as number) ?? [];
      const num = (v: unknown) => Number(v) || 0;
      const grossAmount = lineItems.reduce(
        (s, li) => s + num(li.work_completed_period) + num(li.materials_stored),
        0,
      );
      const totalCompleted = lineItems.reduce(
        (s, li) => s + num(li.total_completed_stored),
        0,
      );
      const totalWorkRet = lineItems.reduce((s, li) => s + num(li.retainage_amount), 0);
      const totalMatRet = lineItems.reduce(
        (s, li) => s + num(li.materials_retainage_amount),
        0,
      );
      const netAmount = lineItems.reduce(
        (s, li) => s + num(li.net_amount_this_period),
        0,
      );
      const totalRetainage = totalWorkRet + totalMatRet;

      const contractId =
        (invoice.subcontract_id as string | null) ??
        (invoice.purchase_order_id as string | null) ??
        null;
      const originalContractSum = contractId ? sovSumByContract.get(contractId) ?? 0 : 0;
      const netChangeByCos = contractId ? coSumByContract.get(contractId) ?? 0 : 0;
      const totalContractAmount = originalContractSum + netChangeByCos;
      const percentComplete =
        totalContractAmount > 0 ? (totalCompleted / totalContractAmount) * 100 : 0;

      const contractCompanyId =
        sc?.contract_company_id ?? po?.contract_company_id ?? null;

      // Paid amount: approved invoices counted as paid until payments table lands
      const paidAmount = invoice.status === "paid" ? grossAmount - totalRetainage : 0;

      return {
        ...invoiceData,
        contract_number: sc?.contract_number ?? po?.contract_number ?? null,
        contract_title: sc?.title ?? po?.title ?? null,
        contract_company_id: contractCompanyId,
        contract_company_name: contractCompanyId
          ? companyNameById.get(contractCompanyId) ?? null
          : null,
        contract_type: invoice.subcontract_id
          ? "subcontract"
          : invoice.purchase_order_id
            ? "purchase_order"
            : null,
        billing_period_name: bp?.name ?? null,
        billing_period_start: bp?.start_date ?? null,
        billing_period_end: bp?.end_date ?? null,
        gross_amount: grossAmount,
        net_amount: netAmount,
        total_completed: totalCompleted,
        total_retainage: totalRetainage,
        paid_amount: paidAmount,
        original_contract_sum: originalContractSum,
        net_change_by_cos: netChangeByCos,
        total_contract_amount: totalContractAmount,
        percent_complete: percentComplete,
        erp_status: null as string | null,
        payment_status: invoice.status === "paid" ? "paid" : "unpaid",
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
      status: statusRaw,
      line_items,
    } = body;

    // Validate status — only "draft" or "under_review" allowed on create
    const allowedStatuses = ["draft", "under_review"];
    const status = statusRaw && allowedStatuses.includes(statusRaw) ? statusRaw : "draft";

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
        status,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to create subcontractor invoice", details: insertError.message },
        { status: 500 },
      );
    }

    // Insert line items if provided
    if (Array.isArray(line_items) && line_items.length > 0) {
      const lineItemRows = line_items.map((item: {
        description: string;
        budget_code?: string | null;
        scheduled_value: number;
        work_completed_previous: number;
        work_completed_period: number;
        materials_stored: number;
        retainage_pct: number;
        materials_retainage_pct?: number;
        sort_order?: number;
      }, index: number) => {
        const scheduled = Number(item.scheduled_value) || 0;
        const previous = Number(item.work_completed_previous) || 0;
        const thisPeriod = Number(item.work_completed_period) || 0;
        const stored = Number(item.materials_stored) || 0;
        const retainagePct = Number(item.retainage_pct) || 0;
        const materialsRetainagePct = Number(item.materials_retainage_pct) || 0;

        // Derived fields — total_completed_stored is GENERATED in Postgres, compute only for pct
        const totalCompletedStored = previous + thisPeriod + stored;
        const workCompletedPct = scheduled > 0 ? (totalCompletedStored / scheduled) * 100 : 0;
        const retainageAmount = ((previous + thisPeriod) * retainagePct) / 100;
        const materialsRetainageAmount = (stored * materialsRetainagePct) / 100;

        return {
          invoice_id: invoice.id,
          description: item.description,
          scheduled_value: scheduled,
          work_completed_previous: previous,
          work_completed_period: thisPeriod,
          materials_stored: stored,
          retainage_pct: retainagePct,
          retainage_amount: retainageAmount,
          materials_retainage_pct: materialsRetainagePct,
          materials_retainage_amount: materialsRetainageAmount,
          work_completed_pct: workCompletedPct,
          sort_order: item.sort_order ?? index,
        };
      });

      const { error: lineItemsError } = await supabase
        .from("subcontractor_invoice_line_items")
        .insert(lineItemRows);

      if (lineItemsError) {
        return NextResponse.json(
          { error: "Invoice created but failed to insert line items", details: lineItemsError.message },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
