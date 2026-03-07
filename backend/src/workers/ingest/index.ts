/**
 * Ingest Worker
 * ==============
 * Handles initial ingestion from Fireflies API or manual upload.
 *
 * Responsibilities:
 * - Receive Fireflies webhook
 * - Fetch transcript from Fireflies API
 * - Store raw markdown in Supabase storage
 * - Create initial document_metadata record
 * - Trigger parser worker
 *
 * Endpoints:
 * - POST /webhook/fireflies - Fireflies webhook
 * - POST /webhook/storage - Supabase storage webhook
 * - POST /ingest - Manual ingestion
 * - GET /status/:firefliesId - Check ingestion status
 */

import type { Env, FirefliesTranscript } from "../shared/types";
import {
  supabaseRequest,
  uploadStorageFile,
  updateJobStage,
  isAlreadyProcessed,
  getMetadataByFirefliesId,
  getJob,
  checkExistingByContentHash,
} from "../shared/supabase";
import { parseFirefliesMarkdown, hashContent } from "../shared/parser";

function isLegacySyncEnabled(env: Env): boolean {
  const value = String(env.LEGACY_FIREFLIES_SYNC_ENABLED || "").toLowerCase().trim();
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

function legacySyncDisabledResponse(): Response {
  return Response.json(
    {
      error: "Legacy Fireflies ingest worker is disabled",
      message:
        "Use native backend endpoint POST /api/ingest/fireflies/recent for Fireflies sync.",
    },
    { status: 410 }
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const legacyEnabled = isLegacySyncEnabled(env);

    // POST /webhook/fireflies - Receive Fireflies webhook
    if (request.method === "POST" && url.pathname === "/webhook/fireflies") {
      if (!legacyEnabled) return legacySyncDisabledResponse();
      return handleFirefliesWebhook(request, env);
    }

    // POST /webhook/storage - Receive Supabase storage webhook
    if (request.method === "POST" && url.pathname === "/webhook/storage") {
      if (!legacyEnabled) return legacySyncDisabledResponse();
      return handleStorageWebhook(request, env);
    }

    // POST /ingest - Manual ingestion
    if (request.method === "POST" && url.pathname === "/ingest") {
      return handleManualIngest(request, env);
    }

    // GET /status/:firefliesId - Check status
    if (request.method === "GET" && url.pathname.startsWith("/status/")) {
      const firefliesId = url.pathname.split("/status/")[1];
      return handleStatusCheck(firefliesId, env);
    }

    // POST /sync/recent - Manually sync latest transcripts from Fireflies
    if (request.method === "POST" && url.pathname === "/sync/recent") {
      if (!legacyEnabled) return legacySyncDisabledResponse();
      return handleManualRecentSync(request, env);
    }

    // Health check
    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({
        status: "ok",
        worker: "ingest",
        legacy_sync_enabled: legacyEnabled,
      });
    }

    // POST /backfill - Ingest all files from storage bucket
    if (request.method === "POST" && url.pathname === "/backfill") {
      if (!legacyEnabled) return legacySyncDisabledResponse();
      return handleBackfill(request, env);
    }

    // GET /backfill/status - Check backfill progress
    if (request.method === "GET" && url.pathname === "/backfill/status") {
      if (!legacyEnabled) return legacySyncDisabledResponse();
      return handleBackfillStatus(env);
    }

    // POST /backfill/reset-errors - Reset error jobs to retry
    if (request.method === "POST" && url.pathname === "/backfill/reset-errors") {
      if (!legacyEnabled) return legacySyncDisabledResponse();
      return handleResetErrors(env);
    }

    return Response.json({
      worker: "fireflies-ingest",
      endpoints: [
        "POST /webhook/fireflies - Fireflies webhook",
        "POST /webhook/storage - Supabase storage webhook",
        "POST /ingest - Manual ingestion {markdown, filename?}",
        "POST /backfill - Ingest all files from storage {bucket?, limit?}",
        "GET /backfill/status - Check backfill progress",
        "POST /backfill/reset-errors - Reset error jobs to embedded stage",
        "GET /status/:firefliesId - Check status",
        "POST /sync/recent - Sync latest transcripts from Fireflies",
        "GET /health - Health check",
      ],
    });
  },

  // Cron trigger handler - polls Fireflies for new transcripts every 15 minutes
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    if (!isLegacySyncEnabled(env)) {
      console.log("[Ingest Cron] Skipped: legacy sync disabled by LEGACY_FIREFLIES_SYNC_ENABLED");
      return;
    }
    console.log("[Ingest Cron] Running scheduled transcript check at", new Date().toISOString());

    try {
      // Fetch recent transcripts from Fireflies
      const recentTranscripts = await fetchRecentFirefliesTranscripts(env, {
        limit: 100,
      });

      if (!recentTranscripts || recentTranscripts.length === 0) {
        console.log("[Ingest Cron] No transcripts found in Fireflies");
        return;
      }

      console.log(`[Ingest Cron] Found ${recentTranscripts.length} recent transcripts`);

      let processed = 0;
      let skipped = 0;

      for (const summary of recentTranscripts) {
        // Check if already processed
        if (await isAlreadyProcessed(env, summary.id)) {
          skipped++;
          continue;
        }

        // Fetch full transcript and process
        const fullTranscript = await fetchFirefliesTranscript(env, summary.id);
        if (!fullTranscript) {
          console.log(`[Ingest Cron] Could not fetch full transcript: ${summary.id}`);
          continue;
        }

        const markdown = formatFirefliesAsMarkdown(fullTranscript);

        try {
          await ingestMarkdown(env, markdown, `${summary.id}.md`);
          processed++;
          console.log(`[Ingest Cron] Processed: ${summary.id}`);
        } catch (err) {
          console.error(`[Ingest Cron] Error processing ${summary.id}:`, err);
        }
      }

      console.log(`[Ingest Cron] Completed: ${processed} processed, ${skipped} skipped`);
    } catch (err) {
      console.error("[Ingest Cron] Error:", err);
    }
  },
};

