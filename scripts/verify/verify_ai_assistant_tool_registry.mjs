#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const requiredFiles = [
  "frontend/src/lib/ai/tool-registry.ts",
  "frontend/src/lib/ai/__tests__/tool-registry.test.ts",
  "frontend/src/lib/ai-ops/tool-registry.ts",
  "frontend/src/lib/ai-ops/__tests__/workflow-pack.test.ts",
];

const failures = [];

for (const file of requiredFiles) {
  const absolutePath = path.join(repoRoot, file);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${file}: required registry file is missing`);
  }
}

const executiveRegistryPath = path.join(
  repoRoot,
  "frontend/src/lib/ai-ops/tool-registry.ts",
);

if (fs.existsSync(executiveRegistryPath)) {
  const source = fs.readFileSync(executiveRegistryPath, "utf8");
  if (!source.includes('from "@/lib/ai/tool-registry"')) {
    failures.push(
      "frontend/src/lib/ai-ops/tool-registry.ts: Executive Daily Brief registry must import the global assistant registry",
    );
  }
  if (source.includes("WORKFLOW_TOOL_DEFINITIONS")) {
    failures.push(
      "frontend/src/lib/ai-ops/tool-registry.ts: workflow-local tool definition arrays are forbidden; use the global assistant registry",
    );
  }
  if (source.includes("sourceAdapterToolDefinitions")) {
    failures.push(
      "frontend/src/lib/ai-ops/tool-registry.ts: source adapter tool definitions must come through the global assistant registry",
    );
  }
}

const globalRegistryPath = path.join(
  repoRoot,
  "frontend/src/lib/ai/tool-registry.ts",
);

if (fs.existsSync(globalRegistryPath)) {
  const source = fs.readFileSync(globalRegistryPath, "utf8");
  for (const requiredExport of [
    "GLOBAL_ASSISTANT_TOOL_REGISTRY",
    "validateAssistantToolRegistry",
    "assistantToolsForWorkflow",
    "toolDefinitionsForWorkflow",
  ]) {
    if (!source.includes(requiredExport)) {
      failures.push(
        `frontend/src/lib/ai/tool-registry.ts: missing ${requiredExport}`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error("AI assistant tool registry guardrail failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("AI assistant tool registry guardrail passed.");
