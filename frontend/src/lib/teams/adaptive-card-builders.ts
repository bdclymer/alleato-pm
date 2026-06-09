/**
 * Adaptive Card builders for Microsoft Teams and the AI assistant chat.
 *
 * Each function returns a raw Adaptive Cards 1.5 JSON object.
 * Teams: wrap in PostableCard and send via sendProactiveCard().
 * AI chat: pass directly to AdaptiveCardRenderer.
 *
 * Survey cards use Action.Submit — in AI chat, handle the submitted
 * data via the assistant widget system instead.
 */

export type AdaptiveCardJson = Record<string, unknown>;

const SCHEMA = "https://adaptivecards.io/schemas/adaptive-card.json";
const VERSION = "1.5";
const ALLEATO_URL = "https://projects.alleatogroup.com";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function textBlock(
  text: string,
  opts: {
    size?: "Small" | "Default" | "Medium" | "Large" | "ExtraLarge";
    weight?: "Default" | "Lighter" | "Bolder";
    color?: "Default" | "Dark" | "Light" | "Accent" | "Good" | "Warning" | "Attention";
    isSubtle?: boolean;
    wrap?: boolean;
    spacing?: "None" | "Small" | "Default" | "Medium" | "Large" | "ExtraLarge" | "Padding";
    horizontalAlignment?: "Left" | "Center" | "Right";
  } = {},
): Record<string, unknown> {
  return {
    type: "TextBlock",
    text,
    wrap: opts.wrap ?? true,
    ...(opts.size && { size: opts.size }),
    ...(opts.weight && { weight: opts.weight }),
    ...(opts.color && { color: opts.color }),
    ...(opts.isSubtle !== undefined && { isSubtle: opts.isSubtle }),
    ...(opts.spacing && { spacing: opts.spacing }),
    ...(opts.horizontalAlignment && { horizontalAlignment: opts.horizontalAlignment }),
  };
}

function icon(
  name: string,
  opts: {
    size?: "xxSmall" | "xSmall" | "Small" | "Medium" | "Large";
    color?: "Default" | "Dark" | "Light" | "Accent" | "Good" | "Warning" | "Attention";
    id?: string;
    isVisible?: boolean;
  } = {},
): Record<string, unknown> {
  return {
    type: "Icon",
    name,
    ...(opts.size && { size: opts.size }),
    ...(opts.color && { color: opts.color }),
    ...(opts.id && { id: opts.id }),
    ...(opts.isVisible !== undefined && { isVisible: opts.isVisible }),
  };
}

function toggleVisibilityAction(targetElements: string[]): Record<string, unknown> {
  return { type: "Action.ToggleVisibility", targetElements };
}

function chevronPair(prefix: string): [Record<string, unknown>, Record<string, unknown>] {
  return [
    icon("ChevronUp", { size: "xSmall", id: `${prefix}-chevron-up` }),
    icon("ChevronDown", { size: "xSmall", id: `${prefix}-chevron-down`, isVisible: false }),
  ];
}

