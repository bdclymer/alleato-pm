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
      content.includes("experimental_onStepStart") &&
      content.includes("preparedStepCount") &&
      content.includes('toolChoice: { type: "tool", toolName: "semanticSearch" }') &&
      content.includes("What I could confirm"),
  },
  {
    file: files.route,
    description: "chat route uses deterministic executive briefing retrieval without slow optional synthesis",
    test: (content) =>
      content.includes("generateSourceGroundedSynthesis") &&
      content.includes('model: getLanguageModel("openai/gpt-4.1")') &&
      content.includes("sourceGroundedSynthesisFallback") &&
      content.includes("createDeterministicProjectBriefing") &&
      content.includes("ExecutiveBriefingRetrievalPacket") &&
      content.includes("formatExecutiveBriefingRetrievalContext") &&
      content.includes("formatExecutiveRecentSignals") &&
      content.includes("searchMeetingsByTopic") &&
      content.includes("searchTeamsMessages") &&
      content.includes("searchEmails") &&
      content.includes("searchExternalDocuments") &&
      content.includes("Recent Communication Signals") &&
      content.includes("Sources Checked") &&
      !content.includes("source-grounded synthesis exceeded the fast briefing budget") &&
      !content.includes("reason: \"deterministic broad briefing path\"") &&
      content.includes("const hasDeterministicRetrieval") &&
      content.includes("const modelTools = hasDeterministicRetrieval") &&
      content.includes("tools: modelTools") &&
      content.includes("availableToolNames"),
  },
  {
    file: files.route,
    description: "chat route streams live AI SDK status data before long retrieval work",
    test: (content) =>
      content.includes("writeStrategistStatus") &&
      content.includes('type: "data-status"') &&
      content.includes("Reading conversation memory and project context") &&
      content.includes("Pulling budget, contract, RFIs, submittals, schedule, and commitments") &&
      content.includes("Searching meetings, documents, and vectorized project history") &&
      content.includes("Checking recent meetings, Teams, email, and OneDrive sources"),
  },
  {
    file: files.route,
    description: "chat route injects canonical project briefing snapshot for broad PM updates",
    test: (content) =>
      content.includes("formatProjectBriefingSnapshotContext") &&
      content.includes("enforceProjectBriefingResponseContract") &&
      content.includes("projectBriefingResponseContract") &&
      content.includes("getProjectBriefingSnapshot") &&
      content.includes("projectBriefingSnapshot") &&
      content.includes("createDeterministicActionBriefing") &&
      content.includes("createDeterministicSourceQualityAnswer") &&
      content.includes("shouldUseActionFollowUpResponse") &&
      content.includes("shouldUseSourceQualityFollowUpResponse") &&
      content.includes("extractPriorProjectName") &&
      content.includes("!actionFollowUpResponse && !sourceQualityFollowUpResponse") &&
      content.includes("Hard Facts") &&
      content.includes("What Changed") &&
      content.includes("Recent Communication Signals") &&
      content.includes("Sources Checked") &&
      content.includes("Insider Analysis") &&
      content.includes("Recommended Actions") &&
      content.includes("Next Step"),
  },
  {
    file: files.strategist,
    description: "strategist prompt enforces natural strategic responses and project briefing structure",
    test: (content) =>
      content.includes("Conversation Quality Contract") &&
      content.includes("Broad Project Update Contract") &&
      content.includes("Hard Facts") &&
      content.includes("always end with a concrete next step") &&
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
    description: "project tools return structured retrieval errors and canonical briefing snapshot",
    test: (content) =>
      content.includes("This data source failed during retrieval") &&
      content.includes("getProjectBriefingSnapshot") &&
      content.includes("recommendedQuestions") &&
      content.includes("alwaysEndWithForwardMotion") &&
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
