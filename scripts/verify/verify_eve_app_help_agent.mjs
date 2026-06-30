#!/usr/bin/env node

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const articlesDir = path.join(
  repoRoot,
  "backend/src/services/agents/app_expert/runtime/help/articles",
);

const requiredFiles = [
  "agent/instructions.md",
  "agent/tools/search_app_help.ts",
  "agent/tools/bash.ts",
  "agent/tools/write_file.ts",
  "agent/tools/web_fetch.ts",
  "agent/tools/web_search.ts",
  "agent/tools/agent.ts",
];

const failures = [];

for (const file of requiredFiles) {
  if (!existsSync(path.join(repoRoot, file))) {
    failures.push(`Missing required Eve app-help file: ${file}`);
  }
}

const instructions = await readFile(path.join(repoRoot, "agent/instructions.md"), "utf8");
for (const phrase of ["Alleato App Expert", "search_app_help", "read-only", "Do not claim"]) {
  if (!instructions.includes(phrase)) {
    failures.push(`agent/instructions.md must include "${phrase}".`);
  }
}

if (!existsSync(articlesDir)) {
  failures.push(`App help article directory is missing: ${articlesDir}`);
} else {
  const { searchHelpArticles } = await import("../../agent/lib/app-help-articles.ts");
  const changeEvents = await searchHelpArticles("change events pricing workflow", 3);
  const permissions = await searchHelpArticles("permissions visibility user access", 3);

  if (!changeEvents.some((result) => result.slug === "change-events")) {
    failures.push("Expected app-help search to return the change-events article.");
  }

  if (!permissions.some((result) => result.slug.includes("permissions"))) {
    failures.push("Expected app-help search to return a permissions article.");
  }

  for (const result of [...changeEvents, ...permissions]) {
    if (!result.sourcePath || !result.excerpt) {
      failures.push(`Search result ${result.slug} is missing sourcePath or excerpt.`);
    }
  }
}

if (failures.length > 0) {
  console.error("Eve app help agent verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Eve app help agent verification passed.");
