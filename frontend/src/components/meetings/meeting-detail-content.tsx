"use client";

import {
  ExternalLink,
  Clock,
  Tag,
  Calendar,
  ArrowLeft,
  Users,
  FileText,
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

  return (
    <div className="rounded-md bg-muted/30 p-3">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="text-xs text-muted-foreground leading-relaxed mb-2 last:mb-0">
              {children}
            </p>
          ),
          ul: ({ children }) => <ul className="space-y-1.5">{children}</ul>,
          ol: ({ children }) => (
            <ol className="list-decimal ml-4 space-y-1.5">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-xs text-muted-foreground leading-relaxed list-disc ml-4">
              {children}
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
        }}
      >
        {trimmed}
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
  const firefliesHighlights: Array<{ label: string; content: string | null }> = [
    { label: "Topics Discussed", content: parsedSections?.topicsDiscussed || null },
    { label: "Notes", content: parsedSections?.notes || null },
    { label: "Meeting Type", content: parsedSections?.meetingType || null },
    { label: "Transcript Chapters", content: parsedSections?.transcriptChapters || null },
    { label: "Action Items", content: parsedSections?.actionItems || null },
  ].filter((section) => Boolean(section.content?.trim()));
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
        {meeting.type ? (
          <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Tag className="h-3.5 w-3.5" />
            {meeting.type}
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
      </div>

      <div className="grid gap-20 lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* Main content */}
        <div className="space-y-8">
          {/* Meeting Overview — accordion */}
          {overviewContent ? (
            <section className="space-y-4">
              <AccordionSection label="Meeting Overview">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {overviewContent}
                </p>
              </AccordionSection>
            </section>
          ) : null}

          {/* Summary — accordion */}
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

          {/* Curated Fireflies Insights */}
          {firefliesHighlights.length > 0 ? (
            <section className="border-t border-border pt-6">
              <AccordionSection label="Fireflies Key Insights" defaultOpen={false}>
                <div className="space-y-5">
                  {firefliesHighlights.map((section) => (
                    <div key={section.label} className="space-y-1.5">
                      <h3 className="text-sm font-medium text-foreground">
                        {section.label}
                      </h3>
                      <FirefliesSectionContent value={section.content || ""} />
                    </div>
                  ))}
                </div>
              </AccordionSection>
            </section>
          ) : null}

          {/* Shorthand Bullet */}
          {shorthandBullet ? (
            <section className="border-t border-border pt-6">
              <AccordionSection label="Shorthand Bullet" defaultOpen={false}>
                <ReadableTextBlock value={shorthandBullet} />
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
            <div className="space-y-3 border-t border-border pt-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-primary">
                Related Meetings
              </div>
              <ul className="space-y-2">
                {relatedMeetings.map((rm) => (
                  <li key={rm.id}>
                    <Link
                      href={`${relatedMeetingsBaseHref}/${rm.id}`}
                      className="group block space-y-0.5 rounded-md p-2 -mx-2 hover:bg-muted transition-colors"
                    >
                      <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {rm.title || "Untitled Meeting"}
                      </p>
                      {rm.date && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(rm.date), "MMM d, yyyy")}
                        </p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Topics */}
          {parsedSections?.keywords && (
            <div className="space-y-2 border-t border-border pt-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-primary">
                Topics
              </div>
              <div className="flex flex-wrap gap-2">
                {parsedSections.keywords
                  .split(",")
                  .map((k) => k.trim())
                  .filter(Boolean)
                  .map((keyword, idx) => (
                    <span
                      key={`${keyword}-${idx}`}
                      className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
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
