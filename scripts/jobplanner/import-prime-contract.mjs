#!/usr/bin/env node

/**
 * Idempotent import of a Job Planner prime contract + its Schedule of Values (SOV)
 * into the PM app `prime_contracts` + `prime_contract_sovs` tables.
 *
 * Job Planner endpoints (verified live 2026-06-17):
 *   - contract (project-scoped list) GET /projects/{jpProjectId}/primecontracts   (V2, array)
 *   - SOV line items                 GET /primecontracts/{contractId}/lineitems    (V2, NOT project-scoped)
 *   - cost codes (code strings)      GET /projects/{jpProjectId}/costcodes         (V2)
 *
 * Mapping decisions:
 *   - Amounts are in CENTS in Job Planner -> divided by 100 into our DECIMAL dollar columns.
 *   - JP cost codes are 6-digit ("013144"); our `cost_codes.id` is dashed ("01-3144").
 *     We dash via XXYYYY -> XX-YYYY and only set `cost_code` when it resolves to a real
 *     `cost_codes` row (FK guard). Unresolved codes log a warning and store NULL.
 *   - `prime_contract_sovs.line_amount` is GENERATED ALWAYS AS (quantity * unit_cost),
 *     so we cannot write it. Each line is modeled as a lump sum: quantity=1,
 *     unit_cost=<dollar amount>, making the stored line amount exactly equal the JP amount.
 *   - `prime_contracts` has no source/external-key column, so idempotency keys on
 *     (project_id, contract_number). contract_number = JP `number` (e.g. "PC-9299-0001").
 *   - SOV has no per-line external key; on re-run we DELETE the contract's SOV rows and
 *     re-insert from JP (JP is the source of truth for this project).
 *
 * GUARDRAIL: the script aborts before writing if the sum of SOV line amounts does not
 * equal the JP contract amount (the "make sure the SOV syncs properly" invariant).
 *
 * Secrets: reads JOBPLANNER_API_KEY + SUPABASE_SERVICE_ROLE_KEY from env. Never printed.
 *
 * Usage:
 *   node scripts/jobplanner/import-prime-contract.mjs            # apply
 *   node scripts/jobplanner/import-prime-contract.mjs --dry-run  # preview, no writes
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "../..");

const frontendRequire = createRequire(path.join(repoRoot, "frontend", "package.json"));
const dotenv = frontendRequire("dotenv");
const { createClient } = frontendRequire("@supabase/supabase-js");

dotenv.config({ path: path.join(repoRoot, ".env"), quiet: true });
dotenv.config({ path: path.join(repoRoot, ".env.local"), quiet: true });
dotenv.config({ path: path.join(repoRoot, "frontend/.env.local"), quiet: true });

const DRY_RUN = process.argv.includes("--dry-run");

// --- Job Planner -> PM app mapping for this import ---
const JP_PROJECT_ID = 9299; // "26-123 Playmakers"
const APP_PROJECT_ID = 1067; // PM app projects.id (INTEGER) for Playmakers
const APP_PROJECT_TITLE = "26-123 Playmakers";

const API_V2 = "https://api-v2.jobplanner.com";
// Cloudflare blocks default script user-agents (err 1010); send a browser UA.
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const JP_KEY = process.env.JOBPLANNER_API_KEY?.trim();
const SUPABASE_URL =
  process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SERVICE_KEY?.trim();

if (!JP_KEY) {
  console.error("Missing JOBPLANNER_API_KEY. Add it to frontend/.env.local.");
  process.exit(1);
}
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

async function jpGet(url) {
  const res = await fetch(url, {
    headers: { ApiKey: JP_KEY, "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Job Planner ${res.status} on ${url.replace(API_V2, "")}`);
  }
  return res.json();
}

const isoOrNull = (v) => (v ? new Date(v).toISOString() : null);
const centsToDollars = (c) => Math.round(Number(c) || 0) / 100;

// JP 6-digit cost code "013144" -> our cost_codes.id "01-3144".
function dashCostCode(code) {
  const s = String(code ?? "").trim();
  if (!/^\d{6}$/.test(s)) return null;
  return `${s.slice(0, 2)}-${s.slice(2)}`;
}

// JP prime-contract statusId -> our prime_contract_status_v2 enum.
// Conservative map; unknown -> draft. (4 = approved & pushed to ERP on observed data.)
function mapContractStatus(statusId) {
  switch (statusId) {
    case 1:
      return "draft";
    case 2:
      return "out_for_signature";
    case 3:
      return "approved";
    case 4:
      return "approved";
    case 5:
      return "complete";
    default:
      return "draft";
  }
}

async function main() {
  console.log(
    `Importing Job Planner prime contract: JP project ${JP_PROJECT_ID} -> app project ${APP_PROJECT_ID}${DRY_RUN ? " (DRY RUN)" : ""}`,
  );

  // 1. Pull the prime contract (project-scoped list), its SOV, and cost codes.
  const contracts = await jpGet(`${API_V2}/projects/${JP_PROJECT_ID}/primecontracts`);
  if (!Array.isArray(contracts) || contracts.length === 0) {
    console.log("No prime contract returned from Job Planner. Nothing to import.");
    return;
  }
  if (contracts.length > 1) {
    console.log(`NOTE: JP returned ${contracts.length} prime contracts; importing all.`);
  }

  const costCodes = await jpGet(`${API_V2}/projects/${JP_PROJECT_ID}/costcodes`);
  const jpCodeById = new Map(costCodes.map((c) => [c.id, c]));

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // Validate which dashed cost codes actually exist in cost_codes (FK guard).
  const { data: ccRows, error: ccErr } = await supabase.from("cost_codes").select("id");
  if (ccErr) throw new Error(`Failed to read cost_codes: ${ccErr.message}`);
  const knownCostCodeIds = new Set((ccRows ?? []).map((r) => r.id));

  for (const pc of contracts) {
    const lineItems = await jpGet(`${API_V2}/primecontracts/${pc.id}/lineitems`);
    const lines = Array.isArray(lineItems) ? lineItems : [];

    // GUARDRAIL: SOV must reconcile to the contract amount before we touch the DB.
    const sovSumCents = lines.reduce((a, x) => a + (Number(x.amount) || 0), 0);
    if (sovSumCents !== Number(pc.amount)) {
      throw new Error(
        `SOV integrity check FAILED for contract ${pc.number}: ` +
          `sum of ${lines.length} line items = $${centsToDollars(sovSumCents).toFixed(2)} ` +
          `but contract amount = $${centsToDollars(pc.amount).toFixed(2)}. Aborting (no writes).`,
      );
    }

    const contractRow = {
      project_id: APP_PROJECT_ID,
      contract_number: String(pc.number),
      title: `${APP_PROJECT_TITLE} Prime Contract`,
      description: pc.description?.trim() || null,
      inclusions: pc.inclusions?.trim() || null,
      exclusions: pc.exclusions?.trim() || null,
      original_contract_value: centsToDollars(pc.amount),
      revised_contract_value: centsToDollars(pc.totalAmount),
      status: mapContractStatus(pc.statusId),
      erp_status: pc.externalObject?.status === 4 ? "synced" : "unsynced",
      executed: Boolean(pc.isExecuted),
      executed_at: isoOrNull(pc.executedOn),
      retention_percentage: Number(pc.defaultWorkRetainagePercent) || 0,
      start_date: isoOrNull(pc.startOn),
      end_date: isoOrNull(pc.estimatedCompleteOn),
      substantial_completion_date: isoOrNull(pc.substantialCompleteOn),
      actual_completion_date: isoOrNull(pc.actualCompleteOn),
      signed_contract_received_date: isoOrNull(pc.signedContractOn),
      updated_at: new Date().toISOString(),
    };

    // Build SOV rows (cents -> dollars, dashed cost code, preserve order).
    // `line_amount` is GENERATED ALWAYS AS (quantity * unit_cost), so we cannot
    // write it directly. To make the stored line amount EXACTLY equal the JP amount
    // (no rounding drift), we model every line as a lump sum: quantity=1,
    // unit_cost=<dollar amount>. JP lines here are lump-sum (quantity/unitPrice = 0).
    let unresolvedCodes = 0;
    const sovRows = lines.map((x, idx) => {
      const jpCode = jpCodeById.get(x.costCodeId)?.code ?? null;
      const dashed = dashCostCode(jpCode);
      const resolved = dashed && knownCostCodeIds.has(dashed) ? dashed : null;
      if (jpCode && !resolved) unresolvedCodes++;
      return {
        cost_code: resolved,
        description: x.description?.trim() || jpCodeById.get(x.costCodeId)?.name || null,
        quantity: 1,
        unit_cost: centsToDollars(x.amount),
        uom: null,
        sort_order: idx,
      };
    });

    const label =
      `${pc.number} "${contractRow.title}" $${contractRow.original_contract_value.toFixed(2)} ` +
      `[${contractRow.status}/${contractRow.erp_status}] sov=${sovRows.length} unresolvedCodes=${unresolvedCodes}`;

    if (DRY_RUN) {
      console.log(`  WOULD UPSERT ${label}`);
      console.log(
        `    SOV sample: ` +
          sovRows
            .slice(0, 3)
            .map((r) => `${r.cost_code ?? "(none)"}=$${r.unit_cost.toFixed(2)}`)
            .join(", "),
      );
      continue;
    }

    // Idempotent contract upsert keyed on (project_id, contract_number).
    const { data: existing, error: findErr } = await supabase
      .from("prime_contracts")
      .select("id")
      .eq("project_id", APP_PROJECT_ID)
      .eq("contract_number", contractRow.contract_number)
      .maybeSingle();
    if (findErr) throw new Error(`Lookup failed for ${label}: ${findErr.message}`);

    let contractId;
    if (existing?.id) {
      const { error } = await supabase
        .from("prime_contracts")
        .update(contractRow)
        .eq("id", existing.id);
      if (error) throw new Error(`Contract update failed for ${label}: ${error.message}`);
      contractId = existing.id;
      console.log(`  UPDATED contract ${label}`);
    } else {
      const { data: inserted, error } = await supabase
        .from("prime_contracts")
        .insert(contractRow)
        .select("id")
        .single();
      if (error) throw new Error(`Contract insert failed for ${label}: ${error.message}`);
      contractId = inserted.id;
      console.log(`  INSERTED contract ${label}`);
    }

    // Replace SOV: delete existing rows for this contract, re-insert from JP.
    const { error: delErr } = await supabase
      .from("prime_contract_sovs")
      .delete()
      .eq("contract_id", contractId);
    if (delErr) throw new Error(`SOV delete failed for ${label}: ${delErr.message}`);

    const rowsWithFk = sovRows.map((r) => ({ ...r, contract_id: contractId }));
    const { error: insErr } = await supabase.from("prime_contract_sovs").insert(rowsWithFk);
    if (insErr) throw new Error(`SOV insert failed for ${label}: ${insErr.message}`);

    const insertedSum = sovRows.reduce((a, r) => a + r.quantity * r.unit_cost, 0);
    console.log(
      `  SOV synced: ${sovRows.length} lines, total $${insertedSum.toFixed(2)} ` +
        `(matches contract $${contractRow.original_contract_value.toFixed(2)})`,
    );
  }

  console.log(`\nDone.${DRY_RUN ? " (dry run — no writes)" : ""}`);
}

main().catch((err) => {
  console.error("Import failed:", err.message);
  process.exit(1);
});
