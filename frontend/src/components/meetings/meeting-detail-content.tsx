"use client";

import {
  ExternalLink,
  Clock,
  Calendar,
  ArrowLeft,
  Users,
  FileText,
  FolderOpen,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DateAvatar } from "@/components/ds";
import { PageContainer } from "@/components/layout";
import { AttendeeAvatarStack } from "@/components/meetings/attendee-avatar-stack";
import type { Database } from "@/types/database.types";

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

export interface MeetingDetailContentProps {
  meeting: DocumentMetadata;
  segments: MeetingSegment[];
  parsedSections: ParsedSections | null;
  participantsList: string[];
  allTasks: string[];
  allRisks: string[];
  allDecisions: string[];
  allOpportunities: string[];
  transcriptContent: string | null;
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

/**
 * Pre-process Fireflies content so ReactMarkdown can parse it properly.
 * Handles emoji-prefixed sections (🏭 **Title** ...) by adding blank lines before them.
 */
function preprocessMarkdown(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Detect lines starting with emoji (surrogate pairs or common emoji ranges)
    const firstChar = line.codePointAt(0) ?? 0;
    const startsWithEmoji =
      firstChar > 0x1F000 ||
      (firstChar >= 0x2600 && firstChar <= 0x27BF) ||
      (firstChar >= 0x2700 && firstChar <= 0x27BF) ||
      (firstChar >= 0xFE00 && firstChar <= 0xFE0F) ||
      // Also catch emoji modifiers and common patterns
      /^[\u{1F300}-\u{1FAD6}\u{2600}-\u{27BF}\u{2700}-\u{27BF}]/u.test(line);

    if (startsWithEmoji && i > 0) {
      // Add blank line before emoji-prefixed lines to create paragraph breaks
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
    } catch {
      // Fall through to markdown renderer
    }
  }

  const processed = preprocessMarkdown(trimmed);

