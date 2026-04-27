#!/usr/bin/env node

/**
 * Microsoft Graph embedding contract.
 *
 * Teams and email syncs feed the AI assistant through document_metadata and
 * document_chunks. This guardrail prevents the Graph path from silently
 * degrading to direct OpenAI only or writing unembedded chunks after provider
 * failure.
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const embedPath = path.join(
  root,
  "backend/src/services/integrations/microsoft_graph/embed.py"
);
const source = fs.readFileSync(embedPath, "utf8");

const failures = [];

function requireContains(needle, message) {
  if (!source.includes(needle)) {
    failures.push(message);
  }
}

function requireNotContains(needle, message) {
  if (source.includes(needle)) {
    failures.push(message);
  }
}

requireContains("AI_GATEWAY_API_KEY", "Graph embeddings must support AI_GATEWAY_API_KEY.");
requireContains("https://ai-gateway.vercel.sh/v1", "Graph embeddings must use the Vercel AI Gateway base URL.");
requireContains('"model_prefix": "openai/"', "AI Gateway Graph embeddings must prefix OpenAI model names.");
requireContains("OPENAI_API_KEY", "Graph embeddings should retain direct OpenAI fallback.");
requireContains("Graph embedding failed across all providers", "Graph embeddings must fail loudly when every provider fails.");
requireContains("len(embedding) != EMBEDDING_DIMENSIONS", "Graph embeddings must validate vector dimensions before writes.");
requireContains('"source_type": source_type', "Graph chunks must write source_type so Teams/email retrieval can filter correctly.");
requireContains('category == "teams_message"', "Graph chunks must classify Teams chunks as teams_message.");
requireContains('category == "email"', "Graph chunks must classify email chunks as email.");
requireContains('"onedrive_document"', "Graph chunks must preserve the existing OneDrive source_type name.");
requireNotContains("return [[] for _ in texts]", "Graph embeddings must not return empty vectors after provider failure.");

if (failures.length > 0) {
  console.error("Graph embedding contract: FAIL");
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log("Graph embedding contract: PASS");
