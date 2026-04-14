import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requirePermission } from "@/lib/permissions-guard";

// Normalize optional request values so Postgres sees nulls instead of empty strings.
function normalizeOptionalField<T extends string | null | undefined>(value: T): T | null {
  return typeof value === "string" && value.trim() === "" ? null : value ?? null;
}

// Persist the same fallback invoice number that the UI displays so downstream exports stay consistent.
function buildGeneratedInvoiceNumber(invoiceId: number): string {
  return `INV-${invoiceId}`;
}

// POST /api/projects/[projectId]/invoicing/owner
// Create a new owner invoice for a project
export const POST = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/invoicing/owner#POST",
  async ({ request, params }) => {
  
    const { projectId } = params;
    const projectIdNum = parseInt(projectId, 10);

    const guard = await requirePermission(projectIdNum, "contracts", "write");
    if (guard.denied) return guard.response;

    const supabase = await createClient();
    const body = await request.json();
    const { prime_contract_id, invoice_number, period_start, period_end, billing_period_id, billing_date, status, payment_application_id } = body;

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
    // Sensitive: this write creates a billable owner invoice record in the project's ledger.
    const { data: invoice, error: insertError } = await supabase
      .from("owner_invoices")
      .insert({
        prime_contract_id,
        invoice_number: normalizeOptionalField(invoice_number),
        period_start: normalizeOptionalField(period_start),
        period_end: normalizeOptionalField(period_end),
        billing_period_id: normalizeOptionalField(billing_period_id),
        billing_date: normalizeOptionalField(billing_date),
        status: status ?? "draft",
        payment_application_id: normalizeOptionalField(payment_application_id),
      })
      .select()
      .single();

    if (insertError) {
      return apiErrorResponse(insertError);
    }

    if (!invoice.invoice_number) {
      const generatedInvoiceNumber = buildGeneratedInvoiceNumber(invoice.id);
      const { error: updateError } = await supabase
        .from("owner_invoices")
        .update({ invoice_number: generatedInvoiceNumber })
        .eq("id", invoice.id);

      if (updateError) {
        return apiErrorResponse(updateError);
      }

      invoice.invoice_number = generatedInvoiceNumber;
    }

    return NextResponse.json({ data: invoice }, { status: 201 });
    },
);

