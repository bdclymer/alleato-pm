#!/usr/bin/env node

/**
 * Import Goodwill Noblesville change requests and commitment change orders.
 *
 * Defaults to dry-run. Use --apply to write missing records.
 *
 * Source files:
 * - changeRequests_report-6.xlsx -> change_events + change_event_line_items
 * - commitment-change-order-list-2.xlsx -> reconciles CCO list/status
 *
 * Financial CCO amounts/descriptions come from acumatica_change_orders because
 * the Job Planner CCO export only includes number, commitment, company, status.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const XLSX = require("../frontend/node_modules/xlsx");
const { createClient } = require("../frontend/node_modules/@supabase/supabase-js");

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const PROJECT_ID = 25125;
const PROJECT_NUMBER = "25-125";
const DEFAULT_CR_FILE =
  "/Users/meganharrison/Downloads/Job Planner Exports - GW Noblesville/changeRequests_report-6.xlsx";
const DEFAULT_CCO_FILE =
  "/Users/meganharrison/Downloads/Job Planner Exports - GW Noblesville/commitment-change-order-list-2.xlsx";

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");
const DRY_RUN = !APPLY;

function argValue(name, fallback) {
  const prefix = `${name}=`;
  const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] ??= value;
  }
}

loadEnvFile(path.join(REPO_ROOT, ".env"));
loadEnvFile(path.join(REPO_ROOT, "frontend", ".env.local"));
loadEnvFile(path.join(REPO_ROOT, "frontend", ".env"));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

function readSheetRows(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const workbook = XLSX.readFile(filePath, {
    cellDates: false,
    cellStyles: false,
    raw: true,
  });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
}

function normalizeCompanyName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\b(incorporated|inc|llc|l\.l\.c|co|company|corp|corporation)\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function money(value) {
  if (value === "" || value == null) return 0;
  const parsed = Number(String(value).replace(/[$,]/g, ""));
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric value: ${value}`);
  }
  return parsed;
}

function splitChangeRequestTitle(titleNumber) {
  const raw = String(titleNumber || "").trim();
  const match = raw.match(/^(CR-\d+-\d+)\s+(.+)$/);
  if (!match) {
    throw new Error(`Invalid change request title/number: ${raw}`);
  }
  return { number: match[1], title: match[2].trim(), raw };
}

function parseChangeRequests(filePath) {
  const rows = readSheetRows(filePath);
  const headerIndex = rows.findIndex((row) => row[0] === "Title Number");
  if (headerIndex === -1) throw new Error("Change request header row not found");

  return rows
    .slice(headerIndex + 1)
    .filter((row) => String(row[0] || "").trim().startsWith("CR-"))
    .map((row) => {
      const { number, title, raw } = splitChangeRequestTitle(row[0]);
      const sourceStatus = String(row[3] || "").trim();
      return {
        number,
        title,
        rawTitleNumber: raw,
        primeContractNumber: String(row[1] || "").trim(),
        type: String(row[2] || "").trim() || "Owner Change",
        sourceStatus,
        status: sourceStatus.toLowerCase() === "draft" ? "Open" : sourceStatus || "Open",
        cost: money(row[4]),
        revenue: money(row[5]),
        markup: money(row[6]),
        tax: money(row[7]),
        overUnder: money(row[10]),
      };
    });
}

function parseCommitmentChangeOrders(filePath) {
  const rows = readSheetRows(filePath);
  const headerIndex = rows.findIndex((row) => row[0] === "Number");
  if (headerIndex === -1) throw new Error("Commitment change order header row not found");

  return rows
    .slice(headerIndex + 1)
    .filter((row) => String(row[0] || "").trim().startsWith("CCO-"))
    .map((row) => ({
      number: String(row[0] || "").trim(),
      sourceCommitmentNumber: String(row[1] || "").trim(),
      companyName: String(row[2] || "").trim(),
      sourceStatus: String(row[6] || "").trim(),
    }));
}

async function mustQuery(label, query) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data || [];
}

async function loadCurrentData() {
  const [
    projectRows,
    primeContracts,
    existingChangeEvents,
    existingCommitmentCos,
    commitments,
    acumaticaChangeOrders,
  ] = await Promise.all([
    mustQuery("projects", supabase.from("projects").select("id, name, project_number").eq("id", PROJECT_ID)),
    mustQuery(
      "prime_contracts",
      supabase
        .from("prime_contracts")
        .select("id, contract_number, title")
        .eq("project_id", PROJECT_ID),
    ),
    mustQuery(
      "change_events",
      supabase
        .from("change_events")
        .select("id, number, title, status")
        .eq("project_id", PROJECT_ID)
        .is("deleted_at", null),
    ),
    mustQuery(
      "contract_change_orders",
      supabase
        .from("contract_change_orders")
        .select("id, change_order_number, acumatica_external_key")
        .eq("project_id", PROJECT_ID),
    ),
    mustQuery(
      "commitments_unified",
      supabase
        .from("commitments_unified")
        .select("id, contract_number, title, contract_company_id, commitment_type, status")
        .eq("project_id", PROJECT_ID)
        .is("deleted_at", null),
    ),
    mustQuery(
      "acumatica_change_orders",
      supabase
        .from("acumatica_change_orders")
        .select(
          "external_key, reference_nbr, description, status, change_date, commitments_change_total, revenue_budget_change_total, raw_payload",
        )
        .eq("project_id", PROJECT_ID),
    ),
  ]);

  if (projectRows.length !== 1 || projectRows[0].project_number !== PROJECT_NUMBER) {
    throw new Error(
      `Project guard failed: expected ${PROJECT_ID}/${PROJECT_NUMBER}, got ${JSON.stringify(projectRows)}`,
    );
  }

  const companyIds = [...new Set(commitments.map((row) => row.contract_company_id).filter(Boolean))];
  const companies = companyIds.length
    ? await mustQuery(
        "companies",
        supabase.from("companies").select("id, name, acumatica_vendor_id").in("id", companyIds),
      )
    : [];
  const companyById = new Map(companies.map((company) => [company.id, company]));

  return {
    project: projectRows[0],
    primeContracts,
    existingChangeEvents,
    existingCommitmentCos,
    commitments: commitments.map((commitment) => ({
      ...commitment,
      company: companyById.get(commitment.contract_company_id) || null,
    })),
    acumaticaChangeOrders,
  };
}

function buildCommitmentLookup(commitments) {
  const byCompany = new Map();
  for (const commitment of commitments) {
    const key = normalizeCompanyName(commitment.company?.name);
    if (!key) continue;
    const list = byCompany.get(key) || [];
    list.push(commitment);
    byCompany.set(key, list);
  }
  return byCompany;
}

function resolveCommitment(sourceCco, commitmentLookup) {
  const key = normalizeCompanyName(sourceCco.companyName);
  const matches = commitmentLookup.get(key) || [];
  if (matches.length === 1) return { commitment: matches[0], issue: null };
  if (matches.length === 0) {
    return { commitment: null, issue: `No commitment company match for ${sourceCco.companyName}` };
  }
  return {
    commitment: null,
    issue: `Ambiguous commitment company match for ${sourceCco.companyName}: ${matches
      .map((item) => item.contract_number)
      .join(", ")}`,
  };
}

function ccoExternalRef(rawPayload) {
  return typeof rawPayload?.ExternalRefNbr === "string" ? rawPayload.ExternalRefNbr.trim() : "";
}

function buildImportPlan(sourceChangeRequests, sourceCcos, current) {
  const primeContractByNumber = new Map(
    current.primeContracts.map((contract) => [contract.contract_number, contract]),
  );
  const existingChangeEventNumbers = new Set(current.existingChangeEvents.map((event) => event.number));
  const existingCcoExternalKeys = new Set(
    current.existingCommitmentCos.map((cco) => cco.acumatica_external_key).filter(Boolean),
  );
  const existingCcoNumbers = new Set(current.existingCommitmentCos.map((cco) => cco.change_order_number));
  const commitmentLookup = buildCommitmentLookup(current.commitments);
  const acumaticaByExternalRef = new Map();

  for (const row of current.acumaticaChangeOrders) {
    const externalRef = ccoExternalRef(row.raw_payload);
    if (externalRef) acumaticaByExternalRef.set(externalRef, row);
  }

  const issues = [];
  const changeEventsToInsert = [];
  const changeEventLineItemsToInsert = [];
  const skippedChangeEvents = [];

  for (const source of sourceChangeRequests) {
    if (existingChangeEventNumbers.has(source.number)) {
      skippedChangeEvents.push({ number: source.number, reason: "already exists" });
      continue;
    }
    const primeContract = primeContractByNumber.get(source.primeContractNumber);
    if (!primeContract) {
      issues.push(`No prime contract found for ${source.number}: ${source.primeContractNumber}`);
      continue;
    }
    changeEventsToInsert.push({
      project_id: PROJECT_ID,
      number: source.number,
      title: source.title,
      type: source.type,
      scope: "TBD",
      status: source.status,
      origin: "Internal",
      expecting_revenue: source.revenue !== 0,
      line_item_revenue_source: "Enter manually",
      prime_contract_id: primeContract.id,
      description: source.rawTitleNumber,
      workflow_stage: "imported",
    });
    changeEventLineItemsToInsert.push({
      change_event_number: source.number,
      description: source.title,
      quantity: 1,
      unit_cost: source.cost,
      cost_rom: source.cost,
      revenue_rom: source.revenue,
      latest_price: source.cost,
      sort_order: 0,
    });
  }

  const commitmentCosToInsert = [];
  const skippedCommitmentCos = [];
  const deferredCommitmentCos = [];
  const sourceCcoNumbers = new Set(sourceCcos.map((cco) => cco.number));
  const unmatchedAcumaticaCcos = [];

  for (const source of sourceCcos) {
    const acumatica = acumaticaByExternalRef.get(source.number);
    if (!acumatica) {
      if (source.sourceStatus.toLowerCase() === "in review") {
        deferredCommitmentCos.push({
          number: source.number,
          reason: "listed as In Review and not present in Acumatica change-order financials yet",
        });
        continue;
      }
      issues.push(`No Acumatica change order found for ${source.number}`);
      continue;
    }
    if (existingCcoExternalKeys.has(acumatica.external_key) || existingCcoNumbers.has(source.number)) {
      skippedCommitmentCos.push({ number: source.number, reason: "already exists" });
      continue;
    }
    const { commitment, issue } = resolveCommitment(source, commitmentLookup);
    if (issue) {
      issues.push(`${source.number}: ${issue}`);
      continue;
    }
    commitmentCosToInsert.push({
      project_id: PROJECT_ID,
      contract_id: commitment.id,
      change_order_number: source.number,
      title: source.number,
      description: acumatica.description || source.number,
      amount: Number(acumatica.commitments_change_total || 0),
      status: "pending",
      requested_date: acumatica.change_date || new Date().toISOString().slice(0, 10),
      contract_company: source.companyName,
      contract_type: commitment.commitment_type || "subcontract",
      reference: acumatica.reference_nbr || null,
      executed: String(acumatica.status || "").toLowerCase() === "closed",
      acumatica_external_key: acumatica.external_key,
    });
  }

  for (const row of current.acumaticaChangeOrders) {
    const externalRef = ccoExternalRef(row.raw_payload);
    if (
      externalRef.startsWith("CCO-5092-") &&
      Number(row.commitments_change_total || 0) !== 0 &&
      !sourceCcoNumbers.has(externalRef)
    ) {
      unmatchedAcumaticaCcos.push({
        externalRef,
        amount: row.commitments_change_total,
        description: row.description,
      });
    }
  }

  return {
    issues,
    changeEventsToInsert,
    changeEventLineItemsToInsert,
    skippedChangeEvents,
    commitmentCosToInsert,
    skippedCommitmentCos,
    deferredCommitmentCos,
    unmatchedAcumaticaCcos,
  };
}

async function applyPlan(plan) {
  const insertedChangeEvents = [];
  if (plan.changeEventsToInsert.length > 0) {
    const { data, error } = await supabase
      .from("change_events")
      .insert(plan.changeEventsToInsert)
      .select("id, number");
    if (error) throw new Error(`insert change_events: ${error.message}`);
    insertedChangeEvents.push(...(data || []));
  }

  const changeEventIdByNumber = new Map(insertedChangeEvents.map((event) => [event.number, event.id]));
  const lineItems = plan.changeEventLineItemsToInsert
    .map(({ change_event_number, ...item }) => {
      const changeEventId = changeEventIdByNumber.get(change_event_number);
      if (!changeEventId) return null;
      return { ...item, change_event_id: changeEventId };
    })
    .filter(Boolean);

  if (lineItems.length > 0) {
    const { error } = await supabase.from("change_event_line_items").insert(lineItems);
    if (error) throw new Error(`insert change_event_line_items: ${error.message}`);
  }

  if (plan.commitmentCosToInsert.length > 0) {
    const { error } = await supabase.from("contract_change_orders").insert(plan.commitmentCosToInsert);
    if (error) throw new Error(`insert contract_change_orders: ${error.message}`);
  }

  return {
    changeEventsInserted: insertedChangeEvents.length,
    changeEventLineItemsInserted: lineItems.length,
    commitmentCosInserted: plan.commitmentCosToInsert.length,
  };
}

function printPlan(sourceChangeRequests, sourceCcos, current, plan) {
  const summary = {
    mode: DRY_RUN ? "dry-run" : "apply",
    project: current.project,
    source: {
      changeRequests: sourceChangeRequests.length,
      commitmentChangeOrders: sourceCcos.length,
      acumaticaChangeOrders: current.acumaticaChangeOrders.length,
    },
    existing: {
      changeEvents: current.existingChangeEvents.length,
      commitmentChangeOrders: current.existingCommitmentCos.length,
      commitments: current.commitments.length,
      primeContracts: current.primeContracts.length,
    },
    planned: {
      changeEventsToInsert: plan.changeEventsToInsert.length,
      changeEventLineItemsToInsert: plan.changeEventLineItemsToInsert.length,
      commitmentCosToInsert: plan.commitmentCosToInsert.length,
      skippedChangeEvents: plan.skippedChangeEvents.length,
      skippedCommitmentCos: plan.skippedCommitmentCos.length,
      deferredCommitmentCos: plan.deferredCommitmentCos.length,
      issues: plan.issues.length,
      unmatchedAcumaticaCcos: plan.unmatchedAcumaticaCcos.length,
    },
  };

  console.log(JSON.stringify(summary, null, 2));

  if (plan.issues.length > 0) {
    console.log("\nISSUES");
    for (const issue of plan.issues) console.log(`- ${issue}`);
  }

  console.log("\nCHANGE EVENTS TO INSERT");
  for (const event of plan.changeEventsToInsert) {
    const line = plan.changeEventLineItemsToInsert.find(
      (item) => item.change_event_number === event.number,
    );
    console.log(`- ${event.number}: ${event.title} | cost=${line?.cost_rom ?? 0} revenue=${line?.revenue_rom ?? 0} status=${event.status}`);
  }

  console.log("\nCOMMITMENT CHANGE ORDERS TO INSERT");
  for (const cco of plan.commitmentCosToInsert) {
    console.log(`- ${cco.change_order_number}: ${cco.contract_company} | amount=${cco.amount} | ${cco.description}`);
  }

  if (plan.unmatchedAcumaticaCcos.length > 0) {
    console.log("\nACUMATICA CCOs NOT IN SPREADSHEET");
    for (const row of plan.unmatchedAcumaticaCcos.slice(0, 25)) {
      console.log(`- ${row.externalRef}: amount=${row.amount} | ${row.description}`);
    }
  }

  if (plan.deferredCommitmentCos.length > 0) {
    console.log("\nDEFERRED COMMITMENT CHANGE ORDERS");
    for (const row of plan.deferredCommitmentCos) {
      console.log(`- ${row.number}: ${row.reason}`);
    }
  }
}

async function verifyAfterApply() {
  const [changeEvents, commitmentCos] = await Promise.all([
    mustQuery(
      "verify change_events",
      supabase
        .from("change_events")
        .select("id, number", { count: "exact" })
        .eq("project_id", PROJECT_ID)
        .is("deleted_at", null),
    ),
    mustQuery(
      "verify contract_change_orders",
      supabase
        .from("contract_change_orders")
        .select("id, change_order_number", { count: "exact" })
        .eq("project_id", PROJECT_ID),
    ),
  ]);
  return {
    changeEvents: changeEvents.length,
    commitmentChangeOrders: commitmentCos.length,
  };
}

async function main() {
  const changeRequestsFile = argValue("--change-requests", DEFAULT_CR_FILE);
  const ccoFile = argValue("--commitment-cos", DEFAULT_CCO_FILE);

  const sourceChangeRequests = parseChangeRequests(changeRequestsFile);
  const sourceCcos = parseCommitmentChangeOrders(ccoFile);
  const current = await loadCurrentData();
  const plan = buildImportPlan(sourceChangeRequests, sourceCcos, current);

  printPlan(sourceChangeRequests, sourceCcos, current, plan);

  if (plan.issues.length > 0) {
    throw new Error(`Import plan has ${plan.issues.length} issue(s); no writes performed.`);
  }

  if (DRY_RUN) {
    console.log("\nDry run complete. Re-run with --apply to write missing records.");
    return;
  }

  const result = await applyPlan(plan);
  const verification = await verifyAfterApply();
  console.log("\nAPPLY RESULT");
  console.log(JSON.stringify({ result, verification }, null, 2));
}

main().catch((error) => {
  console.error(`\n[FATAL] ${error.message}`);
  process.exit(1);
});
