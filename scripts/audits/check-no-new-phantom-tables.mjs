#!/usr/bin/env node
/**
 * Pre-commit guardrail: block any newly-added `.from("table-name")` call
 * where "table-name" is not in the generated Database["public"]["Tables"] union.
 *
 * Scans only added lines in staged diffs. Existing phantom-table debt is
 * not flagged here — it lives in docs/reports/codebase-audit-2026-04-14/.
 *
 * Run: `node scripts/audits/check-no-new-phantom-tables.mjs --staged`
 *      `node scripts/audits/check-no-new-phantom-tables.mjs --base origin/main`
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const TYPES_PATH = join(REPO_ROOT, "frontend/src/types/database.types.ts");
const SCAN_PREFIXES = ["frontend/src/"];
const CODE_EXT = /\.(ts|tsx|js|jsx)$/;

const args = new Set(process.argv.slice(2));
const baseFlagIdx = process.argv.indexOf("--base");
const baseRef = baseFlagIdx >= 0 ? process.argv[baseFlagIdx + 1] : process.env.GUARDRAIL_BASE_REF || "origin/main";
const mode = args.has("--staged") ? "staged" : "changed";

function run(cmd) {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] }).toString().trimEnd();
  } catch {
    return "";
  }
}

function loadTableUnion() {
  const src = readFileSync(TYPES_PATH, "utf8");
  // Find the public.Tables block and extract its top-level keys
  // Pattern: `Tables: {\n      table_name: {\n        Row: {...}` repeated
  const tablesMatch = src.match(/Tables:\s*\{([\s\S]*?)\n\s*Views:/);
  if (!tablesMatch) {
    console.error("Could not parse Tables union from database.types.ts");
    process.exit(2);
  }
  const tablesBlock = tablesMatch[1];
  const tableNames = new Set();
  // Top-level keys are indented 6 spaces in the generated file
  const keyRe = /^      ([a-zA-Z_][a-zA-Z0-9_]*):\s*\{/gm;
  let m;
  while ((m = keyRe.exec(tablesBlock))) tableNames.add(m[1]);

  // Also accept Views as legitimate .from() targets
  const viewsMatch = src.match(/Views:\s*\{([\s\S]*?)\n\s*Functions:/);
  if (viewsMatch) {
    let v;
    while ((v = keyRe.exec(viewsMatch[1]))) tableNames.add(v[1]);
  }
  return tableNames;
}

function shouldScan(path) {
  return SCAN_PREFIXES.some((p) => path.startsWith(p)) && CODE_EXT.test(path);
}

function getStagedFiles() {
  const out =
    mode === "staged"
      ? run("git diff --cached --name-only --diff-filter=ACMR")
      : run(`git diff --name-only ${baseRef}...HEAD --diff-filter=ACMR`);
  if (!out) return [];
  return out.split("\n").map((s) => s.trim()).filter(Boolean).filter(shouldScan);
}

function getAddedLines(path) {
  const cmd =
    mode === "staged"
      ? `git diff --cached --unified=0 -- "${path}"`
      : `git diff --unified=0 ${baseRef}...HEAD -- "${path}"`;
  const diff = run(cmd);
  if (!diff) return [];
  const added = [];
  let lineNum = 0;
  for (const raw of diff.split("\n")) {
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      lineNum = parseInt(hunk[1], 10);
      continue;
    }
    if (raw.startsWith("+++")) continue;
    if (raw.startsWith("+")) {
      added.push({ line: lineNum, content: raw.slice(1) });
      lineNum += 1;
    } else if (!raw.startsWith("-")) {
      lineNum += 1;
    }
  }
  return added;
}

// Match .from("table") and .from('table') — STRING LITERAL ONLY.
// Skip storage.from() (storage buckets, not tables).
const FROM_RE = /(?<!storage\s*)\.from\(\s*['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]\s*\)/g;

function main() {
  const files = getStagedFiles();
  if (files.length === 0) {
    console.log(`No ${mode} code files to scan for phantom tables.`);
    process.exit(0);
  }

  const tables = loadTableUnion();
  if (tables.size === 0) {
    console.error("Parsed 0 tables from database.types.ts — refusing to run guard.");
    process.exit(2);
  }

  const violations = [];
  for (const file of files) {
    const added = getAddedLines(file);
    if (added.length === 0) continue;
    for (const { line, content } of added) {
      // Skip if line is in a comment that starts with // or *
      const trimmed = content.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
      // Skip storage bucket calls explicitly
      if (/\.storage\.from\(/.test(content)) continue;

      let m;
      FROM_RE.lastIndex = 0;
      while ((m = FROM_RE.exec(content))) {
        const tableName = m[1];
        if (!tables.has(tableName)) {
          violations.push({ file, line, tableName, content: trimmed });
        }
      }
    }
  }

  if (violations.length === 0) {
    console.log(`No new phantom-table references in ${mode} changes.`);
    process.exit(0);
  }

  console.error("");
  console.error("ERROR: New .from() calls reference tables not in database.types.ts:");
  console.error("");
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  →  .from("${v.tableName}")`);
    console.error(`    + ${v.content}`);
  }
  console.error("");
  console.error("Fix options:");
  console.error("  1. Run `npm run db:types` if the table exists in the live DB");
  console.error("  2. Add a migration in supabase/migrations/ if the table needs to be created");
  console.error("  3. Use the correct table name (check database.types.ts)");
  console.error("");
  process.exit(1);
}

main();
