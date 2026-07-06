import {
  CHANGE_REQUEST_SCOPE_OPTIONS,
  CHANGE_REQUEST_TYPE_OPTIONS,
} from "@/lib/ai/workflow-registry";

export type ChangeEventWorkflowChecklistKey =
  | "project"
  | "event_understood"
  | "cause_identified"
  | "cost_impact"
  | "schedule_impact"
  | "supporting_docs"
  | "related_records"
  | "review_create";

export type ChangeEventWorkflowStatus = "complete" | "active" | "missing";

export type ChangeEventWorkflowChecklistItem = {
  key: ChangeEventWorkflowChecklistKey;
  label: string;
  status: ChangeEventWorkflowStatus;
  helper: string;
};

export type ChangeEventWorkflowDraft = {
  projectId: number | null;
  projectName: string | null;
  title: string | null;
  narrative: string | null;
  cause: (typeof CHANGE_REQUEST_TYPE_OPTIONS)[number] | null;
  scope: (typeof CHANGE_REQUEST_SCOPE_OPTIONS)[number];
  costImpact: string | null;
  scheduleImpact: string | null;
  ownerNotified: "yes" | "no" | "unknown";
  supportingDocs: string[];
  relatedRecordHints: string[];
  recommendedImpacts: string[];
  missingRisks: string[];
  nextQuestion: string;
  readyForPreview: boolean;
  confirmPrompt: string;
  checklist: ChangeEventWorkflowChecklistItem[];
};

type BuildChangeEventWorkflowDraftParams = {
  prompt: string;
  selectedProjectId?: number | null;
  selectedProjectName?: string | null;
  previousDraft?: unknown;
};

const DEFAULT_TITLE = "New change event";
export const CHANGE_EVENT_WORKFLOW_METADATA_VERSION = 1;

export type ChangeEventWorkflowMetadata = {
  version: typeof CHANGE_EVENT_WORKFLOW_METADATA_VERSION;
  workflowKey: "change_event";
  widgetType: "change_event_workflow";
  expectedNativeTool: "createChangeEvent";
  writeOwner: "createChangeEvent";
  updatedAt: string;
  source: "ai_assistant_chat";
  draft: ChangeEventWorkflowDraft;
  readiness: {
    readyForPreview: boolean;
    missingChecklistKeys: ChangeEventWorkflowChecklistKey[];
    activeChecklistKey: ChangeEventWorkflowChecklistKey | null;
  };
};

function normalizePrompt(prompt: string): string {
  return prompt.trim().replace(/\s+/g, " ");
}

function containsAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function readExistingDraft(value: unknown): Partial<ChangeEventWorkflowDraft> {
  const draft = readRecord(value);
  if (!draft) return {};
  return {
    projectId: readNumber(draft.projectId),
    projectName: readString(draft.projectName),
    title: readString(draft.title),
    narrative: readString(draft.narrative),
    cause: CHANGE_REQUEST_TYPE_OPTIONS.includes(draft.cause as never)
      ? (draft.cause as ChangeEventWorkflowDraft["cause"])
      : null,
    scope: CHANGE_REQUEST_SCOPE_OPTIONS.includes(draft.scope as never)
      ? (draft.scope as ChangeEventWorkflowDraft["scope"])
      : undefined,
    costImpact: readString(draft.costImpact),
    scheduleImpact: readString(draft.scheduleImpact),
    ownerNotified:
      draft.ownerNotified === "yes" || draft.ownerNotified === "no"
        ? draft.ownerNotified
        : draft.ownerNotified === "unknown"
          ? "unknown"
          : undefined,
    supportingDocs: readStringArray(draft.supportingDocs),
    relatedRecordHints: readStringArray(draft.relatedRecordHints),
  };
}