  return (
    <div className="space-y-1">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h3 className="text-sm font-semibold text-foreground pt-4 first:pt-0">{children}</h3>
          ),
          h2: ({ children }) => (
            <h3 className="text-sm font-semibold text-foreground pt-4 first:pt-0">{children}</h3>
          ),
          h3: ({ children }) => (
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

function ReadableTextBlock({ value }: { value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 p-4">
      <pre className="whitespace-pre-wrap text-sm leading-6 text-foreground font-sans">
        {value.trim()}
      </pre>
    </div>
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
  transcriptContent,
  backHref,
  backLabel,
  relatedMeetings = [],
  relatedMeetingsBaseHref,
  digestSlot,
  transcriptSlot,
  summarySlot,
}: MeetingDetailContentProps) {
  const overviewContent =
    parsedSections?.shortSummary?.trim() ||
    parsedSections?.shortOverview?.trim() ||
    parsedSections?.gist?.trim() ||
    parsedSections?.bulletGist?.trim() ||
    meeting.summary ||
    undefined;
  const notesContent = parsedSections?.notes?.trim() || null;
  const actionItemsContent = parsedSections?.actionItems?.trim() || null;
  const shorthandBullet = parsedSections?.shorthandBullet?.trim() || null;
  const hasActionItems =
    allRisks.length > 0 ||
    allOpportunities.length > 0;

  return (
    <PageContainer maxWidth="xl" className="pb-12">
      {/* Page header */}
      <div className="mb-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backLabel}
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">
          {meeting.title || "Untitled Meeting"}
        </h1>
      </div>

      {/* Meta bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border pb-4 mb-8">
        {meeting.date ? (
          <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {format(new Date(meeting.date), "EEEE, MMMM d, yyyy")}
          </span>
        ) : null}
        {meeting.duration ? (
          <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {meeting.duration} min
          </span>
        ) : null}
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
        {meeting.project ? (
          <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <FolderOpen className="h-3.5 w-3.5" />
            {meeting.project}
          </span>
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Assign to project
          </button>
        )}
        {meeting.date && meeting.title ? (() => {
          const dateStr = new Date(meeting.date).toISOString().slice(0, 10);
          const filename = `${dateStr} - ${meeting.title}.md`;
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://lgveqfnpkxvzbnnwuled.supabase.co";
          const href = `${supabaseUrl}/storage/v1/object/public/transcripts/${encodeURIComponent(filename)}`;
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              View file
            </a>
          );
        })() : null}
      </div>

      <div className="grid gap-20 lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* Main content */}
        <div className="space-y-8">
          {/* Meeting Overview — accordion (shows structured bullets when available) */}
          {(shorthandBullet || overviewContent) ? (
            <section className="space-y-4">
              <AccordionSection label="Meeting Overview">
                {shorthandBullet ? (
                  <FirefliesSectionContent value={shorthandBullet} />
                ) : (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {overviewContent}
                  </p>
                )}
              </AccordionSection>
            </section>
          ) : null}

          {/* Summary — accordion (collapsed by default) */}
          {parsedSections?.summary && summarySlot ? (
            <section className="border-t border-border pt-6">
              <AccordionSection label="Summary" defaultOpen={false}>
                {summarySlot}
              </AccordionSection>
            </section>
          ) : null}

          {/* AI Digest */}
          {digestSlot ? (
            <section className="border-t border-border pt-6">
              {digestSlot}
            </section>
          ) : null}

          {/* Notes */}
          {notesContent ? (
            <section className="border-t border-border pt-6">
              <AccordionSection label="Notes" defaultOpen={false}>
                <FirefliesSectionContent value={notesContent} />
              </AccordionSection>
            </section>
          ) : null}

          {/* Action Items */}
          {actionItemsContent ? (
            <section className="border-t border-border pt-6">
              <AccordionSection label="Action Items" defaultOpen={false}>
                <FirefliesSectionContent value={actionItemsContent} />
              </AccordionSection>
            </section>
          ) : null}

          {/* Summary Overview (paragraph form) */}
          {overviewContent && shorthandBullet ? (
            <section className="border-t border-border pt-6">
              <AccordionSection label="Summary Overview" defaultOpen={false}>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {overviewContent}
                </p>
              </AccordionSection>
            </section>
          ) : null}

          {/* Discussion Topics — accordion */}
          {segments.length > 0 && (
            <section className="border-t border-border pt-6">
              <AccordionSection
                label={`Discussion Topics (${segments.length})`}
                defaultOpen={false}
              >
                <div className="space-y-6">
                  {segments.map((segment, index) => (
                    <div
                      key={segment.id}
                      className="space-y-1.5 border-l-2 border-border pl-4"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {segment.segment_index + 1}
                        </span>
                        <h3 className="text-sm font-medium text-foreground">
                          {segment.title || `Topic ${index + 1}`}
                        </h3>
                      </div>
                      {segment.summary && (
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {segment.summary}
                        </p>
                      )}
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

          {/* Empty state */}
          {!transcriptContent && segments.length === 0 && (
            <section className="py-12 text-center">
              <FileText
                className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4"
                strokeWidth={1.5}
              />
              <p className="text-sm font-medium text-foreground">
                No transcript available
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                This meeting has not been processed yet.
              </p>
            </section>
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
          {hasActionItems && (
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

          {/* Related Meetings — below Action Snapshot */}
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
                      <div className="w-9 h-9 shrink-0 rounded-full border border-border bg-muted/50 flex items-center justify-center text-xs text-muted-foreground">
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

          {/* Topics */}
          {parsedSections?.keywords && (
            <div className="space-y-3 border-t border-border pt-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-primary">
                Keywords
              </div>
              <div className="flex flex-wrap gap-1.5">
                {parsedSections.keywords
                  .split(/[,\n]/)
                  .map((k) => k.replace(/^[-*•]\s*/, "").trim())
                  .filter(Boolean)
                  .map((keyword) => (
                    <span
                      key={keyword}
                      className="inline-flex items-center rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground"
                    >
                      {keyword}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </PageContainer>
  );
}
