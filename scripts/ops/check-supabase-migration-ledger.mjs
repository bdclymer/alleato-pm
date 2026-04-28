#!/usr/bin/env node
import { execFileSync } from "node:child_process";
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

const explicitVersions = process.argv.slice(2).map(versionFromInput).filter(Boolean);
const versions = [...new Set(explicitVersions.length > 0 ? explicitVersions : changedMigrationVersions())];

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
for (const line of listOutput.split(/\r?\n/)) {
  const match = line.match(/^\s*(\d{14})\s+\|\s*(\d{14})?\s+\|/);
  if (match?.[2]) {
    remoteVersions.add(match[2]);
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

console.log(`Supabase migration ledger check passed: ${versions.join(", ")}`);
