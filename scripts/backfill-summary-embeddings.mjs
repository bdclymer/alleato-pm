/**
 * Backfill document_metadata.summary_embedding
 *
 * Embeds the real Fireflies-generated summary (or overview) for every meeting
 * row in document_metadata that doesn't yet have a summary_embedding.
 *
 * Uses text-embedding-3-large at 3072 dims — halfvec(3072) in the DB.
 *
 * Usage:
 *   node scripts/backfill-summary-embeddings.mjs
 *   node scripts/backfill-summary-embeddings.mjs --dry-run   # count only, no writes
 *   node scripts/backfill-summary-embeddings.mjs --batch 50  # override batch size
 */

import { createClient } from "../frontend/node_modules/@supabase/supabase-js/dist/index.mjs";
import OpenAI from "../frontend/node_modules/openai/index.mjs";
import { config } from "../frontend/node_modules/dotenv/lib/main.js";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env") });

// ─── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = "text-embedding-3-large";
const EMBEDDING_DIMS = 3072;
const BATCH_SIZE = parseInt(
  process.argv.find((a) => a.startsWith("--batch="))?.split("=")[1] ?? "50"
);
const DRY_RUN = process.argv.includes("--dry-run");

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error(
    "Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function batchEmbed(texts) {
  const resp = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMS,
    input: texts,
  });
  return resp.data.map((d) => d.embedding);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== Backfill document_metadata.summary_embedding ===`);
  console.log(`Model: ${EMBEDDING_MODEL} @ ${EMBEDDING_DIMS} dims`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Dry run: ${DRY_RUN}\n`);

  // Only embed meeting records — emails/Teams/OneDrive are already chunked in
  // document_chunks. Embedding their document_metadata row adds no value.
  // Meeting filter: source = 'fireflies' OR category/type is meeting-related.
  const MEETING_FILTER = "source.eq.fireflies,category.eq.meeting,category.eq.transcript,category.eq.meeting_transcript,type.eq.meeting,type.eq.meeting_transcript";

  const { count: totalNeeding } = await supabase
    .from("document_metadata")
    .select("id", { count: "exact", head: true })
    .is("summary_embedding", null)
    .not("summary", "is", null)
    .or(MEETING_FILTER);

  const { count: totalNoSummary } = await supabase
    .from("document_metadata")
    .select("id", { count: "exact", head: true })
    .is("summary_embedding", null)
    .is("summary", null)
    .not("overview", "is", null)
    .or(MEETING_FILTER);

  const total = (totalNeeding ?? 0) + (totalNoSummary ?? 0);
  console.log(`Rows needing embedding: ${total}`);
  console.log(`  → have summary: ${totalNeeding ?? 0}`);
  console.log(`  → have overview only: ${totalNoSummary ?? 0}\n`);

  if (DRY_RUN) {
    console.log("Dry run — exiting without writing.");
    return;
  }

  if (total === 0) {
    console.log("All rows already have summary_embedding. Nothing to do.");
    return;
  }

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  while (true) {
    // Always read from offset 0 — as we embed rows, they drop out of the
    // IS NULL filter, so the result set shrinks. Offset pagination would
    // skip rows that shift into lower positions after each batch.
    const { data: rows, error } = await supabase
      .from("document_metadata")
      .select("id, summary, overview")
      .is("summary_embedding", null)
      .or("summary.not.is.null,overview.not.is.null")
      .or(MEETING_FILTER)
      .limit(BATCH_SIZE);

    if (error) {
      console.error("Error fetching batch:", error.message);
      errors++;
      break;
    }

    if (!rows || rows.length === 0) break;

    // Build texts — prefer summary, fall back to overview
    const texts = rows.map((r) =>
      (r.summary || r.overview || "").trim().substring(0, 8000)
    );

    // Skip rows with no usable text
    const validRows = rows.filter((_, i) => texts[i].length >= 20);
    const validTexts = texts.filter((t) => t.length >= 20);
    skipped += rows.length - validRows.length;

    if (validTexts.length === 0) {
      offset += rows.length;
      continue;
    }

    try {
      const embeddings = await batchEmbed(validTexts);

      // Write embeddings back — one update per row (Supabase doesn't support bulk vector upsert easily)
      for (let i = 0; i < validRows.length; i++) {
        const { error: updateErr } = await supabase
          .from("document_metadata")
          .update({ summary_embedding: JSON.stringify(embeddings[i]) })
          .eq("id", validRows[i].id);

        if (updateErr) {
          console.error(`  ✗ ${validRows[i].id}: ${updateErr.message}`);
          errors++;
        } else {
          processed++;
        }
      }

      const pct = Math.round(((processed + skipped) / total) * 100);
      process.stdout.write(
        `\r  Progress: ${processed} embedded, ${skipped} skipped, ${errors} errors — ${pct}%`
      );

      // Rate-limit: stay well under OpenAI's 3000 RPM embedding limit
      if (rows.length === BATCH_SIZE) await sleep(200);
    } catch (embErr) {
      console.error(`\nEmbedding batch failed: ${embErr.message}`);
      errors++;
      // Back off and retry next batch
      await sleep(2000);
    }

    offset += rows.length;
  }

  console.log(`\n\n=== Done ===`);
  console.log(`Embedded: ${processed}`);
  console.log(`Skipped (no text): ${skipped}`);
  console.log(`Errors: ${errors}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
