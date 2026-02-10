import { notFound } from 'next/navigation';
import {
  FileText,
  ExternalLink,
  Clock,
  Tag,
  Calendar,
  CheckCircle,
  AlertTriangle,
  ListTodo,
  Sparkles,
} from 'lucide-react';
import { SectionHeader } from '@/components/ui/section-header';
import { FormattedTranscript } from '../formatted-transcript';
import { parseTranscriptSections } from './parse-transcript-sections';
import { MarkdownSummary } from './markdown-summary';
import { format } from 'date-fns';
import { getProjectInfo } from '@/lib/supabase/project-fetcher';
import type { Database } from '@/types/database.types';
import { DashboardLayout } from '@/components/layouts';
import { PageHeader } from '@/components/layout';

/**
 * Format an email address into a display name.
 * e.g. "bclymer@alleatogroup.com" -> "B. Clymer"
 * e.g. "tony@ibexdevgroup.com" -> "Tony"
 */
function formatParticipantName(email: string): string {
  const localPart = email.split('@')[0];
  if (!localPart) return email;

  // Handle formats like "first.last" or "firstlast"
  const parts = localPart.split(/[._-]/);
  if (parts.length >= 2) {
    const firstName = parts[0].charAt(0).toUpperCase() + '.';
    const lastName = parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1).toLowerCase();
    return `${firstName} ${lastName}`;
  }

  // Single name - just capitalize it
  return localPart.charAt(0).toUpperCase() + localPart.slice(1).toLowerCase();
}

// Extended types to handle fields that may exist in DB but not in generated types
type MeetingSegment = Database['public']['Tables']['meeting_segments']['Row'] & {
  opportunities?: unknown[];
};

type DocumentMetadata = Database['public']['Tables']['document_metadata']['Row'] & {
  duration?: number;
};

interface PageProps {
  params: Promise<{
    projectId: string;
    meetingId: string;
  }>;
}

