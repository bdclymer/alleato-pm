import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
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
} from 'lucide-react'
import { SectionHeader } from '@/components/design-system'
import { FormattedTranscript } from '@/app/(main)/[projectId]/meetings/formatted-transcript'
import type { Database } from '@/types/database.types'
import { DashboardLayout } from '@/components/layouts'
import { PageHeader } from '@/components/layout'

// Extended types to handle fields that may exist in DB but not in generated types
type MeetingSegment = Database['public']['Tables']['meeting_segments']['Row'] & {
  opportunities?: unknown[]
}

type DocumentMetadata = Database['public']['Tables']['document_metadata']['Row'] & {
  duration?: number
}

interface PageProps {
  params: Promise<{ meetingId: string }>
}

export default async function MeetingDetailPage({ params }: PageProps) {
  const { meetingId } = await params
  const supabase = await createClient()

  // Fetch meeting metadata
  const { data: meetingData, error } = await supabase
    .from('document_metadata')
    .select('*')
    .eq('id', meetingId)
    .single()

  if (error || !meetingData) {
    notFound()
  }

  // Cast to extended type to handle optional fields
  const meeting = meetingData as DocumentMetadata

  // Fetch meeting segments
  const { data: segmentsData } = await supabase
    .from('meeting_segments')
    .select('*')
    .eq('metadata_id', meetingId)
    .order('segment_index', { ascending: true })

  // Cast to extended type to handle optional fields
  const segments = (segmentsData || []) as MeetingSegment[]

  // Aggregate all outcomes from segments
  const allTasks: string[] = []
  const allRisks: string[] = []
  const allDecisions: string[] = []
  const allOpportunities: string[] = []

  segments.forEach((segment) => {
    if (segment.tasks && Array.isArray(segment.tasks)) {
      segment.tasks.forEach((task: unknown) => {
        const text =
          typeof task === 'string'
            ? task
            : (task as Record<string, unknown>)?.description
        if (text) allTasks.push(String(text))
      })
    }

    if (segment.risks && Array.isArray(segment.risks)) {
      segment.risks.forEach((risk: unknown) => {
        const text =
          typeof risk === 'string'
            ? risk
            : (risk as Record<string, unknown>)?.description
        if (text) allRisks.push(String(text))
      })
    }

    if (segment.decisions && Array.isArray(segment.decisions)) {
      segment.decisions.forEach((decision: unknown) => {
        const text =
          typeof decision === 'string'
            ? decision
            : (decision as Record<string, unknown>)?.description
        if (text) allDecisions.push(String(text))
      })
    }

    if (segment.opportunities && Array.isArray(segment.opportunities)) {
      segment.opportunities.forEach((opportunity: unknown) => {
        const text =
          typeof opportunity === 'string'
            ? opportunity
            : (opportunity as Record<string, unknown>)?.description
        if (text) allOpportunities.push(String(text))
      })
    }
  })

  // Fetch transcript content
  // Priority: Storage URL > meeting.content (as fallback)
  let transcriptContent = null
  const storageUrl = meeting.url || meeting.source

  if (storageUrl && storageUrl.includes('supabase.co/storage')) {
    // Try to fetch from Supabase Storage first
    try {
      const response = await fetch(storageUrl)
      if (response.ok) {
        transcriptContent = await response.text()
      } else {
        }
    } catch (error) {

      console.error("Failed to process meeting data:", error);

    }
  }

  // Fallback: use meeting.content
  if (!transcriptContent && meeting.content) {
    transcriptContent = meeting.content
  }

  const participantsList = [
    ...new Set<string>(
      meeting.participants?.split(',').map((p: string) => p.trim()) || []
    ),
  ]

  return (
    <>
      <PageHeader
        title={meeting.title || 'Untitled Meeting'}
        description={meeting.summary || undefined}
        breadcrumbs={[
          { label: 'Meetings', href: '/meetings' },
          { label: meeting.title || 'Meeting' },
        ]}
      />

      <DashboardLayout>
        {/* Metadata Grid */}
        <div className="flex items-center gap-12 mb-12">
          {/* Date */}
          {meeting.date && (
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-brand" />
              <SectionHeader>
                {format(new Date(meeting.date), 'EEEE, MMMM d, yyyy')}
              </SectionHeader>
            </div>
          )}

          {/* Type */}
          {meeting.type && (
            <div className="flex items-center gap-3">
              <Tag className="h-4 w-4 text-brand" />
              <SectionHeader>{meeting.type}</SectionHeader>
            </div>
          )}

          {/* Fireflies Link */}
          {meeting.fireflies_link && (
            <div className="flex flex-wrap gap-3">
              <a
                href={meeting.fireflies_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.15em] uppercase text-neutral-500"
              >
                <ExternalLink className="h-4 w-4 text-brand" />
                View in Fireflies
              </a>
            </div>
          )}

          {/* Duration */}
          {meeting.duration && (
            <div className="border border-neutral-200 bg-background p-6">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-brand" />
                <SectionHeader>{meeting.duration} minutes</SectionHeader>
              </div>
            </div>
          )}
        </div>

        {/* Meeting Outcomes */}
        {(allDecisions.length > 0 ||
          allTasks.length > 0 ||
          allRisks.length > 0 ||
          allOpportunities.length > 0) && (
          <div className="mb-20">
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-sans font-light tracking-tight text-neutral-900 mb-2">
                Meeting Outcomes
              </h2>
              <p className="text-sm text-neutral-500">
                Key decisions, action items, and insights from this meeting
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Decisions */}
              {allDecisions.length > 0 && (
                <div className="border border-neutral-200 bg-background p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <CheckCircle className="h-5 w-5 text-green-700" />
                    <h3 className="text-lg font-sans font-light text-neutral-900">
                      Decisions ({allDecisions.length})
                    </h3>
                  </div>
                  <ul className="space-y-3">
                    {allDecisions.map((decision, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 text-sm text-neutral-700 leading-relaxed"
                      >
                        <span className="text-green-700 mt-0.5">•</span>
                        <span>{decision}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Items */}
              {allTasks.length > 0 && (
                <div className="border border-neutral-200 bg-background p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <ListTodo className="h-5 w-5 text-blue-700" />
                    <h3 className="text-lg font-sans font-light text-neutral-900">
                      Action Items ({allTasks.length})
                    </h3>
                  </div>
                  <ul className="space-y-3">
                    {allTasks.map((task, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 text-sm text-neutral-700 leading-relaxed"
                      >
                        <span className="text-blue-700 mt-0.5">•</span>
                        <span>{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Risks */}
              {allRisks.length > 0 && (
                <div className="border border-neutral-200 bg-background p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <AlertTriangle className="h-5 w-5 text-amber-700" />
                    <h3 className="text-lg font-sans font-light text-neutral-900">
                      Risks ({allRisks.length})
                    </h3>
                  </div>
                  <ul className="space-y-3">
                    {allRisks.map((risk, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 text-sm text-neutral-700 leading-relaxed"
                      >
                        <span className="text-amber-700 mt-0.5">•</span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Opportunities */}
              {allOpportunities.length > 0 && (
                <div className="border border-neutral-200 bg-background p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Sparkles className="h-5 w-5 text-purple-700" />
                    <h3 className="text-lg font-sans font-light text-neutral-900">
                      Opportunities ({allOpportunities.length})
                    </h3>
                  </div>
                  <ul className="space-y-3">
                    {allOpportunities.map((opportunity, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 text-sm text-neutral-700 leading-relaxed"
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

        {/* Meeting Topics/Segments */}
        {segments && segments.length > 0 && (
          <div className="mb-20">
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-sans font-light tracking-tight text-neutral-900 mb-2">
                Discussion Topics
              </h2>
              <p className="text-sm text-neutral-500">
                {segments.length} {segments.length === 1 ? 'topic' : 'topics'}{' '}
                covered
              </p>
            </div>

            <div className="space-y-6">
              {segments.map((segment, index) => (
                <div
                  key={segment.id}
                  className="border border-neutral-200 bg-background p-8"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-sans font-light text-neutral-900 flex-1">
                      {segment.title || `Topic ${index + 1}`}
                    </h3>
                    <span className="px-3 py-1 text-[10px] font-semibold tracking-[0.1em] uppercase bg-neutral-100 text-neutral-700 border border-neutral-200">
                      {segment.segment_index + 1}
                    </span>
                  </div>

                  {segment.summary && (
                    <p className="text-sm text-neutral-600 leading-relaxed mb-6">
                      {segment.summary}
                    </p>
                  )}

                  {/* Segment-specific outcomes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-neutral-100">
                    {segment.decisions &&
                      Array.isArray(segment.decisions) &&
                      segment.decisions.length > 0 && (
                        <div>
                          <SectionHeader className="text-xs mb-3">
                            Decisions
                          </SectionHeader>
                          <ul className="space-y-2">
                            {segment.decisions.map(
                              (decision: unknown, idx: number) => {
                                const text =
                                  typeof decision === 'string'
                                    ? decision
                                    : (decision as Record<string, unknown>)
                                        ?.description
                                return (
                                  <li
                                    key={idx}
                                    className="flex items-start gap-2 text-sm text-neutral-700"
                                  >
                                    <span className="text-green-700">✓</span>
                                    <span>{String(text)}</span>
                                  </li>
                                )
                              }
                            )}
                          </ul>
                        </div>
                      )}

                    {segment.tasks &&
                      Array.isArray(segment.tasks) &&
                      segment.tasks.length > 0 && (
                        <div>
                          <SectionHeader className="text-xs mb-3">
                            Action Items
                          </SectionHeader>
                          <ul className="space-y-2">
                            {segment.tasks.map((task: unknown, idx: number) => {
                              const text =
                                typeof task === 'string'
                                  ? task
                                  : (task as Record<string, unknown>)
                                      ?.description
                              return (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2 text-sm text-neutral-700"
                                >
                                  <span className="text-blue-700">→</span>
                                  <span>{String(text)}</span>
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      )}

                    {segment.risks &&
                      Array.isArray(segment.risks) &&
                      segment.risks.length > 0 && (
                        <div>
                          <SectionHeader className="text-xs mb-3">
                            Risks
                          </SectionHeader>
                          <ul className="space-y-2">
                            {segment.risks.map((risk: unknown, idx: number) => {
                              const text =
                                typeof risk === 'string'
                                  ? risk
                                  : (risk as Record<string, unknown>)
                                      ?.description
                              return (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2 text-sm text-neutral-700"
                                >
                                  <span className="text-amber-700">⚠</span>
                                  <span>{String(text)}</span>
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      )}

                    {segment.opportunities &&
                      Array.isArray(segment.opportunities) &&
                      segment.opportunities.length > 0 && (
                        <div>
                          <SectionHeader className="text-xs mb-3">
                            Opportunities
                          </SectionHeader>
                          <ul className="space-y-2">
                            {segment.opportunities.map(
                              (opportunity: unknown, idx: number) => {
                                const text =
                                  typeof opportunity === 'string'
                                    ? opportunity
                                    : (opportunity as Record<string, unknown>)
                                        ?.description
                                return (
                                  <li
                                    key={idx}
                                    className="flex items-start gap-2 text-sm text-neutral-700"
                                  >
                                    <span className="text-purple-700">✨</span>
                                    <span>{String(text)}</span>
                                  </li>
                                )
                              }
                            )}
                          </ul>
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full Transcript */}
        {transcriptContent && (
          <div className="mb-20 max-w-6xl">
            <FormattedTranscript content={transcriptContent} />
          </div>
        )}

        {/* Empty State */}
        {!transcriptContent && (!segments || segments.length === 0) && (
          <div className="border border-neutral-200 bg-background p-12 md:p-16 text-center">
            <FileText
              className="h-16 w-16 text-neutral-300 mx-auto mb-6"
              strokeWidth={1.5}
            />
            <h3 className="text-2xl font-sans font-light text-neutral-900 tracking-tight mb-3">
              No transcript available
            </h3>
            <p className="text-sm text-neutral-500 leading-relaxed max-w-md mx-auto">
              The full transcript for this meeting has not been processed yet.
            </p>
          </div>
        )}

        {/* Attendees & Keywords - Bottom Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Attendees */}
          {participantsList.length > 0 && (
            <div className="border border-neutral-200 bg-background p-6">
              <SectionHeader count={participantsList.length} className="mb-4">
                Attendees
              </SectionHeader>
              <div className="flex flex-wrap gap-2">
                {participantsList.map((participant, index) => (
                  <span
                    key={`attendee-${meeting.id}-${participant}-${index}`}
                    className="px-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 text-neutral-700 rounded-sm"
                  >
                    {participant}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </>
  )
}
