/**
 * Acumatica Sync Service
 *
 * Handles pulling data from Acumatica ERP into Alleato PM.
 * All operations are read-only from Acumatica (Phase 1).
 *
 * Matching strategy for vendors:
 *  1. Exact match on acumatica_vendor_id (already linked)
 *  2. Case-insensitive name match (fuzzy link)
 *  3. No match → create new vendor record
 */

import { createClient } from "@/lib/supabase/server";
import { createAcumaticaClient } from "./client";
import type {
  FlatBill,
  FlatInvoice,
  FlatPayment,
  FlatPurchaseOrder,
  FlatSubcontract,
  FlatVendor,
} from "./types";

export interface VendorSyncResult {
  created: number;
  updated: number;
  companiesCreated: number;
  companiesUpdated: number;
  errors: string[];
}

function toVendorFields(v: FlatVendor, now: string) {
  return {
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
    acumatica_sync_at: now,
  };
}

/**
 * Pull all active vendors from Acumatica and upsert into the vendors table.
 *
 * @param companyId — The Alleato PM company UUID to associate new vendors with
 */
export async function syncVendors(companyId: string): Promise<VendorSyncResult> {
  const result: VendorSyncResult = {
    created: 0,
    updated: 0,
    companiesCreated: 0,
    companiesUpdated: 0,
    errors: [],
  };

  const acuClient = createAcumaticaClient();
  await acuClient.login();

  const acuVendors = await acuClient.getVendors({
    $top: 500,
    $expand: "MainContact",
  });

  const activeVendors = acuVendors.filter((v) => v.Status === "Active");

  const supabase = await createClient();

  // Keep the app's company directory in sync with Acumatica vendors.
  // New Acumatica vendors are materialized as companies so they can be used
  // across the application, even before they're attached to a project.
  const { data: existingCompanies, error: companyFetchError } = await supabase
    .from("companies")
    .select("id, name, status, type");

  if (companyFetchError) {
    result.errors.push(
      `Failed to load existing companies: ${companyFetchError.message}`,
    );
    return result;
  }

  const companyByName = new Map<
    string,
    { id: string; name: string; status: string | null; type: string | null }
  >();

  for (const company of existingCompanies ?? []) {
    companyByName.set(company.name.toLowerCase().trim(), company);
  }

  const { data: existingVendors, error: fetchError } = await supabase
    .from("vendors")
    .select("id, name, acumatica_vendor_id")
    .eq("company_id", companyId);

  if (fetchError) {
    result.errors.push(`Failed to load existing vendors: ${fetchError.message}`);
    return result;
  }

  const byAcuId = new Map<string, { id: string; name: string }>();
  const byName = new Map<string, { id: string; name: string }>();

  for (const v of existingVendors ?? []) {
    if (v.acumatica_vendor_id) byAcuId.set(v.acumatica_vendor_id, v);
    byName.set(v.name.toLowerCase().trim(), v);
  }

  const now = new Date().toISOString();

  for (const acuVendor of activeVendors) {
    const acuId = acuVendor.VendorID;
    const vendorName = acuVendor.VendorName.trim();
    const vendorNameKey = vendorName.toLowerCase();
    const fields = toVendorFields(acuVendor, now);

    try {
      const existingCompany = companyByName.get(vendorNameKey);
      if (!existingCompany) {
        const { data: insertedCompany, error: insertCompanyError } = await supabase
          .from("companies")
          .insert({
            name: vendorName,
            type: "VENDOR",
            status: "ACTIVE",
          })
          .select("id, name, status, type")
          .single();

        if (insertCompanyError) {
          result.errors.push(
            `${acuId} (${vendorName}) company upsert failed: ${insertCompanyError.message}`,
          );
        } else if (insertedCompany) {
          companyByName.set(vendorNameKey, insertedCompany);
          result.companiesCreated++;
        }
      } else if (!existingCompany.type || !existingCompany.status) {
        const companyPatch: { type?: string; status?: string } = {};
        if (!existingCompany.type) companyPatch.type = "VENDOR";
        if (!existingCompany.status) companyPatch.status = "ACTIVE";

        const { error: updateCompanyError } = await supabase
          .from("companies")
          .update(companyPatch)
          .eq("id", existingCompany.id);

        if (updateCompanyError) {
          result.errors.push(
            `${acuId} (${vendorName}) company update failed: ${updateCompanyError.message}`,
          );
        } else {
          companyByName.set(vendorNameKey, {
            ...existingCompany,
            ...companyPatch,
          });
          result.companiesUpdated++;
        }
      }

      const linkedById = byAcuId.get(acuId);
      if (linkedById) {
        const { error } = await supabase.from("vendors").update(fields).eq("id", linkedById.id);
        if (error) result.errors.push(`${acuId}: ${error.message}`);
        else result.updated++;
        continue;
      }

      const linkedByName = byName.get(vendorNameKey);
      if (linkedByName) {
        const { error } = await supabase.from("vendors")
          .update({ ...fields, acumatica_vendor_id: acuId })
          .eq("id", linkedByName.id);
        if (error) result.errors.push(`${acuId}: ${error.message}`);
        else { byAcuId.set(acuId, linkedByName); result.updated++; }
        continue;
      }

      const { error } = await supabase.from("vendors").insert({
        company_id: companyId,
        acumatica_vendor_id: acuId,
        is_active: true,
        ...fields,
      });
      if (error) result.errors.push(`${acuId} (${acuVendor.VendorName}): ${error.message}`);
      else result.created++;
    } catch (err) {
      result.errors.push(`${acuId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Direct Costs Sync (AP Bills → direct_costs)
// ---------------------------------------------------------------------------

export interface DirectCostSyncResult {
  created: number;
  updated: number;
  errors: string[];
}

function mapBillStatus(acuStatus: string): string {
  switch (acuStatus) {
    case "Open":
      return "Pending";
    case "Closed":
      return "Approved";
    case "Balanced":
      return "Approved";
    case "On Hold":
      return "Draft";
    default:
      return "Draft";
  }
}

function toBillCostType(bill: FlatBill): string {
  if (bill.Type === "DebitAdj") return "Expense";
  return "Invoice";
}

/**
 * Pull AP Bills from Acumatica and upsert into the direct_costs table
 * for a given project.
 *
 * Matching: acumatica_ref_nbr (unique per bill).
 * Bills without a project association are included — they represent
 * company-level AP that should still be visible.
 */
export async function syncDirectCosts(
  projectId: number,
  userId: string,
): Promise<DirectCostSyncResult> {
  const result: DirectCostSyncResult = { created: 0, updated: 0, errors: [] };

  const acuClient = createAcumaticaClient();
  await acuClient.login();

  const acuBills = await acuClient.getBills({
    $top: 500,
  });

  const supabase = await createClient();

  // Load existing direct costs for this project that have an acumatica_ref_nbr
  const { data: existingCosts, error: fetchError } = await supabase
    .from("direct_costs")
    .select("id, acumatica_ref_nbr")
    .eq("project_id", projectId)
    .not("acumatica_ref_nbr", "is", null);

  if (fetchError) {
    result.errors.push(`Failed to load existing direct costs: ${fetchError.message}`);
    return result;
  }

  const byRefNbr = new Map<string, string>();
  for (const c of existingCosts ?? []) {
    if (c.acumatica_ref_nbr) byRefNbr.set(c.acumatica_ref_nbr, c.id);
  }

  // Build vendor name → vendor_id lookup
  const { data: vendors } = await supabase
    .from("vendors")
    .select("id, acumatica_vendor_id");

  const vendorByAcuId = new Map<string, string>();
  for (const v of vendors ?? []) {
    if (v.acumatica_vendor_id) vendorByAcuId.set(v.acumatica_vendor_id, v.id);
  }

  const now = new Date().toISOString();

  for (const bill of acuBills) {
    const refNbr = bill.ReferenceNbr;

    const fields = {
      date: bill.Date ? bill.Date.split("T")[0] : now.split("T")[0],
      description: bill.Description ?? null,
      invoice_number: bill.VendorRef ?? null,
      total_amount: bill.Amount ?? 0,
      cost_type: toBillCostType(bill),
      status: mapBillStatus(bill.Status),
      terms: null as string | null,
      vendor_id: vendorByAcuId.get(bill.Vendor) ?? null,
      acumatica_ref_nbr: refNbr,
      acumatica_doc_type: bill.Type ?? null,
      acumatica_financial_period: bill.FinancialPeriod ?? null,
      acumatica_sync_at: now,
      paid_date: bill.Status === "Closed" && bill.Balance === 0 ? now.split("T")[0] : null,
    };

    try {
      const existingId = byRefNbr.get(refNbr);
      if (existingId) {
        const { error } = await supabase
          .from("direct_costs")
          .update({ ...fields, updated_by_user_id: userId })
          .eq("id", existingId);
        if (error) result.errors.push(`${refNbr}: ${error.message}`);
        else result.updated++;
      } else {
        const { error } = await supabase.from("direct_costs").insert({
          ...fields,
          project_id: projectId,
          created_by_user_id: userId,
          updated_by_user_id: userId,
        });
        if (error) result.errors.push(`${refNbr}: ${error.message}`);
        else result.created++;
      }
    } catch (err) {
      result.errors.push(`${refNbr}: ${err instanceof Error ? err.message : String(err)}`);
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
): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, errors: [] };

  const acuClient = createAcumaticaClient();
  await acuClient.login();

  // Get AR invoices with line item details
  const acuInvoices = await acuClient.getInvoices({
    $top: 500,
    $expand: "Details",
  });

  const supabase = await createClient();

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
            contract_id: primeContract.id,
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
): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, errors: [] };

  const acuClient = createAcumaticaClient();
  await acuClient.login();

  const acuPayments = await acuClient.getPayments({ $top: 500 });

  const supabase = await createClient();

  // Get the project's primary prime contract
  const { data: primeContract } = await supabase
    .from("prime_contracts")
    .select("id")
    .eq("project_id", projectId)
    .limit(1)
    .single();

  if (!primeContract) {
    result.errors.push("No prime contract found for this project.");
    return result;
  }

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

  // Filter to released/closed payments (not voided)
  const validPayments = acuPayments.filter(
    (p) => p.Status === "Released" || p.Status === "Closed" || p.Status === "Open",
  );

  for (const payment of validPayments) {
    const refNbr = payment.ReferenceNbr;
    const paymentDate = payment.Date ? payment.Date.split("T")[0] : now.split("T")[0];

    // Normalize payment method to match DB constraint
    const rawMethod = (payment.PaymentMethod ?? "").toLowerCase().trim();
    let method = "other";
    if (rawMethod.includes("check")) method = "check";
    else if (rawMethod.includes("wire")) method = "wire";
    else if (rawMethod.includes("ach")) method = "ach";
    else if (rawMethod.includes("credit")) method = "credit_card";
    else if (rawMethod === "cash") method = "cash";

    const fields = {
      amount: payment.PaymentAmount ?? 0,
      payment_date: paymentDate,
      payment_number: refNbr,
      method,
      reference_number: payment.ExternalRef ?? null,
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
    .from("vendors")
    .select("id, acumatica_vendor_id");
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

  const acuPOs = await acuClient.getPurchaseOrders({ $top: 500 });

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
    .from("vendors")
    .select("id, acumatica_vendor_id");
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
