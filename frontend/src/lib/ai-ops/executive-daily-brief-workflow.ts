import type { WorkflowDefinition } from "./contracts";
import {
  EXECUTIVE_DAILY_BRIEF_SOURCE_ADAPTERS,
  requiredExecutiveBriefSourceFamilies,
} from "./source-adapters";

export const EXECUTIVE_DAILY_BRIEF_WORKFLOW_ID = "executive_daily_brief";
export const EXECUTIVE_DAILY_BRIEF_WORKFLOW_VERSION =
  "2026-06-19.ai-ops-gateway-v1";

export const EXECUTIVE_DAILY_BRIEF_ALLOWED_TOOLS = [
  "fetch-fireflies-meeting-sources",
  "fetch-outlook-email-sources",
  "fetch-teams-message-sources",
  "fetch-document-rag-sources",
  "fetch-acumatica-financial-sources",
  "fetch-procore-project-sources",
  "fetch-project-intelligence-sources",
  "generate-executive-daily-brief-packet",
  "persist-executive-daily-brief-artifact",
  "build-teams-daily-brief-payload",
  "send-teams-daily-brief",
  "build-email-daily-brief-payload",
  "send-email-daily-brief",
] as const;

export const EXECUTIVE_DAILY_BRIEF_WORKFLOW: WorkflowDefinition = {
  workflowId: EXECUTIVE_DAILY_BRIEF_WORKFLOW_ID,
  version: EXECUTIVE_DAILY_BRIEF_WORKFLOW_VERSION,
  title: "Executive Daily Brief",
  allowedTools: [...EXECUTIVE_DAILY_BRIEF_ALLOWED_TOOLS],
  sourcePolicy: {
    requiredSourceFamilies: requiredExecutiveBriefSourceFamilies(),
    freshnessMinutes: 4_320,
    minimumEvidenceRefsPerClaim: 1,
    failWhenRequiredSourcesMissing: false,
  },
  evidencePolicy: {
    requireSourceRefs: true,
    minimumConfidence: "medium",
    allowSyntheticEvidence: false,
  },
  deliveryPolicy: {
    allowedChannels: ["teams", "email"],
    defaultDryRun: true,
    requireDeliveryAttemptRecord: true,
  },
  runtimeBudget: {
    timeoutMs: 180_000,
    maxToolCalls: 24,
    maxModelCalls: 2,
  },
  failureModes: [
    "missing_required_source",
    "stale_required_source",
    "missing_claim_evidence",
    "artifact_persist_failed",
    "delivery_disabled",
    "delivery_blocked",
    "delivery_provider_failed",
    "quota_or_model_failure",
    "schedule_skipped",
  ],
  metadata: {
    sourceAdapters: EXECUTIVE_DAILY_BRIEF_SOURCE_ADAPTERS.map((adapter) => ({
      adapterId: adapter.adapterId,
      sourceFamilies: adapter.sourceFamilies,
      requiredForExecutiveBrief: adapter.requiredForExecutiveBrief,
      defaultFreshnessMinutes: adapter.defaultFreshnessMinutes,
    })),
    packetSchemaName: "ExecutiveDailyBriefPacket",
    promptContract:
      "Produce Brandon-first concise executive claims. Every surfaced claim must carry source-backed citations or be excluded/degraded.",
    degradedOutputBehavior:
      "Generate only source-backed sections that meet evidence policy; record missing/stale sources in source health and run metadata.",
    hardFailConditions: [
      "No source-backed claims can be generated.",
      "Artifact persistence fails.",
      "Delivery attempt cannot be recorded when delivery is requested.",
    ],
  },
};

export function executiveDailyBriefSourcePolicyMetadata(input?: {
  allowedSourceFamilies?: WorkflowDefinition["sourcePolicy"]["requiredSourceFamilies"];
  allowedProjectIds?: number[] | null;
}) {
  return {
    workflowId: EXECUTIVE_DAILY_BRIEF_WORKFLOW.workflowId,
    workflowVersion: EXECUTIVE_DAILY_BRIEF_WORKFLOW.version,
    requiredSourceFamilies:
      EXECUTIVE_DAILY_BRIEF_WORKFLOW.sourcePolicy.requiredSourceFamilies,
    allowedSourceFamilies:
      input?.allowedSourceFamilies ??
      EXECUTIVE_DAILY_BRIEF_WORKFLOW.sourcePolicy.requiredSourceFamilies,
    allowedProjectIds: input?.allowedProjectIds ?? null,
    freshnessMinutes:
      EXECUTIVE_DAILY_BRIEF_WORKFLOW.sourcePolicy.freshnessMinutes,
    minimumEvidenceRefsPerClaim:
      EXECUTIVE_DAILY_BRIEF_WORKFLOW.sourcePolicy
        .minimumEvidenceRefsPerClaim,
    failWhenRequiredSourcesMissing:
      EXECUTIVE_DAILY_BRIEF_WORKFLOW.sourcePolicy
        .failWhenRequiredSourcesMissing,
  };
}
