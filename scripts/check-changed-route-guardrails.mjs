#!/usr/bin/env node

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const baseRef = process.env.GUARDRAIL_BASE_REF || "origin/main";

function run(cmd) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] })
    .toString()
    .trim();
}

const diffFromBase = run(`git diff --name-only ${baseRef}...HEAD`)
  .split("\n")
  .map((v) => v.trim())
  .filter(Boolean);
const diffStaged = run("git diff --name-only --cached")
  .split("\n")
  .map((v) => v.trim())
  .filter(Boolean);
const diffWorking = run("git diff --name-only")
  .split("\n")
  .map((v) => v.trim())
  .filter(Boolean);

const changedFiles = [...new Set([...diffFromBase, ...diffStaged, ...diffWorking])];

const changedRoutes = changedFiles.filter(
  (file) => file.startsWith("frontend/src/app/api/") && file.endsWith("/route.ts"),
);

if (changedRoutes.length === 0) {
  console.log("No changed API routes.");
  process.exit(0);
}

const failures = [];
for (const route of changedRoutes) {
  const content = readFileSync(route, "utf8");
  const hasGuardrailWrapper = content.includes("withApiGuardrails");
  const hasApiErrorResponse = content.includes("apiErrorResponse(");

  if (!hasGuardrailWrapper && !hasApiErrorResponse) {
    failures.push(`${route}: missing withApiGuardrails or apiErrorResponse`);
  }

  if (/NextResponse\.json\(\s*\{\s*error\s*:/.test(content)) {
    failures.push(`${route}: raw error response detected, use shared guardrail envelope`);
  }
}

if (failures.length > 0) {
  console.error("Guardrail check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Guardrail check passed for ${changedRoutes.length} changed route(s).`);
