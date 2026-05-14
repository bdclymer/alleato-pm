/**
Acumatica → Supabase sync service — read-only inbound operations.
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
  FlatPurchaseOrderDetail,
  FlatPurchaseOrder,
  FlatSubcontractDetail,
  FlatSubcontract,
  FlatVendor,
} from "./types";

type DbClient = SupabaseClient<Database>;
type PublicTables = Database["public"]["Tables"];
type SubcontractSovInsert = PublicTables["subcontract_sov_items"]["Insert"];
type PurchaseOrderSovInsert = PublicTables["purchase_order_sov_items"]["Insert"];
type AcumaticaApBillProjection = Pick<
  PublicTables["acumatica_ap_bills"]["Row"],
  | "id"
  | "reference_nbr"
  | "document_type"
  | "vendor_id"
  | "company_id"
  | "project_id"
  | "date"
  | "due_date"
  | "status"
  | "amount"
  | "description"
  | "vendor_ref"
>;
type AcumaticaCheckProjection = Pick<
  PublicTables["acumatica_checks"]["Row"],
  | "id"
  | "external_key"
  | "reference_nbr"
  | "document_type"
  | "vendor_id"
  | "vendor_name"
  | "payment_ref"
  | "application_date"
  | "status"
  | "description"
  | "payment_method"
  | "payment_amount"
>;

export interface VendorSyncResult {
  created: number;
  updated: number;
  errors: string[];
}

type ExistingVendorCompany = {
  id: string;
  name: string | null;
  acumatica_vendor_id: string | null;
};

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

  const { data: existingCompanies, error: existingCompaniesError } = await supabase
    .from("companies")
    .select("id, name, acumatica_vendor_id")
    .eq("is_vendor", true);

  if (existingCompaniesError) {
    result.errors.push(`Failed to load existing vendor companies: ${existingCompaniesError.message}`);
    return result;
  }

  const existingByAcuId = new Map<string, ExistingVendorCompany>();
  const existingByName = new Map<string, ExistingVendorCompany>();

  for (const row of (existingCompanies ?? []) as ExistingVendorCompany[]) {
    if (row.acumatica_vendor_id) {
      existingByAcuId.set(row.acumatica_vendor_id, row);
    }
    const normalizedName = row.name?.trim().toLowerCase();
    if (normalizedName) {
      existingByName.set(normalizedName, row);
    }
  }

  for (const acuVendor of activeVendors) {
    const acuId = acuVendor.VendorID;
    const payload = toCompanyVendorFields(acuVendor, now);
    const normalizedVendorName = acuVendor.VendorName.trim().toLowerCase();
    const existingCompany = existingByAcuId.get(acuId) ?? existingByName.get(normalizedVendorName);

    try {
      if (existingCompany) {
        const { error } = await supabase
          .from("companies")
          .update(payload)
          .eq("id", existingCompany.id);

        if (error) {
          result.errors.push(`${acuId} (${acuVendor.VendorName}): ${error.message}`);
          continue;
        }

        const updatedCompany = {
          ...existingCompany,
          ...payload,
        };
        existingByAcuId.set(acuId, updatedCompany);
        existingByName.set(normalizedVendorName, updatedCompany);
        result.updated++;
      } else {
        const { data, error } = await supabase
          .from("companies")
          .insert(payload)
          .select("id, name, acumatica_vendor_id")
          .single();

        if (error) {
          result.errors.push(`${acuId} (${acuVendor.VendorName}): ${error.message}`);
          continue;
        }

        const insertedCompany = data as ExistingVendorCompany;
        if (insertedCompany.acumatica_vendor_id) {
          existingByAcuId.set(insertedCompany.acumatica_vendor_id, insertedCompany);
        }
        const insertedName = insertedCompany.name?.trim().toLowerCase();
        if (insertedName) {
          existingByName.set(insertedName, insertedCompany);
        }
        result.created++;
      }
    } catch (err) {
      result.errors.push(`${acuId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

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
  userId: string | null,
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

  const { data: latestSyncLog, error: latestSyncLogError } = await supabase
    .from("erp_sync_log")
    .select("last_direct_cost_sync")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestSyncLogError) {
    result.errors.push(`Failed to load prior direct cost sync cursor: ${latestSyncLogError.message}`);
    return result;
  }

  const modifiedAfter = latestSyncLog?.last_direct_cost_sync ?? undefined;

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
      modifiedAfter,
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
      const unitCost = quantity > 0 ? amount / quantity : amount;
      mappedLineItems.push({
        budget_code_id: projectCostCodeId,
        description: detail.Description ?? null,
        quantity,
        uom: detail.UOM ?? null,
        unit_cost: unitCost,
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
    const totalAmount = mappedLineItems.reduce((sum, line) => sum + line.unit_cost * line.quantity, 0);

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
      invoice_number: typeof header.OriginalDocNbr === "string" && header.OriginalDocNbr.trim() !== "" ? header.OriginalDocNbr : null,
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
      let existingId = byDocumentKey.get(documentKey) ?? byRefNbr.get(refNbr);

      // If not in our pre-loaded map, do a point-query to catch records created
      // in prior partial runs (prevents duplicate key violations on re-sync).
      if (!existingId) {
        const { data: existing } = await supabase
          .from("direct_costs")
          .select("id")
          .eq("acumatica_document_key", documentKey)
          .maybeSingle();
        if (existing?.id) {
          existingId = existing.id;
          byDocumentKey.set(documentKey, existingId);
        }
      }

      if (existingId) {
        const { error: updateError } = await supabase
          .from("direct_costs")
          .update({ ...fields, updated_by_user_id: userId ?? undefined })
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
          created_by_user_id: userId ?? "",
          updated_by_user_id: userId ?? "",
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
  _userId: string | null,
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
  _userId: string | null,
  supabaseClient?: DbClient,
): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, errors: [] };

  const supabase = supabaseClient ?? (await createClient());

  // Get the project's primary prime contract and its associated company's customer_id
  const { data: primeContract } = await supabase
    .from("prime_contracts")
    .select("id, contract_number, contract_company_id")
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

  const { data: project } = await supabase
    .from("projects")
    .select("acumatica_project_id")
    .eq("id", projectId)
    .single();

  const matchTokens = [
    primeContract.contract_number,
    primeContract.contract_number?.replace(/^PC-/i, ""),
    project?.acumatica_project_id,
  ]
    .filter((token): token is string => Boolean(token && token.length >= 4))
    .map((token) => token.toLowerCase());

  const acuClient = createAcumaticaClient();
  await acuClient.login();

  const acuPayments = await acuClient.getPayments({ $top: 500 });

  // Filter payments to this project's customer
  const customerPayments = acuPayments.filter((p) => {
    if (p.CustomerID !== acumaticaCustomerId) return false;
    if (!(p.Status === "Released" || p.Status === "Closed" || p.Status === "Open")) return false;
    if (p.Type?.toLowerCase().includes("credit memo")) return false;
    if (matchTokens.length === 0) return true;
    const haystack = [p.Description, p.ExternalRef, p.ReferenceNbr]
      .filter((value): value is string => typeof value === "string")
      .join(" ")
      .toLowerCase();
    return matchTokens.some((token) => haystack.includes(token));
  });

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

export function mapCommitmentStatusFromAcumatica(acuStatus?: string | null): string {
  switch (acuStatus?.toLowerCase()) {
    case "open":
    case "pending receipt":
      return "Approved";
    case "closed":
    case "completed":
      return "Complete";
    case "pending approval":
    case "pending print":
    case "pending email":
      return "Out for Signature";
    case "canceled":
    case "cancelled":
      return "Terminated";
    case "hold":
    case "on hold":
    default:
      return "Draft";
  }
}

function firstText(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const normalized = value?.trim();
    if (normalized) return normalized;
  }
  return null;
}

function projectCodeAliases(value: string | null | undefined): Set<string> {
  const aliases = new Set<string>();
  const raw = value?.trim();
  if (!raw) return aliases;

  aliases.add(raw);
  const compact = raw.replace(/[^a-zA-Z0-9]/g, "");
  if (compact) {
    aliases.add(compact);
    if (/^\d{4,}$/.test(compact)) aliases.add(`${compact.slice(0, 2)}-${compact.slice(2)}`);
  }

  return aliases;
}

function detailProjectCode(detail: FlatSubcontractDetail | FlatPurchaseOrderDetail): string | null {
  return firstText(detail.ProjectID, detail.Project, detail.ProjectCD);
}

export function subcontractMatchesProject(subcontract: FlatSubcontract, acuProjectId: string): boolean {
  const projectAliases = projectCodeAliases(acuProjectId);
  const headerProject = firstText(subcontract.ProjectID);
  if (headerProject && projectAliases.has(headerProject)) return true;
  return Boolean(subcontract.Details?.some((detail) => {
    const detailProject = detailProjectCode(detail);
    return detailProject ? projectAliases.has(detailProject) : false;
  }));
}

export function purchaseOrderMatchesProject(purchaseOrder: FlatPurchaseOrder, acuProjectId: string): boolean {
  const projectAliases = projectCodeAliases(acuProjectId);
  const headerProject = firstText(purchaseOrder.ProjectID, purchaseOrder.Project, purchaseOrder.ProjectCD);
  if (headerProject && projectAliases.has(headerProject)) return true;
  return Boolean(purchaseOrder.Details?.some((detail) => {
    const detailProject = detailProjectCode(detail);
    return detailProject ? projectAliases.has(detailProject) : false;
  }));
}

export function buildSubcontractExternalKey(subcontractNbr: string): string {
  return `Subcontract|${subcontractNbr}`;
}

export function buildPurchaseOrderExternalKey(orderNbr: string, orderType?: string | null): string {
  return `${orderType || "PurchaseOrder"}|${orderNbr}`;
}

function lineNumber(detail: FlatSubcontractDetail | FlatPurchaseOrderDetail): number | null {
  const value = detail.LineNbr ?? ("LineNumber" in detail ? detail.LineNumber : undefined);
  return value == null ? null : Number(value);
}

function lineAmount(detail: FlatSubcontractDetail | FlatPurchaseOrderDetail): number {
  return detail.Amount ?? detail.ExtCost ?? detail.ExtendedCost ?? 0;
}

function lineDescription(detail: FlatSubcontractDetail | FlatPurchaseOrderDetail): string | null {
  return detail.Description ?? detail.TransactionDescription ?? null;
}

function lineQuantity(detail: FlatSubcontractDetail | FlatPurchaseOrderDetail): number | null {
  return detail.Quantity ?? detail.Qty ?? ("OrderQty" in detail ? detail.OrderQty : undefined) ?? null;
}

function lineCostCode(detail: FlatSubcontractDetail | FlatPurchaseOrderDetail): string | null {
  return ("CostCode" in detail ? detail.CostCode : undefined) ?? detail.CostCodeID ?? null;
}

function mapSubcontractSovItems(
  subcontractId: string,
  details: FlatSubcontractDetail[] | undefined,
  now: string,
): SubcontractSovInsert[] {
  return (details ?? []).flatMap((detail) => {
    const number = lineNumber(detail);
    if (number == null) return [];
    return [{
      subcontract_id: subcontractId,
      line_number: number,
      acumatica_line_nbr: number,
      description: lineDescription(detail),
      budget_code: lineCostCode(detail),
      quantity: lineQuantity(detail),
      unit_cost: detail.UnitCost ?? null,
      unit_of_measure: detail.UOM ?? null,
      amount: Math.max(0, lineAmount(detail)),
      updated_at: now,
    }];
  });
}

function mapPurchaseOrderSovItems(
  purchaseOrderId: string,
  details: FlatPurchaseOrderDetail[] | undefined,
  now: string,
): PurchaseOrderSovInsert[] {
  return (details ?? []).flatMap((detail) => {
    const number = lineNumber(detail);
    if (number == null) return [];
    return [{
      purchase_order_id: purchaseOrderId,
      line_number: number,
      acumatica_line_nbr: number,
      description: lineDescription(detail),
      budget_code: lineCostCode(detail),
      quantity: lineQuantity(detail),
      uom: detail.UOM ?? null,
      unit_cost: detail.UnitCost ?? null,
      amount: lineAmount(detail),
      updated_at: now,
    }];
  });
}

/**
 * Pull Subcontracts from Acumatica and upsert into the subcontracts table.
 *
 * Matching: acumatica_external_key (SubcontractNbr).
 */
