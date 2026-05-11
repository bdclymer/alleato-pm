export type AssistantWidgetKind =
  | "draft_email"
  | "create_task"
  | "task_summary"
  | "meeting_intelligence"
  | "create_event"
  | "project_action_preview"
  | "decision_packet"
  | "feature_request_packet";

export type AssistantWidgetField = {
  label: string;
  value: string;
  editable?: boolean;
  multiline?: boolean;
};

export type DraftEmailWidgetPayload = {
  type: "draft_email";
  id: string;
  title: string;
  emailFrom?: string;
  defaultTo: string;
  defaultSubject: string;
  defaultBody: string;
};

export type CreateTaskWidgetPayload = {
  type: "create_task";
  id: string;
  title: string;
  defaultTitle: string;
  defaultBody: string;
  defaultDueDate?: string;
  defaultAssignee?: string;
  defaultPriority: "low" | "normal" | "high" | "critical";
  projectId?: number | null;
};

export type TaskSummaryWidgetItem = {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  dueDate?: string | null;
  assigneeName?: string | null;
  projectId?: number | null;
  projectName?: string | null;
  sourceTitle?: string | null;
  sourceSystem?: string | null;
  sourceDate?: string | null;
  createdAt: string;
  href: string;
};

export type TaskSummaryWidgetPayload = {
  type: "task_summary";
  id: string;
  title: string;
  subtitle: string;
  totalCount: number;
  dateLabel: string;
  emptyState?: string;
  items: TaskSummaryWidgetItem[];
};

export type MeetingIntelligenceWidgetItem = {
  id: string;
  title: string;
  projectId?: number | null;
  projectName?: string | null;
  date?: string | null;
  source?: string | null;
  summary?: string | null;
  criticalRisks: string[];
  decisions: string[];
  actionItems: string[];
  href: string;
};

export type MeetingIntelligenceWidgetPayload = {
  type: "meeting_intelligence";
  id: string;
  title: string;
  subtitle: string;
  dateLabel: string;
  meetingCount: number;
  criticalRiskCount: number;
  decisionCount: number;
  actionItemCount: number;
  topInsights: string[];
  recommendedNextActions: string[];
  emptyState?: string;
  meetings: MeetingIntelligenceWidgetItem[];
};

export type CreateEventWidgetPayload = {
  type: "create_event";
  id: string;
  title: string;
  dateLabel: string;
  dateNumber: string;
  defaultTitle: string;
  defaultTime: string;
  defaultLocation: string;
  defaultAgenda: string;
  projectId?: number | null;
};

export type ProjectActionPreviewWidgetPayload = {
  type: "project_action_preview";
  id: string;
  title: string;
  actionType: "rfi" | "change_event" | "generic";
  projectId?: number | null;
  fields: AssistantWidgetField[];
  confirmPrompt: string;
};

export type DecisionPacketWidgetPayload = {
  type: "decision_packet";
  id: string;
  title: string;
  recommendation: string;
  confidence: "low" | "medium" | "high";
  impacts: AssistantWidgetField[];
  risks: string[];
  nextActions: string[];
};

export type AssistantWidgetPayload =
  | DraftEmailWidgetPayload
  | CreateTaskWidgetPayload
  | TaskSummaryWidgetPayload
  | MeetingIntelligenceWidgetPayload
  | CreateEventWidgetPayload
  | ProjectActionPreviewWidgetPayload
  | DecisionPacketWidgetPayload
  | import("@/lib/feature-requests/types").FeatureRequestPacketWidgetPayload;

export type AssistantWidgetDataPart = {
  type: "data-assistant-widget";
  id?: string;
  data: {
    widget: AssistantWidgetPayload;
  };
};

function normalizePrompt(prompt: string): string {
  return prompt.trim().replace(/\s+/g, " ");
}

function compactTitle(prompt: string, fallback: string): string {
  const normalized = normalizePrompt(prompt)
    .replace(/^(please\s+)?(draft|write|create|make|add|schedule|log)\s+/i, "")
    .replace(/\?+$/, "")
    .trim();
  if (!normalized) return fallback;
  return normalized.length > 82 ? `${normalized.slice(0, 79)}...` : normalized;
}

function nextDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

function containsAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