function inferTitle(prompt: string): string | null {
  const normalized = normalizePrompt(prompt)
    .replace(/^(please\s+)?(help me\s+)?(create|draft|log|add|make)\s+/i, "")
    .replace(/^a\s+new\s+/i, "")
    .replace(/^change\s+(event|request)\s*(for|about|to|:)?\s*/i, "")
    .replace(/\?+$/, "")
    .trim();

  if (!normalized || normalized.length < 12) return null;
  return normalized.length > 80 ? `${normalized.slice(0, 77)}...` : normalized;
}

function inferCause(lower: string): ChangeEventWorkflowDraft["cause"] {
  if (containsAny(lower, ["owner request", "owner requested", "owner wants", "client request", "client requested"])) {
    return "Owner Requested";
  }
  if (containsAny(lower, ["design", "drawing", "drawings", "spec", "specification", "architect"])) {
    return "Design Change";
  }
  if (containsAny(lower, ["unforeseen", "existing condition", "hidden condition", "discovered", "found"])) {
    return "Unforeseen Condition";
  }
  if (containsAny(lower, ["field issue", "field condition", "constructability"])) {
    return "Constructability Issue";
  }
  if (containsAny(lower, ["code", "inspector", "inspection", "permit"])) {
    return "Constructability Issue";
  }
  if (containsAny(lower, ["value engineer", "value engineering", "ve "])) {
    return "Value Engineering";
  }
  if (containsAny(lower, ["allowance"])) {
    return "Allowance";
  }
  if (containsAny(lower, ["scope gap", "missed scope"])) {
    return "Scope Gap";
  }
  return null;
}

function inferScope(lower: string, cause: ChangeEventWorkflowDraft["cause"]): ChangeEventWorkflowDraft["scope"] {
  if (containsAny(lower, ["out of scope", "outside scope", "not in scope", "owner cost", "billable"])) {
    return "Out of Scope";
  }
  if (containsAny(lower, ["in scope", "included in scope"])) {
    return "In Scope";
  }
  if (containsAny(lower, ["allowance"])) {
    return "Allowance";
  }
  if (cause === "Owner Requested") {
    return "Out of Scope";
  }
  return "TBD";
}

function inferCostImpact(lower: string): string | null {
  const moneyMatch = lower.match(/\$[\d,]+(?:\.\d{2})?/);
  if (moneyMatch) return moneyMatch[0];
  if (containsAny(lower, ["no cost", "no added cost", "zero cost"])) return "No cost impact expected";
  if (containsAny(lower, ["cost impact", "pricing", "price", "estimate", "budget"])) return "Cost impact needs estimate";
  return null;
}

function inferScheduleImpact(lower: string): string | null {
  if (containsAny(lower, ["no schedule", "no time impact", "no delay"])) return "No schedule impact expected";
  const scheduleMatch = lower.match(/(\d+\s+(?:day|days|week|weeks)\s+(?:delay|impact|extension))/);
  if (scheduleMatch) return scheduleMatch[1];
  if (containsAny(lower, ["schedule", "delay", "critical path", "time impact"])) return "Schedule impact needs confirmation";
  return null;
}

function inferOwnerNotified(lower: string): ChangeEventWorkflowDraft["ownerNotified"] {
  if (
    containsAny(lower, [
      "owner approved",
      "owner notified",
      "owner was notified",
      "told the owner",
      "sent to owner",
      "client approved",
      "client was notified",
    ])
  ) {
    return "yes";
  }
  if (containsAny(lower, ["owner not notified", "not told owner", "client not notified"])) {
    return "no";
  }
  return "unknown";
}

function inferSupportingDocs(lower: string): string[] {
  const docs: string[] = [];
  if (containsAny(lower, ["photo", "photos", "picture", "pictures"])) docs.push("Photos");
  if (containsAny(lower, ["drawing", "drawings", "plan", "plans"])) docs.push("Drawings");
  if (containsAny(lower, ["rfi"])) docs.push("RFI");
  if (containsAny(lower, ["email", "owner email", "client email"])) docs.push("Email");
  if (containsAny(lower, ["meeting", "minutes"])) docs.push("Meeting notes");
  if (containsAny(lower, ["daily log", "daily report"])) docs.push("Daily log");
  return Array.from(new Set(docs));
}

