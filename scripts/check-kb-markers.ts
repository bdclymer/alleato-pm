#!/usr/bin/env tsx
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const kbPath = path.join(repoRoot, "docs/archive/2026-06-22-docs-migration/ai-plan/AI_KNOWLEDGE_BASE.md");
const content = fs.readFileSync(kbPath, "utf8");
const chunks = content
  .split(/^### /m)
  .slice(1)
  .map((chunk) => `### ${chunk.trim()}`)
  .filter(Boolean);

if (chunks.length === 0) {
  console.error("AI_KNOWLEDGE_BASE.md has no ### retrievable chunks.");
  process.exit(1);
}

const markerMatches = [...content.matchAll(/\[(?:FILL|CHECK|VERIFY(?::[^\]]+)?)\]/g)];
const branch = process.env.VERCEL_GIT_COMMIT_REF || process.env.GITHUB_REF_NAME || "";
const productionBranch = branch === "main" || branch === "production";

console.log(`KB chunks: ${chunks.length}`);
console.log(`Unresolved markers: ${markerMatches.length}`);

if (productionBranch && markerMatches.length > 0) {
  console.error("Unresolved KB markers block production deploys.");
  process.exit(1);
}
