"use client";

import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Clock,
  ExternalLink,
  FileText,
  FolderOpen,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { reportNonCriticalFailure } from "@/lib/report-non-critical-failure";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateAvatar, EmptyState } from "@/components/ds";
import { PageShell } from "@/components/layout";
import { AttendeeAvatarStack } from "@/components/meetings/attendee-avatar-stack";
import { MeetingTasksManager } from "@/components/meetings/meeting-tasks-manager";
import { useProjects } from "@/hooks/use-projects";
import { apiFetch } from "@/lib/api-client";
import type { Database } from "@/types/database.types";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────

type MeetingSegment = Database["public"]["Tables"]["meeting_segments"]["Row"] & {
  opportunities?: unknown[];
};

type DocumentMetadata =
  Database["public"]["Tables"]["document_metadata"]["Row"] & {
    duration?: number;
  };

interface ParsedSections {
  firefliesId: string | null;
  firefliesLink: string | null;
  organizerEmail: string | null;
  hostEmail: string | null;
  summary: string | null;
  gist: string | null;
  keywords: string | null;
  shortSummary: string | null;
  shortOverview: string | null;
  bulletGist: string | null;
  shorthandBullet: string | null;
  outline: string | null;
  notes: string | null;
  meetingType: string | null;
  topicsDiscussed: string | null;
  transcriptChapters: string | null;
  actionItems: string | null;
  meetingAttendees: string | null;
  meetingAttendance: string | null;
  analytics: string | null;
  meetingInfo: string | null;
  channels: string | null;
  appsPreview: string | null;
  sharedWith: string | null;
  extendedSections: string | null;
  user: string | null;
  speakers: string | null;
  transcript: string | null;
}

interface RelatedMeeting {
  id: string;
  title: string | null;
  date: string | null;
  duration_minutes: number | null;
}

export interface MeetingTask {
  id: string;
  title: string | null;
  description: string;
  assignee_person_id: string | null;
  assignee_name: string | null;
  assignee_email: string | null;
  status: string;
  priority: string | null;
  due_date: string | null;
  segment_id: string | null;
}

export interface MeetingDetailContentProps {
  meeting: DocumentMetadata;
  segments: MeetingSegment[];
  parsedSections: ParsedSections | null;
  participantsList: string[];
  allTasks: string[];
  allRisks: string[];
  allDecisions: string[];
  allOpportunities: string[];
  meetingTasks?: MeetingTask[];
  transcriptContent: string | null;
  /** True when a stored transcript existed but the fetch failed (vs. never processed) */
  transcriptLoadFailed?: boolean;
  backHref: string;
  backLabel: string;
  relatedMeetings?: RelatedMeeting[];
  relatedMeetingsBaseHref?: string;
  /** Render slot for DigestSection or other project-specific content */
  digestSlot?: React.ReactNode;
  /** Render slot for the FormattedTranscript */
  transcriptSlot?: React.ReactNode;
  /** Render slot for the MarkdownSummary */
  summarySlot?: React.ReactNode;
}

// ─── Collapsible Section ────────────────────────────────────────────────────

