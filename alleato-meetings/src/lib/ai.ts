import Anthropic from "@anthropic-ai/sdk";
import type { MeetingInsights } from "./types";

/**
 * Extract the full meeting intelligence from a transcript in a single Claude call:
 * executive summary, structured notes, keywords, and — the core deliverable —
 * action items with WHO is responsible and WHEN (due date), plus decisions/risks.
 *
 * Uses a forced tool call so Claude returns schema-shaped JSON in tool_use.input
 * (no fragile prompt-and-parse). Model defaults to Claude Opus 4.8; override with
 * ANTHROPIC_MODEL.
 */

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

const TOOL_NAME = "record_meeting_intelligence";

// Strict tool schema: every property required; optionals are nullable so the model
// must emit an explicit null rather than omitting the field.
const INPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string", description: "3-5 sentence executive summary." },
    notes: { type: "string", description: "Markdown bullet notes of the key discussion points." },
    keywords: { type: "array", items: { type: "string" }, description: "Salient topics/keywords." },
    action_items: {
      type: "array",
      description: "Concrete action items committed to in the meeting.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", description: "The task, phrased imperatively." },
          owner: { type: ["string", "null"], description: "Who is responsible (name or email), or null if unstated." },
          due_date: { type: ["string", "null"], description: "Due date as YYYY-MM-DD, or null if unstated." },
        },
        required: ["title", "owner", "due_date"],
      },
    },
    decisions: { type: "array", items: { type: "string" }, description: "Decisions made." },
    risks: { type: "array", items: { type: "string" }, description: "Risks or concerns raised." },
  },
  required: ["summary", "notes", "keywords", "action_items", "decisions", "risks"],
} satisfies Anthropic.Tool.InputSchema;

const SYSTEM =
  "You are a meticulous meeting analyst. Extract structured intelligence from a meeting " +
  "transcript using the record_meeting_intelligence tool. Only use information stated in the " +
  "transcript — never invent owners or dates. If an action item has no clear owner or due date, " +
  "use null. Resolve relative dates (\"by Friday\", \"next week\") against the meeting date when given.";

export async function extractMeetingInsights(
  transcript: string,
  title: string,
  meetingDate: string | null,
): Promise<MeetingInsights> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Missing required env var: ANTHROPIC_API_KEY");
  const client = new Anthropic();

  const user = [
    `Meeting title: ${title}`,
    meetingDate ? `Meeting date: ${meetingDate}` : "",
    "",
    "Transcript:",
    transcript.slice(0, 180_000),
    "",
    "Call record_meeting_intelligence with the extracted fields.",
  ].join("\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM,
    tools: [
      {
        name: TOOL_NAME,
        description: "Record the structured intelligence extracted from a meeting transcript.",
        input_schema: INPUT_SCHEMA,
      },
    ],
    // Forcing this tool guarantees Claude returns the schema-shaped JSON in tool_use.input.
    tool_choice: { type: "tool", name: TOOL_NAME },
    messages: [{ role: "user", content: user }],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(`Claude did not return a ${TOOL_NAME} tool call (stop_reason: ${response.stop_reason})`);
  }
  const parsed = toolUse.input as Partial<MeetingInsights>;

  return {
    summary: parsed.summary ?? "",
    notes: parsed.notes ?? "",
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    action_items: Array.isArray(parsed.action_items)
      ? parsed.action_items
          .map((a) => ({
            title: String(a.title ?? "").trim(),
            owner: a.owner ? String(a.owner).trim() : null,
            due_date: normalizeDate(a.due_date),
          }))
          .filter((a) => a.title)
      : [],
    decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
    risks: Array.isArray(parsed.risks) ? parsed.risks : [],
  };
}

function normalizeDate(value: unknown): string | null {
  if (!value || typeof value !== "string") return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}
