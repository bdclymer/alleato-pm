/**
 * One-off importer: Goodwill Noblesville (project 25125) submittals from the
 * Job Planner "Submittal Log" Excel export.
 *
 * Directive (Megan 2026-06-14): import EXACTLY what is in the file fields.
 * Invent nothing. Unmapped / missing info stays blank and is filled in later
 * in the app. Person columns with no matching DB column are preserved verbatim
 * in metadata so no source value is lost.
 *
 * Field mapping (1:1 only where a real column exists):
 *   Submittal Number -> submittal_number (trimmed)
 *   Title            -> title
 *   Due Date         -> final_due_date (MM/DD/YYYY -> ISO, same date)
 *   Status           -> status (verbatim: New / Submitted / Closed)
 *   Item Types       -> submittal_type (text, verbatim; submittal_type_id left null)
 *   Ball In Court    -> ball_in_court (text, verbatim)
 *   Submitter / Trades / Approver List / Distribution List -> metadata.source (verbatim)
 *
 * submitted_by / created_by are NOT NULL in the DB; they get an existing user
 * already present on this project's data (operational, not content).
 *
 * Usage:
 *   node scripts/import-noblesville-submittals.cjs            # dry run
 *   node scripts/import-noblesville-submittals.cjs --commit   # execute
 */

const fs = require("fs");
const path = require("path");

const ROOT = "/Users/meganharrison/Documents/alleato-pm";
const PROJECT_ID = 25125;
const FILE =
  "/Users/meganharrison/Downloads/Job Planner Exports - GW Noblesville/submittals_report-3.xlsx";
// Existing user already attached to this project's submittal data (NOT NULL FK).
const IMPORT_USER = "283f156c-4528-4003-a215-6e5e5452fff8";
const COMMIT = process.argv.includes("--commit");

const XLSX = require(require.resolve("xlsx", { paths: [path.join(ROOT, "frontend")] }));
const { createClient } = require(require.resolve("@supabase/supabase-js", {
  paths: [path.join(ROOT, "frontend")],
}));

const env =
  fs.readFileSync(path.join(ROOT, "frontend/.env.local"), "utf8") +
  "\n" +
  (fs.existsSync(path.join(ROOT, ".env")) ? fs.readFileSync(path.join(ROOT, ".env"), "utf8") : "");
