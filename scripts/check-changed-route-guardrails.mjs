#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const baseRef = process.env.GUARDRAIL_BASE_REF || "origin/main";
const scope = process.env.GUARDRAIL_SCOPE === "all" ? "all" : "changed";
const enforceRawErrors = process.env.GUARDRAIL_ENFORCE_RAW_ERRORS === "true";
const baselinePath = path.resolve(
  process.cwd(),
  process.env.GUARDRAIL_BASELINE_PATH || "scripts/guardrail-route-debt-baseline.txt",
);

function run(cmd) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] })
    .toString()
    .trim();
}

function readBaseline(filePath) {
  if (!existsSync(filePath)) return new Set();
  return new Set(
    readFileSync(filePath, "utf8")
      .split("\n")
      .map((v) => v.trim())
      .filter((v) => v && !v.startsWith("#")),
  );
}

function getAllRoutes() {
  const out = run("rg --files frontend/src/app/api | rg '/route\\.ts$' || true");
  return out
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean)
    .sort();
}

function getChangedRoutes() {
  const diffFromBase = run(`git diff --name-only ${baseRef}...HEAD || true`)
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);
  const diffStaged = run("git diff --name-only --cached || true")
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);
  const diffWorking = run("git diff --name-only || true")
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);

  const changedFiles = [...new Set([...diffFromBase, ...diffStaged, ...diffWorking])];
  return changedFiles
    .filter(
      (file) => file.startsWith("frontend/src/app/api/") && file.endsWith("/route.ts"),
    )
    .sort();
}

function analyzeRoute(route) {
  const content = readFileSync(route, "utf8");
  const hasGuardrailWrapper = content.includes("withApiGuardrails");
  const hasApiErrorResponse = content.includes("apiErrorResponse(");
  const hasStructuredPath = hasGuardrailWrapper || hasApiErrorResponse;
  const hasRawErrorResponse =
    /NextResponse\.json\(\s*\{\s*error\s*:/.test(content) ||
    /new Response\(\s*["'`]Unauthorized["'`]/.test(content);

  return {
    route,
    hasStructuredPath,
    hasRawErrorResponse,
  };
}

const routes = scope === "all" ? getAllRoutes() : getChangedRoutes();

if (routes.length === 0) {
  console.log(`No ${scope} API routes to validate.`);
  process.exit(0);
}

const baseline = readBaseline(baselinePath);
const checks = routes.map(analyzeRoute);

const noStructuredHandling = checks
  .filter((c) => !c.hasStructuredPath)
  .map((c) => c.route)
  .sort();

const rawErrorRoutes = checks
  .filter((c) => c.hasRawErrorResponse)
  .map((c) => c.route)
  .sort();

const failures = [];
if (scope === "changed") {
  for (const route of noStructuredHandling) {
    failures.push(`${route}: missing withApiGuardrails or apiErrorResponse`);
  }
  if (enforceRawErrors) {
    for (const route of rawErrorRoutes) {
      failures.push(`${route}: raw error response detected (use shared envelope)`);
    }
  }
} else {
  const baselineMissing = noStructuredHandling.filter((route) => !baseline.has(route));
  const baselineResolved = [...baseline].filter(
    (route) => route.endsWith("/route.ts") && !noStructuredHandling.includes(route),
  );

  for (const route of baselineMissing) {
    failures.push(
      `${route}: non-compliant route is not in baseline; migrate route or explicitly add debt entry`,
    );
  }
  for (const route of baselineResolved) {
    failures.push(
      `${route}: baseline entry is stale (route now compliant); remove it from baseline`,
    );
  }
}

console.log(
  `Guardrail report (${scope}): routes=${routes.length}, without_structured_handling=${noStructuredHandling.length}, raw_error_routes=${rawErrorRoutes.length}, enforce_raw_errors=${enforceRawErrors}`,
);

if (failures.length > 0) {
  console.error("Guardrail check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Guardrail check passed for ${routes.length} ${scope} route(s).`);
