#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const appRoot = path.join(repoRoot, "frontend", "src", "app");
const forbidden = [
  {
    pattern: /\bregenerateExecutiveBriefingDraft\b/,
    message:
      "App routes/actions must regenerate the Executive Daily Brief through regenerateDailyBriefDraftWithLedger so every generated draft has an ai_work_runs record.",
  },
];

function listFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__") return [];
      return listFiles(fullPath);
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) return [];
    return [fullPath];
  });
}

const failures = [];

for (const file of listFiles(appRoot)) {
  const source = fs.readFileSync(file, "utf8");
  for (const rule of forbidden) {
    if (rule.pattern.test(source)) {
      failures.push({
        file: path.relative(repoRoot, file),
        message: rule.message,
      });
    }
  }
}

if (failures.length > 0) {
  console.error("Executive Daily Brief gateway guardrail failed:");
  for (const failure of failures) {
    console.error(`- ${failure.file}: ${failure.message}`);
  }
  process.exit(1);
}

console.log("Executive Daily Brief gateway guardrail passed.");
