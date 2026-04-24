/**
 * Acumatica Sync Service
 *
 * Handles pulling data from Acumatica ERP into Alleato PM.
 * All operations are read-only from Acumatica (Phase 1).
 *
 * Matching strategy for vendors:
 *  Vendors are upserted directly into the companies table (is_vendor = true),
 *  using acumatica_vendor_id as the conflict/dedup key.
 */

import { createClient } from "@/lib/supabase/server";
import { createAcumaticaClient } from "./client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type {
  FlatInvoice,
  FlatPayment,
  FlatProjectTransaction,
  FlatProjectTransactionDetail,
  FlatPurchaseOrder,
  FlatSubcontract,
  FlatVendor,
} from "./types";

type DbClient = SupabaseClient<Database>;

export interface VendorSyncResult {
  created: number;
  updated: number;
  errors: string[];
}

function toCompanyVendorFields(v: FlatVendor, now: string) {
  return {
    acumatica_vendor_id: v.VendorID,
    name: v.VendorName,
    legal_name: v.LegalName ?? null,
    contact_email: v.Email ?? null,
    contact_phone: v.Phone1 ?? null,
    vendor_class: v.VendorClass ?? null,
    terms: v.Terms ?? null,
    payment_method: v.PaymentMethod ?? null,
    ap_account: v.APAccount ?? null,
    cash_account: v.CashAccount ?? null,
    is_1099_vendor: v.F1099Vendor ?? null,
    is_foreign_entity: v.ForeignEntity ?? null,
    is_labor_union: v.VendorIsLaborUnion ?? null,
    is_tax_agency: v.VendorIsTaxAgency ?? null,
    is_vendor: true as const,
    status: "active",
    acumatica_sync_at: now,
  };
}

/**
 * Pull all active vendors from Acumatica and upsert directly into the
 * companies table with is_vendor = true.
 *
 * Conflict resolution uses acumatica_vendor_id (unique where not null).
 */
