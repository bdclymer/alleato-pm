import { notFound, redirect } from "next/navigation";
import { FormattedTranscript } from "../formatted-transcript";
import { parseTranscriptSections } from "./parse-transcript-sections";
import { MarkdownSummary } from "./markdown-summary";
import { DigestSection } from "./digest-section";
import { getProjectInfo } from "@/lib/supabase/project-fetcher";
import { MeetingDetailContent } from "@/components/meetings/meeting-detail-content";
import { collectSegmentItems } from "@/lib/meetings/collect-segment-items";
import type { Database } from "@/types/database.types";

type MeetingSegment =
  Database["public"]["Tables"]["meeting_segments"]["Row"] & {
    opportunities?: unknown[];
  };

type DocumentMetadata =
  Database["public"]["Tables"]["document_metadata"]["Row"] & {
    duration?: number;
  };

interface PageProps {
  params: Promise<{ projectId: string; meetingId: string }>;
}

export default async function ProjectMeetingDetailPage({
  params,
}: PageProps) {
  const { projectId, meetingId } = await params;
  const { project, numericProjectId, supabase } =
    await getProjectInfo(projectId);

  // Transcript-first detail. The Meetings tool's structured rows use UUID
  // ids; historical links and backfilled transcripts use document_metadata
  // TEXT ids. Resolve either shape to the transcript document — planning
  // meetings that have no transcript yet get the agenda experience instead.
  const MEETINGS_UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let documentId = meetingId;
  if (MEETINGS_UUID_RE.test(meetingId)) {
    const { data: meetingRow } = await supabase
      .from("meetings")
      .select("id, transcript_document_id, deleted_at")
      .eq("id", meetingId)
      .eq("project_id", numericProjectId)
      .maybeSingle();
    if (!meetingRow || meetingRow.deleted_at) {
      notFound();
    }
    if (!meetingRow.transcript_document_id) {
      redirect(`/${projectId}/meetings/${meetingId}/agenda`);
    }
    documentId = meetingRow.transcript_document_id;
  }

  const { data: meetingData, error } = await supabase
    .from("document_metadata")
    .select("*")
    .eq("id", documentId)
    .eq("project_id", numericProjectId)
    .is("deleted_at", null)
    .single();

  if (error || !meetingData) {
    notFound();
  }

  const meeting = meetingData as DocumentMetadata;

  const { data: segmentsData } = await supabase
    .from("meeting_segments")
    .select("*")
    .eq("metadata_id", documentId)
    .order("segment_index", { ascending: true });

  const segments = (segmentsData || []) as MeetingSegment[];

  // Fetch related meetings for this project
  const { data: relatedMeetingsData } = await supabase
    .from("document_metadata")
    .select("id, title, date, created_at, duration_minutes")
    .eq("project_id", numericProjectId)
    .eq("type", "meeting")
    .is("deleted_at", null)
    .neq("id", documentId)
    .order("date", { ascending: false })
    .limit(5);

  const relatedMeetings = relatedMeetingsData || [];

  const {
    tasks: allTasks,
    risks: allRisks,
    decisions: allDecisions,
    opportunities: allOpportunities,
  } = collectSegmentItems(segments);

  let transcriptContent = null;
  let transcriptLoadFailed = false;
  const storageUrl = meeting.url || meeting.source;

  if (storageUrl && storageUrl.includes("supabase.co/storage")) {
    try {
      const response = await fetch(storageUrl);
      if (response.ok) {
        transcriptContent = await response.text();
      } else {
        transcriptLoadFailed = true;
      }
    } catch (storageError) {
      transcriptLoadFailed = true;
      console.warn(JSON.stringify({
        event: "meeting_transcript_storage_fetch_failed",
        projectId,
        meetingId,
        storageUrl,
        error:
          storageError instanceof Error
            ? storageError.message
            : String(storageError),
      }));
    }
  }

  if (!transcriptContent && meeting.content) {
    transcriptContent = meeting.content;
  }

  const fromArray = meeting.participants_array
    ?.map((p: string) => p.trim())
    .filter(Boolean) || [];
  const fromString = !fromArray.length && meeting.participants
    ? meeting.participants.replace(/[{}"]/g, "").split(",").map((p: string) => p.trim()).filter(Boolean)
    : [];
  const participantsList = [...new Set<string>([...fromArray, ...fromString])];

  const parsedSections = transcriptContent
    ? parseTranscriptSections(transcriptContent)
    : null;

  return (
    <MeetingDetailContent
      meeting={meeting}
      segments={segments}
      parsedSections={parsedSections}
      participantsList={participantsList}
      allTasks={allTasks}
      allRisks={allRisks}
      allDecisions={allDecisions}
      allOpportunities={allOpportunities}
      transcriptContent={transcriptContent}
      transcriptLoadFailed={transcriptLoadFailed && !transcriptContent}
      backHref={`/${projectId}/meetings`}
      backLabel={
        project?.name ? `${project.name} · Meetings` : "Meetings"
      }
      relatedMeetings={relatedMeetings}
      relatedMeetingsBaseHref={`/${projectId}/meetings`}
      digestSlot={
        <DigestSection projectId={projectId} meetingId={documentId} />
      }
      summarySlot={
        parsedSections?.summary ? (
          <MarkdownSummary content={parsedSections.summary} />
        ) : undefined
      }
      transcriptSlot={
        parsedSections?.transcript ? (
          <FormattedTranscript
            content={parsedSections.transcript}
            participants={participantsList}
            meetingId={meeting.id}
            meetingTitle={meeting.title}
            projectId={meeting.project_id ?? numericProjectId ?? null}
          />
        ) : undefined
      }
    />
  );
}