function AccordionSection({
  label,
  children,
  defaultOpen = true,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between group">
        {/* eslint-disable-next-line design-system/no-raw-heading */}
        <h2 className="text-xs font-semibold uppercase tracking-widest text-primary">
          {label}
        </h2>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}

// ─── Sidebar List ───────────────────────────────────────────────────────────

function SidebarList({
  label,
  items,
}: {
  label: string;
  items: string[];
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-foreground">
        {label}
      </div>
      <ul className="space-y-1.5">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
            <span aria-hidden className="mt-0.5 text-muted-foreground">-</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Action items (grouped by assignee) ──────────────────────────────────────

interface ActionItemGroup {
  assignee: string | null;
  items: string[];
}

/**
 * Parse Fireflies action-item text into groups keyed by assignee.
 *
 * Fireflies groups every action item under a bold `**Owner Name**` header.
 * Ingestion preserves that grouping in `action_items`, so each `**Name**` line
 * starts a new owner group and the bullet lines beneath belong to that owner.
 * Items that appear before any header (older transcripts) are "Unassigned".
 */
function parseActionItemsByAssignee(text: string): ActionItemGroup[] {
  const groups: ActionItemGroup[] = [];
  let current: ActionItemGroup | null = null;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const headerMatch = line.match(/^\*\*(.+?)\*\*$/);
    if (headerMatch) {
      current = { assignee: headerMatch[1].trim(), items: [] };
      groups.push(current);
      continue;
    }

    const itemText = line.replace(/^[-*]\s*/, "").trim();
    if (!itemText) continue;
    if (!current) {
      current = { assignee: null, items: [] };
      groups.push(current);
    }
    current.items.push(itemText);
  }

  return groups.filter((group) => group.items.length > 0);
}

function ActionItemsByAssignee({ content }: { content: string }) {
  const groups = parseActionItemsByAssignee(content);
  if (groups.length === 0) return null;

  return (
    <div className="space-y-5">
      {groups.map((group, groupIdx) => (
        <div key={groupIdx} className="space-y-2">
          <div className="text-sm font-semibold text-foreground">
            {group.assignee ?? "Unassigned"}
          </div>
          <ul className="space-y-2">
            {group.items.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground"
              >
                <span
                  aria-hidden
                  className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ─── Markdown preprocessing ─────────────────────────────────────────────────

/**
 * Pre-process Fireflies content so ReactMarkdown can parse it properly.
 * Adds blank lines before emoji-prefixed sections (🏭 **Title** ...).
 */
function preprocessMarkdown(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Detect lines starting with emoji (Unicode emoji ranges)
    const cp = line.codePointAt(0) ?? 0;
    const startsWithEmoji =
      (cp >= 0x1F300 && cp <= 0x1FAD6) ||
      (cp >= 0x2600 && cp <= 0x27BF) ||
      (cp >= 0x2700 && cp <= 0x27BF);

    if (startsWithEmoji && i > 0) {
      result.push("");
      result.push(line);
    } else {
      result.push(line);
    }
  }

  return result.join("\n");
}

function FirefliesSectionContent({ value }: { value: string }) {
  const trimmed = value.trim();
  const looksJson =
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"));

  if (looksJson) {
    try {
      const parsed = JSON.parse(trimmed);
      return (
        <pre className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap font-mono rounded-md bg-muted/40 p-3">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch (error) {
      reportNonCriticalFailure({
        area: "meeting-detail",
        operation: "parse-json-content",
        error,
        userVisibleFallback: "Meeting content was rendered as markdown instead of JSON.",
      });
    }
  }

  const processed = preprocessMarkdown(trimmed);

  return (
    <div className="space-y-1">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            // eslint-disable-next-line design-system/no-raw-heading
            <h3 className="text-sm font-semibold text-foreground pt-4 first:pt-0">{children}</h3>
          ),
          h2: ({ children }) => (
            // eslint-disable-next-line design-system/no-raw-heading
            <h3 className="text-sm font-semibold text-foreground pt-4 first:pt-0">{children}</h3>
          ),
          h3: ({ children }) => (
            // eslint-disable-next-line design-system/no-raw-heading
            <h4 className="text-xs font-semibold text-foreground pt-3 first:pt-0">{children}</h4>
          ),
          p: ({ children }) => (
            <p className="text-sm text-muted-foreground leading-relaxed pb-1">
              {children}
            </p>
          ),
          ul: ({ children }) => <ul className="space-y-1 pl-4 list-disc">{children}</ul>,
          ol: ({ children }) => (
            <ol className="list-decimal pl-4 space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-sm text-muted-foreground leading-relaxed">
              {children}
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}

function meaningfulText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  if (!trimmed || trimmed === "{}" || trimmed === "[]") {
    return null;
  }

  return trimmed;
}

// ─── Project Assignment Dialog ───────────────────────────────────────────────

function ProjectAssignmentDialog({
  open,
  onOpenChange,
  meetingTitle,
  selectedProjectId,
  onSelectedProjectIdChange,
  onSave,
  projects,
  isLoadingProjects,
  projectLoadError,
  isSaving,
  hasProject,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingTitle: string;
  selectedProjectId: string;
  onSelectedProjectIdChange: (value: string) => void;
  onSave: () => void;
  projects: ReturnType<typeof useProjects>["projects"];
  isLoadingProjects: boolean;
  projectLoadError: Error | null;
  isSaving: boolean;
  hasProject: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{hasProject ? "Change project" : "Assign to project"}</DialogTitle>
          <DialogDescription>{meetingTitle}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Select
            value={selectedProjectId || "__none__"}
            onValueChange={(value) => {
              onSelectedProjectIdChange(value === "__none__" ? "" : value);
            }}
            disabled={isLoadingProjects || isSaving}
          >
            <SelectTrigger>
              <SelectValue placeholder={isLoadingProjects ? "Loading projects..." : "Select a project"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No project</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={String(project.id)}>
                  {project.project_number
                    ? `${project.project_number} - ${project.name || "Unnamed Project"}`
                    : project.name || `Project #${project.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {projectLoadError ? (
            <p className="text-xs text-destructive">
              Failed to load projects: {projectLoadError.message}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onSave} disabled={isLoadingProjects || isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function MeetingDetailContent({
  meeting,
  segments,
  parsedSections,
  participantsList,
  allTasks: _allTasks,
  allRisks,
  allDecisions: _allDecisions,
  allOpportunities,
  meetingTasks = [],
  transcriptContent,
  transcriptLoadFailed = false,
  backHref,
  backLabel,
  relatedMeetings = [],
  relatedMeetingsBaseHref,
  digestSlot,
  transcriptSlot,
  summarySlot,
}: MeetingDetailContentProps) {
  const { projects, isLoading: isLoadingProjects, error: projectLoadError } = useProjects({
    limit: 500,
  });
  const [assignmentDialogOpen, setAssignmentDialogOpen] = React.useState(false);
  const [selectedProjectId, setSelectedProjectId] = React.useState(
    meeting.project_id ? String(meeting.project_id) : "",
  );
  const [assignedProjectId, setAssignedProjectId] = React.useState<number | null>(
    meeting.project_id,
  );
  const [assignedProjectName, setAssignedProjectName] = React.useState<string | null>(
    meeting.project,
  );
  const [isSavingProject, setIsSavingProject] = React.useState(false);

  React.useEffect(() => {
    setSelectedProjectId(meeting.project_id ? String(meeting.project_id) : "");
    setAssignedProjectId(meeting.project_id);
    setAssignedProjectName(meeting.project);
  }, [meeting.id, meeting.project, meeting.project_id]);

  const selectedProject = React.useMemo(
    () => projects.find((project) => String(project.id) === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const assignedProject = React.useMemo(
    () => projects.find((project) => project.id === assignedProjectId) ?? null,
    [assignedProjectId, projects],
  );

  const projectLabel =
    assignedProject?.name ||
    assignedProjectName ||
    (assignedProjectId ? `Project #${assignedProjectId}` : null);

  const handleSaveProjectAssignment = async () => {
    const nextProjectId = selectedProjectId ? Number(selectedProjectId) : null;
    if (selectedProjectId && !Number.isFinite(nextProjectId)) {
      toast.error("Select a valid project before saving");
      return;
    }

    setIsSavingProject(true);
    try {
      await apiFetch(`/api/documents/${meeting.id}/assign-project`, {
        method: "PATCH",
        body: JSON.stringify({ project_id: nextProjectId }),
      });
      setAssignedProjectId(nextProjectId);
      setAssignedProjectName(nextProjectId ? selectedProject?.name ?? null : null);
      setAssignmentDialogOpen(false);
      toast.success(nextProjectId ? "Meeting assigned to project" : "Project assignment removed");
    } catch (error) {
      toast.error("Failed to assign meeting to project");
    } finally {
      setIsSavingProject(false);
    }
  };

  const overviewContent =
    meaningfulText(parsedSections?.shortSummary) ||
    meaningfulText(parsedSections?.shortOverview) ||
    meaningfulText(parsedSections?.gist) ||
    meaningfulText(parsedSections?.bulletGist) ||
    meaningfulText(meeting.overview) ||
    meaningfulText(meeting.summary) ||
    undefined;
  const notesContent =
    meaningfulText(parsedSections?.notes) ||
    meaningfulText(meeting.notes);
  const actionItemsContent =
    meaningfulText(parsedSections?.actionItems) ||
    meaningfulText(meeting.action_items);
  const shorthandBullet =
    meaningfulText(parsedSections?.shorthandBullet) ||
    meaningfulText(meeting.bullet_points);
  const hasActionSnapshot =
    allRisks.length > 0 ||
    allOpportunities.length > 0;

  const keywordList = React.useMemo(
    () =>
      (parsedSections?.keywords ?? "")
        .split(/[,\n]/)
        .map((k) => k.replace(/^[-*•]\s*/, "").trim())
        .filter(Boolean),
    [parsedSections?.keywords],
  );
  const KEYWORD_LIMIT = 8;
  const [showAllKeywords, setShowAllKeywords] = React.useState(false);
  const visibleKeywords = showAllKeywords
    ? keywordList
    : keywordList.slice(0, KEYWORD_LIMIT);
  const hiddenKeywordCount = keywordList.length - visibleKeywords.length;

  return (
    <PageShell
      variant="detailWide"
      title={meeting.title || "Untitled Meeting"}
      actions={
        backHref ? (
          <Button asChild size="sm" variant="ghost">
            <Link
              href={backHref}
              aria-label={backLabel ? `Back to ${backLabel}` : "Back"}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {backLabel || "Meetings"}
            </Link>
          </Button>
        ) : undefined
      }
      contentClassName="pb-12"
    >

      {/* Meta bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border pb-4 mb-8">
        {meeting.date ? (
          <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {format(new Date(meeting.date), "EEEE, MMMM d, yyyy")}
          </span>
        ) : null}
        {meeting.duration_minutes ? (
          <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {meeting.duration_minutes} min
          </span>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`inline-flex items-center gap-2 text-xs font-medium h-auto px-0 transition-colors ${
            projectLabel
              ? "text-muted-foreground hover:text-foreground"
              : "text-muted-foreground/60 hover:text-muted-foreground"
          }`}
          onClick={() => setAssignmentDialogOpen(true)}
        >
          <FolderOpen className="h-3.5 w-3.5" />
          {projectLabel ?? "Assign to project"}
        </Button>
        {meeting.fireflies_link ? (
          <a
            href={meeting.fireflies_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View in Fireflies
          </a>
        ) : null}
        {(meeting.url || meeting.source) ? (
          <a
            href={(meeting.url || meeting.source) ?? ""}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            View file
          </a>
        ) : null}
      </div>

      <div className="grid gap-20 lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* Main content */}
        <div className="space-y-8">
          {/* Meeting Overview — leads with the prose summary; the bulleted
              key points move to their own section below. */}
          {(overviewContent || shorthandBullet) ? (
            <section className="space-y-4">
              <AccordionSection label="Meeting Overview">
                {overviewContent ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {overviewContent}
                  </p>
                ) : (
                  <FirefliesSectionContent value={shorthandBullet!} />
                )}
              </AccordionSection>
            </section>
          ) : null}

          {/* Tasks — AI-extracted action items, managed inline (status,
              assignee, priority, due date), with create + delete. */}
          <section className="border-t border-border pt-6">
            <AccordionSection label={`Tasks (${meetingTasks.length})`}>
              <MeetingTasksManager
                meetingId={meeting.id}
                initialTasks={meetingTasks}
                projectId={assignedProjectId}
                projects={projects}
                projectsLoading={isLoadingProjects}
                defaultSourceSystem={
                  meeting.source_system ?? meeting.type ?? "meeting"
                }
                allTasksHref={
                  assignedProjectId ? `/${assignedProjectId}/tasks` : "/tasks"
                }
              />
            </AccordionSection>
          </section>

          {/* Action Items — grouped by the person Fireflies assigned them to */}
          {actionItemsContent ? (
            <section className="border-t border-border pt-6">
              <AccordionSection label="Action Items">
                <ActionItemsByAssignee content={actionItemsContent} />
              </AccordionSection>
            </section>
          ) : null}

          {/* Summary — collapsed by default */}
          {parsedSections?.summary && summarySlot ? (
            <section className="border-t border-border pt-6">
              <AccordionSection label="Summary" defaultOpen={false}>
                {summarySlot}
              </AccordionSection>
            </section>
          ) : null}

          {/* AI Digest — owns its own border/spacing so it leaves no empty
              bordered section when the meeting has no digest yet. */}
          {digestSlot}

          {/* Notes — collapsed by default */}
          {notesContent ? (
            <section className="border-t border-border pt-6">
              <AccordionSection label="Notes" defaultOpen={false}>
                <FirefliesSectionContent value={notesContent} />
              </AccordionSection>
            </section>
          ) : null}

          {/* Key Points (bulleted form — shown below the prose overview when both exist) */}
          {overviewContent && shorthandBullet ? (
            <section className="border-t border-border pt-6">
              <AccordionSection label="Key Points" defaultOpen={false}>
                <FirefliesSectionContent value={shorthandBullet} />
              </AccordionSection>
            </section>
          ) : null}

          {/* Discussion Topics — collapsed by default */}
          {segments.length > 0 && (
            <section className="border-t border-border pt-6">
              <AccordionSection
                label={`Discussion Topics (${segments.length})`}
                defaultOpen={false}
              >
                <div className="space-y-6">
                  {segments.map((segment, index) => (
                    <div key={segment.id} className="flex gap-2.5">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium tabular-nums text-muted-foreground">
                        {segment.segment_index + 1}
                      </span>
                      <div className="min-w-0 flex-1 space-y-2">
                        {/* eslint-disable-next-line design-system/no-raw-heading */}
                        <h3 className="text-sm font-medium text-foreground">
                          {segment.title || `Topic ${index + 1}`}
                        </h3>
                        {segment.summary && (
                          <FirefliesSectionContent value={segment.summary} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionSection>
            </section>
          )}

          {/* Full Transcript */}
          {transcriptSlot ? (
            <section className="border-t border-border pt-6">
              {transcriptSlot}
            </section>
          ) : null}

          {/* Empty state — distinguishes a failed fetch from "never processed" */}
          {!transcriptContent && segments.length === 0 && (
            <EmptyState
              icon={<FileText />}
              title={
                transcriptLoadFailed
                  ? "Transcript could not be loaded"
                  : "No transcript available"
              }
              description={
                transcriptLoadFailed
                  ? "A transcript exists for this meeting but failed to load. Refresh to try again."
                  : "This meeting has not been processed yet."
              }
            />
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-8">
          {/* Attendees */}
          {participantsList.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
                <Users className="h-3.5 w-3.5" />
                Attendees ({participantsList.length})
              </div>
              <AttendeeAvatarStack participants={participantsList} />
            </div>
          )}

          {/* Action Snapshot */}
          {hasActionSnapshot && (
            <div className="space-y-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-primary">
                Action Snapshot
              </div>

              {allRisks.length > 0 && (
                <div className="border-b border-border pb-4">
                  <SidebarList
                    label="Risks"
                    items={allRisks}
                  />
                </div>
              )}

              {allOpportunities.length > 0 && (
                <SidebarList
                  label="Opportunities"
                  items={allOpportunities}
                />
              )}
            </div>
          )}

          {/* Related Meetings */}
          {relatedMeetings.length > 0 && relatedMeetingsBaseHref && (
            <div className="space-y-4 border-t border-border pt-6">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Related Meetings
                </p>
                <p className="text-xs text-muted-foreground">
                  {relatedMeetings.length} recent meeting{relatedMeetings.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="space-y-2">
                {relatedMeetings.map((rm) => (
                  <Link
                    key={rm.id}
                    href={`${relatedMeetingsBaseHref}/${rm.id}`}
                    className="group flex items-center gap-3 py-1.5 transition-colors"
                  >
                    {rm.date ? (
                      <DateAvatar date={rm.date} size="sm" />
                    ) : (
                      <div className="w-9 h-9 shrink-0 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        ?
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {rm.title || "Untitled Meeting"}
                      </p>
                      {rm.duration_minutes ? (
                        <p className="text-xs text-muted-foreground">{rm.duration_minutes} min</p>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Keywords */}
          {keywordList.length > 0 && (
            <div className="space-y-3 border-t border-border pt-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-primary">
                Keywords
              </div>
              <div className="flex flex-wrap gap-1.5">
                {visibleKeywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="inline-flex items-center rounded-full bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {keyword}
                  </span>
                ))}
                {hiddenKeywordCount > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground/70 hover:text-foreground"
                    onClick={() => setShowAllKeywords(true)}
                  >
                    +{hiddenKeywordCount} more
                  </Button>
                )}
                {showAllKeywords && keywordList.length > KEYWORD_LIMIT && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground/70 hover:text-foreground"
                    onClick={() => setShowAllKeywords(false)}
                  >
                    Show less
                  </Button>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
      <ProjectAssignmentDialog
        open={assignmentDialogOpen}
        onOpenChange={setAssignmentDialogOpen}
        meetingTitle={meeting.title || "Untitled Meeting"}
        selectedProjectId={selectedProjectId}
        onSelectedProjectIdChange={setSelectedProjectId}
        onSave={handleSaveProjectAssignment}
        projects={projects}
        isLoadingProjects={isLoadingProjects}
        projectLoadError={projectLoadError}
        isSaving={isSavingProject}
        hasProject={Boolean(assignedProjectId)}
      />
    </PageShell>
  );
}
