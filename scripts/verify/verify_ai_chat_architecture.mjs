#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..", "..");
const requireFromFrontend = createRequire(resolve(repoRoot, "frontend/package.json"));

const files = {
  route: "frontend/src/app/api/ai-assistant/chat/route.ts",
  chatHandler: "frontend/src/app/api/ai-assistant/chat/handler-v2.ts",
  client: "frontend/src/components/ai-assistant/rag-chat-page.tsx",
  orchestrator: "frontend/src/lib/ai/orchestrator.ts",
  providers: "frontend/src/lib/ai/providers.ts",
  projectTools: "frontend/src/lib/ai/tools/project-tools.ts",
  operationalTools: "frontend/src/lib/ai/tools/operational.ts",
  scheduleTools: "frontend/src/lib/ai/tools/schedule-tools.ts",
  forecastTools: "frontend/src/lib/ai/tools/forecast-tools.ts",
  structuredQueryTools: "frontend/src/lib/ai/tools/structured-queries.ts",
  financialTools: "frontend/src/lib/ai/tools/financial.ts",
  acumaticaTools: "frontend/src/lib/ai/tools/acumatica.ts",
  actionTools: "frontend/src/lib/ai/tools/action-tools.ts",
  mcpTools: "frontend/src/lib/ai/tools/mcp-tools.ts",
  architectureDoc: "docs/architecture/AI-DATA-PIPELINE-RAG-PRODUCTION-ARCHITECTURE.md",
  providerConfig: "frontend/src/lib/ai/provider-config.ts",
  webTools: "frontend/src/lib/ai/tools/web-search.ts",
  backendApiDoc: "backend/API.md",
  backendRequirements: "backend/requirements.txt",
};

const removedLegacyPaths = [
  "backend/src/api/server.py",
  "backend/src/services/alleato_agent_workflow",
  "backend/src/services/memory_store.py",
  "backend/src/scripts/rag_chatkit_server.py",
  "backend/src/scripts/rag_chatkit_server_streaming.py",
  "backend/src/scripts/rag_chatkit_server_unified.py",
  "backend/tests/test_rag_chatkit.py",
  "frontend/src/app/(chat)/chat-admin-view",
  "frontend/src/app/(chat)/chat-demo",
  "frontend/src/app/(chat)/chat-rag",
  "frontend/src/app/(chat)/chat-tool",
  "frontend/src/app/(chat)/rag",
  "frontend/src/app/(chat)/simple-chat",
  "frontend/src/app/api/rag-chat",
  "frontend/src/app/api/rag-chatkit",
  "frontend/src/app/api/tool-calling",
  "frontend/src/app/api/primitives/tool-calling",
  "frontend/src/components/chat/ChatKit.tsx",
  "frontend/src/components/chat/ChatKitWidget.tsx",
  "frontend/src/components/chat/rag-chatkit-panel.tsx",
  "frontend/src/components/chat/simple-rag-chat.tsx",
  "frontend/src/components/chat/ai-chat-widget.tsx",
  "frontend/src/components/misc/chatkit-panel.tsx",
  "frontend/src/hooks/useChatKit.ts",
  "frontend/src/lib/chatkit-config.ts",
  "frontend/src/lib/rag-chatkit",
  "frontend/src/lib/rag-api.ts",
  "frontend/src/types/chatkit.d.ts",
];

const forbiddenLegacyTokens = [
  "@openai/chatkit",
  "CHATKIT_API_URL",
  "alleato_agent_workflow",
  "rag_chatkit_server",
  "/rag-chatkit",
  "/api/rag-chatkit",
  "/api/rag-chat",
  "useChatKit",
  "ChatKitWidget",
  "rag-chatkit-panel",
  "simple-rag-chat",
  "ai-chat-widget",
];