function collapsibleSection(opts: {
  id: string;
  label: string;
  items: Record<string, unknown>[];
  defaultExpanded?: boolean;
  spacing?: "Small" | "Medium" | "Large";
}): Record<string, unknown> {
  const { id, label, items, defaultExpanded = false } = opts;
  const [chevronUp, chevronDown] = chevronPair(id);

  return {
    type: "Container",
    spacing: opts.spacing ?? "Medium",
    separator: true,
    items: [
      {
        type: "ColumnSet",
        selectAction: toggleVisibilityAction([
          `${id}-body`,
          `${id}-chevron-down`,
          `${id}-chevron-up`,
        ]),
        columns: [
          {
            type: "Column",
            width: "stretch",
            items: [textBlock(label, { weight: "Bolder" })],
          },
          {
            type: "Column",
            width: "auto",
            verticalContentAlignment: "Center",
            items: [defaultExpanded ? chevronUp : chevronDown, defaultExpanded ? chevronDown : chevronUp],
          },
        ],
      },
      {
        type: "Container",
        id: `${id}-body`,
        isVisible: defaultExpanded,
        spacing: "Small",
        items,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// 1. Executive Daily Brief
// ---------------------------------------------------------------------------

export interface DailyBriefDecision {
  project: string;
  detail: string;
}

export interface DailyBriefPendingItem {
  project: string;
  detail: string;
  ageDays: number;
}

export interface DailyBriefMeeting {
  time: string;
  title: string;
}

export interface DailyBriefCardData {
  recipientName: string | null;
  date: string;
  daypart: "morning" | "afternoon" | "evening";
  decisions: DailyBriefDecision[];
  pending: DailyBriefPendingItem[];
  meetings: DailyBriefMeeting[];
}

export function buildDailyBriefCard(data: DailyBriefCardData): AdaptiveCardJson {
  const { recipientName, date, daypart, decisions, pending, meetings } = data;
  const greeting = recipientName ? `Good ${daypart}, ${recipientName}.` : `Good ${daypart}.`;

  const summaryParts: string[] = [];
  if (decisions.length > 0) summaryParts.push(`**${decisions.length} decision${decisions.length !== 1 ? "s" : ""} needed**`);
  if (pending.length > 0) summaryParts.push(`${pending.length} pending`);
  if (meetings.length > 0) summaryParts.push(`${meetings.length} meeting${meetings.length !== 1 ? "s" : ""} today`);

  const decisionItems = decisions.map((d, i) => ({
    type: "ColumnSet",
    spacing: i === 0 ? "None" : "Small",
    ...(i > 0 && { separator: true }),
    columns: [
      {
        type: "Column",
        width: "auto",
        verticalContentAlignment: "Top",
        items: [textBlock(String(i + 1), { size: "Small", weight: "Bolder", color: "Attention" })],
      },
      {
        type: "Column",
        width: "stretch",
        spacing: "Small",
        items: [
          textBlock(d.project, { size: "Small", weight: "Bolder" }),
          textBlock(d.detail, { size: "Small", isSubtle: true, spacing: "None" }),
        ],
      },
    ],
  }));

  const pendingItems = pending.map((p, i) => ({
    type: "ColumnSet",
    spacing: i === 0 ? "None" : "Small",
    ...(i > 0 && { separator: true }),
    columns: [
      {
        type: "Column",
        width: "auto",
        verticalContentAlignment: "Top",
        items: [icon("Clock", { size: "xxSmall", color: p.ageDays >= 5 ? "Warning" : "Default" })],
      },
      {
        type: "Column",
        width: "stretch",
        spacing: "Small",
        items: [
          textBlock(p.project, { size: "Small", weight: "Bolder" }),
          textBlock(p.detail, { size: "Small", isSubtle: true, spacing: "None" }),
        ],
      },
      {
        type: "Column",
        width: "auto",
        verticalContentAlignment: "Top",
        items: [
          textBlock(`${p.ageDays}d`, {
            size: "Small",
            color: p.ageDays >= 5 ? "Warning" : undefined,
            isSubtle: p.ageDays < 5,
            weight: "Bolder",
            wrap: false,
          }),
        ],
      },
    ],
  }));

  const meetingItems = meetings.map((m, i) => ({
    type: "ColumnSet",
    spacing: i === 0 ? "None" : "Small",
    ...(i > 0 && { separator: true }),
    columns: [
      {
        type: "Column",
        width: "60px",
        items: [textBlock(m.time, { size: "Small", isSubtle: true, wrap: false })],
      },
      {
        type: "Column",
        width: "stretch",
        spacing: "Small",
        items: [textBlock(m.title, { size: "Small", weight: "Bolder" })],
      },
    ],
  }));

  return {
    type: "AdaptiveCard",
    $schema: SCHEMA,
    version: VERSION,
    body: [
      {
        type: "ColumnSet",
        columns: [
          {
            type: "Column",
            width: "stretch",
            items: [
              textBlock("Daily Brief", { size: "Large", weight: "Bolder", wrap: false }),
              textBlock(date, { size: "Small", isSubtle: true, spacing: "None", wrap: false }),
            ],
          },
          {
            type: "Column",
            width: "auto",
            verticalContentAlignment: "Top",
            items: [textBlock(greeting, { size: "Small", isSubtle: true, horizontalAlignment: "Right" })],
          },
        ],
      },
      ...(summaryParts.length > 0
        ? [
            {
              type: "ColumnSet",
              spacing: "Medium",
              separator: true,
              columns: [
                {
                  type: "Column",
                  width: "auto",
                  verticalContentAlignment: "Center",
                  items: [icon("Alert", { size: "xSmall", color: "Attention" })],
                },
                {
                  type: "Column",
                  width: "stretch",
                  spacing: "Small",
                  verticalContentAlignment: "Center",
                  items: [
                    {
                      type: "RichTextBlock",
                      inlines: summaryParts.flatMap((part, i) => {
                        const isFirst = i === 0;
                        const isDecision = isFirst && decisions.length > 0;
                        const nodes: Record<string, unknown>[] = [];
                        if (i > 0) nodes.push({ type: "TextRun", text: "  ·  " });
                        nodes.push({
                          type: "TextRun",
                          text: part.replace(/\*\*/g, ""),
                          ...(isDecision && { weight: "Bolder", color: "Attention" }),
                        });
                        return nodes;
                      }),
                    },
                  ],
                },
              ],
            },
          ]
        : []),
      ...(decisions.length > 0
        ? [collapsibleSection({ id: "decisions", label: "Decisions Needed", items: decisionItems, defaultExpanded: true })]
        : []),
      ...(pending.length > 0
        ? [collapsibleSection({ id: "pending", label: "Pending from Others", items: pendingItems, spacing: "Small" })]
        : []),
      ...(meetings.length > 0
        ? [collapsibleSection({ id: "meetings", label: "Today's Meetings", items: meetingItems, spacing: "Small" })]
        : []),
      textBlock(
        decisions.length + pending.length + meetings.length > 0
          ? "Reply with a project name to drill down or draft a follow-up."
          : "No action items today. Ask about a specific project if you need a drill-down.",
        { size: "Small", isSubtle: true, spacing: "Medium" },
      ),
    ] as Record<string, unknown>[],
    actions: [
      { type: "Action.OpenUrl", title: "Open Alleato", url: ALLEATO_URL },
    ],
  };
}

// ---------------------------------------------------------------------------
// 2. Task List
// ---------------------------------------------------------------------------

export type TaskPriority = "high" | "medium" | "low";
export type TaskStatus = "open" | "in_progress";

export interface TaskListItem {
  id: string;
  title: string;
  project: string | null;
  dueDate: string | null;
  isOverdue: boolean;
  priority: TaskPriority;
  status: TaskStatus;
}

export interface TaskListCardData {
  tasks: TaskListItem[];
  viewAllUrl?: string;
}

const PRIORITY_COLOR: Record<TaskPriority, "Attention" | "Warning" | "Default"> = {
  high: "Attention",
  medium: "Warning",
  low: "Default",
};

export function buildTaskListCard(data: TaskListCardData): AdaptiveCardJson {
  const { tasks, viewAllUrl = ALLEATO_URL } = data;

  const today = tasks.filter((t) => t.isOverdue || t.dueDate === "Today");
  const thisWeek = tasks.filter((t) => !t.isOverdue && t.dueDate !== "Today" && t.priority !== "low");
  const upcoming = tasks.filter((t) => t.priority === "low" && !t.isOverdue && t.dueDate !== "Today");

  const overdueCount = tasks.filter((t) => t.isOverdue).length;
  const subtitle = `${tasks.length} open${overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}`;

  function taskRow(task: TaskListItem, index: number): Record<string, unknown> {
    const color = task.isOverdue ? "Attention" : PRIORITY_COLOR[task.priority];
    return {
      type: "ColumnSet",
      spacing: index === 0 ? "Small" : "Small",
      ...(index > 0 && { separator: true }),
      columns: [
        {
          type: "Column",
          width: "auto",
          verticalContentAlignment: "Top",
          items: [icon("CircleSmall", { size: "Small", color })],
        },
        {
          type: "Column",
          width: "stretch",
          spacing: "Small",
          items: [
            textBlock(task.title, { weight: "Bolder", wrap: true }),
            ...(task.project
              ? [textBlock(task.project, { size: "Small", isSubtle: true, spacing: "None", wrap: false })]
              : []),
          ],
        },
        ...(task.dueDate
          ? [
              {
                type: "Column",
                width: "auto",
                verticalContentAlignment: "Top",
                items: [
                  textBlock(task.dueDate, {
                    size: "Small",
                    color: task.isOverdue ? "Attention" : task.priority === "medium" ? "Warning" : undefined,
                    isSubtle: task.priority === "low" && !task.isOverdue,
                    weight: task.isOverdue || task.priority !== "low" ? "Bolder" : "Default",
                    wrap: false,
                  }),
                ],
              },
            ]
          : []),
      ],
    };
  }

  const sections: Record<string, unknown>[] = [];

  if (today.length > 0) {
    sections.push(
      textBlock("DUE TODAY", { size: "Small", weight: "Bolder", color: "Attention", spacing: "Medium" }),
      { type: "Container", separator: true, spacing: "Small", items: today.map(taskRow) },
    );
  }
  if (thisWeek.length > 0) {
    sections.push(
      textBlock("THIS WEEK", { size: "Small", weight: "Bolder", isSubtle: true, spacing: "Medium" }),
      { type: "Container", separator: true, spacing: "Small", items: thisWeek.map(taskRow) },
    );
  }
  if (upcoming.length > 0) {
    sections.push(
      textBlock("UPCOMING", { size: "Small", weight: "Bolder", isSubtle: true, spacing: "Medium" }),
      { type: "Container", separator: true, spacing: "Small", items: upcoming.map(taskRow) },
    );
  }

  return {
    type: "AdaptiveCard",
    $schema: SCHEMA,
    version: VERSION,
    body: [
      {
        type: "ColumnSet",
        columns: [
          {
            type: "Column",
            width: "stretch",
            items: [
              textBlock("Your Tasks", { size: "Large", weight: "Bolder", wrap: false }),
              textBlock(subtitle, { size: "Small", isSubtle: true, spacing: "None", wrap: false }),
            ],
          },
        ],
      },
      ...sections,
    ] as Record<string, unknown>[],
    actions: [{ type: "Action.OpenUrl", title: "View all tasks", url: viewAllUrl }],
  };
}

// ---------------------------------------------------------------------------
// 3. Meeting Recap
// ---------------------------------------------------------------------------

export interface MeetingRecapDecision {
  text: string;
}

export interface MeetingRecapActionItem {
  title: string;
  assignee: string;
  dueDate: string | null;
  isUrgent?: boolean;
}

export interface MeetingRecapCardData {
  meetingTitle: string;
  dateTimeDisplay: string;
  durationDisplay: string;
  attendees: string[];
  decisions: MeetingRecapDecision[];
  actionItems: MeetingRecapActionItem[];
  nextSteps: string | null;
  viewUrl?: string;
  createFollowUpUrl?: string;
}

export function buildMeetingRecapCard(data: MeetingRecapCardData): AdaptiveCardJson {
  const {
    meetingTitle,
    dateTimeDisplay,
    durationDisplay,
    attendees,
    decisions,
    actionItems,
    nextSteps,
    viewUrl = ALLEATO_URL,
    createFollowUpUrl = ALLEATO_URL,
  } = data;

  const attendeeDisplay = attendees.slice(0, 4).join(", ") + (attendees.length > 4 ? ` +${attendees.length - 4}` : "");

  const decisionFacts = decisions.map((d, i) => ({
    title: `${i + 1}.`,
    value: d.text,
  }));

  const actionRows = actionItems.map((a, i) => ({
    type: "ColumnSet",
    spacing: i === 0 ? "None" : "Small",
    ...(i > 0 && { separator: true }),
    columns: [
      {
        type: "Column",
        width: "stretch",
        items: [textBlock(a.title, { size: "Small", weight: "Bolder" })],
      },
      {
        type: "Column",
        width: "auto",
        verticalContentAlignment: "Top",
        items: [
          textBlock(a.assignee, { size: "Small", isSubtle: true, horizontalAlignment: "Right", wrap: false }),
          ...(a.dueDate
            ? [
                textBlock(a.dueDate, {
                  size: "Small",
                  color: a.isUrgent ? "Attention" : a.dueDate !== "No deadline" ? "Warning" : undefined,
                  isSubtle: !a.isUrgent,
                  weight: a.isUrgent ? "Bolder" : "Default",
                  horizontalAlignment: "Right",
                  spacing: "None",
                  wrap: false,
                }),
              ]
            : []),
        ],
      },
    ],
  }));

  return {
    type: "AdaptiveCard",
    $schema: SCHEMA,
    version: VERSION,
    body: [
      {
        type: "ColumnSet",
        columns: [
          {
            type: "Column",
            width: "stretch",
            items: [
              textBlock(meetingTitle, { size: "Large", weight: "Bolder" }),
              textBlock(dateTimeDisplay, { size: "Small", isSubtle: true, spacing: "None", wrap: false }),
            ],
          },
        ],
      },
      {
        type: "ColumnSet",
        spacing: "Small",
        columns: [
          {
            type: "Column",
            width: "auto",
            verticalContentAlignment: "Center",
            items: [icon("Clock", { size: "xxSmall" })],
          },
          {
            type: "Column",
            width: "auto",
            spacing: "Small",
            verticalContentAlignment: "Center",
            items: [textBlock(durationDisplay, { size: "Small", isSubtle: true, wrap: false })],
          },
          {
            type: "Column",
            width: "auto",
            spacing: "Medium",
            verticalContentAlignment: "Center",
            items: [icon("People", { size: "xxSmall" })],
          },
          {
            type: "Column",
            width: "stretch",
            spacing: "Small",
            verticalContentAlignment: "Center",
            items: [textBlock(attendeeDisplay, { size: "Small", isSubtle: true, wrap: false })],
          },
        ],
      },
      ...(decisions.length > 0
        ? [
            collapsibleSection({
              id: "decisions",
              label: "Key Decisions",
              defaultExpanded: true,
              items: [{ type: "FactSet", facts: decisionFacts }],
            }),
          ]
        : []),
      ...(actionItems.length > 0
        ? [collapsibleSection({ id: "actions", label: "Action Items", items: actionRows, spacing: "Small" })]
        : []),
      ...(nextSteps
        ? [
            {
              type: "Container",
              spacing: "Small",
              separator: true,
              items: [
                textBlock("Next Steps", { weight: "Bolder" }),
                textBlock(nextSteps, { size: "Small", isSubtle: true, spacing: "Small" }),
              ],
            },
          ]
        : []),
    ] as Record<string, unknown>[],
    actions: [
      { type: "Action.OpenUrl", title: "View full recap", url: viewUrl },
      { type: "Action.OpenUrl", title: "Create follow-up task", url: createFollowUpUrl },
    ],
  };
}

// ---------------------------------------------------------------------------
// 4. Pulse Survey
// ---------------------------------------------------------------------------

export interface SurveyChoice {
  title: string;
  value: string;
}

export interface SurveyQuestion {
  id: string;
  label: string;
  choices: SurveyChoice[];
}

export interface SurveyCardData {
  title: string;
  subtitle: string;
  periodLabel: string;
  questions: SurveyQuestion[];
  commentsQuestion?: {
    id: string;
    label: string;
    placeholder?: string;
  };
  submitActionData?: Record<string, unknown>;
}

export function buildSurveyCard(data: SurveyCardData): AdaptiveCardJson {
  const { title, subtitle, periodLabel, questions, commentsQuestion, submitActionData } = data;

  const questionBlocks = questions.map((q, i) => ({
    type: "Container",
    spacing: "Medium",
    separator: true,
    items: [
      textBlock(q.label, { weight: "Bolder" }),
      {
        type: "Input.ChoiceSet",
        id: q.id,
        style: "expanded",
        isMultiSelect: false,
        spacing: "Small",
        choices: q.choices,
      },
    ],
  }));

  return {
    type: "AdaptiveCard",
    $schema: SCHEMA,
    version: VERSION,
    body: [
      {
        type: "ColumnSet",
        columns: [
          {
            type: "Column",
            width: "stretch",
            items: [
              textBlock(title, { size: "Large", weight: "Bolder", wrap: false }),
              textBlock(subtitle, { size: "Small", isSubtle: true, spacing: "None", wrap: false }),
            ],
          },
          {
            type: "Column",
            width: "auto",
            verticalContentAlignment: "Top",
            items: [
              textBlock(periodLabel, { size: "Small", isSubtle: true, horizontalAlignment: "Right", wrap: false }),
            ],
          },
        ],
      },
      ...questionBlocks,
      ...(commentsQuestion
        ? [
            {
              type: "Container",
              spacing: "Medium",
              separator: true,
              items: [
                textBlock(commentsQuestion.label, { weight: "Bolder" }),
                {
                  type: "Input.Text",
                  id: commentsQuestion.id,
                  placeholder: commentsQuestion.placeholder ?? "Optional",
                  isMultiline: true,
                  maxLength: 400,
                  spacing: "Small",
                },
              ],
            },
          ]
        : []),
    ] as Record<string, unknown>[],
    actions: [
      {
        type: "Action.Submit",
        title: "Submit",
        data: submitActionData ?? { action: "survey_submit" },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Ready-made weekly pulse survey (pre-configured defaults)
// ---------------------------------------------------------------------------

export function buildWeeklyPulseCard(weekLabel: string): AdaptiveCardJson {
  return buildSurveyCard({
    title: "Weekly Pulse",
    subtitle: "Takes about 60 seconds.",
    periodLabel: weekLabel,
    questions: [
      {
        id: "portfolio_health",
        label: "How is the portfolio tracking overall this week?",
        choices: [
          { title: "On track — no major issues", value: "on_track" },
          { title: "Minor issues being managed", value: "minor_issues" },
          { title: "One or more projects need attention", value: "needs_attention" },
          { title: "Significant problems in play", value: "significant_problems" },
        ],
      },
      {
        id: "top_concern",
        label: "Which area is your biggest concern right now?",
        choices: [
          { title: "Schedule", value: "schedule" },
          { title: "Budget or cost control", value: "budget" },
          { title: "Subcontractor performance", value: "subcontractors" },
          { title: "Owner or design decisions pending", value: "owner_decisions" },
          { title: "No major concern this week", value: "none" },
        ],
      },
    ],
    commentsQuestion: {
      id: "needs_from_leadership",
      label: "Anything the team needs from you before Friday?",
      placeholder: "Optional — any pending approvals, escalations, or decisions",
    },
    submitActionData: { action: "submit_pulse_survey" },
  });
}
