"use client";

import { AssistantWidgetRenderer } from "@/components/ai-assistant/assistant-widget-renderer";
import type { AssistantWidgetPayload } from "@/lib/ai/assistant-widgets";

const sourceEvidence = [
  {
    id: "meeting-1",
    title: "Owner OAC meeting",
    sourceType: "meeting" as const,
    date: "2026-05-12",
    snippet:
      "Owner requested a decision on the proposed ceiling revisions before procurement is released.",
    href: "/meetings/meeting-1",
    confidence: "high" as const,
  },
  {
    id: "email-1",
    title: "Architect email thread",
    sourceType: "email" as const,
    date: "2026-05-11",
    snippet:
      "Architect confirmed the sketch changes the corridor finish scope and may affect lead time.",
    confidence: "medium" as const,
  },
];

const ownerActions = [
  {
    id: "action-1",
    title: "Confirm ceiling revision pricing path",
    description: "Decide whether to carry this as an allowance draw or formal change event.",
    projectId: 983,
    projectName: "Union Collective",
    ownerName: "Project Executive",
    dueDate: "2026-05-15",
    priority: "high" as const,
    sourceType: "meeting" as const,
    sourceTitle: "Owner OAC meeting",
    recommendedAction: "create_change_event" as const,
    confidence: "high" as const,
    href: "/983/tasks/action-1",
  },
  {
    id: "action-2",
    title: "Send owner update on risk exposure",
    projectId: 983,
    projectName: "Union Collective",
    ownerName: "PM",
    dueDate: "2026-05-16",
    priority: "normal" as const,
    sourceType: "email" as const,
    recommendedAction: "draft_message" as const,
    confidence: "medium" as const,
  },
];

