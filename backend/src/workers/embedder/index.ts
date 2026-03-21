/**
 * Embedder Worker
 * ================
 * Handles chunking and embedding generation.
 *
 * Responsibilities:
 * - Fetch segments from meeting_segments
 * - Chunk segments into smaller pieces
 * - Generate embeddings for all chunks
 * - Store in documents table
 * - Generate segment summary embeddings
 * - Generate meeting summary embedding
 *
 * Endpoints:
 * - POST /embed - Embed a specific meeting
 * - POST /embed-pending - Embed all pending meetings
 * - GET /health - Health check
 */

import type { Env, DocumentChunk, MeetingSegment, TranscriptLine } from "../shared/types";
import {
  supabaseRequest,
  getMetadataById,
  getSegmentsByMetadataId,
  getJob,
  updateJobStage,
} from "../shared/supabase";
import { batchEmbed } from "../shared/openai";
import { parseFirefliesMarkdown, hashContent } from "../shared/parser";
import { createMeetingChunks } from "../shared/chunker";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // POST /embed - Embed a specific meeting
    if (request.method === "POST" && url.pathname === "/embed") {
      return handleEmbed(request, env, ctx);
    }

    // POST /embed-pending - Embed all pending meetings
    if (request.method === "POST" && url.pathname === "/embed-pending") {
      return handleEmbedPending(env);
    }

    // GET /health
    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({ status: "ok", worker: "embedder" });
    }

    return Response.json({
      worker: "fireflies-embedder",
      endpoints: [
        "POST /embed - Embed meeting {metadataId} or {firefliesId}",
        "POST /embed-pending - Embed all pending meetings",
        "GET /health - Health check",
      ],
    });
  },

  // Cron trigger handler - runs every 5 minutes to process pending jobs
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log("[Embedder Cron] Running scheduled job at", new Date().toISOString());
    try {
      const result = await processPendingJobs(env);
      console.log("[Embedder Cron] Completed:", JSON.stringify(result));
    } catch (err) {
      console.error("[Embedder Cron] Error:", err);
    }
  },
};

// -----------------------------------------------------------------------------
// Handlers
// -----------------------------------------------------------------------------

