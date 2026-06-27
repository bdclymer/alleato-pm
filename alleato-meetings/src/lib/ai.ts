import OpenAI from "openai";
import type { MeetingInsights } from "./types";

/**
 * Extract the full meeting intelligence from a transcript in a single LLM call:
 * executive summary, structured notes, keywords, and — the core deliverable —
 * action items with WHO is responsible and WHEN (due date), plus decisions/risks.
 */
export async function extractMeetingInsights(
  transcript: string,
  title: string,
  meetingDate: string | null,
): Promise<MeetingInsights> {
  const client = new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
  const model = process.env.OPENAI_MODEL || "gpt-4o";

  const system =
    "You are a meticulous meeting analyst. Extract structured intelligence from a " +
    "meeting transcript. Only use information stated in the transcript — never invent " +
    "owners or dates. If an action item has no clear owner or due date, return null for it. " +
    "Resolve relative dates (\"by Friday\", \"next week\") against the meeting date when one is given.";

  const user = [
    `Meeting title: ${title}`,
    meetingDate ? `Meeting date: ${meetingDate}` : "",
    "",
    "Transcript:",
    transcript.slice(0, 90_000),
    "",
    "Return STRICT JSON with this shape:",
    `{
  "summary": "3-5 sentence executive summary",
  "notes": "markdown bullet notes of the key discussion points",
  "keywords": ["topic", ...],
  "action_items": [{"title": "imperative task", "owner": "person name/email or null", "due_date": "YYYY-MM-DD or null"}],
  "decisions": ["decision made", ...],
  "risks": ["risk or concern raised", ...]
}`,
  ].join("\n");

  const res = await client.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const raw = res.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Partial<MeetingInsights>;
  return {
    summary: parsed.summary ?? "",
    notes: parsed.notes ?? "",
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    action_items: Array.isArray(parsed.action_items)
      ? parsed.action_items.map((a) => ({
          title: String(a.title ?? "").trim(),
          owner: a.owner ? String(a.owner).trim() : null,
          due_date: normalizeDate(a.due_date),
        })).filter((a) => a.title)
      : [],
    decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
    risks: Array.isArray(parsed.risks) ? parsed.risks : [],
  };
}

function normalizeDate(value: unknown): string | null {
  if (!value || typeof value !== "string") return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}