const widgets: AssistantWidgetPayload[] = [
  {
    type: "draft_email",
    id: "draft-email",
    title: "Draft owner follow-up",
    emailFrom: "pm@alleatogroup.com",
    defaultTo: "owner@example.com",
    defaultSubject: "Union Collective ceiling revision follow-up",
    defaultBody:
      "Hi,\n\nFollowing up on the ceiling revision discussed yesterday. We are confirming pricing and schedule exposure before releasing procurement.\n\nThanks,",
  },
  {
    type: "outlook_email_draft",
    id: "outlook-email-draft",
    title: "Outlook email draft",
    status: "created",
    mailboxUserId: "pm@alleatogroup.com",
    mode: "reply",
    subject: "RE: Ceiling revision",
    body:
      "Thanks for sending this over. We will validate the cost and schedule exposure and come back with a source-backed recommendation.",
    toRecipients: [{ email: "owner@example.com", name: "Owner Rep" }],
    ccRecipients: [{ email: "architect@example.com", name: "Architect" }],
    bccRecipients: [],
    replyToGraphMessageId: "message-1",
    outlookDraftId: "draft-1",
    outlookWebLink: "https://outlook.office.com/mail/deeplink/compose/draft-1",
    voiceProfile: {
      path: "docs/ai-plan/brandon-email-voice-profile.md",
      version: "2026-05-13",
    },
    adaptiveCard: {},
    confirmPrompt: "Open in Outlook to review and send.",
  },
  {
    type: "calendar_invite",
    id: "calendar-invite",
    title: "Coordination meeting",
    status: "draft",
    organizerEmail: "pm@alleatogroup.com",
    subject: "Ceiling revision coordination",
    body: "Review pricing path, owner decision timing, and procurement impact.",
    startDateTime: "2026-05-14T10:00",
    endDateTime: "2026-05-14T10:30",
    timeZone: "Eastern Standard Time",
    location: "Microsoft Teams",
    projectId: 983,
    attendees: [
      { email: "owner@example.com", name: "Owner Rep", type: "required" },
      { email: "architect@example.com", name: "Architect", type: "optional" },
    ],
    adaptiveCard: {},
    confirmPrompt: "Create this invite after final confirmation.",
  },
  {
    type: "create_task",
    id: "create-task",
    title: "Create task",
    defaultTitle: "Validate ceiling revision exposure",
    defaultBody: "Confirm pricing, schedule impact, and owner decision path.",
    defaultDueDate: "2026-05-15",
    defaultAssignee: "PM",
    defaultPriority: "high",
    projectId: 983,
  },
  {
    type: "task_summary",
    id: "task-summary",
    title: "Generated tasks today",
    subtitle: "Open follow-ups created from meetings and email",
    totalCount: 2,
    dateLabel: "May 13, 2026",
    items: [
      {
        id: "task-1",
        title: "Validate ceiling revision exposure",
        description: "Confirm pricing, schedule impact, and owner decision path.",
        status: "open",
        priority: "high",
        dueDate: "2026-05-15",
        assigneeName: "PM",
        projectId: 983,
        projectName: "Union Collective",
        sourceTitle: "Owner OAC meeting",
        sourceSystem: "Fireflies",
        sourceDate: "2026-05-12",
        createdAt: "2026-05-13",
        href: "/983/tasks/task-1",
      },
    ],
  },
  {
    type: "meeting_intelligence",
    id: "meeting-intelligence",
    title: "Meeting intelligence",
    subtitle: "Structured readout from recent project meetings",
    dateLabel: "Last 7 days",
    meetingCount: 3,
    criticalRiskCount: 1,
    decisionCount: 2,
    actionItemCount: 5,
    topInsights: [
      "Ceiling revision needs owner direction before procurement release.",
      "Schedule exposure is still unpriced.",
    ],
    recommendedNextActions: [
      "Create a change event preview.",
      "Send owner-facing decision summary.",
    ],
    meetings: [
      {
        id: "meeting-1",
        title: "Owner OAC meeting",
        projectId: 983,
        projectName: "Union Collective",
        date: "2026-05-12",
        source: "Fireflies",
        summary: "Team reviewed ceiling revision impact and next decision points.",
        criticalRisks: ["Procurement may be released before pricing is resolved."],
        decisions: ["Carry as review item until the cost path is confirmed."],
        actionItems: ["PM to validate exposure."],
        href: "/meetings/meeting-1",
      },
    ],
  },
  {
    type: "project_picker",
    id: "project-picker",
    title: "Pick a project",
    subtitle: "This request could match more than one active project.",
    intent: "risk_review",
    projects: [
      {
        projectId: 983,
        name: "Union Collective",
        client: "Union Collective",
        phase: "Construction",
        state: "Active",
        summary: "Mixed-use project with open ceiling revision risk.",
        contractValue: "$4.8M",
        meetingCount: 12,
        openCriticalItems: 1,
        healthStatus: "watch",
        prompt: "Use Union Collective for this request.",
      },
      {
        projectId: 760,
        name: "Brookville Road Goodwill",
        client: "Goodwill",
        phase: "Closeout",
        state: "Active",
        summary: "Closeout-heavy project with open document follow-ups.",
        contractValue: "$2.1M",
        meetingCount: 8,
        prompt: "Use Brookville Road Goodwill for this request.",
      },
    ],
  },
  {
    type: "owner_snapshot",
    id: "owner-snapshot",
    title: "Owner snapshot",
    projectId: 983,
    projectName: "Union Collective",
    status: "watch",
    asOf: "2026-05-13",
    summary:
      "Project is generally moving, but ceiling revision pricing and procurement timing need an owner decision.",
    healthSignals: [
      { label: "Cost", value: "Watch", status: "watch" },
      { label: "Schedule", value: "At risk", status: "critical" },
      { label: "Docs", value: "Current", status: "good" },
    ],
    money: {
      contractValue: "$4.8M",
      committed: "$3.2M",
      exposure: "$42K review item",
      unbilledChanges: "$18K",
      marginSignal: "Hold pending CE",
    },
    schedule: {
      status: "watch",
      blockers: ["Pricing path not confirmed"],
      upcomingMilestones: ["Procurement release"],
    },
    risks: [
      {
        id: "risk-1",
        title: "Unpriced ceiling revision",
        severity: "high",
        reason: "Work may proceed before owner approval.",
      },
    ],
    ownerActions,
    recentMovement: [
      { label: "Owner OAC meeting", sourceType: "meeting", date: "2026-05-12" },
      { label: "Architect email thread", sourceType: "email", date: "2026-05-11" },
    ],
    dataGaps: ["Current subcontractor quote is not attached yet."],
    sources: sourceEvidence,
  },
  {
    type: "owner_action_queue",
    id: "owner-action-queue",
    title: "Owner action queue",
    subtitle: "Items that need a human decision before the assistant writes anything.",
    totalCount: 2,
    groups: [
      { id: "now", title: "Needs decision now", priority: "now", items: [ownerActions[0]] },
      { id: "next", title: "Next follow-up", priority: "next", items: [ownerActions[1]] },
    ],
  },
  {
    type: "meeting_insights",
    id: "meeting-insights",
    title: "Meeting insights",
    subtitle: "Decisions, promises, risks, and unresolved questions from recent meetings.",
    dateLabel: "Last 7 days",
    projectId: 983,
    projectName: "Union Collective",
    metrics: {
      meetingCount: 3,
      decisionCount: 2,
      actionItemCount: 5,
      riskCount: 1,
      unresolvedQuestionCount: 2,
    },
    decisions: [
      {
        id: "decision-1",
        title: "Hold procurement release until pricing is reviewed",
        detail: "Owner wants cost clarity first.",
        confidence: "high",
      },
    ],
    promises: [
      {
        id: "promise-1",
        title: "PM will return with pricing path",
        ownerName: "PM",
        dueDate: "2026-05-15",
        confidence: "medium",
      },
    ],
    risks: [
      {
        id: "risk-1",
        title: "Unpriced scope could hit schedule",
        detail: "Subcontractor quote is missing.",
        confidence: "medium",
      },
    ],
    unresolvedQuestions: [
      {
        id: "question-1",
        title: "Is owner approval required before release?",
        confidence: "medium",
      },
    ],
    suggestedTasks: ownerActions,
    sources: sourceEvidence,
  },
  {
    type: "risk_exposure_packet",
    id: "risk-exposure",
    title: "Unpriced ceiling revision",
    severity: "high",
    projectId: 983,
    projectName: "Union Collective",
    summary:
      "The ceiling revision may create cost and schedule exposure if procurement is released before pricing is approved.",
    estimatedImpact: "$42K plus lead-time risk",
    exposureType: "cost",
    evidence: sourceEvidence,
    affectedRecords: [{ label: "Change event needed", recordType: "change_event" }],
    options: [
      { label: "Create change event", tradeoff: "Best audit trail", recommended: true },
      { label: "Carry as allowance note", tradeoff: "Fast but weaker control" },
    ],
    nextActions: ownerActions,
    dataGaps: ["Subcontractor quote is still missing."],
  },
  {
    type: "financial_pulse",
    id: "financial-pulse",
    title: "Financial pulse",
    subtitle: "Cost exposure and billing signals for the selected project.",
    asOf: "2026-05-13",
    scope: "project",
    projectId: 983,
    kpis: [
      { label: "Contract", value: "$4.8M", status: "neutral" },
      { label: "Committed", value: "$3.2M", delta: "67% committed", status: "good" },
      { label: "Exposure", value: "$42K", delta: "Needs CE", status: "watch" },
    ],
    variances: [
      { label: "Ceiling revision", actual: "$42K", expected: "$0", variance: "+$42K" },
    ],
    alerts: [],
    recommendedActions: ownerActions,
    sources: sourceEvidence,
  },
  {
    type: "creative_draft",
    id: "creative-draft",
    title: "Owner update draft",
    audience: "owner",
    format: "email",
    tone: "executive",
    sourceFacts: [
      { label: "Open risk", value: "Ceiling revision remains unpriced." },
      { label: "Next action", value: "PM is validating cost and schedule exposure." },
    ],
    bannedClaims: ["Do not claim owner approval has been received."],
    draftTitle: "Union Collective ceiling revision",
    draftBody:
      "We are tracking the ceiling revision as a decision item. Our next step is to validate the pricing and schedule exposure before procurement is released.",
    sourceCheck: {
      status: "needs_review",
      notes: ["Quote attachment is still missing."],
    },
  },
  {
    type: "source_evidence_drawer",
    id: "source-evidence-drawer",
    title: "Source evidence drawer",
    sources: sourceEvidence,
  },
  {
    type: "record_write_preview",
    id: "record-write-preview",
    title: "Record write preview",
    safetyLevel: "high",
    actionLabel: "Confirm write",
    target: {
      table: "change_events",
      recordType: "change_event",
      projectId: 983,
    },
    fields: [
      { label: "Title", value: "Unpriced ceiling revision", editable: true },
      {
        label: "Description",
        value: "Create CE for pricing and schedule exposure.",
        editable: true,
        multiline: true,
      },
      { label: "Status", value: "open", editable: true },
    ],
    sourceEvidence,
    validation: [
      { label: "Project", status: "pass", message: "Project resolved." },
      { label: "Source evidence", status: "warning", message: "Quote attachment missing." },
    ],
    confirmPrompt: "Create this change event after confirmation.",
  },
  {
    type: "create_event",
    id: "create-event",
    title: "Schedule coordination",
    dateLabel: "May",
    dateNumber: "14",
    defaultTitle: "Ceiling revision coordination",
    defaultTime: "10:00 AM",
    defaultLocation: "Microsoft Teams",
    defaultAgenda: "Review pricing path, owner approval, and procurement timing.",
    projectId: 983,
  },
  {
    type: "project_action_preview",
    id: "project-action-preview",
    title: "Change event preview",
    actionType: "change_event",
    projectId: 983,
    fields: [
      { label: "Title", value: "Unpriced ceiling revision", editable: true },
      {
        label: "Description",
        value: "Potential cost and schedule exposure from revised ceiling scope.",
        editable: true,
        multiline: true,
      },
      { label: "Scope", value: "Owner request", editable: true },
      { label: "Status", value: "open", editable: true },
    ],
    confirmPrompt: "Build a final write preview for this change event.",
  },
  {
    type: "decision_packet",
    id: "decision-packet",
    title: "Decision packet",
    recommendation:
      "Create a change event before procurement release so cost and schedule exposure are traceable.",
    confidence: "medium",
    impacts: [
      { label: "Financial impact", value: "$42K review item" },
      { label: "Schedule impact", value: "Lead-time risk if released late" },
      { label: "Owner action", value: "Approve pricing path" },
    ],
    risks: [
      "Proceeding without a CE weakens audit trail.",
      "Pricing may be disputed if source evidence is incomplete.",
    ],
    nextActions: [
      "Attach subcontractor quote.",
      "Send owner decision summary.",
      "Create CE preview.",
    ],
  },
  {
    type: "feature_request_packet",
    id: "feature-request-packet",
    title: "AI widget gallery request",
    requestId: "feature-request-1",
    status: "ready_for_planning",
    readinessLabel: "Ready for planning",
    readyForBuild: false,
    openQuestions: ["Should this become a permanent design-system route?"],
    acceptanceCriteriaCount: 3,
    linearIssueUrl: null,
    linearSyncStatus: "not_started",
    handoffPath: null,
    detailHref: "/feature-requests/feature-request-1",
  },
];

export function AiWidgetGalleryClient() {
  return (
    <main className="min-h-screen bg-muted/20 px-6 py-8 text-foreground">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            AI chat generated UI
          </p>
          <h1 className="text-2xl font-semibold">Assistant widget gallery</h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            Static samples rendered through the live AssistantWidgetRenderer
            registry. These are the custom data-assistant-widget cards, not the
            generic tool-call accordions.
          </p>
        </header>

        <section className="grid gap-5 lg:grid-cols-2">
          {widgets.map((widget) => (
            <div key={widget.id} className="min-w-0">
              <AssistantWidgetRenderer
                widget={widget}
                selectedProjectId={983}
                onSubmit={() => undefined}
                onEditDraft={() => undefined}
              />
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
