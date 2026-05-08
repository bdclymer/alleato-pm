#!/usr/bin/env node
/**
 * test-ai-tool-queries.mjs
 *
 * Comprehensive test script that runs the actual Supabase queries used by our
 * AI RAG tools. Tests against Project 43 (Westfield Collective) and Project 67
 * (Vermillion Rise Warehouse) which have the most data.
 *
 * Usage:
 *   cd /Users/meganharrison/Documents/alleato-pm/frontend && node ../scripts/test-ai-tool-queries.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

// Use createRequire so we can resolve @supabase/supabase-js from frontend/node_modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(resolve(__dirname, "../frontend/package.json"));
const { createClient } = require("@supabase/supabase-js");

// ---------------------------------------------------------------------------
// Load environment variables from frontend/.env.local and root .env
// ---------------------------------------------------------------------------
function loadEnvFile(filePath) {
  try {
    const content = readFileSync(filePath, "utf-8");
    const vars = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      // Strip surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      vars[key] = value;
    }
    return vars;
  } catch {
    return {};
  }
}

const rootEnv = loadEnvFile(resolve(__dirname, "../.env"));
const localEnv = loadEnvFile(resolve(__dirname, "../.env.local"));
const frontendLocalEnv = loadEnvFile(resolve(__dirname, "../frontend/.env.local"));

// Merge: .env < .env.local < frontend/.env.local (last wins)
const env = { ...rootEnv, ...localEnv, ...frontendLocalEnv };

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.error("  SUPABASE_URL found:", !!SUPABASE_URL);
  console.error("  SERVICE_KEY found:", !!SUPABASE_KEY);
  process.exit(1);
}

console.log(`\n  Supabase URL: ${SUPABASE_URL}`);
console.log(`  Service Key:  ${SUPABASE_KEY.slice(0, 12)}...\n`);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function truncateJson(obj, maxLen = 500) {
  const str = JSON.stringify(obj, null, 2);
  return str.length > maxLen ? str.slice(0, maxLen) + "\n  ... (truncated)" : str;
}

const results = [];

async function runTest(toolName, tableName, queryFn) {
  const entry = { toolName, tableName, status: "?", rowCount: 0, error: null, sample: null };
  try {
    const { data, error } = await queryFn();
    if (error) {
      entry.status = "error";
      entry.error = error.message || JSON.stringify(error);
      entry.rowCount = 0;
    } else {
      const rows = data ?? [];
      entry.rowCount = rows.length;
      entry.status = rows.length > 0 ? "data" : "empty";
      entry.sample = rows.length > 0 ? rows[0] : null;
    }
  } catch (err) {
    entry.status = "error";
    entry.error = err.message || String(err);
  }
  results.push(entry);

  // Print immediately
  const icon = entry.status === "data" ? "✅" : entry.status === "empty" ? "⚠️" : "❌";
  console.log(`\n${"=".repeat(70)}`);
  console.log(`${icon}  ${entry.toolName}`);
  console.log(`    Table: ${entry.tableName}`);
  console.log(`    Rows:  ${entry.rowCount}`);
  if (entry.error) {
    console.log(`    Error: ${entry.error}`);
  }
  if (entry.sample) {
    console.log(`    Sample (first row):\n${truncateJson(entry.sample)}`);
  }
}

// ---------------------------------------------------------------------------
// Run all tests
// ---------------------------------------------------------------------------
console.log("╔══════════════════════════════════════════════════════════════════════╗");
console.log("║         AI RAG Tool Query Test Suite                                ║");
console.log("║         Testing against Project 43 (Westfield Collective)           ║");
console.log("╚══════════════════════════════════════════════════════════════════════╝");

// 1. getBudgetLineItems — budget_lines
await runTest(
  "getBudgetLineItems",
  "budget_lines",
  () => supabase.from("budget_lines").select("*").eq("project_id", 43).limit(5)
);

// 2a. getCommitmentsOverview — subcontracts
await runTest(
  "getCommitmentsOverview (subcontracts)",
  "subcontracts",
  () => supabase.from("subcontracts").select("*").eq("project_id", 43).limit(5)
);

// 2b. getCommitmentsOverview — purchase_orders
await runTest(
  "getCommitmentsOverview (purchase_orders)",
  "purchase_orders",
  () => supabase.from("purchase_orders").select("*").eq("project_id", 43).limit(5)
);

// 3. getDirectCostsSummary — direct_costs
await runTest(
  "getDirectCostsSummary",
  "direct_costs",
  () => supabase.from("direct_costs").select("*").eq("project_id", 43).limit(5)
);

// 4. getScheduleAnalysis — schedule_tasks
await runTest(
  "getScheduleAnalysis (tasks)",
  "schedule_tasks",
  () => supabase.from("schedule_tasks").select("*").eq("project_id", 43).limit(5)
);

// 4b. getScheduleAnalysis — schedule_dependencies
await runTest(
  "getScheduleAnalysis (deps)",
  "schedule_dependencies",
  () => supabase.from("schedule_dependencies").select("*").eq("project_id", 43).limit(5)
);

// 5. getChangeOrderDetails — change_orders (project 67 has data)
await runTest(
  "getChangeOrderDetails",
  "change_orders",
  () => supabase.from("change_orders").select("*").eq("project_id", 67).limit(5)
);

// 6. getRFIStatus — rfis
await runTest(
  "getRFIStatus",
  "rfis",
  () => supabase.from("rfis").select("*").limit(5)
);

// 7. getSubmittalStatus — submittals
await runTest(
  "getSubmittalStatus",
  "submittals",
  () => supabase.from("submittals").select("*").limit(5)
);

// 8. getCostTrends — direct_costs with date ordering
await runTest(
  "getCostTrends",
  "direct_costs (ordered by created_at)",
  () => supabase.from("direct_costs")
    .select("id, invoice_date, created_at, status")
    .eq("project_id", 43)
    .order("created_at", { ascending: true })
    .limit(10)
);

// 9. getMarginAnalysis — prime_contract_financial_summary
await runTest(
  "getMarginAnalysis",
  "prime_contract_financial_summary",
  () => supabase.from("prime_contract_financial_summary").select("*").eq("project_id", 43).limit(5)
);

// 10. getForecastComparison — budget_line_forecasts
await runTest(
  "getForecastComparison",
  "budget_line_forecasts",
  () => supabase.from("budget_line_forecasts").select("*").limit(5)
);

// 11. getPeopleAndRoles — project_directory_memberships
await runTest(
  "getPeopleAndRoles",
  "project_directory_memberships",
  () => supabase.from("project_directory_memberships").select("*").eq("project_id", 43).limit(10)
);

// 12. getVendorPerformance — companies
await runTest(
  "getVendorPerformance",
  "companies",
  () => supabase.from("companies").select("*").eq("is_vendor", true).limit(5)
);

// 13a. Company Knowledge — company_context
await runTest(
  "Company Knowledge (context)",
  "company_context",
  () => supabase.from("company_context").select("*").limit(1)
);

// 13b. Retired Company Knowledge table
console.log("\nINFO Company Knowledge (knowledge): retired; use document_metadata/document_chunks.");

// 14a. Supporting view — change_events_summary
await runTest(
  "Supporting: change_events_summary",
  "change_events_summary",
  () => supabase.from("change_events_summary").select("*").limit(1)
);

// 14b. Supporting view — project_health_dashboard
await runTest(
  "Supporting: project_health_dashboard",
  "project_health_dashboard",
  () => supabase.from("project_health_dashboard").select("*").limit(1)
);

// 14c. Supporting view — project_issue_summary
await runTest(
  "Supporting: project_issue_summary",
  "project_issue_summary",
  () => supabase.from("project_issue_summary").select("*").limit(1)
);

// 15. Additional tables used by project-tools.ts
await runTest(
  "getPortfolioOverview (projects)",
  "projects",
  () => supabase.from("projects").select("*").eq("archived", false).order("name", { ascending: true }).limit(5)
);

await runTest(
  "searchDocuments (meetings)",
  "document_metadata",
  () => supabase.from("document_metadata")
    .select("id, title, date, project_id, project, summary, overview, participants, duration_minutes")
    .order("date", { ascending: false })
    .limit(5)
);

await runTest(
  "getActionItemsAndInsights",
  "ai_insights",
  () => supabase.from("ai_insights")
    .select("*")
    .in("resolved", [0])
    .order("created_at", { ascending: false })
    .limit(5)
);

await runTest(
  "getProjectRiskAnalysis (prime_contracts)",
  "prime_contracts",
  () => supabase.from("prime_contracts")
    .select("id, title, status, contract_amount, executed_date")
    .eq("project_id", 43)
    .limit(5)
);

await runTest(
  "getChangeOrderDetails (change_events)",
  "change_events",
  () => supabase.from("change_events").select("*").eq("project_id", 67).limit(5)
);

// ---------------------------------------------------------------------------
// Summary table
// ---------------------------------------------------------------------------
console.log("\n\n");
console.log("╔══════════════════════════════════════════════════════════════════════════════════╗");
console.log("║                         SUMMARY TABLE                                          ║");
console.log("╠════════════════════════════════════════════╦═══════════════════════════╦════╦════╣");
console.log("║ Tool Name                                  ║ Table                     ║ St ║ #  ║");
console.log("╠════════════════════════════════════════════╬═══════════════════════════╬════╬════╣");

for (const r of results) {
  const icon = r.status === "data" ? "✅" : r.status === "empty" ? "⚠️" : "❌";
  const toolPad = r.toolName.padEnd(42).slice(0, 42);
  const tablePad = r.tableName.padEnd(25).slice(0, 25);
  const countPad = String(r.rowCount).padStart(3);
  console.log(`║ ${toolPad} ║ ${tablePad} ║ ${icon} ║${countPad} ║`);
}

console.log("╚════════════════════════════════════════════╩═══════════════════════════╩════╩════╝");

// Counts
const dataCount = results.filter(r => r.status === "data").length;
const emptyCount = results.filter(r => r.status === "empty").length;
const errorCount = results.filter(r => r.status === "error").length;

console.log(`\n  Total queries: ${results.length}`);
console.log(`  ✅ With data:  ${dataCount}`);
console.log(`  ⚠️  Empty:      ${emptyCount}`);
console.log(`  ❌ Errors:     ${errorCount}`);
console.log("");

if (errorCount > 0) {
  console.log("  ERRORS DETAIL:");
  for (const r of results.filter(r => r.status === "error")) {
    console.log(`    ❌ ${r.toolName} → ${r.tableName}: ${r.error}`);
  }
  console.log("");
}

if (emptyCount > 0) {
  console.log("  EMPTY TABLES (may need seeding):");
  for (const r of results.filter(r => r.status === "empty")) {
    console.log(`    ⚠️  ${r.toolName} → ${r.tableName}`);
  }
  console.log("");
}

process.exit(errorCount > 0 ? 1 : 0);
