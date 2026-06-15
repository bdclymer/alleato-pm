#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const explicitFiles = process.argv.slice(2);

function changedFiles() {
  try {
    const output = execFileSync(
      "git",
      ["diff", "--name-only", "HEAD", "--", "frontend/src/app"],
      { encoding: "utf8" },
    );
    return output.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

const files = (explicitFiles.length > 0 ? explicitFiles : changedFiles())
  .filter((file) => file.endsWith("/page.tsx"))
  .filter((file) => file.includes("/["))
  .filter((file) => !file.includes("/new/page.tsx"))
  .filter((file) => !file.includes("/edit/page.tsx"))
  .filter((file) => existsSync(file));

const bannedPatterns = [
  {
    pattern: /<PageShell\b[^>]*variant=["']dashboard["']/,
    message:
      "record detail pages must use a detail PageShell variant, not dashboard",
  },
  {
    pattern: /<Tabs(?:List|Trigger|Content)\b/,
    message:
      "record detail pages must use PageTabs instead of raw TabsList/TabsTrigger/TabsContent",
  },
  {
    pattern: /rounded-md\s+border\s+border-border\s+bg-muted\s+p-6/,
    message:
      "record detail summary panels must use DetailPanel instead of page-local rounded/border/bg-muted shells",
  },
];

const failures = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  if (!source.includes("<PageShell")) continue;

  for (const rule of bannedPatterns) {
    if (rule.pattern.test(source)) {
      failures.push(`${file}: ${rule.message}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Detail page primitive guardrail failed:\n");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

const scanned = files.map((file) => path.relative(process.cwd(), file));
console.log(
  `Detail page primitive guardrail passed${
    scanned.length ? ` for ${scanned.length} file(s)` : ""
  }.`,
);
