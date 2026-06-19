import type { ToolSet } from "ai";
import type {
  EvidenceRef,
  ToolDefinition,
  ToolPolicy,
} from "@/lib/ai-ops/contracts";

export type AssistantToolCategory =
  | "source_adapter"
  | "generation"
  | "artifact"
  | "delivery"
  | "project"
  | "financial"
  | "operational"
  | "memory"
  | "document"
  | "workflow";

export type AssistantToolCapability =
  | "read"
  | "write"
  | "delivery"
  | "source"
  | "generate"
  | "persist";

export type AssistantToolRegistryEntry = ToolDefinition & {
  owner: string;
  category: AssistantToolCategory;
  capabilities: AssistantToolCapability[];
  workflows: string[];
  actorModes: ToolPolicy["actorMode"][];
  sourceFamilies?: EvidenceRef["sourceFamily"][];
  allowedChannels?: Array<"teams" | "email">;
  requiresProjectScope: boolean;
  requiresWritePermission: boolean;
  requiresDeliveryPermission: boolean;
  evidencePolicy: {
    sourceBearing: boolean;
    requiresSourceRefs: boolean;
    ledgerRequired: boolean;
  };
  factory: {
    modulePath: string;
    exportName: string;
  } | null;
};

export type AssistantToolRegistryValidation = {
  ok: boolean;
  duplicateNames: string[];
  missingPolicyMetadata: string[];
};

export type RegisteredToolSetInput = {
  tools: ToolSet;
  workflowId: string;
  factoryModulePath: string;
  allowedToolNames?: readonly string[];
  policy?: {
    actorMode?: ToolPolicy["actorMode"];
    allowWrites?: boolean;
    allowDelivery?: boolean;
    allowedChannels?: Array<"teams" | "email">;
  };
  registry?: AssistantToolRegistryEntry[];
};

export type AssistantToolVisibility = {
  visibleToolNames: string[];
  hiddenTools: Array<{
    name: string;
    reason: string;
  }>;
};

function uniqueValues<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

export function assertUniqueAssistantToolNames(
  entries: AssistantToolRegistryEntry[],
): void {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const entry of entries) {
    if (seen.has(entry.name)) duplicates.add(entry.name);
    seen.add(entry.name);
  }

  if (duplicates.size > 0) {
    throw new Error(
      `Duplicate AI assistant tool registry names: ${Array.from(duplicates).join(", ")}`,
    );
  }
}

export function validateAssistantToolRegistry(
  entries: AssistantToolRegistryEntry[],
): AssistantToolRegistryValidation {
  const seen = new Set<string>();
  const duplicateNames = new Set<string>();
  const missingPolicyMetadata: string[] = [];

  for (const entry of entries) {
    if (seen.has(entry.name)) duplicateNames.add(entry.name);
    seen.add(entry.name);

    if (entry.capabilities.length === 0) {
      missingPolicyMetadata.push(`${entry.name}: capabilities`);
    }
    if (entry.workflows.length === 0) {
      missingPolicyMetadata.push(`${entry.name}: workflows`);
    }
    if (entry.actorModes.length === 0) {
      missingPolicyMetadata.push(`${entry.name}: actorModes`);
    }
    if (
      entry.evidencePolicy.sourceBearing &&
      (!entry.sourceFamilies || entry.sourceFamilies.length === 0)
    ) {
      missingPolicyMetadata.push(`${entry.name}: sourceFamilies`);
    }
    if (
      entry.requiresDeliveryPermission &&
      (!entry.allowedChannels || entry.allowedChannels.length === 0)
    ) {
      missingPolicyMetadata.push(`${entry.name}: allowedChannels`);
    }
  }

  return {
    ok: duplicateNames.size === 0 && missingPolicyMetadata.length === 0,
    duplicateNames: Array.from(duplicateNames),
    missingPolicyMetadata,
  };
}

export function assertValidAssistantToolRegistry(
  entries: AssistantToolRegistryEntry[],
): void {
  const validation = validateAssistantToolRegistry(entries);
  if (validation.ok) return;

  const details = [
    ...validation.duplicateNames.map((name) => `duplicate name ${name}`),
    ...validation.missingPolicyMetadata.map((item) => `missing ${item}`),
  ];
  throw new Error(`Invalid AI assistant tool registry: ${details.join("; ")}`);
}

export function assistantToolsForWorkflow(input: {
  registry?: AssistantToolRegistryEntry[];
  workflowId: string;
  allowedToolNames?: readonly string[];
}): AssistantToolRegistryEntry[] {
  const registry = input.registry ?? GLOBAL_ASSISTANT_TOOL_REGISTRY;
  assertValidAssistantToolRegistry(registry);

  const allowedNames = input.allowedToolNames
    ? new Set(input.allowedToolNames)
    : null;

  return registry.filter((entry) => {
    if (!entry.workflows.includes(input.workflowId)) return false;
    if (allowedNames && !allowedNames.has(entry.name)) return false;
    return true;
  });
}

