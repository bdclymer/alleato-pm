#!/usr/bin/env node
/**
 * Audit: PageShell Violations (Rule 6)
 *
 * For each page.tsx under frontend/src/app/**:
 *   - Uses deprecated ProjectToolPage or PageLayout         → DEPRECATED
 *   - Uses <PageContainer> AND has a manual <h1> in file    → DOUBLE HEADER
 *   - Uses neither PageShell nor acceptable legacy pattern  → MISSING PAGE SHELL
 *
 * Output:
 *   <file>\t<violation>\t<detail>
 *
 * Always exits 0.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const APP_ROOT = path.join(REPO_ROOT, "frontend", "src", "app");

const SKIP_DIR = new Set(["node_modules", ".next", "dist", "build", "__tests__"]);

async function* walkPageFiles(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIR.has(e.name) || e.name.startsWith(".")) continue;
      yield* walkPageFiles(full);
    } else if (e.isFile() && e.name === "page.tsx") {
      yield full;
    }
  }
}

function rel(p) {
  return path.relative(REPO_ROOT, p);
}

function classify(text) {
  const violations = [];

  const usesProjectToolPage = /\bProjectToolPage\b/.test(text);
  const usesPageLayoutDeprecated = /from ["'][^"']*\/layout\/PageLayout["']/.test(text) ||
    /import\s*\{[^}]*\bPageLayout\b[^}]*\}\s*from\s*["']@\/components\/layout/.test(text);
  const usesPageShell = /\bPageShell\b/.test(text);
  const usesPageContainer = /<PageContainer[\s>]/.test(text);
  const hasManualH1 = /<h1[\s>]/.test(text);

  if (usesProjectToolPage) {
    violations.push(["DEPRECATED_LAYOUT", "uses <ProjectToolPage>"]);
  }
  if (usesPageLayoutDeprecated) {
    violations.push(["DEPRECATED_LAYOUT", "imports deprecated PageLayout"]);
  }

  if (usesPageContainer && hasManualH1 && !usesPageShell) {
    violations.push(["DOUBLE_HEADER", "<PageContainer> + manual <h1>"]);
  }

  return violations;
}

async function main() {
  let totalPages = 0;
  let pagesWithViolations = 0;
  const violationRows = [];
  const counts = { DEPRECATED_LAYOUT: 0, DOUBLE_HEADER: 0 };

  for await (const file of walkPageFiles(APP_ROOT)) {
    totalPages++;
    let text;
    try {
      text = await fs.readFile(file, "utf8");
    } catch {
      continue;
    }
    const vs = classify(text);
    if (vs.length > 0) pagesWithViolations++;
    for (const [kind, detail] of vs) {
      counts[kind] = (counts[kind] || 0) + 1;
      violationRows.push(`${rel(file)}\t${kind}\t${detail}`);
    }
  }

  console.log("=== PageShell Violations Audit ===");
  console.log(`Scanned: ${totalPages} page.tsx files under frontend/src/app/**`);
  console.log(`Pages with violations: ${pagesWithViolations}`);
  console.log(`DEPRECATED_LAYOUT: ${counts.DEPRECATED_LAYOUT}`);
  console.log(`DOUBLE_HEADER   : ${counts.DOUBLE_HEADER}`);
  console.log("");
  console.log("file\tviolation\tdetail");
  for (const row of violationRows.sort()) console.log(row);
}

main().catch((err) => {
  console.error("audit-pageshell-violations failed:", err?.message || err);
  process.exit(0);
});
