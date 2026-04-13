#!/usr/bin/env node

/**
 * API Smoke Test Suite — runs against the live production URL.
 *
 * Strategy:
 * - Health endpoint must return 200 with correct shape
 * - Protected endpoints must return 200 or 401 (never 500 or timeout)
 * - 500 = server bug, always a failure regardless of auth
 * - 401/403 = expected for protected routes, counts as pass
 * - 000 = timeout/unreachable, always a failure
 *
 * Run locally:
 *   API_SMOKE_BASE_URL=https://projects.alleatogroup.com node scripts/api-smoke-contracts.mjs
 *
 * Run in CI:
 *   Triggered by GitHub Actions cron (daily at 8am UTC)
 */

const BASE_URL = process.env.API_SMOKE_BASE_URL || "http://localhost:3000";
const ERROR_ALERT_WEBHOOK_URL = process.env.ERROR_ALERT_WEBHOOK_URL || "";
const PROJECT_ID = process.env.API_SMOKE_PROJECT_ID || "67";
const FAKE_UUID = "00000000-0000-0000-0000-000000000000";

// ─── Endpoint definitions ───────────────────────────────────────────────────
// [method, path, description, expectedStatuses?]
// If expectedStatuses is omitted, defaults to: any non-500, non-000 status
const ENDPOINTS = [
  // Health — must be 200 with specific body shape
  ["GET", "/api/health", "Health check", [200]],

  // Projects
  ["GET", "/api/projects", "Projects list", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}`, "Project detail", [200, 401, 404]],

  // Budget
  ["GET", `/api/projects/${PROJECT_ID}/budget/details`, "Budget details", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/budget/history`, "Budget history", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/budget/forecast`, "Budget forecast", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/budget/snapshots`, "Budget snapshots", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/budget/direct-costs`, "Budget direct costs", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/budget-codes`, "Budget codes", [200, 401]],

  // Change Events
  ["GET", `/api/projects/${PROJECT_ID}/change-events`, "Change events list", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/change-events/${FAKE_UUID}`, "Change event detail (fake id)", [200, 401, 404]],
  ["GET", `/api/projects/${PROJECT_ID}/change-events/origin-options`, "Change event origin options", [200, 401]],

  // Change Orders / PCOs
  ["GET", `/api/projects/${PROJECT_ID}/prime-contract-pcos`, "Prime PCOs list", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/prime-contract-pcos/${FAKE_UUID}`, "Prime PCO detail (fake id)", [200, 401, 404]],
  ["GET", `/api/projects/${PROJECT_ID}/commitment-pcos`, "Commitment PCOs list", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/commitment-pcos/${FAKE_UUID}`, "Commitment PCO detail (fake id)", [200, 401, 404]],
  ["GET", `/api/projects/${PROJECT_ID}/pcos`, "All PCOs", [200, 401]],

  // Contracts
  ["GET", `/api/projects/${PROJECT_ID}/contracts`, "Contracts list", [200, 401]],

  // Commitments
  ["GET", "/api/commitments", "Commitments list", [200, 401]],

  // Direct Costs
  ["GET", `/api/projects/${PROJECT_ID}/direct-costs/export`, "Direct costs export", [200, 401]],

  // Invoicing
  ["GET", `/api/projects/${PROJECT_ID}/invoicing/subcontractor`, "Subcontractor invoicing", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/invoicing/subcontractor/invoices`, "Sub invoices list", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/invoicing/payments`, "Payments list", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/invoicing/billing-periods`, "Billing periods", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/invoicing/settings`, "Invoicing settings", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/billing-periods`, "Billing periods (alt)", [200, 401]],
  ["GET", "/api/invoices", "Invoices (global)", [200, 401]],

  // Estimates
  ["GET", `/api/projects/${PROJECT_ID}/estimates`, "Estimates list", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/estimates/${FAKE_UUID}`, "Estimate detail (fake id)", [200, 401, 404]],
  ["GET", "/api/estimates", "Estimates (global)", [200, 401]],
  ["GET", "/api/estimates/stats", "Estimates stats", [200, 401]],

  // Directory (Project)
  ["GET", `/api/projects/${PROJECT_ID}/directory/companies`, "Directory companies", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/directory/people`, "Directory people", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/directory/groups`, "Directory groups", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/directory/vendors`, "Directory vendors", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/directory/roles`, "Directory roles", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/directory/permissions`, "Directory permissions", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/directory/activity`, "Directory activity", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/directory/filters`, "Directory filters", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/directory/preferences`, "Directory preferences", [200, 401]],

  // Directory (Global)
  ["GET", "/api/companies", "Companies (global)", [200, 401]],
  ["GET", "/api/directory/companies", "Directory companies (global)", [200, 401]],
  ["GET", "/api/directory/vendors", "Vendors (global)", [200, 401]],
  ["GET", "/api/directory/project-companies", "Project companies", [200, 401]],
  ["GET", "/api/contacts", "Contacts", [200, 401]],
  ["GET", "/api/people", "People", [200, 401]],
  ["GET", "/api/employees", "Employees", [200, 401]],
  ["GET", "/api/users", "Users", [200, 401]],

  // Permissions
  ["GET", `/api/projects/${PROJECT_ID}/permissions`, "Project permissions", [200, 401]],
  ["GET", "/api/permissions/templates", "Permission templates", [200, 401]],

  // RFIs
  ["GET", `/api/projects/${PROJECT_ID}/rfis`, "RFIs list", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/rfis/${FAKE_UUID}`, "RFI detail (fake id)", [200, 401, 404]],

  // Submittals
  ["GET", `/api/projects/${PROJECT_ID}/submittals`, "Submittals list", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/submittals/${FAKE_UUID}`, "Submittal detail (fake id)", [200, 401, 404]],
  ["GET", `/api/projects/${PROJECT_ID}/submittals/packages`, "Submittal packages", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/submittals/specs`, "Submittal specs", [200, 401]],

  // Drawings
  ["GET", `/api/projects/${PROJECT_ID}/drawings`, "Drawings list", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/drawings/${FAKE_UUID}`, "Drawing detail (fake id)", [200, 401, 404]],
  ["GET", `/api/projects/${PROJECT_ID}/drawings/sets`, "Drawing sets", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/drawings/areas`, "Drawing areas", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/drawings/recycle-bin`, "Drawings recycle bin", [200, 401]],

  // Specifications
  ["GET", `/api/projects/${PROJECT_ID}/specifications`, "Specifications list", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/specifications/areas`, "Spec areas", [200, 401]],

  // Scheduling
  ["GET", `/api/projects/${PROJECT_ID}/scheduling/tasks`, "Schedule tasks", [200, 401]],

  // Meetings
  ["GET", `/api/projects/${PROJECT_ID}/meetings`, "Meetings list", [200, 401]],

  // Photos
  ["GET", `/api/projects/${PROJECT_ID}/photos`, "Photos list", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/photo-albums`, "Photo albums", [200, 401]],

  // Documents
  ["GET", `/api/projects/${PROJECT_ID}/documents`, "Documents list", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/transmittals`, "Transmittals", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/emails`, "Emails", [200, 401]],

  // Punch Items
  ["GET", `/api/projects/${PROJECT_ID}/punch-items`, "Punch items", [200, 401]],
  ["POST", `/api/projects/${PROJECT_ID}/punch-items`, "Punch items create (auth check)", [400, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/checklist`, "Checklist", [200, 401]],

  // Other project-scoped
  ["GET", `/api/projects/${PROJECT_ID}/vendors`, "Vendors", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/employees`, "Project employees", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/subcontracts`, "Subcontracts", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/purchase-orders`, "Purchase orders", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/vertical-markup`, "Vertical markup", [200, 401]],

  // AI / Assistant
  ["GET", "/api/ai-assistant/usage-stats", "AI usage stats", [200, 401]],
  ["GET", "/api/ai-assistant/conversations", "AI conversations", [200, 401]],
  ["GET", "/api/ai-assistant/memories", "AI memories", [200, 401]],
  ["GET", "/api/ai-assistant/timeline", "AI timeline", [200, 401]],

  // Admin
  ["GET", "/api/admin/feedback", "Admin feedback", [200, 401]],
  ["GET", "/api/admin/feedback/tools", "Feedback tools", [200, 401]],
  ["GET", "/api/admin/company-context", "Company context", [200, 401]],
  ["GET", "/api/admin/company-knowledge", "Company knowledge", [200, 401]],

  // Dev
  ["GET", "/api/dev/violations", "Design violations", [200, 401]],
  ["GET", "/api/dev/schema", "DB schema", [200, 401]],

  // Misc
  ["GET", "/api/tasks", "Tasks list", [200, 401]],
  ["GET", "/api/documents/status", "Document status", [200, 401]],
  ["GET", "/api/initiative-cards", "Initiative cards", [200, 401]],
  ["GET", "/api/clients", "Clients", [200, 401]],
  ["GET", "/api/knowledge", "Knowledge", [200, 401]],
  ["GET", "/api/monitoring/dashboard", "Monitoring dashboard", [200, 401]],
  ["GET", "/api/docs-search", "Docs search", [200, 401]],

  // Auth checks — these must require auth
  ["POST", "/api/cron/daily-flags", "Cron unauthorized", [401]],
  ["GET", "/api/monitoring/notify", "Monitoring notify unauthorized", [401]],
];