export function toolDefinitionsForWorkflow(input: {
  registry?: AssistantToolRegistryEntry[];
  workflowId: string;
  allowedToolNames?: readonly string[];
}): ToolDefinition[] {
  return assistantToolsForWorkflow(input).map(toToolDefinition);
}

export function filterRegisteredToolSet(input: RegisteredToolSetInput): ToolSet {
  const registry = input.registry ?? GLOBAL_ASSISTANT_TOOL_REGISTRY;
  const factoryEntries = assistantToolsForWorkflow({
    registry,
    workflowId: input.workflowId,
    allowedToolNames: input.allowedToolNames,
  }).filter((entry) => entry.factory?.modulePath === input.factoryModulePath);

  const registeredNames = new Set(factoryEntries.map((entry) => entry.name));
  const toolNames = Object.keys(input.tools);
  const visibility = toolVisibilityForEntries(factoryEntries, input.policy);
  const visibleNames = new Set(visibility.visibleToolNames);
  const missingTools = visibility.visibleToolNames.filter(
    (name) => !input.tools[name],
  );
  const unregisteredTools = toolNames.filter((name) => !registeredNames.has(name));

  if (missingTools.length > 0 || unregisteredTools.length > 0) {
    const details = [
      missingTools.length
        ? `missing factory tools: ${missingTools.join(", ")}`
        : null,
      unregisteredTools.length
        ? `unregistered factory tools: ${unregisteredTools.join(", ")}`
        : null,
    ].filter(Boolean);

    throw new Error(
      `Invalid AI assistant tool factory registration for ${input.factoryModulePath}: ${details.join("; ")}`,
    );
  }

  return Object.fromEntries(
    toolNames
      .filter((name) => visibleNames.has(name))
      .map((name) => [name, input.tools[name]]),
  ) as ToolSet;
}

export function toolVisibilityForFactory(
  input: Omit<RegisteredToolSetInput, "tools">,
): AssistantToolVisibility {
  const registry = input.registry ?? GLOBAL_ASSISTANT_TOOL_REGISTRY;
  const factoryEntries = assistantToolsForWorkflow({
    registry,
    workflowId: input.workflowId,
    allowedToolNames: input.allowedToolNames,
  }).filter((entry) => entry.factory?.modulePath === input.factoryModulePath);

  return toolVisibilityForEntries(factoryEntries, input.policy);
}

export function toolVisibilityForEntries(
  entries: AssistantToolRegistryEntry[],
  policy: RegisteredToolSetInput["policy"] = {},
): AssistantToolVisibility {
  const allowedChannels = new Set(policy.allowedChannels ?? []);
  const hiddenTools: AssistantToolVisibility["hiddenTools"] = [];
  const visibleToolNames: string[] = [];

  for (const entry of entries) {
    const hiddenReason = hiddenReasonForEntry(entry, policy, allowedChannels);
    if (hiddenReason) {
      hiddenTools.push({ name: entry.name, reason: hiddenReason });
    } else {
      visibleToolNames.push(entry.name);
    }
  }

  return { visibleToolNames, hiddenTools };
}

function hiddenReasonForEntry(
  entry: AssistantToolRegistryEntry,
  policy: RegisteredToolSetInput["policy"],
  allowedChannels: Set<"teams" | "email">,
): string | null {
  if (policy?.actorMode && !entry.actorModes.includes(policy.actorMode)) {
    return `actor_mode_denied:${policy.actorMode}`;
  }
  if (entry.requiresWritePermission && !policy?.allowWrites) {
    return "write_permission_denied";
  }
  if (entry.requiresDeliveryPermission && !policy?.allowDelivery) {
    return "delivery_permission_denied";
  }
  if (
    entry.requiresDeliveryPermission &&
    allowedChannels.size > 0 &&
    (entry.allowedChannels ?? []).every((channel) => !allowedChannels.has(channel))
  ) {
    return "delivery_channel_denied";
  }
  return null;
}

export function toToolDefinition(
  entry: AssistantToolRegistryEntry,
): ToolDefinition {
  return {
    name: entry.name,
    description: entry.description,
    owningAdapter: entry.owningAdapter,
    inputSchemaName: entry.inputSchemaName,
    outputSchemaName: entry.outputSchemaName,
    failureShape: entry.failureShape,
    metadata: {
      ...entry.metadata,
      owner: entry.owner,
      category: entry.category,
      capabilities: entry.capabilities,
      workflows: entry.workflows,
      actorModes: entry.actorModes,
      sourceFamilies: entry.sourceFamilies ?? [],
      allowedChannels: entry.allowedChannels ?? [],
      requiresProjectScope: entry.requiresProjectScope,
      requiresWritePermission: entry.requiresWritePermission,
      requiresDeliveryPermission: entry.requiresDeliveryPermission,
      evidencePolicy: entry.evidencePolicy,
      factory: entry.factory,
    },
  };
}

