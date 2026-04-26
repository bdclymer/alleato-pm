#!/usr/bin/env node

/**
 * Meeting Vectorization Health Check — fails LOUDLY.
 *
 * This script is the canary for the AI Strategist's meeting recall path.
 * It MUST exit non-zero on any of the following:
 *   1. No embeddings exist at all
 *   2. Recent meetings (last 14 days) exist with zero summary embeddings
 *   3. The newest meeting is more than 7 days ahead of the newest embedding
 *   4. The OpenAI / AI Gateway embedding endpoint cannot embed a probe string
 *   5. The DB retrieval RPCs return zero results for known-good probe vectors
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
const aiGatewayKey = process.env.AI_GATEWAY_API_KEY;
const openAiKey = process.env.OPENAI_API_KEY;

if (!databaseUrl) {
  console.error("[FATAL] DATABASE_URL or SUPABASE_DB_URL is required.");
  process.exit(1);
}

const STALENESS_DAYS = 7;
const RECENT_WINDOW_DAYS = 14;
const RECENT_MIN_EMBEDDED_RATIO = 0.5;

const sql = postgres(databaseUrl, { max: 1, ssl: "require" });

const failures = [];
const warnings = [];

function fail(msg) {
  failures.push(msg);
}

function warn(msg) {
  warnings.push(msg);
}

async function probeEmbeddingProvider() {
  const probeBody = JSON.stringify({
    model: "openai/text-embedding-3-large",
    input: "alleato meeting health probe",
    dimensions: 3072,
  });

  if (aiGatewayKey) {
    try {
      const res = await fetch("https://ai-gateway.vercel.sh/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aiGatewayKey}`,
          "Content-Type": "application/json",
        },
        body: probeBody,
      });
      if (res.ok) return { ok: true, provider: "ai-gateway" };
      const text = await res.text();
      warn(`AI Gateway embedding probe returned ${res.status}: ${text.slice(0, 200)}`);
    } catch (err) {
      warn(`AI Gateway embedding probe threw: ${err.message}`);
    }
  } else {
    warn("AI_GATEWAY_API_KEY not set — falling back to direct OpenAI.");
  }

  if (!openAiKey) {
    fail("Neither AI_GATEWAY_API_KEY nor OPENAI_API_KEY can produce embeddings — ingestion is dead.");
    return { ok: false, provider: null };
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
    if (res.ok) return { ok: true, provider: "openai-direct" };
    const text = await res.text();
    fail(
      `Embedding provider is FAILING. Direct OpenAI returned ${res.status}. ` +
        `Body: ${text.slice(0, 300)}. ` +
        `New Fireflies meetings will NOT be embedded. ` +
        `Check OpenAI billing/quota or set AI_GATEWAY_API_KEY.`
    );
    return { ok: false, provider: "openai-direct" };
  } catch (err) {
    fail(`Direct OpenAI embedding probe threw: ${err.message}`);
    return { ok: false, provider: null };
  }
}

try {
  const [metadata] = await sql`
    select
      count(*)::int as total_meetings,
      count(*) filter (where summary_embedding is not null)::int as embedded_summaries,
      max(coalesce(captured_at, date, created_at::timestamptz)) as latest_meeting_at,
      max(coalesce(captured_at, created_at::timestamptz)) filter (where summary_embedding is not null) as latest_summary_embedding_at
    from public.document_metadata
    where source = 'fireflies'
       or type in ('meeting', 'meeting_transcript')
       or category = 'meeting'
       or fireflies_id is not null
  `;

  const [recent] = await sql`
    select
      count(*)::int as recent_meetings,
      count(*) filter (where summary_embedding is not null)::int as recent_embedded_summaries
    from public.document_metadata
    where (source = 'fireflies'
       or type in ('meeting', 'meeting_transcript')
       or category = 'meeting'
       or fireflies_id is not null)
      and coalesce(captured_at, date, created_at::timestamptz) >= now() - (${RECENT_WINDOW_DAYS} || ' days')::interval
  `;

  const [chunks] = await sql`
    select
      count(*)::int as total_chunks,
      count(*) filter (where dc.embedding is not null)::int as embedded_chunks,
      max(dc.updated_at) as latest_chunk_embedding_at
    from public.document_chunks dc
    join public.document_metadata dm on dm.id = dc.document_id
    where dm.source = 'fireflies'
       or dm.type in ('meeting', 'meeting_transcript')
       or dm.category = 'meeting'
       or dm.fireflies_id is not null
  `;

  const [summaryProbe] = await sql`
    with q as (
      select summary_embedding
      from public.document_metadata
      where summary_embedding is not null
      limit 1
    )
    select count(*)::int as result_count, max(similarity) as max_similarity
    from q, public.match_document_metadata_by_summary(q.summary_embedding, 5, 0.3, null)
  `;

  const [chunkProbe] = await sql`
    with q as (
      select dc.embedding
      from public.document_chunks dc
      join public.document_metadata dm on dm.id = dc.document_id
      where dc.embedding is not null
        and (dm.source = 'fireflies'
          or dm.type in ('meeting', 'meeting_transcript')
          or dm.category = 'meeting'
          or dm.fireflies_id is not null)
      limit 1
    )
    select count(*)::int as result_count, max(similarity) as max_similarity
    from q, public.search_document_chunks(q.embedding, null, null, 5, 0.3)
  `;

  const provider = await probeEmbeddingProvider();

  if (metadata.embedded_summaries === 0 && chunks.embedded_chunks === 0) {
    fail("No meeting summary or chunk embeddings exist at all. The strategist is keyword-only.");
  }

  if (recent.recent_meetings > 0) {
    const ratio = recent.recent_embedded_summaries / recent.recent_meetings;
    if (ratio < RECENT_MIN_EMBEDDED_RATIO) {
      fail(
        `Only ${recent.recent_embedded_summaries} of ${recent.recent_meetings} ` +
          `meetings from the last ${RECENT_WINDOW_DAYS} days have summary embeddings ` +
          `(${(ratio * 100).toFixed(1)}%, required ≥${RECENT_MIN_EMBEDDED_RATIO * 100}%). ` +
          `New meetings are NOT being vectorized. AI Strategist is missing recent context.`
      );
    }
  }

  if (metadata.latest_meeting_at && metadata.latest_summary_embedding_at) {
    const meetingMs = new Date(metadata.latest_meeting_at).getTime();
    const embedMs = new Date(metadata.latest_summary_embedding_at).getTime();
    const lagDays = (meetingMs - embedMs) / (1000 * 60 * 60 * 24);
    if (lagDays > STALENESS_DAYS) {
      fail(
        `Newest meeting (${new Date(metadata.latest_meeting_at).toISOString().slice(0, 10)}) is ` +
          `${lagDays.toFixed(1)} days ahead of newest summary embedding ` +
          `(${new Date(metadata.latest_summary_embedding_at).toISOString().slice(0, 10)}). ` +
          `Threshold: ${STALENESS_DAYS} days. Embedding pipeline is stalled.`
      );
    }
  } else if (metadata.latest_meeting_at && !metadata.latest_summary_embedding_at) {
    fail("Meetings exist but ZERO have summary embeddings. Pipeline never ran.");
  }

  if (summaryProbe.result_count === 0) {
    fail("RPC match_document_metadata_by_summary returned no results for a known-good probe vector. Retrieval is broken.");
  }
  if (chunkProbe.result_count === 0) {
    fail("RPC search_document_chunks returned no meeting chunk results for a known-good probe vector. Retrieval is broken.");
  }

  const result = {
    metadata,
    recent,
    chunks,
    probes: {
      meetingSummarySearch: summaryProbe,
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
  await sql.end();
}
