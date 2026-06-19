#!/usr/bin/env node

/**
 * Project Map Generator
 *
 * Produces an agent-readable inventory of the app's surfaces — the thing every
 * fresh AI session is missing. Purely derived from the filesystem, so it is
 * always accurate when regenerated.
 *
 * Scans:
 *   1. frontend/src/app/**\/page.tsx   — every UI route (URL ← file)
 *   2. frontend/src/app/api/**\/route.ts — every API endpoint + HTTP methods
 *   3. frontend/src/lib/ai/tools/*.ts  — every AI tool name + description
 *
 * Output: docs/architecture/PROJECT-MAP.md
 *
 * Usage:
 *   npm run map:project              — regenerate the map
 *   npm run map:project -- --check-only  — fail if the committed map is stale (CI/pre-commit gate)
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..", "..");
const APP_DIR = join(ROOT, "frontend", "src", "app");
const TOOLS_DIR = join(ROOT, "frontend", "src", "lib", "ai", "tools");
const OUTPUT = join(ROOT, "docs", "architecture", "PROJECT-MAP.md");

const CHECK_ONLY = process.argv.includes("--check-only");

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

// ── filesystem walk ──────────────────────────────────────────────
function walk(dir, predicate, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, predicate, acc);
    else if (predicate(full)) acc.push(full);
  }
  return acc;
}

// ── URL derivation ───────────────────────────────────────────────
// Strip route groups "(x)", drop the trailing file, keep [params].
function fileToUrl(absPath, kind) {
  const rel = relative(APP_DIR, absPath).split(sep);
  rel.pop(); // remove page.tsx / route.ts
  const segments = rel.filter((s) => !(s.startsWith("(") && s.endsWith(")")));
  let url = "/" + segments.join("/");
  if (url === "/" && kind === "api") url = "/api";
  return url === "" ? "/" : url;
}

// ── API method extraction ────────────────────────────────────────
function extractMethods(absPath) {
  const src = readFileSync(absPath, "utf8");
  const found = new Set();
  for (const m of HTTP_METHODS) {
    const re = new RegExp(`export\\s+(?:async\\s+function|const)\\s+${m}\\b`);
    if (re.test(src)) found.add(m);
  }
  return [...found];
}

// ── AI tool extraction ───────────────────────────────────────────
// Tools are object keys defined as `name: tool({ description: "..." })`.
function extractTools(absPath) {
  const src = readFileSync(absPath, "utf8");
  const tools = [];
  const keyRe = /(^|\n)[ \t]*([a-zA-Z][a-zA-Z0-9_]*)\s*:\s*tool\(\{/g;
  let match;
  while ((match = keyRe.exec(src)) !== null) {
    const name = match[2];
    const after = src.slice(match.index, match.index + 4000);
    const description = extractDescription(after);
    tools.push({ name, description });
  }
  return tools;
}

// Capture the value of the first `description:` — handles "..", '..', `..`,
// and "a" + "b" concatenation across lines.
function extractDescription(chunk) {
  const idx = chunk.indexOf("description:");
  if (idx === -1) return "";
  let i = idx + "description:".length;
  const parts = [];
  while (i < chunk.length) {
    while (i < chunk.length && /\s/.test(chunk[i])) i++;
    const q = chunk[i];
    if (q !== '"' && q !== "'" && q !== "`") break;
    i++;
    let buf = "";
    while (i < chunk.length && chunk[i] !== q) {
      if (chunk[i] === "\\") {
        buf += chunk[i + 1] === "n" ? " " : chunk[i + 1] ?? "";
        i += 2;
      } else {
        buf += chunk[i];
        i++;
      }
    }
    i++; // closing quote
    parts.push(buf);
    while (i < chunk.length && /\s/.test(chunk[i])) i++;
    if (chunk[i] === "+") {
      i++;
      continue; // string concatenation, keep going
    }
    break;
  }
  return parts.join("").replace(/\s+/g, " ").trim();
}

// ── build sections ───────────────────────────────────────────────
function buildPages() {
  const files = walk(APP_DIR, (f) => f.endsWith(`${sep}page.tsx`)).filter(
    (f) => !f.includes(`${sep}api${sep}`),
  );
  const rows = files
    .map((f) => ({ url: fileToUrl(f, "page"), file: relative(ROOT, f) }))
    .sort((a, b) => a.url.localeCompare(b.url));
  let md = `## UI Routes (${rows.length})\n\n`;
  md += "| URL | File |\n|-----|------|\n";
  for (const r of rows) md += `| \`${r.url}\` | ${r.file} |\n`;
  return md;
}

function buildApi() {
  const files = walk(APP_DIR, (f) => f.endsWith(`${sep}route.ts`)).filter((f) =>
    f.includes(`${sep}api${sep}`),
  );
  const rows = files
    .map((f) => ({
      url: fileToUrl(f, "api"),
      methods: extractMethods(f).join(", ") || "—",
      file: relative(ROOT, f),
    }))
    .sort((a, b) => a.url.localeCompare(b.url));
  let md = `## API Endpoints (${rows.length})\n\n`;
  md += "| Endpoint | Methods | File |\n|----------|---------|------|\n";
  for (const r of rows) md += `| \`${r.url}\` | ${r.methods} | ${r.file} |\n`;
  return md;
}

function buildTools() {
  const files = readdirSync(TOOLS_DIR)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .sort();
  let total = 0;
  let md = "";
  const sections = [];
  for (const f of files) {
    const tools = extractTools(join(TOOLS_DIR, f));
    if (tools.length === 0) continue;
    total += tools.length;
    let section = `### \`${f}\` (${tools.length})\n\n`;
    section += "| Tool | Description |\n|------|-------------|\n";
    for (const t of tools.sort((a, b) => a.name.localeCompare(b.name))) {
      const desc = t.description ? t.description.replace(/\|/g, "\\|") : "—";
      section += `| \`${t.name}\` | ${desc} |\n`;
    }
    sections.push(section);
  }
  md = `## AI Tools (${total})\n\n`;
  md += "These are the tools the AI assistant can call. Each lives in `frontend/src/lib/ai/tools/`.\n\n";
  md += sections.join("\n");
  return md;
}

// ── assemble ─────────────────────────────────────────────────────
function generate() {
  const header = `# Project Map

> **AUTO-GENERATED — do not edit by hand.** Regenerate with \`npm run map:project\`.
> A pre-commit gate fails if this file is stale relative to the code.
>
> This is the surface inventory every AI session should read first: what pages
> exist, what API endpoints exist, and what the AI assistant can do. For *how*
> the system fits together (data flow, architecture), see
> \`docs/architecture/AI-RAG-ARCHITECTURE.md\`. For the database, see
> \`docs/architecture/TABLE-LIST.md\`.

`;
  return (
    header +
    buildPages() +
    "\n" +
    buildApi() +
    "\n" +
    buildTools() +
    "\n"
  );
}

const content = generate();

if (CHECK_ONLY) {
  const existing = existsSync(OUTPUT) ? readFileSync(OUTPUT, "utf8") : "";
  if (existing !== content) {
    console.error(
      "❌ PROJECT MAP GATE — docs/architecture/PROJECT-MAP.md is stale.\n" +
        "   The code (routes / API / AI tools) changed but the map was not regenerated.\n" +
        "   Run: npm run map:project\n" +
        "   Then stage: git add docs/architecture/PROJECT-MAP.md",
    );
    process.exit(1);
  }
  console.log("✅ PROJECT-MAP.md is current.");
  process.exit(0);
}

writeFileSync(OUTPUT, content, "utf8");
console.log(`✅ Wrote ${relative(ROOT, OUTPUT)}`);