const expected = {
  agents: ["cfo", "coo", "cro", "chro", "vpbd"],
  consultTools: ["consultCFO", "consultCOO", "consultCRO", "consultCHRO", "consultVPBD"],
  projectTools: [
    "getProjectBriefingSnapshot",
    "getPortfolioOverview",
    "getProjectsWithRisks",
    "getProjectRiskAnalysis",
    "getFinancialAnalysis",
    "getProjectBudgetSummary",
    "getActionItemsAndInsights",
    "getMeetingsByDate",
    "searchDocuments",
    "getProjectDetails",
  ],
  operationalTools: [
    "getScheduleAnalysis",
    "getPeopleAndRoles",
    "getVendorPerformance",
    "getRFIStatus",
    "getSubmittalStatus",
    "getCrossProjectComparison",
    "getHistoricalTrends",
    "getForecastComparison",
    "semanticSearch",
    "getCompanyKnowledge",
    "recallPastConversations",
    "searchMeetingsByTopic",
    "getMeetingDetails",
    "saveToKnowledgeBase",
    "saveInsight",
    "searchMemories",
    "writeMemory",
    "findProject",
    "searchEmails",
    "searchTeamsMessages",
    "searchExternalDocuments",
    "queryBudgetData",
    "queryChangeOrders",
    "queryCommitments",
    "queryDirectCosts",
    "queryScheduleTasks",
    "queryDocumentRows",
  ],
  financialTools: [
    "getCommitmentsOverview",
    "getChangeOrderDetails",
    "getDirectCostsSummary",
    "getBudgetLineItems",
    "getCostTrends",
    "getMarginAnalysis",
  ],
  acumaticaTools: [
    "getAPAgingReport",
    "getARAgingReport",
    "getCashPositionReport",
    "getVendorSpendReport",
    "getRecentBills",
    "getRecentInvoices",
    "getAcumaticaProjectBudget",
    "getAcumaticaProjectList",
    "getPurchaseOrderSummary",
  ],
  actionTools: [
    "createChangeOrder",
    "createChangeEvent",
    "updateProjectStatus",
    "createRFI",
    "createTask",
    "flagProjectRisk",
    "updateRFIStatus",
    "createMeetingNote",
    "createSubmittal",
    "logDailyReport",
    "generateProjectSummary",
    "createInitiativeCard",
    "createCommitment",
  ],
  webTools: ["searchWeb", "researchCompany", "searchConstructionMarket"],
};