function buildRelatedRecordHints(lower: string): string[] {
  const hints: string[] = [];
  if (containsAny(lower, ["drawing", "drawings", "plan", "plans", "spec"])) hints.push("Check drawings/specifications");
  if (containsAny(lower, ["rfi"])) hints.push("Check related RFIs");
  if (containsAny(lower, ["meeting", "minutes"])) hints.push("Check meeting notes");
  if (containsAny(lower, ["daily log", "daily report", "field"])) hints.push("Check daily logs");
  if (containsAny(lower, ["email", "owner", "client"])) hints.push("Check owner/client emails");
  return hints;
}

function buildRecommendedImpacts(draft: Pick<ChangeEventWorkflowDraft, "cause" | "scope" | "costImpact" | "scheduleImpact">): string[] {
  const impacts: string[] = [];
  if (draft.cause) impacts.push(`Classify as ${draft.cause} unless project evidence points elsewhere.`);
  if (draft.scope === "TBD") impacts.push("Keep scope as TBD until PM confirms whether this is billable.");
  if (!draft.costImpact) impacts.push("Ask for rough cost exposure before final preview.");
  if (!draft.scheduleImpact) impacts.push("Ask whether schedule or critical path is affected.");
  return impacts;
}

function buildMissingRisks(draft: Pick<ChangeEventWorkflowDraft, "costImpact" | "scheduleImpact" | "ownerNotified" | "supportingDocs">): string[] {
  const risks: string[] = [];
  if (!draft.costImpact) risks.push("Cost exposure is not documented.");
  if (!draft.scheduleImpact) risks.push("Schedule impact is not documented.");
  if (draft.ownerNotified === "unknown") risks.push("Owner/client notification is unclear.");
  if (draft.supportingDocs.length === 0) risks.push("No supporting documents are referenced yet.");
  return risks;
}

function status(complete: boolean, active: boolean): ChangeEventWorkflowStatus {
  if (complete) return "complete";
  return active ? "active" : "missing";
}

function buildChecklist(draft: Omit<ChangeEventWorkflowDraft, "checklist">): ChangeEventWorkflowChecklistItem[] {
  const hasProject = Boolean(draft.projectId);
  const hasNarrative = Boolean(draft.narrative && draft.narrative.length >= 24);
  const hasCause = Boolean(draft.cause);
  const hasCost = Boolean(draft.costImpact);
  const hasSchedule = Boolean(draft.scheduleImpact);
  const hasDocs = draft.supportingDocs.length > 0;
  const hasRelatedRecords = draft.relatedRecordHints.length > 0;
  const readyForReview = hasProject && Boolean(draft.title) && hasNarrative && hasCause;

  return [
    {
      key: "project",
      label: "Project selected",
      status: status(hasProject, !hasProject),
      helper: hasProject ? "Project context is available." : "Select or name the project first.",
    },
    {
      key: "event_understood",
      label: "Event understood",
      status: status(hasNarrative, hasProject && !hasNarrative),
      helper: hasNarrative ? "The event narrative is usable." : "Capture what changed and why it matters.",
    },
    {
      key: "cause_identified",
      label: "Cause identified",
      status: status(hasCause, hasNarrative && !hasCause),
      helper: hasCause ? `Suggested cause: ${draft.cause}.` : "Choose owner request, design change, field issue, or another cause.",
    },
    {
      key: "cost_impact",
      label: "Cost impact",
      status: status(hasCost, hasCause && !hasCost),
      helper: hasCost ? draft.costImpact ?? "" : "Ask for a rough estimate or confirm no cost impact.",
    },
    {
      key: "schedule_impact",
      label: "Schedule impact",
      status: status(hasSchedule, hasCause && !hasSchedule),
      helper: hasSchedule ? draft.scheduleImpact ?? "" : "Ask whether this affects dates, sequencing, or critical path.",
    },
    {
      key: "supporting_docs",
      label: "Supporting docs",
      status: status(hasDocs, hasCause && !hasDocs),
      helper: hasDocs ? draft.supportingDocs.join(", ") : "Look for photos, drawings, RFIs, emails, meeting notes, or daily logs.",
    },
    {
      key: "related_records",
      label: "Related records",
      status: status(hasRelatedRecords, hasCause && !hasRelatedRecords),
      helper: hasRelatedRecords ? draft.relatedRecordHints.join(", ") : "No related record hints yet.",
    },
    {
      key: "review_create",
      label: "Review and create",
      status: status(readyForReview, readyForReview),
      helper: readyForReview ? "Ready to prepare the final create preview." : "Complete the required intake before final review.",
    },
  ];
}

