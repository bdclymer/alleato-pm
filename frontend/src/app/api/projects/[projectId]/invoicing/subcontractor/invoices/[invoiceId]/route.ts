import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

// GET /api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]
// Fetch a single subcontractor invoice with line items, commitment, and billing period joins
export const GET = withApiGuardrails<{ projectId: string; invoiceId: string }>(
  "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]#GET",
  async ({ request }) => {
  
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
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]#GET", message: "Authentication required." });
    }

    const projectIdNum = parseInt(projectId, 10);
    const invoiceIdNum = parseInt(invoiceId, 10);

    const { data: invoice, error: invoiceError } = await supabase
      .from("subcontractor_invoices")
      .select(
        `
        *,
        subcontractor_invoice_line_items(*),
        subcontracts(contract_number, title, contract_company_id, default_retainage_percent, contract_date),
        purchase_orders(contract_number, title, contract_company_id, default_retainage_percent, contract_date),
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
      contract_date: string | null;
    } | null;
    const po = invoice.purchase_orders as {
      contract_number: string | null;
      title: string | null;
      contract_company_id: string | null;
      default_retainage_percent: number | null;
      contract_date: string | null;
    } | null;
    const bp = invoice.billing_periods as {
      name: string | null;
      start_date: string | null;
      end_date: string | null;
    } | null;

    const { subcontracts: _sc, purchase_orders: _po, billing_periods: _bp, subcontractor_invoice_line_items: _rawLineItems, ...invoiceData } = invoice;

    // ----- Application-for-Payment rollup -----
    // Compute the 9-line AIA G702-style header totals from source data so the
    // detail page can render them without duplicating the math client-side.
    const contractId = invoice.subcontract_id ?? invoice.purchase_order_id ?? null;

    // Original contract sum = sum of subcontract SOV items
    let originalContractSum = 0;
    if (contractId) {
      const { data: sovRows } = await supabase
        .from("subcontract_sov_items")
        .select("amount")
        .eq("subcontract_id", contractId);
      originalContractSum = (sovRows ?? []).reduce(
        (sum, row) => sum + (Number(row.amount) || 0),
        0,
      );
    }

    // Net change by approved change orders on this commitment
    let netChangeByChangeOrders = 0;
    if (contractId) {
      const { data: coRows } = await supabase
        .from("contract_change_orders")
        .select("amount, status")
        .eq("contract_id", contractId);
      netChangeByChangeOrders = (coRows ?? [])
        .filter((co) => (co.status ?? "").toLowerCase() === "approved")
        .reduce((sum, co) => sum + (Number(co.amount) || 0), 0);
    }

    // Enrich line items with SOV data (budget_code, commitment_value, change_value)
    const rawLineItems = (invoice.subcontractor_invoice_line_items ?? []) as Array<Record<string, unknown>>;
    let sovItems: Array<{
      sort_order: number | null;
      budget_code: string | null;
      description: string | null;
      amount: number | null;
    }> = [];
    if (contractId) {
      const { data: sov } = await supabase
        .from("subcontract_sov_items")
        .select("sort_order, budget_code, description, amount")
        .eq("subcontract_id", contractId)
        .order("sort_order", { ascending: true });
      sovItems = sov ?? [];
    }
    // Map SOV items by sort_order for fast lookup
    const sovBySort = new Map(
      sovItems.map((s) => [s.sort_order, s]),
    );
    const enrichedLineItems = rawLineItems.map((li) => {
      const sortOrder = Number(li.sort_order) || 0;
      const sovMatch = sovBySort.get(sortOrder);
      const commitmentValue = sovMatch ? (Number(sovMatch.amount) || 0) : null;
      const scheduledValue = Number(li.scheduled_value) || 0;
      const changeValue = commitmentValue != null ? scheduledValue - commitmentValue : null;
      const workPrev = Number(li.work_completed_previous) || 0;
      const workPrevPct = scheduledValue > 0 ? (workPrev / scheduledValue) * 100 : 0;
      return {
        ...li,
        budget_code: sovMatch?.budget_code ?? (li.description as string) ?? null,
        line_item_type: "SOV",
        commitment_value: commitmentValue,
        change_value: changeValue,
        work_completed_previous_pct: workPrevPct,
      };
    });

    // This invoice's totals from its line items
    const lineItems = enrichedLineItems as Array<{
      total_completed_stored: number | null;
      retainage_amount: number | null;
      materials_retainage_amount: number | null;
      net_amount_this_period: number | null;
      work_completed_period: number | null;
      materials_stored: number | null;
    }>;
    const totalCompletedAndStored = lineItems.reduce(
      (sum, li) => sum + (Number(li.total_completed_stored) || 0),
      0,
    );
    const totalWorkRetainage = lineItems.reduce(
      (sum, li) => sum + (Number(li.retainage_amount) || 0),
      0,
    );
    const totalMaterialsRetainage = lineItems.reduce(
      (sum, li) => sum + (Number(li.materials_retainage_amount) || 0),
      0,
    );
    const totalRetainage = totalWorkRetainage + totalMaterialsRetainage;
    const totalEarnedLessRetainage = totalCompletedAndStored - totalRetainage;

    // Less previous certificates: sum of net_amount_this_period from approved
    // prior invoices on the same commitment (before this invoice's period_end)
    let lessPreviousCertificates = 0;
    if (contractId) {
      const foreignKey = invoice.subcontract_id
        ? "subcontract_id"
        : "purchase_order_id";
      const { data: priorInvoices } = await supabase
        .from("subcontractor_invoices")
        .select(
          "id, status, period_end, subcontractor_invoice_line_items(net_amount_this_period)",
        )
        .eq(foreignKey, contractId)
        .neq("id", invoiceIdNum)
        .in("status", ["approved", "approved_as_noted", "paid"]);
      for (const prior of priorInvoices ?? []) {
        // Only count invoices with an earlier or equal period end
        if (
          invoice.period_end &&
          prior.period_end &&
          prior.period_end > invoice.period_end
        ) {
          continue;
        }
        const priorLines = (prior.subcontractor_invoice_line_items ?? []) as Array<{
          net_amount_this_period: number | null;
        }>;
        lessPreviousCertificates += priorLines.reduce(
          (sum, li) => sum + (Number(li.net_amount_this_period) || 0),
          0,
        );
      }
    }

    const contractSumToDate = originalContractSum + netChangeByChangeOrders;
    const currentPaymentDue = totalEarnedLessRetainage - lessPreviousCertificates;
    const balanceToFinish = contractSumToDate - totalEarnedLessRetainage;

    const rollup = {
      original_contract_sum: originalContractSum,
      net_change_by_change_orders: netChangeByChangeOrders,
      contract_sum_to_date: contractSumToDate,
      total_completed_and_stored: totalCompletedAndStored,
      total_work_retainage: totalWorkRetainage,
      total_materials_retainage: totalMaterialsRetainage,
      total_retainage: totalRetainage,
      total_earned_less_retainage: totalEarnedLessRetainage,
      less_previous_certificates: lessPreviousCertificates,
      current_payment_due: currentPaymentDue,
      balance_to_finish_including_retainage: balanceToFinish,
    };

    // Tab badge counts (single round-trip using head+count)
    const [
      { count: relatedCount },
      { count: emailCount },
      { count: historyCount },
    ] = await Promise.all([
      supabase
        .from("subcontractor_invoice_related_items")
        .select("id", { count: "exact", head: true })
        .eq("invoice_id", invoiceIdNum),
      supabase
        .from("subcontractor_invoice_emails")
        .select("id", { count: "exact", head: true })
        .eq("invoice_id", invoiceIdNum),
      supabase
        .from("subcontractor_invoice_audit_log")
        .select("id", { count: "exact", head: true })
        .eq("invoice_id", invoiceIdNum),
    ]);

    const tab_counts = {
      related_items: relatedCount ?? 0,
      emails: emailCount ?? 0,
      change_history: historyCount ?? 0,
    };

    // Resolve contract company (subcontractor) with full address
    const contractCompanyId =
      sc?.contract_company_id ?? po?.contract_company_id ?? null;
    let contractCompany: {
      name: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
      zip_code: string | null;
    } | null = null;
    if (contractCompanyId) {
      const { data: company } = await supabase
        .from("companies")
        .select("name, address, city, state, zip_code")
        .eq("id", contractCompanyId)
        .maybeSingle();
      contractCompany = company ?? null;
    }

    // Fetch project info (name, number, address)
    const { data: project } = await supabase
      .from("projects")
      .select("name, project_number, address, company_id")
      .eq("id", projectIdNum)
      .maybeSingle();

    // Fetch GC company (owner of the project) with address
    let gcCompany: {
      name: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
      zip_code: string | null;
    } | null = null;
    if (project?.company_id) {
      const { data: gc } = await supabase
        .from("companies")
        .select("name, address, city, state, zip_code")
        .eq("id", project.company_id)
        .maybeSingle();
      gcCompany = gc ?? null;
    }

    // Contract date from subcontract or PO
    const contractDate = sc?.contract_date ?? po?.contract_date ?? null;

    // Change order breakdown: additions vs deductions
    let coAdditions = 0;
    let coDeductions = 0;
    if (contractId) {
      const { data: coRows } = await supabase
        .from("contract_change_orders")
        .select("amount, status")
        .eq("contract_id", contractId)
        .in("status", ["approved"]);
      for (const co of coRows ?? []) {
        const amt = Number(co.amount) || 0;
        if (amt >= 0) coAdditions += amt;
        else coDeductions += amt;
      }
    }

    const percentComplete =
      contractSumToDate > 0
        ? (totalCompletedAndStored / contractSumToDate) * 100
        : 0;

    // Determine application number: count prior invoices on same commitment + 1
    let applicationNumber = 1;
    if (contractId) {
      const foreignKey = invoice.subcontract_id
        ? "subcontract_id"
        : "purchase_order_id";
      const { count: priorCount } = await supabase
        .from("subcontractor_invoices")
        .select("id", { count: "exact", head: true })
        .eq(foreignKey, contractId)
        .lt("created_at", invoice.created_at ?? new Date().toISOString());
      applicationNumber = (priorCount ?? 0) + 1;
    }

    return NextResponse.json({
      data: {
        ...invoiceData,
        subcontractor_invoice_line_items: enrichedLineItems,
        contract_number: sc?.contract_number ?? po?.contract_number ?? null,
        contract_title: sc?.title ?? po?.title ?? null,
        contract_company_id: contractCompanyId,
        contract_company_name: contractCompany?.name ?? null,
        contract_company_address: contractCompany?.address ?? null,
        contract_company_city: contractCompany?.city ?? null,
        contract_company_state: contractCompany?.state ?? null,
        contract_company_zip: contractCompany?.zip_code ?? null,
        contract_retainage_percent: sc?.default_retainage_percent ?? po?.default_retainage_percent ?? null,
        contract_date: contractDate as string | null,
        gc_company_name: gcCompany?.name ?? null,
        gc_company_address: gcCompany?.address ?? null,
        gc_company_city: gcCompany?.city ?? null,
        gc_company_state: gcCompany?.state ?? null,
        gc_company_zip: gcCompany?.zip_code ?? null,
        project_name: project?.name ?? null,
        project_number: project?.project_number ?? null,
        project_address: project?.address ?? null,
        application_number: applicationNumber,
        percent_complete: percentComplete,
        billing_period_name: bp?.name ?? null,
        billing_period_start: bp?.start_date ?? null,
        billing_period_end: bp?.end_date ?? null,
        rollup,
        co_summary: {
          additions: coAdditions,
          deductions: coDeductions,
          net: coAdditions + coDeductions,
        },
        tab_counts,
      },
    });
    },
);

// PATCH /api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]
// Update a subcontractor invoice (only when status is draft or revise_and_resubmit)
export const PATCH = withApiGuardrails<{ projectId: string; invoiceId: string }>(
  "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]#PATCH",
  async ({ request }) => {
  
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
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]#PATCH", message: "Authentication required." });
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

    // Fetch current values for audit comparison (non-status fields)
    const { data: currentData } = await supabase
      .from("subcontractor_invoices")
      .select("invoice_number, period_start, period_end, billing_date, notes")
      .eq("id", invoiceIdNum)
      .single();

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

    // Log field-level edits to audit log (status changes handled by DB trigger)
    if (currentData) {
      const fieldsToLog = ["invoice_number", "period_start", "period_end", "billing_date", "notes"];
      const auditRows = fieldsToLog
        .filter((f) => f in updatePayload && (currentData as Record<string, unknown>)[f] !== updatePayload[f])
        .map((f) => ({
          invoice_id: invoiceIdNum,
          event_type: "field.updated" as const,
          field_name: f,
          old_value: (currentData as Record<string, unknown>)[f] ?? null,
          new_value: updatePayload[f] ?? null,
          actor_user_id: user.id,
          actor_email: user.email ?? null,
          notes: `Updated ${f.replace(/_/g, " ")}`,
        }));
      if (auditRows.length > 0) {
        await supabase.from("subcontractor_invoice_audit_log").insert(auditRows);
      }
    }

    return NextResponse.json({ data: updated });
    },
);

// DELETE /api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]
// Delete a subcontractor invoice (blocked if status is approved or paid)
export const DELETE = withApiGuardrails<{ projectId: string; invoiceId: string }>(
  "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]#DELETE",
  async ({ request }) => {
  
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
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]#DELETE", message: "Authentication required." });
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
    },
);
