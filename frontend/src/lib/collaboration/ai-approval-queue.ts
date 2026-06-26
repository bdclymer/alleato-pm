import type { Json } from "@/types/database.types";

export const AI_APPROVAL_QUEUE_NOTIFICATION_KIND = "ai_notification_decision";

export const AI_APPROVAL_QUEUE_EVENT_TYPES = [
  "ai_change_event_awaiting_approval",
  "ai_commitment_awaiting_approval",
  "client_report_ready_to_send",
] as const;

const AI_APPROVAL_QUEUE_EVENT_TYPE_SET = new Set<string>(
  AI_APPROVAL_QUEUE_EVENT_TYPES,
);

const APPROVAL_EVENT_PATTERNS = [
  "awaiting_approval",
  "ready_to_send",
  "requires_response",
  "requires_review",
  "review_needed",
  "awaiting_review",
];

export type AiApprovalQueueMetadata = {
  eventType?: string;
  requiredAction?: string;
  reason?: string;
  failureLoudBehavior?: string;
  source?: string;
  tier?: string;
};

export type AiApprovalQueueCandidate = {
  kind: string;
  metadata?: Json | null;
};

function cleanString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getMetadataRecord(
  metadata: Json | null | undefined,
): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  return metadata as Record<string, unknown>;
}

export function getAiApprovalQueueMetadata(
  metadata: Json | null | undefined,
): AiApprovalQueueMetadata {
  const record = getMetadataRecord(metadata);
  if (!record) return {};

  return {
    eventType: cleanString(record.eventType),
    requiredAction: cleanString(record.requiredAction),
    reason: cleanString(record.reason),
    failureLoudBehavior: cleanString(record.failureLoudBehavior),
    source: cleanString(record.source),
    tier: cleanString(record.tier),
  };
}

export function isAiApprovalQueueEventType(
  eventType: string | null | undefined,
): boolean {
  const normalized = cleanString(eventType);
  if (!normalized) return false;

  return (
    AI_APPROVAL_QUEUE_EVENT_TYPE_SET.has(normalized) ||
    APPROVAL_EVENT_PATTERNS.some((pattern) => normalized.includes(pattern))
  );
}

export function isAiApprovalQueueNotification(
  notification: AiApprovalQueueCandidate,
): boolean {
  if (notification.kind !== AI_APPROVAL_QUEUE_NOTIFICATION_KIND) return false;

  const metadata = getAiApprovalQueueMetadata(notification.metadata);
  return isAiApprovalQueueEventType(metadata.eventType);
}

export function getAiApprovalQueueEventTypesParam(): string {
  return AI_APPROVAL_QUEUE_EVENT_TYPES.join(",");
}

export function formatAiApprovalQueueEventLabel(
  eventType: string | null | undefined,
): string {
  const normalized = cleanString(eventType);
  if (!normalized) return "AI review";

  return normalized
    .replace(/^ai_/, "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const ENTITY_ROUTE_SEGMENTS: Record<string, string> = {
  change_events: "change-events",
  "change-events": "change-events",
  progress_reports: "progress-reports",
  "progress-reports": "progress-reports",
  commitments: "commitments",
  submittals: "submittals",
  rfi: "rfis",
  rfis: "rfis",
};

export function getAiApprovalQueueRelatedHref(input: {
  projectId: number | null;
  entityType: string | null;
  entityId: string | null;
}): string | null {
  if (!input.projectId || !input.entityType) return null;

  const routeSegment =
    ENTITY_ROUTE_SEGMENTS[input.entityType] ??
    input.entityType.replaceAll("_", "-");

  if (!input.entityId) {
    return `/${input.projectId}/${routeSegment}`;
  }

  return `/${input.projectId}/${routeSegment}/${input.entityId}`;
}
