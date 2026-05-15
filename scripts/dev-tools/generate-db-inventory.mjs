#!/usr/bin/env node

/**
 * Database Inventory Generator
 *
 * Combines:
 *   1. docs/architecture/tables.yaml  — human-authored metadata
 *   2. Live SQL (both Supabase projects) — row counts, size, columns, last stats
 *   3. Codebase grep                  — writers, readers, migrations per table
 *
 * Output: frontend/src/components/dev-tools/db-inventory.generated.ts
 *
 * Usage:
 *   npm run db:inventory           — full regenerate
 *   npm run db:inventory -- --check-only  — schema-drift check only (CI gate)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const yaml = require("js-yaml");
const pg = require("pg");
const dotenv = require("dotenv");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, "..", "..");

const CHECK_ONLY = process.argv.includes("--check-only");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fail(msg) {
  console.error(`\n[db-inventory] ❌ ${msg}`);
  process.exit(1);
}

function log(msg) {
  console.log(`[db-inventory] ${msg}`);
}

function warn(msg) {
  console.warn(`[db-inventory] ⚠️  ${msg}`);
}

// ─── Load env ────────────────────────────────────────────────────────────────

const envPath = path.join(repoRoot, ".env");
if (!fs.existsSync(envPath)) fail(`.env not found at ${envPath}`);
dotenv.config({ path: envPath });

const MAIN_DB_URL = process.env.DATABASE_URL;
const RAG_DB_URL = process.env.RAG_DATABASE_URL;

if (!MAIN_DB_URL) fail("DATABASE_URL is not set in .env");
if (!RAG_DB_URL) fail("RAG_DATABASE_URL is not set in .env");

// ─── Load YAML ───────────────────────────────────────────────────────────────

const yamlPath = path.join(repoRoot, "docs", "architecture", "tables.yaml");
if (!fs.existsSync(yamlPath)) {
  fail(`tables.yaml not found at ${yamlPath}. Run Phase 1 first.`);
}

let parsedYaml;
try {
  const raw = fs.readFileSync(yamlPath, "utf8");
  parsedYaml = yaml.load(raw);
} catch (err) {
  fail(`YAML parse error in tables.yaml: ${err.message}`);
}

if (!parsedYaml?.tables || !Array.isArray(parsedYaml.tables)) {
  fail("tables.yaml must have a top-level `tables:` array");
}

/** @type {Map<string, any>} */
const yamlByName = new Map();
for (const entry of parsedYaml.tables) {
  if (!entry.name) fail(`YAML entry missing required field 'name': ${JSON.stringify(entry)}`);
  if (!entry.db) fail(`YAML entry '${entry.name}' missing required field 'db'`);
  if (!["MAIN", "RAG"].includes(entry.db)) fail(`YAML entry '${entry.name}' has invalid db '${entry.db}'. Must be MAIN or RAG`);
  if (!entry.domain) fail(`YAML entry '${entry.name}' missing required field 'domain'`);
  if (!entry.status) fail(`YAML entry '${entry.name}' missing required field 'status'`);
  if (!entry.purpose) fail(`YAML entry '${entry.name}' missing required field 'purpose'`);
  yamlByName.set(entry.name, entry);
}

log(`Loaded ${yamlByName.size} entries from tables.yaml`);

// ─── DB connections ───────────────────────────────────────────────────────────

async function createPool(url, label) {
  const pool = new pg.Pool({ connectionString: url, max: 5, ssl: url.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined });
  try {
    const client = await pool.connect();
    client.release();
    log(`Connected to ${label} database`);
  } catch (err) {
    fail(`Cannot connect to ${label} database: ${err.message}`);
  }
  return pool;
}

// ─── SQL queries ──────────────────────────────────────────────────────────────

const STATS_QUERY = `
  SELECT
    c.relname AS name,
    GREATEST(c.reltuples::bigint, 0) AS approx_rows,
    pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
    pg_total_relation_size(c.oid) AS total_size_bytes,
    ps.last_autoanalyze,
    ps.last_autovacuum,
    COALESCE(ps.n_live_tup, 0) AS n_live_tup,
    COALESCE(ps.n_dead_tup, 0) AS n_dead_tup
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_stat_user_tables ps ON ps.relid = c.oid
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = $1
`;

const COLUMNS_QUERY = `
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = $1
  ORDER BY ordinal_position
`;

const ALL_TABLES_QUERY = `
  SELECT relname
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
  ORDER BY relname
`;

// ─── Code grep ───────────────────────────────────────────────────────────────

const SEARCH_ROOTS = [
  path.join(repoRoot, "frontend", "src"),
  path.join(repoRoot, "backend", "src"),
];
const MIGRATION_ROOT = path.join(repoRoot, "supabase", "migrations");

