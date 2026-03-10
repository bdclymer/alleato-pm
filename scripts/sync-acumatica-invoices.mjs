/**
 * Sync all AR invoices from Acumatica → Supabase acumatica_ar_invoices + acumatica_ar_invoice_lines
 * Usage: node scripts/sync-acumatica-invoices.mjs
 */

import { createClient } from "../frontend/node_modules/@supabase/supabase-js/dist/index.mjs";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envLines = readFileSync(join(__dirname, "../frontend/.env.local"), "utf8").split("\n");
const env = {};
for (const line of envLines) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const [k, ...v] = t.split("=");
  env[k.trim()] = v.join("=").trim();
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const ACCOUNTING_USER = env.ACCOUNTING_USER;
const ACCOUNTING_PASSWORD = env.ACCOUNTING_PASSWORD;
const BASE_URL = "https://alleatogroup.acumatica.com";
const ENTITY_BASE = `${BASE_URL}/entity/Default/24.200.001`;
const PAGE_SIZE = 100;

let sessionCookies = null;

async function login() {
  const res = await fetch(`${BASE_URL}/entity/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: ACCOUNTING_USER, password: ACCOUNTING_PASSWORD, company: "Alleato Group" }),
    redirect: "manual",
  });
  if (res.status !== 204) throw new Error(`Login failed (HTTP ${res.status})`);
  sessionCookies = res.headers.getSetCookie().map(h => h.split(";")[0]).join("; ");
  console.log("✓ Logged into Acumatica");
}

function unwrap(raw) {
  if (raw === null || raw === undefined) return raw;
  if (Array.isArray(raw)) return raw.map(unwrap);
  if (typeof raw === "object" && "value" in raw && Object.keys(raw).length === 1) return raw.value;
  if (typeof raw === "object") {
    const result = {};
    for (const [k, v] of Object.entries(raw)) result[k] = unwrap(v);
    return result;
  }
  return raw;
}

async function fetchPage(skip) {
  const url = new URL(`${ENTITY_BASE}/Invoice`);
  url.searchParams.set("$top", String(PAGE_SIZE));
  url.searchParams.set("$skip", String(skip));
  url.searchParams.set("$expand", "Details");
  const res = await fetch(url.toString(), {
    headers: { Cookie: sessionCookies, Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Invoice fetch failed (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }
  return (await res.json()).map(unwrap);
}

async function fetchAllInvoices() {
  const all = [];
  let skip = 0;
  process.stdout.write("  Fetching");
  while (true) {
    const page = await fetchPage(skip);
    all.push(...page);
    process.stdout.write(".");
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }
  console.log(` ${all.length} invoices`);
  return all;
}

function toDate(val) {
  if (!val) return null;
  return val.split("T")[0];
}

function toNum(val) {
  if (val === null || val === undefined) return null;
  const n = typeof val === "number" ? val : parseFloat(val);
  return isNaN(n) ? null : n;
}

async function syncInvoices() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const invoices = await fetchAllInvoices();
  const now = new Date().toISOString();

  // Load existing reference_nbr+type combos to know what to upsert vs insert
  const { data: existing } = await supabase
    .from("acumatica_ar_invoices")
    .select("id, reference_nbr, type");

  const existingMap = new Map(
    (existing ?? []).map(r => [`${r.reference_nbr}|${r.type}`, r.id])
  );

  const result = { created: 0, updated: 0, lines: 0, errors: [] };

  for (const inv of invoices) {
    const key = `${inv.ReferenceNbr}|${inv.Type}`;

    const header = {
      reference_nbr:   inv.ReferenceNbr,
      type:            inv.Type ?? null,
      status:          inv.Status ?? null,
      date:            toDate(inv.Date),
      post_period:     inv.PostPeriod ?? null,
      customer:        inv.Customer ?? null,
      project:         inv.Project ?? null,
      description:     inv.Description ?? null,
      amount:          toNum(inv.Amount),
      balance:         toNum(inv.Balance),
      tax_total:       toNum(inv.TaxTotal),
      hold:            inv.Hold ?? null,
      link_ar_account: inv.LinkARAccount ?? null,
      acumatica_sync_at: now,
      updated_at:      now,
    };

    try {
      let invoiceId = existingMap.get(key);

      if (invoiceId) {
        // Update header
        const { error } = await supabase
          .from("acumatica_ar_invoices")
          .update(header)
          .eq("id", invoiceId);
        if (error) { result.errors.push(`${key}: ${error.message}`); continue; }
        result.updated++;
      } else {
        // Insert header
        const { data, error } = await supabase
          .from("acumatica_ar_invoices")
          .insert(header)
          .select("id")
          .single();
        if (error) { result.errors.push(`${key}: ${error.message}`); continue; }
        invoiceId = data.id;
        result.created++;
      }

      // Sync line items — delete old, insert fresh
      const lines = Array.isArray(inv.Details) ? inv.Details : [];
      if (lines.length > 0) {
        await supabase.from("acumatica_ar_invoice_lines").delete().eq("invoice_id", invoiceId);

        const lineRows = lines.map(l => ({
          invoice_id:              invoiceId,
          line_nbr:                l.LineNbr ?? null,
          transaction_description: l.TransactionDescription ?? null,
          qty:                     toNum(l.Qty),
          unit_price:              toNum(l.UnitPrice),
          extended_price:          toNum(l.ExtendedPrice),
          amount:                  toNum(l.Amount),
          discount_amount:         toNum(l.DiscountAmount),
          account:                 l.Account ?? null,
          cost_code:               l.CostCode ?? null,
          project_task:            l.ProjectTask ?? null,
          tax_category:            l.TaxCategory ?? null,
          uom:                     l.UOM ?? null,
        }));

        const { error: lineErr } = await supabase
          .from("acumatica_ar_invoice_lines")
          .insert(lineRows);
        if (lineErr) result.errors.push(`lines for ${key}: ${lineErr.message}`);
        else result.lines += lineRows.length;
      }
    } catch (err) {
      result.errors.push(`${key}: ${err.message}`);
    }
  }

  return result;
}

(async () => {
  console.log("Starting Acumatica AR invoice sync...\n");
  await login();
  const result = await syncInvoices();

  console.log("\n--- Results ---");
  console.log(`  Created : ${result.created}`);
  console.log(`  Updated : ${result.updated}`);
  console.log(`  Lines   : ${result.lines}`);
  console.log(`  Errors  : ${result.errors.length}`);
  if (result.errors.length > 0) result.errors.forEach(e => console.log(`    ✗ ${e}`));
  console.log("\nDone.");
})().catch(err => { console.error("Fatal:", err.message); process.exit(1); });
