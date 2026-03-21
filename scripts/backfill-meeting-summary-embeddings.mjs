#!/usr/bin/env node
/**
 * Backfill document_metadata.summary_embedding for meetings missing it.
 *
 * Uses OpenAI text-embedding-3-large (3072 dimensions) to match the embedder worker.
 * Requires env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY), OPENAI_API_KEY
 *
 * Usage:
 *   node scripts/backfill-meeting-summary-embeddings.mjs [--dry-run] [--limit N] [--batch-size N]
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_API_KEY) {
  console.error("Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY/SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY");
  process.exit(1);
}

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const LIMIT = parseInt(args[args.indexOf("--limit") + 1]) || 0;
const BATCH_SIZE = parseInt(args[args.indexOf("--batch-size") + 1]) || 20;

async function supabaseQuery(path, method = "GET", body = null) {
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    Prefer: method === "PATCH" ? "return=minimal" : "return=representation",
  };
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, opts);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Supabase ${method} ${path}: ${resp.status} ${text}`);
  }
  if (method === "PATCH") return null;
  return resp.json();
}

async function embedTexts(texts) {
  const resp = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-large",
      dimensions: 3072,
      input: texts,
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`OpenAI embeddings: ${resp.status} ${text}`);
  }
  const data = await resp.json();
  // Sort by index to maintain order
  return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
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
  const PAGE_SIZE = 1000;
  let all = [];
  let offset = 0;

  while (true) {
    const page = await supabaseQuery(
      `document_metadata?summary_embedding=is.null&or=(summary.neq.,overview.neq.)&select=id,title,date,summary,overview&order=date.desc&limit=${PAGE_SIZE}&offset=${offset}`
    );
    if (!page || page.length === 0) break;
    all.push(...page.filter((m) => buildEmbeddingText(m).trim()));
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return all;
}

async function main() {
  console.log("=".repeat(60));
  console.log("Meeting Summary Embedding Backfill");
  console.log("=".repeat(60));
  console.log(`Model: text-embedding-3-large (3072 dimensions)`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  if (LIMIT) console.log(`Limit: ${LIMIT}`);
  if (DRY_RUN) console.log("MODE: DRY RUN");
  console.log();

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
        await supabaseQuery(
          `document_metadata?id=eq.${batch[i].id}`,
          "PATCH",
          { summary_embedding: embeddings[i] }
        );
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
});
