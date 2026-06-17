/**
 * Loads synced Acumatica AP bills (`acumatica_ap_bills`) for the duplicate-billing
 * and on-hold detectors, plus a project code -> name map for readable labels.
 * No live Acumatica calls — reads the table refreshed by the Render sync.
 */

import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import type { AcuApBill } from "./reconciliation";

const PAGE_SIZE = 1000;

export async function loadApBills(): Promise<{
  bills: AcuApBill[];
  projectNameByCode: Map<string, string>;
}> {
  const supabase = createServiceClient();

  const bills: AcuApBill[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("acumatica_ap_bills")
      .select(
        "external_key, vendor_id, amount, balance, project_code, status, hold, post_period, date, reference_nbr",
      )
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`acumatica_ap_bills read failed: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const row of data) {
      bills.push({
        externalKey: row.external_key,
        vendorId: row.vendor_id,
        amount: Number(row.amount ?? 0),
        balance: row.balance == null ? null : Number(row.balance),
        projectCode: row.project_code,
        status: row.status,
        hold: row.hold === true,
        postPeriod: row.post_period,
        date: row.date,
        referenceNbr: row.reference_nbr,
      });
    }
    if (data.length < PAGE_SIZE) break;
  }

  const projectNameByCode = new Map<string, string>();
  const { data: projects } = await supabase
    .from("acumatica_projects")
    .select("project_id, description");
  for (const p of projects ?? []) {
    if (p.project_id && p.description) projectNameByCode.set(p.project_id, p.description);
  }

  return { bills, projectNameByCode };
}