const EXECUTIVE_DAILY_BRIEF_WORKFLOW_ID = "executive_daily_brief";
export const AI_ASSISTANT_CHAT_WORKFLOW_ID = "ai_assistant_chat";
const EXECUTIVE_DAILY_BRIEF_ACTOR_MODES: ToolPolicy["actorMode"][] = [
  "service",
  "user_delegated",
];
const AI_ASSISTANT_CHAT_ACTOR_MODES: ToolPolicy["actorMode"][] = [
  "user_delegated",
];

function executiveDailyBriefTool(
  entry: Omit<
    AssistantToolRegistryEntry,
    "workflows" | "actorModes" | "owner" | "factory"
  > & {
    factory?: AssistantToolRegistryEntry["factory"];
  },
): AssistantToolRegistryEntry {
  return {
    ...entry,
    owner: "executive_daily_brief",
    workflows: [EXECUTIVE_DAILY_BRIEF_WORKFLOW_ID],
    actorModes: EXECUTIVE_DAILY_BRIEF_ACTOR_MODES,
    factory: entry.factory ?? null,
    sourceFamilies: entry.sourceFamilies
      ? uniqueValues(entry.sourceFamilies)
      : undefined,
    allowedChannels: entry.allowedChannels
      ? uniqueValues(entry.allowedChannels)
      : undefined,
  };
}

function assistantChatTool(
  entry: Omit<
    AssistantToolRegistryEntry,
    "workflows" | "actorModes" | "factory" | "failureShape" | "metadata"
  > & {
    factory: NonNullable<AssistantToolRegistryEntry["factory"]>;
    failureShape?: AssistantToolRegistryEntry["failureShape"];
    metadata?: AssistantToolRegistryEntry["metadata"];
  },
): AssistantToolRegistryEntry {
  return {
    ...entry,
    workflows: [AI_ASSISTANT_CHAT_WORKFLOW_ID],
    actorModes: AI_ASSISTANT_CHAT_ACTOR_MODES,
    failureShape: entry.failureShape ?? "result_error",
    metadata: {
      runtimeFactory: true,
      ...entry.metadata,
    },
    sourceFamilies: entry.sourceFamilies
      ? uniqueValues(entry.sourceFamilies)
      : undefined,
    allowedChannels: entry.allowedChannels
      ? uniqueValues(entry.allowedChannels)
      : undefined,
  };
}

const PROJECT_TOOL_FACTORY = {
  modulePath: "frontend/src/lib/ai/tools/project-tools.ts",
  exportName: "createProjectTools",
} as const;

const ACTION_TOOL_FACTORY = {
  modulePath: "frontend/src/lib/ai/tools/action-tools.ts",
  exportName: "createActionTools",
} as const;

const factory = (modulePath: string, exportName: string) =>
  ({ modulePath, exportName }) as const;

function factoryToolEntries(input: {
  names: readonly string[];
  factory: NonNullable<AssistantToolRegistryEntry["factory"]>;
  owner?: string;
  owningAdapter: string;
  category: AssistantToolCategory;
  capabilities?: AssistantToolCapability[];
  sourceFamilies?: EvidenceRef["sourceFamily"][];
  writeToolNames?: ReadonlySet<string>;
  deliveryToolNames?: ReadonlySet<string>;
  allowedChannels?: Array<"teams" | "email">;
  requiresProjectScope?: boolean;
  sourceBearing?: boolean;
  ledgerRequired?: boolean;
}): AssistantToolRegistryEntry[] {
  return input.names.map((name) => {
    const isWrite = input.writeToolNames?.has(name) ?? false;
    const isDelivery = input.deliveryToolNames?.has(name) ?? false;
    return assistantChatTool({
      name,
      description: `Assistant tool exposed by ${input.factory.exportName}: ${name}.`,
      owningAdapter: input.owningAdapter,
      inputSchemaName: `${name}.input`,
      outputSchemaName: `${name}.output`,
      owner: input.owner ?? "ai_assistant",
      category: isDelivery ? "delivery" : input.category,
      capabilities:
        input.capabilities ??
        (isDelivery ? ["write", "delivery"] : isWrite ? ["write"] : ["read"]),
      sourceFamilies:
        input.sourceFamilies ??
        (isDelivery ? ["delivery"] : ["procore", "project_intelligence"]),
      allowedChannels: isDelivery ? input.allowedChannels : undefined,
      requiresProjectScope: input.requiresProjectScope ?? false,
      requiresWritePermission: isWrite || isDelivery,
      requiresDeliveryPermission: isDelivery,
      evidencePolicy: {
        sourceBearing: input.sourceBearing ?? !isWrite,
        requiresSourceRefs: false,
        ledgerRequired: input.ledgerRequired ?? (isWrite || isDelivery),
      },
      factory: input.factory,
    });
  });
}