const EXCLUDE_PATTERNS = [
  "__tests__",
  "node_modules",
  ".next",
  ".claude/worktrees",
  "dist",
  ".archive",
];

function shouldExclude(filePath) {
  return EXCLUDE_PATTERNS.some((p) => filePath.includes(p));
}

/** Walk a directory recursively, yielding file paths */
function* walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (shouldExclude(full)) continue;
    if (entry.isDirectory()) yield* walkDir(full);
    else if (entry.isFile()) yield full;
  }
}

/** Classify a reference as read/write/unknown based on surrounding lines */
function classifyRef(lines, lineIdx) {
  const context = lines
    .slice(Math.max(0, lineIdx - 1), Math.min(lines.length, lineIdx + 4))
    .join(" ");
  if (/\.(insert|update|upsert|delete)\b/.test(context)) return "write";
  if (/\.(select|maybeSingle|single|csv|explain|count)\b/.test(context)) return "read";
  return "unknown";
}

function escapeSnippet(s) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${")
    .replace(/\r/g, "")
    .trim()
    .slice(0, 120);
}

/** Find all code references for a given table name */
function grepTable(tableName) {
  /** @type {{ filePath: string; lineNumber: number; kind: string; snippet: string }[]} */
  const writes = [];
  const reads = [];
  const migrations = [];
  const unknown = [];

  // Source code patterns
  const quotedTable = tableName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const codePattern = new RegExp(
    `\\.from\\(['"](${quotedTable})['"]\)|\\.table\\(['"](${quotedTable})['"]\)`,
    "g"
  );

  for (const root of SEARCH_ROOTS) {
    for (const filePath of walkDir(root)) {
      if (!filePath.match(/\.(ts|tsx|js|jsx|py|mjs|cjs)$/)) continue;
      let content;
      try {
        content = fs.readFileSync(filePath, "utf8");
      } catch {
        continue;
      }
      const lines = content.split("\n");
      lines.forEach((line, idx) => {
        codePattern.lastIndex = 0;
        if (codePattern.test(line)) {
          const kind = classifyRef(lines, idx);
          const ref = {
            filePath: path.relative(repoRoot, filePath),
            lineNumber: idx + 1,
            kind,
            snippet: escapeSnippet(line),
          };
          if (kind === "write") writes.push(ref);
          else if (kind === "read") reads.push(ref);
          else unknown.push(ref);
        }
        codePattern.lastIndex = 0;
      });
    }
  }

  // Migration files
  const migrationPattern = new RegExp(
    `(?:FROM|INTO|UPDATE|ON)\\s+(?:public\\.)?${quotedTable}(?:\\s|\\(|;)`,
    "gi"
  );

  if (fs.existsSync(MIGRATION_ROOT)) {
    for (const filePath of walkDir(MIGRATION_ROOT)) {
      if (!filePath.endsWith(".sql")) continue;
      let content;
      try {
        content = fs.readFileSync(filePath, "utf8");
      } catch {
        continue;
      }
      const lines = content.split("\n");
      lines.forEach((line, idx) => {
        migrationPattern.lastIndex = 0;
        if (migrationPattern.test(line)) {
          migrations.push({
            filePath: path.relative(repoRoot, filePath),
            lineNumber: idx + 1,
            kind: "migration",
            snippet: escapeSnippet(line),
          });
        }
        migrationPattern.lastIndex = 0;
      });
    }
  }

  return { writes, reads, migrations, unknown };
}

// ─── Schema drift check ───────────────────────────────────────────────────────

