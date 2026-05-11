"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ActivityIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ClipboardIcon,
  FileTextIcon,
  FolderIcon,
  GitBranchIcon,
  ListChecksIcon,
  MailIcon,
  SendIcon,
  ShieldCheckIcon,
  SparklesIcon,
  SquarePenIcon,
  TrendingUpIcon,
  UsersRoundIcon,
} from "lucide-react";
import { toast } from "sonner";

import { InfoAlert } from "@/components/ds/InfoAlert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  AssistantWidgetField,
  AssistantWidgetPayload,
  CreateEventWidgetPayload,
  CreateTaskWidgetPayload,
  CreativeDraftWidgetPayload,
  DecisionPacketWidgetPayload,
  DraftEmailWidgetPayload,
  FinancialPulseWidgetPayload,
  MeetingIntelligenceWidgetPayload,
  MeetingInsightsWidgetPayload,
  OwnerActionQueueWidgetPayload,
  OwnerSnapshotWidgetPayload,
  ProjectActionPreviewWidgetPayload,
  ProjectPickerWidgetPayload,
  RecordWritePreviewWidgetPayload,
  RiskExposurePacketWidgetPayload,
  SourceEvidenceDrawerWidgetPayload,
  TaskSummaryWidgetPayload,
} from "@/lib/ai/assistant-widgets";
import type { FeatureRequestPacketWidgetPayload } from "@/lib/feature-requests/types";

type SourceItem = {
  document_id?: string;
  snippet?: string;
  metadata?: {
    id?: string;
    meeting_id?: string;
    metadata_id?: string;
    file_id?: string;
    project_id?: number | string;
    type?: string;
    category?: string;
    source?: string;
    url?: string;
    fireflies_link?: string;
    title?: string;
    doc_type?: string;
  };
};

type AssistantWidgetRendererProps = {
  widget: AssistantWidgetPayload;
  selectedProjectId?: number | null;
  onSubmit: (message: string) => void;
  onEditDraft: (message: string) => void;
};

function WidgetShell({
  title,
  icon,
  eyebrow,
  children,
  actions,
  className,
}: {
  title: string;
  icon: ReactNode;
  eyebrow: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "mb-3 overflow-hidden rounded-lg border border-border bg-background",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border/70 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase text-muted-foreground">
              {eyebrow}
            </div>
            <div className="truncate text-sm font-semibold text-foreground">
              {title}
            </div>
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className="space-y-3 px-3 py-3">{children}</div>
    </section>
  );
}

function WidgetMeta({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "danger" }) {
  return (
    <span
      className={cn(
        "whitespace-nowrap text-right text-xs font-medium capitalize",
        tone === "danger" ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
  toast.success("Copied");
}

function DraftEmailWidget({
  widget,
  onSubmit,
  onEditDraft,
}: {
  widget: DraftEmailWidgetPayload;
  onSubmit: (message: string) => void;
  onEditDraft: (message: string) => void;
}) {
  const [to, setTo] = useState(widget.defaultTo);
  const [subject, setSubject] = useState(widget.defaultSubject);
  const [body, setBody] = useState(widget.defaultBody);

  const draft = useMemo(
    () =>
      [
        "Email draft",
        `To: ${to || "[recipient needed]"}`,
        `Subject: ${subject || "[subject needed]"}`,
        "",
        body || "[body needed]",
      ].join("\n"),
    [body, subject, to],
  );

  return (
    <WidgetShell
      eyebrow="Editable draft"
      title={widget.title}
      icon={<MailIcon className="h-4 w-4" />}
      actions={<WidgetMeta>Email</WidgetMeta>}
    >
      {widget.emailFrom ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="w-16 shrink-0 text-xs font-medium uppercase text-muted-foreground">From</span>
          <span className="truncate text-muted-foreground">{widget.emailFrom}</span>
        </div>
      ) : null}
      <div className="grid gap-2">
        <label className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-xs font-medium uppercase text-muted-foreground">To</span>
          <Input value={to} onChange={(event) => setTo(event.target.value)} placeholder="name@example.com" />
        </label>
        <label className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-xs font-medium uppercase text-muted-foreground">Subject</span>
          <Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Email subject" />
        </label>
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Write your message"
          className="min-h-40 resize-y"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onSubmit(`Use this email draft and prepare it for sending:\n\n${draft}`)}>
          <SendIcon className="h-4 w-4" />
          Stage send
        </Button>
        <Button size="sm" variant="outline" onClick={() => onEditDraft(draft)}>
          <SquarePenIcon className="h-4 w-4" />
          Edit in chat
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void copyToClipboard(draft)}>
          <ClipboardIcon className="h-4 w-4" />
          Copy
        </Button>
      </div>
    </WidgetShell>
  );
}

