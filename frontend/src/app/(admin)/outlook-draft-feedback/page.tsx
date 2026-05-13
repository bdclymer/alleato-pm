import { PageShell } from "@/components/layout";
import { requireAdmin } from "@/app/api/admin/intelligence-compiler/_shared";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database, Json } from "@/types/database.types";

export const dynamic = "force-dynamic";

type FeedbackEvent =
  Database["public"]["Tables"]["ai_feedback_events"]["Row"];

function asRecord(value: Json | null): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function textValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function formatDate(value: string | null): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function reasonLabel(value: string | null): string {
  if (!value) return "No reason";
  return value.replaceAll("_", " ");
}

function feedbackSummary(event: FeedbackEvent) {
  const metadata = asRecord(event.metadata);
  const sourceContext = asRecord(event.source_context);

  return {
    id: event.id,
    createdAt: formatDate(event.created_at),
    signal: event.signal,
    reason: reasonLabel(event.reason_category),
    feedbackText: event.free_text,
    mailboxUserId:
      textValue(sourceContext.mailboxUserId) ??
      textValue(metadata.mailboxUserId) ??
      "Unknown mailbox",
    subject:
      textValue(sourceContext.subject) ??
      textValue(metadata.subject) ??
      "Untitled draft",
    graphDraftMessageId:
      textValue(sourceContext.graphDraftMessageId) ??
      textValue(metadata.graphDraftMessageId) ??
      event.subject_id ??
      event.source_record_id ??
      "Unknown draft",
    graphSourceMessageId:
      textValue(sourceContext.graphSourceMessageId) ??
      textValue(metadata.graphSourceMessageId),
    voiceProfilePath:
      textValue(sourceContext.voiceProfilePath) ??
      textValue(metadata.voiceProfilePath),
    voiceProfileVersion:
      textValue(sourceContext.voiceProfileVersion) ??
      textValue(metadata.voiceProfileVersion),
  };
}

export default async function OutlookDraftFeedbackPage() {
  await requireAdmin("outlook-draft-feedback-page");

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("ai_feedback_events")
    .select("*")
    .eq("event_type", "outlook_email_draft_feedback_recorded")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`Failed to load Outlook draft feedback: ${error.message}`);
  }

  const events = (data ?? []).map(feedbackSummary);

  return (
    <PageShell
      variant="table"
      title="Outlook Draft Feedback"
      description="Review Brandon draft feedback captured from assistant Outlook draft widgets."
    >
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-foreground">
            Recent draft feedback
          </h2>
          <span className="text-sm text-muted-foreground">
            {events.length} event{events.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="overflow-hidden rounded-md border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Time</th>
                  <th className="px-3 py-2 text-left font-medium">Mailbox</th>
                  <th className="px-3 py-2 text-left font-medium">Subject</th>
                  <th className="px-3 py-2 text-left font-medium">Signal</th>
                  <th className="px-3 py-2 text-left font-medium">Reason</th>
                  <th className="px-3 py-2 text-left font-medium">Feedback</th>
                  <th className="px-3 py-2 text-left font-medium">Voice profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {events.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-muted-foreground"
                    >
                      No Outlook draft feedback has been recorded yet.
                    </td>
                  </tr>
                ) : (
                  events.map((event) => (
                    <tr key={event.id} className="align-top">
                      <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                        {event.createdAt}
                      </td>
                      <td className="px-3 py-3">{event.mailboxUserId}</td>
                      <td className="max-w-sm px-3 py-3">
                        <div className="font-medium text-foreground">
                          {event.subject}
                        </div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">
                          Draft: {event.graphDraftMessageId}
                        </div>
                        {event.graphSourceMessageId ? (
                          <div className="mt-1 truncate text-xs text-muted-foreground">
                            Source: {event.graphSourceMessageId}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 font-medium capitalize">
                        {event.signal}
                      </td>
                      <td className="px-3 py-3 capitalize text-muted-foreground">
                        {event.reason}
                      </td>
                      <td className="max-w-sm px-3 py-3 text-muted-foreground">
                        {event.feedbackText || "No written note"}
                      </td>
                      <td className="max-w-xs px-3 py-3 text-xs text-muted-foreground">
                        {event.voiceProfilePath ? (
                          <>
                            <div className="truncate">{event.voiceProfilePath}</div>
                            <div>{event.voiceProfileVersion ?? "No version"}</div>
                          </>
                        ) : (
                          "No profile metadata"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
