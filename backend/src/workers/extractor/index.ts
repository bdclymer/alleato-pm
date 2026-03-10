/**
 * Extractor Worker
 * =================
 * Handles structured data extraction from meetings.
 *
 * Responsibilities:
 * - Extract and normalize decisions, risks, tasks, opportunities
 * - Generate embeddings for each structured item
 * - Store in respective tables
 * - Mark job as complete
 *
 * Endpoints:
 * - POST /extract - Extract from a specific meeting
 * - POST /extract-pending - Extract from all pending meetings
 * - GET /health - Health check
 */

import type { Env, StructuredData } from "../shared/types";
import {
  supabaseRequest,
  getMetadataById,
  getSegmentsByMetadataId,
  getJob,
  updateJobStage,
  updateMetadataStatus,
} from "../shared/supabase";
import { batchEmbed, extractStructuredData } from "../shared/openai";

function parseFirefliesActionItems(actionItemsText: string | null | undefined): string[] {
  if (!actionItemsText) return [];

  const tasks: string[] = [];
  for (const rawLine of actionItemsText.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    // Skip markdown headings and emphasis-only labels
    if (line.startsWith("##")) continue;
    if (/^\*\*.+\*\*$/.test(line)) continue;

    // Normalize common markdown bullets / numbering
    const cleaned = line
      .replace(/^[-*•]\s*/, "")
      .replace(/^\d+\.\s*/, "")
      .trim();

    if (cleaned) {
      tasks.push(cleaned);
    }
  }

  return tasks;
}

function dedupeTasks(
  tasks: Array<{
    description: string;
    assignee?: string;
    assigneeEmail?: string;
    dueDate?: string;
    priority?: string;
  }>
): Array<{
  description: string;
  assignee?: string;
  assigneeEmail?: string;
  dueDate?: string;
  priority?: string;
}> {
  const seen = new Set<string>();
  const output: Array<{
    description: string;
    assignee?: string;
    assigneeEmail?: string;
    dueDate?: string;
    priority?: string;
  }> = [];

  for (const task of tasks) {
    const normalized = task.description.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(task);
  }

  return output;
}

