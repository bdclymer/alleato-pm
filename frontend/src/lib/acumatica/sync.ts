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
import type { FlatBill, FlatVendor } from "./types";

export interface VendorSyncResult {
  created: number;
  updated: number;
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
  const result: VendorSyncResult = { created: 0, updated: 0, errors: [] };

  const acuClient = createAcumaticaClient();
  await acuClient.login();

  const acuVendors = await acuClient.getVendors({
    $top: 500,
    $expand: "MainContact",
  });

  const activeVendors = acuVendors.filter((v) => v.Status === "Active");

  const supabase = await createClient();

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
    const fields = toVendorFields(acuVendor, now);

    try {
      const linkedById = byAcuId.get(acuId);
      if (linkedById) {
        const { error } = await supabase.from("vendors").update(fields).eq("id", linkedById.id);
        if (error) result.errors.push(`${acuId}: ${error.message}`);
        else result.updated++;
        continue;
      }

      const linkedByName = byName.get(acuVendor.VendorName.toLowerCase().trim());
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
