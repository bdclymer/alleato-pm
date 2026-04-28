#!/usr/bin/env node
/**
 * Validates that the configured git author email is on the Vercel-Hobby
 * allowlist. The Vercel Hobby Plan blocks deployments when the commit
 * author is not the project owner, producing the cryptic error:
 *
 *   "The deployment was blocked because the commit author did not have
 *    contributing access to the project on Vercel."
 *
 * To prevent that error from ever shipping silently again, this script
 * runs as a pre-commit guardrail. If the configured author email is not
 * on the allowlist, the commit is blocked with an actionable message.
 *
 * Allowlist source of truth: `.github/vercel-author-allowlist.json`.
 * Add a new email there if a new authorized contributor needs to commit.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const allowlistPath = resolve(here, "..", ".github", "vercel-author-allowlist.json");

let allowlist;
try {
  allowlist = JSON.parse(readFileSync(allowlistPath, "utf8"));
} catch (err) {
  console.error(`[check-commit-author] Could not read ${allowlistPath}: ${err.message}`);
  process.exit(2);
}

const allowedEmails = new Set((allowlist.emails ?? []).map((e) => e.toLowerCase()));
if (allowedEmails.size === 0) {
  console.error("[check-commit-author] Allowlist is empty. Add at least one email to .github/vercel-author-allowlist.json.");
  process.exit(2);
}

let email = "";
try {
  email = execSync("git config user.email", { encoding: "utf8" }).trim().toLowerCase();
} catch {
  email = "";
}

if (!email) {
  console.error("");
  console.error("ERROR: git user.email is not set.");
  console.error("");
  console.error("Run: git config user.email \"109628141+MeganHarrison@users.noreply.github.com\"");
  console.error("(or another email from .github/vercel-author-allowlist.json)");
  console.error("");
  process.exit(1);
}

if (!allowedEmails.has(email)) {
  console.error("");
  console.error("ERROR: Commit blocked — author email is not authorized to deploy on Vercel.");
  console.error("");
  console.error(`  Current git user.email: ${email}`);
  console.error("");
  console.error("Vercel Hobby Plan blocks deployments from any commit author that is not");
  console.error("the project owner. To unblock, set your author email to one on the allowlist:");
  console.error("");
  for (const allowed of allowedEmails) {
    console.error(`  - ${allowed}`);
  }
  console.error("");
  console.error("Fix:");
  console.error("  git config user.email \"109628141+MeganHarrison@users.noreply.github.com\"");
  console.error("  git config user.name  \"MeganHarrison\"");
  console.error("");
  console.error("Background: docs/patterns/vercel-hobby-author-gate.md");
  console.error("");
  process.exit(1);
}

process.exit(0);
