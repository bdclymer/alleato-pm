#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";

const FRONTEND_ROOT = process.cwd();
const SRC_ROOT = path.join(FRONTEND_ROOT, "src");
const SCHEMA_DUMP_PATH = path.join(
  FRONTEND_ROOT,
  "..",
  "supabase",
  "migrations",
  "schema_dump.sql",
);

type AuditIssue = {
  kind: "placeholder" | "status-enum";
  file: string;
  detail: string;
};

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(abs));
      continue;
    }
    files.push(abs);
  }
  return files;
}

function rel(absPath: string): string {
  return path.relative(FRONTEND_ROOT, absPath).replace(/\\/g, "/");
}

function extractQuotedValues(raw: string): string[] {
  const values: string[] = [];
  const quoteRegex = /["']([^"']+)["']/g;
  let match: RegExpExecArray | null = quoteRegex.exec(raw);
  while (match) {
    values.push(match[1]);
    match = quoteRegex.exec(raw);
  }
  return values;
}

function parseConstArray(filePath: string, constName: string): string[] {
  const source = fs.readFileSync(filePath, "utf8");
  const re = new RegExp(
    `export\\s+const\\s+${constName}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s+as\\s+const`,
    "m",
  );
  const match = re.exec(source);
  if (!match) return [];
  return extractQuotedValues(match[1]);
}

function parseConstraintValues(
  schemaDump: string,
  constraintName: string,
): string[] {
  const marker = `CONSTRAINT ${constraintName}`;
  const start = schemaDump.indexOf(marker);
  if (start === -1) return [];
  const snippet = schemaDump.slice(start, start + 1200);
  const arrayMatch = /ARRAY\[([\s\S]*?)\]/.exec(snippet);
  if (!arrayMatch) return [];

  const values: string[] = [];
  const sqlString = /'([^']+)'::/g;
  let match: RegExpExecArray | null = sqlString.exec(arrayMatch[1]);
  while (match) {
    values.push(match[1]);
    match = sqlString.exec(arrayMatch[1]);
  }
  return values;
}

function main() {
  const issues: AuditIssue[] = [];
  const allFiles = walk(SRC_ROOT).filter((f) => /\.(tsx?|jsx?)$/.test(f));

  const placeholderPatterns = [
    /placeholder\s*=\s*["']0["']/g,
    /placeholder\s*=\s*["']0\.0["']/g,
    /placeholder\s*=\s*["']0\.00["']/g,
    /placeholder\s*=\s*["']\$0\.00["']/g,
  ];

  for (const file of allFiles) {
    const source = fs.readFileSync(file, "utf8");
    for (const pattern of placeholderPatterns) {
      if (!pattern.test(source)) continue;
      issues.push({
        kind: "placeholder",
        file: rel(file),
        detail:
          "numeric placeholder uses a literal zero value; leave placeholder empty for editable numeric fields",
      });
      break;
    }
  }

  const schemaDump = fs.existsSync(SCHEMA_DUMP_PATH)
    ? fs.readFileSync(SCHEMA_DUMP_PATH, "utf8")
    : "";

  const statusEnumChecks = [
    {
      schemaFile: path.join(
        FRONTEND_ROOT,
        "src/lib/schemas/create-subcontract-schema.ts",
      ),
      constName: "CommitmentStatusValues",
      constraintName: "subcontracts_status_check",
    },
  ];

  for (const check of statusEnumChecks) {
    const schemaValues = parseConstArray(check.schemaFile, check.constName);
    const dbValues = schemaDump
      ? parseConstraintValues(schemaDump, check.constraintName)
      : [];
    if (!schemaValues.length || !dbValues.length) continue;

    const schemaSet = new Set(schemaValues);
    const dbSet = new Set(dbValues);

    const extra = schemaValues.filter((v) => !dbSet.has(v));
    const missing = dbValues.filter((v) => !schemaSet.has(v));
    if (!extra.length && !missing.length) continue;

    issues.push({
      kind: "status-enum",
      file: rel(check.schemaFile),
      detail: [
        `status enum does not match DB constraint ${check.constraintName}`,
        extra.length ? `extra in schema: ${extra.join(", ")}` : "",
        missing.length ? `missing from schema: ${missing.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
    });
  }

  if (!issues.length) {
    console.log("Form-field standards audit: ✓ no issues found");
    return;
  }

  console.log(`Form-field standards audit: found ${issues.length} issue(s)\n`);
  for (const issue of issues) {
    console.log(`[${issue.kind}] ${issue.file}`);
    console.log(`  ${issue.detail}`);
  }

  process.exitCode = 1;
}

main();
