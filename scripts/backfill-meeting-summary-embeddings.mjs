#!/usr/bin/env node
/**
 * Backfill document_metadata.summary_embedding for meetings missing it.
 *
 * Uses text-embedding-3-large (3072 dimensions) to match the embedder worker.
 * Prefer AI Gateway, then direct OpenAI fallback, matching the backend pipeline.
 * Requires env vars: DATABASE_URL, AI_GATEWAY_API_KEY or OPENAI_API_KEY
 *
 * Usage:
 *   node scripts/backfill-meeting-summary-embeddings.mjs [--dry-run] [--limit N] [--batch-size N] [--days N]
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Auto-load credentials from .env (compliance: non-interactive auth, no hardcoded secrets)
try {
  const envFile = readFileSync(join(__dirname, '../.env'), 'utf-8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
} catch {
  // .env not found; rely on environment variables already set
}

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!DATABASE_URL || (!AI_GATEWAY_API_KEY && !OPENAI_API_KEY)) {
  console.error("Missing required env vars: DATABASE_URL/SUPABASE_DB_URL and AI_GATEWAY_API_KEY or OPENAI_API_KEY");
  process.exit(1);
}

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const LIMIT = parseInt(args[args.indexOf("--limit") + 1]) || 0;
const BATCH_SIZE = parseInt(args[args.indexOf("--batch-size") + 1]) || 20;
const DAYS = parseInt(args[args.indexOf("--days") + 1]) || 365;
const sql = postgres(DATABASE_URL, { max: 1, ssl: "require" });

async function embedTexts(texts) {
  const attempts = [
    AI_GATEWAY_API_KEY
      ? {
          label: "AI Gateway",
          url: "https://ai-gateway.vercel.sh/v1/embeddings",
          key: AI_GATEWAY_API_KEY,
          model: "openai/text-embedding-3-large",
        }
      : null,
    OPENAI_API_KEY
      ? {
          label: "OpenAI direct",
          url: "https://api.openai.com/v1/embeddings",
          key: OPENAI_API_KEY,
          model: "text-embedding-3-large",
        }
      : null,
  ].filter(Boolean);

  const errors = [];
  for (const attempt of attempts) {
    const resp = await fetch(attempt.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${attempt.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: attempt.model,
        dimensions: 3072,
        input: texts,
      }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      errors.push(`${attempt.label}: ${resp.status} ${text.slice(0, 300)}`);
      continue;
    }
    const data = await resp.json();
    if (!Array.isArray(data.data) || data.data.length !== texts.length) {
      errors.push(`${attempt.label}: expected ${texts.length} embeddings, got ${data.data?.length ?? "unknown"}`);
      continue;
    }
    console.log(`  Provider: ${attempt.label}`);
    return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  }

  throw new Error(`Embedding failed across all providers: ${errors.join(" | ")}`);
}

function buildEmbeddingText(meeting) {
  const parts = [];
  if (meeting.title) parts.push(`Meeting: ${meeting.title}`);
  if (meeting.date) parts.push(`Date: ${meeting.date}`);
  const summary = meeting.summary || meeting.overview || "";
  if (summary) parts.push(summary);
  return parts.join("\n");
}

async function fetchAllCandidates() {
  const rows = await sql`
    select id, title, date, captured_at, created_at, summary, overview
    from public.document_metadata
    where summary_embedding is null
      and (source = 'fireflies'
        or type in ('meeting', 'meeting_transcript')
        or category = 'meeting'
        or fireflies_id is not null)
      and coalesce(captured_at, date, created_at::timestamptz) >= now() - (${DAYS} || ' days')::interval
      and length(coalesce(nullif(summary, ''), nullif(overview, ''), '')) > 0
    order by coalesce(captured_at, date, created_at::timestamptz) desc nulls last
    ${LIMIT ? sql`limit ${LIMIT}` : sql``}
  `;

  return rows.filter((m) => buildEmbeddingText(m).trim());
}

async function main() {
  console.log("=".repeat(60));
  console.log("Meeting Summary Embedding Backfill");
  console.log("=".repeat(60));
  console.log(`Model: text-embedding-3-large (3072 dimensions)`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Window: last ${DAYS} days`);
  if (LIMIT) console.log(`Limit: ${LIMIT}`);
  if (DRY_RUN) console.log("MODE: DRY RUN");
  console.log();

  if (!DRY_RUN) {
    console.log("Checking embedding provider...");
    await embedTexts(["alleato meeting summary backfill provider preflight"]);
    console.log();
  }

  // Materialize all candidate meetings upfront so we iterate a stable set.
  // This prevents infinite loops when persistent failures leave rows NULL
  // and avoids double-counting rows that fail across batches.
  console.log("Fetching candidate meetings...");
  let candidates = await fetchAllCandidates();

  if (candidates.length === 0) {
    console.log("No meetings need summary_embedding backfill!");
    return;
  }

  if (LIMIT) candidates = candidates.slice(0, LIMIT);

  console.log(`Found ${candidates.length} meetings to process`);
  console.log("=".repeat(60));
  console.log();

  let processed = 0;
  let success = 0;
  let failed = 0;
  let batchNum = 0;

  for (let batchStart = 0; batchStart < candidates.length; batchStart += BATCH_SIZE) {
    batchNum++;
    const batch = candidates.slice(batchStart, batchStart + BATCH_SIZE);

    console.log(`Batch ${batchNum}: ${batch.length} meetings`);

    const texts = batch.map(buildEmbeddingText);

    if (DRY_RUN) {
      for (const m of batch.slice(0, 3)) {
        const preview = buildEmbeddingText(m).substring(0, 100);
        console.log(`  [DRY RUN] ${m.id}: ${preview}...`);
      }
      if (batch.length > 3) console.log(`  ... and ${batch.length - 3} more`);
      processed += batch.length;
      success += batch.length;
      continue;
    }

    // Generate embeddings for batch
    console.log(`  Generating ${texts.length} embeddings...`);
    const start = Date.now();
    let embeddings;
    try {
      embeddings = await embedTexts(texts);
      console.log(`  Done in ${((Date.now() - start) / 1000).toFixed(2)}s`);
    } catch (err) {
      console.error(`  ERROR generating embeddings: ${err.message}`);
      // Pause before next batch on OpenAI errors to avoid hot-looping
      failed += batch.length;
      processed += batch.length;
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }

    // Update each meeting
    for (let i = 0; i < batch.length; i++) {
      try {
        await sql`
          update public.document_metadata
          set summary_embedding = ${JSON.stringify(embeddings[i])}::halfvec
          where id = ${batch[i].id}
        `;
        success++;
      } catch (err) {
        console.error(`  Failed ${batch[i].id}: ${err.message}`);
        failed++;
      }
      processed++;
    }

    console.log(`  Progress: ${processed}/${candidates.length} processed, ${success} success, ${failed} failed`);

    // Brief pause between batches
    if (batchStart + BATCH_SIZE < candidates.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log();
  console.log("=".repeat(60));
  console.log("Backfill Complete");
  console.log("=".repeat(60));
  console.log(`Processed: ${processed}`);
  console.log(`Success:   ${success}`);
  console.log(`Failed:    ${failed}`);
  console.log("=".repeat(60));

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
}).finally(async () => {
  await sql.end({ timeout: 5 }).catch(() => {});
});