async function checkSchemaDrift(mainPool, ragPool) {
  const mainResult = await mainPool.query(ALL_TABLES_QUERY);
  const ragResult = await ragPool.query(ALL_TABLES_QUERY);

  const mainTables = new Set(mainResult.rows.map((r) => r.relname));
  const ragTables = new Set(ragResult.rows.map((r) => r.relname));

  const missing = [];
  const stale = [];

  // Check DB tables not in YAML
  for (const t of mainTables) {
    if (!yamlByName.has(t)) {
      missing.push({ table: t, db: "MAIN" });
    }
  }
  for (const t of ragTables) {
    const key = `${t}:RAG`;
    const found = [...yamlByName.values()].some(
      (e) => e.name === t && e.db === "RAG"
    );
    if (!found) {
      missing.push({ table: t, db: "RAG" });
    }
  }

  // Check YAML entries where the DB table no longer exists
  for (const [name, entry] of yamlByName) {
    const dbSet = entry.db === "MAIN" ? mainTables : ragTables;
    if (!dbSet.has(name)) {
      stale.push({ table: name, db: entry.db });
    }
  }

  if (missing.length > 0) {
    console.error("\n[db-inventory] ❌ Schema drift detected — tables in DB but missing from tables.yaml:");
    for (const { table, db } of missing) {
      console.error(`  Missing: ${table} (${db})`);
      console.error(`  Add this stub to tables.yaml:`);
      console.error(`    - name: ${table}`);
      console.error(`      db: ${db}`);
      console.error(`      domain: unknown`);
      console.error(`      status: dormant`);
      console.error(`      purpose: |`);
      console.error(`        TODO: Document this table.`);
      console.error(`      gotchas: null`);
      console.error(`      cleanup_priority: null`);
      console.error(`      owner: unknown`);
      console.error(`      related_tables: []`);
      console.error(`      notes_for_ai: null`);
      console.error();
    }
  }

  if (stale.length > 0) {
    console.error("\n[db-inventory] ❌ Stale YAML entries — tables in tables.yaml but no longer in DB:");
    for (const { table, db } of stale) {
      console.error(`  Stale: ${table} (${db}) — remove from tables.yaml`);
    }
  }

  if (missing.length > 0 || stale.length > 0) {
    process.exit(1);
  }

  log("Schema drift check passed ✓");
  return { mainTables, ragTables };
}

// ─── Snippet serializer ───────────────────────────────────────────────────────

function serializeRef(ref) {
  return `{ filePath: ${JSON.stringify(ref.filePath)}, lineNumber: ${ref.lineNumber}, kind: ${JSON.stringify(ref.kind)}, snippet: ${JSON.stringify(ref.snippet)} }`;
}