// Helper for scheduled handler - fetch recent transcript summaries
interface FirefliesTranscriptSummary {
  id: string;
  title?: string;
  date?: string | number;
}

async function fetchRecentFirefliesTranscripts(
  env: Env,
  options?: {
    limit?: number;
    fromDate?: string;
    toDate?: string;
  }
): Promise<FirefliesTranscriptSummary[]> {
  const pageSize = 50; // Fireflies max for transcripts query
  const totalLimit = Math.max(1, Math.min(options?.limit || 50, 500));
  const results: FirefliesTranscriptSummary[] = [];
  let skip = 0;

  while (results.length < totalLimit) {
    const pageLimit = Math.min(pageSize, totalLimit - results.length);
    const page = await fetchFirefliesTranscriptPage(env, {
      limit: pageLimit,
      skip,
      fromDate: options?.fromDate,
      toDate: options?.toDate,
    });

    if (!page.length) {
      break;
    }

    results.push(...page);
    if (page.length < pageLimit) {
      break;
    }
    skip += page.length;
  }

  return results;
}

async function fetchFirefliesTranscriptPage(
  env: Env,
  options: {
    limit: number;
    skip?: number;
    fromDate?: string;
    toDate?: string;
  }
): Promise<FirefliesTranscriptSummary[]> {
  const query = `
    query RecentTranscripts($limit: Int, $skip: Int, $fromDate: DateTime, $toDate: DateTime) {
      transcripts(limit: $limit, skip: $skip, fromDate: $fromDate, toDate: $toDate) {
        id
        title
        date
        dateString
      }
    }
  `;

  const variables = {
    limit: options.limit,
    skip: options.skip || 0,
    fromDate: options.fromDate || null,
    toDate: options.toDate || null,
  };

  try {
    const response = await fetch("https://api.fireflies.ai/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.FIREFLIES_API_KEY}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      console.error(`[Fireflies API] List error: ${response.status}`);
      return [];
    }

    const result = (await response.json()) as {
      data?: { transcripts?: FirefliesTranscriptSummary[] };
      errors?: Array<{ message: string }>;
    };

    if (result.errors?.length) {
      console.error("[Fireflies API] List GraphQL errors:", result.errors);
      return [];
    }

    return result.data?.transcripts || [];
  } catch (err) {
    console.error("[Fireflies API] List error:", err);
    return [];
  }
}

function toIsoDateTime(
  value: string | number | null | undefined
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  // Fireflies date can be epoch milliseconds
  if (typeof value === "number") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString();
    }
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const n = Number(trimmed);
  if (Number.isFinite(n) && n > 1_000_000_000) {
    const d = new Date(n);
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString();
    }
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return null;
}

function fmtDurationMinutes(duration: number | undefined): string | null {
  if (typeof duration !== "number" || Number.isNaN(duration)) {
    return null;
  }
  // Fireflies docs say minutes; handle legacy seconds fallback
  const minutes = duration > 600 ? Math.round(duration / 60) : Math.round(duration);
  return `${minutes} minutes`;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v)).map((v) => v.trim()).filter(Boolean);
}