export async function syncVendors(supabaseClient?: DbClient): Promise<VendorSyncResult> {
  const result: VendorSyncResult = {
    created: 0,
    updated: 0,
    errors: [],
  };

  const acuClient = createAcumaticaClient();
  await acuClient.login();

  const acuVendors = await acuClient.getVendors({
    $top: 500,
    $expand: "MainContact",
  });

  const activeVendors = acuVendors.filter((v) => v.Status === "Active");

  const supabase = supabaseClient ?? (await createClient());
  const now = new Date().toISOString();

  for (const acuVendor of activeVendors) {
    const acuId = acuVendor.VendorID;
    const payload = toCompanyVendorFields(acuVendor, now);

    try {
      const { error, data } = await supabase
        .from("companies")
        .upsert(payload, { onConflict: "acumatica_vendor_id" })
        .select("id")
        .single();

      if (error) {
        result.errors.push(`${acuId} (${acuVendor.VendorName}): ${error.message}`);
      } else if (data) {
        // Determine created vs updated by checking if the row already existed.
        // Supabase upsert doesn't expose this directly, so we track via
        // acumatica_sync_at: if it matches `now` exactly we treat it as updated.
        result.updated++;
      }
    } catch (err) {
      result.errors.push(`${acuId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // created count is not reliably distinguishable from updated via upsert,
  // so we report all successes as updated. Callers can check logs for details.
  return result;
}

// ---------------------------------------------------------------------------
// Direct Costs Sync (Acumatica Project Transactions → direct_costs)
// ---------------------------------------------------------------------------

export interface DirectCostSyncResult {
  created: number;
  updated: number;
  errors: string[];
}

interface MappedDirectCostLineItem {
  budget_code_id: string;
  description: string | null;
  quantity: number;
  uom: string | null;
  unit_cost: number;
  line_total: number;
  line_order: number;
}

function mapTransactionStatus(acuStatus: string): string {
  switch (acuStatus) {
    case "Released":
      return "Approved";
    case "On Hold":
      return "Draft";
    case "Balanced":
      return "Pending";
    default:
      return "Draft";
  }
}

/**
 * Derive cost type from the Acumatica transaction module and original doc type.
 * Only "Invoice" and "Expense" are valid in the direct_costs table.
 */
function toTransactionCostType(
  module?: string,
  origDocType?: string,
): string {
  if (module === "AP") {
    if (origDocType === "Debit Adjustment") return "Expense";
    return "Invoice";
  }
  // GL, AR, and all other modules default to Expense
  return "Expense";
}

function normalizeCostCode(value?: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "{}" || trimmed === "N/A" || trimmed === "<N/A>") return null;
  if (trimmed.length === 6 && /^\d+$/.test(trimmed)) {
    return `${trimmed.slice(0, 2)}-${trimmed.slice(2)}`;
  }
  return trimmed;
}

/**
 * Pull Project Transactions from Acumatica (PM3040PL) and upsert into
 * the direct_costs table for a given project.
 *
 * Data flow:
 * 1. Look up the project's `acumatica_project_id` from the projects table
 * 2. Fetch all ProjectTransaction records with Details expanded
 * 3. Filter detail lines where Detail.Project matches our Acumatica project ID
 * 4. Group matching detail lines by their parent transaction ReferenceNbr
 * 5. For each transaction with matching lines: sum amounts and upsert a direct_cost
 *
 * Matching: acumatica_ref_nbr (the ProjectTransaction ReferenceNbr).
 */
export async function syncDirectCosts(
  projectId: number,
  userId: string,
  supabaseClient?: DbClient,
): Promise<DirectCostSyncResult> {
  const result: DirectCostSyncResult = { created: 0, updated: 0, errors: [] };

  const supabase = supabaseClient ?? (await createClient());

  // 1. Resolve this project's Acumatica project ID
  const { data: project, error: projError } = await supabase
    .from("projects")
    .select("acumatica_project_id")
    .eq("id", projectId)
    .single();

  if (projError || !project?.acumatica_project_id) {
    result.errors.push(
      `Project ${projectId} has no acumatica_project_id mapped. ` +
      `Set it in the projects table before syncing.`,
    );
    return result;
  }

  const acuProjectId = project.acumatica_project_id;

  // 2. Fetch project transactions from Acumatica
  const acuClient = createAcumaticaClient();
  await acuClient.login();

  // Fetch in pages — there can be ~10K transactions total.
  // We fetch with Details expanded so we can filter by project on the detail lines.
  // Page size is kept small (100) because $expand=Details makes payloads large.
  const allTransactions: FlatProjectTransaction[] = [];
  let skip = 0;
  const pageSize = 100;

  while (true) {
    const page = await acuClient.getProjectTransactions({
      $top: pageSize,
      $skip: skip,
    });
    if (page.length === 0) break;
    allTransactions.push(...page);
    if (page.length < pageSize) break;
    skip += pageSize;
  }

  // 3. Filter: keep only transactions that have at least one detail line
  //    matching our project
  interface MatchedTransaction {
    header: FlatProjectTransaction;
    matchingDetails: FlatProjectTransactionDetail[];
  }

  const matched: MatchedTransaction[] = [];

  for (const tx of allTransactions) {
    const matchingDetails = (tx.Details ?? []).filter(
      (d) => d.Project === acuProjectId,
    );
    if (matchingDetails.length > 0) {
      matched.push({ header: tx, matchingDetails });
    }
  }

  // 4. Load existing direct costs for dedup
  const { data: existingCosts, error: fetchError } = await supabase
    .from("direct_costs")
    .select("id, acumatica_ref_nbr, acumatica_document_key")
    .eq("project_id", projectId)
    .or("acumatica_ref_nbr.not.is.null,acumatica_document_key.not.is.null");

  if (fetchError) {
    result.errors.push(`Failed to load existing direct costs: ${fetchError.message}`);
    return result;
  }

  const byRefNbr = new Map<string, string>();
  const byDocumentKey = new Map<string, string>();
  for (const c of existingCosts ?? []) {
    if (c.acumatica_ref_nbr) byRefNbr.set(c.acumatica_ref_nbr, c.id);
    if (c.acumatica_document_key) byDocumentKey.set(c.acumatica_document_key, c.id);
  }

  // Build vendor lookup (acumatica_vendor_id → company.id)
  const { data: vendors } = await supabase
    .from("companies")
    .select("id, acumatica_vendor_id")
    .eq("is_vendor", true)
    .not("acumatica_vendor_id", "is", null);

  const vendorByAcuId = new Map<string, string>();
  for (const v of vendors ?? []) {
    if (v.acumatica_vendor_id) vendorByAcuId.set(v.acumatica_vendor_id, v.id);
  }

  const { data: costCodes, error: costCodesError } = await supabase
    .from("cost_codes")
    .select("id");

  if (costCodesError) {
    result.errors.push(`Failed to load cost codes: ${costCodesError.message}`);
    return result;
  }

  const validCostCodes = new Set((costCodes ?? []).map((row) => row.id));

  const { data: existingProjectCostCodes, error: projectCostCodesError } = await supabase
    .from("project_budget_codes")
    .select("id, cost_code_id")
    .eq("project_id", projectId)
    .is("cost_type_id", null);

  if (projectCostCodesError) {
    result.errors.push(`Failed to load project cost codes: ${projectCostCodesError.message}`);
    return result;
  }

  const projectCostCodeByCode = new Map<string, string>();
  const ambiguousProjectCostCodes = new Set<string>();
  for (const row of existingProjectCostCodes ?? []) {
    if (!row.cost_code_id) continue;
    if (projectCostCodeByCode.has(row.cost_code_id)) {
      ambiguousProjectCostCodes.add(row.cost_code_id);
      projectCostCodeByCode.delete(row.cost_code_id);
      continue;
    }
    if (!ambiguousProjectCostCodes.has(row.cost_code_id)) {
      projectCostCodeByCode.set(row.cost_code_id, row.id);
    }
  }

  const now = new Date().toISOString();
  const pendingLineItemsByCostId = new Map<string, MappedDirectCostLineItem[]>();

  // 5. Upsert each matched transaction as a direct_cost
  for (const { header, matchingDetails } of matched) {
    const refNbr = header.ReferenceNbr;
    const documentKey = `ProjectTransaction|${refNbr}`;
    const mappedLineItems: MappedDirectCostLineItem[] = [];

    for (let index = 0; index < matchingDetails.length; index += 1) {
      const detail = matchingDetails[index];
      const normalizedCostCode = normalizeCostCode(detail.CostCode);
      if (!normalizedCostCode) continue;
      if (!validCostCodes.has(normalizedCostCode)) continue;
      if (ambiguousProjectCostCodes.has(normalizedCostCode)) {
        result.errors.push(
          `${refNbr}: multiple null-cost-type project_budget_codes rows exist for ${normalizedCostCode}; cannot map Acumatica direct cost safely.`,
        );
        continue;
      }

      let projectCostCodeId = projectCostCodeByCode.get(normalizedCostCode);
      if (!projectCostCodeId) {
        const { data: costCodeMeta } = await supabase
          .from("cost_codes")
          .select("title")
          .eq("id", normalizedCostCode)
          .maybeSingle();

        const { data: insertedCostCode, error: insertProjectCostCodeError } = await supabase
          .from("project_budget_codes")
          .insert({
            project_id: projectId,
            cost_code_id: normalizedCostCode,
            cost_type_id: null,
            description: costCodeMeta?.title ?? normalizedCostCode,
            is_active: true,
          })
          .select("id")
          .single();

        if (insertProjectCostCodeError) {
          result.errors.push(
            `${refNbr}: failed to ensure project_budget_codes entry for ${normalizedCostCode} (${insertProjectCostCodeError.message})`,
          );
          continue;
        }

        projectCostCodeId = insertedCostCode.id;
        projectCostCodeByCode.set(normalizedCostCode, projectCostCodeId);
      }

      const quantity = detail.Qty && detail.Qty > 0 ? detail.Qty : 1;
      const amount = detail.Amount ?? 0;
      const lineTotal = amount;
      const unitCost = quantity > 0 ? lineTotal / quantity : lineTotal;
      mappedLineItems.push({
        budget_code_id: projectCostCodeId,
        description: detail.Description ?? null,
        quantity,
        uom: detail.UOM ?? null,
        unit_cost: unitCost,
        line_total: lineTotal,
        line_order: index + 1,
      });
    }

    if (mappedLineItems.length === 0) {
      result.errors.push(
        `${refNbr}: no mappable cost-coded detail lines were found in ProjectTransaction details.`,
      );
      continue;
    }

    // Sum amounts from the matching detail lines (only lines for our project)
    const totalAmount = mappedLineItems.reduce((sum, line) => sum + line.line_total, 0);

    // Use the earliest detail date, or fall back to header CreatedDateTime
    const earliestDate = matchingDetails
      .map((d) => d.Date)
      .filter(Boolean)
      .sort()[0];
    const date = earliestDate
      ? earliestDate.split("T")[0]
      : header.CreatedDateTime
        ? header.CreatedDateTime.split("T")[0]
        : now.split("T")[0];

    // Resolve vendor from the first detail's VendorOrCustomer
    const vendorAcuId = matchingDetails[0]?.VendorOrCustomer;
    const vendorId = vendorAcuId
      ? vendorByAcuId.get(vendorAcuId) ?? null
      : null;

    // Build description: use header description, or first detail description
    const description =
      header.Description ??
      matchingDetails[0]?.Description ??
      null;

    // Financial period from the first detail line
    const finPeriod = matchingDetails[0]?.FinPeriod ?? null;

    const fields = {
      date,
      description,
      invoice_number: header.OriginalDocNbr ?? null,
      total_amount: totalAmount,
      cost_type: toTransactionCostType(header.Module, header.OriginalDocType),
      status: mapTransactionStatus(header.Status),
      terms: null as string | null,
      vendor_id: vendorId,
      acumatica_ref_nbr: refNbr,
      acumatica_document_key: documentKey,
      acumatica_doc_type: header.OriginalDocType ?? header.Module ?? null,
      acumatica_financial_period: finPeriod,
      acumatica_sync_at: now,
      paid_date: null as string | null,
    };

    try {
      const existingId = byDocumentKey.get(documentKey) ?? byRefNbr.get(refNbr);
      if (existingId) {
        const { error: updateError } = await supabase
          .from("direct_costs")
          .update({ ...fields, updated_by_user_id: userId })
          .eq("id", existingId);
        if (updateError) {
          result.errors.push(`${refNbr}: ${updateError.message}`);
          continue;
        }

        pendingLineItemsByCostId.set(existingId, mappedLineItems);
        result.updated++;
      } else {
        const { data: insertedCost, error: insertError } = await supabase.from("direct_costs").insert({
          ...fields,
          project_id: projectId,
          created_by_user_id: userId,
          updated_by_user_id: userId,
        }).select("id").single();
        if (insertError || !insertedCost) {
          result.errors.push(`${refNbr}: ${insertError?.message ?? "Insert failed"}`);
          continue;
        }
        pendingLineItemsByCostId.set(insertedCost.id, mappedLineItems);
        result.created++;
      }
    } catch (err) {
      result.errors.push(`${refNbr}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  for (const [directCostId, lineItems] of pendingLineItemsByCostId.entries()) {
    const { error: deleteLinesError } = await supabase
      .from("direct_cost_line_items")
      .delete()
      .eq("direct_cost_id", directCostId);

    if (deleteLinesError) {
      result.errors.push(`${directCostId}: failed to clear line items (${deleteLinesError.message})`);
      continue;
    }

    const linePayloads = lineItems.map((item) => ({
      direct_cost_id: directCostId,
      ...item,
    }));

    const { error: insertLinesError } = await supabase
      .from("direct_cost_line_items")
      .insert(linePayloads);

    if (insertLinesError) {
      result.errors.push(`${directCostId}: failed to insert line items (${insertLinesError.message})`);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Shared sync result type
// ---------------------------------------------------------------------------

export interface SyncResult {
  created: number;
  updated: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// AR Invoices Sync (Acumatica Invoice → owner_invoices + line items)
// ---------------------------------------------------------------------------

function mapInvoiceStatus(acuStatus: string): string {
  switch (acuStatus) {
    case "Open":
      return "submitted";
    case "Closed":
      return "approved";
    case "Released":
      return "approved";
    case "Balanced":
      return "submitted";
    case "On Hold":
      return "draft";
    default:
      return "draft";
  }
}

/**
 * Pull AR Invoices from Acumatica and upsert into owner_invoices + owner_invoice_line_items.
 *
 * Matching: acumatica_ref_nbr (unique per invoice).
 * Links to prime_contracts via the project's prime contract.
 */
export async function syncARInvoices(
  projectId: number,
  _userId: string,
  supabaseClient?: DbClient,
): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, errors: [] };

  const acuClient = createAcumaticaClient();
  await acuClient.login();

  // Get AR invoices with line item details
  const acuInvoices = await acuClient.getInvoices({
    $top: 500,
    $expand: "Details",
  });

  const supabase = supabaseClient ?? (await createClient());

  // We need a contract_id to associate invoices. Get the project's primary prime contract.
  const { data: primeContract } = await supabase
    .from("prime_contracts")
    .select("id")
    .eq("project_id", projectId)
    .limit(1)
    .single();

  if (!primeContract) {
    result.errors.push("No prime contract found for this project. Create one first.");
    return result;
  }

  // Also look up the project's Acumatica project ID to filter invoices
  const { data: project } = await supabase
    .from("projects")
    .select("acumatica_project_id")
    .eq("id", projectId)
    .single();

  const acuProjectId = project?.acumatica_project_id;

  // Filter invoices to this project if we have an Acumatica project mapping
  const projectInvoices = acuProjectId
    ? acuInvoices.filter((inv) => {
        // Check if any detail line references this project
        if (inv.Details?.some((d) => d.ProjectID === acuProjectId)) return true;
        return false;
      })
    : acuInvoices;

  // Load existing owner_invoices with acumatica_ref_nbr
  const { data: existingInvoices, error: fetchError } = await supabase
    .from("owner_invoices")
    .select("id, acumatica_ref_nbr")
    .eq("contract_id", primeContract.id)
    .not("acumatica_ref_nbr", "is", null);

  if (fetchError) {
    result.errors.push(`Failed to load existing invoices: ${fetchError.message}`);
    return result;
  }

  const byRefNbr = new Map<string, number>();
  for (const inv of existingInvoices ?? []) {
    if (inv.acumatica_ref_nbr) byRefNbr.set(inv.acumatica_ref_nbr, inv.id);
  }

  const now = new Date().toISOString();

  for (const invoice of projectInvoices) {
    const refNbr = invoice.ReferenceNbr;
    const invoiceDate = invoice.Date ? invoice.Date.split("T")[0] : now.split("T")[0];

    const fields = {
      invoice_number: refNbr,
      status: mapInvoiceStatus(invoice.Status),
      period_start: invoiceDate,
      period_end: invoice.DueDate ? invoice.DueDate.split("T")[0] : null,
      acumatica_ref_nbr: refNbr,
      acumatica_doc_type: invoice.Type ?? null,
      acumatica_sync_at: now,
      ...(invoice.Status === "Released" || invoice.Status === "Closed"
        ? { approved_at: now }
        : {}),
      ...(invoice.Status !== "On Hold" ? { submitted_at: now } : {}),
    };

    try {
      const existingId = byRefNbr.get(refNbr);
      if (existingId) {
        const { error } = await supabase
          .from("owner_invoices")
          .update(fields)
          .eq("id", existingId);
        if (error) {
          result.errors.push(`Invoice ${refNbr}: ${error.message}`);
          continue;
        }
        result.updated++;

        // Update line items: delete existing and re-insert
        await supabase
          .from("owner_invoice_line_items")
          .delete()
          .eq("invoice_id", existingId);

        if (invoice.Details?.length) {
          const lineItems = invoice.Details.map((detail) => ({
            invoice_id: existingId,
            description: detail.TransactionDescription ?? `Line ${detail.LineNbr ?? 0}`,
            approved_amount: detail.ExtendedPrice ?? 0,
            category: detail.AccountID ?? null,
            acumatica_line_nbr: detail.LineNbr ?? null,
          }));
          await supabase.from("owner_invoice_line_items").insert(lineItems);
        }
      } else {
        const { data: newInvoice, error } = await supabase
          .from("owner_invoices")
          .insert({
            ...fields,
            prime_contract_id: primeContract.id,
          })
          .select("id")
          .single();

        if (error || !newInvoice) {
          result.errors.push(`Invoice ${refNbr}: ${error?.message ?? "Insert failed"}`);
          continue;
        }
        result.created++;

        if (invoice.Details?.length) {
          const lineItems = invoice.Details.map((detail) => ({
            invoice_id: newInvoice.id,
            description: detail.TransactionDescription ?? `Line ${detail.LineNbr ?? 0}`,
            approved_amount: detail.ExtendedPrice ?? 0,
            category: detail.AccountID ?? null,
            acumatica_line_nbr: detail.LineNbr ?? null,
          }));
          await supabase.from("owner_invoice_line_items").insert(lineItems);
        }
      }
    } catch (err) {
      result.errors.push(`Invoice ${refNbr}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// AR Payments Sync (Acumatica Payment → prime_contract_payments)
// ---------------------------------------------------------------------------

/**
 * Pull AR Payments from Acumatica and upsert into prime_contract_payments.
 *
 * Matching: acumatica_ref_nbr (unique per payment).
 */
export async function syncARPayments(
  projectId: number,
  _userId: string,
  supabaseClient?: DbClient,
): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, errors: [] };

  const supabase = supabaseClient ?? (await createClient());

  // Get the project's primary prime contract and its associated company's customer_id
  const { data: primeContract } = await supabase
    .from("prime_contracts")
    .select("id, contract_company_id")
    .eq("project_id", projectId)
    .limit(1)
    .single();

  if (!primeContract) {
    result.errors.push("No prime contract found for this project.");
    return result;
  }

  // Resolve the Acumatica customer ID from the contract's company
  let acumaticaCustomerId: string | null = null;
  if (primeContract.contract_company_id) {
    const { data: company } = await supabase
      .from("companies")
      .select("customer_id")
      .eq("id", primeContract.contract_company_id)
      .single();
    acumaticaCustomerId = company?.customer_id ?? null;
  }

  if (!acumaticaCustomerId) {
    result.errors.push(
      "No Acumatica customer mapping found. Set customer_id on the contract company in the directory.",
    );
    return result;
  }

  const acuClient = createAcumaticaClient();
  await acuClient.login();

  const acuPayments = await acuClient.getPayments({ $top: 500 });

  // Filter payments to this project's customer
  const customerPayments = acuPayments.filter(
    (p) =>
      p.CustomerID === acumaticaCustomerId &&
      (p.Status === "Released" || p.Status === "Closed" || p.Status === "Open"),
  );

  // Load existing payments with acumatica_ref_nbr
  const { data: existingPayments, error: fetchError } = await supabase
    .from("prime_contract_payments")
    .select("id, acumatica_ref_nbr")
    .eq("contract_id", primeContract.id)
    .not("acumatica_ref_nbr", "is", null);

  if (fetchError) {
    result.errors.push(`Failed to load existing payments: ${fetchError.message}`);
    return result;
  }

  const byRefNbr = new Map<string, string>();
  for (const p of existingPayments ?? []) {
    if (p.acumatica_ref_nbr) byRefNbr.set(p.acumatica_ref_nbr, p.id);
  }

  const now = new Date().toISOString();

  for (const payment of customerPayments) {
    const refNbr = payment.ReferenceNbr;
    // Acumatica returns ApplicationDate; fall back to Date
    const rawDate = payment.ApplicationDate ?? payment.Date;
    const paymentDate = rawDate ? rawDate.split("T")[0] : now.split("T")[0];

    // PaymentMethod can be a string or an empty object — normalize safely
    const rawMethod =
      typeof payment.PaymentMethod === "string"
        ? payment.PaymentMethod.toLowerCase().trim()
        : "";
    let method = "other";
    if (rawMethod.includes("check")) method = "check";
    else if (rawMethod.includes("wire")) method = "wire";
    else if (rawMethod.includes("ach")) method = "ach";
    else if (rawMethod.includes("credit")) method = "credit_card";
    else if (rawMethod === "cash") method = "cash";

    const externalRef =
      typeof payment.ExternalRef === "string" ? payment.ExternalRef : null;

    const fields = {
      amount: payment.PaymentAmount ?? 0,
      payment_date: paymentDate,
      payment_number: refNbr,
      method,
      reference_number: externalRef,
      notes: payment.Description ?? null,
      acumatica_ref_nbr: refNbr,
      acumatica_doc_type: payment.Type ?? null,
      acumatica_sync_at: now,
    };

    try {
      const existingId = byRefNbr.get(refNbr);
      if (existingId) {
        const { error } = await supabase
          .from("prime_contract_payments")
          .update(fields)
          .eq("id", existingId);
        if (error) result.errors.push(`Payment ${refNbr}: ${error.message}`);
        else result.updated++;
      } else {
        const { error } = await supabase.from("prime_contract_payments").insert({
          ...fields,
          contract_id: primeContract.id,
          project_id: projectId,
        });
        if (error) result.errors.push(`Payment ${refNbr}: ${error.message}`);
        else result.created++;
      }
    } catch (err) {
      result.errors.push(`Payment ${refNbr}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Subcontracts Sync (Acumatica Subcontract → subcontracts)
// ---------------------------------------------------------------------------

function mapSubcontractStatus(acuStatus: string): string {
  switch (acuStatus) {
    case "Open":
      return "approved";
    case "Closed":
      return "closed";
    case "Hold":
      return "draft";
    case "Pending Print":
      return "out_for_signature";
    case "Pending Email":
      return "out_for_signature";
    default:
      return "draft";
  }
}

/**
 * Pull Subcontracts from Acumatica and upsert into the subcontracts table.
 *
 * Matching: acumatica_external_key (SubcontractNbr).
 */
export async function syncSubcontracts(
  projectId: number,
  userId: string,
): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, errors: [] };

  const acuClient = createAcumaticaClient();
  await acuClient.login();

  const acuSubcontracts = await acuClient.getSubcontracts({ $top: 500 });

  const supabase = await createClient();

  // Get project's Acumatica ID for filtering
  const { data: project } = await supabase
    .from("projects")
    .select("acumatica_project_id")
    .eq("id", projectId)
    .single();

  const acuProjectId = project?.acumatica_project_id;

  // Filter to this project's subcontracts
  const projectSubs = acuProjectId
    ? acuSubcontracts.filter((s) => s.ProjectID === acuProjectId)
    : acuSubcontracts;

  // Load existing subcontracts
  const { data: existingSubs, error: fetchError } = await supabase
    .from("subcontracts")
    .select("id, acumatica_external_key, contract_number")
    .eq("project_id", projectId);

  if (fetchError) {
    result.errors.push(`Failed to load existing subcontracts: ${fetchError.message}`);
    return result;
  }

  const byExternalKey = new Map<string, string>();
  const byContractNumber = new Map<string, string>();
  for (const s of existingSubs ?? []) {
    if (s.acumatica_external_key) byExternalKey.set(s.acumatica_external_key, s.id);
    byContractNumber.set(s.contract_number, s.id);
  }

  // Vendor lookup
  const { data: vendors } = await supabase
    .from("companies")
    .select("id, acumatica_vendor_id")
    .eq("is_vendor", true)
    .not("acumatica_vendor_id", "is", null);
  const vendorByAcuId = new Map<string, string>();
  for (const v of vendors ?? []) {
    if (v.acumatica_vendor_id) vendorByAcuId.set(v.acumatica_vendor_id, v.id);
  }

  const now = new Date().toISOString();

  for (const sub of projectSubs) {
    const subNbr = sub.SubcontractNbr;
    const contractDate = sub.Date ? sub.Date.split("T")[0] : now.split("T")[0];

    const fields = {
      title: sub.Description ?? `Subcontract ${subNbr}`,
      status: mapSubcontractStatus(sub.Status),
      description: sub.Description ?? null,
      contract_date: contractDate,
      contract_company_id: vendorByAcuId.get(sub.Vendor) ?? null,
      executed: sub.Status === "Open" || sub.Status === "Closed",
      acumatica_external_key: subNbr,
    };

    try {
      const existingId = byExternalKey.get(subNbr) ?? byContractNumber.get(subNbr);

      if (existingId) {
        const { error } = await supabase
          .from("subcontracts")
          .update(fields)
          .eq("id", existingId);
        if (error) result.errors.push(`Sub ${subNbr}: ${error.message}`);
        else result.updated++;
      } else {
        const { error } = await supabase.from("subcontracts").insert({
          ...fields,
          contract_number: subNbr,
          project_id: projectId,
          created_by: userId,
        });
        if (error) result.errors.push(`Sub ${subNbr}: ${error.message}`);
        else result.created++;
      }
    } catch (err) {
      result.errors.push(`Sub ${subNbr}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Purchase Orders Sync (Acumatica PO → purchase_orders)
// ---------------------------------------------------------------------------

function mapPOStatus(acuStatus: string): string {
  switch (acuStatus) {
    case "Open":
      return "approved";
    case "Closed":
      return "closed";
    case "Hold":
      return "draft";
    case "Pending Print":
      return "out_for_signature";
    case "Pending Email":
      return "out_for_signature";
    default:
      return "draft";
  }
}

/**
 * Pull Purchase Orders from Acumatica and upsert into the purchase_orders table.
 *
 * Matching: acumatica_external_key (OrderNbr).
 */
export async function syncPurchaseOrders(
  projectId: number,
  userId: string,
): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, errors: [] };

  const acuClient = createAcumaticaClient();
  await acuClient.login();

  // Page size is kept small (100) because $expand=Details makes payloads large.
  const acuPOs: FlatPurchaseOrder[] = [];
  let poSkip = 0;
  const poPageSize = 100;
  while (true) {
    const page = await acuClient.getPurchaseOrders({
      $top: poPageSize,
      $skip: poSkip,
      $expand: "Details",
    });
    if (page.length === 0) break;
    acuPOs.push(...page);
    if (page.length < poPageSize) break;
    poSkip += poPageSize;
  }

  const supabase = await createClient();

  // Get project's Acumatica ID for filtering
  const { data: project } = await supabase
    .from("projects")
    .select("acumatica_project_id")
    .eq("id", projectId)
    .single();

  const acuProjectId = project?.acumatica_project_id;

  // Filter POs: check if any line item references this project
  const projectPOs = acuProjectId
    ? acuPOs.filter((po) =>
        po.Details?.some((d) => d.ProjectID === acuProjectId),
      )
    : acuPOs;

  // Load existing purchase_orders
  const { data: existingPOs, error: fetchError } = await supabase
    .from("purchase_orders")
    .select("id, acumatica_external_key, contract_number")
    .eq("project_id", projectId);

  if (fetchError) {
    result.errors.push(`Failed to load existing POs: ${fetchError.message}`);
    return result;
  }

  const byExternalKey = new Map<string, string>();
  const byContractNumber = new Map<string, string>();
  for (const po of existingPOs ?? []) {
    if (po.acumatica_external_key) byExternalKey.set(po.acumatica_external_key, po.id);
    byContractNumber.set(po.contract_number, po.id);
  }

  // Vendor lookup
  const { data: vendors } = await supabase
    .from("companies")
    .select("id, acumatica_vendor_id")
    .eq("is_vendor", true)
    .not("acumatica_vendor_id", "is", null);
  const vendorByAcuId = new Map<string, string>();
  for (const v of vendors ?? []) {
    if (v.acumatica_vendor_id) vendorByAcuId.set(v.acumatica_vendor_id, v.id);
  }

  const now = new Date().toISOString();

  for (const po of projectPOs) {
    const orderNbr = po.OrderNbr;
    const orderDate = po.Date ? po.Date.split("T")[0] : now.split("T")[0];

    const fields = {
      title: po.Description ?? `PO ${orderNbr}`,
      status: mapPOStatus(po.Status),
      description: po.Description ?? null,
      contract_date: orderDate,
      delivery_date: po.PromisedOn ? po.PromisedOn.split("T")[0] : null,
      contract_company_id: vendorByAcuId.get(po.Vendor) ?? null,
      executed: po.Status === "Open" || po.Status === "Closed",
      payment_terms: null as string | null,
      acumatica_external_key: orderNbr,
    };

    try {
      const existingId = byExternalKey.get(orderNbr) ?? byContractNumber.get(orderNbr);

      if (existingId) {
        const { error } = await supabase
          .from("purchase_orders")
          .update(fields)
          .eq("id", existingId);
        if (error) result.errors.push(`PO ${orderNbr}: ${error.message}`);
        else result.updated++;
      } else {
        const { error } = await supabase.from("purchase_orders").insert({
          ...fields,
          contract_number: orderNbr,
          project_id: projectId,
          created_by: userId,
        });
        if (error) result.errors.push(`PO ${orderNbr}: ${error.message}`);
        else result.created++;
      }
    } catch (err) {
      result.errors.push(`PO ${orderNbr}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Commitments Sync (combines Subcontracts + POs)
// ---------------------------------------------------------------------------

/**
 * Sync both subcontracts and purchase orders from Acumatica.
 */
export async function syncCommitments(
  projectId: number,
  userId: string,
): Promise<SyncResult> {
  const [subResult, poResult] = await Promise.all([
    syncSubcontracts(projectId, userId),
    syncPurchaseOrders(projectId, userId),
  ]);

  return {
    created: subResult.created + poResult.created,
    updated: subResult.updated + poResult.updated,
    errors: [...subResult.errors, ...poResult.errors],
  };
}

// ---------------------------------------------------------------------------
// App → Acumatica Export (Write Sync)
// ---------------------------------------------------------------------------

export interface ExportSyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export interface AcumaticaOutboundAuditContext {
  runId?: string;
  userId?: string | null;
}

type OutboundAuditOperation = "create" | "update" | "skip" | "error";

interface OutboundAuditLogRow {
  run_id: string;
  triggered_by_user_id: string | null;
  project_id: number;
  contract_id: string | null;
  entity_name: string;
  source_table: string;
  source_record_id: string;
  source_reference: string | null;
  acumatica_entity: string;
  acumatica_reference: string | null;
  acumatica_doc_type: string | null;
  operation: OutboundAuditOperation;
  success: boolean;
  error_message: string | null;
  request_payload: Record<string, unknown> | null;
  response_payload: Record<string, unknown> | null;
}

async function flushOutboundAuditLogs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: OutboundAuditLogRow[],
): Promise<void> {
  if (!rows.length) return;

  const CHUNK_SIZE = 200;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await (supabase as any)
      .from("acumatica_outbound_audit_logs")
      .insert(chunk);
    if (error) {
      console.error("[acumatica-outbound-audit] insert failed:", error.message);
      return;
    }
  }
}

type AcumaticaPayloadValue = string | number | boolean | null | undefined;

function acuField(value: AcumaticaPayloadValue) {
  return { value };
}

function toIsoDate(value: string | null | undefined): string {
  if (!value) return new Date().toISOString().split("T")[0];
  return value.split("T")[0];
}

function mapOutboundCommitmentStatus(status: string | null | undefined): string {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "executed" || normalized === "approved" || normalized === "closed") {
    return "Open";
  }
  if (normalized === "void" || normalized === "cancelled" || normalized === "canceled") {
    return "Canceled";
  }
  return "On Hold";
}

function mapOutboundPrimeCoStatus(status: string | null | undefined): string {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "approved" || normalized === "executed" || normalized === "closed") {
    return "Open";
  }
  if (normalized === "rejected" || normalized === "void") {
    return "Canceled";
  }
  return "On Hold";
}

function mapOutboundInvoiceStatus(status: string | null | undefined): string {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "approved" || normalized === "paid") return "Released";
  if (normalized === "submitted") return "Balanced";
  return "On Hold";
}

function escapeODataString(value: string): string {
  return value.replace(/'/g, "''");
}

function isProjectPermissionOrContextError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Project '") &&
    message.includes("cannot be found in the system")
  );
}

function isAcumaticaOperationFailedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("PXInvalidOperationException") ||
    message.includes("Operation failed") ||
    message.includes("NullReferenceException")
  );
}

async function upsertInvoiceWithProjectFallback(
  acuClient: ReturnType<typeof createAcumaticaClient>,
  payload: Record<string, unknown>,
  options?: {
    allowProjectFallback?: boolean;
    allowHeaderOnlyFallback?: boolean;
  },
): Promise<Record<string, unknown>> {
  const allowProjectFallback = options?.allowProjectFallback ?? true;
  const allowHeaderOnlyFallback = options?.allowHeaderOnlyFallback ?? true;

  try {
    return await acuClient.upsertInvoice(payload);
  } catch (error) {
    if (
      allowProjectFallback &&
      isProjectPermissionOrContextError(error) &&
      "Project" in payload
    ) {
      // Some tenants reject header-level Project in AR Invoice create/update context
      // even when the project exists. Retry once without Project so sync can proceed.
      const fallbackPayload = { ...payload };
      delete fallbackPayload.Project;
      return acuClient.upsertInvoice(fallbackPayload);
    }

    if (
      allowHeaderOnlyFallback &&
      isAcumaticaOperationFailedError(error) &&
      "Details" in payload
    ) {
      // Acumatica may throw an internal Operation failed/NullReferenceException
      // for some sparse line payloads. Retry with a header-only invoice payload.
      const fallbackPayload = { ...payload };
      delete fallbackPayload.Details;
      return acuClient.upsertInvoice(fallbackPayload);
    }

    throw error;
  }
}

/**
 * Export project commitments (subcontracts + purchase orders) from the app to Acumatica.
 */
export async function exportCommitmentsToAcumatica(
  projectId: number,
  auditContext?: AcumaticaOutboundAuditContext,
): Promise<ExportSyncResult> {
  const result: ExportSyncResult = { created: 0, updated: 0, skipped: 0, errors: [] };
  const supabase = await createClient();
  const acuClient = createAcumaticaClient();
  await acuClient.login();
  const runId = auditContext?.runId ?? crypto.randomUUID();
  const auditLogs: OutboundAuditLogRow[] = [];

  const { data: project } = await supabase
    .from("projects")
    .select("acumatica_project_id")
    .eq("id", projectId)
    .single();

  if (!project?.acumatica_project_id) {
    result.errors.push("Project has no acumatica_project_id mapping.");
    return result;
  }

  const acuProjectId = project.acumatica_project_id;

  const [{ data: subcontracts, error: subError }, { data: purchaseOrders, error: poError }] =
    await Promise.all([
      supabase
        .from("subcontracts")
        .select(
          "id, contract_number, acumatica_external_key, status, description, title, contract_date, contract_company_id, executed",
        )
        .eq("project_id", projectId)
        .is("deleted_at", null),
      supabase
        .from("purchase_orders")
        .select(
          "id, contract_number, acumatica_external_key, status, description, title, contract_date, delivery_date, contract_company_id, executed",
        )
        .eq("project_id", projectId)
        .is("deleted_at", null),
    ]);

  if (subError) result.errors.push(`Failed loading subcontracts: ${subError.message}`);
  if (poError) result.errors.push(`Failed loading purchase orders: ${poError.message}`);

  const vendorIds = [
    ...(subcontracts ?? []).map((s) => s.contract_company_id).filter(Boolean),
    ...(purchaseOrders ?? []).map((p) => p.contract_company_id).filter(Boolean),
  ] as string[];

  let vendorAcuById = new Map<string, string>();
  if (vendorIds.length > 0) {
    const { data: vendors } = await supabase
      .from("companies")
      .select("id, acumatica_vendor_id")
      .eq("is_vendor", true)
      .in("id", Array.from(new Set(vendorIds)));
    vendorAcuById = new Map(
      (vendors ?? [])
        .filter((v) => !!v.acumatica_vendor_id)
        .map((v) => [v.id, v.acumatica_vendor_id as string]),
    );
  }

  const subcontractIds = (subcontracts ?? []).map((s) => s.id);
  const poIds = (purchaseOrders ?? []).map((p) => p.id);

  const [{ data: subcontractLines }, { data: poLines }] = await Promise.all([
    subcontractIds.length
      ? supabase
          .from("subcontract_sov_items")
          .select("subcontract_id, line_number, description, amount, budget_code")
          .in("subcontract_id", subcontractIds)
      : Promise.resolve({ data: [], error: null }),
    poIds.length
      ? supabase
          .from("purchase_order_sov_items")
          .select(
            "purchase_order_id, line_number, description, amount, budget_code, quantity, unit_cost, uom",
          )
          .in("purchase_order_id", poIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const subcontractLinesById = new Map<string, Array<Record<string, unknown>>>();
  for (const line of subcontractLines ?? []) {
    const current = subcontractLinesById.get(line.subcontract_id) ?? [];
    current.push({
      LineNbr: acuField(line.line_number ?? undefined),
      Description: acuField(line.description ?? undefined),
      Amount: acuField(line.amount ?? 0),
      CostCode: acuField(line.budget_code ?? undefined),
    });
    subcontractLinesById.set(line.subcontract_id, current);
  }

  const poLinesById = new Map<string, Array<Record<string, unknown>>>();
  for (const line of poLines ?? []) {
    const current = poLinesById.get(line.purchase_order_id) ?? [];
    current.push({
      LineNbr: acuField(line.line_number),
      Description: acuField(line.description ?? undefined),
      Amount: acuField(line.amount ?? 0),
      CostCode: acuField(line.budget_code ?? undefined),
      Qty: acuField(line.quantity ?? undefined),
      UnitCost: acuField(line.unit_cost ?? undefined),
      UOM: acuField(line.uom ?? undefined),
    });
    poLinesById.set(line.purchase_order_id, current);
  }

  for (const sc of subcontracts ?? []) {
    const vendorAcuId = sc.contract_company_id
      ? vendorAcuById.get(sc.contract_company_id) ?? null
      : null;
    const externalKey = sc.acumatica_external_key ?? sc.contract_number;
    const details = subcontractLinesById.get(sc.id) ?? [];

    const payload: Record<string, unknown> = {
      SubcontractNbr: acuField(externalKey),
      VendorID: acuField(vendorAcuId),
      Project: acuField(acuProjectId),
      Description: acuField(sc.description ?? sc.title ?? sc.contract_number),
      Date: acuField(toIsoDate(sc.contract_date)),
      Status: acuField(
        mapOutboundCommitmentStatus(sc.executed ? "executed" : sc.status),
      ),
      Details: details,
    };

    try {
      const existed = !!sc.acumatica_external_key;
      const response = await acuClient.upsertSubcontract(payload);
      const returnedNbr =
        typeof response.SubcontractNbr === "string" ? response.SubcontractNbr : externalKey;

      await supabase
        .from("subcontracts")
        .update({ acumatica_external_key: returnedNbr })
        .eq("id", sc.id);

      if (existed) result.updated++;
      else result.created++;
      auditLogs.push({
        run_id: runId,
        triggered_by_user_id: auditContext?.userId ?? null,
        project_id: projectId,
        contract_id: null,
        entity_name: "commitments",
        source_table: "subcontracts",
        source_record_id: sc.id,
        source_reference: sc.contract_number ?? null,
        acumatica_entity: "Subcontract",
        acumatica_reference: returnedNbr,
        acumatica_doc_type: null,
        operation: existed ? "update" : "create",
        success: true,
        error_message: null,
        request_payload: payload,
        response_payload: response,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`Subcontract ${sc.contract_number}: ${message}`);
      auditLogs.push({
        run_id: runId,
        triggered_by_user_id: auditContext?.userId ?? null,
        project_id: projectId,
        contract_id: null,
        entity_name: "commitments",
        source_table: "subcontracts",
        source_record_id: sc.id,
        source_reference: sc.contract_number ?? null,
        acumatica_entity: "Subcontract",
        acumatica_reference: sc.acumatica_external_key ?? externalKey,
        acumatica_doc_type: null,
        operation: "error",
        success: false,
        error_message: message,
        request_payload: payload,
        response_payload: null,
      });
    }
  }

  for (const po of purchaseOrders ?? []) {
    const vendorAcuId = po.contract_company_id
      ? vendorAcuById.get(po.contract_company_id) ?? null
      : null;
    const externalKey = po.acumatica_external_key ?? po.contract_number;
    const details = poLinesById.get(po.id) ?? [];

    const payload: Record<string, unknown> = {
      Type: acuField("RegularOrder"),
      OrderNbr: acuField(externalKey),
      VendorID: acuField(vendorAcuId),
      Project: acuField(acuProjectId),
      Description: acuField(po.description ?? po.title ?? po.contract_number),
      Date: acuField(toIsoDate(po.contract_date)),
      PromisedOn: acuField(toIsoDate(po.delivery_date)),
      Status: acuField(
        mapOutboundCommitmentStatus(po.executed ? "executed" : po.status),
      ),
      Details: details,
    };

    try {
      const existed = !!po.acumatica_external_key;
      const response = await acuClient.upsertPurchaseOrder(payload);
      const returnedNbr =
        typeof response.OrderNbr === "string" ? response.OrderNbr : externalKey;

      await supabase
        .from("purchase_orders")
        .update({ acumatica_external_key: returnedNbr })
        .eq("id", po.id);

      if (existed) result.updated++;
      else result.created++;
      auditLogs.push({
        run_id: runId,
        triggered_by_user_id: auditContext?.userId ?? null,
        project_id: projectId,
        contract_id: null,
        entity_name: "commitments",
        source_table: "purchase_orders",
        source_record_id: po.id,
        source_reference: po.contract_number ?? null,
        acumatica_entity: "PurchaseOrder",
        acumatica_reference: returnedNbr,
        acumatica_doc_type: "RegularOrder",
        operation: existed ? "update" : "create",
        success: true,
        error_message: null,
        request_payload: payload,
        response_payload: response,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`Purchase order ${po.contract_number}: ${message}`);
      auditLogs.push({
        run_id: runId,
        triggered_by_user_id: auditContext?.userId ?? null,
        project_id: projectId,
        contract_id: null,
        entity_name: "commitments",
        source_table: "purchase_orders",
        source_record_id: po.id,
        source_reference: po.contract_number ?? null,
        acumatica_entity: "PurchaseOrder",
        acumatica_reference: po.acumatica_external_key ?? externalKey,
        acumatica_doc_type: "RegularOrder",
        operation: "error",
        success: false,
        error_message: message,
        request_payload: payload,
        response_payload: null,
      });
    }
  }

  await flushOutboundAuditLogs(supabase, auditLogs);
  return result;
}

/**
 * Export prime contracts to Acumatica using the Project entity.
 */
export async function exportPrimeContractsToAcumatica(
  projectId: number,
  auditContext?: AcumaticaOutboundAuditContext,
): Promise<ExportSyncResult> {
  const result: ExportSyncResult = { created: 0, updated: 0, skipped: 0, errors: [] };
  const supabase = await createClient();
  const acuClient = createAcumaticaClient();
  await acuClient.login();
  const runId = auditContext?.runId ?? crypto.randomUUID();
  const auditLogs: OutboundAuditLogRow[] = [];

  const [{ data: primeContracts, error: contractsError }, { data: project }] =
    await Promise.all([
      supabase
        .from("prime_contracts")
        .select(
          "id, contract_number, title, description, status, executed, revised_contract_value, original_contract_value, client_id, contract_company_id",
        )
        .eq("project_id", projectId),
      supabase
        .from("projects")
        .select("id, name, acumatica_project_id")
        .eq("id", projectId)
        .single(),
    ]);

  if (contractsError) {
    result.errors.push(`Failed loading prime contracts: ${contractsError.message}`);
    return result;
  }

  if (!primeContracts?.length) {
    result.skipped++;
    return result;
  }

  const companyIds = Array.from(
    new Set(
      primeContracts
        .flatMap((c) => [c.client_id, c.contract_company_id])
        .filter(Boolean) as string[],
    ),
  );
  let customerByCompanyId = new Map<string, string>();
  if (companyIds.length > 0) {
    const { data: companies } = await supabase
      .from("companies")
      .select("id, customer_id")
      .in("id", companyIds);
    customerByCompanyId = new Map(
      (companies ?? [])
        .filter((c) => !!c.customer_id)
        .map((c) => [c.id, c.customer_id as string]),
    );
  }

  for (const contract of primeContracts) {
    const customerId =
      (contract.client_id && customerByCompanyId.get(contract.client_id)) ||
      (contract.contract_company_id &&
        customerByCompanyId.get(contract.contract_company_id)) ||
      null;
    const projectCode = project?.acumatica_project_id ?? contract.contract_number;

    const payload: Record<string, unknown> = {
      ProjectID: acuField(projectCode),
      Description: acuField(contract.description ?? contract.title),
      Customer: acuField(customerId),
      Status: acuField(contract.executed ? "Active" : "In Planning"),
      Income: acuField(
        contract.revised_contract_value ?? contract.original_contract_value ?? 0,
      ),
    };

    try {
      const response = await acuClient.upsertProject(payload);
      const returnedProjectId =
        typeof response.ProjectID === "string" ? response.ProjectID : projectCode;
      if (!project?.acumatica_project_id && returnedProjectId) {
        await supabase
          .from("projects")
          .update({ acumatica_project_id: returnedProjectId })
          .eq("id", projectId);
      }

      if (project?.acumatica_project_id) result.updated++;
      else result.created++;
      auditLogs.push({
        run_id: runId,
        triggered_by_user_id: auditContext?.userId ?? null,
        project_id: projectId,
        contract_id: contract.id,
        entity_name: "primeContracts",
        source_table: "prime_contracts",
        source_record_id: contract.id,
        source_reference: contract.contract_number ?? null,
        acumatica_entity: "Project",
        acumatica_reference: returnedProjectId,
        acumatica_doc_type: null,
        operation: project?.acumatica_project_id ? "update" : "create",
        success: true,
        error_message: null,
        request_payload: payload,
        response_payload: response,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`Prime contract ${contract.contract_number}: ${message}`);
      auditLogs.push({
        run_id: runId,
        triggered_by_user_id: auditContext?.userId ?? null,
        project_id: projectId,
        contract_id: contract.id,
        entity_name: "primeContracts",
        source_table: "prime_contracts",
        source_record_id: contract.id,
        source_reference: contract.contract_number ?? null,
        acumatica_entity: "Project",
        acumatica_reference: projectCode,
        acumatica_doc_type: null,
        operation: "error",
        success: false,
        error_message: message,
        request_payload: payload,
        response_payload: null,
      });
    }
  }

  await flushOutboundAuditLogs(supabase, auditLogs);
  return result;
}

/**
 * Export commitment + prime change orders from the app to Acumatica.
 */
export async function exportChangeOrdersToAcumatica(
  projectId: number,
  auditContext?: AcumaticaOutboundAuditContext,
): Promise<ExportSyncResult> {
  const result: ExportSyncResult = { created: 0, updated: 0, skipped: 0, errors: [] };
  const supabase = await createClient();
  const acuClient = createAcumaticaClient();
  await acuClient.login();
  const runId = auditContext?.runId ?? crypto.randomUUID();
  const auditLogs: OutboundAuditLogRow[] = [];

  const { data: project } = await supabase
    .from("projects")
    .select("acumatica_project_id")
    .eq("id", projectId)
    .single();
  if (!project?.acumatica_project_id) {
    result.errors.push("Project has no acumatica_project_id mapping.");
    return result;
  }

  const acuProjectId = project.acumatica_project_id;

  const [{ data: primeCos, error: primeError }, { data: primeContracts, error: mapError }] =
    await Promise.all([
      supabase
        .from("prime_contract_change_orders")
        .select(
          "id, pcco_number, title, total_amount, status, submitted_at, acumatica_external_key",
        )
        .eq("project_id", projectId),
      supabase
        .from("prime_contracts")
        .select("id")
        .eq("project_id", projectId),
    ]);
  if (primeError) result.errors.push(`Failed loading prime change orders: ${primeError.message}`);
  if (mapError) result.errors.push(`Failed loading contract map: ${mapError.message}`);

  const contractIds = (primeContracts ?? []).map((c) => c.id);
  const { data: commitmentCos, error: commitmentError } = contractIds.length
    ? await supabase
        .from("contract_change_orders")
        .select(
          "id, change_order_number, description, amount, status, requested_date, acumatica_external_key, contract_id",
        )
        .in("contract_id", contractIds)
    : { data: [], error: null };

  if (commitmentError) {
    result.errors.push(`Failed loading commitment change orders: ${commitmentError.message}`);
  }

  for (const co of primeCos ?? []) {
    const referenceNbr = co.acumatica_external_key ?? co.pcco_number ?? `PCCO-${co.id}`;
    const payload: Record<string, unknown> = {
      ReferenceNbr: acuField(referenceNbr),
      Project: acuField(acuProjectId),
      Description: acuField(co.title),
      ChangeDate: acuField(toIsoDate(co.submitted_at)),
      RevenueBudgetChangeTotal: acuField(co.total_amount ?? 0),
      CommitmentsChangeTotal: acuField(0),
      Status: acuField(mapOutboundPrimeCoStatus(co.status)),
    };

    try {
      const existed = !!co.acumatica_external_key;
      const response = await acuClient.upsertChangeOrder(payload);
      const returnedRef =
        typeof response.ReferenceNbr === "string" ? response.ReferenceNbr : referenceNbr;
      await supabase
        .from("prime_contract_change_orders")
        .update({ acumatica_external_key: returnedRef })
        .eq("id", co.id);

      if (existed) result.updated++;
      else result.created++;
      auditLogs.push({
        run_id: runId,
        triggered_by_user_id: auditContext?.userId ?? null,
        project_id: projectId,
        contract_id: null,
        entity_name: "changeOrders",
        source_table: "prime_contract_change_orders",
        source_record_id: String(co.id),
        source_reference: co.pcco_number ?? null,
        acumatica_entity: "ChangeOrder",
        acumatica_reference: returnedRef,
        acumatica_doc_type: null,
        operation: existed ? "update" : "create",
        success: true,
        error_message: null,
        request_payload: payload,
        response_payload: response,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`Prime CO ${referenceNbr}: ${message}`);
      auditLogs.push({
        run_id: runId,
        triggered_by_user_id: auditContext?.userId ?? null,
        project_id: projectId,
        contract_id: null,
        entity_name: "changeOrders",
        source_table: "prime_contract_change_orders",
        source_record_id: String(co.id),
        source_reference: co.pcco_number ?? null,
        acumatica_entity: "ChangeOrder",
        acumatica_reference: referenceNbr,
        acumatica_doc_type: null,
        operation: "error",
        success: false,
        error_message: message,
        request_payload: payload,
        response_payload: null,
      });
    }
  }

  for (const co of commitmentCos ?? []) {
    const referenceNbr =
      co.acumatica_external_key ?? co.change_order_number ?? `CCO-${co.id}`;
    const payload: Record<string, unknown> = {
      ReferenceNbr: acuField(referenceNbr),
      Project: acuField(acuProjectId),
      Description: acuField(co.description),
      ChangeDate: acuField(toIsoDate(co.requested_date)),
      RevenueBudgetChangeTotal: acuField(0),
      CommitmentsChangeTotal: acuField(co.amount ?? 0),
      Status: acuField(mapOutboundPrimeCoStatus(co.status)),
    };

    try {
      const existed = !!co.acumatica_external_key;
      const response = await acuClient.upsertChangeOrder(payload);
      const returnedRef =
        typeof response.ReferenceNbr === "string" ? response.ReferenceNbr : referenceNbr;
      await supabase
        .from("contract_change_orders")
        .update({ acumatica_external_key: returnedRef })
        .eq("id", co.id);

      if (existed) result.updated++;
      else result.created++;
      auditLogs.push({
        run_id: runId,
        triggered_by_user_id: auditContext?.userId ?? null,
        project_id: projectId,
        contract_id: co.contract_id,
        entity_name: "changeOrders",
        source_table: "contract_change_orders",
        source_record_id: co.id,
        source_reference: co.change_order_number ?? null,
        acumatica_entity: "ChangeOrder",
        acumatica_reference: returnedRef,
        acumatica_doc_type: null,
        operation: existed ? "update" : "create",
        success: true,
        error_message: null,
        request_payload: payload,
        response_payload: response,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`Commitment CO ${referenceNbr}: ${message}`);
      auditLogs.push({
        run_id: runId,
        triggered_by_user_id: auditContext?.userId ?? null,
        project_id: projectId,
        contract_id: co.contract_id,
        entity_name: "changeOrders",
        source_table: "contract_change_orders",
        source_record_id: co.id,
        source_reference: co.change_order_number ?? null,
        acumatica_entity: "ChangeOrder",
        acumatica_reference: referenceNbr,
        acumatica_doc_type: null,
        operation: "error",
        success: false,
        error_message: message,
        request_payload: payload,
        response_payload: null,
      });
    }
  }

  await flushOutboundAuditLogs(supabase, auditLogs);
  return result;
}

/**
 * Export prime contract payment applications from the app to Acumatica AR Invoices.
 *
 * Optional `contractId` limits export to a single prime contract.
 */
export async function exportPaymentApplicationsToAcumatica(
  projectId: number,
  contractId?: string,
  auditContext?: AcumaticaOutboundAuditContext,
): Promise<ExportSyncResult> {
  const result: ExportSyncResult = { created: 0, updated: 0, skipped: 0, errors: [] };
  const supabase = await createClient();
  const acuClient = createAcumaticaClient();
  await acuClient.login();
  const runId = auditContext?.runId ?? crypto.randomUUID();
  const auditLogs: OutboundAuditLogRow[] = [];

  const { data: project } = await supabase
    .from("projects")
    .select("acumatica_project_id")
    .eq("id", projectId)
    .single();

  if (!project?.acumatica_project_id) {
    result.errors.push("Project has no acumatica_project_id mapping.");
    return result;
  }

  let contractsQuery = supabase
    .from("prime_contracts")
    .select("id, client_id, contract_company_id")
    .eq("project_id", projectId);

  if (contractId) {
    contractsQuery = contractsQuery.eq("id", contractId);
  }

  const { data: primeContracts, error: contractsError } = await contractsQuery;
  if (contractsError) {
    result.errors.push(`Failed loading prime contracts: ${contractsError.message}`);
    return result;
  }

  const contractIds = (primeContracts ?? []).map((c) => c.id);
  if (!contractIds.length) {
    result.skipped++;
    return result;
  }

  const companyIds = Array.from(
    new Set(
      (primeContracts ?? [])
        .flatMap((c) => [c.client_id, c.contract_company_id])
        .filter(Boolean) as string[],
    ),
  );

  const customerByCompanyId = new Map<string, string>();
  if (companyIds.length) {
    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("id, customer_id")
      .in("id", companyIds);

    if (companiesError) {
      result.errors.push(`Failed loading company mappings: ${companiesError.message}`);
      return result;
    }

    for (const company of companies ?? []) {
      if (company.customer_id) {
        customerByCompanyId.set(company.id, company.customer_id);
      }
    }
  }

  const customerByContractId = new Map<string, string>();
  for (const contract of primeContracts ?? []) {
    const customerId =
      (contract.client_id && customerByCompanyId.get(contract.client_id)) ||
      (contract.contract_company_id &&
        customerByCompanyId.get(contract.contract_company_id)) ||
      null;

    if (customerId) {
      customerByContractId.set(contract.id, customerId);
    }
  }

  const { data: applications, error: applicationsError } = await supabase
    .from("prime_contract_payment_applications")
    .select(
      "id, contract_id, application_number, amount, net_amount, retention_amount, status, period_from, period_to, notes",
    )
    .in("contract_id", contractIds)
    .order("application_number", { ascending: true });

  if (applicationsError) {
    result.errors.push(`Failed loading payment applications: ${applicationsError.message}`);
    return result;
  }

  const { data: ownerInvoices, error: ownerInvoicesError } = await supabase
    .from("owner_invoices")
    .select("acumatica_ref_nbr")
    .in("prime_contract_id", contractIds)
    .not("acumatica_ref_nbr", "is", null);

  if (ownerInvoicesError) {
    result.errors.push(`Failed loading existing Acumatica invoice refs: ${ownerInvoicesError.message}`);
    return result;
  }

  const existingRefs = new Set(
    (ownerInvoices ?? [])
      .map((invoice) => invoice.acumatica_ref_nbr)
      .filter((ref): ref is string => Boolean(ref)),
  );

  const acuProjectTasks = await acuClient.getProjectTasks({
    $filter: `ProjectID eq '${escapeODataString(project.acumatica_project_id)}'`,
    $top: 50,
  });
  const defaultProjectTaskCode =
    acuProjectTasks
      .find((task) => task.Status === "Active" && typeof task.ProjectTaskID === "string")
      ?.ProjectTaskID?.trim() ||
    acuProjectTasks
      .find((task) => typeof task.ProjectTaskID === "string")
      ?.ProjectTaskID?.trim() ||
    "PROJECT";

  for (const application of applications ?? []) {
    const customerId = customerByContractId.get(application.contract_id);
    if (!customerId) {
      const message = `Payment application ${application.application_number}: no Acumatica customer mapping found for its prime contract company.`;
      result.errors.push(message);
      auditLogs.push({
        run_id: runId,
        triggered_by_user_id: auditContext?.userId ?? null,
        project_id: projectId,
        contract_id: application.contract_id,
        entity_name: "paymentApplications",
        source_table: "prime_contract_payment_applications",
        source_record_id: application.id,
        source_reference: application.application_number ?? null,
        acumatica_entity: "Invoice",
        acumatica_reference: null,
        acumatica_doc_type: "Invoice",
        operation: "error",
        success: false,
        error_message: message,
        request_payload: null,
        response_payload: null,
      });
      continue;
    }

    const status = (application.status ?? "").toLowerCase();
    if (status === "draft" || status === "rejected") {
      result.skipped++;
      auditLogs.push({
        run_id: runId,
        triggered_by_user_id: auditContext?.userId ?? null,
        project_id: projectId,
        contract_id: application.contract_id,
        entity_name: "paymentApplications",
        source_table: "prime_contract_payment_applications",
        source_record_id: application.id,
        source_reference: application.application_number ?? null,
        acumatica_entity: "Invoice",
        acumatica_reference: null,
        acumatica_doc_type: "Invoice",
        operation: "skip",
        success: true,
        error_message: `Skipped due to status '${status}'.`,
        request_payload: null,
        response_payload: null,
      });
      continue;
    }

    const referenceNbr =
      application.application_number?.trim() || `PAYAPP-${application.id}`;
    const description = `Payment Application ${referenceNbr}`;
    const grossAmount = application.amount ?? 0;
    const netAmount = application.net_amount ?? grossAmount;
    const detailDescription =
      application.notes?.trim() || description;

    const escapedCustomer = escapeODataString(customerId);
    const escapedDescription = escapeODataString(description);
    const candidateInvoices = await acuClient.getInvoices({
      $filter: `Type eq 'Invoice' and Customer eq '${escapedCustomer}' and Description eq '${escapedDescription}'`,
      $top: 200,
    });

    const existingAcumaticaInvoiceRef = candidateInvoices
      .filter((invoice) => typeof invoice.ReferenceNbr === "string")
      .sort((a, b) =>
        String(b.LastModifiedDateTime ?? "").localeCompare(
          String(a.LastModifiedDateTime ?? ""),
        ),
      )[0]?.ReferenceNbr;

    const payload: Record<string, unknown> = {
      Type: acuField("Invoice"),
      ReferenceNbr: acuField(existingAcumaticaInvoiceRef ?? referenceNbr),
      Customer: acuField(customerId),
      Project: acuField(project.acumatica_project_id),
      Date: acuField(toIsoDate(application.period_from ?? undefined)),
      DueDate: acuField(toIsoDate(application.period_to ?? application.period_from ?? undefined)),
      Description: acuField(description),
      Amount: acuField(grossAmount),
      Status: acuField(mapOutboundInvoiceStatus(application.status)),
      ...(netAmount > 0
        ? {
            Details: [
              {
                LineNbr: acuField(1),
                TransactionDescription: acuField(detailDescription),
                ExtendedPrice: acuField(netAmount),
                Project: acuField(project.acumatica_project_id),
                ProjectTaskID: acuField(defaultProjectTaskCode),
              },
            ],
          }
        : {}),
    };

    try {
      const existed = Boolean(existingAcumaticaInvoiceRef) || existingRefs.has(referenceNbr);
      const response = await upsertInvoiceWithProjectFallback(acuClient, payload, {
        allowProjectFallback: false,
      });
      const returnedRef =
        typeof response.ReferenceNbr === "string"
          ? response.ReferenceNbr
          : existingAcumaticaInvoiceRef ?? referenceNbr;
      existingRefs.add(returnedRef);

      if (existed) result.updated++;
      else result.created++;
      auditLogs.push({
        run_id: runId,
        triggered_by_user_id: auditContext?.userId ?? null,
        project_id: projectId,
        contract_id: application.contract_id,
        entity_name: "paymentApplications",
        source_table: "prime_contract_payment_applications",
        source_record_id: application.id,
        source_reference: application.application_number ?? null,
        acumatica_entity: "Invoice",
        acumatica_reference: returnedRef,
        acumatica_doc_type: "Invoice",
        operation: existed ? "update" : "create",
        success: true,
        error_message: null,
        request_payload: payload,
        response_payload: response,
      });
    } catch (error) {
      const baseMessage =
        error instanceof Error ? error.message : String(error);
      const message = isProjectPermissionOrContextError(error)
        ? `${baseMessage}. Project '${project.acumatica_project_id}' could not be applied on AR Invoice for customer '${customerId}'. Verify Acumatica AR/PM project-customer configuration.`
        : baseMessage;
      result.errors.push(
        `Payment application ${referenceNbr}: ${message}`,
      );
      auditLogs.push({
        run_id: runId,
        triggered_by_user_id: auditContext?.userId ?? null,
        project_id: projectId,
        contract_id: application.contract_id,
        entity_name: "paymentApplications",
        source_table: "prime_contract_payment_applications",
        source_record_id: application.id,
        source_reference: application.application_number ?? null,
        acumatica_entity: "Invoice",
        acumatica_reference: existingAcumaticaInvoiceRef ?? referenceNbr,
        acumatica_doc_type: "Invoice",
        operation: "error",
        success: false,
        error_message: message,
        request_payload: payload,
        response_payload: null,
      });
    }
  }

  await flushOutboundAuditLogs(supabase, auditLogs);
  return result;
}

/**
 * Export owner invoices from the app to Acumatica AR Invoices.
 */
export async function exportOwnerInvoicesToAcumatica(
  projectId: number,
  auditContext?: AcumaticaOutboundAuditContext,
): Promise<ExportSyncResult> {
  const result: ExportSyncResult = { created: 0, updated: 0, skipped: 0, errors: [] };
  const supabase = await createClient();
  const acuClient = createAcumaticaClient();
  await acuClient.login();
  const runId = auditContext?.runId ?? crypto.randomUUID();
  const auditLogs: OutboundAuditLogRow[] = [];

  const [{ data: project }, { data: primeContracts }] = await Promise.all([
    supabase
      .from("projects")
      .select("acumatica_project_id")
      .eq("id", projectId)
      .single(),
    supabase
      .from("prime_contracts")
      .select("id, client_id, contract_company_id")
      .eq("project_id", projectId),
  ]);

  if (!project?.acumatica_project_id) {
    result.errors.push("Project has no acumatica_project_id mapping.");
    return result;
  }

  const primeContractIds = (primeContracts ?? []).map((c) => c.id);
  if (!primeContractIds.length) {
    result.skipped++;
    return result;
  }

  const companyIds = Array.from(
    new Set(
      (primeContracts ?? [])
        .flatMap((c) => [c.client_id, c.contract_company_id])
        .filter(Boolean) as string[],
    ),
  );
  let customerByCompanyId = new Map<string, string>();
  if (companyIds.length) {
    const { data: companies } = await supabase
      .from("companies")
      .select("id, customer_id")
      .in("id", companyIds);
    customerByCompanyId = new Map(
      (companies ?? [])
        .filter((c) => !!c.customer_id)
        .map((c) => [c.id, c.customer_id as string]),
    );
  }

  const customerId =
    (primeContracts ?? [])
      .map(
        (c) =>
          (c.client_id && customerByCompanyId.get(c.client_id)) ||
          (c.contract_company_id &&
            customerByCompanyId.get(c.contract_company_id)) ||
          null,
      )
      .find(Boolean) ?? null;

  if (!customerId) {
    result.errors.push(
      "No Acumatica customer mapping found for the project's prime contract companies.",
    );
    return result;
  }

  const { data: invoices, error: invoicesError } = await supabase
    .from("owner_invoices")
    .select(
      "id, invoice_number, status, acumatica_ref_nbr, acumatica_doc_type, billing_date, due_date, period_start, period_end, gross_amount, net_amount, prime_contract_id",
    )
    .in("prime_contract_id", primeContractIds);

  if (invoicesError) {
    result.errors.push(`Failed loading owner invoices: ${invoicesError.message}`);
    return result;
  }

  const invoiceIds = (invoices ?? []).map((i) => i.id);
  const { data: lineItems } = invoiceIds.length
    ? await supabase
        .from("owner_invoice_line_items")
        .select("invoice_id, acumatica_line_nbr, description, approved_amount, category")
        .in("invoice_id", invoiceIds)
    : { data: [] };

  const linesByInvoiceId = new Map<number, Array<Record<string, unknown>>>();
  for (const line of lineItems ?? []) {
    const current = linesByInvoiceId.get(line.invoice_id) ?? [];
    current.push({
      LineNbr: acuField(line.acumatica_line_nbr ?? undefined),
      TransactionDescription: acuField(line.description ?? undefined),
      ExtendedPrice: acuField(line.approved_amount ?? 0),
      AccountID: acuField(line.category ?? undefined),
    });
    linesByInvoiceId.set(line.invoice_id, current);
  }

  const now = new Date().toISOString();

  for (const invoice of invoices ?? []) {
    const referenceNbr =
      invoice.acumatica_ref_nbr ??
      invoice.invoice_number ??
      `OWNER-INV-${invoice.id}`;
    const docType = invoice.acumatica_doc_type ?? "Invoice";
    const details = linesByInvoiceId.get(invoice.id) ?? [];

    const payload: Record<string, unknown> = {
      Type: acuField(docType),
      ReferenceNbr: acuField(referenceNbr),
      Customer: acuField(customerId),
      Date: acuField(toIsoDate(invoice.billing_date ?? invoice.period_start)),
      DueDate: acuField(toIsoDate(invoice.due_date ?? invoice.period_end)),
      Description: acuField(`Owner Invoice ${invoice.invoice_number ?? referenceNbr}`),
      Amount: acuField(invoice.gross_amount ?? invoice.net_amount ?? 0),
      Status: acuField(mapOutboundInvoiceStatus(invoice.status)),
      Details: details,
    };

    try {
      const existed = !!invoice.acumatica_ref_nbr;
      const response = await upsertInvoiceWithProjectFallback(acuClient, payload);
      const returnedRef =
        typeof response.ReferenceNbr === "string" ? response.ReferenceNbr : referenceNbr;
      const returnedType =
        typeof response.Type === "string" ? response.Type : docType;

      await supabase
        .from("owner_invoices")
        .update({
          acumatica_ref_nbr: returnedRef,
          acumatica_doc_type: returnedType,
          acumatica_sync_at: now,
        })
        .eq("id", invoice.id);

      if (existed) result.updated++;
      else result.created++;
      auditLogs.push({
        run_id: runId,
        triggered_by_user_id: auditContext?.userId ?? null,
        project_id: projectId,
        contract_id: invoice.prime_contract_id,
        entity_name: "invoices",
        source_table: "owner_invoices",
        source_record_id: String(invoice.id),
        source_reference: invoice.invoice_number ?? null,
        acumatica_entity: "Invoice",
        acumatica_reference: returnedRef,
        acumatica_doc_type: returnedType,
        operation: existed ? "update" : "create",
        success: true,
        error_message: null,
        request_payload: payload,
        response_payload: response,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`Owner invoice ${referenceNbr}: ${message}`);
      auditLogs.push({
        run_id: runId,
        triggered_by_user_id: auditContext?.userId ?? null,
        project_id: projectId,
        contract_id: invoice.prime_contract_id,
        entity_name: "invoices",
        source_table: "owner_invoices",
        source_record_id: String(invoice.id),
        source_reference: invoice.invoice_number ?? null,
        acumatica_entity: "Invoice",
        acumatica_reference: referenceNbr,
        acumatica_doc_type: docType,
        operation: "error",
        success: false,
        error_message: message,
        request_payload: payload,
        response_payload: null,
      });
    }
  }

  await flushOutboundAuditLogs(supabase, auditLogs);
  return result;
}