function serializeRefs(refs) {
  if (refs.length === 0) return "[]";
  return `[\n${refs.map((r) => `          ${serializeRef(r)},`).join("\n")}\n        ]`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log(`Mode: ${CHECK_ONLY ? "check-only" : "full regenerate"}`);

  const mainPool = await createPool(MAIN_DB_URL, "MAIN");
  const ragPool = await createPool(RAG_DB_URL, "RAG");

  try {
    // Phase 1: Schema drift check
    const { mainTables, ragTables } = await checkSchemaDrift(mainPool, ragPool);

    if (CHECK_ONLY) {
      log("Check-only mode: no output file written.");
      return;
    }

    const generatedAt = new Date().toISOString();
    const tableEntries = [];

    const allEntries = [...yamlByName.values()];
    log(`Processing ${allEntries.length} tables...`);

    for (let i = 0; i < allEntries.length; i++) {
      const entry = allEntries[i];
      if (i > 0 && i % 50 === 0) log(`  ${i}/${allEntries.length} processed...`);

      const pool = entry.db === "MAIN" ? mainPool : ragPool;
      const refreshedAt = new Date().toISOString();

      // Stats
      let liveStats = {
        approxRows: 0,
        totalSize: "0 bytes",
        lastAutoanalyze: null,
        nLiveTup: 0,
        nDeadTup: 0,
        refreshedAt,
      };
      try {
        const statsResult = await pool.query(STATS_QUERY, [entry.name]);
        if (statsResult.rows.length > 0) {
          const row = statsResult.rows[0];
          liveStats = {
            approxRows: Number(row.approx_rows) || 0,
            totalSize: row.total_size || "0 bytes",
            lastAutoanalyze: row.last_autoanalyze?.toISOString() ?? null,
            nLiveTup: Number(row.n_live_tup) || 0,
            nDeadTup: Number(row.n_dead_tup) || 0,
            refreshedAt,
          };
        }
      } catch (err) {
        warn(`Could not get stats for ${entry.name}: ${err.message}`);
      }

      // Columns
      let columns = [];
      try {
        const colResult = await pool.query(COLUMNS_QUERY, [entry.name]);
        columns = colResult.rows.map((r) => ({
          name: r.column_name,
          dataType: r.data_type,
          isNullable: r.is_nullable === "YES",
        }));
      } catch (err) {
        warn(`Could not get columns for ${entry.name}: ${err.message}`);
      }

      // Code grep
      const refs = grepTable(entry.name);

      tableEntries.push({ entry, liveStats, columns, refs });
    }

    log("Generating output file...");

    // ─── Emit .generated.ts ─────────────────────────────────────────────────

    const outputPath = path.join(
      repoRoot,
      "frontend",
      "src",
      "components",
      "dev-tools",
      "db-inventory.generated.ts"
    );

    const tableLines = tableEntries.map(({ entry, liveStats, columns, refs }) => {
      const clean = (s) => (s ? JSON.stringify(String(s).trim()) : "null");
      const relatedTables = Array.isArray(entry.related_tables) && entry.related_tables.length > 0
        ? `[${entry.related_tables.map((t) => JSON.stringify(t)).join(", ")}]`
        : "[]";

      return `    {
      name: ${JSON.stringify(entry.name)},
      db: ${JSON.stringify(entry.db)},
      domain: ${JSON.stringify(entry.domain)},
      status: ${JSON.stringify(entry.status)},
      purpose: ${clean(entry.purpose)},
      gotchas: ${entry.gotchas ? clean(entry.gotchas) : "null"},
      cleanupPriority: ${entry.cleanup_priority ? JSON.stringify(entry.cleanup_priority) : "null"},
      owner: ${JSON.stringify(entry.owner || "unknown")},
      relatedTables: ${relatedTables},
      notesForAi: ${entry.notes_for_ai ? clean(entry.notes_for_ai) : "null"},
      liveStats: {
        approxRows: ${liveStats.approxRows},
        totalSize: ${JSON.stringify(liveStats.totalSize)},
        lastAutoanalyze: ${liveStats.lastAutoanalyze ? JSON.stringify(liveStats.lastAutoanalyze) : "null"},
        nLiveTup: ${liveStats.nLiveTup},
        nDeadTup: ${liveStats.nDeadTup},
        refreshedAt: ${JSON.stringify(liveStats.refreshedAt)},
      },
      columns: [${columns.map((c) => `{ name: ${JSON.stringify(c.name)}, dataType: ${JSON.stringify(c.dataType)}, isNullable: ${c.isNullable} }`).join(", ")}],
      references: {
        writes: ${serializeRefs(refs.writes)},
        reads: ${serializeRefs(refs.reads)},
        migrations: ${serializeRefs(refs.migrations)},
        unknown: ${serializeRefs(refs.unknown)},
      },
    }`;
    });

    const totalSizeBytes = tableEntries.reduce((sum, { liveStats }) => sum + 0, 0);

    const output = `// AUTO-GENERATED — DO NOT EDIT BY HAND.
// Regenerate with: npm run db:inventory
// Source: docs/architecture/tables.yaml + live Supabase (MAIN + RAG) + codebase grep.
// Generated: ${generatedAt}

export type DbInventoryStatus =
  | "live"
  | "live-empty"
  | "dormant"
  | "dead"
  | "legacy"
  | "orphan-mirror";

export type DbInventoryDomain =
  | "projects"
  | "people"
  | "permissions"
  | "financial"
  | "acumatica-erp"
  | "change-management"
  | "commitments"
  | "documents"
  | "communications"
  | "chat-bot"
  | "intelligence"
  | "ai-feedback-memory"
  | "sync-infrastructure"
  | "workflow"
  | "marketing"
  | "admin-feedback"
  | "media"
  | "fm-asrs"
  | "procore-parity"
  | "support-knowledge"
  | "infra-meta";

export type DbInventoryReference = {
  filePath: string;
  lineNumber: number;
  kind: "read" | "write" | "migration" | "unknown";
  snippet: string;
};

export type DbInventoryTable = {
  name: string;
  db: "MAIN" | "RAG";
  domain: DbInventoryDomain;
  status: DbInventoryStatus;
  purpose: string;
  gotchas: string | null;
  cleanupPriority: "low" | "medium" | "high" | null;
  owner: string;
  relatedTables: string[];
  notesForAi: string | null;
  liveStats: {
    approxRows: number;
    totalSize: string;
    lastAutoanalyze: string | null;
    nLiveTup: number;
    nDeadTup: number;
    refreshedAt: string;
  };
  columns: Array<{
    name: string;
    dataType: string;
    isNullable: boolean;
  }>;
  references: {
    writes: DbInventoryReference[];
    reads: DbInventoryReference[];
    migrations: DbInventoryReference[];
    unknown: DbInventoryReference[];
  };
};

export type DbInventory = {
  generatedAt: string;
  generatorVersion: "1";
  tables: DbInventoryTable[];
};

export const DB_INVENTORY: DbInventory = {
  generatedAt: ${JSON.stringify(generatedAt)},
  generatorVersion: "1",
  tables: [
${tableLines.join(",\n")}
  ],
};
`;

    fs.writeFileSync(outputPath, output, "utf8");
    const sizeKB = Math.round(Buffer.byteLength(output, "utf8") / 1024);
    log(`✅ Written: ${outputPath} (${sizeKB} KB, ${tableEntries.length} tables)`);

    if (sizeKB > 500) {
      warn(`Output file is ${sizeKB} KB — consider reducing snippet length if this causes issues.`);
    }
  } finally {
    await mainPool.end();
    await ragPool.end();
  }
}

main().catch((err) => {
  console.error(`[db-inventory] Fatal error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