// GET /api/projects/[projectId]/invoicing/owner
// Fetch all owner invoices for a project with their line items
export const GET = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/invoicing/owner#GET",
  async ({ request, params }) => {
  
    const supabase = await createClient();
    const { projectId } = params;

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
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/invoicing/owner#GET", message: "Authentication required." });
    }

    const projectIdNum = parseInt(projectId, 10);

    // Parse optional query filters
    const { searchParams } = new URL(request.url);
    const billingPeriodId = searchParams.get("billing_period_id");
    const primeContractId = searchParams.get("prime_contract_id");

    // Build query scoped to the project via prime_contracts join
    // Also join linked payment_application for canonical retainage figures
    let query = supabase
      .from("owner_invoices")
      .select(
        `
        *,
        owner_invoice_line_items(*),
        prime_contracts!inner(id, project_id, contract_number, title, original_contract_value, revised_contract_value),
        prime_contract_payment_applications(id, amount, retention_amount, net_amount, percent_complete, status)
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

    // Batch-fetch approved prime contract change orders for all contracts in result set
    const contractIds = Array.from(
      new Set(
        (invoices || [])
          .map((inv) => inv.prime_contract_id)
          .filter((id): id is string => id != null),
      ),
    );

    type PCCO = {
      prime_contract_id: string | null;
      total_amount: number | null;
      status: string | null;
      approved_at: string | null;
      signed_co_received_date: string | null;
      due_date: string | null;
    };
    let changeOrders: PCCO[] = [];
    if (contractIds.length > 0) {
      const { data: coData } = await supabase
        .from("prime_contract_change_orders")
        .select("prime_contract_id, total_amount, status, approved_at, signed_co_received_date, due_date")
        .in("prime_contract_id", contractIds)
        .ilike("status", "approved%");
      changeOrders = coData || [];
    }

    // Batch-fetch all payments for invoices in result set
    const invoiceIds = (invoices || []).map((inv) => inv.id);
    let payments: { owner_invoice_id: number | null; amount: number }[] = [];
    if (invoiceIds.length > 0) {
      const { data: payData } = await supabase
        .from("invoice_payments")
        .select("owner_invoice_id, amount")
        .in("owner_invoice_id", invoiceIds);
      payments = payData || [];
    }

    const pickCoDate = (co: PCCO): string | null =>
      co.approved_at ?? co.signed_co_received_date ?? co.due_date ?? null;

    // Compute financial summary for each invoice from line items
    const invoicesWithTotals = (invoices || []).map((invoice) => {
      const lineItems = invoice.owner_invoice_line_items || [];
      const gross_amount = lineItems.reduce(
        (sum: number, item: { scheduled_value: number | null }) => sum + (item.scheduled_value || 0),
        0,
      );
      const net_amount_from_line_items = lineItems.reduce(
        (sum: number, item: { approved_amount: number | null }) => sum + (item.approved_amount || 0),
        0,
      );

      // If linked to a payment application, use its canonical retainage figures
      const linkedPayApp = Array.isArray(invoice.prime_contract_payment_applications)
        ? (invoice.prime_contract_payment_applications as Array<{
            id: string;
            amount: number | null;
            retention_amount: number | null;
            net_amount: number | null;
            percent_complete: number | null;
            status: string | null;
          }>)[0]
        : null;

      const canonical_gross = linkedPayApp?.amount ?? invoice.gross_amount ?? gross_amount;
      const canonical_retention = linkedPayApp?.retention_amount ?? null;
      const canonical_net = linkedPayApp?.net_amount ?? invoice.net_amount ?? net_amount_from_line_items;
      const canonical_percent_complete = linkedPayApp?.percent_complete ?? invoice.percent_complete ?? null;
      const total_amount = canonical_net;

      const pc = Array.isArray(invoice.prime_contracts)
        ? invoice.prime_contracts[0]
        : invoice.prime_contracts as {
            contract_number: string | null;
            title: string | null;
            original_contract_value: number | null;
            revised_contract_value: number | null;
          } | null;

      const { prime_contracts: _pc, prime_contract_payment_applications: _ppa, ...invoiceData } = invoice;

      // Compute previous / current changes from approved prime contract COs
      let previous_changes = 0;
      let current_changes = 0;
      const periodStart = invoice.period_start;
      const periodEnd = invoice.period_end;
      for (const co of changeOrders) {
        if (co.prime_contract_id !== invoice.prime_contract_id) continue;
        const coDate = pickCoDate(co);
        if (!coDate) continue;
        const amount = co.total_amount ?? 0;
        if (periodStart && coDate < periodStart) {
          previous_changes += amount;
        } else if (
          periodStart &&
          periodEnd &&
          coDate >= periodStart &&
          coDate <= periodEnd
        ) {
          current_changes += amount;
        }
      }

      // Compute payment status from invoice_payments
      const total_paid = payments
        .filter((p) => p.owner_invoice_id === invoice.id)
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      const billedTotal =
        (invoice.net_amount ?? canonical_net) ||
        (invoice.gross_amount ?? canonical_gross) ||
        total_amount;
      let payment_status: "unpaid" | "partially_paid" | "paid" = "unpaid";
      if (billedTotal > 0 && total_paid >= billedTotal) {
        payment_status = "paid";
      } else if (total_paid > 0) {
        payment_status = "partially_paid";
      }

      return {
        ...invoiceData,
        contract_number: pc?.contract_number ?? null,
        contract_title: pc?.title ?? null,
        total_contract_amount: pc?.revised_contract_value ?? pc?.original_contract_value ?? null,
        gross_amount: canonical_gross,
        retention_amount: canonical_retention,
        net_amount: canonical_net,
        paid_amount: invoice.paid_amount ?? total_paid,
        percent_complete: canonical_percent_complete,
        total_amount,
        previous_changes,
        current_changes,
        total_paid,
        payment_status,
        // Indicate whether retainage figures are canonical (from payment application)
        retainage_from_payment_application: linkedPayApp !== null,
      };
    });

    return NextResponse.json({ data: invoicesWithTotals });
    },
);