function read(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

function readIfExists(relativePath) {
  const file = resolve(repoRoot, relativePath);
  return existsSync(file) ? readFileSync(file, "utf8") : "";
}

function packageJson(relativePath) {
  return JSON.parse(readFileSync(resolve(repoRoot, relativePath), "utf8"));
}

function extractToolNames(relativePath) {
  const content = read(relativePath);
  const names = new Set();
  const re = /\n\s*([A-Za-z0-9_]+)\s*:\s*tool\s*\(/g;
  let match;
  while ((match = re.exec(content))) {
    names.add(match[1]);
  }
  return [...names].sort();
}

function extractStrategistConsultToolNames() {
  const names = new Set(extractToolNames(files.orchestrator).filter((name) => name.startsWith("consult")));
  const re = /\n\s*(consult[A-Za-z0-9_]+)\s*:\s*makeConsultTool\s*\(/g;
  let match;
  while ((match = re.exec(orchestrator))) {
    names.add(match[1]);
  }
  return [...names].sort();
}

function missing(expectedNames, actualNames) {
  const actual = new Set(actualNames);
  return expectedNames.filter((name) => !actual.has(name));
}

function hasPackage(pkg, name) {
  return Boolean(pkg.dependencies?.[name] || pkg.devDependencies?.[name]);
}

function assertNoForbiddenTokens(relativePath, content) {
  for (const token of forbiddenLegacyTokens) {
    requireCondition(!content.includes(token), `${relativePath} contains removed legacy token: ${token}`);
  }
}

const frontendPackage = packageJson("frontend/package.json");
const route = read(files.route);
const chatHandler = read(files.chatHandler);
const routeImplementation = `${route}\n${chatHandler}`;
const client = read(files.client);
const orchestrator = read(files.orchestrator);
const providers = read(files.providers);
const providerConfig = read(files.providerConfig);
const actionTools = read(files.actionTools);
const mcpTools = readIfExists(files.mcpTools);
const operationalTools = read(files.operationalTools);
const architectureDoc = read(files.architectureDoc);

const inventory = {
  packageVersions: {
    ai: requireFromFrontend("ai/package.json").version,
    "@ai-sdk/react": frontendPackage.dependencies?.["@ai-sdk/react"] ?? null,
    "@ai-sdk/openai": frontendPackage.dependencies?.["@ai-sdk/openai"] ?? null,
    "@ai-sdk/mcp": frontendPackage.dependencies?.["@ai-sdk/mcp"] ?? null,
  },
  tools: {
    consult: extractStrategistConsultToolNames(),
    project: extractToolNames(files.projectTools),
    operational: [
      ...new Set([
        ...extractToolNames(files.operationalTools),
        ...extractToolNames(files.scheduleTools),
        ...extractToolNames(files.forecastTools),
        ...extractToolNames(files.structuredQueryTools),
      ]),
    ].sort(),
    financial: extractToolNames(files.financialTools),
    acumatica: extractToolNames(files.acumaticaTools),
    action: extractToolNames(files.actionTools),
    web: extractToolNames(files.webTools),
  },
};

const failures = [];
const warnings = [];

function requireCondition(condition, message) {
  if (!condition) failures.push(message);
}

function warnCondition(condition, message) {
  if (!condition) warnings.push(message);
}

requireCondition(hasPackage(frontendPackage, "ai"), "frontend/package.json must include ai");
requireCondition(hasPackage(frontendPackage, "@ai-sdk/react"), "frontend/package.json must include @ai-sdk/react");
requireCondition(hasPackage(frontendPackage, "@ai-sdk/openai"), "frontend/package.json must include @ai-sdk/openai");
requireCondition(!hasPackage(frontendPackage, "@openai/chatkit"), "frontend/package.json must not include removed @openai/chatkit");
requireCondition(!hasPackage(frontendPackage, "@openai/chatkit-react"), "frontend/package.json must not include removed @openai/chatkit-react");

for (const legacyPath of removedLegacyPaths) {
  requireCondition(!existsSync(resolve(repoRoot, legacyPath)), `removed legacy AI chat path still exists: ${legacyPath}`);
}

for (const [label, relativePath] of Object.entries(files)) {
  assertNoForbiddenTokens(relativePath, readIfExists(relativePath));
}

requireCondition(routeImplementation.includes("createUIMessageStream"), "chat route must use createUIMessageStream");
requireCondition(routeImplementation.includes("createUIMessageStreamResponse"), "chat route must use createUIMessageStreamResponse");
requireCondition(routeImplementation.includes("streamText"), "chat route must use streamText");
requireCondition(routeImplementation.includes("data-status"), "chat route must stream data-status progress parts");
requireCondition(routeImplementation.includes("tool_trace"), "chat route must persist tool trace");
requireCondition(routeImplementation.includes("response_quality"), "chat route must persist response quality metadata");
requireCondition(routeImplementation.includes("scoreResponseQuality"), "chat route must compute response quality metadata");
requireCondition(routeImplementation.includes("planRetrieval"), "chat route must plan retrieval before synthesis");
requireCondition(routeImplementation.includes("executeRetrievalPlan"), "chat route must execute planned retrieval before local synthesis");
requireCondition(
  routeImplementation.includes("executive_deep_agent_broad_operator_question") &&
    routeImplementation.includes("directDeepAgent:") &&
    routeImplementation.includes("render-backend-deep-agents-v1"),
  "chat route must check and persist backend Deep Agents executive/operator bridge trace",
);

requireCondition(client.includes("useChat"), "client must use useChat");
requireCondition(client.includes("DefaultChatTransport"), "client must use DefaultChatTransport");
requireCondition(client.includes("prepareSendMessagesRequest"), "client must prepare request body per AI SDK v6");
requireCondition(client.includes("stripStatusParts"), "client must strip non-history status parts before resending messages");
requireCondition(client.includes("onData"), "client must consume streamed data-status parts");

requireCondition(providers.includes("createOpenAI"), "providers must use @ai-sdk/openai createOpenAI");
requireCondition(
  providerConfig.includes("https://ai-gateway.vercel.sh/v1"),
  "providers must route through AI Gateway when configured",
);
requireCondition(providers.includes("openai.chat"), "providers must use chat-completions path for tool calling");

for (const [bucket, expectedNames] of Object.entries({
  consult: expected.consultTools,
  project: expected.projectTools,
  operational: expected.operationalTools,
  financial: expected.financialTools,
  acumatica: expected.acumaticaTools,
  action: expected.actionTools,
  web: expected.webTools,
})) {
  const absent = missing(expectedNames, inventory.tools[bucket]);
  requireCondition(absent.length === 0, `${bucket} tool inventory missing: ${absent.join(", ")}`);
}

for (const agent of expected.agents) {
  requireCondition(orchestrator.includes(`${agent}: {`), `agent registry missing ${agent}`);
}

const hasLiveAiSdkMcp =
  hasPackage(frontendPackage, "@ai-sdk/mcp") &&
  routeImplementation.includes("await createAiAssistantMcpTools()") &&
  routeImplementation.includes("Object.assign(tools, mcpToolBundle.tools)") &&
  routeImplementation.includes("toolTrace.push(...mcpToolBundle.trace)") &&
  routeImplementation.includes("mcpToolBundle.close()") &&
  mcpTools.includes("createMCPClient") &&
  mcpTools.includes("EXCALIDRAW_MCP_ALLOWED_TOOLS") &&
  mcpTools.includes("AI_ASSISTANT_DISABLE_EXCALIDRAW_MCP") &&
  mcpTools.includes("AI_ASSISTANT_DISABLE_SUPABASE_MCP") &&
  mcpTools.includes("isReadOnlyMcpTool");
warnCondition(
  !hasPackage(frontendPackage, "@ai-sdk/mcp") || hasLiveAiSdkMcp,
  "live /ai-assistant has @ai-sdk/mcp installed but does not discover, merge, trace, and close AI SDK MCP tools",
);

const usesToolLoopAgent =
  routeImplementation.includes("ToolLoopAgent") || orchestrator.includes("ToolLoopAgent");
warnCondition(usesToolLoopAgent, "live agents should use AI SDK ToolLoopAgent when the repo migrates to first-class AI SDK agents");

const writeToolsMergedIntoStrategist =
  orchestrator.includes("const actionTools = createActionTools") ||
  orchestrator.includes("...actionTools");
requireCondition(!writeToolsMergedIntoStrategist, "write/action tools are exposed in the default Strategist tool set");

const hasFirstClassApproval =
  routeImplementation.includes("addToolOutput") ||
  client.includes("addToolOutput") ||
  routeImplementation.includes("approval") ||
  client.includes("approval") ||
  actionTools.includes("needsApproval: needsConfirmedWriteApproval");
requireCondition(hasFirstClassApproval, "write tools do not use a first-class client approval flow");

const hasSourceHealth =
  routeImplementation.includes("sourceHealth") ||
  routeImplementation.includes("buildSourceHealth") ||
  routeImplementation.includes("verifyMicrosoft") ||
  routeImplementation.includes("graph_sync_state") ||
  operationalTools.includes("graph_sync_state") ||
  operationalTools.includes("assistantSourceHealth");
requireCondition(hasSourceHealth, "chat route does not inject source-health status for Microsoft/Acumatica/meeting systems");

warnCondition(
  architectureDoc.includes("frontend/src/lib/ai/tools/mcp-tools.ts") &&
    architectureDoc.includes("@ai-sdk/mcp") &&
    architectureDoc.includes("createMCPClient") &&
    architectureDoc.includes("chat_history.metadata.tool_trace"),
  "authoritative AI/RAG architecture doc should identify the current live AI SDK MCP implementation",
);
warnCondition(
  !operationalTools.includes("throw err;"),
  "web/operational tool errors should return structured degraded-state data where possible",
);
warnCondition(
  actionTools.includes("ai_tool_write_audits") && actionTools.includes("idempotencyKey"),
  "action tools should keep audit + idempotency controls",
);

const report = {
  status: failures.length === 0 ? "pass" : "fail",
  checkedAt: new Date().toISOString(),
  inventory,
  failures,
  warnings,
};

console.log(JSON.stringify(report, null, 2));

if (failures.length > 0) {
  process.exit(1);
}
