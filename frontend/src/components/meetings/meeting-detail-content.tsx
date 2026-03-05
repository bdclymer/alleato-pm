"use client";

import {
  ExternalLink,
  Clock,
  Tag,
  Calendar,
  CheckCircle,
  AlertTriangle,
  ListTodo,
  Sparkles,
  ArrowLeft,
  Users,
  FileText,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import * as React from "react";
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
  summary: string | null;
  gist: string | null;
  keywords: string | null;
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
  icon,
  label,
  items,
}: {
  icon: React.ReactNode;
  label: string;
  items: string[];
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <ul className="space-y-1.5 pl-5">
        {items.map((item, idx) => (
          <li
            key={idx}
            className="text-xs leading-relaxed text-muted-foreground list-disc"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function MeetingDetailContent({
  meeting,
  segments,
  parsedSections,
  participantsList,
  allTasks,
  allRisks,
  allDecisions,
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
  const overviewContent = meeting.summary || undefined;

  const hasActionItems =
    allTasks.length > 0 ||
    allDecisions.length > 0 ||
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

              {allTasks.length > 0 && (
                <div className="border-b border-border pb-4">
                  <SidebarList
                    icon={<ListTodo className="h-3.5 w-3.5 text-blue-600" />}
                    label="Action Items"
                    items={allTasks}
                  />
                </div>
              )}

              {allDecisions.length > 0 && (
                <div className="border-b border-border pb-4">
                  <SidebarList
                    icon={
                      <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    }
                    label="Decisions"
                    items={allDecisions}
                  />
                </div>
              )}

              {allRisks.length > 0 && (
                <SidebarList
                  icon={
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  }
                  label="Risks"
                  items={allRisks}
                />
              )}

              {allOpportunities.length > 0 && (
                <SidebarList
                  icon={<Sparkles className="h-3.5 w-3.5 text-purple-600" />}
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