export default async function ProjectMeetingDetailPage({ params }: PageProps) {
  const { projectId, meetingId } = await params;
  const { project, supabase } = await getProjectInfo(projectId);

  // Fetch meeting metadata
  const { data: meetingData, error } = await supabase
    .from('document_metadata')
    .select('*')
    .eq('id', meetingId)
    .single();

  if (error || !meetingData) {
    notFound();
  }

  // Cast to extended type to handle optional fields
  const meeting = meetingData as DocumentMetadata;

  // Fetch meeting segments
  const { data: segmentsData } = await supabase
    .from('meeting_segments')
    .select('*')
    .eq('metadata_id', meetingId)
    .order('segment_index', { ascending: true });

  // Cast to extended type to handle optional fields
  const segments = (segmentsData || []) as MeetingSegment[];

  // Aggregate all outcomes from segments
  const allTasks: string[] = [];
  const allRisks: string[] = [];
  const allDecisions: string[] = [];
  const allOpportunities: string[] = [];

  segments.forEach((segment) => {
    if (segment.tasks && Array.isArray(segment.tasks)) {
      segment.tasks.forEach((task: unknown) => {
        const text =
          typeof task === 'string'
            ? task
            : (task as Record<string, unknown>)?.description;
        if (text) allTasks.push(String(text));
      });
    }

    if (segment.risks && Array.isArray(segment.risks)) {
      segment.risks.forEach((risk: unknown) => {
        const text =
          typeof risk === 'string'
            ? risk
            : (risk as Record<string, unknown>)?.description;
        if (text) allRisks.push(String(text));
      });
    }

    if (segment.decisions && Array.isArray(segment.decisions)) {
      segment.decisions.forEach((decision: unknown) => {
        const text =
          typeof decision === 'string'
            ? decision
            : (decision as Record<string, unknown>)?.description;
        if (text) allDecisions.push(String(text));
      });
    }

    if (segment.opportunities && Array.isArray(segment.opportunities)) {
      segment.opportunities.forEach((opportunity: unknown) => {
        const text =
          typeof opportunity === 'string'
            ? opportunity
            : (opportunity as Record<string, unknown>)?.description;
        if (text) allOpportunities.push(String(text));
      });
    }
  });

  // Fetch transcript content
  // Priority: Storage URL > documents table > meeting.content (as fallback)
  let transcriptContent = null;
  const storageUrl = meeting.url || meeting.source;

  if (storageUrl && storageUrl.includes('supabase.co/storage')) {
    // Try to fetch from Supabase Storage first
    try {
      const response = await fetch(storageUrl);
      if (response.ok) {
        transcriptContent = await response.text();
      } else {
        console.error("Failed to fetch transcript from storage, status:", response.status);
      }
    } catch (error) {
      console.error("Failed to fetch transcript from storage:", error);
    }
  }

  // Fallback: use meeting.content
  if (!transcriptContent && meeting.content) {
    transcriptContent = meeting.content;
  }

  const participantsList = [
    ...new Set<string>(
      meeting.participants?.split(',').map((p: string) => p.trim()) || []
    ),
  ];

  // Parse the transcript content into sections
  const parsedSections = transcriptContent
    ? parseTranscriptSections(transcriptContent)
    : null;
  const metadataTextClass =
    'text-2xs font-semibold tracking-[0.15em] uppercase text-neutral-500';
  const hasOutcomes =
    allDecisions.length > 0 ||
    allTasks.length > 0 ||
    allRisks.length > 0 ||
    allOpportunities.length > 0;

  return (
    <>
      <PageHeader
        title={meeting.title || 'Untitled Meeting'}
        description={meeting.summary || undefined}
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: project?.name || 'Project', href: `/${projectId}/home` },
          { label: 'Meetings', href: `/${projectId}/meetings` },
          { label: meeting.title || 'Meeting' },
        ]}
      />

      <DashboardLayout>
        {/* Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-12">
          {/* Date */}
          {meeting.date && (
            <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-background px-4 py-3">
              <Calendar className="h-4 w-4 text-brand" />
              <span className={metadataTextClass}>
                {format(new Date(meeting.date), 'EEEE, MMMM d, yyyy')}
              </span>
            </div>
          )}

          {/* Type */}
          {meeting.type && (
            <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-background px-4 py-3">
              <Tag className="h-4 w-4 text-brand" />
              <span className={metadataTextClass}>{meeting.type}</span>
            </div>
          )}

          {/* Fireflies Link */}
          {meeting.fireflies_link && (
            <div className="flex items-center rounded-xl border border-neutral-200 bg-background px-4 py-3">
              <a
                href={meeting.fireflies_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-2xs font-semibold tracking-[0.15em] uppercase text-neutral-500 hover:text-neutral-700"
              >
                <ExternalLink className="h-4 w-4 text-brand" />
                View in Fireflies
              </a>
            </div>
          )}

          {/* Duration */}
          {meeting.duration && (
            <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-background px-4 py-3">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-brand" />
                <span className={metadataTextClass}>
                  {meeting.duration} minutes
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Gist Section */}
        {parsedSections?.gist && (
          <div className="border border-neutral-200 bg-background p-6 mb-6">
            <SectionHeader className="mb-4">Meeting Overview</SectionHeader>
            <p className="text-sm text-neutral-700 leading-relaxed">
              {parsedSections.gist}
            </p>
          </div>
        )}

        {/* Summary Section */}
        {parsedSections?.summary && (
          <div className="border border-neutral-200 bg-background p-6 mb-6">
            <SectionHeader className="mb-4">Summary</SectionHeader>
            <MarkdownSummary content={parsedSections.summary} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 mb-20">
          <div className="lg:col-span-8 space-y-8">
            {/* Full Transcript */}
            {parsedSections?.transcript ? (
              <FormattedTranscript content={parsedSections.transcript} />
            ) : (
              <div className="border border-neutral-200 bg-background p-12 md:p-16 text-center rounded-xl">
                <FileText
                  className="h-16 w-16 text-neutral-300 mx-auto mb-6"
                  strokeWidth={1.5}
                />
                <h3 className="text-2xl font-sans font-light text-neutral-900 tracking-tight mb-3">
                  No transcript available
                </h3>
                <p className="text-sm text-neutral-500 leading-relaxed max-w-md mx-auto">
                  The full transcript for this meeting has not been processed
                  yet.
                </p>
              </div>
            )}
          </div>

          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24 h-fit">
            {participantsList.length > 0 && (
              <div className="border border-neutral-200 bg-background p-6 rounded-xl">
                <SectionHeader className="mb-4">
                  Attendees ({participantsList.length})
                </SectionHeader>
                <div className="flex flex-wrap gap-2">
                  {participantsList.map((participant, index) => (
                    <span
                      key={`attendee-${meeting.id}-${participant}-${index}`}
                      className="px-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 text-neutral-700 rounded-full"
                      title={participant}
                    >
                      {formatParticipantName(participant)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {parsedSections?.keywords && (
              <div className="border border-neutral-200 bg-background p-6 rounded-xl">
                <SectionHeader className="mb-4">Topics</SectionHeader>
                <div className="flex flex-wrap gap-2">
                  {parsedSections.keywords.split(',').map((keyword, index) => {
                    const trimmedKeyword = keyword.trim();
                    return (
                      <span
                        key={`keyword-${trimmedKeyword}-${index}`}
                        className="px-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 text-neutral-700 rounded-full"
                      >
                        {trimmedKeyword}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {hasOutcomes && (
              <div className="border border-neutral-200 bg-background p-6 rounded-xl">
                <SectionHeader className="mb-4">Meeting Outcomes</SectionHeader>
                <div className="space-y-5">
                  {allDecisions.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="h-4 w-4 text-green-700" />
                        <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">
                          Decisions ({allDecisions.length})
                        </h4>
                      </div>
                      <ul className="space-y-2">
                        {allDecisions.map((decision, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-sm text-neutral-700 leading-relaxed"
                          >
                            <span className="text-green-700 mt-0.5">•</span>
                            <span>{decision}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {allTasks.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <ListTodo className="h-4 w-4 text-blue-700" />
                        <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">
                          Action Items ({allTasks.length})
                        </h4>
                      </div>
                      <ul className="space-y-2">
                        {allTasks.map((task, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-sm text-neutral-700 leading-relaxed"
                          >
                            <span className="text-blue-700 mt-0.5">•</span>
                            <span>{task}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {allRisks.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-4 w-4 text-amber-700" />
                        <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">
                          Risks ({allRisks.length})
                        </h4>
                      </div>
                      <ul className="space-y-2">
                        {allRisks.map((risk, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-sm text-neutral-700 leading-relaxed"
                          >
                            <span className="text-amber-700 mt-0.5">•</span>
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {allOpportunities.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="h-4 w-4 text-purple-700" />
                        <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">
                          Opportunities ({allOpportunities.length})
                        </h4>
                      </div>
                      <ul className="space-y-2">
                        {allOpportunities.map((opportunity, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-sm text-neutral-700 leading-relaxed"
                          >
                            <span className="text-purple-700 mt-0.5">•</span>
                            <span>{opportunity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {segments && segments.length > 0 && (
              <div className="border border-neutral-200 bg-background p-6 rounded-xl">
                <SectionHeader className="mb-4">Discussion Topics</SectionHeader>
                <div className="space-y-4">
                  {segments.map((segment, index) => (
                    <div
                      key={segment.id}
                      className="border border-neutral-100 bg-white p-4 rounded-lg"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h4 className="text-sm font-semibold text-neutral-900">
                          {segment.title || `Topic ${index + 1}`}
                        </h4>
                        <span className="px-2 py-0.5 text-2xs font-semibold tracking-[0.12em] uppercase bg-neutral-100 text-neutral-700 border border-neutral-200 rounded-full">
                          {segment.segment_index + 1}
                        </span>
                      </div>
                      {segment.summary && (
                        <p className="text-xs text-neutral-600 leading-relaxed">
                          {segment.summary}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>

      </DashboardLayout>
    </>
  );
}
