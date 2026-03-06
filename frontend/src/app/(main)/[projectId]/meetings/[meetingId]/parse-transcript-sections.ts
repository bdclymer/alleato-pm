/**
 * Parses markdown-formatted meeting content into distinct sections
 *
 * Expected format:
 * # Meeting Title
 * **Date:** ...
 * **Duration:** ...
 *
 * ## Summary
 * - Bullet points
 *
 * ## Gist
 * Short description paragraph
 *
 * ## Keywords
 * keyword1, keyword2, keyword3
 *
 * ## Transcript
 * **0:**
 * Actual conversation...
 */

export interface ParsedTranscriptSections {
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
  transcript: string | null;
}

export function parseTranscriptSections(
  content: string
): ParsedTranscriptSections {
  const getSection = (name: string): string | null => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = content.match(
      new RegExp(`##\\s*${escaped}\\s*([\\s\\S]*?)(?=\\n##|$)`, "i")
    );
    return match?.[1]?.trim() || null;
  };

  const summary = getSection("Summary");
  const gist = getSection("Gist");
  const keywords = getSection("Keywords");
  const shortSummary = getSection("Short Summary");
  const shortOverview = getSection("Short Overview");
  const bulletGist = getSection("Bullet Gist");
  const shorthandBullet = getSection("Shorthand Bullet");
  const outline = getSection("Outline");
  const notes = getSection("Notes");
  const meetingType = getSection("Meeting Type");
  const topicsDiscussed = getSection("Topics Discussed");
  const transcriptChapters = getSection("Transcript Chapters");
  const actionItems = getSection("Action Items");
  const meetingAttendees = getSection("Meeting Attendees");
  const meetingAttendance = getSection("Meeting Attendance");
  const analytics = getSection("Analytics");
  const meetingInfo = getSection("Meeting Info");
  const channels = getSection("Channels");
  const appsPreview = getSection("Apps Preview");
  const sharedWith = getSection("Shared With");
  const transcript = getSection("Transcript");

  return {
    summary,
    gist,
    keywords,
    shortSummary,
    shortOverview,
    bulletGist,
    shorthandBullet,
    outline,
    notes,
    meetingType,
    topicsDiscussed,
    transcriptChapters,
    actionItems,
    meetingAttendees,
    meetingAttendance,
    analytics,
    meetingInfo,
    channels,
    appsPreview,
    sharedWith,
    transcript,
  };
}