// ─── Health check contract ──────────────────────────────────────────────────
function assertHealthBody(body) {
  return (
    body &&
    body.status === "healthy" &&
    body.backend === true &&
    typeof body.openai_configured === "boolean" &&
    typeof body.timestamp === "string"
  );
}

// ─── Error envelope contracts ────────────────────────────────────────────────
function hasStandardErrorEnvelope(body) {
  return (
    body &&
    typeof body === "object" &&
    body.success === false &&
    typeof body.error_code === "string" &&
    typeof body.error_message === "string" &&
    typeof body.where_it_failed === "string" &&
    typeof body.request_id === "string" &&
    typeof body.timestamp === "string"
  );
}

function hasLegacyErrorEnvelope(body) {
  return body && typeof body === "object" && typeof body.error === "string";
}

// ─── Runner ──────────────────────────────────────────────────────────────────
async function run() {
  const failures = [];
  const warnings = [];
  let pass = 0;
  const total = ENDPOINTS.length;
  const timestamp = new Date().toISOString();

  console.log(`\nAPI Smoke Test — ${timestamp}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Endpoints: ${total}\n`);

  for (const [method, path, description, expectedStatuses] of ENDPOINTS) {
    const url = `${BASE_URL}${path}`;
    let status = 0;
    let body = null;

    try {
      const res = await fetch(url, {
        method,
        signal: AbortSignal.timeout(10000),
      });
      status = res.status;
      const text = await res.text();
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = null;
      }
    } catch (err) {
      status = 0; // timeout or network error
    }

    // 500 is always a failure — server bug regardless of auth
    if (status === 500 || status === 0) {
      const label = status === 0 ? "TIMEOUT" : "500";
      console.error(`  FAIL  ${label}  ${method} ${path}  (${description})`);
      failures.push(`${label}: ${method} ${path} — ${description}`);
      continue;
    }

    // Check against expected statuses
    if (expectedStatuses && !expectedStatuses.includes(status)) {
      console.error(`  FAIL  ${status}  ${method} ${path}  expected [${expectedStatuses.join(", ")}]  (${description})`);
      failures.push(`Unexpected ${status}: ${method} ${path} — ${description} (expected [${expectedStatuses.join(", ")}])`);
      continue;
    }

    // Health endpoint: assert body shape
    if (path === "/api/health" && status === 200 && !assertHealthBody(body)) {
      console.error(`  FAIL  200  ${method} ${path}  health body shape mismatch`);
      failures.push(`Health body contract failed: ${JSON.stringify(body)}`);
      continue;
    }

    // Error responses: verify envelope
    if (status >= 400 && body !== null) {
      const hasStandard = hasStandardErrorEnvelope(body);
      const hasLegacy = hasLegacyErrorEnvelope(body);
      if (!hasStandard && !hasLegacy) {
        warnings.push(`${method} ${path} [${status}] — error response missing standard envelope`);
      }
    }

    console.log(`   OK   ${status}  ${method} ${path}  (${description})`);
    pass++;
  }

  // Summary
  console.log(`\n─── Results ───`);
  console.log(`Pass: ${pass}  Fail: ${failures.length}  Warn: ${warnings.length}  Total: ${total}`);

  if (warnings.length > 0) {
    console.warn("\nWarnings (non-blocking):");
    for (const w of warnings) console.warn(`  - ${w}`);
  }

  if (failures.length > 0) {
    console.error(`\nFailures:`);
    for (const f of failures) console.error(`  - ${f}`);

    if (ERROR_ALERT_WEBHOOK_URL) {
      await sendAlert({
        severity: "high",
        error_code: "SMOKE_CONTRACT_FAILURE",
        error_message: `API smoke test: ${failures.length} endpoint(s) failed.`,
        where_it_failed: "scripts/api-smoke-contracts.mjs",
        timestamp,
        details: { base_url: BASE_URL, failure_count: failures.length, failures },
      });
    }

    process.exit(1);
  }

  console.log("\nAll endpoints healthy.");
}

async function sendAlert(payload) {
  try {
    const res = await fetch(ERROR_ALERT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(`Alert webhook failed: ${res.status}`);
    }
  } catch (err_) {
    console.error("Alert webhook error:", err_ instanceof Error ? err_.message : String(err_));
  }
}

run().catch((err) => {
  console.error("Smoke suite crashed:", err);
  process.exit(1);
});