async function handleEmbed(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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

    const result = await embedMeeting(env, metadataId);

    // Chain immediately to extractor — don't wait for cron
    if (env.EXTRACTOR_WORKER_URL) {
      ctx.waitUntil(
        fetch(`${env.EXTRACTOR_WORKER_URL}/extract`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ metadataId }),
        }).catch((err: unknown) => console.error("[Embed] Extractor chain failed:", err))
      );
    }

    return Response.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("[Embed] Error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

async function handleEmbedPending(env: Env): Promise<Response> {
  try {
    const result = await processPendingJobs(env);
    if (result.processed === 0) {
      return Response.json({ message: "No pending jobs", processed: 0 });
    }
    return Response.json(result);
  } catch (err) {
    console.error("[EmbedPending] Error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

// Shared function for processing pending jobs (used by both cron and HTTP endpoint)
async function processPendingJobs(env: Env): Promise<{ processed: number; results: Array<{ firefliesId: string; success: boolean; error?: string }> }> {
  // Find all jobs in segmented stage
  const jobs = (await supabaseRequest(
    env,
    "fireflies_ingestion_jobs?stage=eq.segmented&select=fireflies_id,metadata_id&limit=10",
    "GET"
  )) as Array<{ fireflies_id: string; metadata_id: string }>;

  if (!jobs || jobs.length === 0) {
    return { processed: 0, results: [] };
  }

  console.log(`[Embedder] Found ${jobs.length} pending jobs`);

  const results: Array<{ firefliesId: string; success: boolean; error?: string }> = [];
  for (const job of jobs) {
    if (!job.metadata_id) continue;

    try {
      await embedMeeting(env, job.metadata_id);
      results.push({ firefliesId: job.fireflies_id, success: true });
    } catch (err) {
      console.error(`[Embedder] Error processing ${job.fireflies_id}:`, err);
      await updateJobStage(env, job.fireflies_id, "error", undefined, String(err));
      results.push({ firefliesId: job.fireflies_id, success: false, error: String(err) });
    }
  }

  return { processed: results.length, results };
}

// -----------------------------------------------------------------------------
// Core Embedding Logic
// -----------------------------------------------------------------------------

async function embedMeeting(
  env: Env,
  metadataId: string
): Promise<{
  metadataId: string;
  firefliesId: string;
  chunkCount: number;
  segmentCount: number;
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
  const meetingSummary = (metadata.overview as string) || "";

  if (!content) {
    throw new Error(`No content in metadata: ${metadataId}`);
  }

  console.log(`[Embed] Processing: ${metadata.title} (${firefliesId})`);

  // Parse content to get transcript lines
  const parsed = parseFirefliesMarkdown(content);

  // Fetch segments
  const segmentRows = await getSegmentsByMetadataId(env, metadataId);

  if (!segmentRows || segmentRows.length === 0) {
    throw new Error(`No segments found for: ${metadataId}`);
  }

  // Convert to MeetingSegment format
  const segments: MeetingSegment[] = segmentRows.map((row) => ({
    segmentIndex: row.segment_index as number,
    title: row.title as string,
    startIndex: row.start_index as number,
    endIndex: row.end_index as number,
    summary: row.summary as string,
    decisions: (row.decisions as string[]) || [],
    risks: (row.risks as string[]) || [],
    tasks: (row.tasks as string[]) || [],
  }));

  console.log(`[Embed] Found ${segments.length} segments`);

  // Create all chunks — pass meeting context so each chunk gets a contextual
  // prefix baked into contextualContent (used for embedding, not DB storage).
  const allChunks = createMeetingChunks(
    segments,
    parsed.transcriptLines,
    meetingSummary,
    {
      title: (metadata.title as string) || "Untitled Meeting",
      date: parsed.startedAt ?? null,
      participants: parsed.participants ?? [],
    }
  );

  console.log(`[Embed] Created ${allChunks.length} chunks`);

  // Mark job as chunked
  await updateJobStage(env, firefliesId, "chunked");

  // Batch embed all chunk content — use contextualContent when available,
  // which includes the meeting/segment header prefix for better semantic retrieval.
  // The raw content field is stored in the DB unchanged for human readability.
  const chunkTexts = allChunks.map((c) => c.contextualContent ?? c.content);
  const chunkEmbeddings = await batchEmbed(env, chunkTexts);

  // Assign embeddings to chunks
  for (let i = 0; i < allChunks.length; i++) {
    allChunks[i].embedding = chunkEmbeddings[i];
  }

  // Embed meeting summary
  let meetingSummaryEmbedding: number[] | null = null;
  if (meetingSummary) {
    const [embedding] = await batchEmbed(env, [meetingSummary]);
    meetingSummaryEmbedding = embedding;
  }

  // Build segment ID mapping for chunks
  const segmentIdMap: Record<number, string> = {};
  for (const row of segmentRows) {
    segmentIdMap[row.segment_index as number] = row.id as string;
  }

  // Store chunks in documents table
  for (const chunk of allChunks) {
    const segmentId =
      chunk.segmentIndex >= 0 ? segmentIdMap[chunk.segmentIndex] : null;

    await upsertDocument(env, chunk, metadataId, segmentId, {
      meetingDate: parsed.startedAt,
      participants: parsed.participants,
      projectId: metadata.project_id as number | undefined,
      clientId: metadata.client_id as number | undefined,
    });
  }

  // Update metadata status and store meeting summary embedding
  await supabaseRequest(env, `document_metadata?id=eq.${metadataId}`, "PATCH", {
    status: "embedded",
    ...(meetingSummaryEmbedding ? { summary_embedding: meetingSummaryEmbedding } : {}),
  });

  // Update job status
  await updateJobStage(env, firefliesId, "embedded");

  return {
    metadataId,
    firefliesId,
    chunkCount: allChunks.length,
    segmentCount: segments.length,
  };
}

async function upsertDocument(
  env: Env,
  chunk: DocumentChunk,
  metadataId: string,
  segmentId: string | null,
  meta: {
    meetingDate: string | null;
    participants: string[];
    projectId?: number;
    clientId?: number;
  }
): Promise<void> {
  // Match actual documents schema:
  // - file_id is TEXT (not uuid)
  // - no segment_id column, store in metadata jsonb
  // - file_date exists as timestamptz
  const data: Record<string, unknown> = {
    file_id: metadataId, // TEXT reference to document_metadata.id
    content: chunk.content,
    embedding: chunk.embedding,
    source: "fireflies",
    file_date: meta.meetingDate
      ? new Date(meta.meetingDate).toISOString()
      : null,
    project_id: meta.projectId || null,
    processing_status: "complete",
    metadata: {
      doc_type: chunk.docType,
      chunk_index: chunk.chunkIndex,
      segment_index: chunk.segmentIndex,
      segment_id: segmentId,
      content_hash: chunk.contentHash,
      participants: meta.participants,
    },
  };

  // Use content hash for deduplication
  const existingCheck = (await supabaseRequest(
    env,
    `documents?file_id=eq.${metadataId}&select=id,metadata&limit=100`,
    "GET"
  )) as Array<{ id: string; metadata: { content_hash?: string } }>;

  const existingDoc = existingCheck.find(
    (d) => d.metadata?.content_hash === chunk.contentHash
  );

  if (existingDoc) {
    // Update existing
    await supabaseRequest(env, `documents?id=eq.${existingDoc.id}`, "PATCH", data);
  } else {
    // Insert new
    await supabaseRequest(env, "documents", "POST", data);
  }
}
