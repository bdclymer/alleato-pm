#!/usr/bin/env node

import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const baselinePath = path.join(repoRoot, "scripts/design-system/baseline.json");

function run(command) {
  return execSync(command, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 1024 * 1024 * 50,
  });
}

function getCurrentDesignLint() {
  const eslintRun = spawnSync(
    "npx",
    ["eslint", "src", "--format", "json"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 50,
    },
  );

  if (eslintRun.error) {
    throw eslintRun.error;
  }

  const output = eslintRun.stdout ?? "[]";
  const results = JSON.parse(output);
  const issues = [];

  for (const file of results) {
    for (const message of file.messages ?? []) {
      if ((message.ruleId ?? "").startsWith("design-system/")) {
        issues.push({
          filePath: file.filePath,
          ruleId: message.ruleId,
          severity: message.severity,
        });
      }
    }
  }

  return issues;
}

function groupByRule(issues) {
  const byRule = {};
  for (const issue of issues) {
    byRule[issue.ruleId] = (byRule[issue.ruleId] ?? 0) + 1;
  }
  return byRule;
}

function main() {
  const shouldWriteBaseline = process.argv.includes("--write-baseline");
  const issues = getCurrentDesignLint();
  const currentCount = issues.length;
  const byRule = groupByRule(issues);

  if (!fs.existsSync(baselinePath)) {
    console.error(`Baseline file missing: ${baselinePath}`);
    process.exit(1);
  }

  const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  const baselineCount = Number(baseline.designSystemLintCount ?? 0);

  if (shouldWriteBaseline) {
    const nextBaseline = {
      ...baseline,
      designSystemLintCount: currentCount,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    fs.writeFileSync(baselinePath, `${JSON.stringify(nextBaseline, null, 2)}\n`);
    console.log(`Updated baseline to ${currentCount} at ${baselinePath}`);
    process.exit(0);
  }

  console.log(`Design lint count: current=${currentCount} baseline=${baselineCount}`);
  console.log("By rule:", byRule);

  if (currentCount > baselineCount) {
    console.error(
      `Design-system lint regression detected: +${currentCount - baselineCount} (current ${currentCount} > baseline ${baselineCount}).`,
    );
    console.error("Fix violations or update baseline intentionally via --write-baseline.");
    process.exit(1);
  }

  console.log(
    currentCount === baselineCount
      ? "Design-system lint count unchanged from baseline."
      : `Design-system lint count improved by ${baselineCount - currentCount}.`,
  );
}

main();
