#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..", "..");
const route = readFileSync(
  resolve(repoRoot, "frontend/src/app/api/ai-assistant/chat/route.ts"),
  "utf8",
);
const chatHandler = readFileSync(
  resolve(repoRoot, "frontend/src/lib/ai/chat-handler.ts"),
  "utf8",
);
const detector = readFileSync(
  resolve(repoRoot, "frontend/src/lib/ai/detect-rag-request.ts"),
  "utf8",
);
const sourceSpecificRag = readFileSync(
  resolve(repoRoot, "frontend/src/lib/ai/retrieval/source-specific-rag.ts"),
  "utf8",
);
const contractSource = `${route}\n${chatHandler}\n${detector}\n${sourceSpecificRag}`;

const requiredRouteFragments = [
  "detectSourceSpecificRagRequest",
  "parseExplicitDateRange",
  "sourceSpecificRagRequest",
  "sourceLookupRecentTeamsRequest",
  "detectSourceLookupRecentTeamsRequest",
  "buildSourceSpecificRagAnswer",
  "sourceSpecificRagRetrieval",
  "strategist-source-specific-rag",
  "groupTeamsRows",
  "conversation/day bucket",
  "teams rag",
  "using only teams",
  "chat/thread",
  "thread titles",
  "recent_teams_discussions",
  "Recent Teams Window",
  "sourceLookupRecentTeamsKind",
  "gte(\"date\", `${request.startDate}T00:00:00.000Z`)",
  "lte(\"date\", `${request.endDate}T23:59:59.999Z`)",
  ".eq(\"category\", \"teams_message\")",
  ".eq(\"source\", \"microsoft_graph\")",
];

const failures = requiredRouteFragments
  .filter((fragment) => !contractSource.includes(fragment))
  .map((fragment) => `chat implementation missing source-specific RAG contract fragment: ${fragment}`);

const aprilRangePattern =
  /april/i.test(contractSource) &&
  /may/i.test(contractSource) &&
  /june/i.test(contractSource) &&
  /through\|to\|until/.test(contractSource) &&
  /20\\d\{2\}/.test(contractSource);

if (!aprilRangePattern) {
  failures.push("chat route does not parse natural-language month date ranges for source-specific RAG prompts");
}

const sourceSpecificIndex = chatHandler.indexOf("sourceSpecificRagRequest &&");
const sourceLookupIndex = chatHandler.indexOf(
  "if (assistantIntent === \"source_lookup\")",
  Math.max(sourceSpecificIndex, 0),
);
const streamTextIndex = chatHandler.indexOf("result = streamText", Math.max(sourceSpecificIndex, 0));
const sourceSpecificBeforeModelTools =
  sourceSpecificIndex > -1 &&
  sourceLookupIndex > -1 &&
  streamTextIndex > -1 &&
  sourceSpecificIndex < sourceLookupIndex &&
  sourceSpecificIndex < streamTextIndex;

if (!sourceSpecificBeforeModelTools) {
  failures.push("source-specific RAG must run before source lookup fallback and streamText synthesis");
}

if (failures.length > 0) {
  console.error("AI source-specific RAG contract verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("AI source-specific RAG contract verification passed.");
