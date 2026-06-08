#!/usr/bin/env node

/**
 * Meeting Vectorization Health Check — fails LOUDLY.
 *
 * This script is the canary for the AI Strategist's meeting recall path.
 * It MUST exit non-zero on any of the following:
 *   1. No embeddings exist at all
 *   2. Recent meetings (last 14 days) exist with zero summary embeddings
 *   3. The newest meeting is more than 7 days ahead of the newest embedding
 *   4. Recent meetings have poor chunk coverage for broad semanticSearch
 *   5. The OpenAI / AI Gateway embedding endpoint cannot embed a probe string
 *   6. The DB retrieval RPCs return zero results for known-good probe vectors
 *
 * Why this exists: silent failures in the embedding pipeline (quota, RPC bugs,
 * mis-configured workers) caused the strategist to silently degrade to keyword
 * search for weeks. The cost was invisible until a human noticed.
 *
 * Run:  npm run rag:verify:meetings
 */

import "dotenv/config";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
const ragDatabaseUrl = process.env.RAG_DATABASE_URL;
const aiGatewayKey = process.env.AI_GATEWAY_API_KEY;
const openAiKey = process.env.OPENAI_API_KEY;

if (!databaseUrl) {
  console.error("[FATAL] DATABASE_URL or SUPABASE_DB_URL is required.");
  process.exit(1);
}
if (!ragDatabaseUrl) {
  console.error("[FATAL] RAG_DATABASE_URL is required. document_chunks and fireflies_ingestion_jobs live in the AI/RAG database.");
  process.exit(1);
}

const STALENESS_DAYS = 7;
const RECENT_WINDOW_DAYS = 14;
const HISTORY_WINDOW_DAYS = 180;
const MEETING_SIGNAL_LIMIT = 2_000;
const RECENT_MIN_EMBEDDED_RATIO = 0.5;
const RECENT_MIN_CHUNK_RATIO = 0.5;
const RECENT_MIN_TRANSCRIPT_CHUNK_RATIO = 0.9;

const appSql = postgres(databaseUrl, { max: 1, ssl: "require" });
const ragSql = postgres(ragDatabaseUrl, { max: 1, ssl: "require", prepare: false });

const failures = [];
const warnings = [];

function fail(msg) {
  failures.push(msg);
}

function warn(msg) {
  warnings.push(msg);
}

async function probeEmbeddingProvider() {
  const successes = [];

  if (aiGatewayKey) {
    try {
      const res = await fetch("https://ai-gateway.vercel.sh/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aiGatewayKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/text-embedding-3-large",
          input: "alleato meeting health probe",
          dimensions: 3072,
        }),
      });
      if (res.ok) {
        successes.push("ai-gateway");
      } else {
        const text = await res.text();
        warn(`AI Gateway embedding probe returned ${res.status}: ${text.slice(0, 200)}`);
      }
    } catch (err) {
      warn(`AI Gateway embedding probe threw: ${err.message}`);
    }
  } else {
    warn("AI_GATEWAY_API_KEY not set — falling back to direct OpenAI.");
  }

  if (!openAiKey) {
    if (successes.length === 0) {
      fail("Neither AI_GATEWAY_API_KEY nor OPENAI_API_KEY can produce embeddings — ingestion is dead.");
    } else {
      warn("OPENAI_API_KEY not set — AI Gateway is the only working embedding provider.");
    }
    return { ok: successes.length > 0, providers: successes };
  }

  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-large",
        input: "alleato meeting health probe",
        dimensions: 3072,
      }),
    });
    if (res.ok) {
      successes.push("openai-direct");
    } else {
      const text = await res.text();
      const message =
        `Direct OpenAI embedding probe returned ${res.status}. ` +
        `Body: ${text.slice(0, 300)}. ` +
        `Check OpenAI billing/quota.`;
      if (successes.length > 0) {
        warn(`${message} AI Gateway is currently the working provider; direct OpenAI should not be treated as the primary path.`);
      } else {
        fail(
          `Embedding provider is FAILING. ${message} ` +
            `New Fireflies meetings will NOT be embedded. ` +
            `Set AI_GATEWAY_API_KEY or fix OpenAI billing/quota.`
        );
      }
    }
  } catch (err) {
    if (successes.length > 0) {
      warn(`Direct OpenAI embedding probe threw: ${err.message}. AI Gateway is currently the working provider; direct OpenAI should not be treated as the primary path.`);
    } else {
      fail(`Direct OpenAI embedding probe threw: ${err.message}`);
    }
  }

  return { ok: successes.length > 0, providers: successes };
}

