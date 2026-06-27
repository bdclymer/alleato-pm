import { notFound } from "next/navigation";
import { FormattedTranscript } from "../formatted-transcript";
import { parseTranscriptSections } from "./parse-transcript-sections";
import { MarkdownSummary } from "./markdown-summary";
import { DigestSection } from "./digest-section";
import { getProjectInfo } from "@/lib/supabase/project-fetcher";
import { createServiceClient } from "@/lib/supabase/service";
import { MeetingDetailContent } from "@/components/meetings/meeting-detail-content";
import { collectSegmentItems } from "@/lib/meetings/collect-segment-items";
import { reportNonCriticalFailure } from "@/lib/report-non-critical-failure";
import type { Database } from "@/types/database.types";

// Uses createServiceClient() to sign recording URLs — must be dynamic so the
// production build never tries to prerender it without SUPABASE_SERVICE_ROLE_KEY.
export const dynamic = "force-dynamic";

type MeetingSegment =
  Database["public"]["Tables"]["meeting_segments"]["Row"] & {
    opportunities?: unknown[];
  };

// New Teams-meeting columns are optional here until the migration regenerates
// database.types.ts (kept fully typed — no `any`).
type DocumentMetadata =
  Database["public"]["Tables"]["document_metadata"]["Row"] & {
    duration?: number;
    recording_storage_path?: string | null;
    recording_url?: string | null;
    transcript_source?: string | null;
    teams_meeting_id?: string | null;
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

  const { data: meetingData, error } = await supabase
    .from("document_metadata")
    .select("*")
    .eq("id", meetingId)
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
    .eq("metadata_id", meetingId)
    .order("segment_index", { ascending: true });

  const segments = (segmentsData || []) as MeetingSegment[];

  // Fetch related meetings for this project
  const { data: relatedMeetingsData } = await supabase
    .from("document_metadata")
    .select("id, title, date, created_at, duration_minutes")
    .eq("project_id", numericProjectId)
    .eq("type", "meeting")
    .is("deleted_at", null)
    .neq("id", meetingId)
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

  // Recordings live in a private bucket — sign a short-lived URL server-side.
  let recordingUrl: string | null = meeting.recording_url ?? null;
  if (!recordingUrl && meeting.recording_storage_path) {
    const [bucket, ...rest] = meeting.recording_storage_path.split("/");
    const objectPath = rest.join("/");
    if (bucket && objectPath) {
      try {
        const { data } = await createServiceClient()
          .storage.from(bucket)
          .createSignedUrl(objectPath, 60 * 60);
        recordingUrl = data?.signedUrl ?? null;
      } catch (signError) {
        reportNonCriticalFailure({
          area: "meeting-detail",
          operation: "sign-recording-url",
          error: signError,
          userVisibleFallback: "The meeting recording could not be loaded.",
        });
      }
    }
  }

  return (
    <MeetingDetailContent
      meeting={meeting}
      recordingUrl={recordingUrl}
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
        <DigestSection projectId={projectId} meetingId={meetingId} />
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
