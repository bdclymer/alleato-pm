#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..", "..");

const files = {
  route: "frontend/src/app/api/ai-assistant/chat/route.ts",
  strategist: "frontend/src/lib/ai/agents/strategist.ts",
  botCore: "frontend/src/lib/ai/bot-core.ts",
  projectTools: "frontend/src/lib/ai/tools/project-tools.ts",
  financialTools: "frontend/src/lib/ai/tools/financial.ts",
  operationalTools: "frontend/src/lib/ai/tools/operational.ts",
};

function read(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

const checks = [
  {
    file: files.route,
    description: "chat route streams explicit strategist failure responses",
    test: (content) =>
      content.includes("createStrategistFailureResponse") &&
      content.includes("createUIMessageStream") &&
      content.includes("strategist-failure-response") &&
      content.includes("generateRecoveryResponse") &&
      content.includes("buildBusinessContextPreflight") &&
      content.includes("serverBusinessContextPreflight") &&
      content.includes("shouldForceBusinessRetrieval") &&
      content.includes('toolChoice: "required"') &&
      content.includes("What I could confirm"),
  },
  {
    file: files.strategist,
    description: "strategist prompt bans robotic fallback behavior",
    test: (content) =>
      content.includes("Conversation Quality Contract") &&
      content.includes("Do not use robotic fallback phrases") &&
      content.includes("If product data is missing"),
  },
  {
    file: files.botCore,
    description: "prompt assembly surfaces context health instead of silent failures",
    test: (content) =>
      content.includes("Runtime Context Health") &&
      content.includes("Memory and learning context could not be loaded") &&
      content.includes("Pinned project context could not be loaded"),
  },
  {
    file: files.projectTools,
    description: "project tools return structured retrieval errors",
    test: (content) =>
      content.includes("This data source failed during retrieval") &&
      !content.includes("throw error;\n    }\n  };\n}\n\nexport function createProjectTools"),
  },
  {
    file: files.financialTools,
    description: "financial tools return structured retrieval errors",
    test: (content) =>
      content.includes("This financial data source failed during retrieval") &&
      !content.includes("throw error;\n    }\n  };\n}\n\n// ---------------------------------------------------------------------------\n// Helpers"),
  },
  {
    file: files.operationalTools,
    description: "operational tools return structured retrieval errors",
    test: (content) =>
      content.includes("This operational knowledge source failed during retrieval") &&
      !content.includes("throw error;\n    }\n  };\n}\n\n// ---------------------------------------------------------------------------\n// Helpers"),
  },
];

const failures = [];

for (const check of checks) {
  const content = read(check.file);
  if (!check.test(content)) {
    failures.push(`${check.file}: ${check.description}`);
  }
}

if (failures.length > 0) {
  console.error("AI assistant response contract verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("AI assistant response contract verification passed.");
