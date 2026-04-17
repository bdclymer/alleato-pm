import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";
import {
  renderSubcontractorInvoicePdfBuffer,
  type SubcontractorInvoicePdfData,
  type SubcontractorInvoicePdfLineItem,
  type SubcontractorInvoicePdfRollup,
} from "@/lib/subcontractor-invoice-pdf";

// Node runtime is required for React PDF rendering.
export const runtime = "nodejs";

type SubcontractInvoicePdfFetchResult =
  | { data: SubcontractorInvoicePdfData; error: null }
  | { data: null; error: null | { code?: string; message: string } };

interface ContractJoinRow {
  contract_number: string | null;
  title: string | null;
  contract_company_id: string | null;
  default_retainage_percent: number | null;
  contract_date: string | null;
}

interface InvoiceWithJoins {
  id: number;
  invoice_number: string | null;
  status: string | null;
  period_start: string | null;
  period_end: string | null;
  billing_date: string | null;
  notes: string | null;
  project_id: number;
  subcontract_id: string | null;
  purchase_order_id: string | null;
  created_at: string | null;
  subcontractor_invoice_line_items: SubcontractorInvoicePdfLineItem[] | null;
  subcontracts: ContractJoinRow | ContractJoinRow[] | null;
  purchase_orders: ContractJoinRow | ContractJoinRow[] | null;
}

// Converts line item rows into safe numeric values for PDF rendering.
function normalizeLineItems(
  lineItems: SubcontractorInvoicePdfLineItem[] | null | undefined,
): SubcontractorInvoicePdfLineItem[] {
  return (lineItems ?? [])
    .map((row) => ({
      id: row.id,
      sort_order: row.sort_order ?? null,
      budget_code: row.budget_code ?? null,
      description: row.description ?? null,
      scheduled_value: row.scheduled_value ?? 0,
      work_completed_previous: row.work_completed_previous ?? 0,
      work_completed_period: row.work_completed_period ?? 0,
      materials_stored: row.materials_stored ?? 0,
      total_completed_stored: row.total_completed_stored ?? 0,
      retainage_pct: row.retainage_pct ?? 0,
      retainage_amount: row.retainage_amount ?? 0,
      materials_retainage_pct: row.materials_retainage_pct ?? 0,
      materials_retainage_amount: row.materials_retainage_amount ?? 0,
      net_amount_this_period: row.net_amount_this_period ?? 0,
    }))
    .sort((a, b) => (a.sort_order ?? a.id) - (b.sort_order ?? b.id));
}