function CreateTaskWidget({
  widget,
  selectedProjectId,
  onSubmit,
  onEditDraft,
}: {
  widget: CreateTaskWidgetPayload;
  selectedProjectId?: number | null;
  onSubmit: (message: string) => void;
  onEditDraft: (message: string) => void;
}) {
  const [title, setTitle] = useState(widget.defaultTitle);
  const [body, setBody] = useState(widget.defaultBody);
  const [dueDate, setDueDate] = useState(widget.defaultDueDate ?? "");
  const [assignee, setAssignee] = useState(widget.defaultAssignee ?? "");
  const projectId = selectedProjectId ?? widget.projectId ?? null;
  const taskPrompt = [
    "Create this as a Tasks page task using createGeneratedTask. Show the final write preview first and wait for my confirmation.",
    `Project ID: ${projectId ?? "[resolve project first]"}`,
    `Title: ${title}`,
    `Assignee: ${assignee || "Unassigned"}`,
    `Due date: ${dueDate || "No due date"}`,
    `Priority: ${widget.defaultPriority}`,
    "",
    body,
  ].join("\n");

  return (
    <WidgetShell
      eyebrow="Action draft"
      title={widget.title}
      icon={<CheckCircle2Icon className="h-4 w-4" />}
      actions={<WidgetMeta>Task</WidgetMeta>}
    >
      {!projectId ? (
        <InfoAlert variant="warning">
          <span>Select or resolve a project before this can become a real task.</span>
        </InfoAlert>
      ) : null}
      <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Task title" />
      <Textarea value={body} onChange={(event) => setBody(event.target.value)} className="min-h-28 resize-y" />
      <div className="grid gap-2 sm:grid-cols-2">
        <Input value={assignee} onChange={(event) => setAssignee(event.target.value)} placeholder="Assignee" />
        <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onSubmit(taskPrompt)}>
          <CheckCircle2Icon className="h-4 w-4" />
          Create preview
        </Button>
        <Button size="sm" variant="outline" onClick={() => onEditDraft(taskPrompt)}>
          <SquarePenIcon className="h-4 w-4" />
          Edit in chat
        </Button>
      </div>
    </WidgetShell>
  );
}

