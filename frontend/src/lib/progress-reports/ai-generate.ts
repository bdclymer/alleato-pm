import { generateText } from "ai";
import { getLanguageModel } from "@/lib/ai/providers";
import { createServiceClient } from "@/lib/supabase/service";
import {
  PROGRESS_REPORT_SYSTEM_PROMPT,
  buildProgressReportUserMessage,
} from "@/lib/ai/prompts/progress-report";

const MODEL_ID = "openai/gpt-5.5";

export interface AiGeneratedSections {
  past_week_highlights: string;
  upcoming_week_activities: string;
  open_items: string;
}

/**
 * Generates the three progress report sections using AI.
 * Queries source data fresh from the DB for the given week range.
 * Falls back to most recent project data when nothing falls in range.
 */
export async function generateProgressReportSections({
  projectId,
  weekStart,
  weekEnd,
}: {
  projectId: number;
  weekStart: string;
  weekEnd: string;
}): Promise<AiGeneratedSections> {
  const db = createServiceClient();

  const [
    projectResult,
    meetingsResult,
    emailsResult,
    photosResult,
    changeEventsResult,
    changeOrdersResult,
    rfisResult,
    submittalsResult,
  ] = await Promise.all([
    db.from("projects").select("name").eq("id", projectId).single(),
    db
      .from("document_metadata")
      .select("id, title, date, summary, overview, action_items, summary_bullets")
      .eq("project_id", projectId)
      .eq("type", "meeting")
      .gte("date", weekStart)
      .lte("date", weekEnd)
      .order("date", { ascending: false })
      .limit(10),
    db
      .from("project_emails")
      .select("id, subject, body, body_text, sent_at, received_at")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .gte("received_at", weekStart)
      .lte("received_at", weekEnd)
      .order("received_at", { ascending: false, nullsFirst: false })
      .limit(15),
    db
      .from("project_photos")
      .select("id, title, description, location, date_taken")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .gte("date_taken", weekStart)
      .lte("date_taken", weekEnd)
      .order("date_taken", { ascending: false, nullsFirst: false })
      .limit(20),
    db
      .from("change_events")
      .select("id, title, status, created_at")
      .eq("project_id", projectId)
      .in("status", ["pending", "open", "in_review"])
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("change_orders")
      .select("id, status, created_at")
      .eq("project_id", projectId)
      .in("status", ["pending", "submitted"])
      .limit(50),
    db
      .from("rfis")
      .select("id, number, subject, status, date_initiated, due_date")
      .eq("project_id", projectId)
      .gte("date_initiated", weekStart)
      .lte("date_initiated", weekEnd)
      .order("number", { ascending: false })
      .limit(20),
    db
      .from("submittals")
      .select("id, submittal_number, title, status, submission_date, sent_date")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .or(`submission_date.gte.${weekStart},sent_date.gte.${weekStart}`)
      .order("submittal_number", { ascending: false })
      .limit(20),
  ]);

  const projectName =
    (projectResult.data as { name: string | null } | null)?.name ?? "Project";

  // Fall back to most recent data when nothing falls in the date range
  const meetings =
    (meetingsResult.data ?? []).length > 0
      ? (meetingsResult.data ?? [])
      : await db
          .from("document_metadata")
          .select("id, title, date, summary, overview, action_items, summary_bullets")
          .eq("project_id", projectId)
          .eq("type", "meeting")
          .order("date", { ascending: false })
          .limit(5)
          .then((r) => r.data ?? []);

  const emails =
    (emailsResult.data ?? []).length > 0
      ? (emailsResult.data ?? [])
      : await db
          .from("project_emails")
          .select("id, subject, body, body_text, sent_at, received_at")
          .eq("project_id", projectId)
          .is("deleted_at", null)
          .order("received_at", { ascending: false, nullsFirst: false })
          .limit(8)
          .then((r) => r.data ?? []);

  const photos =
    (photosResult.data ?? []).length > 0
      ? (photosResult.data ?? [])
      : await db
          .from("project_photos")
          .select("id, title, description, location, date_taken")
          .eq("project_id", projectId)
          .is("deleted_at", null)
          .order("date_taken", { ascending: false, nullsFirst: false })
          .limit(10)
          .then((r) => r.data ?? []);

  const userMessage = buildProgressReportUserMessage({
    projectName,
    weekStart,
    weekEnd,
    meetings: meetings as Parameters<typeof buildProgressReportUserMessage>[0]["meetings"],
    emails: emails as Parameters<typeof buildProgressReportUserMessage>[0]["emails"],
    photos: photos as Parameters<typeof buildProgressReportUserMessage>[0]["photos"],
    financialContext: {
      pendingChangeEventsCount: (changeEventsResult.data ?? []).length,
      pendingChangeOrdersCount: (changeOrdersResult.data ?? []).length,
    },
    rfis: (rfisResult.data ?? []) as Parameters<typeof buildProgressReportUserMessage>[0]["rfis"],
    submittals: (submittalsResult.data ?? []) as Parameters<typeof buildProgressReportUserMessage>[0]["submittals"],
  });

  const result = await generateText({
    model: getLanguageModel(MODEL_ID),
    system: PROGRESS_REPORT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
    temperature: 0.4,
  });

  const raw = result.text.trim();
  const jsonText = raw
    .replace(/^```(?:json)?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();

  let parsed: AiGeneratedSections;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("AI returned an unstructured response. Try again.");
  }

  if (
    typeof parsed.past_week_highlights !== "string" ||
    typeof parsed.upcoming_week_activities !== "string" ||
    typeof parsed.open_items !== "string"
  ) {
    throw new Error("AI response was missing required fields. Try again.");
  }

  return {
    past_week_highlights: parsed.past_week_highlights.trim(),
    upcoming_week_activities: parsed.upcoming_week_activities.trim(),
    open_items: parsed.open_items.trim(),
  };
}