function nextQuestionFor(draft: Omit<ChangeEventWorkflowDraft, "checklist" | "nextQuestion" | "confirmPrompt">): string {
  if (!draft.projectId) return "What project is this change event for?";
  if (!draft.narrative || draft.narrative.length < 24) {
    return "Walk me through what happened in the field or from the owner. What changed, where, and why does it matter?";
  }
  if (!draft.cause) {
    return "What caused this change: owner request, design change, unforeseen condition, field issue, code requirement, value engineering, allowance, or something else?";
  }
  if (!draft.costImpact) {
    return "Do you have a rough cost impact yet, or should I mark cost as TBD for now?";
  }
  if (!draft.scheduleImpact) {
    return "Do you expect any schedule impact, sequencing issue, or critical-path delay?";
  }
  if (draft.ownerNotified === "unknown") {
    return "Has the owner or client already been notified about this?";
  }
  return "I have enough to prepare the final change-event preview. Do you want me to review it before creating it?";
}

function buildConfirmPrompt(draft: Omit<ChangeEventWorkflowDraft, "checklist" | "confirmPrompt">): string {
  return [
    "Prepare the final createChangeEvent preview from this live intake draft.",
    "Do not create the record yet. Call createChangeEvent with confirmed=false when required fields are present, then wait for my confirmation.",
    "",
    `Project ID: ${draft.projectId ?? "missing"}`,
    `Title: ${draft.title ?? DEFAULT_TITLE}`,
    `Description: ${draft.narrative ?? "missing"}`,
    `Type: ${draft.cause ?? "missing"}`,
    `Scope: ${draft.scope}`,
    `Cost impact: ${draft.costImpact ?? "missing"}`,
    `Schedule impact: ${draft.scheduleImpact ?? "missing"}`,
    `Owner/client notified: ${draft.ownerNotified}`,
    `Supporting docs: ${draft.supportingDocs.length > 0 ? draft.supportingDocs.join(", ") : "missing"}`,
  ].join("\n");
}

function mergeUnique(...values: Array<string[] | undefined>): string[] {
  return Array.from(
    new Set(values.flatMap((items) => items ?? []).filter((item) => item.trim())),
  );
}

function combineNarrative(previous: string | null | undefined, current: string | null): string | null {
  if (!previous) return current;
  if (!current) return previous;
  if (previous.includes(current)) return previous;
  return `${previous}\n\nFollow-up: ${current}`;
}

function finalizeDraft(
  draftBase: Omit<
    ChangeEventWorkflowDraft,
    "recommendedImpacts" | "missingRisks" | "nextQuestion" | "readyForPreview" | "confirmPrompt" | "checklist"
  >,
): ChangeEventWorkflowDraft {
  const draft = {
    ...draftBase,
    recommendedImpacts: [] as string[],
    missingRisks: [] as string[],
    nextQuestion: "",
    readyForPreview: false,
    confirmPrompt: "",
    checklist: [] as ChangeEventWorkflowChecklistItem[],
  };

  draft.recommendedImpacts = buildRecommendedImpacts(draft);
  draft.missingRisks = buildMissingRisks(draft);
  draft.readyForPreview = Boolean(
    draft.projectId && draft.title && draft.narrative && draft.cause,
  );
  draft.nextQuestion = nextQuestionFor(draft);
  draft.confirmPrompt = buildConfirmPrompt(draft);
  draft.checklist = buildChecklist(draft);
  return draft;
}

