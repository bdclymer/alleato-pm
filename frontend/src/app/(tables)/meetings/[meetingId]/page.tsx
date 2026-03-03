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
  Users,
  ArrowLeft,
} from 'lucide-react'
import { FormattedTranscript } from '@/app/(main)/[projectId]/meetings/formatted-transcript'
import { parseTranscriptSections } from '@/app/(main)/[projectId]/meetings/[meetingId]/parse-transcript-sections'
import { MarkdownSummary } from '@/app/(main)/[projectId]/meetings/[meetingId]/markdown-summary'
import type { Database } from '@/types/database.types'
import { PageContainer } from '@/components/layout'
import { AttendeeAvatarStack } from '@/components/meetings/attendee-avatar-stack'
import Link from 'next/link'
import { CollapsibleSection } from './collapsible-section'

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

  const { data: meetingData, error } = await supabase
    .from('document_metadata')
    .select('*')
    .eq('id', meetingId)
    .single()

  if (error || !meetingData) {
    notFound()
  }

  const meeting = meetingData as DocumentMetadata

  const { data: segmentsData } = await supabase
    .from('meeting_segments')
    .select('*')
    .eq('metadata_id', meetingId)
    .order('segment_index', { ascending: true })

  const segments = (segmentsData || []) as MeetingSegment[]

  const allTasks: string[] = []
  const allRisks: string[] = []
  const allDecisions: string[] = []
  const allOpportunities: string[] = []

  segments.forEach((segment) => {
    if (segment.tasks && Array.isArray(segment.tasks)) {
      segment.tasks.forEach((task: unknown) => {
        const text =
          typeof task === 'string' ? task : (task as Record<string, unknown>)?.description
        if (text) allTasks.push(String(text))
      })
    }
    if (segment.risks && Array.isArray(segment.risks)) {
      segment.risks.forEach((risk: unknown) => {
        const text =
          typeof risk === 'string' ? risk : (risk as Record<string, unknown>)?.description
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

  let transcriptContent = null
  const storageUrl = meeting.url || meeting.source

  if (storageUrl && storageUrl.includes('supabase.co/storage')) {
    try {
      const response = await fetch(storageUrl)
      if (response.ok) {
        transcriptContent = await response.text()
      }
    } catch {
      // fallback below
    }
  }

  if (!transcriptContent && meeting.content) {
    transcriptContent = meeting.content
  }

  const participantsList = [
    ...new Set<string>(
      meeting.participants_array?.map((p: string) => p.trim()).filter(Boolean) || []
    ),
  ]

  const parsedSections = transcriptContent ? parseTranscriptSections(transcriptContent) : null

  const shortDescription =
    meeting.summary && meeting.summary.length > 180
      ? `${meeting.summary.slice(0, 180)}...`
      : meeting.summary || undefined

  const hasActionItems =
    allTasks.length > 0 ||
    allDecisions.length > 0 ||
    allRisks.length > 0 ||
    allOpportunities.length > 0

  return (
    <PageContainer maxWidth="xl" className="pb-12">
      {/* Page header — inside container so it's constrained */}
      <div className="mb-6">
        <Link
          href="/meetings"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Meetings
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">
          {meeting.title || 'Untitled Meeting'}
        </h1>
        {shortDescription && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground max-w-2xl">
            {shortDescription}
          </p>
        )}
      </div>

      {/* Meta bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border pb-4 mb-8">
        {meeting.date ? (
          <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {format(new Date(meeting.date), 'EEEE, MMMM d, yyyy')}
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
        {/* Main content — narrative only */}
        <div className="space-y-8">
          {/* Meeting Overview */}
          {parsedSections?.gist ? (
            <section className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-primary">
                Meeting Overview
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {parsedSections.gist}
              </p>
            </section>
          ) : null}

          {/* Summary */}
          {parsedSections?.summary ? (
            <section className="border-t border-border pt-6">
              <CollapsibleSection label="Summary">
                <MarkdownSummary content={parsedSections.summary} />
              </CollapsibleSection>
            </section>
          ) : null}

          {/* Discussion Topics — summaries only, no per-topic action item repetition */}
          {segments.length > 0 && (
            <section className="border-t border-border pt-6">
              <CollapsibleSection label={`Discussion Topics (${segments.length})`}>
                <div className="space-y-6">
                  {segments.map((segment, index) => (
                    <div key={segment.id} className="space-y-1.5 border-l-2 border-border pl-4">
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
              </CollapsibleSection>
            </section>
          )}

          {/* Full Transcript */}
          {parsedSections?.transcript ? (
            <section className="border-t border-border pt-6">
              <FormattedTranscript
                content={parsedSections.transcript}
                participants={participantsList}
              />
            </section>
          ) : null}

          {/* Empty state */}
          {!transcriptContent && segments.length === 0 && (
            <section className="py-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" strokeWidth={1.5} />
              <p className="text-sm font-medium text-foreground">No transcript available</p>
              <p className="text-sm text-muted-foreground mt-1">
                This meeting has not been processed yet.
              </p>
            </section>
          )}
        </div>

        {/* Sidebar — attendees, topics, and all action items in one place */}
        <aside className="space-y-6">
          {/* Attendees */}
          {participantsList.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
                <Users className="h-3.5 w-3.5" />
                Attendees ({participantsList.length})
              </div>
              <AttendeeAvatarStack participants={participantsList} />
            </div>
          )}

          {/* Action items, decisions, risks, opportunities — all in sidebar */}
          {hasActionItems && (
            <div className="space-y-4 border-t border-border pt-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-primary">
                Action Snapshot
              </div>

              {allTasks.length > 0 && (
                <SidebarList
                  icon={<ListTodo className="h-3.5 w-3.5 text-blue-600" />}
                  label={`Action Items (${allTasks.length})`}
                  items={allTasks}
                />
              )}

              {allDecisions.length > 0 && (
                <SidebarList
                  icon={<CheckCircle className="h-3.5 w-3.5 text-green-600" />}
                  label={`Decisions (${allDecisions.length})`}
                  items={allDecisions}
                />
              )}

              {allRisks.length > 0 && (
                <SidebarList
                  icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
                  label={`Risks (${allRisks.length})`}
                  items={allRisks}
                />
              )}

              {allOpportunities.length > 0 && (
                <SidebarList
                  icon={<Sparkles className="h-3.5 w-3.5 text-purple-600" />}
                  label={`Opportunities (${allOpportunities.length})`}
                  items={allOpportunities}
                />
              )}
            </div>
          )}

          {/* Keywords */}
          {parsedSections?.keywords && (
            <div className="space-y-2 border-t border-border pt-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-primary">
                Topics
              </div>
              <div className="flex flex-wrap gap-2">
                {parsedSections.keywords
                  .split(',')
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
  )
}

function SidebarList({
  icon,
  label,
  items,
}: {
  icon: React.ReactNode
  label: string
  items: string[]
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <ul className="space-y-1.5 pl-5">
        {items.map((item, idx) => (
          <li key={idx} className="text-xs leading-relaxed text-muted-foreground list-disc">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