function assistantReadToolCategory(name: string): AssistantToolCategory {
  const normalized = name.toLowerCase();
  if (normalized.includes("document") || normalized.includes("spec")) return "document";
  if (normalized.includes("memory") || normalized.includes("knowledge")) return "memory";
  if (
    normalized.includes("cost") ||
    normalized.includes("budget") ||
    normalized.includes("margin") ||
    normalized.includes("cash") ||
    normalized.includes("aging") ||
    normalized.includes("bill") ||
    normalized.includes("invoice") ||
    normalized.includes("purchaseorder") ||
    normalized.includes("spend")
  ) {
    return "financial";
  }
  return "project";
}

function assistantReadSourceFamilies(
  name: string,
): EvidenceRef["sourceFamily"][] {
  const normalized = name.toLowerCase();
  if (normalized.includes("email") || normalized.includes("outlook")) {
    return ["outlook", "email"];
  }
  if (normalized.includes("teams")) return ["teams"];
  if (
    normalized.includes("document") ||
    normalized.includes("semantic") ||
    normalized.includes("search")
  ) {
    return ["document", "rag"];
  }
  if (
    normalized.includes("acumatica") ||
    normalized.includes("aging") ||
    normalized.includes("cash") ||
    normalized.includes("bill") ||
    normalized.includes("invoice") ||
    normalized.includes("purchaseorder") ||
    normalized.includes("spend")
  ) {
    return ["acumatica"];
  }
  if (normalized.includes("meeting")) return ["meeting", "fireflies"];
  return ["procore", "project_intelligence", "insight_card"];
}

const projectToolNames = [
  "getCommitmentsOverview",
  "getChangeOrderDetails",
  "getDirectCostsSummary",
  "getBudgetLineItems",
  "getCostTrends",
  "getMarginAnalysis",
  "getAPAgingReport",
  "getARAgingReport",
  "getCashPositionReport",
  "getVendorSpendReport",
  "getRecentBills",
  "getRecentInvoices",
  "getAcumaticaProjectBudget",
  "getAcumaticaProjectList",
  "getPurchaseOrderSummary",
  "getPeopleAndRoles",
  "getVendorPerformance",
  "getRFIStatus",
  "getSubmittalStatus",
  "getCrossProjectComparison",
  "getHistoricalTrends",
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
  "getRecentEmails",
  "searchEmails",
  "searchTeamsMessages",
  "searchExternalDocuments",
  "getScheduleAnalysis",
  "searchAppHelp",
  "getForecastComparison",
  "getOutlookOperationsStatus",
  "getOutlookCalendarEvents",
  "getSopBacklog",
  "getFinanceSpendRollup",
  "getMeetingIntelligence",
  "getProjectBriefingSnapshot",
  "getPortfolioOverview",
  "getProjectsWithRisks",
  "getProjectRiskAnalysis",
  "getFinancialAnalysis",
  "getProjectBudgetSummary",
  "getActionItemsAndInsights",
  "getMeetingsByDate",
  "findProjectDocuments",
  "searchDocuments",
  "getProjectDetails",
] as const;

const projectAssistantTools: AssistantToolRegistryEntry[] = projectToolNames.map(
  (name) =>
    assistantChatTool({
      name,
      description: `Core project read tool exposed by createProjectTools: ${name}.`,
      owningAdapter: "project_tools",
      inputSchemaName: `${name}.input`,
      outputSchemaName: `${name}.output`,
      owner: "ai_assistant",
      category: assistantReadToolCategory(name),
      capabilities:
        name === "saveToKnowledgeBase" ||
        name === "saveInsight" ||
        name === "writeMemory"
          ? ["read", "write"]
          : ["read"],
      sourceFamilies: assistantReadSourceFamilies(name),
      requiresProjectScope: false,
      requiresWritePermission:
        name === "saveToKnowledgeBase" ||
        name === "saveInsight" ||
        name === "writeMemory",
      requiresDeliveryPermission: false,
      evidencePolicy: {
        sourceBearing: true,
        requiresSourceRefs: false,
        ledgerRequired:
          name === "saveToKnowledgeBase" ||
          name === "saveInsight" ||
          name === "writeMemory",
      },
      factory: PROJECT_TOOL_FACTORY,
    }),
);

const actionToolNames = [
  "createChangeOrder",
  "createChangeEvent",
  "updateProjectStatus",
  "createRFI",
  "createTask",
  "createGeneratedTask",
  "createProjectCompany",
  "createProjectContact",
  "createContact",
  "updateGeneratedTask",
  "deleteGeneratedTask",
  "flagProjectRisk",
  "updateRFIStatus",
  "createMeetingNote",
  "createSubmittal",
  "logDailyReport",
  "generateProjectSummary",
  "createInitiativeCard",
  "createCommitment",
  "submitFeedback",
  "addBoardItem",
  "createOutlookCalendarInvite",
  "draftOutlookEmail",
  "sendTeamsMessage",
] as const;