export function buildChangeEventWorkflowDraft({
  prompt,
  selectedProjectId = null,
  selectedProjectName = null,
  previousDraft,
}: BuildChangeEventWorkflowDraftParams): ChangeEventWorkflowDraft {
  const normalizedPrompt = normalizePrompt(prompt);
  const lower = normalizedPrompt.toLowerCase();
  const previous = readExistingDraft(previousDraft);
  const title = inferTitle(normalizedPrompt);
  const cause = inferCause(lower);
  const scope = inferScope(lower, cause);
  const costImpact = inferCostImpact(lower);
  const scheduleImpact = inferScheduleImpact(lower);
  const ownerNotified = inferOwnerNotified(lower);
  const supportingDocs = inferSupportingDocs(lower);
  const relatedRecordHints = buildRelatedRecordHints(lower);
  const narrative = normalizedPrompt.length >= 24 ? normalizedPrompt : null;
  const looksLikeNewChangeEventRequest = containsAny(lower, [
    "change event",
    "change request",
    "potential change",
  ]);

  return finalizeDraft({
    projectId: selectedProjectId ?? previous.projectId ?? null,
    projectName: selectedProjectName ?? previous.projectName ?? null,
    title:
      looksLikeNewChangeEventRequest || !previous.title
        ? title ?? previous.title ?? (narrative ? DEFAULT_TITLE : null)
        : previous.title,
    narrative: combineNarrative(previous.narrative, narrative),
    cause: cause ?? previous.cause ?? null,
    scope: scope !== "TBD" ? scope : previous.scope ?? scope,
    costImpact: costImpact ?? previous.costImpact ?? null,
    scheduleImpact: scheduleImpact ?? previous.scheduleImpact ?? null,
    ownerNotified:
      ownerNotified !== "unknown" ? ownerNotified : previous.ownerNotified ?? ownerNotified,
    supportingDocs: mergeUnique(previous.supportingDocs, supportingDocs),
    relatedRecordHints: mergeUnique(previous.relatedRecordHints, relatedRecordHints),
  });
}

export function buildChangeEventWorkflowMetadata(params: {
  prompt: string;
  selectedProjectId?: number | null;
  selectedProjectName?: string | null;
  previousDraft?: unknown;
  updatedAt?: string;
}): ChangeEventWorkflowMetadata {
  const draft = buildChangeEventWorkflowDraft(params);
  const missingChecklistKeys = draft.checklist
    .filter((item) => item.status !== "complete")
    .map((item) => item.key);
  const activeChecklistKey =
    draft.checklist.find((item) => item.status === "active")?.key ?? null;

  return {
    version: CHANGE_EVENT_WORKFLOW_METADATA_VERSION,
    workflowKey: "change_event",
    widgetType: "change_event_workflow",
    expectedNativeTool: "createChangeEvent",
    writeOwner: "createChangeEvent",
    updatedAt: params.updatedAt ?? new Date().toISOString(),
    source: "ai_assistant_chat",
    draft,
    readiness: {
      readyForPreview: draft.readyForPreview,
      missingChecklistKeys,
      activeChecklistKey,
    },
  };
}

export function isChangeEventFinalPreviewRequest(prompt: string): boolean {
  const normalized = normalizePrompt(prompt).toLowerCase();
  return (
    normalized.includes("prepare the final createchangeevent preview") ||
    normalized.includes("call createchangeevent with confirmed=false") ||
    normalized.includes("confirmed=false")
  );
}
