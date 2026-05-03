export const PROGRESS_REPORT_SYSTEM_PROMPT = `You are a senior construction project manager with 20 years of experience writing weekly progress reports for owners and developers. Your reports are known for being specific, honest, and free of filler.

Your task: generate three sections of a weekly progress report from project source data.

## Output format

Return ONLY a valid JSON object — no markdown fences, no preamble, no commentary:
{
  "past_week_highlights": "- bullet 1\\n- bullet 2\\n...",
  "upcoming_week_activities": "- bullet 1\\n- bullet 2\\n...",
  "open_items": "- bullet 1\\n- bullet 2\\n..."
}

## Writing rules

- Active voice: "Completed Level 2 MEP rough-in" not "MEP rough-in was completed"
- Specific: use trade names, floor levels, zones, RFI numbers, submittal numbers from the source data
- Concise: one idea per bullet, under 18 words
- Prioritized: most significant items first
- No filler: never write "The team continued to make progress", "Work proceeded as planned", or similar
- Never invent details not present in the source material
- 4–7 bullets per section (never more than 7)

## Section definitions

**Past Week Highlights**
Completed work, installed materials, approvals received, inspections passed, submittals approved, RFIs closed. Focus on tangible progress an owner cares about.

**Upcoming Week Activities**
Specific work planned for the next 7 days. Name the trade, scope, and location. "Concrete pour — Level 3 deck" not "Continue concrete work".

**Open Items**
Unresolved issues that need the client's attention, decision, or approval. Include: pending change events, open RFIs awaiting response, submittals awaiting owner approval, design questions, schedule risks. Each item should make clear what action is needed and by whom. If there are genuinely no open items, write a single bullet: "- No open items requiring client action this week."
`;

export function buildProgressReportUserMessage({
  projectName,
  weekStart,
  weekEnd,
  meetings,
  emails,
  photos,
  financialContext,
  rfis,
  submittals,
}: {
  projectName: string;
  weekStart: string;
  weekEnd: string;
  meetings: Array<{
    title: string | null;
    date: string | null;
    summary: string | null;
    overview: string | null;
    action_items: string | null;
    summary_bullets: unknown;
  }>;
  emails: Array<{
    subject: string;
    body_text: string | null;
    body: string | null;
    received_at: string | null;
    sent_at: string | null;
  }>;
  photos: Array<{
    title: string;
    description: string | null;
    location: string | null;
    date_taken: string | null;
  }>;
  financialContext?: {
    pendingChangeEventsCount: number;
    pendingChangeOrdersCount: number;
  } | null;
  rfis?: Array<{
    number: number;
    subject: string;
    status: string;
    due_date: string | null;
  }> | null;
  submittals?: Array<{
    submittal_number: string;
    title: string;
    status: string | null;
    submission_date: string | null;
  }> | null;
}): string {
  const parts: string[] = [
    `Project: ${projectName}`,
    `Reporting week: ${weekStart} through ${weekEnd}`,
    "",
  ];

  if (meetings.length > 0) {
    parts.push("## Meetings this week");
    for (const meeting of meetings) {
      parts.push(`### ${meeting.title ?? "Untitled meeting"} (${meeting.date ?? "no date"})`);
      if (meeting.overview) parts.push(`Overview: ${meeting.overview.slice(0, 800)}`);
      if (meeting.summary) parts.push(`Summary: ${meeting.summary.slice(0, 800)}`);
      if (meeting.action_items) parts.push(`Action items: ${meeting.action_items.slice(0, 600)}`);
      const bullets = parseBullets(meeting.summary_bullets);
      if (bullets.length > 0) parts.push(`Key points: ${bullets.slice(0, 10).join("; ")}`);
    }
    parts.push("");
  }

  if (emails.length > 0) {
    parts.push("## Emails / correspondence this week");
    for (const email of emails.slice(0, 8)) {
      const date = email.received_at ?? email.sent_at ?? "";
      const preview = (email.body_text ?? email.body ?? "").slice(0, 400);
      parts.push(`- Subject: ${email.subject}${date ? ` (${date.slice(0, 10)})` : ""}${preview ? `\n  Preview: ${preview}` : ""}`);
    }
    parts.push("");
  }

  if (photos.length > 0) {
    parts.push("## Progress photos uploaded");
    for (const photo of photos.slice(0, 12)) {
      const loc = photo.location ? ` at ${photo.location}` : "";
      const desc = photo.description ? ` — ${photo.description}` : "";
      parts.push(`- ${photo.title}${loc}${desc}`);
    }
    parts.push("");
  }

  if (rfis && rfis.length > 0) {
    parts.push("## RFIs opened this week");
    for (const rfi of rfis.slice(0, 10)) {
      const due = rfi.due_date ? ` (due ${rfi.due_date.slice(0, 10)})` : "";
      parts.push(`- RFI #${rfi.number}: ${rfi.subject} — ${rfi.status}${due}`);
    }
    parts.push("");
  }

  if (submittals && submittals.length > 0) {
    parts.push("## Submittals activity this week");
    for (const sub of submittals.slice(0, 10)) {
      parts.push(`- ${sub.submittal_number}: ${sub.title} — ${sub.status ?? "submitted"}`);
    }
    parts.push("");
  }

  if (financialContext) {
    parts.push("## Financial context");
    if (financialContext.pendingChangeEventsCount > 0) {
      parts.push(`- ${financialContext.pendingChangeEventsCount} change event${financialContext.pendingChangeEventsCount === 1 ? "" : "s"} pending review`);
    }
    if (financialContext.pendingChangeOrdersCount > 0) {
      parts.push(`- ${financialContext.pendingChangeOrdersCount} change order${financialContext.pendingChangeOrdersCount === 1 ? "" : "s"} awaiting approval`);
    }
    parts.push("");
  }

  if (
    meetings.length === 0 &&
    emails.length === 0 &&
    photos.length === 0
  ) {
    parts.push("No source material was found for this reporting week. Generate generic placeholder bullets so the PM can edit them.");
  }

  parts.push("Generate the three report sections now. Return only the JSON object.");

  return parts.join("\n");
}

function parseBullets(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}
