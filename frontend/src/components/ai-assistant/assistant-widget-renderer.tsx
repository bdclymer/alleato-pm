"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  CalendarIcon,
  CheckCircle2Icon,
  ClipboardIcon,
  FileTextIcon,
  GitBranchIcon,
  MailIcon,
  SendIcon,
  ShieldCheckIcon,
  SparklesIcon,
  SquarePenIcon,
} from "lucide-react";
import { toast } from "sonner";

import { InfoAlert } from "@/components/ds/InfoAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  AssistantWidgetField,
  AssistantWidgetPayload,
  CreateEventWidgetPayload,
  CreateTaskWidgetPayload,
  DecisionPacketWidgetPayload,
  DraftEmailWidgetPayload,
  ProjectActionPreviewWidgetPayload,
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
      actions={<Badge variant="outline">Email</Badge>}
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
    "Create this task. Show the final write preview first and wait for my confirmation.",
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
      actions={<Badge variant="outline">Task</Badge>}
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
      actions={<Badge variant="outline">{widget.actionType.replaceAll("_", " ")}</Badge>}
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
      actions={<Badge variant="outline">Confidence: {widget.confidence}</Badge>}
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
      actions={
        <Badge variant={widget.readyForBuild ? "default" : "outline"}>
          {widget.readinessLabel}
        </Badge>
      }
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
      actions={<Badge variant="outline">{validSources.length} sources</Badge>}
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

export function AssistantWidgetRenderer(props: AssistantWidgetRendererProps) {
  switch (props.widget.type) {
    case "draft_email":
      return <DraftEmailWidget widget={props.widget} onSubmit={props.onSubmit} onEditDraft={props.onEditDraft} />;
    case "create_task":
      return (
        <CreateTaskWidget
          widget={props.widget}
          selectedProjectId={props.selectedProjectId}
          onSubmit={props.onSubmit}
          onEditDraft={props.onEditDraft}
        />
      );
    case "create_event":
      return <CreateEventWidget widget={props.widget} onSubmit={props.onSubmit} onEditDraft={props.onEditDraft} />;
    case "project_action_preview":
      return (
        <ProjectActionPreviewWidget
          widget={props.widget}
          selectedProjectId={props.selectedProjectId}
          onSubmit={props.onSubmit}
          onEditDraft={props.onEditDraft}
        />
      );
    case "decision_packet":
      return <DecisionPacketWidget widget={props.widget} onSubmit={props.onSubmit} />;
    case "feature_request_packet":
      return <FeatureRequestPacketWidget widget={props.widget} onSubmit={props.onSubmit} />;
    default:
      return null;
  }
}