const g = (k) => {
  const m = env.match(new RegExp("^" + k + "=(.*)$", "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
};
const sb = createClient(
  g("NEXT_PUBLIC_SUPABASE_URL") || g("SUPABASE_URL"),
  g("SUPABASE_SERVICE_ROLE_KEY") || g("SUPABASE_SERVICE_ROLE"),
);

const trim = (v) => (v === null || v === undefined ? "" : String(v).trim());
const orNull = (v) => {
  const t = trim(v);
  return t === "" ? null : t;
};

const IMPORT_TAG = "Job Planner Submittal Log";

/**
 * The submittals.status column has a CHECK constraint. The export's literals
 * "New" / "Submitted" are not permitted, so they are normalized to the nearest
 * allowed value (constraint-forced, not a free choice):
 *   Closed    -> Closed     (exact)
 *   Submitted -> submitted  (same word, the casing the schema allows)
 *   New       -> Draft      (no "New" is allowed; Draft = not-yet-submitted)
 * Anything already valid is passed through untouched.
 */
const ALLOWED_STATUS = new Set([
  "submitted",
  "Open",
  "Draft",
  "Distributed",
  "Closed",
  "approved",
  "rejected",
  "under_review",
  "requires_revision",
]);
function normalizeStatus(raw) {
  const s = trim(raw);
  if (!s) return null;
  if (ALLOWED_STATUS.has(s)) return s;
  const key = s.toLowerCase();
  if (key === "submitted") return "submitted";
  if (key === "new") return "Draft";
  if (key === "closed") return "Closed";
  if (key === "open") return "Open";
  if (key === "distributed") return "Distributed";
  return s; // surface anything unexpected as a constraint error rather than guess
}

function parseDate(raw) {
  const s = trim(raw);
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const num = Number(s);
  if (!Number.isNaN(num) && num > 1000) {
    const d = XLSX.SSF.parse_date_code(num);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  return null;
}

async function main() {
  console.log(`\n=== Noblesville (project ${PROJECT_ID}) submittal import — ${COMMIT ? "COMMIT" : "DRY RUN"} ===\n`);

  const wb = XLSX.readFile(FILE, { cellDates: false });
  const grid = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, blankrows: false });

  // Header row is the first row that contains "Submittal Number".
  const headerIdx = grid.findIndex((r) => (r || []).some((c) => trim(c).toLowerCase() === "submittal number"));
  if (headerIdx === -1) throw new Error("Could not locate header row (Submittal Number).");
  const headers = grid[headerIdx].map((h) => trim(h));
  const dataRows = grid.slice(headerIdx + 1).filter((r) => trim((r || [])[0]));
  console.log(`Header at row ${headerIdx}. Data rows: ${dataRows.length}`);

  const col = (row, name) => {
    const i = headers.indexOf(name);
    return i === -1 ? "" : row[i];
  };

  const payloads = dataRows.map((row) => {
    const number = trim(col(row, "Submittal Number"));
    const title = orNull(col(row, "Title"));
    const dueDate = parseDate(col(row, "Due Date"));
    const statusRaw = orNull(col(row, "Status"));
    const status = normalizeStatus(statusRaw); // constraint-forced normalization only
    const itemTypes = orNull(col(row, "Item Types"));
    const ballInCourt = orNull(col(row, "Ball In Court"));

    // Preserve every source cell verbatim so nothing is lost.
    const source = {};
    headers.forEach((h, i) => {
      source[h] = trim(row[i]) || null;
    });

    return {
      project_id: PROJECT_ID,
      submittal_number: number,
      title,
      status,
      final_due_date: dueDate,
      submittal_type: itemTypes,
      ball_in_court: ballInCourt,
      revision: 0,
      submitted_by: IMPORT_USER,
      created_by: IMPORT_USER,
      metadata: { import_source: IMPORT_TAG, original_status: statusRaw, source },
    };
  });

  payloads.forEach((p) =>
    console.log(
      `${COMMIT ? "" : "[dry] "}${p.submittal_number.padEnd(9)} ${String(p.status).padEnd(10)} due ${String(p.final_due_date).padEnd(10)} type=${String(p.submittal_type).slice(0, 20).padEnd(20)} bic=${p.ball_in_court ?? ""}  ${String(p.title).slice(0, 30)}`,
    ),
  );

  if (!COMMIT) {
    console.log(`\n=== Would import: ${payloads.length} submittals ===`);
    return;
  }

  // Idempotency: remove any rows from a prior run of this import (hard delete)
  // so re-running produces exactly the file's set, not duplicates.
  const { data: prior, error: priorErr } = await sb
    .from("submittals")
    .select("id")
    .eq("project_id", PROJECT_ID)
    .eq("metadata->>import_source", IMPORT_TAG);
  if (priorErr) throw new Error("prior-row lookup failed: " + priorErr.message);
  if (prior && prior.length) {
    await sb.from("submittals").delete().in("id", prior.map((r) => r.id));
    console.log(`Removed ${prior.length} rows from a previous run of this import.`);
  }

  let imported = 0;
  const failures = [];
  for (const p of payloads) {
    const { error } = await sb.from("submittals").insert(p);
    if (error) {
      failures.push(`${p.submittal_number}: ${error.message}`);
    } else {
      imported++;
    }
  }
  console.log(`\n=== Imported: ${imported}/${payloads.length} ===`);
  if (failures.length) {
    console.log("FAILURES:");
    failures.forEach((f) => console.log("  " + f));
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
