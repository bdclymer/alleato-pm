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

export interface VendorSyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/**
 * Pull all active vendors from Acumatica and upsert into the vendors table.
 *
 * @param companyId — The Alleato PM company UUID to associate new vendors with
 */
export async function syncVendors(companyId: string): Promise<VendorSyncResult> {
  const result: VendorSyncResult = { created: 0, updated: 0, skipped: 0, errors: [] };

  const acuClient = createAcumaticaClient();
  await acuClient.login();

  // Fetch all vendors from Acumatica (active only, filter in-memory)
  const acuVendors = await acuClient.getVendors({
    $top: 500,
    $select: "VendorID,VendorName,Status,MainContact",
    $expand: "MainContact",
  });

  const activeVendors = acuVendors.filter((v) => v.Status === "Active");

  const supabase = await createClient();

  // Load existing vendors for this company (id + name + acumatica_vendor_id)
  const { data: existingVendors, error: fetchError } = await supabase
    .from("vendors")
    .select("id, name, acumatica_vendor_id")
    .eq("company_id", companyId);

  if (fetchError) {
    result.errors.push(`Failed to load existing vendors: ${fetchError.message}`);
    return result;
  }

  // Build lookup maps
  const byAcuId = new Map<string, { id: string; name: string }>();
  const byName = new Map<string, { id: string; name: string }>();

  for (const v of existingVendors ?? []) {
    if (v.acumatica_vendor_id) byAcuId.set(v.acumatica_vendor_id, v);
    byName.set(v.name.toLowerCase().trim(), v);
  }

  const now = new Date().toISOString();

  for (const acuVendor of activeVendors) {
    const acuId = acuVendor.VendorID;
    const acuName = acuVendor.VendorName;

    try {
      // 1. Already linked by Acumatica ID?
      const linkedById = byAcuId.get(acuId);
      if (linkedById) {
        // Update name/contact fields if they changed
        await supabase
          .from("vendors")
          .update({
            name: acuName,
            contact_email: acuVendor.Email ?? null,
            contact_phone: acuVendor.Phone1 ?? null,
            acumatica_sync_at: now,
          })
          .eq("id", linkedById.id);
        result.updated++;
        continue;
      }

      // 2. Name match?
      const linkedByName = byName.get(acuName.toLowerCase().trim());
      if (linkedByName) {
        await supabase
          .from("vendors")
          .update({
            acumatica_vendor_id: acuId,
            contact_email: acuVendor.Email ?? null,
            contact_phone: acuVendor.Phone1 ?? null,
            acumatica_sync_at: now,
          })
          .eq("id", linkedByName.id);
        // Add to byAcuId so future loops don't re-process
        byAcuId.set(acuId, linkedByName);
        result.updated++;
        continue;
      }

      // 3. Create new vendor
      const { error: insertError } = await supabase.from("vendors").insert({
        company_id: companyId,
        name: acuName,
        contact_email: acuVendor.Email ?? null,
        contact_phone: acuVendor.Phone1 ?? null,
        acumatica_vendor_id: acuId,
        acumatica_sync_at: now,
        is_active: true,
      });

      if (insertError) {
        result.errors.push(`Failed to create vendor ${acuId} (${acuName}): ${insertError.message}`);
      } else {
        result.created++;
      }
    } catch (err) {
      result.errors.push(
        `Error processing vendor ${acuId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return result;
}
