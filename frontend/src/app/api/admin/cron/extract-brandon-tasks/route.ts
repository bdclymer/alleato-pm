import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createServiceClient } from "@/lib/supabase/service";
import { getOpenAI } from "@/lib/ai/tools/tool-utils";

const BRANDON_EMAIL = "bclymer@alleatogroup.com";
const BRANDON_NAME = "Brandon";
const DEFAULT_WINDOW_DAYS = 3;

type Doc = {
  id: string;
  title: string | null;
  date: string | null;
  content: string | null;
  summary: string | null;
  type: string | null;
  source_system: string | null;
  project_id: number | null;
};

type ExtractedTask = {
  title: string;
  description: string;
  assignee_name: string | null;
  assignee_email: string | null;
  due_date: string | null;
  priority: "high" | "medium" | "low" | null;
};

async function extractTasksFromDoc(doc: Doc, openai: ReturnType<typeof getOpenAI>): Promise<ExtractedTask[]> {
  const text = [doc.summary ?? "", doc.content ? doc.content.slice(0, 3000) : ""]
    .join("\n\n")
    .trim();

  if (!text || text.length < 80) return [];

  const typeLabel =
    doc.type === "meeting"
      ? `meeting titled "${doc.title}"`
      : doc.type === "email"
        ? `email titled "${doc.title}"`
        : `Teams message "${doc.title}"`;

  const prompt = `You are extracting action items that Brandon (bclymer@alleatogroup.com) explicitly assigned to specific people from this ${typeLabel}.

Rules:
- Only extract tasks where Brandon is clearly directing/assigning the work
- Only extract tasks assigned to a specific named person (not "the team" vaguely)
- Do NOT extract tasks where Brandon himself is doing the work
- Do NOT invent tasks — only extract what is clearly stated
- Each task must have a clear action verb and a named owner
- If no qualifying tasks exist, return an empty array

Respond ONLY with a JSON array (no markdown, no explanation):
[{"title":"Short action title (max 10 words)","description":"Full context description","assignee_name":"First Last or null","assignee_email":"email or null","due_date":"YYYY-MM-DD or null","priority":"high|medium|low|null"}]

Source text:
${text}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 800,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "[]";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const POST = withApiGuardrails(
  "api.admin.cron.extract-brandon-tasks.POST",
  async ({ request }) => {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");
    const isVercelCron = authHeader === `Bearer ${cronSecret}`;

    if (!isVercelCron) {
      throw new GuardrailError({
        code: "FORBIDDEN",
        where: "api.admin.cron.extract-brandon-tasks.POST",
        message: "Valid CRON_SECRET required.",
        status: 403,
      });
    }

    const { searchParams } = new URL(request.url);
    const windowDays = Math.min(
      Math.max(parseInt(searchParams.get("days") ?? String(DEFAULT_WINDOW_DAYS), 10), 1),
      30
    );

    const supabase = createServiceClient();
    const openai = getOpenAI();
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

    // Fetch recent documents involving Brandon
    const { data: docs, error: docsError } = await supabase
      .from("document_metadata")
      .select("id,title,date,content,summary,type,source_system,project_id")
      .gte("created_at", since)
      .or(
        `organizer_email.ilike.%${BRANDON_EMAIL}%,host_email.ilike.%${BRANDON_EMAIL}%,participants.ilike.%${BRANDON_EMAIL}%`
      )
      .in("type", ["meeting", "email", "teams_dm_conversation"])
      .order("date", { ascending: false })
      .limit(200);

    if (docsError) {
      throw new GuardrailError({
        code: "DB_ERROR",
        where: "api.admin.cron.extract-brandon-tasks.POST",
        message: `Failed to fetch documents: ${docsError.message}`,
        status: 500,
      });
    }

    // Get existing task descriptions to avoid duplicates
    const { data: existing } = await supabase
      .from("tasks")
      .select("description")
      .eq("assigned_by", BRANDON_NAME)
      .limit(2000);

    const existingSet = new Set(
      (existing ?? []).map((r) => r.description?.toLowerCase().trim())
    );

    let inserted = 0;
    let skipped = 0;

    for (const doc of (docs ?? []) as Doc[]) {
      const tasks = await extractTasksFromDoc(doc, openai);

      for (const task of tasks) {
        const key = task.description?.toLowerCase().trim();
        if (existingSet.has(key)) {
          skipped++;
          continue;
        }

        const { error: insertError } = await supabase.from("tasks").insert({
          title: task.title,
          description: task.description,
          assignee_name: task.assignee_name,
          assignee_email: task.assignee_email,
          due_date: task.due_date,
          priority: task.priority,
          status: "open",
          assigned_by: BRANDON_NAME,
          source_system: doc.source_system ?? doc.type ?? "meeting",
          metadata_id: doc.id,
          project_id: doc.project_id,
        });

        if (!insertError) {
          existingSet.add(key);
          inserted++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      windowDays,
      docsProcessed: docs?.length ?? 0,
      inserted,
      skipped,
    });
  }
);
