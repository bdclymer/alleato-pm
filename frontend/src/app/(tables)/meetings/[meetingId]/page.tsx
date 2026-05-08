import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FormattedTranscript } from "@/app/(main)/[projectId]/meetings/formatted-transcript";
import { parseTranscriptSections } from "@/app/(main)/[projectId]/meetings/[meetingId]/parse-transcript-sections";
import { MarkdownSummary } from "@/app/(main)/[projectId]/meetings/[meetingId]/markdown-summary";
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
  params: Promise<{ meetingId: string }>;
}

export default async function MeetingDetailPage({ params }: PageProps) {
  const { meetingId } = await params;
  const supabase = await createClient();

  const { data: meetingData, error } = await supabase
    .from("document_metadata")
    .select("*")
    .eq("id", meetingId)
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

  // Fetch related meetings (same project if available, or recent meetings)
  const relatedQuery = supabase
    .from("document_metadata")
    .select("id, title, date, duration_minutes")
    .eq("type", "meeting")
    .neq("id", meetingId)
    .order("date", { ascending: false })
    .limit(5);

  if (meeting.project_id) {
    relatedQuery.eq("project_id", meeting.project_id);
  }

  const { data: relatedMeetingsData } = await relatedQuery;
  const relatedMeetings = relatedMeetingsData || [];

  const {
    tasks: allTasks,
    risks: allRisks,
    decisions: allDecisions,
    opportunities: allOpportunities,
  } = collectSegmentItems(segments);

  let transcriptContent = null;
  const storageUrl = meeting.url || meeting.source;

  if (storageUrl && storageUrl.includes("supabase.co/storage")) {
    try {
      const response = await fetch(storageUrl);
      if (response.ok) {
        transcriptContent = await response.text();
      }
    } catch (storageError) {
      console.warn(JSON.stringify({
        event: "meeting_transcript_storage_fetch_failed",
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
      backHref="/meetings"
      backLabel="Meetings"
      relatedMeetings={relatedMeetings}
      relatedMeetingsBaseHref="/meetings"
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
            projectId={meeting.project_id ?? null}
          />
        ) : undefined
      }
    />
  );
}
