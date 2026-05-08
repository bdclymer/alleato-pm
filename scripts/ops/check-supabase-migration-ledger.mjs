#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function run(command, args) {
  return execFileSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function versionFromInput(value) {
  const base = path.basename(value);
  const match = base.match(/^(\d{14})(?:_|$)/);
  return match?.[1] || null;
}

function localMigrationFiles() {
  const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
  return fs
    .readdirSync(migrationsDir)
    .filter((name) => /^\d{14}_.+\.sql$/.test(name))
    .sort();
}

function assertNoDuplicateLocalMigrationVersions(files) {
  const byVersion = new Map();
  for (const file of files) {
    const version = versionFromInput(file);
    if (!version) continue;
    if (!byVersion.has(version)) byVersion.set(version, []);
    byVersion.get(version).push(file);
  }

  const duplicates = [...byVersion.entries()].filter(([, names]) => names.length > 1);
  if (duplicates.length === 0) return;

  console.error("Supabase migration ledger check failed.");
  console.error("Duplicate local migration versions found:");
  for (const [version, names] of duplicates) {
    console.error(`- ${version}: ${names.join(", ")}`);
  }
  console.error("");
  console.error("Each migration file must have a unique timestamp prefix.");
  process.exit(1);
}

function changedMigrationVersions() {
  const status = run("git", ["status", "--porcelain", "--", "supabase/migrations"]);
  return status
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^..\s+/, ""))
    .map(versionFromInput)
    .filter(Boolean);
}

function hydrateSupabaseDbPasswordFromDatabaseUrl() {
  if (process.env.SUPABASE_DB_PASSWORD || !process.env.DATABASE_URL) return;

  try {
    const url = new URL(process.env.DATABASE_URL);
    if (url.password) {
      process.env.SUPABASE_DB_PASSWORD = decodeURIComponent(url.password);
    }
  } catch {
    // The Supabase CLI will print its normal credential guidance below.
  }
}

const args = process.argv.slice(2);
const assertClean = args.includes("--all") || args.includes("--assert-clean");
const localFiles = localMigrationFiles();
assertNoDuplicateLocalMigrationVersions(localFiles);
hydrateSupabaseDbPasswordFromDatabaseUrl();

const explicitVersions = args.map(versionFromInput).filter(Boolean);
const localVersions = [...new Set(localFiles.map(versionFromInput).filter(Boolean))];
const versions = [
  ...new Set(
    assertClean
      ? localVersions
      : explicitVersions.length > 0
        ? explicitVersions
        : changedMigrationVersions(),
  ),
];

if (versions.length === 0) {
  console.log("No changed Supabase migration files found.");
  process.exit(0);
}

let listOutput;
try {
  listOutput = run("npx", ["supabase", "migration", "list", "--linked"]);
} catch (error) {
  process.stderr.write(error.stderr || error.message);
  process.exit(1);
}

const remoteVersions = new Set();
const localRows = new Set();
for (const line of listOutput.split(/\r?\n/)) {
  const match = line.match(/^\s*(\d{14})\s+\|\s*(\d{14})?\s+\|/);
  if (match?.[1]) {
    localRows.add(match[1]);
  }
  if (match?.[2]) {
    remoteVersions.add(match[2]);
  }
}

if (assertClean) {
  const remoteOnly = [...remoteVersions].filter((version) => !localRows.has(version));
  if (remoteOnly.length > 0) {
    console.error("Supabase migration ledger check failed.");
    console.error("These remote migration versions do not exist locally:");
    for (const version of remoteOnly) {
      console.error(`- ${version}`);
    }
    console.error("");
    console.error("Recover the local migration files or repair intentionally superseded remote ledger entries.");
    process.exit(1);
  }
}

const missing = versions.filter((version) => !remoteVersions.has(version));

if (missing.length > 0) {
  console.error("Supabase migration ledger check failed.");
  console.error("These local migrations are not applied on the linked remote database:");
  for (const version of missing) {
    console.error(`- ${version}`);
  }
  console.error("");
  console.error("Apply the migration or explicitly document why it is intentionally deferred.");
  process.exit(1);
}

if (assertClean) {
  console.log(`Supabase migration ledger check passed: ${versions.length} local migration versions aligned with remote.`);
} else {
  console.log(`Supabase migration ledger check passed: ${versions.join(", ")}`);
}