export function buildAssistantWidgetsFromPrompt(params: {
  prompt: string;
  selectedProjectId?: number | null;
}): AssistantWidgetPayload[] {
  const prompt = normalizePrompt(params.prompt);
  const lower = prompt.toLowerCase();
  const widgets: AssistantWidgetPayload[] = [];

  if (
    containsAny(lower, ["draft email", "write email", "send email", "email to"])
  ) {
    const title = compactTitle(prompt, "Draft email");
    widgets.push({
      type: "draft_email",
      id: "draft-email",
      title: "Draft email",
      defaultTo: "",
      defaultSubject: title,
      defaultBody: [
        "Hi,",
        "",
        "I wanted to follow up on the item below:",
        "",
        prompt,
        "",
        "Please let me know what you need from our side.",
        "",
        "Thanks,",
      ].join("\n"),
    });
  }

  if (
    containsAny(lower, ["create task", "add task", "make a task", "assign "])
  ) {
    widgets.push({
      type: "create_task",
      id: "create-task",
      title: "Create task",
      defaultTitle: compactTitle(prompt, "New project task"),
      defaultBody: prompt,
      defaultDueDate: nextDate(7),
      defaultPriority: lower.includes("urgent") || lower.includes("critical")
        ? "critical"
        : lower.includes("high priority")
          ? "high"
          : "normal",
      projectId: params.selectedProjectId ?? null,
    });
  }

  if (
    containsAny(lower, [
      "create event",
      "create meeting",
      "schedule meeting",
      "add to calendar",
      "calendar",
    ])
  ) {
    const date = new Date();
    widgets.push({
      type: "create_event",
      id: "create-event",
      title: "Create event",
      dateLabel: date.toLocaleDateString("en-US", { weekday: "short" }),
      dateNumber: date.toLocaleDateString("en-US", { day: "2-digit" }),
      defaultTitle: compactTitle(prompt, "Project meeting"),
      defaultTime: "TBD",
      defaultLocation: "TBD",
      defaultAgenda: prompt,
      projectId: params.selectedProjectId ?? null,
    });
  }

  if (containsAny(lower, ["create rfi", "draft rfi", "write rfi"])) {
    const title = compactTitle(prompt, "Draft RFI");
    widgets.push({
      type: "project_action_preview",
      id: "rfi-preview",
      title: "RFI preview",
      actionType: "rfi",
      projectId: params.selectedProjectId ?? null,
      fields: [
        { label: "Subject", value: title, editable: true },
        { label: "Question", value: prompt, editable: true, multiline: true },
        { label: "Cost impact", value: "tbd", editable: true },
        { label: "Schedule impact", value: "tbd", editable: true },
      ],
      confirmPrompt:
        "Create an RFI from this preview. Show the final write preview first and wait for my confirmation.",
    });
  }

  if (
    containsAny(lower, [
      "create change event",
      "log change event",
      "draft change event",
      "change event",
    ])
  ) {
    const title = compactTitle(prompt, "Draft change event");
    widgets.push({
      type: "project_action_preview",
      id: "change-event-preview",
      title: "Change event preview",
      actionType: "change_event",
      projectId: params.selectedProjectId ?? null,
      fields: [
        { label: "Title", value: title, editable: true },
        { label: "Description", value: prompt, editable: true, multiline: true },
        { label: "Scope", value: "other", editable: true },
        { label: "Status", value: "open", editable: true },
      ],
      confirmPrompt:
        "Create a change event from this preview. Show the final write preview first and wait for my confirmation.",
    });
  }

  if (
    containsAny(lower, [
      "should we",
      "recommend",
      "approve",
      "decision",
      "risk",
      "impact",
    ])
  ) {
    widgets.push({
      type: "decision_packet",
      id: "decision-packet",
      title: "Decision packet",
      recommendation:
        "Treat this as a review item until the assistant confirms the supporting project evidence.",
      confidence: "medium",
      impacts: [
        { label: "Financial impact", value: "Needs source-backed amount" },
        { label: "Schedule impact", value: "Needs current project context" },
        { label: "Owner action", value: "Confirm responsible party before executing" },
      ],
      risks: [
        "Missing source evidence could lead to the wrong owner or cost treatment.",
        "A write action should stay preview-only until the final fields are confirmed.",
      ],
      nextActions: [
        "Ask the assistant to pull source evidence for this decision.",
        "Convert the decision into an RFI, change event, task, or email draft once the fields are confirmed.",
      ],
    });
  }

  return widgets;
}

export function isAssistantWidgetPayload(
  value: unknown,
): value is AssistantWidgetPayload {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.type === "string" &&
    [
      "draft_email",
      "create_task",
      "task_summary",
      "meeting_intelligence",
      "create_event",
      "project_action_preview",
      "decision_packet",
      "feature_request_packet",
    ].includes(record.type)
  );
}
