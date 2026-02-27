/**
 * Parser Worker
 * ==============
 * Handles semantic segmentation of meeting transcripts.
 *
 * Responsibilities:
 * - Fetch raw content from document_metadata
 * - Run LLM segmentation to split into semantic segments
 * - Store segments in meeting_segments table
 * - Generate meeting summary
 * - Update document_metadata status
 *
 * Endpoints:
 * - POST /parse - Parse a specific meeting by metadataId or firefliesId
 * - POST /parse-pending - Parse all pending meetings
 * - GET /health - Health check
 */

import type { Env, MeetingSegment, TranscriptLine } from "../shared/types";
import {
  supabaseRequest,
  getMetadataById,
  getJob,
  updateJobStage,
  updateMetadataStatus,
} from "../shared/supabase";
import {
  generateMeetingSummary,
  segmentTranscript,
  type SegmentResult,
} from "../shared/openai";
import { parseFirefliesMarkdown, formatTranscriptForLLM } from "../shared/parser";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // POST /parse - Parse a specific meeting
    if (request.method === "POST" && url.pathname === "/parse") {
      return handleParse(request, env, ctx);
    }

    // POST /parse-pending - Parse all pending meetings
    if (request.method === "POST" && url.pathname === "/parse-pending") {
      return handleParsePending(env);
    }

    // GET /health
    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({ status: "ok", worker: "parser" });
    }

    return Response.json({
      worker: "fireflies-parser",
      endpoints: [
        "POST /parse - Parse meeting {metadataId} or {firefliesId}",
        "POST /parse-pending - Parse all pending meetings",
        "GET /health - Health check",
      ],
    });
  },

  // Cron trigger handler - runs every 5 minutes to process pending jobs
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log("[Parser Cron] Running scheduled job at", new Date().toISOString());
    try {
      const result = await processPendingJobs(env);
      console.log("[Parser Cron] Completed:", JSON.stringify(result));
    } catch (err) {
      console.error("[Parser Cron] Error:", err);
    }
  },
};

// Shared function for processing pending jobs (used by both cron and HTTP endpoint)
async function processPendingJobs(env: Env): Promise<{ processed: number; results: Array<{ firefliesId: string; success: boolean; error?: string }> }> {
  // Find all jobs in raw_ingested stage
  const jobs = (await supabaseRequest(
    env,
    "fireflies_ingestion_jobs?stage=eq.raw_ingested&select=fireflies_id,metadata_id&limit=10",
    "GET"
  )) as Array<{ fireflies_id: string; metadata_id: string }>;

  if (!jobs || jobs.length === 0) {
    return { processed: 0, results: [] };
  }

  console.log(`[Parser] Found ${jobs.length} pending jobs`);

  const results: Array<{ firefliesId: string; success: boolean; error?: string }> = [];
  for (const job of jobs) {
    if (!job.metadata_id) continue;

    try {
      await parseMeeting(env, job.metadata_id);
      results.push({ firefliesId: job.fireflies_id, success: true });
    } catch (err) {
      console.error(`[Parser] Error processing ${job.fireflies_id}:`, err);
      await updateJobStage(env, job.fireflies_id, "error", undefined, String(err));
      results.push({ firefliesId: job.fireflies_id, success: false, error: String(err) });
    }
  }

  return { processed: results.length, results };
}

// -----------------------------------------------------------------------------
// Handlers
// -----------------------------------------------------------------------------

async function handleParse(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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
    const firefliesId = body.firefliesId;

    // If only firefliesId provided, look up metadataId
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

    if (!metadataId) {
      return Response.json({ error: "metadataId could not be resolved" }, { status: 400 });
    }

    const result = await parseMeeting(env, metadataId);

    // Chain immediately to embedder — don't wait for cron
    if (env.EMBEDDER_WORKER_URL) {
      ctx.waitUntil(
        fetch(`${env.EMBEDDER_WORKER_URL}/embed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ metadataId }),
        }).catch((err: unknown) => console.error("[Parse] Embedder chain failed:", err))
      );
    }

    return Response.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("[Parse] Error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

async function handleParsePending(env: Env): Promise<Response> {
  try {
    const result = await processPendingJobs(env);
    if (result.processed === 0) {
      return Response.json({ message: "No pending jobs", processed: 0 });
    }
    return Response.json(result);
  } catch (err) {
    console.error("[ParsePending] Error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// Core Parsing Logic
// -----------------------------------------------------------------------------

async function parseMeeting(
  env: Env,
  metadataId: string
): Promise<{
  metadataId: string;
  firefliesId: string;
  segmentCount: number;
  meetingSummaryLength: number;
}> {
  // Fetch metadata
  const metadata = await getMetadataById(env, metadataId);
  if (!metadata) {
    throw new Error(`Metadata not found: ${metadataId}`);
  }

  // Some document_metadata rows are created outside Fireflies and may not have fireflies_id.
  // Fall back to metadataId so pipeline stage updates remain addressable.
  const firefliesId = (metadata.fireflies_id as string) || metadataId;
  const content = metadata.content as string;

  if (!content) {
    throw new Error(`No content in metadata: ${metadataId}`);
  }

  console.log(`[Parse] Processing: ${metadata.title} (${firefliesId})`);

  // Parse the content
  const parsed = parseFirefliesMarkdown(content);

  // Generate meeting summary
  const formattedExcerpt = parsed.transcriptLines
    .slice(0, 200)
    .map((l) => `[${l.timestamp}] ${l.speaker}: ${l.text}`)
    .join("\n");

  const meetingSummary = await generateMeetingSummary(
    env,
    formattedExcerpt,
    parsed.title,
    parsed.firefliesSummary
  );

  console.log(`[Parse] Generated summary: ${meetingSummary.length} chars`);

  // Segment the transcript
  const formattedTranscript = formatTranscriptForLLM(parsed.transcriptLines);
  const segmentResults = await segmentTranscript(env, formattedTranscript, parsed.title);

  console.log(`[Parse] Created ${segmentResults.length} segments`);

  // Convert to MeetingSegment format
  const segments: MeetingSegment[] = segmentResults.map((s, i) => ({
    segmentIndex: i,
    title: s.title,
    startIndex: s.start_index,
    endIndex: s.end_index,
    summary: s.summary,
    decisions: s.decisions || [],
    risks: s.risks || [],
    tasks: s.tasks || [],
  }));

  // Store segments
  for (const segment of segments) {
    await upsertSegment(env, segment, metadataId);
  }

  // Update metadata with meeting summary (use 'overview' column which exists)
  await supabaseRequest(env, `document_metadata?id=eq.${metadataId}`, "PATCH", {
    overview: meetingSummary,
    status: "segmented",
  });

  // Update job status
  await updateJobStage(env, firefliesId, "segmented");

  return {
    metadataId,
    firefliesId,
    segmentCount: segments.length,
    meetingSummaryLength: meetingSummary.length,
  };
}

async function upsertSegment(
  env: Env,
  segment: MeetingSegment,
  metadataId: string
): Promise<string> {
  const data = {
    metadata_id: metadataId,
    segment_index: segment.segmentIndex,
    title: segment.title,
    start_index: segment.startIndex,
    end_index: segment.endIndex,
    summary: segment.summary,
    decisions: segment.decisions,
    risks: segment.risks,
    tasks: segment.tasks,
  };

  const result = (await supabaseRequest(
    env,
    "meeting_segments?on_conflict=metadata_id,segment_index",
    "POST",
    data
  )) as Array<{ id: string }>;

  return result[0].id;
}