try {
  await appSql`set statement_timeout = '45s'`;
  await ragSql`set statement_timeout = '45s'`;

  const recentMeetings = await appSql`
    select
      id::text,
      title,
      coalesce(captured_at, date, created_at::timestamptz) as meeting_at
    from public.document_metadata
    where (
      source = 'fireflies'
      or type in ('meeting', 'meeting_transcript')
      or category = 'meeting'
      or fireflies_id is not null
    )
      and coalesce(captured_at, date, created_at::timestamptz) >= now() - (${RECENT_WINDOW_DAYS} || ' days')::interval
    order by meeting_at desc
  `;
  const recentMeetingIds = recentMeetings.map((row) => row.id).filter(Boolean);

  const [metadata] = await appSql`
    with meeting_ids as materialized (
      select id from (
        select id from public.document_metadata
        where source = 'fireflies'
        order by created_at desc
        limit ${MEETING_SIGNAL_LIMIT}
      ) source_rows
      union
      select id from (
        select id from public.document_metadata
        where type in ('meeting', 'meeting_transcript')
        order by created_at desc
        limit ${MEETING_SIGNAL_LIMIT}
      ) type_rows
      union
      select id from (
        select id from public.document_metadata
        where category = 'meeting'
        order by created_at desc
        limit ${MEETING_SIGNAL_LIMIT}
      ) category_rows
      union
      select id from (
        select id from public.document_metadata
        where fireflies_id is not null
        order by created_at desc
        limit ${MEETING_SIGNAL_LIMIT}
      ) fireflies_rows
    )
    select
      count(*)::int as total_meetings,
      max(coalesce(captured_at, date, created_at::timestamptz)) as latest_meeting_at
    from public.document_metadata
    where id in (select id from meeting_ids)
  `;

  const recent = {
    recent_meetings: recentMeetings.length,
  };

  const [summaryMetadata] = await ragSql`
    select
      count(*)::int as total_rag_metadata,
      count(*) filter (where summary_embedding is not null)::int as embedded_summaries,
      max(updated_at) filter (where summary_embedding is not null) as latest_summary_embedding_at
    from public.rag_document_metadata
  `;

  const [chunks] = await ragSql`
    select
      count(*)::int as total_chunks,
      count(*) filter (where dc.embedding is not null)::int as embedded_chunks,
      count(distinct dc.document_id) filter (where dc.embedding is not null)::int as docs_with_embedded_chunks,
      max(dc.updated_at) as latest_chunk_embedding_at
    from public.document_chunks dc
    where dc.source_type in ('meeting_transcript', 'meeting_summary', 'meeting_segment_summary', 'meeting_notes', 'meeting_section')
  `;

  let recentChunkRows = [];
  if (recentMeetingIds.length > 0) {
    recentChunkRows = await ragSql`
      select
        dc.document_id::text,
        count(dc.chunk_id)::int as chunk_count,
        count(dc.chunk_id) filter (where dc.embedding is not null)::int as embedded_chunk_count,
        count(dc.chunk_id) filter (where dc.source_type = 'meeting_transcript' and dc.embedding is not null)::int as embedded_transcript_chunk_count,
        max(dc.updated_at) as latest_chunk_embedding_at
      from public.document_chunks dc
      where dc.document_id = any(${recentMeetingIds})
      group by dc.document_id
    `;
  }
  const chunkByDocumentId = new Map(recentChunkRows.map((row) => [row.document_id, row]));
  const recentChunkCoverage = {
    recent_meetings: recentMeetingIds.length,
    recent_meetings_with_chunks: recentMeetings.filter((row) => (chunkByDocumentId.get(row.id)?.chunk_count ?? 0) > 0).length,
    recent_meetings_with_embedded_chunks: recentMeetings.filter((row) => (chunkByDocumentId.get(row.id)?.embedded_chunk_count ?? 0) > 0).length,
    recent_meetings_with_embedded_transcript_chunks: recentMeetings.filter((row) => (chunkByDocumentId.get(row.id)?.embedded_transcript_chunk_count ?? 0) > 0).length,
    recent_chunks: recentChunkRows.reduce((sum, row) => sum + Number(row.chunk_count ?? 0), 0),
    recent_embedded_chunks: recentChunkRows.reduce((sum, row) => sum + Number(row.embedded_chunk_count ?? 0), 0),
    latest_recent_chunk_embedding_at: recentChunkRows.reduce((latest, row) => {
      if (!row.latest_chunk_embedding_at) return latest;
      if (!latest || new Date(row.latest_chunk_embedding_at) > new Date(latest)) return row.latest_chunk_embedding_at;
      return latest;
    }, null),
  };

  const [chunkProbe] = await ragSql`
    with q as (
      select dc.embedding
      from public.document_chunks dc
      where dc.embedding is not null
        and dc.source_type in ('meeting_transcript', 'meeting_summary', 'meeting_segment_summary', 'meeting_notes', 'meeting_section')
      order by dc.updated_at desc nulls last
      limit 1
    )
    select count(*)::int as result_count, max(similarity) as max_similarity
    from q, public.search_document_chunks(
      q.embedding,
      array['meeting_transcript', 'meeting_summary', 'meeting_segment_summary'],
      null,
      5,
      0.3
    )
  `;

  const pipelineJobs = await ragSql`
    select
      stage,
      count(*)::int as count,
      min(created_at) as oldest_created_at,
      max(updated_at) as newest_updated_at
    from public.fireflies_ingestion_jobs
    where updated_at >= now() - (${HISTORY_WINDOW_DAYS} || ' days')::interval
    group by stage
    order by count desc
  `;

  const quotaErrorJobs = await ragSql`
    select count(*)::int as count
    from public.fireflies_ingestion_jobs
    where stage = 'error'
      and error_message ilike '%quota%'
      and updated_at >= now() - (${HISTORY_WINDOW_DAYS} || ' days')::interval
  `;

  const provider = await probeEmbeddingProvider();

  if (summaryMetadata.embedded_summaries === 0 && chunks.embedded_chunks === 0) {
    fail("No meeting summary or chunk embeddings exist at all. The strategist is keyword-only.");
  }

  if (recent.recent_meetings > 0) {
    const ratio = recentChunkCoverage.recent_meetings_with_embedded_chunks / recent.recent_meetings;
    if (ratio < RECENT_MIN_EMBEDDED_RATIO) {
      fail(
        `Only ${recentChunkCoverage.recent_meetings_with_embedded_chunks} of ${recent.recent_meetings} ` +
          `meetings from the last ${RECENT_WINDOW_DAYS} days have embedded chunks ` +
          `(${(ratio * 100).toFixed(1)}%, required ≥${RECENT_MIN_EMBEDDED_RATIO * 100}%). ` +
          `New meetings are NOT being vectorized. AI Strategist is missing recent context.`
      );
    }

    const chunkRatio =
      recentChunkCoverage.recent_meetings_with_embedded_chunks / recent.recent_meetings;
    if (chunkRatio < RECENT_MIN_CHUNK_RATIO) {
      fail(
        `Only ${recentChunkCoverage.recent_meetings_with_embedded_chunks} of ` +
          `${recent.recent_meetings} meetings from the last ${RECENT_WINDOW_DAYS} days ` +
          `have embedded document_chunks (${(chunkRatio * 100).toFixed(1)}%, ` +
          `required ≥${RECENT_MIN_CHUNK_RATIO * 100}%). ` +
          `AI Strategist semanticSearch is missing recent meeting context.`
      );
    }

    const transcriptRatio =
      recentChunkCoverage.recent_meetings_with_embedded_transcript_chunks / recent.recent_meetings;
    if (transcriptRatio < RECENT_MIN_TRANSCRIPT_CHUNK_RATIO) {
      fail(
        `Only ${recentChunkCoverage.recent_meetings_with_embedded_transcript_chunks} of ` +
          `${recent.recent_meetings} meetings from the last ${RECENT_WINDOW_DAYS} days ` +
          `have embedded full-transcript chunks (${(transcriptRatio * 100).toFixed(1)}%, ` +
          `required ≥${RECENT_MIN_TRANSCRIPT_CHUNK_RATIO * 100}%). ` +
          `Meeting summaries may exist, but full-transcript RAG coverage is incomplete.`
      );
    }
  }

  if (metadata.latest_meeting_at && recentChunkCoverage.latest_recent_chunk_embedding_at) {
    const meetingMs = new Date(metadata.latest_meeting_at).getTime();
    const embedMs = new Date(recentChunkCoverage.latest_recent_chunk_embedding_at).getTime();
    const lagDays = (meetingMs - embedMs) / (1000 * 60 * 60 * 24);
    if (lagDays > STALENESS_DAYS) {
      fail(
        `Newest meeting (${new Date(metadata.latest_meeting_at).toISOString().slice(0, 10)}) is ` +
          `${lagDays.toFixed(1)} days ahead of newest recent chunk embedding ` +
          `(${new Date(recentChunkCoverage.latest_recent_chunk_embedding_at).toISOString().slice(0, 10)}). ` +
          `Threshold: ${STALENESS_DAYS} days. Embedding pipeline is stalled.`
      );
    }
  } else if (metadata.latest_meeting_at && !recentChunkCoverage.latest_recent_chunk_embedding_at) {
    fail("Meetings exist but ZERO recent meeting chunks have embeddings. Pipeline never ran.");
  }

  if (chunkProbe.result_count === 0) {
    fail("RPC search_document_chunks returned no meeting chunk results for a known-good probe vector. Retrieval is broken.");
  }

  const rawIngestedJobs = pipelineJobs.find((job) => job.stage === "raw_ingested")?.count ?? 0;
  const errorJobs = pipelineJobs.find((job) => job.stage === "error")?.count ?? 0;
  if (rawIngestedJobs > 100) {
    fail(
      `${rawIngestedJobs} Fireflies ingestion jobs are stuck at raw_ingested. ` +
        `They have not completed segmentation/chunking/embedding and are not reliable RAG context.`
    );
  }
  if ((quotaErrorJobs[0]?.count ?? 0) > 0) {
    fail(
      `${quotaErrorJobs[0].count} Fireflies ingestion jobs failed with quota/provider errors. ` +
        `Retry them through the AI Gateway-backed pipeline after backend config is deployed.`
    );
  } else if (errorJobs > 100) {
    warn(`${errorJobs} Fireflies ingestion jobs are in error stage; inspect grouped error messages before relying on meeting recall.`);
  }

  const result = {
    metadata,
    summaryMetadata,
    recent,
    chunks,
    recentChunkCoverage,
    pipelineJobs,
    probes: {
      documentChunkSearch: chunkProbe,
      embeddingProvider: provider,
    },
    warnings,
    failures,
  };

  console.log(JSON.stringify(result, null, 2));

  if (warnings.length > 0) {
    console.error("\nWARNINGS:");
    for (const w of warnings) console.error(`   - ${w}`);
  }

  if (failures.length > 0) {
    console.error("\nMEETING VECTORIZATION HEALTH: FAIL");
    console.error("The AI Strategist is degraded or about to be. Fix these now:\n");
    for (const f of failures) console.error(`   FAIL: ${f}`);
    console.error("");
    process.exit(1);
  }

  console.log("\nMeeting vectorization health: PASS");
} finally {
  await appSql.end();
  await ragSql.end();
}