export async function syncSubcontracts(
  projectId: number,
  userId: string | null,
  supabaseClient?: DbClient,
): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, errors: [] };

  const acuClient = createAcumaticaClient();
  await acuClient.login();

  const acuSubcontracts: FlatSubcontract[] = [];
  let subcontractSkip = 0;
  const subcontractPageSize = 100;
  while (true) {
    const page = await acuClient.getSubcontracts({
      $top: subcontractPageSize,
      $skip: subcontractSkip,
      $expand: "Details",
    });
    if (page.length === 0) break;
    acuSubcontracts.push(...page);
    if (page.length < subcontractPageSize) break;
    subcontractSkip += subcontractPageSize;
  }

  const supabase = supabaseClient ?? (await createClient());

  // Get project's Acumatica ID for filtering
  const { data: project } = await supabase
    .from("projects")
    .select("acumatica_project_id")
    .eq("id", projectId)
    .single();

  const acuProjectId = project?.acumatica_project_id;

  // Filter to this project's subcontracts
  const projectSubs = acuProjectId
    ? acuSubcontracts.filter((s) => subcontractMatchesProject(s, acuProjectId))
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
    const externalKey = buildSubcontractExternalKey(subNbr);
    const contractDate = sub.Date ? sub.Date.split("T")[0] : now.split("T")[0];

    const fields = {
      title: sub.Description ?? `Subcontract ${subNbr}`,
      status: mapCommitmentStatusFromAcumatica(sub.Status),
      description: sub.Description ?? null,
      contract_date: contractDate,
      contract_company_id: vendorByAcuId.get(sub.Vendor) ?? null,
      executed: sub.Status === "Open" || sub.Status === "Closed",
      acumatica_external_key: externalKey,
    };

    try {
      const existingId = byExternalKey.get(externalKey) ?? byExternalKey.get(subNbr) ?? byContractNumber.get(subNbr);
      let subcontractId = existingId;

      if (existingId) {
        const { error } = await supabase
          .from("subcontracts")
          .update(fields)
          .eq("id", existingId);
        if (error) {
          result.errors.push(`Sub ${subNbr}: ${error.message}`);
          continue;
        }
        result.updated++;
      } else {
        const { data: inserted, error } = await supabase.from("subcontracts").insert({
          ...fields,
          contract_number: subNbr,
          project_id: projectId,
          created_by: userId,
        }).select("id").single();
        if (error || !inserted) {
          result.errors.push(`Sub ${subNbr}: ${error?.message ?? "Insert failed"}`);
          continue;
        }
        subcontractId = inserted.id;
        result.created++;
      }

      if (subcontractId) {
        const { error: deleteLinesError } = await supabase
          .from("subcontract_sov_items")
          .delete()
          .eq("subcontract_id", subcontractId)
          .not("acumatica_line_nbr", "is", null);
        if (deleteLinesError) {
          result.errors.push(`Sub ${subNbr}: failed to clear Acumatica SOV lines (${deleteLinesError.message})`);
          continue;
        }

        const lineItems = mapSubcontractSovItems(subcontractId, sub.Details, now);
        if (lineItems.length > 0) {
          const { error: insertLinesError } = await supabase.from("subcontract_sov_items").insert(lineItems);
          if (insertLinesError) {
            result.errors.push(`Sub ${subNbr}: failed to insert SOV lines (${insertLinesError.message})`);
          }
        }
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

/**
 * Pull Purchase Orders from Acumatica and upsert into the purchase_orders table.
 *
 * Matching: acumatica_external_key (OrderNbr).
 */
export async function syncPurchaseOrders(
  projectId: number,
  userId: string | null,
  supabaseClient?: DbClient,
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

  const supabase = supabaseClient ?? (await createClient());

  // Get project's Acumatica ID for filtering
  const { data: project } = await supabase
    .from("projects")
    .select("acumatica_project_id")
    .eq("id", projectId)
    .single();

  const acuProjectId = project?.acumatica_project_id;

  // Filter POs: check if any line item references this project
  const projectPOs = acuProjectId
    ? acuPOs.filter((po) => purchaseOrderMatchesProject(po, acuProjectId))
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
    const externalKey = buildPurchaseOrderExternalKey(orderNbr, po.OrderType);
    const orderDate = po.Date ? po.Date.split("T")[0] : now.split("T")[0];

    const fields = {
      title: po.Description ?? `PO ${orderNbr}`,
      status: mapCommitmentStatusFromAcumatica(po.Status),
      description: po.Description ?? null,
      contract_date: orderDate,
      delivery_date: po.PromisedOn ? po.PromisedOn.split("T")[0] : null,
      contract_company_id: vendorByAcuId.get(po.Vendor) ?? null,
      executed: po.Status === "Open" || po.Status === "Closed",
      payment_terms: null as string | null,
      acumatica_external_key: externalKey,
    };

    try {
      const existingId = byExternalKey.get(externalKey) ?? byExternalKey.get(orderNbr) ?? byContractNumber.get(orderNbr);
      let purchaseOrderId = existingId;

      if (existingId) {
        const { error } = await supabase
          .from("purchase_orders")
          .update(fields)
          .eq("id", existingId);
        if (error) {
          result.errors.push(`PO ${orderNbr}: ${error.message}`);
          continue;
        }
        result.updated++;
      } else {
        const { data: inserted, error } = await supabase.from("purchase_orders").insert({
          ...fields,
          contract_number: orderNbr,
          project_id: projectId,
          created_by: userId,
        }).select("id").single();
        if (error || !inserted) {
          result.errors.push(`PO ${orderNbr}: ${error?.message ?? "Insert failed"}`);
          continue;
        }
        purchaseOrderId = inserted.id;
        result.created++;
      }

      if (purchaseOrderId) {
        const { error: deleteLinesError } = await supabase
          .from("purchase_order_sov_items")
          .delete()
          .eq("purchase_order_id", purchaseOrderId)
          .not("acumatica_line_nbr", "is", null);
        if (deleteLinesError) {
          result.errors.push(`PO ${orderNbr}: failed to clear Acumatica SOV lines (${deleteLinesError.message})`);
          continue;
        }

        const lineItems = mapPurchaseOrderSovItems(purchaseOrderId, po.Details, now);
        if (lineItems.length > 0) {
          const { error: insertLinesError } = await supabase.from("purchase_order_sov_items").insert(lineItems);
          if (insertLinesError) {
            result.errors.push(`PO ${orderNbr}: failed to insert SOV lines (${insertLinesError.message})`);
          }
        }
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
  userId: string | null,
  supabaseClient?: DbClient,
): Promise<SyncResult> {
  const [subResult, poResult] = await Promise.all([
    syncSubcontracts(projectId, userId, supabaseClient),
    syncPurchaseOrders(projectId, userId, supabaseClient),
  ]);

  return {
    created: subResult.created + poResult.created,
    updated: subResult.updated + poResult.updated,
    errors: [...subResult.errors, ...poResult.errors],
  };
}

// ---------------------------------------------------------------------------
// AP Bills → subcontractor_invoices (global, not per-project)
// ---------------------------------------------------------------------------

type InvoiceStatus = "draft" | "pending" | "approved" | "paid" | "void";

function mapApBillStatus(acuStatus: string): InvoiceStatus {
  switch (acuStatus) {
    case "Open":      return "pending";
    case "Closed":    return "paid";
    case "On Hold":   return "draft";
    case "Balanced":  return "pending";
    default:          return "draft";
  }
}

/**
 * Pull all AP Bills from the acumatica_ap_bills mirror table and upsert
 * into subcontractor_invoices.
 *
 * Linkage: bills that have a project_id and a vendor that matches exactly one
 * subcontract (or PO) in that project are linked automatically. Bills with
 * ambiguous or missing linkage are still imported (acumatica_ap_bill_id
 * satisfies the relaxed CHECK constraint).
 *
 * Dedup key: acumatica_ap_bill_id (unique index on subcontractor_invoices).
 */
export async function syncAPBillsToSubcontractorInvoices(
  supabaseClient?: DbClient,
): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, errors: [] };
  const supabase = supabaseClient ?? (await createClient());
  const now = new Date().toISOString();

  // Load all AP bills linked to a local project (paginated — Supabase row limit is 1000)
  const bills: AcumaticaApBillProjection[] = [];
  {
    let offset = 0;
    const PAGE = 1000;
    while (true) {
      const { data, error: billsError } = await supabase
        .from("acumatica_ap_bills")
        .select("id, reference_nbr, document_type, vendor_id, company_id, project_id, date, due_date, status, amount, description, vendor_ref")
        .not("project_id", "is", null)
        .range(offset, offset + PAGE - 1);
      if (billsError) {
        result.errors.push(`Failed to load AP bills: ${billsError.message}`);
        return result;
      }
      if (!data?.length) break;
      bills.push(...data);
      if (data.length < PAGE) break;
      offset += PAGE;
    }
  }

  if (!bills.length) return result;

  // Build vendor lookup: acumatica_vendor_id → company.id
  const { data: vendors } = await supabase
    .from("companies")
    .select("id, acumatica_vendor_id")
    .eq("is_vendor", true)
    .not("acumatica_vendor_id", "is", null);

  const companyByVendorId = new Map<string, string>();
  for (const v of vendors ?? []) {
    if (v.acumatica_vendor_id) companyByVendorId.set(v.acumatica_vendor_id, v.id);
  }

  // Build subcontract lookup: (project_id, company_id) → [subcontract uuid, ...]
  const { data: subcontracts } = await supabase
    .from("subcontracts")
    .select("id, project_id, contract_company_id")
    .not("contract_company_id", "is", null);

  const subsByProjectCompany = new Map<string, string[]>();
  for (const s of subcontracts ?? []) {
    if (!s.contract_company_id) continue;
    const key = `${s.project_id}:${s.contract_company_id}`;
    const arr = subsByProjectCompany.get(key) ?? [];
    arr.push(s.id);
    subsByProjectCompany.set(key, arr);
  }

  // Build purchase_order lookup: (project_id, company_id) → [po uuid, ...]
  const { data: pos } = await supabase
    .from("purchase_orders")
    .select("id, project_id, contract_company_id")
    .not("contract_company_id", "is", null);

  const posByProjectCompany = new Map<string, string[]>();
  for (const po of pos ?? []) {
    if (!po.contract_company_id) continue;
    const key = `${po.project_id}:${po.contract_company_id}`;
    const arr = posByProjectCompany.get(key) ?? [];
    arr.push(po.id);
    posByProjectCompany.set(key, arr);
  }

  // Load existing subcontractor_invoices for dedup (paginated)
  const existingByBillId = new Map<number, number>();
  {
    let offset = 0;
    const PAGE = 1000;
    while (true) {
      const { data, error: existError } = await supabase
        .from("subcontractor_invoices")
        .select("id, acumatica_ap_bill_id")
        .not("acumatica_ap_bill_id", "is", null)
        .range(offset, offset + PAGE - 1);
      if (existError) {
        result.errors.push(`Failed to load existing invoices: ${existError.message}`);
        return result;
      }
      if (!data?.length) break;
      for (const row of data) {
        if (row.acumatica_ap_bill_id != null) {
          existingByBillId.set(row.acumatica_ap_bill_id as number, row.id as number);
        }
      }
      if (data.length < PAGE) break;
      offset += PAGE;
    }
  }

  for (const bill of bills) {
    // Prefer the pre-enriched company_id FK; fall back to vendor_id text lookup
    const companyId: string | null = bill.company_id
      ?? (bill.vendor_id ? companyByVendorId.get(bill.vendor_id) ?? null : null);
    const projectId = bill.project_id as number;

    // Attempt commitment linkage: prefer subcontract, fall back to PO
    let subcontractId: string | null = null;
    let purchaseOrderId: string | null = null;

    if (companyId) {
      const key = `${projectId}:${companyId}`;
      const matchingSubs = subsByProjectCompany.get(key) ?? [];
      const matchingPos = posByProjectCompany.get(key) ?? [];

      if (matchingSubs.length === 1) {
        subcontractId = matchingSubs[0];
      } else if (matchingPos.length === 1) {
        purchaseOrderId = matchingPos[0];
      }
      // Multiple matches or zero → leave both null (acumatica_ap_bill_id satisfies constraint)
    }

    const fields = {
      project_id: projectId,
      subcontract_id: subcontractId,
      purchase_order_id: purchaseOrderId,
      invoice_number: bill.reference_nbr ?? null,
      billing_date: bill.date ?? null,
      period_end: bill.due_date ?? null,
      status: mapApBillStatus(bill.status ?? ""),
      notes: bill.description ?? (bill.vendor_ref ? `Vendor ref: ${bill.vendor_ref}` : null),
      submitted_at: bill.status && bill.status !== "On Hold" ? now : null,
      approved_at: (bill.status === "Closed" || bill.status === "Balanced") ? now : null,
      acumatica_ref_nbr: bill.reference_nbr ?? null,
      acumatica_doc_type: bill.document_type ?? null,
      acumatica_ap_bill_id: bill.id,
      acumatica_sync_at: now,
      updated_at: now,
    };

    try {
      const existingId = existingByBillId.get(bill.id as number);
      if (existingId) {
        const { error } = await supabase
          .from("subcontractor_invoices")
          .update(fields)
          .eq("id", existingId);
        if (error) result.errors.push(`Bill ${bill.reference_nbr}: ${error.message}`);
        else result.updated++;
      } else {
        const { error } = await supabase
          .from("subcontractor_invoices")
          .insert({ ...fields, created_at: now });
        if (error) result.errors.push(`Bill ${bill.reference_nbr}: ${error.message}`);
        else result.created++;
      }
    } catch (err) {
      result.errors.push(`Bill ${bill.reference_nbr}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// AP Checks → commitment_payments (global, not per-project)
// ---------------------------------------------------------------------------

/**
 * Pull all AP Checks from the acumatica_checks mirror table and upsert
 * into commitment_payments.
 *
 * Linkage: for each check we attempt to find a matching subcontractor_invoice
 * (and its subcontract/PO) via the acumatica_ap_bill_id FK. Checks that cannot
 * be linked are still imported — the relaxed constraint allows both null.
 *
 * Dedup key: external_key = "Check|{reference_nbr}".
 */
export async function syncAPChecksToCommitmentPayments(
  supabaseClient?: DbClient,
): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, errors: [] };
  const supabase = supabaseClient ?? (await createClient());
  const now = new Date().toISOString();

  // Load all checks with pagination (Supabase default row limit is 1000)
  const checks: AcumaticaCheckProjection[] = [];
  {
    let offset = 0;
    const PAGE = 1000;
    while (true) {
      const { data, error: checksError } = await supabase
        .from("acumatica_checks")
        .select("id, external_key, reference_nbr, document_type, vendor_id, vendor_name, payment_ref, application_date, status, description, payment_method, payment_amount")
        .range(offset, offset + PAGE - 1);
      if (checksError) {
        result.errors.push(`Failed to load AP checks: ${checksError.message}`);
        return result;
      }
      if (!data?.length) break;
      checks.push(...data);
      if (data.length < PAGE) break;
      offset += PAGE;
    }
  }

  if (!checks.length) return result;

  // Build lookup: subcontractor_invoices by acumatica_ap_bill_id
  // We'll use this to infer which project/sub/PO a check might belong to
  // via vendor_id matching (best-effort, not always deterministic).
  const { data: subInvoices } = await supabase
    .from("subcontractor_invoices")
    .select("id, project_id, subcontract_id, purchase_order_id, acumatica_ap_bill_id, acumatica_ref_nbr")
    .not("acumatica_ap_bill_id", "is", null);

  // Map: acumatica_ap_bill_id → invoice row for downstream lookups
  const invoiceByBillId = new Map<number, typeof subInvoices extends (infer T)[] | null ? T : never>();
  for (const inv of subInvoices ?? []) {
    if (inv.acumatica_ap_bill_id != null) {
      invoiceByBillId.set(inv.acumatica_ap_bill_id as number, inv);
    }
  }

  // Map: vendor_id → [invoices] — for single-project vendors, we can infer the link
  const invoicesByVendorBillId = new Map<string, string[]>();
  const { data: bills } = await supabase
    .from("acumatica_ap_bills")
    .select("id, vendor_id")
    .not("vendor_id", "is", null);

  const billIdToVendor = new Map<number, string>();
  for (const b of bills ?? []) {
    if (b.vendor_id) billIdToVendor.set(b.id, b.vendor_id);
  }

  // Load existing commitment_payments for dedup (paginated)
  const existingByKey = new Map<string, number>();
  {
    let offset = 0;
    const PAGE = 1000;
    while (true) {
      const { data, error: existError } = await supabase
        .from("commitment_payments")
        .select("id, external_key")
        .range(offset, offset + PAGE - 1);
      if (existError) {
        result.errors.push(`Failed to load existing commitment_payments: ${existError.message}`);
        return result;
      }
      if (!data?.length) break;
      for (const row of data) existingByKey.set(row.external_key, row.id);
      if (data.length < PAGE) break;
      offset += PAGE;
    }
  }

  for (const check of checks) {
    // Use the mirror table's own external_key (format: "{DocumentType}|{ReferenceNbr}")
    const externalKey = check.external_key;

    // Infer project/commitment from vendor_id: find subcontractor_invoices where
    // the linked AP bill has the same vendor_id. If exactly one project → link.
    let projectId: number | null = null;
    let subcontractId: string | null = null;
    let purchaseOrderId: string | null = null;
    let matchedInvoiceId: number | null = null;

    if (check.vendor_id) {
      // Find all sub-invoices whose AP bill belongs to this vendor
      const vendorInvoices = (subInvoices ?? []).filter((inv) => {
        const billVendor = inv.acumatica_ap_bill_id != null
          ? billIdToVendor.get(inv.acumatica_ap_bill_id as number)
          : null;
        return billVendor === check.vendor_id;
      });

      const uniqueProjects = new Set(vendorInvoices.map((i) => i.project_id));
      if (uniqueProjects.size === 1 && vendorInvoices.length > 0) {
        const inv = vendorInvoices[0];
        projectId = inv.project_id as number;
        subcontractId = inv.subcontract_id as string | null;
        purchaseOrderId = inv.purchase_order_id as string | null;
        matchedInvoiceId = inv.id as number;
      }
    }

    // Normalize payment_method — may be "{}" from Acumatica
    const rawMethod = typeof check.payment_method === "string" ? check.payment_method.toLowerCase().trim() : "";
    let paymentMethod: string | null = null;
    if (rawMethod && rawMethod !== "{}") paymentMethod = rawMethod;

    const fields = {
      project_id: projectId,
      subcontract_id: subcontractId,
      purchase_order_id: purchaseOrderId,
      subcontractor_invoice_id: matchedInvoiceId,
      acumatica_check_id: check.id,
      external_key: externalKey,
      payment_number: check.reference_nbr ?? null,
      payment_ref: typeof check.payment_ref === "string" ? check.payment_ref : null,
      payment_method: paymentMethod,
      payment_date: check.application_date ?? null,
      vendor_id: check.vendor_id ?? null,
      vendor_name: check.vendor_name ?? null,
      amount: check.payment_amount ?? 0,
      status: check.status ?? null,
      source: "acumatica",
      acumatica_sync_at: now,
      updated_at: now,
    };

    try {
      const existingId = existingByKey.get(externalKey);
      if (existingId) {
        const { error } = await supabase
          .from("commitment_payments")
          .update(fields)
          .eq("id", existingId);
        if (error) result.errors.push(`Check ${check.reference_nbr}: ${error.message}`);
        else result.updated++;
      } else {
        const { error } = await supabase
          .from("commitment_payments")
          .insert({ ...fields, created_at: now });
        if (error) result.errors.push(`Check ${check.reference_nbr}: ${error.message}`);
        else result.created++;
      }
    } catch (err) {
      result.errors.push(`Check ${check.reference_nbr}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}
