import type {
  AiEvent,
  AiRun,
  EvidenceRef,
  SourceHealthSnapshot,
} from "./contracts";
import { createAiOpsLedger } from "./ledger";
import { createServiceClient } from "@/lib/supabase/service";
import type { ExecutiveBriefingDraft } from "@/lib/executive/executive-briefing-workflow";
import type {
  OwnerBriefingDeliveryResult,
  OwnerBriefingSourceSummary,
} from "@/lib/executive/owner-briefing-delivery";

export const EXECUTIVE_DAILY_BRIEF_WORKFLOW_ID = "executive_daily_brief";
export const EXECUTIVE_DAILY_BRIEF_WORKFLOW_VERSION =
  "2026-06-19.ai-ops-gateway-v1";

type DailyBriefRunContext = {
  eventId: string;
  runId: string;
  startedAt: string;
};

type StartDailyBriefRunInput = {
  eventType: AiEvent["eventType"];
  triggerType: string;
  surface: string;
  title: string;
  userGoal: string;
  normalizedGoal: string;
  actorDisplayName?: string | null;
  deliveryTarget?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

type CompleteDailyBriefRunInput = {
  status: AiRun["status"];
  resultSummary: string;
  deliveryStatus?: AiRun["deliveryStatus"];
  deliveryTarget?: Record<string, unknown>;
  sourceCounts?: Record<string, unknown>;
  sourceHealth?: SourceHealthSnapshot[];
  metadata?: Record<string, unknown>;
};

function nowIso() {
  return new Date().toISOString();
}

function toIsoOrNull(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function idempotencyKey(input: StartDailyBriefRunInput, startedAt: string) {
  return [
    EXECUTIVE_DAILY_BRIEF_WORKFLOW_ID,
    input.surface,
    input.eventType,
    input.triggerType,
    startedAt,
  ].join(":");
}

function sourceFamily(value: string): EvidenceRef["sourceFamily"] {
  const normalized = value.toLowerCase();
  if (normalized.includes("meeting") || normalized.includes("fireflies"))
    return "meeting";
  if (normalized.includes("email") || normalized.includes("outlook"))
    return "email";
  if (normalized.includes("teams")) return "teams";
  if (normalized.includes("document")) return "document";
  if (normalized.includes("financial") || normalized.includes("acumatica"))
    return "acumatica";
  if (normalized.includes("procore")) return "procore";
  if (normalized.includes("packet")) return "intelligence_packet";
  if (normalized.includes("card")) return "insight_card";
  return "project_intelligence";
}

function confidence(
  value: string | null | undefined,
): EvidenceRef["confidence"] {
  if (value === "high" || value === "medium" || value === "low") return value;
  return "unknown";
}

function sourceHealthFromDraft(
  draft: ExecutiveBriefingDraft,
): SourceHealthSnapshot[] {
  return draft.packet.sourceCoverage.map((source) => ({
    sourceFamily: sourceFamily(source.label),
    resourceId: source.label,
    resourceName: source.detail || source.label,
    status:
      source.status === "loaded"
        ? "loaded"
        : source.status === "warning"
          ? "degraded"
          : source.status === "empty"
            ? "missing"
            : "unknown",
    checkedAt: nowIso(),
    latestSourceAt: toIsoOrNull(source.latest),
    loadedCount: source.count,
    missingCount: source.status === "empty" ? 1 : 0,
    warning: source.warning ?? null,
    metadata: { label: source.label },
  }));
}

export function evidenceRefsFromDraft(
  draft: ExecutiveBriefingDraft,
): EvidenceRef[] {
  const items = [
    ...draft.packet.sections.needsBrandon,
    ...draft.packet.sections.waitingOnOthers,
    ...draft.packet.sections.importantUpdates,
  ];

  return items.flatMap((item, index) =>
    item.citations.map((citation, citationIndex) => ({
      sourceFamily: sourceFamily(citation.source),
      sourceId:
        citation.sourceId ??
        item.sourceId ??
        `${draft.id}:${index + 1}:${citationIndex + 1}`,
      sourceTitle: citation.sourceDetail || item.sourceDetail || item.title,
      sourceUrl: citation.sourceUrl ?? item.sourceUrl ?? null,
      occurredAt: toIsoOrNull(citation.date),
      excerpt:
        citation.evidence ??
        item.evidence ??
        item.evidenceFacts?.[0] ??
        item.summary,
      confidence: "unknown",
      projectId: item.projectInternalId ?? null,
      projectLabel: item.project,
      metadata: {
        briefId: draft.id,
        recapDate: draft.recapDate,
        itemTitle: item.title,
        citationIndex,
      },
    })),
  );
}

function evidenceRefsFromSourceSummary(
  summary: OwnerBriefingSourceSummary,
): EvidenceRef[] {
  const refs: EvidenceRef[] = [];

  for (const project of summary.topProjects) {
    if (project.packetId) {
      refs.push({
        sourceFamily: "intelligence_packet",
        sourceId: project.packetId,
        sourceTitle: project.projectName,
        occurredAt: project.packetGeneratedAt,
        excerpt: project.packetIsStale
          ? "Packet was stale when selected for the owner briefing."
          : "Packet was current when selected for the owner briefing.",
        confidence: "unknown",
        projectId: project.projectId,
        projectLabel: project.projectName,
        metadata: {
          targetId: project.targetId,
          packetIsStale: project.packetIsStale,
        },
      });
    }

    for (const item of [
      ...project.decisionsNeeded,
      ...project.actionsRequired,
    ]) {
      refs.push({
        sourceFamily: "insight_card",
        sourceId: item.cardId,
        sourceTitle: item.title,
        occurredAt: item.lastSeenAt ?? item.firstSeenAt,
        excerpt:
          item.summary ?? item.whyItMatters ?? item.nextAction ?? item.title,
        confidence: confidence(item.confidence),
        projectId: project.projectId,
        projectLabel: project.projectName,
        metadata: {
          targetId: project.targetId,
          cardType: item.cardType,
          sourceCount: item.sourceCount,
        },
      });
    }
  }

  return refs;
}

export function evidenceRefsFromDeliveryResult(
  result:
    | OwnerBriefingDeliveryResult
    | { skipped?: boolean; status?: string; reason?: string },
): EvidenceRef[] {
  if ("sourceSummary" in result) {
    return evidenceRefsFromSourceSummary(result.sourceSummary);
  }
  return [];
}

export function sourceHealthForDeliveryResult(
  result:
    | OwnerBriefingDeliveryResult
    | { skipped?: boolean; status?: string; reason?: string },
): SourceHealthSnapshot[] {
  if (!("sourceSummary" in result)) {
    return [
      {
        sourceFamily: "project_intelligence",
        resourceId: "owner_briefing_delivery",
        resourceName: "Owner briefing delivery",
        status:
          result.status === "disabled" || result.skipped
            ? "skipped"
            : "unknown",
        checkedAt: nowIso(),
        loadedCount: 0,
        missingCount: 0,
        warning: result.reason ?? null,
      },
    ];
  }

  return [
    {
      sourceFamily: "project_intelligence",
      resourceId: "owner_briefing_source_summary",
      resourceName: "Owner briefing source summary",
      status: result.sourceSummary.stalePacketCount > 0 ? "degraded" : "loaded",
      checkedAt: nowIso(),
      latestSourceAt: toIsoOrNull(result.sourceSummary.generatedAt),
      loadedCount: result.sourceSummary.activeProjectCount,
      missingCount: 0,
      warning:
        result.sourceSummary.stalePacketCount > 0
          ? `${result.sourceSummary.stalePacketCount} stale packet(s) were included.`
          : null,
      metadata: {
        stalePacketCount: result.sourceSummary.stalePacketCount,
        projectCount: result.sourceSummary.topProjects.length,
      },
    },
  ];
}

export async function startDailyBriefRun(
  input: StartDailyBriefRunInput,
): Promise<DailyBriefRunContext> {
  const startedAt = nowIso();
  const ledger = createAiOpsLedger(createServiceClient());
  const event = await ledger.createEvent({
    eventSource: EXECUTIVE_DAILY_BRIEF_WORKFLOW_ID,
    eventType: input.eventType,
    status: "accepted",
    idempotencyKey: idempotencyKey(input, startedAt),
    actorDisplayName: input.actorDisplayName ?? null,
    deliveryContext: input.deliveryTarget ?? {},
    permissionContext: { permissionMode: "service" },
    payload: input.payload ?? {},
    metadata: { ...(input.metadata ?? {}), startedAt },
  });

  const run = await ledger.createRun({
    eventId: event.id,
    workflowId: EXECUTIVE_DAILY_BRIEF_WORKFLOW_ID,
    workflowVersion: EXECUTIVE_DAILY_BRIEF_WORKFLOW_VERSION,
    triggerType: input.triggerType,
    surface: input.surface,
    title: input.title,
    userGoal: input.userGoal,
    normalizedGoal: input.normalizedGoal,
    status: "running",
    priority: "high",
    permissionMode: "service",
    modelPolicy: { route: "executive_daily_brief" },
    runtimeBudget: {},
    toolScope: {
      sourceAdapters: ["daily_recaps", "project_intelligence"],
      deliveryAdapters: ["teams"],
    },
    sourcePolicy: { requireSourceRefs: true },
    sourceHealth: [],
    sourceCounts: {},
    artifacts: [],
    deliveryTarget: input.deliveryTarget ?? {},
    retryable: false,
    startedAt,
    metadata: input.metadata ?? {},
  });

  return { eventId: event.id, runId: run.id, startedAt };
}

export async function completeDailyBriefRun(
  context: DailyBriefRunContext,
  input: CompleteDailyBriefRunInput,
) {
  const completedAt = nowIso();
  const ledger = createAiOpsLedger(createServiceClient());
  await ledger.updateEvent(context.eventId, {
    status: "converted_to_run",
    metadata: { completedAt, ...(input.metadata ?? {}) },
  });
  await ledger.updateRun(context.runId, {
    status: input.status,
    resultSummary: input.resultSummary,
    deliveryStatus: input.deliveryStatus,
    deliveryTarget: input.deliveryTarget,
    sourceCounts: input.sourceCounts,
    completedAt,
    metadata: {
      completedAt,
      sourceHealth: input.sourceHealth ?? [],
      ...(input.metadata ?? {}),
    },
  });
}

export async function failDailyBriefRun(
  context: DailyBriefRunContext | null,
  error: unknown,
  failureCode: string,
) {
  if (!context) return;
  const message = error instanceof Error ? error.message : String(error);
  const completedAt = nowIso();
  const ledger = createAiOpsLedger(createServiceClient());
  await ledger.updateEvent(context.eventId, {
    status: "failed",
    failureCode,
    failureMessage: message,
    metadata: { completedAt },
  });
  await ledger.updateRun(context.runId, {
    status: "failed_permanent",
    deliveryStatus: "failed",
    failureCode,
    failureMessage: message,
    completedAt,
    metadata: { completedAt },
  });
}

export async function recordDraftEvidence(
  context: DailyBriefRunContext,
  draft: ExecutiveBriefingDraft,
) {
  const ledger = createAiOpsLedger(createServiceClient());
  await ledger.insertEvidenceRefs(context.runId, evidenceRefsFromDraft(draft));
}

export async function recordDeliveryEvidence(
  context: DailyBriefRunContext,
  result: OwnerBriefingDeliveryResult,
) {
  const ledger = createAiOpsLedger(createServiceClient());
  await ledger.insertEvidenceRefs(
    context.runId,
    evidenceRefsFromDeliveryResult(result),
  );
}

export function sourceHealthForDraft(draft: ExecutiveBriefingDraft) {
  return sourceHealthFromDraft(draft);
}
