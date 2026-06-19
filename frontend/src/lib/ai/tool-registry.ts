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
const EXECUTIVE_DAILY_BRIEF_ACTOR_MODES: ToolPolicy["actorMode"][] = [
  "service",
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

export const GLOBAL_ASSISTANT_TOOL_REGISTRY: AssistantToolRegistryEntry[] = [
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