const deliveryActionTools = new Set([
  "createOutlookCalendarInvite",
  "draftOutlookEmail",
  "sendTeamsMessage",
]);

const nonProjectScopedActionTools = new Set([
  "createContact",
  "submitFeedback",
  "addBoardItem",
  "draftOutlookEmail",
  "sendTeamsMessage",
]);

const actionAssistantTools: AssistantToolRegistryEntry[] = actionToolNames.map(
  (name) => {
    const isDelivery = deliveryActionTools.has(name);
    return assistantChatTool({
      name,
      description: `Assistant write or delivery tool exposed by createActionTools: ${name}.`,
      owningAdapter: "action_tools",
      inputSchemaName: `${name}.input`,
      outputSchemaName: `${name}.output`,
      owner: "ai_assistant",
      category: isDelivery ? "delivery" : "workflow",
      capabilities: isDelivery ? ["write", "delivery"] : ["write"],
      sourceFamilies: isDelivery ? ["outlook", "email", "teams", "delivery"] : ["procore", "system"],
      allowedChannels: isDelivery ? ["email", "teams"] : undefined,
      requiresProjectScope: !nonProjectScopedActionTools.has(name),
      requiresWritePermission: true,
      requiresDeliveryPermission: isDelivery,
      evidencePolicy: {
        sourceBearing: false,
        requiresSourceRefs: false,
        ledgerRequired: true,
      },
      factory: ACTION_TOOL_FACTORY,
    });
  },
);

const webSearchAssistantTools = factoryToolEntries({
  names: ["searchWeb", "researchCompany", "searchConstructionMarket"],
  factory: factory("frontend/src/lib/ai/tools/web-search.ts", "createWebSearchTools"),
  owningAdapter: "web_search_tools",
  category: "operational",
  sourceFamilies: ["system"],
  requiresProjectScope: false,
});

const structuredOutputAssistantTools = factoryToolEntries({
  names: ["extractStructuredActionBrief"],
  factory: factory(
    "frontend/src/lib/ai/tools/structured-output.ts",
    "createStructuredOutputTools",
  ),
  owningAdapter: "structured_output_tools",
  category: "generation",
  sourceFamilies: ["system"],
  sourceBearing: false,
});

const featureRequestWriteTools = new Set([
  "captureFeatureRequestPacket",
  "updateFeatureRequestPacket",
  "generateImplementationPlan",
  "generateClaudeCodeHandoff",
  "draftLinearIssueFromFeatureRequest",
  "draftLinearSubIssuesFromImplementationPlan",
  "attachLinearIssueToFeatureRequest",
  "attachLinearSubIssueToFeatureRequest",
  "recordLinearStatusUpdateForFeatureRequest",
]);

const featureRequestAssistantTools = factoryToolEntries({
  names: [
    "findRelatedFeatureRequests",
    "captureFeatureRequestPacket",
    "updateFeatureRequestPacket",
    "scoreFeatureRequestReadiness",
    "generateImplementationPlan",
    "generateClaudeCodeHandoff",
    "draftLinearIssueFromFeatureRequest",
    "draftLinearSubIssuesFromImplementationPlan",
    "attachLinearIssueToFeatureRequest",
    "attachLinearSubIssueToFeatureRequest",
    "recordLinearStatusUpdateForFeatureRequest",
  ],
  factory: factory(
    "frontend/src/lib/ai/tools/feature-request-tools.ts",
    "createFeatureRequestTools",
  ),
  owningAdapter: "feature_request_tools",
  category: "workflow",
  sourceFamilies: ["system"],
  writeToolNames: featureRequestWriteTools,
  sourceBearing: false,
});

const progressReportWriteTools = new Set([
  "createWeeklyProgressReportDraft",
  "updateProgressReportSections",
  "selectProgressReportPhotos",
  "generateProgressReportPdf",
]);

const progressReportAssistantTools = factoryToolEntries({
  names: [
    "createWeeklyProgressReportDraft",
    "updateProgressReportSections",
    "listProgressReportPhotos",
    "selectProgressReportPhotos",
    "generateProgressReportPdf",
  ],
  factory: factory(
    "frontend/src/lib/ai/tools/progress-report-tools.ts",
    "createProgressReportTools",
  ),
  owningAdapter: "progress_report_tools",
  category: "workflow",
  sourceFamilies: ["procore", "document"],
  writeToolNames: progressReportWriteTools,
  requiresProjectScope: true,
});

const workspaceAssistantTools = factoryToolEntries({
  names: [
    "listWorkspaceArtifacts",
    "getDraftArtifact",
    "saveWorkspaceArtifact",
    "promoteWorkspaceArtifact",
  ],
  factory: factory(
    "frontend/src/lib/ai/tools/workspace-tools.ts",
    "createWorkspaceTools",
  ),
  owningAdapter: "workspace_tools",
  category: "workflow",
  sourceFamilies: ["system"],
  writeToolNames: new Set(["saveWorkspaceArtifact", "promoteWorkspaceArtifact"]),
  sourceBearing: false,
});

