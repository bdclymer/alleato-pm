import type { ToolDefinition, ToolPolicy } from "./contracts";
import {
  EXECUTIVE_DAILY_BRIEF_ALLOWED_TOOLS,
  EXECUTIVE_DAILY_BRIEF_WORKFLOW,
  EXECUTIVE_DAILY_BRIEF_WORKFLOW_ID,
} from "./executive-daily-brief-workflow";
import { sourceAdapterToolDefinitions } from "./source-adapters";

const WORKFLOW_TOOL_DEFINITIONS: ToolDefinition[] = [
  ...sourceAdapterToolDefinitions(),
  {
    name: "generate-executive-daily-brief-packet",
    description:
      "Synthesize a source-backed Executive Daily Brief packet from normalized adapter records.",
    owningAdapter: "executive_daily_brief_workflow",
    inputSchemaName: "GenerateExecutiveDailyBriefPacketInput",
    outputSchemaName: "ExecutiveDailyBriefPacket",
    failureShape: "throws",
  },
  {
    name: "persist-executive-daily-brief-artifact",
    description:
      "Persist the generated packet and expose it as an AI work-run artifact.",
    owningAdapter: "ai_ops_artifacts",
    inputSchemaName: "PersistExecutiveDailyBriefArtifactInput",
    outputSchemaName: "AiArtifact",
    failureShape: "throws",
  },
  {
    name: "build-teams-daily-brief-payload",
    description:
      "Build a no-send or sendable Teams payload from an Executive Daily Brief packet.",
    owningAdapter: "teams_delivery",
    inputSchemaName: "BuildTeamsDailyBriefPayloadInput",
    outputSchemaName: "TeamsDailyBriefPayload",
    failureShape: "result_error",
    metadata: { channel: "teams", deliveryTool: false },
  },
  {
    name: "send-teams-daily-brief",
    description:
      "Send a Teams Executive Daily Brief payload and record provider/recipient outcome.",
    owningAdapter: "teams_delivery",
    inputSchemaName: "SendTeamsDailyBriefInput",
    outputSchemaName: "DeliveryAttempt",
    failureShape: "result_error",
    metadata: { channel: "teams", deliveryTool: true },
  },
  {
    name: "build-email-daily-brief-payload",
    description:
      "Build a no-send or sendable email payload from an Executive Daily Brief packet.",
    owningAdapter: "email_delivery",
    inputSchemaName: "BuildEmailDailyBriefPayloadInput",
    outputSchemaName: "EmailDailyBriefPayload",
    failureShape: "result_error",
    metadata: { channel: "email", deliveryTool: false },
  },
  {
    name: "send-email-daily-brief",
    description:
      "Send an email Executive Daily Brief payload and record provider/recipient outcome.",
    owningAdapter: "email_delivery",
    inputSchemaName: "SendEmailDailyBriefInput",
    outputSchemaName: "DeliveryAttempt",
    failureShape: "result_error",
    metadata: { channel: "email", deliveryTool: true },
  },
];

export const EXECUTIVE_DAILY_BRIEF_TOOL_REGISTRY =
  WORKFLOW_TOOL_DEFINITIONS.filter((tool) =>
    EXECUTIVE_DAILY_BRIEF_ALLOWED_TOOLS.includes(
      tool.name as (typeof EXECUTIVE_DAILY_BRIEF_ALLOWED_TOOLS)[number],
    ),
  );