function appendJsonSection(lines: string[], title: string, value: unknown): void {
  if (!value) return;
  lines.push(`## ${title}`);
  lines.push("```json");
  lines.push(JSON.stringify(value, null, 2));
  lines.push("```");
  lines.push("");
}

function appendTextSection(lines: string[], title: string, value?: string | null): void {
  const text = value?.trim();
  if (!text) return;
  lines.push(`## ${title}`);
  lines.push(text);
  lines.push("");
}

function appendListSection(lines: string[], title: string, value?: string[] | null): void {
  const list = (value || []).map((v) => v.trim()).filter(Boolean);
  if (!list.length) return;
  lines.push(`## ${title}`);
  for (const item of list) {
    lines.push(`- ${item}`);
  }
  lines.push("");
}

async function handleManualRecentSync(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      limit?: number;
      fromDate?: string;
      toDate?: string;
      includeExisting?: boolean;
    };

    const limit = Math.max(1, Math.min(body.limit || 5, 200));
    const includeExisting = Boolean(body.includeExisting);
    const transcripts = await fetchRecentFirefliesTranscripts(env, {
      limit,
      fromDate: body.fromDate,
      toDate: body.toDate,
    });

    if (!transcripts.length) {
      return Response.json({
        success: true,
        message: "No transcripts found for requested range",
        synced: 0,
      });
    }

    const results: Array<{
      transcriptId: string;
      success: boolean;
      skipped?: boolean;
      reason?: string;
      metadataId?: string;
    }> = [];

    for (const item of transcripts) {
      try {
        if (!includeExisting && (await isAlreadyProcessed(env, item.id))) {
          results.push({
            transcriptId: item.id,
            success: true,
            skipped: true,
            reason: "Already processed",
          });
          continue;
        }

        const transcript = await fetchFirefliesTranscript(env, item.id);
        if (!transcript) {
          results.push({
            transcriptId: item.id,
            success: false,
            reason: "Could not fetch transcript",
          });
          continue;
        }

        const markdown = formatFirefliesAsMarkdown(transcript);
        const ingested = await ingestMarkdown(env, markdown, `${item.id}.md`);
        results.push({
          transcriptId: item.id,
          success: true,
          metadataId: ingested.metadataId,
        });
      } catch (err) {
        results.push({
          transcriptId: item.id,
          success: false,
          reason: String(err),
        });
      }
    }

    return Response.json({
      success: true,
      requested: limit,
      found: transcripts.length,
      synced: results.filter((r) => r.success && !r.skipped).length,
      skipped: results.filter((r) => r.skipped).length,
      failed: results.filter((r) => !r.success).length,
      results,
    });
  } catch (err) {
    console.error("[Sync Recent] Error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// Webhook Handlers
// -----------------------------------------------------------------------------

async function handleFirefliesWebhook(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const payload = (await request.json()) as {
      meetingId?: string;
      eventType?: string;
      transcriptId?: string;
      data?: { meetingId?: string; transcriptId?: string };
    };

    console.log("[Webhook] Received Fireflies webhook:", JSON.stringify(payload));

    const meetingId =
      payload.meetingId ||
      payload.transcriptId ||
      payload.data?.meetingId ||
      payload.data?.transcriptId;

    if (!meetingId) {
      return Response.json(
        { error: "No meetingId in webhook payload" },
        { status: 400 }
      );
    }

    // Check if already processed
    if (await isAlreadyProcessed(env, meetingId)) {
      return Response.json({
        skipped: true,
        reason: "Already processed",
        firefliesId: meetingId,
      });
    }

    // Fetch full transcript from Fireflies API
    const transcript = await fetchFirefliesTranscript(env, meetingId);

    if (!transcript) {
      return Response.json(
        { error: "Could not fetch transcript from Fireflies" },
        { status: 404 }
      );
    }

    // Convert to markdown and ingest
    const markdown = formatFirefliesAsMarkdown(transcript);
    const result = await ingestMarkdown(env, markdown, `${meetingId}.md`);

    return Response.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("[Webhook] Error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

async function handleStorageWebhook(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const payload = (await request.json()) as {
      type: string;
      table: string;
      record: {
        id: string;
        bucket_id: string;
        name: string;
      };
    };

    console.log("[Storage Webhook] Received:", JSON.stringify(payload));

    // Only process INSERTs to the meetings bucket
    if (payload.type !== "INSERT" || payload.record?.bucket_id !== "meetings") {
      return Response.json({
        skipped: true,
        reason: `Not a meetings bucket insert: ${payload.type} ${payload.record?.bucket_id}`,
      });
    }

    const filePath = payload.record.name;

    // Only process markdown/text files
    if (!filePath.endsWith(".md") && !filePath.endsWith(".txt")) {
      return Response.json({
        skipped: true,
        reason: `Not a markdown file: ${filePath}`,
      });
    }

    // Fetch file content
    const fileContent = await fetchStorageFile(env, "meetings", filePath);

    if (!fileContent) {
      return Response.json(
        { error: "Could not fetch file from storage" },
        { status: 404 }
      );
    }

    const filename = filePath.split("/").pop() || filePath;
    // Use consistent URL encoding - don't encode slashes in the path
    const pathParts = filePath.split('/');
    const encodedPath = pathParts.map(part => encodeURIComponent(part)).join('/');
    const storageUrl = `${env.SUPABASE_URL}/storage/v1/object/public/meetings/${encodedPath}`;

    const result = await ingestMarkdown(env, fileContent, filename, storageUrl);

    return Response.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("[Storage Webhook] Error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

async function handleManualIngest(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = (await request.json()) as {
      markdown: string;
      filename?: string;
      projectId?: number;
      clientId?: number;
    };

    if (!body.markdown) {
      return Response.json({ error: "markdown is required" }, { status: 400 });
    }

    console.log(`[Manual] Ingesting ${body.markdown.length} chars`);

    const result = await ingestMarkdown(
      env,
      body.markdown,
      body.filename || "upload.md",
      undefined,
      body.projectId,
      body.clientId
    );

    return Response.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("[Manual] Error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

async function handleStatusCheck(
  firefliesId: string,
  env: Env
): Promise<Response> {
  try {
    const job = (await supabaseRequest(
      env,
      `fireflies_ingestion_jobs?fireflies_id=eq.${encodeURIComponent(firefliesId)}&select=*`,
      "GET"
    )) as Array<Record<string, unknown>>;

    if (!job || job.length === 0) {
      return Response.json({ error: "Job not found" }, { status: 404 });
    }

    return Response.json(job[0]);
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

async function handleResetErrors(env: Env): Promise<Response> {
  try {
    // Get all error jobs
    const errorJobs = (await supabaseRequest(
      env,
      "fireflies_ingestion_jobs?stage=eq.error&select=id,fireflies_id,metadata_id",
      "GET"
    )) as Array<{ id: string; fireflies_id: string; metadata_id: string | null }>;

    if (!errorJobs || errorJobs.length === 0) {
      return Response.json({ message: "No error jobs to reset", reset: 0 });
    }

    // Reset each job to embedded stage so extractor will pick them up
    for (const job of errorJobs) {
      await supabaseRequest(
        env,
        `fireflies_ingestion_jobs?id=eq.${job.id}`,
        "PATCH",
        {
          stage: "embedded",
          error_message: null,
        }
      );
    }

    return Response.json({
      message: `Reset ${errorJobs.length} error jobs to embedded stage`,
      reset: errorJobs.length,
      jobs: errorJobs.map((j) => j.fireflies_id),
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// Core Ingestion Logic
// -----------------------------------------------------------------------------

async function ingestMarkdown(
  env: Env,
  markdown: string,
  filename: string,
  existingStorageUrl?: string,
  projectId?: number,
  clientId?: number
): Promise<{
  firefliesId: string;
  metadataId: string;
  storageUrl: string;
}> {
  // Parse the markdown with better error handling
  let parsed: ReturnType<typeof parseFirefliesMarkdown>;
  let firefliesId: string;
  
  try {
    parsed = parseFirefliesMarkdown(markdown);
    firefliesId = parsed.firefliesId;
    console.log(`[Ingest] Parsed: ${parsed.title} (${firefliesId})`);
  } catch (error) {
    // If we can't extract a valid Fireflies ID, try to extract from filename
    const filenameIdMatch = filename.match(/_([A-Z0-9]{8,})(?:\.md)?$/i);
    if (filenameIdMatch) {
      // Look for this ID in the content to find the full ID
      const shortId = filenameIdMatch[1];
      const fullIdPattern = new RegExp(`${shortId}[A-Z0-9]*`, 'i');
      const fullIdMatch = markdown.match(fullIdPattern);
      
      if (fullIdMatch && fullIdMatch[0].length >= 20) {
        firefliesId = fullIdMatch[0];
        console.log(`[Ingest] Extracted ID from filename: ${firefliesId}`);
        // Re-parse with injected ID
        const modifiedMarkdown = markdown.replace(/(\*\*ID:\*\*\s*)/, `$1${firefliesId} `);
        parsed = parseFirefliesMarkdown(modifiedMarkdown);
      } else {
        console.error(`[Ingest] Could not extract valid Fireflies ID: ${error}`);
        throw new Error(`Invalid Fireflies ID in file: ${filename}`);
      }
    } else {
      console.error(`[Ingest] Could not extract valid Fireflies ID: ${error}`);
      throw new Error(`Invalid Fireflies ID in file: ${filename}`);
    }
  }

  // Check for existing record by Fireflies ID
  const existing = await getMetadataByFirefliesId(env, firefliesId);
  if (existing) {
    console.log(`[Ingest] Already exists by ID: ${existing.id}`);
    return {
      firefliesId,
      metadataId: existing.id,
      storageUrl: existing.url || existingStorageUrl || "",
    };
  }

  // Also check by content hash to prevent duplicates with different IDs
  const contentHash = hashContent(markdown);
  const existingByHash = await checkExistingByContentHash(env, contentHash);
  if (existingByHash) {
    console.log(`[Ingest] Already exists by content hash: ${existingByHash.id}`);
    return {
      firefliesId: existingByHash.fireflies_id,
      metadataId: existingByHash.id,
      storageUrl: existingByHash.url || existingStorageUrl || "",
    };
  }

  // Also check job table for in-progress processing
  const existingJob = await getJob(env, firefliesId);
  if (existingJob && existingJob.metadata_id) {
    console.log(`[Ingest] Job exists: ${existingJob.metadata_id}`);
    return {
      firefliesId,
      metadataId: existingJob.metadata_id,
      storageUrl: existingStorageUrl || "",
    };
  }

  // Store in Supabase storage if not already there
  let storageUrl = existingStorageUrl;
  if (!storageUrl) {
    const date = parsed.startedAt
      ? new Date(parsed.startedAt)
      : new Date();
    // Use the extracted firefliesId (not parsed.firefliesId which might be wrong)
    const storagePath = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${firefliesId}.md`;

    const uploadedUrl = await uploadStorageFile(env, "meetings", storagePath, markdown);
    storageUrl = uploadedUrl || undefined;

    if (!storageUrl) {
      console.warn("[Ingest] Failed to upload to storage, continuing without");
      storageUrl = "";
    }
  }

  // Create document_metadata record
  const metadataId = crypto.randomUUID();

  // Match existing document_metadata schema
  await supabaseRequest(env, "document_metadata", "POST", {
    id: metadataId,
    fireflies_id: firefliesId,  // Use the properly extracted ID
    title: parsed.title || "Untitled Meeting",
    type: "meeting",
    source: "fireflies",
    date: parsed.startedAt ? new Date(parsed.startedAt).toISOString() : null,
    participants: parsed.participants.join(", "),
    participants_array: parsed.participants,
    url: storageUrl,
    content: markdown,
    content_hash: contentHash,
    summary: parsed.firefliesSummary,
    action_items: parsed.firefliesActions.map((a: { text: string }) => a.text).join("\n"),
    fireflies_link: parsed.firefliesLink,
    duration_minutes: parsed.durationMinutes,
    audio: parsed.audioUrl,
    video: parsed.videoUrl,
    tags: parsed.keywords || [],
    bullet_points: parsed.bulletPoints?.join("\n") || null,
    status: "raw_ingested",
    captured_at: new Date().toISOString(),
    project_id: projectId || null,
  });

  // Update job status
  await updateJobStage(env, firefliesId, "raw_ingested", metadataId);

  console.log(`[Ingest] Created metadata: ${metadataId}`);

  return {
    firefliesId,  // Return the properly extracted ID
    metadataId,
    storageUrl: storageUrl || "",
  };
}

// -----------------------------------------------------------------------------
// Fireflies API
// -----------------------------------------------------------------------------

async function fetchFirefliesTranscript(
  env: Env,
  meetingId: string
): Promise<FirefliesTranscript | null> {
  const query = `
    query Transcript($transcriptId: String!) {
      transcript(id: $transcriptId) {
        id
        title
        date
        dateString
        duration
        host_email
        organizer_email
        user {
          user_id
          email
          name
        }
        speakers {
          id
          name
        }
        participants
        meeting_attendees {
          displayName
          email
          phoneNumber
          name
          location
        }
        meeting_attendance {
          name
          join_time
          leave_time
        }
        fireflies_users
        workspace_users
        transcript_url
        audio_url
        video_url
        calendar_id
        cal_id
        calendar_type
        meeting_link
        is_live
        summary {
          overview
          action_items
          keywords
          outline
          shorthand_bullet
          notes
          gist
          bullet_gist
          short_summary
          short_overview
          meeting_type
          topics_discussed
          transcript_chapters
          extended_sections {
            title
            content
          }
        }
        meeting_info {
          silent_meeting
          summary_status
          fred_joined
        }
        analytics {
          sentiments {
            negative_pct
            neutral_pct
            positive_pct
          }
          categories {
            questions
            date_times
            metrics
            tasks
          }
          speakers {
            speaker_id
            name
            duration
            word_count
            longest_monologue
            monologues_count
            filler_words
            questions
            duration_pct
            words_per_minute
          }
        }
        channels {
          id
          title
          is_private
          created_at
          updated_at
          created_by
          members {
            user_id
            email
            name
          }
        }
        shared_with {
          email
          name
          photo_url
          expires_at
        }
        sentences {
          speaker_name
          text
          start_time
          end_time
        }
      }
    }
  `;

  try {
    const response = await fetch("https://api.fireflies.ai/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.FIREFLIES_API_KEY}`,
      },
      body: JSON.stringify({
        query,
        variables: { transcriptId: meetingId },
      }),
    });

    if (!response.ok) {
      console.error(`[Fireflies API] Error: ${response.status}`);
      return null;
    }

    const result = (await response.json()) as {
      data?: { transcript?: FirefliesTranscript };
      errors?: Array<{ message: string }>;
    };

    if (result.errors) {
      console.error("[Fireflies API] GraphQL errors:", result.errors);
      return null;
    }

    const transcript = result.data?.transcript || null;
    if (!transcript) {
      return null;
    }

    const appsOutputs = await fetchFirefliesAppsPreview(env, meetingId);
    if (appsOutputs && appsOutputs.length > 0) {
      transcript.apps = {
        outputs: appsOutputs,
      };
    }

    return transcript;
  } catch (err) {
    console.error("[Fireflies API] Fetch error:", err);
    return null;
  }
}

async function fetchFirefliesAppsPreview(
  env: Env,
  transcriptId: string
): Promise<unknown[] | undefined> {
  const query = `
    query Apps($transcriptId: String!, $limit: Float) {
      apps(transcript_id: $transcriptId, limit: $limit) {
        outputs {
          transcript_id
          user_id
          app_id
          created_at
          title
          prompt
          response
        }
      }
    }
  `;

  try {
    const response = await fetch("https://api.fireflies.ai/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.FIREFLIES_API_KEY}`,
      },
      body: JSON.stringify({
        query,
        variables: {
          transcriptId,
          limit: 5,
        },
      }),
    });

    if (!response.ok) {
      return undefined;
    }

    const result = (await response.json()) as {
      data?: { apps?: { outputs?: unknown[] } };
      errors?: Array<{ message: string }>;
    };

    if (result.errors?.length) {
      return undefined;
    }

    return result.data?.apps?.outputs || [];
  } catch {
    return undefined;
  }
}

function formatFirefliesAsMarkdown(transcript: FirefliesTranscript): string {
  const lines: string[] = [];

  lines.push(`# ${transcript.title || "Untitled Meeting"}`);
  lines.push("");
  const dateIso =
    toIsoDateTime(transcript.dateString) || toIsoDateTime(transcript.date);
  if (dateIso) {
    const date = new Date(dateIso);
    lines.push(`**Date:** ${date.toISOString()}`);
  }
  const duration = fmtDurationMinutes(transcript.duration);
  if (duration) {
    lines.push(`**Duration:** ${duration}`);
  }
  if (transcript.organizer_email) {
    lines.push(`**Organizer Email:** ${transcript.organizer_email}`);
  }
  if (transcript.host_email) {
    lines.push(`**Host Email:** ${transcript.host_email}`);
  }
  if (transcript.participants && transcript.participants.length > 0) {
    lines.push(`**Participants:** ${transcript.participants.join(", ")}`);
  }
  if (transcript.fireflies_users?.length) {
    lines.push(`**Fireflies Users:** ${transcript.fireflies_users.join(", ")}`);
  }
  if (transcript.workspace_users?.length) {
    lines.push(`**Workspace Users:** ${transcript.workspace_users.join(", ")}`);
  }
  if (transcript.transcript_url) {
    lines.push(`**Fireflies Link:** ${transcript.transcript_url}`);
  }
  if (transcript.audio_url) {
    lines.push(`**Audio:** ${transcript.audio_url}`);
  }
  if (transcript.video_url) {
    lines.push(`**Video:** ${transcript.video_url}`);
  }
  if (transcript.meeting_link) {
    lines.push(`**Meeting Link:** ${transcript.meeting_link}`);
  }
  if (transcript.calendar_type) {
    lines.push(`**Calendar Type:** ${transcript.calendar_type}`);
  }
  if (transcript.calendar_id) {
    lines.push(`**Calendar ID:** ${transcript.calendar_id}`);
  }
  if (transcript.cal_id) {
    lines.push(`**Cal ID:** ${transcript.cal_id}`);
  }
  if (typeof transcript.is_live === "boolean") {
    lines.push(`**Is Live:** ${transcript.is_live ? "true" : "false"}`);
  }
  lines.push(`**Fireflies ID:** ${transcript.id}`);
  lines.push("");

  // Fireflies summary schema sections
  appendTextSection(lines, "Summary", transcript.summary?.overview);
  appendTextSection(lines, "Short Summary", transcript.summary?.short_summary);
  appendTextSection(lines, "Short Overview", transcript.summary?.short_overview);
  appendTextSection(lines, "Gist", transcript.summary?.gist);
  appendTextSection(lines, "Bullet Gist", transcript.summary?.bullet_gist);
  appendTextSection(lines, "Shorthand Bullet", transcript.summary?.shorthand_bullet);
  appendTextSection(lines, "Outline", transcript.summary?.outline);
  appendTextSection(lines, "Notes", transcript.summary?.notes);
  appendTextSection(lines, "Meeting Type", transcript.summary?.meeting_type);
  appendListSection(lines, "Keywords", transcript.summary?.keywords);
  appendListSection(lines, "Topics Discussed", transcript.summary?.topics_discussed);
  appendListSection(lines, "Transcript Chapters", transcript.summary?.transcript_chapters);
  appendListSection(lines, "Action Items", transcript.summary?.action_items);
  appendJsonSection(lines, "Extended Sections", transcript.summary?.extended_sections);

  // Extra transcript metadata
  appendJsonSection(lines, "User", transcript.user);
  appendJsonSection(lines, "Speakers", transcript.speakers);
  appendJsonSection(lines, "Meeting Attendees", transcript.meeting_attendees);
  appendJsonSection(lines, "Meeting Attendance", transcript.meeting_attendance);
  appendJsonSection(lines, "Meeting Info", transcript.meeting_info);
  appendJsonSection(lines, "Analytics", transcript.analytics);
  appendJsonSection(lines, "Channels", transcript.channels);
  appendJsonSection(lines, "Shared With", transcript.shared_with);
  appendJsonSection(lines, "Apps Preview", transcript.apps?.outputs || transcript.apps);

  if (transcript.sentences && transcript.sentences.length > 0) {
    lines.push("## Transcript");
    lines.push("");
    for (const sentence of transcript.sentences) {
      const sec =
        typeof sentence.start_time === "number" && Number.isFinite(sentence.start_time)
          ? Math.max(0, Math.floor(sentence.start_time))
          : 0;
      const mins = Math.floor(sec / 60);
      const secs = sec % 60;
      const stamp = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
      const speaker = sentence.speaker_name?.trim() || "Unknown";
      const text = sentence.text?.trim() || "";
      if (text) {
        lines.push(`[${stamp}] **${speaker}**: ${text}`);
      }
    }
  }

  return lines.join("\n");
}

async function fetchStorageFile(
  env: Env,
  bucket: string,
  path: string
): Promise<string | null> {
  try {
    const url = `${env.SUPABASE_URL}/storage/v1/object/${bucket}/${encodeURIComponent(path)}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        apikey: env.SUPABASE_SERVICE_KEY,
      },
    });

    if (!response.ok) {
      console.error(`[Storage] Error: ${response.status}`);
      return null;
    }

    return await response.text();
  } catch (err) {
    console.error("[Storage] Fetch error:", err);
    return null;
  }
}

// -----------------------------------------------------------------------------
// Backfill Handlers
// -----------------------------------------------------------------------------

interface StorageFile {
  name: string;
  id: string;
  created_at: string;
}

async function listStorageFiles(
  env: Env,
  bucket: string,
  prefix: string = "",
  limit: number = 1000,
  offset: number = 0
): Promise<StorageFile[]> {
  const url = `${env.SUPABASE_URL}/storage/v1/object/list/${bucket}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      apikey: env.SUPABASE_SERVICE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prefix,
      limit,
      offset,
      sortBy: { column: "created_at", order: "desc" },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`[Storage] List error: ${error}`);
    return [];
  }

  return (await response.json()) as StorageFile[];
}

async function listAllStorageFiles(
  env: Env,
  bucket: string
): Promise<StorageFile[]> {
  const allFiles: StorageFile[] = [];

  // List top-level folders (years)
  const topLevel = await listStorageFiles(env, bucket, "");

  for (const item of topLevel) {
    if (!item.name.includes(".")) {
      // It's a folder, list its contents recursively
      const subItems = await listStorageFiles(env, bucket, item.name + "/");

      for (const subItem of subItems) {
        if (!subItem.name.includes(".")) {
          // Another folder level (months)
          const files = await listStorageFiles(env, bucket, `${item.name}/${subItem.name}/`);
          for (const file of files) {
            if (file.name.endsWith(".md") || file.name.endsWith(".txt")) {
              allFiles.push({
                ...file,
                name: `${item.name}/${subItem.name}/${file.name}`,
              });
            }
          }
        } else if (subItem.name.endsWith(".md") || subItem.name.endsWith(".txt")) {
          allFiles.push({
            ...subItem,
            name: `${item.name}/${subItem.name}`,
          });
        }
      }
    } else if (item.name.endsWith(".md") || item.name.endsWith(".txt")) {
      allFiles.push(item);
    }
  }

  // Sort by created_at descending (most recent first)
  allFiles.sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return dateB - dateA;
  });

  return allFiles;
}

async function handleBackfill(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      bucket?: string;
      limit?: number;
      dryRun?: boolean;
    };

    const bucket = body.bucket || "meetings";
    const limit = body.limit || 100;
    const dryRun = body.dryRun || false;

    console.log(`[Backfill] Starting backfill from bucket: ${bucket}, limit: ${limit}`);

    // List all files in the bucket
    const files = await listAllStorageFiles(env, bucket);

    console.log(`[Backfill] Found ${files.length} files in storage`);

    if (dryRun) {
      return Response.json({
        dryRun: true,
        totalFiles: files.length,
        files: files.slice(0, 20).map((f) => f.name),
      });
    }

    const results: Array<{
      file: string;
      success: boolean;
      firefliesId?: string;
      error?: string;
    }> = [];

    // Process files up to limit
    const toProcess = files.slice(0, limit);

    for (const file of toProcess) {
      try {
        console.log(`[Backfill] Processing: ${file.name}`);

        const content = await fetchStorageFile(env, bucket, file.name);

        if (!content) {
          results.push({ file: file.name, success: false, error: "Could not fetch file" });
          continue;
        }

        // Use consistent URL encoding - don't encode slashes in the path
        const pathParts = file.name.split('/');
        const encodedPath = pathParts.map(part => encodeURIComponent(part)).join('/');
        const storageUrl = `${env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodedPath}`;

        const result = await ingestMarkdown(env, content, file.name, storageUrl);

        results.push({
          file: file.name,
          success: true,
          firefliesId: result.firefliesId,
        });
      } catch (err) {
        console.error(`[Backfill] Error processing ${file.name}:`, err);
        results.push({ file: file.name, success: false, error: String(err) });
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return Response.json({
      success: true,
      totalFiles: files.length,
      processed: results.length,
      successful,
      failed,
      remaining: files.length - results.length,
      results,
    });
  } catch (err) {
    console.error("[Backfill] Error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

async function handleBackfillStatus(env: Env): Promise<Response> {
  try {
    // Get counts by stage
    const stages = ["pending", "raw_ingested", "segmented", "chunked", "embedded", "done", "error"];
    const counts: Record<string, number> = {};

    for (const stage of stages) {
      const result = (await supabaseRequest(
        env,
        `fireflies_ingestion_jobs?stage=eq.${stage}&select=id`,
        "GET"
      )) as Array<{ id: string }>;
      counts[stage] = result?.length || 0;
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    return Response.json({
      total,
      stages: counts,
      complete: counts.done || 0,
      pending: total - (counts.done || 0) - (counts.error || 0),
      errors: counts.error || 0,
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