const documentIntelligenceAssistantTools = factoryToolEntries({
  names: [
    "getSubmittalLog",
    "getSpecRequirements",
    "detectMissingSubmittals",
    "logFeedback",
    "reviewDocument",
  ],
  factory: factory(
    "frontend/src/lib/ai/tools/document-intelligence.ts",
    "createDocumentIntelligenceTools",
  ),
  owningAdapter: "document_intelligence_tools",
  category: "document",
  sourceFamilies: ["document", "rag", "procore"],
  writeToolNames: new Set(["logFeedback", "reviewDocument"]),
});

const intelligenceAssistantTools = factoryToolEntries({
  names: ["listDomainIntelligence", "getDomainIntelligence"],
  factory: factory(
    "frontend/src/lib/ai/tools/intelligence-tools.ts",
    "createIntelligenceTools",
  ),
  owningAdapter: "intelligence_tools",
  category: "operational",
  sourceFamilies: ["project_intelligence", "insight_card"],
});

const executiveBriefAssistantTools = factoryToolEntries({
  names: ["generateExecutiveDailyBrief"],
  factory: factory(
    "frontend/src/lib/ai/tools/executive-brief-tools.ts",
    "createExecutiveBriefTools",
  ),
  owningAdapter: "executive_brief_tools",
  category: "generation",
  sourceFamilies: ["daily_recap", "project_intelligence", "document", "acumatica"],
  writeToolNames: new Set(["generateExecutiveDailyBrief"]),
});

const marketingWriteTools = new Set([
  "createMarketingIntelligenceItem",
  "createMarketingIntelligenceFromCandidate",
  "createContentCalendarDraft",
  "createMarketingContentAsset",
]);

const marketingAssistantTools = factoryToolEntries({
  names: [
    "findMarketingSourceCandidates",
    "createMarketingIntelligenceItem",
    "createMarketingIntelligenceFromCandidate",
    "createContentCalendarDraft",
    "createMarketingContentAsset",
    "getMarketingCalendar",
  ],
  factory: factory("frontend/src/lib/ai/tools/marketing.ts", "createMarketingTools"),
  owningAdapter: "marketing_tools",
  category: "workflow",
  sourceFamilies: ["document", "project_intelligence", "system"],
  writeToolNames: marketingWriteTools,
});