function formatDateLabel(value?: string | null) {
  if (!value) return null;
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(Number(year), Number(month) - 1, Number(day)));
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function TaskSummaryWidget({ widget }: { widget: TaskSummaryWidgetPayload }) {
  return (
    <WidgetShell
      eyebrow="Verified task register"
      title={widget.title}
      icon={<CheckCircle2Icon className="h-4 w-4" />}
      actions={<WidgetMeta>{widget.totalCount} tasks</WidgetMeta>}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{widget.subtitle}</span>
        <span className="font-medium text-foreground">{widget.dateLabel}</span>
      </div>

      {widget.items.length === 0 ? (
        <InfoAlert>
          <span>{widget.emptyState ?? "No task rows matched this request."}</span>
        </InfoAlert>
      ) : (
        <div className="divide-y divide-border/70">
          {widget.items.map((task) => (
            <div key={task.id} className="grid gap-2 py-3 first:pt-0 last:pb-0">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                <Link
                  href={task.href}
                  className="min-w-0 text-sm font-semibold text-foreground underline-offset-4 hover:underline"
                >
                  {task.title}
                </Link>
                <div className="shrink-0 text-right text-xs text-muted-foreground">
                  {[task.status, task.priority].filter(Boolean).join(" / ")}
                </div>
              </div>
              {task.description ? (
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {task.description}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {task.assigneeName ? <span>Owner: {task.assigneeName}</span> : null}
                {task.projectName ? <span>Project: {task.projectName}</span> : null}
                {task.dueDate ? <span>Due: {formatDateLabel(task.dueDate)}</span> : null}
                {task.sourceTitle ? <span>Source: {task.sourceTitle}</span> : null}
                <span>Created: {formatDateLabel(task.createdAt) ?? task.createdAt}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}

function toTextList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function normalizeMeetingToolOutput(output: unknown): MeetingIntelligenceWidgetPayload | null {
  const record = asRecord(output);
  if (record.type === "meeting_intelligence") {
    return record as MeetingIntelligenceWidgetPayload;
  }

  const meetings = Array.isArray(record.meetings) ? record.meetings : [];
  if (meetings.length === 0 && typeof record.meetingCount !== "number") return null;

  return {
    type: "meeting_intelligence",
    id: typeof record.id === "string" ? record.id : "meeting-intelligence",
    title: typeof record.title === "string" ? record.title : "Meeting intelligence",
    subtitle: typeof record.subtitle === "string" ? record.subtitle : "Structured meeting readout",
    dateLabel: typeof record.dateLabel === "string" ? record.dateLabel : "Selected window",
    meetingCount: typeof record.meetingCount === "number" ? record.meetingCount : meetings.length,
    criticalRiskCount: typeof record.criticalRiskCount === "number" ? record.criticalRiskCount : 0,
    decisionCount: typeof record.decisionCount === "number" ? record.decisionCount : 0,
    actionItemCount: typeof record.actionItemCount === "number" ? record.actionItemCount : 0,
    topInsights: toTextList(record.topInsights),
    recommendedNextActions: toTextList(record.recommendedNextActions),
    emptyState: typeof record.emptyState === "string" ? record.emptyState : undefined,
    meetings: meetings.map((item, index) => {
      const meeting = asRecord(item);
      const id = typeof meeting.id === "string" ? meeting.id : `meeting-${index + 1}`;
      const projectId = typeof meeting.projectId === "number" ? meeting.projectId : null;
      return {
        id,
        title: typeof meeting.title === "string" ? meeting.title : "Untitled meeting",
        projectId,
        projectName: typeof meeting.projectName === "string" ? meeting.projectName : null,
        date: typeof meeting.date === "string" ? meeting.date : null,
        source: typeof meeting.source === "string" ? meeting.source : null,
        summary: typeof meeting.summary === "string" ? meeting.summary : null,
        criticalRisks: toTextList(meeting.criticalRisks),
        decisions: toTextList(meeting.decisions),
        actionItems: toTextList(meeting.actionItems),
        href: typeof meeting.href === "string" ? meeting.href : projectId ? `/${projectId}/meetings/${id}` : `/meetings/${id}`,
      };
    }),
  };
}

function MeetingIntelligenceWidget({ widget }: { widget: MeetingIntelligenceWidgetPayload }) {
  return (
    <WidgetShell
      eyebrow="Meeting intelligence"
      title={widget.title}
      icon={<UsersRoundIcon className="h-4 w-4" />}
      actions={<WidgetMeta>{widget.meetingCount} meetings</WidgetMeta>}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{widget.subtitle}</span>
        <span className="font-medium text-foreground">{widget.dateLabel}</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        {[
          ["Meetings", widget.meetingCount],
          ["Critical risks", widget.criticalRiskCount],
          ["Decisions", widget.decisionCount],
          ["Action items", widget.actionItemCount],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md bg-muted/40 px-3 py-2">
            <div className="text-[11px] font-medium uppercase text-muted-foreground">{label}</div>
            <div className="mt-1 text-lg font-semibold text-foreground">{value}</div>
          </div>
        ))}
      </div>

      {widget.topInsights.length > 0 ? (
        <div>
          <div className="text-xs font-medium text-muted-foreground">Top insights</div>
          <ul className="mt-1 space-y-1 text-sm text-foreground">
            {widget.topInsights.slice(0, 4).map((insight) => (
              <li key={insight} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {widget.meetings.length === 0 ? (
        <InfoAlert>
          <span>{widget.emptyState ?? "No meeting rows matched this request."}</span>
        </InfoAlert>
      ) : (
        <div className="divide-y divide-border/70">
          {widget.meetings.map((meeting) => (
            <div key={meeting.id} className="grid gap-2 py-3 first:pt-0 last:pb-0">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                <Link
                  href={meeting.href}
                  className="min-w-0 text-sm font-semibold text-foreground underline-offset-4 hover:underline"
                >
                  {meeting.title}
                </Link>
                <div className="shrink-0 text-right text-xs text-muted-foreground">
                  {[
                    meeting.criticalRisks.length > 0 ? `${meeting.criticalRisks.length} risks` : null,
                    meeting.decisions.length > 0 ? `${meeting.decisions.length} decisions` : null,
                  ].filter(Boolean).join(" / ")}
                </div>
              </div>
              {meeting.summary ? (
                <p className="line-clamp-2 text-sm text-muted-foreground">{meeting.summary}</p>
              ) : null}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {meeting.projectName ? <span>Project: {meeting.projectName}</span> : null}
                {meeting.date ? <span>Date: {formatDateLabel(meeting.date) ?? meeting.date}</span> : null}
                {meeting.source ? <span>Source: {meeting.source}</span> : null}
                {meeting.actionItems.length > 0 ? <span>Actions: {meeting.actionItems.length}</span> : null}
              </div>
              {meeting.criticalRisks.length > 0 ? (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {meeting.criticalRisks[0]}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {widget.recommendedNextActions.length > 0 ? (
        <div>
          <div className="text-xs font-medium text-muted-foreground">Recommended next actions</div>
          <ul className="mt-1 space-y-1 text-sm text-foreground">
            {widget.recommendedNextActions.slice(0, 3).map((action) => (
              <li key={action} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </WidgetShell>
  );
}

function OwnerSnapshotWidget({
  widget,
  onSubmit,
}: {
  widget: OwnerSnapshotWidgetPayload;
  onSubmit: (message: string) => void;
}) {
  return (
    <WidgetShell
      eyebrow="Owner snapshot"
      title={widget.title}
      icon={<ActivityIcon className="h-4 w-4" />}
      actions={<WidgetMeta>{widget.status.replaceAll("_", " ")}</WidgetMeta>}
    >
      <div className="space-y-1">
        <p className="text-sm text-foreground">{widget.summary}</p>
        <p className="text-xs text-muted-foreground">
          {widget.projectName} - As of {formatDateLabel(widget.asOf) ?? widget.asOf}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {widget.healthSignals.slice(0, 6).map((signal) => (
          <div key={signal.label} className="rounded-md bg-muted/40 px-3 py-2">
            <div className="text-[11px] font-medium uppercase text-muted-foreground">{signal.label}</div>
            <div className="mt-1 truncate text-sm font-semibold text-foreground">{signal.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="text-xs font-medium text-muted-foreground">Money</div>
          <div className="mt-1 grid gap-1 text-sm text-foreground">
            {Object.entries(widget.money).map(([label, value]) =>
              value ? (
                <div key={label} className="flex justify-between gap-3 border-b border-border/60 py-1 last:border-0">
                  <span className="capitalize text-muted-foreground">{label.replace(/([A-Z])/g, " $1")}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ) : null,
            )}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">Owner actions</div>
          <div className="mt-1 divide-y divide-border/60">
            {widget.ownerActions.slice(0, 4).map((action) => (
              <div key={action.id} className="py-2 text-sm">
                <div className="font-medium text-foreground">{action.title}</div>
                {action.projectName || action.ownerName ? (
                  <div className="text-xs text-muted-foreground">
                    {[action.projectName, action.ownerName].filter(Boolean).join(" - ")}
                  </div>
                ) : null}
              </div>
            ))}
            {widget.ownerActions.length === 0 ? (
              <div className="py-2 text-sm text-muted-foreground">No owner actions were returned.</div>
            ) : null}
          </div>
        </div>
      </div>

      {widget.dataGaps.length > 0 ? (
        <InfoAlert variant="warning">
          <span>{widget.dataGaps.slice(0, 3).join(" ")}</span>
        </InfoAlert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => onSubmit(`Create a follow-up task from the owner snapshot for project ${widget.projectId}. Show a preview before writing.`)}
        >
          <CheckCircle2Icon className="h-4 w-4" />
          Create task
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onSubmit(`Draft an owner update from this snapshot for ${widget.projectName}. Keep it source-backed and client-safe.`)}
        >
          <MailIcon className="h-4 w-4" />
          Draft update
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onSubmit(`Ask the CFO to analyze the money impact for ${widget.projectName} using this snapshot.`)}
        >
          <TrendingUpIcon className="h-4 w-4" />
          Ask CFO
        </Button>
      </div>
    </WidgetShell>
  );
}

function OwnerActionQueueWidget({
  widget,
  onSubmit,
}: {
  widget: OwnerActionQueueWidgetPayload;
  onSubmit: (message: string) => void;
}) {
  return (
    <WidgetShell
      eyebrow="Owner action queue"
      title={widget.title}
      icon={<ListChecksIcon className="h-4 w-4" />}
      actions={<WidgetMeta>{widget.totalCount} actions</WidgetMeta>}
    >
      <p className="text-sm text-muted-foreground">{widget.subtitle}</p>
      {widget.totalCount === 0 ? (
        <InfoAlert>
          <span>{widget.emptyState ?? "No owner actions matched this request."}</span>
        </InfoAlert>
      ) : (
        <div className="space-y-4">
          {widget.groups.map((group) => (
            <div key={group.id}>
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                {group.title}
              </div>
              <div className="divide-y divide-border/60">
                {group.items.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-4 py-2.5">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">{item.title}</div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {item.projectName ? <span>{item.projectName}</span> : null}
                        {item.ownerName ? <span>Owner: {item.ownerName}</span> : null}
                        {item.dueDate ? <span>Due: {formatDateLabel(item.dueDate)}</span> : null}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 shrink-0 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => onSubmit(`Create or update the recommended action for this owner queue item. Show a preview first.\n\n${JSON.stringify(item, null, 2)}`)}
                    >
                      Preview
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}

function MeetingInsightsWidget({
  widget,
  onSubmit,
}: {
  widget: MeetingInsightsWidgetPayload;
  onSubmit: (message: string) => void;
}) {
  return (
    <WidgetShell
      eyebrow="Meeting insights"
      title={widget.title}
      icon={<UsersRoundIcon className="h-4 w-4" />}
      actions={<WidgetMeta>{widget.dateLabel}</WidgetMeta>}
    >
      <p className="text-sm text-muted-foreground">{widget.subtitle}</p>
      <div className="grid gap-2 sm:grid-cols-5">
        {[
          ["Meetings", widget.metrics.meetingCount],
          ["Decisions", widget.metrics.decisionCount],
          ["Actions", widget.metrics.actionItemCount],
          ["Risks", widget.metrics.riskCount],
          ["Questions", widget.metrics.unresolvedQuestionCount],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md bg-muted/40 px-3 py-2">
            <div className="text-[11px] font-medium uppercase text-muted-foreground">{label}</div>
            <div className="mt-1 text-lg font-semibold text-foreground">{value}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ["Decisions", widget.decisions],
          ["Open questions", widget.unresolvedQuestions],
          ["Risks", widget.risks],
          ["Suggested tasks", widget.suggestedTasks],
        ].map(([label, items]) => {
          const list = Array.isArray(items) ? items : [];
          return (
            <div key={label as string}>
              <div className="text-xs font-medium text-muted-foreground">{label as string}</div>
              <div className="mt-1 divide-y divide-border/60">
                {list.slice(0, 4).map((item) => (
                  <div key={item.id} className="py-2 text-sm">
                    <div className="font-medium text-foreground">{item.title}</div>
                    {"detail" in item && item.detail ? (
                      <div className="text-xs text-muted-foreground">{item.detail}</div>
                    ) : null}
                  </div>
                ))}
                {list.length === 0 ? (
                  <div className="py-2 text-sm text-muted-foreground">None returned.</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => onSubmit(`Create task previews from the suggested meeting tasks in ${widget.title}.`)}
        >
          <CheckCircle2Icon className="h-4 w-4" />
          Create tasks
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onSubmit(`Draft a concise meeting recap from ${widget.title} with source-backed decisions and follow-ups.`)}
        >
          <FileTextIcon className="h-4 w-4" />
          Draft recap
        </Button>
      </div>
    </WidgetShell>
  );
}

function RiskExposurePacketWidget({
  widget,
  onSubmit,
}: {
  widget: RiskExposurePacketWidgetPayload;
  onSubmit: (message: string) => void;
}) {
  return (
    <WidgetShell
      eyebrow="Risk exposure"
      title={widget.title}
      icon={<AlertTriangleIcon className="h-4 w-4" />}
      actions={
        <WidgetMeta tone={widget.severity === "critical" ? "danger" : "muted"}>
          {widget.severity}
        </WidgetMeta>
      }
    >
      <p className="text-sm text-foreground">{widget.summary}</p>
      {widget.estimatedImpact ? (
        <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Estimated impact: </span>
          <span className="font-semibold text-foreground">{widget.estimatedImpact}</span>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onSubmit(`Create a change event preview from this risk exposure packet.\n\n${JSON.stringify(widget, null, 2)}`)}>
          <ShieldCheckIcon className="h-4 w-4" />
          Create preview
        </Button>
        <Button size="sm" variant="outline" onClick={() => onSubmit(`Draft an owner notice from this risk exposure packet. Keep it factual and source-backed.`)}>
          <MailIcon className="h-4 w-4" />
          Draft notice
        </Button>
      </div>
    </WidgetShell>
  );
}

function FinancialPulseWidget({
  widget,
  onSubmit,
}: {
  widget: FinancialPulseWidgetPayload;
  onSubmit: (message: string) => void;
}) {
  return (
    <WidgetShell
      eyebrow="Financial pulse"
      title={widget.title}
      icon={<TrendingUpIcon className="h-4 w-4" />}
      actions={<WidgetMeta>{widget.scope}</WidgetMeta>}
    >
      <p className="text-sm text-muted-foreground">{widget.subtitle}</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {widget.kpis.slice(0, 6).map((kpi) => (
          <div key={kpi.label} className="rounded-md bg-muted/40 px-3 py-2">
            <div className="text-[11px] font-medium uppercase text-muted-foreground">{kpi.label}</div>
            <div className="mt-1 text-sm font-semibold text-foreground">{kpi.value}</div>
            {kpi.delta ? <div className="text-xs text-muted-foreground">{kpi.delta}</div> : null}
          </div>
        ))}
      </div>
      <Button size="sm" variant="outline" onClick={() => onSubmit(`Explain the financial pulse and recommend the next owner action.\n\n${JSON.stringify(widget, null, 2)}`)}>
        <SparklesIcon className="h-4 w-4" />
        Recommend action
      </Button>
    </WidgetShell>
  );
}

function CreativeDraftWidget({
  widget,
  onSubmit,
  onEditDraft,
}: {
  widget: CreativeDraftWidgetPayload;
  onSubmit: (message: string) => void;
  onEditDraft: (message: string) => void;
}) {
  const [draftBody, setDraftBody] = useState(widget.draftBody);
  const draft = [widget.draftTitle, draftBody].filter(Boolean).join("\n\n");

  return (
    <WidgetShell
      eyebrow="Creative draft"
      title={widget.title}
      icon={<SparklesIcon className="h-4 w-4" />}
      actions={<WidgetMeta>{widget.sourceCheck.status.replaceAll("_", " ")}</WidgetMeta>}
    >
      <div className="grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Source facts</div>
          <div className="divide-y divide-border/60">
            {widget.sourceFacts.slice(0, 5).map((fact) => (
              <div key={`${fact.label}-${fact.value}`} className="py-2 text-sm">
                <div className="font-medium text-foreground">{fact.label}</div>
                <div className="text-xs text-muted-foreground">{fact.value}</div>
              </div>
            ))}
          </div>
        </div>
        <Textarea value={draftBody} onChange={(event) => setDraftBody(event.target.value)} className="min-h-56 resize-y" />
      </div>
      {widget.bannedClaims.length > 0 ? (
        <InfoAlert variant="warning">
          <span>Unsupported claims to avoid: {widget.bannedClaims.slice(0, 3).join("; ")}</span>
        </InfoAlert>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onSubmit(`Source-check and improve this ${widget.format} draft:\n\n${draft}`)}>
          <FileTextIcon className="h-4 w-4" />
          Source-check
        </Button>
        <Button size="sm" variant="outline" onClick={() => onEditDraft(draft)}>
          <SquarePenIcon className="h-4 w-4" />
          Edit in chat
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void copyToClipboard(draft)}>
          <ClipboardIcon className="h-4 w-4" />
          Copy
        </Button>
      </div>
    </WidgetShell>
  );
}

function SourceEvidenceDrawerWidget({ widget }: { widget: SourceEvidenceDrawerWidgetPayload }) {
  return (
    <WidgetShell
      eyebrow="Evidence"
      title={widget.title}
      icon={<FileTextIcon className="h-4 w-4" />}
      actions={<WidgetMeta>{widget.sources.length} sources</WidgetMeta>}
    >
      <div className="grid gap-2">
        {widget.sources.slice(0, 8).map((source) => {
          const body = (
            <>
              <div className="truncate text-sm font-medium text-foreground">{source.title}</div>
              {source.snippet ? <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{source.snippet}</div> : null}
            </>
          );
          return source.href ? (
            <Link key={source.id} href={source.href} className="rounded-md border border-border px-3 py-2 hover:bg-muted/50">
              {body}
            </Link>
          ) : (
            <div key={source.id} className="rounded-md border border-border px-3 py-2">
              {body}
            </div>
          );
        })}
      </div>
    </WidgetShell>
  );
}

function RecordWritePreviewWidget({
  widget,
  onSubmit,
  onEditDraft,
}: {
  widget: RecordWritePreviewWidgetPayload;
  onSubmit: (message: string) => void;
  onEditDraft: (message: string) => void;
}) {
  const [fields, setFields] = useState(widget.fields);
  const payload = {
    target: widget.target,
    fields: Object.fromEntries(fields.map((field) => [field.label, field.value])),
  };
  const prompt = `${widget.confirmPrompt}\n\n${JSON.stringify(payload, null, 2)}`;

  return (
    <WidgetShell
      eyebrow="Record write preview"
      title={widget.title}
      icon={<ShieldCheckIcon className="h-4 w-4" />}
      actions={
        <WidgetMeta tone={widget.safetyLevel === "high" ? "danger" : "muted"}>
          {widget.safetyLevel}
        </WidgetMeta>
      }
    >
      <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
        <span className="text-muted-foreground">Target: </span>
        <span className="font-medium text-foreground">{widget.target.table} - {widget.target.recordType.replaceAll("_", " ")}</span>
      </div>
      <div className="space-y-2">
        {fields.map((field, index) => (
          <label key={`${field.label}-${index}`} className="grid gap-1">
            <span className="text-xs font-medium text-muted-foreground">{field.label}</span>
            {field.multiline ? (
              <Textarea
                value={field.value}
                onChange={(event) => {
                  const next = [...fields];
                  next[index] = { ...field, value: event.target.value };
                  setFields(next);
                }}
                className="min-h-24 resize-y"
              />
            ) : (
              <Input
                value={field.value}
                onChange={(event) => {
                  const next = [...fields];
                  next[index] = { ...field, value: event.target.value };
                  setFields(next);
                }}
              />
            )}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onSubmit(prompt)}>
          <ShieldCheckIcon className="h-4 w-4" />
          {widget.actionLabel}
        </Button>
        <Button size="sm" variant="outline" onClick={() => onEditDraft(prompt)}>
          <SquarePenIcon className="h-4 w-4" />
          Edit in chat
        </Button>
      </div>
    </WidgetShell>
  );
}

function CreateEventWidget({
  widget,
  onSubmit,
  onEditDraft,
}: {
  widget: CreateEventWidgetPayload;
  onSubmit: (message: string) => void;
  onEditDraft: (message: string) => void;
}) {
  const [title, setTitle] = useState(widget.defaultTitle);
  const [time, setTime] = useState(widget.defaultTime);
  const [location, setLocation] = useState(widget.defaultLocation);
  const [agenda, setAgenda] = useState(widget.defaultAgenda);
  const prompt = [
    "Prepare this project event for scheduling:",
    `Title: ${title}`,
    `Time: ${time}`,
    `Location: ${location}`,
    `Project ID: ${widget.projectId ?? "[resolve project first]"}`,
    "",
    `Agenda:\n${agenda}`,
  ].join("\n");

  return (
    <WidgetShell
      eyebrow="Calendar draft"
      title={widget.title}
      icon={<CalendarIcon className="h-4 w-4" />}
      actions={
        <div className="text-right leading-none">
          <div className="text-[11px] uppercase text-muted-foreground">{widget.dateLabel}</div>
          <div className="text-lg font-semibold text-foreground">{widget.dateNumber}</div>
        </div>
      }
    >
      <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Event title" />
      <div className="grid gap-2 sm:grid-cols-2">
        <Input value={time} onChange={(event) => setTime(event.target.value)} placeholder="Time" />
        <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Location" />
      </div>
      <Textarea value={agenda} onChange={(event) => setAgenda(event.target.value)} className="min-h-28 resize-y" />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onSubmit(prompt)}>
          <CalendarIcon className="h-4 w-4" />
          Stage event
        </Button>
        <Button size="sm" variant="outline" onClick={() => onEditDraft(prompt)}>
          <SquarePenIcon className="h-4 w-4" />
          Edit in chat
        </Button>
      </div>
    </WidgetShell>
  );
}

function ProjectActionPreviewWidget({
  widget,
  selectedProjectId,
  onSubmit,
  onEditDraft,
}: {
  widget: ProjectActionPreviewWidgetPayload;
  selectedProjectId?: number | null;
  onSubmit: (message: string) => void;
  onEditDraft: (message: string) => void;
}) {
  const [fields, setFields] = useState(widget.fields);
  const projectId = selectedProjectId ?? widget.projectId ?? null;
  const payload = {
    actionType: widget.actionType,
    projectId: projectId ?? "[resolve project first]",
    fields: Object.fromEntries(fields.map((field) => [field.label, field.value])),
  };
  const prompt = `${widget.confirmPrompt}\n\n${JSON.stringify(payload, null, 2)}`;

  return (
    <WidgetShell
      eyebrow="Write preview"
      title={widget.title}
      icon={<ShieldCheckIcon className="h-4 w-4" />}
      actions={<WidgetMeta>{widget.actionType.replaceAll("_", " ")}</WidgetMeta>}
    >
      {!projectId ? (
        <InfoAlert variant="warning">
          <span>This needs a project before the write tool can run.</span>
        </InfoAlert>
      ) : null}
      <div className="space-y-2">
        {fields.map((field, index) => (
          <label key={`${field.label}-${index}`} className="grid gap-1">
            <span className="text-xs font-medium text-muted-foreground">{field.label}</span>
            {field.multiline ? (
              <Textarea
                value={field.value}
                onChange={(event) => {
                  const next = [...fields];
                  next[index] = { ...field, value: event.target.value };
                  setFields(next);
                }}
                className="min-h-24 resize-y"
              />
            ) : (
              <Input
                value={field.value}
                onChange={(event) => {
                  const next = [...fields];
                  next[index] = { ...field, value: event.target.value };
                  setFields(next);
                }}
              />
            )}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onSubmit(prompt)}>
          <ShieldCheckIcon className="h-4 w-4" />
          Build final preview
        </Button>
        <Button size="sm" variant="outline" onClick={() => onEditDraft(prompt)}>
          <SquarePenIcon className="h-4 w-4" />
          Edit in chat
        </Button>
      </div>
    </WidgetShell>
  );
}

function DecisionPacketWidget({
  widget,
  onSubmit,
}: {
  widget: DecisionPacketWidgetPayload;
  onSubmit: (message: string) => void;
}) {
  return (
    <WidgetShell
      eyebrow="Decision support"
      title={widget.title}
      icon={<SparklesIcon className="h-4 w-4" />}
      actions={<WidgetMeta>Confidence: {widget.confidence}</WidgetMeta>}
    >
      <div className="rounded-md bg-muted/40 px-3 py-2 text-sm text-foreground">
        {widget.recommendation}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {widget.impacts.map((impact) => (
          <div key={impact.label} className="rounded-md border border-border px-3 py-2">
            <div className="text-xs font-medium text-muted-foreground">{impact.label}</div>
            <div className="mt-1 text-sm text-foreground">{impact.value}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="text-xs font-medium text-muted-foreground">Risks</div>
          <ul className="mt-1 space-y-1 text-sm text-foreground">
            {widget.risks.map((risk) => (
              <li key={risk} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">Next actions</div>
          <ul className="mt-1 space-y-1 text-sm text-foreground">
            {widget.nextActions.map((action) => (
              <li key={action} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => onSubmit("Pull the source evidence for this decision packet and recommend the safest next action.")}
      >
        <FileTextIcon className="h-4 w-4" />
        Pull evidence
      </Button>
    </WidgetShell>
  );
}

function FeatureRequestPacketWidget({
  widget,
  onSubmit,
}: {
  widget: FeatureRequestPacketWidgetPayload;
  onSubmit: (message: string) => void;
}) {
  return (
    <WidgetShell
      eyebrow="Request packet"
      title={widget.title}
      icon={<GitBranchIcon className="h-4 w-4" />}
      actions={<WidgetMeta>{widget.readinessLabel}</WidgetMeta>}
    >
      <div className="grid gap-2 text-sm text-foreground">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2">
          <span className="text-muted-foreground">Status</span>
          <span className="font-medium">{widget.status.replaceAll("_", " ")}</span>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2">
          <span className="text-muted-foreground">Acceptance criteria</span>
          <span className="font-medium">{widget.acceptanceCriteriaCount}</span>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2">
          <span className="text-muted-foreground">Open questions</span>
          <span className="font-medium">{widget.openQuestions.length}</span>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2">
          <span className="text-muted-foreground">Linear</span>
          <span className="font-medium">{(widget.linearSyncStatus ?? "not_started").replaceAll("_", " ")}</span>
        </div>
      </div>
      {widget.openQuestions.length > 0 ? (
        <div>
          <div className="text-xs font-medium text-muted-foreground">Clarify next</div>
          <ul className="mt-1 space-y-1 text-sm text-foreground">
            {widget.openQuestions.slice(0, 3).map((question) => (
              <li key={question} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                <span>{question}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" asChild>
          <Link href={widget.detailHref}>
            <FileTextIcon className="h-4 w-4" />
            Open packet
          </Link>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            onSubmit(`Generate the implementation plan, Linear issue draft, Linear sub-issue drafts, and Claude Code handoff for feature request ${widget.requestId}.`)
          }
        >
          <GitBranchIcon className="h-4 w-4" />
          Build handoff
        </Button>
      </div>
    </WidgetShell>
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function getSourceTitle(source: SourceItem, index: number): string {
  return source.metadata?.title || source.metadata?.source || `Source ${index + 1}`;
}

function getSourceHref(source: SourceItem): string | null {
  const metadata = asRecord(source.metadata);
  const externalLink = [metadata.url, metadata.fireflies_link]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .find((value) => Boolean(value && /^https?:\/\//.test(value)));
  if (externalLink) return externalLink;

  const projectId =
    typeof metadata.project_id === "number"
      ? metadata.project_id
      : Number(metadata.project_id);
  const recordId = String(
    metadata.meeting_id ?? metadata.metadata_id ?? metadata.file_id ?? metadata.id ?? source.document_id ?? "",
  ).trim();
  const type = String(metadata.doc_type ?? metadata.type ?? metadata.category ?? "").toLowerCase();

  if (!recordId) return null;
  if (type.includes("meeting")) return `/meetings/${recordId}`;
  if (!projectId) return null;
  if (type.includes("rfi")) return `/${projectId}/rfis/${recordId}`;
  if (type.includes("submittal")) return `/${projectId}/submittals/${recordId}`;
  if (type.includes("change event")) return `/${projectId}/change-events/${recordId}`;
  return null;
}

export function AssistantSourceEvidenceWidget({
  sources,
}: {
  sources: unknown[];
}) {
  const validSources = (sources as SourceItem[]).filter(
    (source) => source.snippet || source.metadata?.title,
  );

  if (validSources.length === 0) return null;

  return (
    <WidgetShell
      eyebrow="Evidence"
      title="Source evidence used"
      icon={<FileTextIcon className="h-4 w-4" />}
      actions={<WidgetMeta>{validSources.length} sources</WidgetMeta>}
    >
      <div className="grid gap-2">
        {validSources.slice(0, 5).map((source, index) => {
          const title = getSourceTitle(source, index);
          const href = getSourceHref(source);
          const snippet = source.snippet ? `${source.snippet.slice(0, 180)}...` : null;
          const body = (
            <>
              <div className="truncate text-sm font-medium text-foreground">{title}</div>
              {snippet ? (
                <div className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {snippet}
                </div>
              ) : null}
            </>
          );

          return href ? (
            <Link
              key={`${title}-${index}`}
              href={href}
              className="rounded-md border border-border px-3 py-2 hover:bg-muted/50"
            >
              {body}
            </Link>
          ) : (
            <div key={`${title}-${index}`} className="rounded-md border border-border px-3 py-2">
              {body}
            </div>
          );
        })}
      </div>
    </WidgetShell>
  );
}

function ProjectPickerWidget({
  widget,
  onSubmit,
}: {
  widget: ProjectPickerWidgetPayload;
  onSubmit: (message: string) => void;
}) {
  return (
    <WidgetShell
      title={widget.title}
      eyebrow="Project picker"
      icon={<FolderIcon className="h-4 w-4" />}
      actions={<WidgetMeta>{widget.projects.length} projects</WidgetMeta>}
    >
      <p className="text-sm leading-6 text-muted-foreground">{widget.subtitle}</p>
      <div className="-mx-1 divide-y divide-border/60">
        {widget.projects.map((project) => (
          <Button
            key={project.projectId}
            type="button"
            variant="ghost"
            className="group h-auto w-full min-w-0 justify-start rounded-md px-1 py-3 text-left whitespace-normal hover:bg-muted/40"
            onClick={() => onSubmit(project.prompt)}
          >
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">
                    {project.name}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {project.client ? <span>{project.client}</span> : null}
                    {project.phase ? <span>{project.phase}</span> : null}
                    {project.state ? <span>{project.state}</span> : null}
                  </div>
                </div>
                <ArrowRightIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {project.contractValue ? <span>{project.contractValue}</span> : null}
                {typeof project.meetingCount === "number" ? (
                  <span>{project.meetingCount} meetings</span>
                ) : null}
                {typeof project.openCriticalItems === "number" && project.openCriticalItems > 0 ? (
                  <span className="text-destructive">{project.openCriticalItems} critical</span>
                ) : null}
              </div>
              {project.summary ? (
                <div className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {project.summary}
                </div>
              ) : null}
            </div>
          </Button>
        ))}
      </div>
      {widget.emptyState && widget.projects.length === 0 ? (
        <InfoAlert variant="info">{widget.emptyState}</InfoAlert>
      ) : null}
    </WidgetShell>
  );
}

type AssistantWidgetRendererComponent = (props: AssistantWidgetRendererProps) => ReactNode;

const assistantWidgetComponentRegistry: Record<AssistantWidgetPayload["type"], AssistantWidgetRendererComponent> = {
  draft_email: (props) =>
    props.widget.type === "draft_email" ? (
      <DraftEmailWidget widget={props.widget} onSubmit={props.onSubmit} onEditDraft={props.onEditDraft} />
    ) : null,
  create_task: (props) =>
    props.widget.type === "create_task" ? (
      <CreateTaskWidget
        widget={props.widget}
        selectedProjectId={props.selectedProjectId}
        onSubmit={props.onSubmit}
        onEditDraft={props.onEditDraft}
      />
    ) : null,
  task_summary: (props) =>
    props.widget.type === "task_summary" ? <TaskSummaryWidget widget={props.widget} /> : null,
  meeting_intelligence: (props) =>
    props.widget.type === "meeting_intelligence" ? <MeetingIntelligenceWidget widget={props.widget} /> : null,
  project_picker: (props) =>
    props.widget.type === "project_picker" ? (
      <ProjectPickerWidget widget={props.widget} onSubmit={props.onSubmit} />
    ) : null,
  owner_snapshot: (props) =>
    props.widget.type === "owner_snapshot" ? (
      <OwnerSnapshotWidget widget={props.widget} onSubmit={props.onSubmit} />
    ) : null,
  owner_action_queue: (props) =>
    props.widget.type === "owner_action_queue" ? (
      <OwnerActionQueueWidget widget={props.widget} onSubmit={props.onSubmit} />
    ) : null,
  meeting_insights: (props) =>
    props.widget.type === "meeting_insights" ? (
      <MeetingInsightsWidget widget={props.widget} onSubmit={props.onSubmit} />
    ) : null,
  risk_exposure_packet: (props) =>
    props.widget.type === "risk_exposure_packet" ? (
      <RiskExposurePacketWidget widget={props.widget} onSubmit={props.onSubmit} />
    ) : null,
  financial_pulse: (props) =>
    props.widget.type === "financial_pulse" ? (
      <FinancialPulseWidget widget={props.widget} onSubmit={props.onSubmit} />
    ) : null,
  creative_draft: (props) =>
    props.widget.type === "creative_draft" ? (
      <CreativeDraftWidget
        widget={props.widget}
        onSubmit={props.onSubmit}
        onEditDraft={props.onEditDraft}
      />
    ) : null,
  source_evidence_drawer: (props) =>
    props.widget.type === "source_evidence_drawer" ? (
      <SourceEvidenceDrawerWidget widget={props.widget} />
    ) : null,
  record_write_preview: (props) =>
    props.widget.type === "record_write_preview" ? (
      <RecordWritePreviewWidget
        widget={props.widget}
        onSubmit={props.onSubmit}
        onEditDraft={props.onEditDraft}
      />
    ) : null,
  create_event: (props) =>
    props.widget.type === "create_event" ? (
      <CreateEventWidget widget={props.widget} onSubmit={props.onSubmit} onEditDraft={props.onEditDraft} />
    ) : null,
  project_action_preview: (props) =>
    props.widget.type === "project_action_preview" ? (
      <ProjectActionPreviewWidget
        widget={props.widget}
        selectedProjectId={props.selectedProjectId}
        onSubmit={props.onSubmit}
        onEditDraft={props.onEditDraft}
      />
    ) : null,
  decision_packet: (props) =>
    props.widget.type === "decision_packet" ? (
      <DecisionPacketWidget widget={props.widget} onSubmit={props.onSubmit} />
    ) : null,
  feature_request_packet: (props) =>
    props.widget.type === "feature_request_packet" ? (
      <FeatureRequestPacketWidget widget={props.widget} onSubmit={props.onSubmit} />
    ) : null,
};

type AssistantToolPartForRegistry = {
  type: string;
  state: string;
  output?: unknown;
};

const assistantToolComponentRegistry: Record<string, (output: unknown) => AssistantWidgetPayload | null> = {
  getMeetingIntelligence: normalizeMeetingToolOutput,
};

export function hasAssistantDynamicToolComponent(part: AssistantToolPartForRegistry): boolean {
  return Boolean(assistantToolComponentRegistry[part.type.replace(/^tool-/, "")]);
}

export function AssistantDynamicToolRenderer({
  part,
  selectedProjectId,
  onSubmit,
  onEditDraft,
}: {
  part: AssistantToolPartForRegistry;
  selectedProjectId?: number | null;
  onSubmit: (message: string) => void;
  onEditDraft: (message: string) => void;
}) {
  if (part.state !== "output-available") return null;
  const toolName = part.type.replace(/^tool-/, "");
  const buildWidget = assistantToolComponentRegistry[toolName];
  if (!buildWidget) return null;
  const widget = buildWidget(part.output);
  if (!widget) return null;
  return (
    <AssistantWidgetRenderer
      widget={widget}
      selectedProjectId={selectedProjectId}
      onSubmit={onSubmit}
      onEditDraft={onEditDraft}
    />
  );
}

export function AssistantWidgetRenderer(props: AssistantWidgetRendererProps) {
  return assistantWidgetComponentRegistry[props.widget.type]?.(props) ?? null;
}
