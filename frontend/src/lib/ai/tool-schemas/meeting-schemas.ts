import { z } from "zod";

export const searchMeetingsByTopicDescription =
  "Search meeting transcripts and notes by topic. Use when the user asks: " +
  "'what was discussed about [topic]?', 'find meetings about [subject]', " +
  "'what did the OAC decide about [issue]?'. Searches Fireflies transcripts " +
  "and meeting records using semantic search.";

export const searchMeetingsByTopicInputSchema = z.object({
  query: z.string().describe("Search query — topic, keywords, or question"),
  projectId: z.number().optional().describe("Filter to a specific project"),
  limit: z
    .number()
    .optional()
    .default(10)
    .describe("Max results to return (default 10)"),
});

export const getMeetingDetailsDescription =
  "Get full details for a specific meeting including transcript, action items, " +
  "and key decisions. Use when the user asks: 'show me the details of [meeting]', " +
  "'what happened in the [meeting name] meeting?', or when following up on a " +
  "search result that found a relevant meeting.";

export const getMeetingDetailsInputSchema = z.object({
  meetingId: z
    .string()
    .describe("Meeting ID from search results or Fireflies meeting ID"),
  includeTranscript: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include the full transcript text (can be long)"),
});

export const getMeetingsByDateDescription =
  "Get meetings for a specific date or date range. Use for: " +
  "'what meetings were today?', 'show me yesterday's meetings', " +
  "'meetings this week'. Returns meeting list with titles, dates, and summaries.";

export const getMeetingsByDateInputSchema = z.object({
  sinceIso: z
    .string()
    .describe("ISO start date/time for the date range"),
  untilIso: z
    .string()
    .optional()
    .describe("ISO end date/time (exclusive). Defaults to now."),
  projectId: z.number().optional().describe("Filter to a specific project"),
  limit: z
    .number()
    .optional()
    .default(20)
    .describe("Max meetings to return (default 20)"),
});

export const createMeetingNoteDescription =
  "Log notes from a meeting into the project record. Use when the user says " +
  "'log notes from today's meeting', 'record what we discussed', or " +
  "'save meeting notes for [project]'. Can pre-fill from Fireflies context if available. " +
  "Always preview before writing.";

export const createMeetingNoteInputSchema = z.object({
  projectId: z.number().describe("Project ID"),
  title: z.string().describe("Meeting title, e.g. 'OAC Meeting — March 2026'"),
  date: z.string().describe("ISO date string, e.g. '2026-03-23'"),
  summary: z.string().describe("Summary of what was discussed"),
  actionItems: z.string().optional().describe("Comma-separated action items from the meeting"),
  participants: z.string().optional().describe("Comma-separated list of attendees"),
  durationMinutes: z.number().optional().describe("Meeting duration in minutes"),
  confirmed: z.boolean().default(false),
  idempotencyKey: z.string().optional(),
});