function extractMarkdownSection(content: string, sectionName: string): string {
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = content.match(new RegExp(`##\\s*${escaped}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, "i"));
  return match ? match[1].trim() : "";
}

function extractJsonSection(content: string, sectionName: string): unknown {
  const section = extractMarkdownSection(content, sectionName);
  if (!section) return null;

  const fenced = section.match(/```json\s*([\s\S]*?)```/i);
  const rawJson = (fenced ? fenced[1] : section).trim();
  if (!rawJson) return null;

  try {
    return JSON.parse(rawJson);
  } catch {
    return null;
  }
}

function buildSpeakerEmailMap(content: string): Record<string, string> {
  const speakerEmailMap: Record<string, string> = {};
  const userSection = extractJsonSection(content, "User");
  if (userSection && typeof userSection === "object" && !Array.isArray(userSection)) {
    const name = String((userSection as Record<string, unknown>).name || "").trim();
    const email = String((userSection as Record<string, unknown>).email || "").trim();
    if (name && email) {
      speakerEmailMap[name] = email;
    }
  }

  const attendees = extractJsonSection(content, "Meeting Attendees");
  if (Array.isArray(attendees)) {
    for (const attendee of attendees) {
      if (!attendee || typeof attendee !== "object") continue;
      const row = attendee as Record<string, unknown>;
      const name = String(row.name || row.displayName || "").trim();
      const email = String(row.email || "").trim();
      if (name && email && !speakerEmailMap[name]) {
        speakerEmailMap[name] = email;
      }
    }
  }

  return speakerEmailMap;
}

function buildNotesContext(content: string): string {
  const notes = extractMarkdownSection(content, "Notes");
  const actionItems = extractMarkdownSection(content, "Action Items");
  return [notes, actionItems].filter(Boolean).join("\n\n").slice(0, 6000);
}

function inferMeetingType(metadata: Record<string, unknown>): string {
  const metadataType = String(metadata.type || "").trim().toLowerCase();
  if (metadataType) {
    return metadataType;
  }
  const content = String(metadata.content || metadata.raw_text || "");
  const sectionType = extractMarkdownSection(content, "Meeting Type")
    .replace(/^[-*•]\s*/, "")
    .trim()
    .toLowerCase();
  return sectionType;
}

function isInterviewMeeting(metadata: Record<string, unknown>): boolean {
  const meetingType = inferMeetingType(metadata);
  if (meetingType === "interview") {
    return true;
  }
  const title = String(metadata.title || "").toLowerCase();
  return title.includes("interview");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // POST /extract - Extract from a specific meeting
    if (request.method === "POST" && url.pathname === "/extract") {
      return handleExtract(request, env);
    }

    // POST /extract-pending - Extract from all pending meetings
    if (request.method === "POST" && url.pathname === "/extract-pending") {
      return handleExtractPending(env);
    }

    // GET /health
    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({ status: "ok", worker: "extractor" });
    }

    return Response.json({
      worker: "fireflies-extractor",
      endpoints: [
        "POST /extract - Extract from meeting {metadataId} or {firefliesId}",
        "POST /extract-pending - Extract from all pending meetings",
        "GET /health - Health check",
      ],
    });
  },

  // Cron trigger handler - runs every 5 minutes to process pending jobs
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log("[Extractor Cron] Running scheduled job at", new Date().toISOString());
    try {
      const result = await processPendingJobs(env);
      console.log("[Extractor Cron] Completed:", JSON.stringify(result));
    } catch (err) {
      console.error("[Extractor Cron] Error:", err);
    }
  },
};

// -----------------------------------------------------------------------------
// Handlers
// -----------------------------------------------------------------------------

async function handleExtract(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as {
      metadataId?: string;
      firefliesId?: string;
    };

    if (!body.metadataId && !body.firefliesId) {
      return Response.json(
        { error: "metadataId or firefliesId required" },
        { status: 400 }
      );
    }

    let metadataId = body.metadataId;
    let firefliesId = body.firefliesId;

    if (!metadataId && firefliesId) {
      const job = await getJob(env, firefliesId);
      if (!job || !job.metadata_id) {
        return Response.json(
          { error: "Job not found or no metadata_id" },
          { status: 404 }
        );
      }
      metadataId = job.metadata_id;
    }

    const result = await extractFromMeeting(env, metadataId!);

    return Response.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("[Extract] Error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

async function handleExtractPending(env: Env): Promise<Response> {
  try {
    const result = await processPendingJobs(env);
    if (result.processed === 0) {
      return Response.json({ message: "No pending jobs", processed: 0 });
    }
    return Response.json(result);
  } catch (err) {
    console.error("[ExtractPending] Error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

// Shared function for processing pending jobs (used by both cron and HTTP endpoint)
async function processPendingJobs(env: Env): Promise<{ processed: number; results: Array<{ firefliesId: string; success: boolean; error?: string }> }> {
  // Find all jobs in embedded stage
  const jobs = (await supabaseRequest(
    env,
    "fireflies_ingestion_jobs?stage=eq.embedded&select=fireflies_id,metadata_id&limit=10",
    "GET"
  )) as Array<{ fireflies_id: string; metadata_id: string }>;

  if (!jobs || jobs.length === 0) {
    return { processed: 0, results: [] };
  }

  console.log(`[Extractor] Found ${jobs.length} pending jobs`);

  const results: Array<{ firefliesId: string; success: boolean; error?: string }> = [];
  for (const job of jobs) {
    if (!job.metadata_id) continue;

    try {
      await extractFromMeeting(env, job.metadata_id);
      results.push({ firefliesId: job.fireflies_id, success: true });
    } catch (err) {
      console.error(`[Extractor] Error processing ${job.fireflies_id}:`, err);
      await updateJobStage(env, job.fireflies_id, "error", undefined, String(err));
      results.push({ firefliesId: job.fireflies_id, success: false, error: String(err) });
    }
  }

  return { processed: results.length, results };
}

// -----------------------------------------------------------------------------
// Core Extraction Logic
// -----------------------------------------------------------------------------

async function extractFromMeeting(
  env: Env,
  metadataId: string
): Promise<{
  metadataId: string;
  firefliesId: string;
  decisions: number;
  risks: number;
  tasks: number;
  opportunities: number;
}> {
  // Fetch metadata
  const metadata = await getMetadataById(env, metadataId);
  if (!metadata) {
    throw new Error(`Metadata not found: ${metadataId}`);
  }

  // Some document_metadata rows are created outside Fireflies and may not have fireflies_id.
  // Fall back to metadataId so pipeline stage updates remain addressable.
  const firefliesId = (metadata.fireflies_id as string) || metadataId;
  const title = (metadata.title as string) || "Untitled Meeting";
  const meetingSummary = (
    (metadata.overview as string)
    || (metadata.meeting_summary as string)
    || (metadata.summary as string)
    || ""
  );
  const startedAt = (metadata.started_at as string) || (metadata.date as string) || null;
  const participantsArray = (metadata.participants_array as string[]) || [];
  const projectId = (metadata.project_id as number) || null;
  const clientId = (metadata.client_id as number) || null;
  const content = String(metadata.content || metadata.raw_text || "");

  if (isInterviewMeeting(metadata)) {
    console.log(`[Extract] Skipping interview meeting: ${title} (${firefliesId})`);
    await updateJobStage(env, firefliesId, "done");
    await updateMetadataStatus(env, metadataId, "complete");
    return {
      metadataId,
      firefliesId,
      decisions: 0,
      risks: 0,
      tasks: 0,
      opportunities: 0,
    };
  }

  const speakerEmailMap = content ? buildSpeakerEmailMap(content) : {};
  const notesContext = content ? buildNotesContext(content) : "";

  console.log(`[Extract] Processing: ${title} (${firefliesId})`);

  // Fetch segments to collect raw decisions/risks/tasks
  const segmentRows = await getSegmentsByMetadataId(env, metadataId);

  const rawDecisions: string[] = [];
  const rawRisks: string[] = [];
  const rawTasks: string[] = [];

  for (const row of segmentRows) {
    const decisions = row.decisions as string[];
    const risks = row.risks as string[];
    const tasks = row.tasks as string[];

    if (decisions) rawDecisions.push(...decisions);
    if (risks) rawRisks.push(...risks);
    if (tasks) rawTasks.push(...tasks);
  }

  // Add action items from metadata
  const actionItems = metadata.action_items as string;
  if (actionItems) {
    rawTasks.push(
      ...actionItems.split("\n").filter((t) => t.trim())
    );
  }

  console.log(
    `[Extract] Raw items: ${rawDecisions.length} decisions, ${rawRisks.length} risks, ${rawTasks.length} tasks`
  );

  // Use LLM to normalize and extract opportunities
  const structured = await extractStructuredData(
    env,
    title,
    startedAt,
    participantsArray,
    meetingSummary,
    rawDecisions,
    rawRisks,
    rawTasks,
    notesContext,
    speakerEmailMap
  );

  // Always preserve Fireflies native action items as first-class tasks.
  const nativeActionTasks = parseFirefliesActionItems(actionItems).map((text) => ({
    description: text,
    assignee: undefined,
    assigneeEmail: undefined,
    dueDate: undefined,
    priority: undefined,
  }));
  structured.tasks = dedupeTasks([
    ...nativeActionTasks,
    ...structured.tasks,
  ]);

  console.log(
    `[Extract] Structured: ${structured.decisions.length} decisions, ${structured.risks.length} risks, ${structured.tasks.length} tasks, ${structured.opportunities.length} opportunities`
  );

  // Embed all structured items
  const allDescriptions = [
    ...structured.decisions.map((d) => d.description),
    ...structured.risks.map((r) => r.description),
    ...structured.tasks.map((t) => t.description),
    ...structured.opportunities.map((o) => o.description),
  ];

  let embeddings: number[][] = [];
  if (allDescriptions.length > 0) {
    embeddings = await batchEmbed(env, allDescriptions);
  }

  // Assign embeddings
  let idx = 0;
  const embeddedStructured: StructuredData = {
    decisions: structured.decisions.map((d) => ({
      ...d,
      embedding: embeddings[idx++],
    })),
    risks: structured.risks.map((r) => ({
      ...r,
      embedding: embeddings[idx++],
    })),
    tasks: structured.tasks.map((t) => ({
      ...t,
      embedding: embeddings[idx++],
    })),
    opportunities: structured.opportunities.map((o) => ({
      ...o,
      embedding: embeddings[idx++],
    })),
  };

  // Store structured data
  for (const decision of embeddedStructured.decisions) {
    await upsertDecision(env, decision, metadataId);
  }

  for (const risk of embeddedStructured.risks) {
    await upsertRisk(env, risk, metadataId);
  }

  for (const task of embeddedStructured.tasks) {
    await upsertTask(env, task, metadataId, projectId, clientId);
  }

  for (const opportunity of embeddedStructured.opportunities) {
    await upsertOpportunity(env, opportunity, metadataId);
  }

  // Update job and metadata status
  await updateJobStage(env, firefliesId, "done");
  await updateMetadataStatus(env, metadataId, "complete");

  return {
    metadataId,
    firefliesId,
    decisions: embeddedStructured.decisions.length,
    risks: embeddedStructured.risks.length,
    tasks: embeddedStructured.tasks.length,
    opportunities: embeddedStructured.opportunities.length,
  };
}

// -----------------------------------------------------------------------------
// Upsert Functions
// -----------------------------------------------------------------------------

async function upsertDecision(
  env: Env,
  decision: StructuredData["decisions"][0],
  metadataId: string
): Promise<void> {
  await supabaseRequest(
    env,
    "decisions?on_conflict=metadata_id,description",
    "POST",
    {
      metadata_id: metadataId,
      description: decision.description,
      rationale: decision.rationale,
      owner_name: decision.owner,
      embedding: decision.embedding,
      status: "active",
    }
  );
}

async function upsertRisk(
  env: Env,
  risk: StructuredData["risks"][0],
  metadataId: string
): Promise<void> {
  await supabaseRequest(
    env,
    "risks?on_conflict=metadata_id,description",
    "POST",
    {
      metadata_id: metadataId,
      description: risk.description,
      category: risk.category,
      likelihood: risk.likelihood,
      impact: risk.impact,
      owner_name: risk.owner,
      embedding: risk.embedding,
      status: "open",
    }
  );
}

function parseDate(dateStr?: string): string | null {
  if (!dateStr) return null;
  // Check if it's a valid YYYY-MM-DD format
  const dateMatch = dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
  if (dateMatch) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return dateStr;
  }
  // Try to parse other date formats
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }
  // Not a valid date - return null
  return null;
}

async function upsertTask(
  env: Env,
  task: StructuredData["tasks"][0],
  metadataId: string,
  projectId: number | null,
  clientId: number | null
): Promise<void> {
  const projectIds = projectId ? [projectId] : [];
  await supabaseRequest(
    env,
    "tasks?on_conflict=metadata_id,description",
    "POST",
    {
      metadata_id: metadataId,
      description: task.description,
      assignee_name: task.assignee,
      assignee_email: task.assigneeEmail,
      due_date: parseDate(task.dueDate),
      priority: task.priority,
      embedding: task.embedding,
      status: "open",
      source_system: "fireflies",
      project_id: projectId,
      project_ids: projectIds,
      client_id: clientId,
    }
  );
}

async function upsertOpportunity(
  env: Env,
  opportunity: StructuredData["opportunities"][0],
  metadataId: string
): Promise<void> {
  await supabaseRequest(
    env,
    "opportunities?on_conflict=metadata_id,description",
    "POST",
    {
      metadata_id: metadataId,
      description: opportunity.description,
      type: opportunity.type,
      owner_name: opportunity.owner,
      embedding: opportunity.embedding,
      status: "open",
    }
  );
}