export function createExecutiveDailyBriefToolPolicy(input: {
  actorMode?: ToolPolicy["actorMode"];
  allowDelivery: boolean;
  allowWrites: boolean;
  allowedProjectIds?: number[] | null;
  allowedSourceFamilies?: ToolPolicy["allowedSourceFamilies"];
  allowedChannels?: Array<"teams" | "email">;
}): ToolPolicy {
  const allowedChannels =
    input.allowedChannels ??
    EXECUTIVE_DAILY_BRIEF_WORKFLOW.deliveryPolicy.allowedChannels;
  const requiredSourceFamilies =
    EXECUTIVE_DAILY_BRIEF_WORKFLOW.sourcePolicy.requiredSourceFamilies;
  const allowedSourceFamilies = input.allowedSourceFamilies
    ? requiredSourceFamilies.filter((sourceFamily) =>
        input.allowedSourceFamilies?.includes(sourceFamily),
      )
    : requiredSourceFamilies;

  if (allowedSourceFamilies.length === 0) {
    throw new Error(
      "Executive Daily Brief tool policy must allow at least one workflow source family.",
    );
  }

  return {
    workflowId: EXECUTIVE_DAILY_BRIEF_WORKFLOW_ID,
    allowedToolNames: EXECUTIVE_DAILY_BRIEF_TOOL_REGISTRY.map(
      (toolDefinition) => toolDefinition.name,
    ),
    actorMode: input.actorMode ?? "service",
    allowedProjectIds: input.allowedProjectIds ?? null,
    allowedSourceFamilies,
    allowDelivery: input.allowDelivery,
    allowWrites: input.allowWrites,
    metadata: {
      allowedChannels,
      workflowVersion: EXECUTIVE_DAILY_BRIEF_WORKFLOW.version,
    },
  };
}

export function visibleToolsForPolicy(
  registry: ToolDefinition[],
  policy: ToolPolicy,
) {
  const allowedNames = new Set(policy.allowedToolNames);
  const allowedChannels = new Set(
    Array.isArray(policy.metadata.allowedChannels)
      ? policy.metadata.allowedChannels
      : [],
  );

  return registry.filter((toolDefinition) => {
    if (!allowedNames.has(toolDefinition.name)) return false;
    const metadata = toolDefinition.metadata ?? {};
    const sourceFamilies = Array.isArray(metadata.sourceFamilies)
      ? metadata.sourceFamilies.filter(
          (sourceFamily): sourceFamily is ToolPolicy["allowedSourceFamilies"][number] =>
            typeof sourceFamily === "string",
        )
      : [];
    if (
      sourceFamilies.length > 0 &&
      !sourceFamilies.some((sourceFamily) =>
        policy.allowedSourceFamilies.includes(sourceFamily),
      )
    ) {
      return false;
    }
    const channel =
      typeof metadata.channel === "string"
        ? metadata.channel
        : null;
    if (channel && allowedChannels.size > 0 && !allowedChannels.has(channel)) {
      return false;
    }
    if (metadata.deliveryTool === true) {
      return policy.allowDelivery && policy.allowWrites;
    }
    return true;
  });
}

export function executiveDailyBriefToolScope(input: {
  actorMode?: ToolPolicy["actorMode"];
  allowDelivery: boolean;
  allowWrites: boolean;
  allowedProjectIds?: number[] | null;
  allowedSourceFamilies?: ToolPolicy["allowedSourceFamilies"];
  allowedChannels?: Array<"teams" | "email">;
}) {
  const policy = createExecutiveDailyBriefToolPolicy({
    actorMode: input.actorMode,
    allowDelivery: input.allowDelivery,
    allowWrites: input.allowWrites,
    allowedProjectIds: input.allowedProjectIds,
    allowedSourceFamilies: input.allowedSourceFamilies,
    allowedChannels: input.allowedChannels,
  });
  const visibleTools = visibleToolsForPolicy(
    EXECUTIVE_DAILY_BRIEF_TOOL_REGISTRY,
    policy,
  );

  return {
    policy,
    visibleToolNames: visibleTools.map((toolDefinition) => toolDefinition.name),
    hiddenToolNames: EXECUTIVE_DAILY_BRIEF_TOOL_REGISTRY.map(
      (toolDefinition) => toolDefinition.name,
    ).filter(
      (toolName) =>
        !visibleTools.some((toolDefinition) => toolDefinition.name === toolName),
    ),
  };
}