export const GLOBAL_ASSISTANT_TOOL_REGISTRY: AssistantToolRegistryEntry[] = [
  ...projectAssistantTools,
  ...actionAssistantTools,
  ...webSearchAssistantTools,
  ...structuredOutputAssistantTools,
  ...featureRequestAssistantTools,
  ...progressReportAssistantTools,
  ...workspaceAssistantTools,
  ...documentIntelligenceAssistantTools,
  ...intelligenceAssistantTools,
  ...executiveBriefAssistantTools,
  ...marketingAssistantTools,
  executiveDailyBriefTool({
    name: "fetch-fireflies-meeting-sources",
    description:
      "Fireflies meeting adapter returns normalized source records and source health snapshots.",
    owningAdapter: "fireflies_meetings",
    inputSchemaName: "fireflies_meetings.input",
    outputSchemaName: "fireflies_meetings.normalizedSourcesOutput",
    failureShape: "status_payload",
    category: "source_adapter",
    capabilities: ["read", "source"],
    sourceFamilies: ["fireflies", "meeting"],
    requiresProjectScope: false,
    requiresWritePermission: false,
    requiresDeliveryPermission: false,
    evidencePolicy: {
      sourceBearing: true,
      requiresSourceRefs: true,
      ledgerRequired: true,
    },
    metadata: {
      requiredForExecutiveBrief: true,
      supportedHealthStates: [
        "loaded",
        "stale",
        "missing",
        "degraded",
        "failed",
        "skipped",
      ],
    },
  }),
  executiveDailyBriefTool({
    name: "fetch-outlook-email-sources",
    description:
      "Outlook email adapter returns normalized source records and source health snapshots.",
    owningAdapter: "outlook_email",
    inputSchemaName: "outlook_email.input",
    outputSchemaName: "outlook_email.normalizedSourcesOutput",
    failureShape: "status_payload",
    category: "source_adapter",
    capabilities: ["read", "source"],
    sourceFamilies: ["outlook", "email"],
    requiresProjectScope: false,
    requiresWritePermission: false,
    requiresDeliveryPermission: false,
    evidencePolicy: {
      sourceBearing: true,
      requiresSourceRefs: true,
      ledgerRequired: true,
    },
    metadata: {
      requiredForExecutiveBrief: true,
      supportedHealthStates: [
        "loaded",
        "stale",
        "missing",
        "degraded",
        "failed",
        "skipped",
      ],
    },
  }),
  executiveDailyBriefTool({
    name: "fetch-teams-message-sources",
    description:
      "Teams message adapter returns normalized source records and source health snapshots.",
    owningAdapter: "teams_messages",
    inputSchemaName: "teams_messages.input",
    outputSchemaName: "teams_messages.normalizedSourcesOutput",
    failureShape: "status_payload",
    category: "source_adapter",
    capabilities: ["read", "source"],
    sourceFamilies: ["teams"],
    requiresProjectScope: false,
    requiresWritePermission: false,
    requiresDeliveryPermission: false,
    evidencePolicy: {
      sourceBearing: true,
      requiresSourceRefs: true,
      ledgerRequired: true,
    },
    metadata: {
      requiredForExecutiveBrief: true,
      supportedHealthStates: [
        "loaded",
        "stale",
        "missing",
        "degraded",
        "failed",
        "skipped",
      ],
    },
  }),
  executiveDailyBriefTool({
    name: "fetch-document-rag-sources",
    description:
      "Documents/RAG adapter returns normalized source records and source health snapshots.",
    owningAdapter: "documents_rag",
    inputSchemaName: "documents_rag.input",
    outputSchemaName: "documents_rag.normalizedSourcesOutput",
    failureShape: "status_payload",
    category: "source_adapter",
    capabilities: ["read", "source"],
    sourceFamilies: ["document", "rag"],
    requiresProjectScope: false,
    requiresWritePermission: false,
    requiresDeliveryPermission: false,
    evidencePolicy: {
      sourceBearing: true,
      requiresSourceRefs: true,
      ledgerRequired: true,
    },
    metadata: {
      requiredForExecutiveBrief: true,
      supportedHealthStates: [
        "loaded",
        "stale",
        "missing",
        "degraded",
        "failed",
        "skipped",
      ],
    },
  }),
  executiveDailyBriefTool({
    name: "fetch-acumatica-financial-sources",
    description:
      "Acumatica financial adapter returns normalized source records and source health snapshots.",
    owningAdapter: "acumatica_financials",
    inputSchemaName: "acumatica_financials.input",
    outputSchemaName: "acumatica_financials.normalizedSourcesOutput",
    failureShape: "status_payload",
    category: "source_adapter",
    capabilities: ["read", "source"],
    sourceFamilies: ["acumatica"],
    requiresProjectScope: false,
    requiresWritePermission: false,
    requiresDeliveryPermission: false,
    evidencePolicy: {
      sourceBearing: true,
      requiresSourceRefs: true,
      ledgerRequired: true,
    },
    metadata: {
      requiredForExecutiveBrief: true,
      supportedHealthStates: [
        "loaded",
        "stale",
        "missing",
        "degraded",
        "failed",
        "skipped",
      ],
    },
  }),
  executiveDailyBriefTool({
    name: "fetch-procore-project-sources",
    description:
      "Procore/project data adapter returns normalized source records and source health snapshots.",
    owningAdapter: "procore_project_data",
    inputSchemaName: "procore_project_data.input",
    outputSchemaName: "procore_project_data.normalizedSourcesOutput",
    failureShape: "status_payload",
    category: "source_adapter",
    capabilities: ["read", "source"],
    sourceFamilies: ["procore"],
    requiresProjectScope: false,
    requiresWritePermission: false,
    requiresDeliveryPermission: false,
    evidencePolicy: {
      sourceBearing: true,
      requiresSourceRefs: true,
      ledgerRequired: true,
    },
    metadata: {
      requiredForExecutiveBrief: false,
      supportedHealthStates: [
        "loaded",
        "stale",
        "missing",
        "degraded",
        "failed",
        "skipped",
      ],
    },
  }),
  executiveDailyBriefTool({
    name: "fetch-project-intelligence-sources",
    description:
      "Project Intelligence packet adapter returns normalized source records and source health snapshots.",
    owningAdapter: "project_intelligence_packets",
    inputSchemaName: "project_intelligence_packets.input",
    outputSchemaName: "project_intelligence_packets.normalizedSourcesOutput",
    failureShape: "status_payload",
    category: "source_adapter",
    capabilities: ["read", "source"],
    sourceFamilies: [
      "project_intelligence",
      "intelligence_packet",
      "insight_card",
    ],
    requiresProjectScope: false,
    requiresWritePermission: false,
    requiresDeliveryPermission: false,
    evidencePolicy: {
      sourceBearing: true,
      requiresSourceRefs: true,
      ledgerRequired: true,
    },
    metadata: {
      requiredForExecutiveBrief: true,
      supportedHealthStates: [
        "loaded",
        "stale",
        "missing",
        "degraded",
        "failed",
        "skipped",
      ],
    },
  }),
  executiveDailyBriefTool({
    name: "generate-executive-daily-brief-packet",
    description:
      "Synthesize a source-backed Executive Daily Brief packet from normalized adapter records.",
    owningAdapter: "executive_daily_brief_workflow",
    inputSchemaName: "GenerateExecutiveDailyBriefPacketInput",
    outputSchemaName: "ExecutiveDailyBriefPacket",
    failureShape: "throws",
    category: "generation",
    capabilities: ["generate", "source"],
    sourceFamilies: [
      "fireflies",
      "meeting",
      "outlook",
      "email",
      "teams",
      "document",
      "rag",
      "acumatica",
      "project_intelligence",
      "intelligence_packet",
      "insight_card",
    ],
    requiresProjectScope: false,
    requiresWritePermission: false,
    requiresDeliveryPermission: false,
    evidencePolicy: {
      sourceBearing: true,
      requiresSourceRefs: true,
      ledgerRequired: true,
    },
    metadata: {},
    factory: {
      modulePath: "@/lib/ai/tools/executive-brief-tools",
      exportName: "createExecutiveBriefTools",
    },
  }),
  executiveDailyBriefTool({
    name: "persist-executive-daily-brief-artifact",
    description:
      "Persist the generated packet and expose it as an AI work-run artifact.",
    owningAdapter: "ai_ops_artifacts",
    inputSchemaName: "PersistExecutiveDailyBriefArtifactInput",
    outputSchemaName: "AiArtifact",
    failureShape: "throws",
    category: "artifact",
    capabilities: ["write", "persist"],
    requiresProjectScope: false,
    requiresWritePermission: true,
    requiresDeliveryPermission: false,
    evidencePolicy: {
      sourceBearing: false,
      requiresSourceRefs: true,
      ledgerRequired: true,
    },
    metadata: {},
  }),
  executiveDailyBriefTool({
    name: "build-teams-daily-brief-payload",
    description:
      "Build a no-send or sendable Teams payload from an Executive Daily Brief packet.",
    owningAdapter: "teams_delivery",
    inputSchemaName: "BuildTeamsDailyBriefPayloadInput",
    outputSchemaName: "TeamsDailyBriefPayload",
    failureShape: "result_error",
    category: "delivery",
    capabilities: ["read", "delivery"],
    allowedChannels: ["teams"],
    requiresProjectScope: false,
    requiresWritePermission: false,
    requiresDeliveryPermission: false,
    evidencePolicy: {
      sourceBearing: false,
      requiresSourceRefs: true,
      ledgerRequired: true,
    },
    metadata: { channel: "teams", deliveryTool: false },
  }),
  executiveDailyBriefTool({
    name: "send-teams-daily-brief",
    description:
      "Send a Teams Executive Daily Brief payload and record provider/recipient outcome.",
    owningAdapter: "teams_delivery",
    inputSchemaName: "SendTeamsDailyBriefInput",
    outputSchemaName: "DeliveryAttempt",
    failureShape: "result_error",
    category: "delivery",
    capabilities: ["write", "delivery"],
    allowedChannels: ["teams"],
    requiresProjectScope: false,
    requiresWritePermission: true,
    requiresDeliveryPermission: true,
    evidencePolicy: {
      sourceBearing: false,
      requiresSourceRefs: false,
      ledgerRequired: true,
    },
    metadata: { channel: "teams", deliveryTool: true },
  }),
  executiveDailyBriefTool({
    name: "build-email-daily-brief-payload",
    description:
      "Build a no-send or sendable email payload from an Executive Daily Brief packet.",
    owningAdapter: "email_delivery",
    inputSchemaName: "BuildEmailDailyBriefPayloadInput",
    outputSchemaName: "EmailDailyBriefPayload",
    failureShape: "result_error",
    category: "delivery",
    capabilities: ["read", "delivery"],
    allowedChannels: ["email"],
    requiresProjectScope: false,
    requiresWritePermission: false,
    requiresDeliveryPermission: false,
    evidencePolicy: {
      sourceBearing: false,
      requiresSourceRefs: true,
      ledgerRequired: true,
    },
    metadata: { channel: "email", deliveryTool: false },
  }),
  executiveDailyBriefTool({
    name: "send-email-daily-brief",
    description:
      "Send an email Executive Daily Brief payload and record provider/recipient outcome.",
    owningAdapter: "email_delivery",
    inputSchemaName: "SendEmailDailyBriefInput",
    outputSchemaName: "DeliveryAttempt",
    failureShape: "result_error",
    category: "delivery",
    capabilities: ["write", "delivery"],
    allowedChannels: ["email"],
    requiresProjectScope: false,
    requiresWritePermission: true,
    requiresDeliveryPermission: true,
    evidencePolicy: {
      sourceBearing: false,
      requiresSourceRefs: false,
      ledgerRequired: true,
    },
    metadata: { channel: "email", deliveryTool: true },
  }),
];

assertValidAssistantToolRegistry(GLOBAL_ASSISTANT_TOOL_REGISTRY);