// Calculates the G702-style rollup section from invoice and related records.
async function buildRollup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invoice: InvoiceWithJoins,
  invoiceIdNum: number,
): Promise<SubcontractorInvoicePdfRollup> {
  const lineItems = normalizeLineItems(invoice.subcontractor_invoice_line_items);
  const contractId = invoice.subcontract_id ?? invoice.purchase_order_id ?? null;

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

  return {
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
}

// Loads and assembles all data required to render a subcontractor invoice PDF.
export async function fetchSubcontractorInvoicePdfData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectIdNum: number,
  invoiceIdNum: number,
): Promise<SubcontractInvoicePdfFetchResult> {
  const { data: invoice, error: invoiceError } = await supabase
    .from("subcontractor_invoices")
    .select(
      `
      id,
      invoice_number,
      status,
      period_start,
      period_end,
      billing_date,
      notes,
      project_id,
      subcontract_id,
      purchase_order_id,
      created_at,
      subcontractor_invoice_line_items(
        id,
        sort_order,
        budget_code,
        description,
        scheduled_value,
        work_completed_previous,
        work_completed_period,
        materials_stored,
        total_completed_stored,
        retainage_pct,
        retainage_amount,
        materials_retainage_pct,
        materials_retainage_amount,
        net_amount_this_period
      ),
      subcontracts(contract_number, title, contract_company_id, default_retainage_percent, contract_date),
      purchase_orders(contract_number, title, contract_company_id, default_retainage_percent, contract_date)
      `,
    )
    .eq("id", invoiceIdNum)
    .eq("project_id", projectIdNum)
    .single();

  if (invoiceError) {
    return {
      data: null,
      error: { code: invoiceError.code, message: invoiceError.message },
    };
  }

  if (!invoice) {
    return { data: null, error: null };
  }

  const invoiceRow = invoice as unknown as InvoiceWithJoins;
  const contract = Array.isArray(invoiceRow.subcontracts)
    ? invoiceRow.subcontracts[0]
    : invoiceRow.subcontracts;
  const purchaseOrder = Array.isArray(invoiceRow.purchase_orders)
    ? invoiceRow.purchase_orders[0]
    : invoiceRow.purchase_orders;
  const contractJoin = contract ?? purchaseOrder ?? null;

  const { data: project } = await supabase
    .from("projects")
    .select("name, project_number, address, company_id")
    .eq("id", projectIdNum)
    .maybeSingle();

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

  let subcontractorCompany: {
    name: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
  } | null = null;
  if (contractJoin?.contract_company_id) {
    const { data: company } = await supabase
      .from("companies")
      .select("name, address, city, state, zip_code")
      .eq("id", contractJoin.contract_company_id)
      .maybeSingle();
    subcontractorCompany = company ?? null;
  }

  let applicationNumber = 1;
  const contractId: string | null = invoiceRow.subcontract_id ?? invoiceRow.purchase_order_id;
  if (contractId) {
    const foreignKey = invoiceRow.subcontract_id
      ? "subcontract_id"
      : "purchase_order_id";
    const { count } = await supabase
      .from("subcontractor_invoices")
      .select("id", { count: "exact", head: true })
      .eq(foreignKey, contractId)
      .lt("created_at", invoiceRow.created_at ?? new Date().toISOString());
    applicationNumber = (count ?? 0) + 1;
  }

  const lineItems = normalizeLineItems(invoiceRow.subcontractor_invoice_line_items);
  const rollup = await buildRollup(supabase, invoiceRow, invoiceIdNum);

  return {
    data: {
      id: invoiceRow.id,
      invoice_number: invoiceRow.invoice_number,
      application_number: applicationNumber,
      status: invoiceRow.status ?? "draft",
      period_start: invoiceRow.period_start,
      period_end: invoiceRow.period_end,
      billing_date: invoiceRow.billing_date,
      notes: invoiceRow.notes,
      project_name: project?.name ?? null,
      project_number: project?.project_number ?? null,
      project_address: project?.address ?? null,
      contract_number: contractJoin?.contract_number ?? null,
      contract_title: contractJoin?.title ?? null,
      contract_date: contractJoin?.contract_date ?? null,
      gc_company_name: gcCompany?.name ?? null,
      gc_company_address: gcCompany?.address ?? null,
      gc_company_city: gcCompany?.city ?? null,
      gc_company_state: gcCompany?.state ?? null,
      gc_company_zip: gcCompany?.zip_code ?? null,
      contract_company_name: subcontractorCompany?.name ?? null,
      contract_company_address: subcontractorCompany?.address ?? null,
      contract_company_city: subcontractorCompany?.city ?? null,
      contract_company_state: subcontractorCompany?.state ?? null,
      contract_company_zip: subcontractorCompany?.zip_code ?? null,
      line_items: lineItems,
      rollup,
    },
    error: null,
  };
}

export const GET = withApiGuardrails<{ projectId: string; invoiceId: string }>(
  "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/pdf#GET",
  async ({ params }) => {
    const where = "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/pdf#GET";
    const supabase = await createClient();
    const { projectId, invoiceId } = params;

    // Sensitive: this route enforces auth before exposing invoice financial data.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where,
        message: "Authentication required.",
      });
    }

    const projectIdNum = Number.parseInt(projectId, 10);
    const invoiceIdNum = Number.parseInt(invoiceId, 10);

    if (!Number.isFinite(projectIdNum) || !Number.isFinite(invoiceIdNum)) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where,
        message: "Invalid project or invoice id.",
        status: 400,
      });
    }

    const result = await fetchSubcontractorInvoicePdfData(
      supabase,
      projectIdNum,
      invoiceIdNum,
    );

    if (result.error) {
      if (result.error.code === "PGRST116") {
        throw new GuardrailError({
          code: "INTERNAL_ERROR",
          where,
          message: "Invoice not found.",
          status: 404,
          severity: "low",
        });
      }
      return apiErrorResponse(result.error);
    }

    if (!result.data) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where,
        message: "Invoice not found.",
        status: 404,
        severity: "low",
      });
    }

    const pdfBuffer = await renderSubcontractorInvoicePdfBuffer(result.data);
    const invoiceNumber = result.data.invoice_number || result.data.application_number;
    const filename = `subcontract-invoice-${invoiceNumber}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  },
);
