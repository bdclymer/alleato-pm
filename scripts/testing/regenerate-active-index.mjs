#!/usr/bin/env node
/**
 * Regenerate docs/archive/2026-06-22-docs-migration/testing/active/test-scenarios-active-v1.md as a live index
 * over the per-tool consolidated scenarios and the Supabase test_suites table.
 *
 * Usage:
 *   node scripts/testing/regenerate-active-index.mjs
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or
 * NEXT_PUBLIC_SUPABASE_ANON_KEY) in the environment / frontend/.env.local.
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const scenariosDir = resolve(repoRoot, "docs/archive/2026-06-22-docs-migration/testing/scenarios");
const outFile = resolve(repoRoot, "docs/archive/2026-06-22-docs-migration/testing/active/test-scenarios-active-v1.md");

// Load env from frontend/.env.local if not already set.
function loadEnv() {
  const envPath = resolve(repoRoot, "frontend/.env.local");
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const [, k, v] = m;
    if (!process.env[k]) process.env[k] = v.replace(/^['"]|['"]$/g, "");
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Missing Supabase env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or anon)."
  );
  process.exit(1);
}

const PENDING_TOOLS = [
  "rfis",
  "submittals",
  "invoices",
  "prime-contracts",
  "direct-costs",
  "change-orders",
  "daily-log",
  "meetings",
  "punch-list",
  "documents",
  "directory",
  "schedule",
  "drawings",
  "specifications",
  "photos",
  "project-lifecycle",
];

const DISPLAY_NAME = {
  "change-events": "Change Events",
  "change-orders": "Change Orders",
  "daily-log": "Daily Log",
  "direct-costs": "Direct Costs",
  "prime-contracts": "Prime Contracts",
  "project-lifecycle": "Project Lifecycle",
  "punch-list": "Punch List",
};

function pretty(slug) {
  if (DISPLAY_NAME[slug]) return DISPLAY_NAME[slug];
  return slug
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

async function fetchSuites() {
  const url = `${SUPABASE_URL}/rest/v1/test_suites?select=tool_name,suite_type,total_cases,last_generated_at&order=tool_name.asc,suite_type.asc`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

function groupByTool(rows) {
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.tool_name)) map.set(r.tool_name, {});
    map.get(r.tool_name)[r.suite_type] = r.total_cases;
  }
  return map;
}

function listMarkdownTools() {
  if (!existsSync(scenariosDir)) return new Set();
  return new Set(
    readdirSync(scenariosDir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(/\.md$/, ""))
  );
}

function render(suitesByTool, mdTools) {
  const tools = [...suitesByTool.keys()].sort();
  const today = new Date().toISOString().slice(0, 10);

  const rows = tools.map((tool) => {
    const { smoke = 0, feature = 0 } = suitesByTool.get(tool);
    const total = smoke + feature;
    const mdLink = mdTools.has(tool)
      ? `[scenarios/${tool}.md](../scenarios/${tool}.md)`
      : "_(pending)_";
    return `| ${pretty(tool)} | ${smoke} | ${feature} | ${total} | ${mdLink} |`;
  });

  const totalSmoke = tools.reduce(
    (n, t) => n + (suitesByTool.get(t).smoke || 0),
    0
  );
  const totalFeature = tools.reduce(
    (n, t) => n + (suitesByTool.get(t).feature || 0),
    0
  );
  const totalCases = totalSmoke + totalFeature;

  const pending = PENDING_TOOLS.filter((t) => !suitesByTool.has(t));

  return `# Active Test Scenarios — Index

_Auto-generated index over the new per-tool consolidated scenarios. Regenerate with \`node scripts/testing/regenerate-active-index.mjs\`._

**Source of truth:** Supabase \`test_suites\` + \`test_cases\` (project \`lgveqfnpkxvzbnnwuled\`).
**Per-tool detail:** \`docs/archive/2026-06-22-docs-migration/testing/scenarios/<tool>.md\` (one file per tool, with \`## Smoke\` + \`## Feature\` sections).
**Regenerate a tool's suites:** \`/test-scenario-audit <tool>\`.
**Run a suite:** \`/test-scenario-run <tool> [smoke|feature]\`.

---

## Seeded suites

_Last refreshed: ${today}_

| Tool | Smoke | Feature | Total | Consolidated markdown |
|------|------:|--------:|------:|-----------------------|
${rows.join("\n")}

**Totals:** ${tools.length} tool${tools.length === 1 ? "" : "s"} · ${totalSmoke} smoke · ${totalFeature} feature · **${totalCases} cases**

---

## Tools still pending audit

Run \`/test-scenario-audit <tool>\` for each:

${pending.length ? pending.map((t) => `- \`${t}\``).join("\n") : "_(none — all known tools have been audited)_"}

---

## Deprecated

The old flat scenario layout is retired:

- \`docs/archive/2026-06-22-docs-migration/testing/*-scenarios.md\` — **deprecated**, do not edit. Use \`docs/archive/2026-06-22-docs-migration/testing/scenarios/<tool>.md\` instead.

## Schema reminder

\`test_cases\` columns: \`id, suite_id, test_number, category, subcategory, test_name, context_note, setup_steps, steps, expected_result, priority, test_type, start_url\`.

\`tool_name\` and \`suite_type\` live on \`test_suites\`, **not** on \`test_cases\` (dropped in the 2026-04-20 cleanup migration).
`;
}

async function main() {
  const rows = await fetchSuites();
  const byTool = groupByTool(rows);
  const mdTools = listMarkdownTools();
  const content = render(byTool, mdTools);
  writeFileSync(outFile, content);
  console.log(
    `Wrote ${outFile}\n${byTool.size} tool(s), ${rows.length} suite(s).`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
